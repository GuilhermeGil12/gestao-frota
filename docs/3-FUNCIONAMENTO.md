# Como o Frota System funciona — completo

Este documento explica **todas as partes** do sistema: a controladora no carro, o servidor, o site, e como elas conversam.

Sumário:
1. As peças do sistema
2. A controladora (ESP32)
3. A comunicação (MQTT)
4. O servidor (backend)
5. O site (frontend)
6. Os caminhos completos, passo a passo
7. Perguntas prováveis da banca

---

## 1. As peças do sistema

```
┌──────────────────────┐        4G         ┌───────────────────────── VM na Azure ─────────────────────────┐
│  CONTROLADORA (carro) │ ───── MQTT ─────► │  Mosquitto (broker) ◄──► Backend (Spring Boot) ◄──► PostgreSQL │
│  ESP32-S3 + modem 4G  │   porta 8883 (TLS) │                               ▲                               │
│  GPS, RFID, relés...  │ ◄──────────────── │                               │ HTTPS (Nginx + Cloudflare)    │
└──────────────────────┘                    └───────────────────────────────┼───────────────────────────────┘
                                                                            │
                                                           ┌────────────────┴───────────────┐
                                                           │  SITE (React) no navegador do  │
                                                           │  gestor  +  avisos no Telegram │
                                                           └────────────────────────────────┘
```

| Peça | O que é | Função |
|---|---|---|
| **Controladora** | Placa com ESP32-S3 instalada no carro | Lê GPS e cartão, libera ou bloqueia o carro, manda os dados |
| **Broker MQTT** | Mosquitto, na VM | O "correio": entrega as mensagens entre as controladoras e o backend |
| **Backend** | Spring Boot (Java 17), na VM | O "cérebro": regras, banco de dados, login, avisos |
| **Banco** | PostgreSQL, na VM | Guarda veículos, funcionários, pontos de GPS, comandos... |
| **Site** | React + Vite | A tela do gestor: mapa, cadastros, comandos, relatórios |
| **Telegram** | Bot | Avisos no celular (excesso, cercas, comandos, CNH...) |

---

## 2. A controladora (ESP32)

### 2.1 O hardware

| Componente | Para que serve |
|---|---|
| **ESP32-S3** | O microcontrolador, o "cérebro" da placa. Tem 2 núcleos |
| **Modem 4G A7670** | Conecta na internet pelo chip da operadora. Tem o **IMEI**, que é a identidade da placa |
| **Módulo GPS** | Dá a posição, a velocidade, a direção e a hora, 1 vez por segundo |
| **Leitor RFID PN532** | Lê o cartão (crachá) do motorista |
| **Cartão microSD** | Guarda a lista de cartões, os pontos sem internet e os áudios |
| **Amplificador MAX98357A + alto-falante** | Toca bipes, sirene e mensagens de voz |
| **3 relés** | Ignição, ar-condicionado e **corte da bomba de combustível** |
| **2 sensores de tensão (0–25 V)** | **Pós-chave** (saber se a chave está ligada) e **sistema/alternador** |

**Os relés:**
- **Ignição** e **ar** são ligados (acionados) só quando o motorista está **liberado**.
- **Bomba** é ligada ao contrário (contato NF): quando o relé é acionado, a bomba é **cortada** e o motor apaga. Isso só acontece quando o carro está **bloqueado**, com a chave ligada ou desligada. No resto do tempo o relé fica solto e a bomba funciona normalmente.

### 2.2 O programa: 4 tarefas ao mesmo tempo

O ESP32 tem 2 núcleos e roda 4 "tarefas" (FreeRTOS) em paralelo:

| Tarefa | Núcleo | O que faz |
|---|---|---|
| **taskGPS** | 0 | Lê o GPS e as tensões, percebe a chave ligando/desligando, decide quando gravar um ponto, controla os tempos (tolerância, bloqueio pendente) |
| **taskNFC** | 0 | Fica esperando um cartão quando o carro pede |
| **taskBuzzer** | 0 | Toca os sons |
| **taskModem** | 1 | Cuida do 4G e do MQTT: manda os pontos, recebe comandos e cartões, reenvia o que ficou no microSD |

