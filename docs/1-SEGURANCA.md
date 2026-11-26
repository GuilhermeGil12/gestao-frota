# Segurança do Frota System — explicada

Este documento explica, em linguagem simples, **como o sistema se protege** e **por que cada proteção existe**. No final há as perguntas que a banca pode fazer, com as respostas.

> Detalhes técnicos e os comandos da VM estão no `SEGURANCA.md`, na raiz do projeto.
> Este aqui é para **entender e explicar**.

---

## 1. A ideia geral: um prédio com portaria

Pense no sistema como um **prédio**:

| No prédio | No sistema |
|---|---|
| O terreno com muro e portões | A **VM na Azure** (o servidor), com o firewall que só abre algumas portas |
| A portaria do site | O **backend** (Spring Boot), que confere o login de quem usa o site |
| A portaria das controladoras | O **broker MQTT** (Mosquitto), que confere o login de cada controladora |
| O síndico | O **gestor**, que aprova quem pode entrar (controladoras novas, usuários, permissões) |
| Crachá de cada morador | **Login próprio** de cada controladora e de cada usuário |
| Carta lacrada x cartão-postal | Conexão **criptografada** (HTTPS / TLS) x conexão aberta |

Cada camada protege uma coisa diferente. Se uma falhar, as outras continuam valendo. Isso se chama **defesa em camadas**.

---

## 2. Proteções do site (usuários)

### 2.1 Login com JWT
- Ao entrar com e-mail e senha, o backend entrega um **token** (JWT), uma espécie de **crachá temporário**.
- O crachá vale **15 minutos**. Junto vem um **refresh token**, que vale **7 dias** e serve para pegar um crachá novo sem digitar a senha de novo.
- A cada renovação, o refresh token antigo é **trocado** (rotação). Se alguém roubar um refresh token velho, ele já não funciona.
- O token é assinado com um segredo (`JWT_SECRET`) que só o servidor conhece. Ninguém consegue "fabricar" um token falso.

### 2.2 Senhas com BCrypt
- As senhas dos usuários **não ficam guardadas** no banco. Fica só o **hash BCrypt**: um "embaralhado" que não tem volta.
- No login, o backend embaralha a senha digitada do mesmo jeito e compara os dois embaralhados.
- Se o banco vazar, quem pegar só vê os embaralhados, não as senhas.

### 2.3 Limite de tentativas
- Depois de **5 senhas erradas seguidas**, aquele e-mail fica **bloqueado por 15 minutos**.
- Isso impede alguém de ficar testando milhares de senhas (ataque de força bruta).
- A mensagem de erro é a mesma para e-mail que não existe, para não revelar quais e-mails estão cadastrados.

### 2.4 Permissões conferidas no servidor
- Cada ação (ver veículos, mandar bloquear, aprovar controladora...) tem uma **permissão**.
- O site **esconde** os botões que o usuário não pode usar, mas quem **garante** é o backend: toda rota tem `@PreAuthorize`. Mesmo que alguém chame a API direto, sem o site, é barrado.
- As permissões são dadas por **setor** e por **usuário**.

### 2.5 Outras proteções do site
- **HTTPS**: o site passa pelo Cloudflare e pelo Nginx com certificado. A senha do login viaja criptografada.
- **CORS**: só o próprio site (`frotasystem.com`) pode chamar a API pelo navegador. Um site estranho não consegue usar a sessão do usuário.
- **Erros sem detalhes**: em produção, um erro não mostra a mensagem interna do servidor (que poderia dar pistas a um atacante). Um erro do banco (por exemplo, um valor repetido) aparece como "algum dado já está cadastrado em outro registro", **nunca com o SQL**, que mostraria nomes de tabelas e colunas.
- **Recuperação de senha**: código por e-mail que vale 15 minutos, com limite de tentativas.
- **Produção não sobe com senha padrão**: se faltar `JWT_SECRET`, `ADMIN_SENHA`, `MQTT_BROKER` ou `MQTT_USER`, o sistema **se recusa a iniciar**. Assim é impossível esquecer uma senha de teste no servidor de verdade.
- **Segredos fora do código**: senhas do banco, do e-mail, do broker e do bot do Telegram ficam em **variáveis de ambiente** na VM (`/etc/frotasystem.env`), nunca no GitHub.

---

## 3. Proteções das controladoras (ESP32)

Aqui está a parte mais importante para a banca, porque é o que diferencia o projeto.

### 3.1 Sem rota aberta na internet
Antes, a controladora mandava os dados por HTTP, e algumas rotas da API ficavam **abertas sem login**: qualquer um podia inventar pontos de GPS ou baixar a lista de cartões.

