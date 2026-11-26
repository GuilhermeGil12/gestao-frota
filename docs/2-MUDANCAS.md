# O que mudamos e como funciona

Este documento conta **o que foi feito na reta final** do projeto (novembro de 2026), o **motivo** de cada mudança e **como ela funciona**. No fim há um resumo da história do projeto antes disso.

> Situação de cada item:
> - ✅ feito e testado
> - 🧪 feito, falta testar com a placa de verdade
> - ⏳ ainda não feito

---

## 1. Controladora se apresenta pelo IMEI e o gestor aprova ✅

**Antes:** cada placa era cadastrada à mão no site, e o número dela (`CODIGO = "2"`) era gravado no firmware. Cada placa precisava de um firmware diferente, e a senha era digitada nos dois lados.

**Agora:**
- A placa lê o **IMEI** do modem (`AT+CGSN`) e usa como identidade.
- Na primeira vez que liga, **cria a própria senha** e guarda na memória interna.
- A cada conexão, publica em `provisionamento/<IMEI>`: *"sou o IMEI tal, minha senha é esta, meu firmware é a versão tal"*.
- O site mostra a placa em **Controladoras > Aguardando aprovação**, e avisa no sino e no Telegram.
- O gestor clica em **Aprovar** e escolhe o veículo.
- Os tópicos passaram de `frota/2/...` para `frota/<IMEI>/...`.
- **O mesmo firmware serve para todas as placas.**

**Compatibilidade:** a controladora antiga (número 2) continua funcionando com o firmware velho até ser regravada.

---

## 2. Tela de Controladoras com abas ✅

**Antes:** as placas aguardando aprovação apareciam num quadro misturado com as cadastradas.

**Agora:** duas abas, **Cadastradas** e **Aguardando aprovação**. A segunda mostra um número com quantas estão esperando. O link do aviso (sino) abre direto a aba certa (`/controladoras?aba=aguardando`).

---

## 3. Excluir controladora não funcionava ✅

**Problema:** ao excluir uma controladora ligada a um veículo, o site dizia "excluída", mas ela voltava. A placa até continuava liberando cartões.

**Causa:** o veículo "segurava" a controladora (relação em cascata no banco). Ao salvar o veículo, ela era recriada.

**Correção:** antes de excluir, o backend **desliga a controladora do veículo** e **apaga o histórico de comandos** dela. Depois apaga a controladora. Tem um teste automático para isso.

---

## 4. Senha da controladora guardada como hash ✅

**Antes:** a senha da placa ficava **legível** no banco de dados.

**Agora:** fica só o **hash BCrypt** (o "embaralhado" sem volta), como as senhas dos usuários.

**Como funciona:**
1. Na primeira apresentação, o backend guarda o **hash** da senha e a placa fica "aguardando aprovação".
2. O gestor aprova.
3. Nas próximas apresentações, o backend **embaralha a senha recebida e compara** com o hash.
   - Bateu: está tudo certo, e a senha é repassada ao broker (sem gravar).
   - Não bateu: aparece "pediu uma senha nova" para o gestor aprovar.
4. Senha antiga que ainda estava legível no banco vira hash sozinha na próxima apresentação.

---

## 5. Login próprio de cada controladora no broker ✅

**Problema:** todas as placas entravam no broker com o **mesmo usuário** (`frota`), e a senha dele estava no código do firmware. Com essa senha, dava para controlar **qualquer** carro.

**O que foi feito:**

**Na VM (broker Mosquitto):**
- Ligamos o plugin **dynamic-security**: o broker passa a ter usuários e permissões que podem ser mudados **sem reiniciar**.
- Criamos os usuários:
  - `frota`, do backend (acesso a tudo);
  - `provisionamento`, que só pode publicar "quero entrar";
  - `admin-dynsec`, do administrador.
- No backend, ligamos `MQTT_ACESSO_POR_CONTROLADORA=true`.

**No backend (`MqttAcessoService`):**
- Ao **aprovar** uma placa, cria no broker o usuário dela (nome = IMEI) com permissão **só nos tópicos dela**.
- Ao **inativar**, desativa. Ao **excluir**, apaga.
- Ao conectar no broker, confere todas as placas de uma vez.