Como as tarefas mexem nos mesmos dados, cada dado compartilhado tem um **mutex** (uma "trava": só uma tarefa mexe por vez).

### 2.3 Ao ligar (setup)

1. **Relés em estado seguro** primeiro (nenhum relé dá "pulso" ao ligar).
2. Lê as tensões e vê se a chave está ligada.
3. **Restaura o estado** salvo na memória (Preferences): se estava bloqueado, continua bloqueado.
4. Abre o microSD e carrega a **lista de cartões**.
5. Liga o leitor RFID, o áudio e o GPS.
6. Cria as 4 tarefas.
7. A taskModem liga o modem, procura a operadora, lê o **IMEI** e conecta no broker.

### 2.4 A máquina de estados (o coração da controladora)

A controladora está sempre em **um** destes 5 estados:

```
                 chave liga                cartão autorizado
  DESLIGADO ───────────────► AGUARDANDO_CARTAO ─────────────────► LIBERADO
      ▲   ◄───────────────        (bipando)                        │    ▲
      │     chave desliga                                chave     │    │ chave volta
      │                                                desliga     ▼    │ em até 60 s
      └──────────────── passou 60 s ───────────────────────── TOLERANCIA

  Qualquer estado ──── comando BLOQUEAR (com o carro < 5 km/h) ────► BLOQUEADO
  BLOQUEADO ──── comando DESBLOQUEAR ────► AGUARDANDO_CARTAO (ou DESLIGADO)
```

| Estado | O que significa | Relés | Som |
|---|---|---|---|
| **DESLIGADO** | Chave desligada | Todos soltos | Silêncio |
| **AGUARDANDO_CARTAO** | Chave ligada, esperando o crachá | Ignição e ar soltos (o carro não liga) | Bipe a cada ~1,2 s |
| **LIBERADO** | Motorista identificado | Ignição e ar acionados | Silêncio (sirene se passar do limite do veículo) |
| **TOLERANCIA** | Desligou a chave há menos de 60 s | Ignição e ar continuam acionados | Silêncio |
| **BLOQUEADO** | Bloqueado pelo gestor | Bomba cortada (com a chave ligada ou desligada) | Silêncio |

- **Tolerância de 60 s:** se o motorista desligar e religar o carro rapidinho (ex.: parou num posto), **não precisa passar o cartão de novo**.
- **O estado é salvo** na memória interna a cada mudança. Se a placa reiniciar com o carro andando, ela volta **liberada** (não pede cartão no meio da rua).
- No estado AGUARDANDO_CARTAO a placa **espera o cartão sem limite de tempo**. Ela não bloqueia sozinha.

### 2.5 O cartão (RFID)

1. No estado AGUARDANDO_CARTAO, o leitor procura um cartão.
2. Lê o número do cartão (UID), por exemplo `04A3B2C1`.
3. Confere na **lista de cartões autorizados**, que está na memória e no microSD.
4. Resultado:
   - **Autorizado:** toca "autorizado", vai para LIBERADO e guarda quem é o motorista. O número do cartão vai em cada ponto de GPS.
   - **Negado:** toca "negado" e continua esperando.
   - **Madrugada (22h–6h, se ligado):** toca "negado", mesmo com cartão autorizado.
5. O mesmo cartão parado em cima do leitor não é lido duas vezes seguidas (intervalo de 2 s).

**A lista de cartões:**
- Vem do servidor pelo tópico `frota/<IMEI>/cartoes`, como **mensagem retida**: a placa recebe a lista toda vez que conecta.
- É gravada no microSD de forma segura: primeiro num arquivo temporário, depois troca. Se a energia cair no meio, a lista antiga não se perde.
- **Funciona sem internet**, porque a lista fica no microSD.

### 2.6 O GPS e os pontos

