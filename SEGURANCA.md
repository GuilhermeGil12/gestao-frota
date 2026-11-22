# Segurança — Frota System

Estado da segurança do sistema: o que já existe, o que foi corrigido e o que falta.
Atualizado em 14/11/2026.

---

## 1. O que já existia

| Item | Como funciona |
|---|---|
| Login com JWT | Token de acesso de 15 min + refresh token de 7 dias, com rotação a cada uso |
| Senhas | Guardadas com BCrypt (nunca em texto) |
| Permissões | Checadas no **backend** com `@PreAuthorize`, não só escondidas na tela |
| Segredos | Lidos de variáveis de ambiente; nada de senha real no git |
| Erros | Em produção, a resposta HTTP não mostra mensagem interna nem stacktrace |
| Recuperação de senha | Código por e-mail com validade (15 min), limite de tentativas e intervalo entre pedidos |

---

## 2. Corrigido nesta etapa (backend)

### 2.1 Rotas antigas do ESP abertas sem login — **crítico**
Quando a controladora falava por HTTP, estas rotas ficaram liberadas (`permitAll`). Qualquer pessoa na internet podia usá-las:

| Rota removida | Risco |
|---|---|
| `POST /api/localizacao/enviar` | inventar pontos de GPS para qualquer veículo (e a rota ainda **imprimia a senha da controladora no log**) |
| `GET /api/cartaorfid/dispositivos` | baixar os cartões liberados |
| `GET /api/comandos/pendente/{id}` | ver comandos pendentes |
| `POST /api/comandos/{id}/confirmar` | marcar como executado um bloqueio que nunca aconteceu |

A controladora (firmware v3) fala **só pelo MQTT**, então as rotas foram **removidas**.
`GET /api/cartaorfid/liberados` continua (a tela Configurações usa), mas agora exige login e permissão.

**Resultado:** nenhuma rota `/api` fica aberta, exceto `/api/auth/**` (login, refresh, logout e recuperação de senha).

### 2.2 Permissões sem proteção
`PermissaoController` não tinha `@PreAuthorize`: qualquer usuário logado podia criar, alterar e apagar permissões.
Agora exige `configuracoes.permissoes`. O catálogo (só leitura) também é liberado para quem administra usuários ou setores.

### 2.3 Limite de tentativas de login
`LimiteLoginService`: depois de **5 senhas erradas seguidas**, o e-mail fica **bloqueado por 15 minutos**, mesmo com a senha certa.
- Conta por **e-mail**, não por IP: atrás do Nginx todas as requisições chegam com o mesmo IP, e uma pessoa bloquearia todo mundo.
- E-mail inexistente também conta como tentativa (a mensagem é a mesma, para não revelar quais e-mails existem).
- Fica em memória: reiniciar o servidor zera a contagem.
- Configurável: `app.login.max-tentativas` e `app.login.bloqueio-minutos`.

### 2.4 CORS restrito
Antes: qualquer site (`*`) podia chamar a API pelo navegador.
Agora: só os endereços de `app.cors.origens` (padrão: o Vite em `localhost:5173`). Em produção o site é servido pelo próprio Spring, no mesmo endereço, então não precisa de CORS.

### 2.5 Produção não sobe com senha padrão
`VerificacaoSegurancaProducao` (só no perfil `prod`): se faltar alguma variável abaixo, o sistema **se recusa a iniciar** e diz no log o que falta.

| Variável | Por quê |
|---|---|
| `JWT_SECRET` | sem ela, o segredo dos tokens é o de desenvolvimento, que está no GitHub: qualquer um forjaria um login |
| `ADMIN_SENHA` | sem ela, o administrador é criado com `admin123` |
| `MQTT_BROKER` | sem ela, o backend usa o broker **público** de teste |
| `MQTT_USER` | sem ela, o backend entra no broker sem usuário |

> ⚠️ **Antes de subir esta versão**, confira se essas variáveis existem na VM (item 4.1). Se faltar alguma, o site não sobe.

---

## 3. Broker MQTT: login por controladora e TLS

O código já está pronto (backend e firmware), **desligado por padrão**, para não derrubar nada antes de a VM estar configurada. Para ligar, siga a ordem abaixo: em cada passo o sistema continua funcionando.

### 3.1 Login próprio por controladora + ACL — **crítico**
**Problema:** hoje todas as controladoras usam o **mesmo** usuário (`frota`), e a senha dele está no código do firmware. Quem extrair essa senha de um ESP pode publicar como **qualquer** controladora: mandar BLOQUEAR para outro carro ou ler a lista de cartões de todas.