**No firmware:**
- Tenta entrar com o **login próprio** (IMEI + senha).
- Se o broker recusar (placa ainda não aprovada), entra com o usuário `provisionamento`, diz "quero entrar" e sai. Tenta de novo em 5, 10, 30 e 60 segundos.
- Depois que o gestor aprova, a próxima tentativa já entra com o login próprio.

---

## 6. A controladora caía a cada 1 segundo ✅ (código) / 🧪 (conferir depois de subir)

**Problema:** com o login próprio ligado, o monitor serial mostrava em loop:
```
### MQTT CONECTADO ...
[MQTT] apresentada em provisionamento/...
[MQTT] conexão caiu (+CMQTTCONNLOST)
```

**Causa:** a cada apresentação, o backend mandava a senha de novo para o broker. O broker tem uma regra: **quando a senha de um usuário muda, ele derruba esse usuário** (por segurança). Então: conecta → se apresenta → backend manda a senha → broker derruba → conecta de novo...

**Correção:** o backend **anota** para quais placas já mandou a senha. Só manda de novo se:
- a senha **mudou** (o gestor aprovou uma senha nova); ou
- o backend **reconectou** no broker (o broker pode ter reiniciado).

A anotação fica só na memória do backend e não guarda a senha em si.

---

## 7. Visual das rotas e do monitoramento ✅

**Pedido:** deixar o trajeto bonito, "igual ao Google Maps".

**Telas de Rotas e Monitoramento:**
- Linha **azul** com **borda azul-escura**. Os trechos com excesso de velocidade ficam **vermelhos**.
- Início com bolinha **verde**, fim com bolinha **escura**.
- **No tema escuro, o mapa também fica escuro.** Usa um filtro de cor do navegador, sem depender de outro serviço.

**Só na tela de Rotas:** de longe aparece só a linha. As bolinhas de cada ponto só aparecem quando você dá **zoom**.

**Só no Monitoramento:**
- O marcador do carro tem a **cor da situação** (em movimento, parado, excesso, sem sinal).
- Em movimento, ganha uma **seta** apontando para onde o carro está indo. A direção é calculada pelos dois últimos pontos.

**Arquivos novos:**
- `components/MapaFundo.jsx`: o mapa de fundo, com o tema escuro;
- `components/TrajetoMapa.jsx`: desenha a linha com borda.

**Observação:** tentamos o mapa da CARTO, mas ele passou a exigir chave paga ("API KEY REQUIRED"). Voltamos para o OpenStreetMap, que é gratuito.

---

## 8. Rota mais fiel às ruas (firmware) 🧪

**Problema:** no teste, a linha "cortava" as esquinas e passava por cima dos quarteirões.

**Por quê:** o GPS grava um ponto a cada **10 segundos** e nas **curvas**. Entre dois pontos, o mapa liga com uma **linha reta**. A 40 km/h, 10 s são mais de 100 metros.

**O que mudou no firmware:**
1. **Curva de 30° para 15°:** grava um ponto já em curvas mais leves.
2. **Ponto de antes da curva (`ANTES_CURVA`):** a placa guarda a última leitura que não virou ponto. Quando detecta uma curva, grava também essa leitura de 1 segundo antes. Assim a linha dobra **onde a curva começou**. Isso só acontece no **começo** da curva, para não dobrar a quantidade de pontos.
3. **HDOP no ponto:** cada ponto leva a "nota" de precisão do GPS (até 2 é ótimo, acima de 5 é ruim). Por enquanto o backend ignora esse campo.

**No site:** o evento aparece como **"Antes da curva"** na tabela de rotas e nos relatórios.

**Também ajuda:** deixar a antena do GPS **deitada, com a face prateada para cima** e com visão do céu.

**Estudado e deixado para depois:** "encaixar" a rota nas ruas com o OSRM (map matching). Funciona, mas precisa do mapa do Brasil processado. Um recorte da região caberia na VM.

---

## 9. TLS: conexão criptografada da controladora 🧪

**Problema:** os dados e a senha passavam **abertos** pela rede da operadora (porta 1883).

**O que foi feito:**
- **Na VM:**
  - criamos um **certificado** na própria VM (vale 10 anos);
  - o Mosquitto passou a escutar também na porta **8883**, com TLS;
  - liberamos a 8883 no firewall da Azure.