O GPS dá uma leitura por segundo. A placa **não grava todas**: só as que importam. Cada leitura passa por uma regra, e o **primeiro motivo** que bater vira um ponto:

| Evento | Quando acontece |
|---|---|
| `ACELERACAO` | Ganhou 12 km/h ou mais em 1 segundo |
| `FREADA` | Perdeu 15 km/h ou mais em 1 segundo |
| `VIRADA_BRUSCA` | Virou 35° ou mais em 1 segundo, acima de 30 km/h |
| `EXCESSO_INICIO` / `EXCESSO_FIM` | Passou do limite do veículo / voltou para 5 km/h abaixo dele (padrão: 110 e 105 km/h) |
| `PARADA` | Ficou 30 s abaixo de 3 km/h |
| `PARTIDA` | Voltou a andar (acima de 8 km/h) |
| `ANTES_CURVA` | A leitura de 1 s antes de uma curva (para a linha dobrar no lugar certo) |
| `CURVA` | Mudou 15° de direção desde o último ponto, acima de 10 km/h |
| `TEMPO` | Passaram **10 s** (chave ligada) ou **5 min** (chave desligada) sem gravar |
| `IGNICAO_ON` / `IGNICAO_OFF` | A chave ligou ou desligou |

- **Trava de 1 s:** depois de gravar um ponto, espera 1 s (só o excesso passa na frente). Evita pontos repetidos.
- **GPS válido:** precisa ter posição recente (menos de 2 s) e pelo menos **3 satélites**. Sem GPS, só sai o `TEMPO`, com a última posição conhecida.

**O que vai em cada ponto (JSON):**
```json
{"data_localizacao":"2026-11-22 14:30:05", "latitude":-21.123456, "longitude":-50.123456,
 "velocidade":42.5, "altitude":410, "qtd_satelite":9, "hdop":1.2, "ign":1,
 "crachastr":"04A3B2C1", "tensao_pos_chave":12.6, "tensao_sistema":14.1, "evento":"CURVA"}
```

### 2.7 Sem internet: o microSD

**Confirmação de cada lote:** cada lote de pontos ganha um número. Depois de salvar, o servidor responde no tópico `confirmacao`: *"salvei o lote N"*. **A placa só apaga o lote depois dessa resposta.**
- O "OK" do modem não basta. Com o sinal caindo, o modem pode dizer que enviou e o lote se perder no caminho.
- Se a resposta não chega em **30 s**, ou a conexão cai, o lote vai para o microSD e é enviado de novo.
- Se o lote tinha chegado e só a resposta se perdeu, o servidor reconhece os pontos repetidos (mesmo veículo, mesmo horário, mesma posição) e **não grava duas vezes**.
- O reenvio do microSD funciona do mesmo jeito: um lote por vez, e cada lote só sai do arquivo depois da confirmação.
- **Ponto estragado não trava a fila:** o servidor lê cada ponto sozinho. Um campo inválido (ex.: velocidade `nan`) é gravado vazio, e um ponto sem posição válida é descartado; o lote é confirmado normalmente. Só um erro do **banco** impede a confirmação (aí o lote é reenviado depois).


1. Os pontos ficam numa fila na memória (até 300).
2. Se ficar **30 s sem conexão**, os pontos vão para o arquivo `buffer.txt` no microSD, em lotes de 20. Cabem uns 15 mil pontos (4 MB).
3. Quando a conexão volta, a placa manda **primeiro os pontos novos** e depois **reenvia o microSD aos poucos**, 2 lotes por ciclo.
4. No final, apaga o arquivo.
5. Se o envio de um lote falhar (sinal fraco), ele **continua no microSD** e é enviado de novo depois de reconectar. Nenhum ponto é jogado fora.

### 2.8 O modem e a reconexão

- Ao ligar, o modem leva de 10 a 60 s para achar a operadora. Isso é normal.
- Se a conexão cair, tenta de novo em **5 s, 10 s, 30 s e 60 s**, aumentando o intervalo.
- Se o modem ficar **2 min sem responder**, a placa reinicia só o modem.
- Se ficar **3 min sem achar a operadora**, também reinicia o modem (pode ser a antena ou o chip).