Agora a controladora fala **só por MQTT**, e essas rotas foram **apagadas**. Na API, só o login (`/api/auth/**`) fica aberto.

### 3.2 Identidade pelo IMEI
- O **IMEI** é o número de fábrica do **modem 4G** da placa (15 dígitos). Não muda e não se repete, como o número de série de um celular.
- A controladora usa o IMEI como **nome de usuário**. O mesmo firmware serve para todas as placas: não precisa gravar um código diferente em cada uma.

### 3.3 Senha criada pela própria controladora
- Na **primeira vez** que liga, a controladora **sorteia uma senha** de 20 letras e números, usando o sorteador do próprio chip (`esp_random()`).
- Ela guarda a senha na memória interna (**Preferences**), que não se apaga ao desligar.
- Ninguém digita essa senha e ela não está no código. Cada placa tem a sua.

### 3.4 Aprovação pelo gestor
A controladora se apresenta, mas **só entra depois que o gestor aprovar** no site:

```
1. Placa nova liga → "sou o IMEI 8672..., minha senha é X"
2. Site mostra em Controladoras > "Aguardando aprovação" (e avisa no sino e no Telegram)
3. Gestor confere o IMEI com a etiqueta do modem e clica em "Aprovar"
4. A partir daí a placa recebe cartões e comandos, e os pontos dela são salvos
```

Enquanto não é aprovada, ela **não recebe** cartões nem comandos e os pontos dela **são descartados**.

### 3.5 Senha da controladora guardada como hash
- O backend guarda a senha da controladora **só como hash BCrypt**, igual às senhas dos usuários.
- **Como ele confere, se não tem a senha?** A cada conexão a controladora se apresenta de novo, mandando a senha. O backend **embaralha** o que recebeu e compara com o embaralhado guardado.
- Na **primeira vez**, não há nada para comparar: por isso quem decide é o **gestor** (aprovação). Depois de aprovada, o backend passa a comparar.
- Se a placa tiver a memória apagada, ela cria uma senha nova. O backend percebe que não bate e mostra **"pediu uma senha nova"** para o gestor aprovar. Até lá, continua valendo a antiga.

### 3.6 Login próprio no broker (cada uma no seu quadrado)
O broker MQTT é o "correio" das mensagens. Antes, **todas** as placas entravam com o **mesmo** usuário (`frota`), e a senha dele estava no código do firmware. Quem descobrisse a senha de uma placa podia **mandar bloquear qualquer carro**.

Agora o broker usa o plugin **dynamic-security** do Mosquitto, e cada placa tem **o próprio login e as próprias permissões**:

| Usuário no broker | Quem usa | O que pode fazer |
|---|---|---|
| `frota` | O **backend** | Tudo em `frota/#` e administrar o broker |
| `<IMEI>` | Cada **controladora aprovada** | Só os **próprios** tópicos: `frota/<seu IMEI>/...` |
| `provisionamento` | Placa **ainda não aprovada** | Só **publicar** "quero entrar" em `provisionamento/<IMEI>`. Não lê nada |
| `admin-dynsec` | Só o **administrador**, na VM | Configurar o broker à mão |

- Uma placa **não consegue** ler nem mandar mensagens nos tópicos de outra placa.
- Se a senha do `provisionamento` vazar (ela está no firmware), o máximo que alguém faz é criar um **pedido falso**, que o gestor recusa.
- O **backend** cria, atualiza e apaga o usuário de cada controladora **sozinho**, junto com o cadastro do site (aprovar, inativar, excluir).
- A senha da placa vai para o broker **uma vez só**. O broker **derruba** a conexão quando a senha muda, então o backend só manda de novo se a senha mudar ou se o broker reiniciar.

### 3.7 Conexão criptografada (TLS)
- **Sem TLS**, os dados vão como um **cartão-postal**: quem estiver no caminho (na rede da operadora, por exemplo) consegue ler a localização, os cartões e até a senha.
- **Com TLS**, vão como uma **carta lacrada**: só o broker consegue abrir.
- A placa conecta na porta **8883** (com TLS). O certificado foi criado na própria VM e vale 10 anos.
- O **backend** fala com o broker pela porta **1883** (sem TLS), mas **por dentro da VM**: essa conversa nunca sai da máquina.

**Limitação (falar na banca):** o modem da placa **criptografa**, mas **não confere** o certificado do servidor (`authmode 0`). Isso protege contra quem só **escuta** a rede, mas não contra alguém que monte um **servidor falso** no meio do caminho. Para conferir, seria preciso gravar o certificado no modem (`AT+CCERTDOWN`). Fica como trabalho futuro.