- **No firmware:**
  - `USAR_TLS 1`: conecta na 8883 com TLS;
  - o `enableSNI` foi desligado, porque a placa conecta pelo IP.

**Falta:** gravar a placa, testar e depois **fechar a porta 1883** para fora da VM.

**Por que certificado próprio e não Let's Encrypt?** O modem não confere o certificado (`authmode 0`), então os dois dão a mesma proteção. O próprio não precisa de domínio e não vence a cada 90 dias.

---

## 9.1 Pontos perdidos com sinal fraco: confirmação de cada lote 🧪

**Problema:** no teste de 24/11 sumiram ~70 pontos (de 06:45 a 06:57), exatamente nos momentos em que o modem reconectava (sinal fraco). O servidor não recusou nada, e os pontos também não chegaram depois pelo microSD.

**Por quê:** a placa apagava o lote assim que o **modem** dizia "enviado". Com a conexão morrendo, o modem pode dizer "OK" e o lote se perder no caminho. A placa achava que tinha dado certo e não guardava no microSD.

**Correção:**
- Cada lote ganha um **número**. O servidor salva e responde em `frota/<IMEI>/confirmacao`: "salvei o lote N".
- A placa **só apaga depois dessa resposta**. Sem resposta em 30 s (ou se a conexão cair), o lote vai para o microSD e é enviado de novo.
- Se o lote tinha chegado e só a resposta se perdeu, o servidor ignora os **pontos repetidos**.
- 30 s sem confirmação com a conexão "de pé" quer dizer que ela morreu sem o modem perceber: a placa reconecta.

**Ordem para subir:** primeiro o **backend** (ele libera o tópico novo no broker), depois gravar a placa.

---

## 9.2 Ponto estragado não trava a fila ✅ (testes automáticos)

**Problema:** se um único ponto viesse com um campo inválido (ex.: velocidade `nan` quando o GPS falha), o servidor dava erro no lote inteiro e não confirmava. A placa reenviaria para sempre, e a fila do microSD (um lote por vez) travaria.

**Correção:** o servidor lê cada ponto sozinho. Campo inválido é gravado vazio; ponto sem posição válida é descartado; o lote é confirmado. Só um erro do **banco** impede a confirmação, para nunca confirmar um lote que não foi salvo.

---

## 9.3 Bomba cortada também com a chave desligada 🧪

**Antes:** o relé da bomba só era acionado com o carro bloqueado **e** a chave ligada. Na bancada, bloqueado com o pós-chave desligado, a sinaleira vermelha acendia de novo.

**Agora:** bloqueado = relé acionado e bomba cortada, **com a chave ligada ou desligada**. No resto do tempo o relé fica solto (contato NF fechado) e a bomba funciona normalmente.

---

## 9.4 Média em movimento diferente entre Rotas e Relatório ✅

**Problema:** no dia 23/11 a tela de Rotas mostrava 59 km/h e o Relatório 80 km/h para a mesma viagem (36,2 km em 27 min).

**Por quê:** as Rotas tiravam a média das velocidades dos pontos. Como a placa grava mais pontos onde o carro está devagar (curvas, paradas), a média ficava puxada para baixo.

**Correção:** as Rotas usam a mesma conta do Relatório: **distância ÷ tempo em movimento**.

---

## 9.5 Revisão registrada antes da hora ✅

**Problema:** o botão "Revisão" aparecia para qualquer veículo, e dava para registrar uma revisão com 5.000 km ainda faltando.

**Correção:** o botão só aparece quando faltam **500 km ou menos** (ou com a revisão vencida), e o servidor também recusa antes disso.

---

## 9.6 RENAVAM repetido na edição e erro do banco na tela ✅

**Problema:** no cadastro o sistema conferia se o RENAVAM era repetido, mas na **edição** não. O banco recusava, e a mensagem técnica (com SQL, nomes de tabelas e colunas) aparecia na tela.

**Correção:** a edição confere o RENAVAM igual ao cadastro ("Já existe Veículo com esse Renavam cadastrado! (FAK-1234)"). E qualquer erro desse tipo que escape das validações aparece com uma mensagem simples, nunca com o SQL.

---

## 9.7 Limite de velocidade do veículo também na controladora 🧪