### 2.9 Os sons

| Som | Quando |
|---|---|
| Bipe curto repetido | Pedindo o cartão (AGUARDANDO_CARTAO) |
| "Autorizado" | Cartão aceito |
| "Negado" | Cartão recusado |
| "Bloqueado" / "Desbloqueado" | Comando do gestor executado |
| Sirene de 2 tons | Excesso de velocidade (acima do limite do veículo, padrão 110 km/h) |
| Sirene por 15 s | Comando **APITAR** (para achar o carro num estacionamento) |

Os áudios ficam no microSD (`/audio300/*.wav`).

### 2.10 Os comandos do gestor

| Comando | Como chega | O que a placa faz |
|---|---|---|
| **BLOQUEAR** | Tópico `estado` (retido) | Fica **pendente** até o carro estar abaixo de 5 km/h ou com a chave desligada. Aí corta a bomba e toca "bloqueado" |
| **DESBLOQUEAR** | Tópico `estado` (retido) | Sai do bloqueio e volta a pedir o cartão |
| **APITAR** | Tópico `comando` | Toca a sirene por 15 s |

- Cada comando tem um **número (id)**. Depois de executar, a placa responde `{"id":15,"status":"EXECUTADO"}` no tópico `resposta`.
- As respostas que não conseguiram sair ficam guardadas na memória e são enviadas quando a conexão voltar.
- Como o `estado` é **retido**, a placa recebe o último comando toda vez que reconecta. Ela guarda o id do último executado para **não executar duas vezes**.

### 2.11 Identidade e login no broker

- **IMEI** = identidade (lido do modem com `AT+CGSN` e guardado na memória).
- **Senha** = 20 caracteres sorteados no primeiro boot, guardados na memória.
- A cada conexão:
  1. Tenta entrar com o **login próprio** (usuário = IMEI).
  2. Se entrou, assina os tópicos dela e se apresenta em `provisionamento/<IMEI>`.
  3. Se foi recusada (ainda não aprovada), entra com o usuário `provisionamento`, se apresenta e sai. Tenta de novo mais tarde.
- Conexão com **TLS** na porta 8883 (`USAR_TLS 1`).

### 2.12 Configurações no código (`#define`)

| Opção | Valor | Significado |
|---|---|---|
| `USAR_TLS` | 1 | Conexão criptografada na porta 8883 |
| `USAR_LOGIN_PROPRIO` | 1 | Cada placa entra com o próprio IMEI e senha |
| `POS_CHAVE_ATIVO` | 1 (0 só para teste) | Usa o fio do pós-chave para saber se a chave está ligada |
| `ENVIAR_CAMPO_EVENTO` | 1 | Manda o motivo do ponto (`CURVA`, `FREADA`...) |

---

## 3. A comunicação (MQTT)

### 3.1 O que é MQTT
É um protocolo de mensagens no modelo **publicar/assinar**, como um quadro de avisos:
- Quem quer mandar **publica** num **tópico** (um "endereço", como `frota/867284068162686/telemetria`).
- Quem quer receber **assina** aquele tópico.
- O **broker** (Mosquitto) é quem recebe e entrega.
- **Mensagem retida:** o broker guarda a última mensagem do tópico e entrega para quem assinar depois. Assim a placa recebe o estado e os cartões mesmo que tenha estado desligada na hora em que foram mandados.

### 3.2 Os tópicos