**Como ficou:**
- Cada controladora entra com usuário = **IMEI** (ex.: `356938035643809`), client id `controladora-<imei>` e a **senha que ela mesma criou** no primeiro boot e que o gestor aprovou em Controladoras (ver `PLANO_CONTROLADORA.md`, etapa 1).
- Ela só pode publicar em `frota/<imei>/telemetria`, `frota/<imei>/resposta` e `provisionamento/<imei>` e só pode assinar `frota/<imei>/estado`, `comando`, `cartoes` e `regras`.
- O backend (`MqttAcessoService`) mantém o broker igual ao site pelo plugin **dynamic-security** do Mosquitto 2.x. Ele cria as permissões ao aprovar, desativa ao inativar, apaga ao excluir e sincroniza todas ao conectar. Os comandos levam senha: o log mostra só o tópico.
- **Senha no banco: só o hash BCrypt**, igual à senha dos usuários do site. A senha legível só existe na controladora. O backend a vê apenas quando ela se apresenta: se bater com o hash aprovado, repassa ao broker naquele momento (e não grava). Por isso, logo depois de aprovar, a controladora leva até ~2 min para entrar com o login próprio (é recusada uma vez, se apresenta e já entra). Se o broker perder o cadastro, ela se recadastra sozinha do mesmo jeito.
- **Controladora ainda não aprovada:** o broker recusa o login próprio dela. Então ela entra com o usuário `provisionamento`, publica o pedido em `provisionamento/<imei>` e sai. Esse usuário **só pode publicar** em `provisionamento/+`: não lê nada e não manda comando para ninguém. Se a senha dele vazar, o máximo que alguém consegue é criar um pedido falso, que o gestor recusa. Depois de aprovada, ela entra com o login próprio em no máximo 60 s.
- Com o login próprio ligado, a senha do `frota` (usuário do backend) **não vai mais no firmware**.
- Liga com a variável `MQTT_ACESSO_POR_CONTROLADORA=true` (propriedade `app.mqtt.acesso-por-controladora`).

**Passo a passo na VM:**

1. Achar o plugin e criar o arquivo do dynamic-security, com um administrador (vai pedir uma senha nova; guarde fora do projeto):
   ```bash
   dpkg -L mosquitto | grep dynamic_security
   sudo mosquitto_ctrl dynsec init /var/lib/mosquitto/dynamic-security.json admin-dynsec
   sudo chown mosquitto:mosquitto /var/lib/mosquitto/dynamic-security.json
   ```
2. Em `/etc/mosquitto/conf.d/frota.conf`, tirar `password_file`/`acl_file` (se houver) e deixar:
   ```
   per_listener_settings false
   allow_anonymous false
   plugin /usr/lib/x86_64-linux-gnu/mosquitto_dynamic_security.so
   plugin_opt_config_file /var/lib/mosquitto/dynamic-security.json
   listener 1883
   ```
   (use o caminho do plugin que o `dpkg -L` mostrou) e `sudo systemctl restart mosquitto`.
3. Recriar o usuário `frota` (o do backend) com **a mesma senha de hoje** e dar a ele acesso a tudo e ao tópico de controle. Cada comando pede a senha do `admin-dynsec` (`-P`):
   ```bash
   C="mosquitto_ctrl -h localhost -u admin-dynsec dynsec"
   $C createClient frota                     # pede a senha: a mesma do MQTT_PASSWORD
   $C createRole backend
   $C addRoleACL backend publishClientSend 'frota/#' allow
   $C addRoleACL backend subscribePattern 'frota/#' allow
   $C addRoleACL backend publishClientSend '$CONTROL/dynamic-security/#' allow
   $C addRoleACL backend subscribePattern '$CONTROL/dynamic-security/#' allow
   $C addRoleACL backend subscribePattern 'provisionamento/#' allow
   $C addRoleACL backend publishClientSend 'provisionamento/#' allow   # para apagar a mensagem retida
   $C addClientRole frota backend

   # usuário de provisionamento (pede uma senha nova: a mesma vai no MQTT_PROV_PASS do firmware)
   $C createClient provisionamento
   $C createRole provisionamento
   $C addRoleACL provisionamento publishClientSend 'provisionamento/+' allow
   $C addClientRole provisionamento provisionamento
   ```
   Neste ponto tudo funciona como antes: o backend e o ESP antigo ainda entram como `frota`.
4. Adicionar `MQTT_ACESSO_POR_CONTROLADORA=true` às variáveis do serviço e reiniciar o `frotasystem`. O backend cria o usuário de cada controladora aprovada (a senha entra quando ela se apresentar). Para conferir: `$C listClients` mostra `frota`, `provisionamento` e o IMEI de cada controladora aprovada com firmware novo.
5. No firmware: `#define USAR_LOGIN_PROPRIO 1` e, em `MQTT_PROV_PASS`, a senha do usuário `provisionamento` do passo 3. Gravar no ESP e conferir no monitor serial:
   - controladora nova: `login próprio recusado` → `apresentada em provisionamento/...` → `aguardando aprovação`;
   - depois de aprovar no site (até 60 s): `### MQTT CONECTADO`.