**Problema:** o site usava o limite cadastrado em cada veículo, mas a controladora usava **110 km/h fixo** para a sirene e para os eventos "Início/Fim de excesso". No teste de 24/11 o FAK-1234 estava com limite 120 e a tabela mostrava "Início de excesso" a 110 km/h, num trecho que não ficava vermelho no mapa.

**Correção:** o servidor manda o limite do veículo junto com as regras (tópico `regras`): `{"madrugada":false,"inicio":22,"fim":6,"limite":120}`. A placa guarda na memória (vale sem internet) e usa para a sirene e os eventos. As regras vão de novo quando o gestor edita o veículo ou troca a controladora de carro. Sem limite cadastrado, vale 110.

---

## 9.8 Cartão SD travado não perde mais pontos (firmware 3.3) 🧪

**Problema (teste de 26/11):** a internet caiu três vezes (06:44, 06:46 e 06:48–06:55) e esses trechos sumiram, mesmo com a confirmação dos lotes funcionando. O servidor mostrou que o reenvio do microSD parou às 06:36 no meio do arquivo e que nenhum ponto do dia foi gravado no cartão. O cartão deixou de abrir o `buffer.txt`, e o firmware tinha três falhas:
1. tirava os pontos da memória **antes** de gravar no SD — se a gravação falhava, eles se perdiam;
2. no reenvio, "arquivo não abriu" era tratado como "arquivo acabou" — parava até desligar a placa;
3. nunca reiniciava o cartão depois de um erro.

**Correção:**
- Se o SD não gravar, os pontos **voltam para a memória** (cabem 300 pontos ≈ 50 min rodando) e saem quando a internet voltar.
- Erro ao abrir/gravar/ler → a placa **reinicia o cartão** (`SD.end()` + `SD.begin()`, no máximo a cada 10 s e nunca durante um áudio) e tenta de novo.
- Cada lote é gravado começando numa linha nova: uma gravação cortada no meio não estraga o lote seguinte.
- O provisionamento leva `"sd":"ok, 0 falhas, 0 reinicios"` — aparece no log do servidor (`journalctl -u frotasystem | grep provisionamento`), já que no carro não há Monitor Serial.
- Servidor: lote com JSON quebrado é confirmado e descartado (com log), senão a placa reenviaria para sempre e a fila do SD travaria.

---

## 10. Modo de teste sem o fio do pós-chave

Para testar no carro sem ligar o fio da chave, o firmware tem:
```cpp
#define POS_CHAVE_ATIVO 0   // 0 = chave considerada sempre ligada (teste)
```
**Antes de instalar de vez, voltar para `1`.**

---

## 11. O que ainda falta ⏳

| Item | Situação |
|---|---|
| Testar TLS e fechar a porta 1883 | Falta gravar a placa e testar |
| Testar a rota com a curva de 15° | Falta dar uma volta com o carro |
| Voltar `POS_CHAVE_ATIVO` para `1` | Depois do teste |
| Trocar a senha do usuário `frota` | Opcional (a senha dele não está mais na placa nova) |
| Odômetro na controladora (etapa 2) | A fazer |
| Perfis de regras configuráveis (etapa 3) | A fazer |
| Atualização do firmware pelo 4G (etapa 5) | A fazer |
| Texto do TCC, figuras e PDF do firmware | A fazer |

---

## 12. Resumo da história do projeto

| Quando | O que entrou |
|---|---|
| Mar/2026 | Telas de funcionários, rotas e alertas; migração para Tailwind + shadcn/ui |
| Jun/2026 | Cercas geográficas, endereço com CEP, tema claro/escuro, monitoramento em tempo real, primeiros comandos de bloqueio |
| Jul–Out/2026 | Build do site junto com o backend, login JWT com permissões por ação, deploy automático, broker MQTT próprio na VM, sensores de tensão, tela de Rotas, paginação |
| Nov/2026 (1ª quinzena) | Comandos e cartões via MQTT com confirmação, relatórios de utilização e eventos de condução, perfil do usuário, bloqueio por CNH vencida, notificações, registro de atividades, avisos no Telegram, líderes e relatório semanal por e-mail, página de apresentação, validações nos formulários, revisão de segurança |
| Nov/2026 (2ª quinzena) | Tudo deste documento: IMEI e aprovação, revisão por km, bloqueio de madrugada, hash da senha, login próprio no broker, visual das rotas, rota mais fiel, TLS |