| Tópico | Direção | Conteúdo | Retido? |
|---|---|---|---|
| `provisionamento/<IMEI>` | placa → servidor | "Sou o IMEI tal, senha, versão" | Sim (o backend apaga depois de ler) |
| `frota/<IMEI>/telemetria` | placa → servidor | Lote de pontos de GPS (até 20) | Não |
| `frota/<IMEI>/resposta` | placa → servidor | "Comando N executado" | Não |
| `frota/<IMEI>/estado` | servidor → placa | BLOQUEADO ou LIBERADO, com o id | Sim |
| `frota/<IMEI>/comando` | servidor → placa | APITAR, com o id | Não |
| `frota/<IMEI>/cartoes` | servidor → placa | Lista de cartões autorizados | Sim |
| `frota/<IMEI>/regras` | servidor → placa | Bloqueio de madrugada (ligado, início, fim) e **limite de velocidade do veículo** | Sim |
| `frota/<IMEI>/confirmacao` | servidor → placa | "Salvei o lote N": só então a placa apaga o lote | Não |

O backend assina `frota/+/telemetria`, `frota/+/resposta` e `provisionamento/+`. O `+` quer dizer "qualquer controladora".

### 3.3 Portas
- **8883**: placas → broker, com TLS, aberta para a internet.
- **1883**: backend → broker, por dentro da VM.

---

## 4. O servidor (backend)

### 4.1 Tecnologias
- **Java 17 + Spring Boot 3.4**, com Spring Data JPA (Hibernate) e **PostgreSQL**.
- Organização em camadas: **Controller** (recebe a requisição do site) → **Service** (as regras) → **Repository** (o banco).
- Roda na VM da Azure como serviço (`frotasystem`), e o próprio Spring entrega os arquivos do site.

### 4.2 Os principais serviços

| Serviço | O que faz |
|---|---|
| `MqttService` | Conecta no broker, recebe as mensagens das placas e publica estado, comandos, cartões e regras |
| `LocalizacaoService` | Recebe os lotes de pontos, identifica o motorista pelo cartão, salva no banco, avisa excesso de velocidade |
| `ControladoraService` | Recebe a apresentação das placas, confere a senha (hash), aprova, recusa, edita, exclui |
| `MqttAcessoService` | Mantém o login de cada placa no broker igual ao cadastro do site |
| `ComandoService` | Cria o comando (PENDENTE), publica para a placa e marca EXECUTADO quando ela responde |
| `CartaoRfidService` | Monta a lista de cartões ativos e publica para as placas (vazia na madrugada, se ligado) |
| `CnhService` | Todo dia confere as CNHs; vencida bloqueia os cartões do motorista (se a opção estiver ligada) |
| `AvisoCercaService` | Percebe quando um carro **entra** ou **sai** de uma cerca e avisa no Telegram |
| `RevisaoService` | A cada 15 min soma os km rodados e avisa quando faltam 500 km para a revisão. Só deixa registrar a revisão a partir desse ponto (ou com ela vencida) |
| `RelatorioService` / `RelatorioLiderService` | Relatórios de uso e relatório semanal por e-mail para os líderes (segunda, 7h) |
| `TelegramService` | Bot do Telegram: conectar a conta, mandar avisos |
| `NotificacaoService` | As notificações do sino no site |
| `AtividadeService` | Registra quem fez o quê (ex.: "Fulano mandou bloquear ABC-1234") |

### 4.3 Tarefas automáticas (agendadas)

| Quando | O quê |
|---|---|
| 22h e 6h | Manda a lista de cartões vazia / cheia (bloqueio de madrugada) |
| Todo dia, 00:05 | Confere CNHs vencidas |
| A cada 15 min | Atualiza o km dos veículos e confere as revisões |
| Segunda, 7h | Relatório semanal para os líderes |
| Contínuo | Lê as mensagens do bot do Telegram |

### 4.4 Avisos no Telegram
- Excesso de velocidade: um aviso quando **começa** e outro quando **termina**, com a velocidade máxima, a duração e o link do mapa.
- Entrada e saída de cercas (incluindo "chegou na casa de Fulano").
- Comando executado.
- CNH vencida.
- Controladora nova aguardando aprovação.
- Revisão chegando.

Cada usuário escolhe quais avisos quer receber (Perfil > Minhas notificações), e só recebe o que a permissão dele deixa ver.

Pontos com mais de 30 min (reenviados do microSD) **não geram aviso**, porque seriam notícia velha.