### 3.8 O carro nunca é desligado andando
Não é "segurança de informação", mas é segurança **das pessoas**:
- O comando **BLOQUEAR** fica **pendente** até o carro estar abaixo de **5 km/h** ou com a chave desligada. Nunca corta o motor em movimento.
- Sem GPS válido, não dá para saber a velocidade: ele **continua esperando**.
- O estado (bloqueado ou liberado) fica guardado na memória: se a placa reiniciar, **volta como estava**.

### 3.9 Cartão RFID e regras de acesso
- A controladora só libera o carro com um **cartão autorizado**. A lista vem do servidor e também fica gravada no **cartão microSD**, para funcionar sem internet.
- **CNH vencida**: se a opção estiver ligada, os cartões do motorista com CNH vencida são **bloqueados** automaticamente.
- **Bloqueio de madrugada**: das 22h às 6h, nenhum cartão libera o carro (opção em Configurações). O servidor manda a lista vazia, e a placa confere também pela hora do GPS, caso esteja sem sinal às 22h.

---

## 4. Proteções da VM (servidor)

| O quê | Como |
|---|---|
| Portas abertas | Só 22 (SSH), 80/443 (site) e 8883 (MQTT com TLS). Banco (5432) e backend (8080) só por dentro |
| Firewall | Regras de entrada da Azure (NSG) |
| Segredos | Em `/etc/frotasystem.env`, fora do git |
| Site | Atrás do Cloudflare e do Nginx, com HTTPS |

---

## 5. Limitações conhecidas (é bom citar antes que perguntem)

1. **Certificado não conferido pelo modem** (item 3.7).
2. **Cartão RFID pode ser clonado**: o sistema confia no número do cartão (UID), e cartões MIFARE comuns podem ser copiados com equipamento barato. Solução futura: cartões com criptografia (MIFARE DESFire).
3. **Token do site no navegador** (`localStorage`): se o site tivesse uma falha de XSS, o token poderia ser roubado. Alternativa: cookie `HttpOnly`.
4. **Limite de tentativas em memória**: reiniciar o servidor zera a contagem.
5. **Quem garante a identidade da placa é o gestor**: o site não tem como saber se aquele IMEI é de uma placa da empresa. Por isso existe a aprovação, e o IMEI deve ser conferido com a etiqueta.
6. **Senha do `provisionamento` no firmware**: quem extrair o firmware a descobre, mas ela só permite criar pedidos de aprovação.

---

## 6. Perguntas prováveis da banca

**"E se roubarem uma controladora?"**
> Cada placa tem o próprio login e só acessa os próprios tópicos. Com ela, a pessoa não consegue mexer nos outros carros. O gestor pode **inativar ou excluir** a controladora no site, e o backend apaga o login dela do broker na hora.

**"A senha da controladora fica salva onde?"**
> Legível, só dentro da própria placa (Preferences). No banco fica só o hash BCrypt. No broker fica cadastrada (também embaralhada pelo próprio Mosquitto).

**"Se o banco só tem o hash, como o backend confere a senha?"**
> A placa manda a senha a cada conexão. O backend embaralha o que recebeu e compara com o hash guardado, igual a um login de site. Na primeira vez não há com o que comparar, por isso o gestor aprova.

**"Por que MQTT e não HTTP?"**
> MQTT mantém **uma conexão aberta** nos dois sentidos: o servidor consegue mandar um bloqueio na hora, sem a placa ficar perguntando. Gasta menos dados no 4G. E as mensagens **retidas** fazem a placa receber o último estado e a lista de cartões assim que reconecta.

**"Os dados viajam criptografados?"**
> Sim. O site usa HTTPS e a placa usa MQTT com TLS na porta 8883. A limitação é que o modem não confere o certificado do servidor.

**"Dá para alguém mandar bloquear um carro que não é dele?"**
> Pelo site, só quem tem a permissão de comandos, e fica registrado quem mandou (tela de Atividades). Pelo broker, só o backend pode publicar nos tópicos de comando; cada placa só lê os dela.

**"E se a internet cair?"**
> A placa continua funcionando sozinha: a lista de cartões está no microSD, os pontos vão para o microSD e são reenviados quando a conexão volta. O estado de bloqueio fica na memória interna.

**"Pode desligar o carro andando?"**
> Não. O bloqueio só é aplicado abaixo de 5 km/h ou com a chave desligada.