6. Quando **todas** as controladoras estiverem com o login próprio, trocar a senha do `frota` (`$C setClientPassword frota`) e atualizar `MQTT_PASSWORD` no serviço. A senha antiga, que está no código do firmware, deixa de valer.

### 3.2 MQTT com TLS
**Problema:** a conexão é `tcp://...:1883`, **sem criptografia**: a senha e os dados viajam abertos pela rede da operadora.

**Como ficou:** o firmware tem `#define USAR_TLS`. Com `1`, conecta na porta **8883** com TLS (`AT+CSSLCFG` + `AT+CMQTTSSLCFG`).

**Passo a passo na VM:**
1. Criar o DNS `mqtt.frotasystem.com` apontando para o IP da VM, **só DNS (nuvem cinza)** no Cloudflare. O proxy do Cloudflare não passa MQTT.
2. Emitir o certificado e deixá-lo legível pelo Mosquitto:
   ```bash
   sudo certbot certonly --nginx -d mqtt.frotasystem.com
   sudo mkdir -p /etc/mosquitto/certs
   sudo cp /etc/letsencrypt/live/mqtt.frotasystem.com/{fullchain,privkey}.pem /etc/mosquitto/certs/
   sudo chown mosquitto:mosquitto /etc/mosquitto/certs/*.pem
   ```
   (o certificado vence a cada 90 dias: repetir a cópia num `--deploy-hook` do certbot).
3. No `frota.conf`, acrescentar:
   ```
   listener 8883
   certfile /etc/mosquitto/certs/fullchain.pem
   keyfile /etc/mosquitto/certs/privkey.pem
   ```
   Liberar a porta 8883 no firewall da Azure e reiniciar o Mosquitto.
4. Firmware com `#define USAR_TLS 1`, gravar e testar.
5. Com todas as controladoras em TLS, trocar `listener 1883` por `listener 1883 127.0.0.1` (só o backend, na própria VM, usa a 1883), fechar a 1883 na Azure e conferir se o `MQTT_BROKER` do serviço aponta para `tcp://127.0.0.1:1883`.

**Limitação:** o modem não tem a CA gravada, então o firmware usa `authmode 0`. A conexão é criptografada, o que protege contra quem só escuta a rede, mas o modem não confere o certificado do servidor. Para conferir, seria preciso gravar a CA no modem (`AT+CCERTDOWN`) e usar `authmode 1`.

### 3.3 Firmware
- Login próprio (com o usuário de provisionamento) e TLS: prontos atrás dos `#define` acima. Os dois foram compilados, mas ainda **não testados no broker**.

### 3.4 VM (pendente)
- **HTTPS** no site (a senha do login não pode viajar aberta). Ainda **não verificado**.
- **Firewall:** só 22 (SSH), 80/443 (site) e a porta do MQTT abertas. PostgreSQL (5432) e 8080 **não** podem ficar abertos para fora.

---

## 4. Verificações na VM

Rodar na VM e conferir. **Não colar senhas em lugar nenhum**: os comandos abaixo mostram só os **nomes**.

### 4.1 Variáveis de ambiente do serviço
```bash
sudo systemctl show frotasystem -p Environment | tr ' ' '\n' | cut -d= -f1
```
Precisa aparecer: `JWT_SECRET`, `ADMIN_SENHA`, `MQTT_BROKER`, `MQTT_USER`, `MQTT_PASSWORD`, `DB_USER`, `DB_PASSWORD`, e o perfil `SPRING_PROFILES_ACTIVE=prod`.

### 4.2 Portas abertas
```bash
sudo ss -tlnp
```
`5432` e `8080` devem estar escutando só em `127.0.0.1` (ou bloqueadas no firewall da Azure).

### 4.3 HTTPS
```bash
sudo nginx -t && ls /etc/letsencrypt/live/ 2>/dev/null
```

### 4.4 Mosquitto
```bash
mosquitto -h | head -1
sudo grep -rn "listener\|allow_anonymous\|password_file\|acl_file\|plugin" /etc/mosquitto/
```

---

## 5. Limitações conhecidas (para o TCC)

- O token de login fica no `localStorage` do navegador. Se o site tiver uma falha de XSS, o token pode ser roubado. Alternativa mais segura: cookie `HttpOnly` (exige mudar o login).
- O limite de tentativas fica em memória (zera ao reiniciar) e é por e-mail.
- O cartão RFID (MIFARE) pode ser clonado com equipamento barato: o sistema confia no UID. Alternativa: cartões com criptografia (MIFARE DESFire).