---

## 5. O site (frontend)

### 5.1 Tecnologias
- **React 19 + Vite**, JavaScript.
- **Tailwind CSS + shadcn/ui** (componentes visuais), ícones **lucide-react**.
- **Leaflet** com mapa do **OpenStreetMap**.
- Chamadas ao backend com **Axios**, com o token JWT renovado automaticamente.

### 5.2 As telas

| Tela | O que tem |
|---|---|
| **Apresentação** | Página inicial pública com os planos |
| **Login** | Entrar, recuperar a senha |
| **Dashboard** | Os veículos com a situação (em movimento, parado, sem sinal), o motorista, a velocidade, a tensão do alternador e botões de **bloquear** e **apitar** |
| **Monitoramento** | Mapa em tempo real (atualiza a cada 5 s), com todos os carros ou um só. Com um só, mostra o **rastro do dia**, a seta de direção e os trechos de excesso em vermelho |
| **Rotas** | Escolhe o veículo e o período e vê o **trajeto** no mapa, com o resumo (distância, tempo, velocidade máxima, **média em movimento** = distância ÷ tempo em movimento, a mesma conta do relatório) e a tabela de pontos |
| **Alertas** | Excessos de velocidade e visitas às cercas, com filtros |
| **Cercas** | Cadastrar áreas no mapa (centro + raio). A casa de cada funcionário vira uma cerca automaticamente |
| **Veículos** | Cadastro (placa, RENAVAM com dígito verificador e sem repetir, inclusive na edição, limite de velocidade, km atual) e revisão. O botão **"Revisão"** só aparece quando faltam 500 km ou menos (ou já venceu) |
| **Funcionários** | Cadastro com endereço (busca por CEP), CNH (número, categoria, validade), setor e líder |
| **Cartões** | Cartões RFID ligados a cada funcionário |
| **Controladoras** | Abas **Cadastradas** e **Aguardando aprovação**. Aprovar, recusar, editar, inativar, excluir |
| **Comandos** | Mandar BLOQUEAR, DESBLOQUEAR ou APITAR e ver o histórico, com quem mandou e se foi executado |
| **Relatórios** | Resumo por veículo (distância, tempo em movimento, excessos, eventos de condução), todos os pontos e visitas às cercas. Exporta CSV |
| **Configurações** | Empresa, regras de acesso (**CNH vencida**, **madrugada**), revisão, relatório dos líderes, usuários, setores, permissões e atividades |
| **Perfil** | Dados pessoais, foto, trocar senha, conectar o Telegram, escolher os avisos |

### 5.3 Padrões do site
- Interface em **português**, datas em `DD/MM/AAAA`.
- **Tema claro e escuro** (o mapa também escurece).
- Funciona no **celular** (layout responsivo).
- Mensagens de sucesso com `sonner` e confirmação de ações perigosas com `sweetalert2`.
- Cada tela só aparece para quem tem a **permissão**.
- Validações iguais no site e no backend (CPF, placa, CNH...).

---

## 6. Os caminhos completos, passo a passo

### 6.1 Instalar uma controladora nova
1. Grava o firmware (o mesmo para todas) e instala no carro.
2. Ela liga, cria a senha e lê o IMEI.
3. Tenta o login próprio → recusada (ninguém aprovou ainda).
4. Entra como `provisionamento` e publica "quero entrar".
5. O backend cria a controladora como **Aguardando aprovação** e avisa no sino e no Telegram.
6. O gestor confere o IMEI com a etiqueta e **aprova**, escolhendo o veículo.
7. O backend cria o usuário dela no broker e publica a lista de cartões e o estado.
8. Na próxima tentativa (até 60 s), ela entra com o **login próprio** e recebe tudo.

### 6.2 O motorista liga o carro
1. A chave liga → a tensão do pós-chave sobe → **AGUARDANDO_CARTAO**, bipando.
2. O motorista passa o crachá → está na lista → toca "autorizado" → **LIBERADO**.
3. Os relés de ignição e ar são acionados → o carro funciona.
4. Sai um ponto `IGNICAO_ON`, e daí em diante um a cada 10 s e nos eventos.

