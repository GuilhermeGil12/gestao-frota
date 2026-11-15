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

## 3. Pendente

### 3.1 Broker MQTT — credencial por controladora + ACL — **crítico**
**Hoje:** todas as controladoras usam o **mesmo** usuário e senha no Mosquitto. Quem extrair a senha de um ESP pode publicar como **qualquer** controladora (mandar BLOQUEAR para outro carro, ler a lista de cartões de todas).

**Alvo:**
- Cada controladora com usuário próprio (`ctrl-<código>`) e senha própria.
- **ACL:** `ctrl-52` só pode ler e publicar em `frota/52/#`.
- O backend com usuário próprio, com acesso a `frota/#`.
- `allow_anonymous false`.

**Como:** o Mosquitto 2.x tem o plugin **Dynamic Security**: o backend cria o usuário e a ACL de uma controladora nova publicando uma mensagem num tópico de controle. Assim, cadastrar uma controladora no site já cria a credencial dela no broker, sem mexer na VM.

### 3.2 MQTT com TLS
**Hoje:** a conexão é `tcp://...:1883`, **sem criptografia**: a senha e os dados viajam abertos.
**Alvo:** porta **8883** com TLS. O A7670 suporta (`AT+CSSLCFG` + `AT+CMQTTSSLCFG`). Precisa de certificado no Mosquitto e do certificado da autoridade (CA) gravado no ESP.

### 3.3 Firmware
- Usuário e senha **próprios** de cada controladora (hoje estão fixos no código e são iguais para todas).
- Conexão com TLS (3.2).

### 3.4 VM
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