### 6.3 Um ponto de GPS até o mapa
1. O GPS dá a leitura → a taskGPS decide que vira ponto (ex.: `CURVA`).
2. O ponto vai para a fila → a taskModem junta até 20 e publica em `frota/<IMEI>/telemetria`.
3. O broker entrega ao backend.
4. O backend confere se a controladora está **aprovada**, acha o veículo, identifica o motorista pelo cartão, confere excesso e cercas, e salva.
5. O site, a cada 5 s, busca as últimas posições e desenha no mapa.

### 6.4 O gestor bloqueia um carro
1. No site, clica em **Bloquear** → confirmação.
2. O backend cria o comando como **PENDENTE** e registra quem mandou.
3. Publica em `frota/<IMEI>/estado`: `{"id":15,"estado":"BLOQUEADO"}` (retido).
4. A placa recebe:
   - se o carro está andando, fica **pendente**;
   - quando ficar abaixo de 5 km/h ou a chave desligar, **bloqueia**.
5. A bomba é cortada, toca "bloqueado", e a placa responde `{"id":15,"status":"EXECUTADO"}`.
6. O backend marca como **EXECUTADO** e avisa no Telegram.
7. Se a placa estava sem sinal, recebe a mensagem retida quando reconectar.

### 6.5 Sem internet
1. A conexão cai → os pontos vão para a fila e, depois de 30 s, para o microSD.
2. O cartão continua funcionando (a lista está no microSD).
3. O estado (bloqueado/liberado) continua valendo (está na memória).
4. A conexão volta → manda os pontos novos, as respostas pendentes e depois reenvia o microSD.

---

## 7. Perguntas prováveis da banca

**"Por que ESP32?"**
> Barato, tem 2 núcleos (dá para separar a comunicação do resto), Wi-Fi/Bluetooth embutidos, muita biblioteca e roda FreeRTOS para várias tarefas ao mesmo tempo.

**"Por que 4G e não Wi-Fi?"**
> O carro anda pela cidade, longe de qualquer Wi-Fi. O 4G funciona em qualquer lugar com sinal de celular.

**"Por que não grava um ponto por segundo?"**
> Gastaria muito dado móvel e encheria o banco. A placa grava só quando algo acontece (curva, freada, parada...) e a cada 10 s. Assim a rota fica boa com bem menos pontos.

**"Por que a rota às vezes corta as esquinas?"**
> Entre dois pontos o mapa liga com uma linha reta. Para melhorar, a placa grava nas curvas a partir de 15° e também o ponto de 1 s antes da curva. Uma melhoria futura é o "map matching" (encaixar a linha nas ruas com o OSRM).

**"O que acontece se a placa reiniciar com o carro andando?"**
> O estado fica salvo na memória interna. Ela volta liberada e não pede o cartão no meio da rua.

**"Como o sistema sabe quem está dirigindo?"**
> Pelo cartão RFID. O número do cartão vai em cada ponto, e o backend acha o funcionário dono do cartão.

**"Como a placa sabe a hora certa?"**
> Pela hora do GPS, que vem dos satélites. Ela usa essa hora nos pontos e na regra da madrugada.

**"Qual a diferença entre a placa e o backend no controle de acesso?"**
> A **placa** decide na hora (cartão na lista? está bloqueada?), mesmo sem internet. O **backend** decide **quem entra na lista** (cartões ativos, CNH em dia, madrugada) e manda a lista para a placa.

**"Como garante que um comando foi executado?"**
> Cada comando tem um id. A placa responde com o mesmo id depois de executar, e só então o site mostra "Executado". Se a resposta não sair, fica guardada e é reenviada.

**"E se mandar o mesmo comando duas vezes?"**
> A placa guarda o id do último comando executado. Se receber o mesmo de novo (por exemplo, a mensagem retida ao reconectar), ignora.
