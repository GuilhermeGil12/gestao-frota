# Plano da controladora — firmware único, configurado pelo site

**Objetivo:** gravar o **mesmo firmware** em todas as controladoras e nunca mais precisar mexer no código para mudar uma regra ou cadastrar uma placa. Tudo o que muda de uma controladora para outra fica no site.

É assim que os rastreadores comerciais funcionam: o Teltonika usa o IMEI como identidade e recebe os parâmetros pelo servidor; o Traccar identifica o aparelho pelo IMEI.

## Situação das etapas

| # | Etapa | Situação |
|---|---|---|
| 1 | Identidade pelo IMEI e aprovação no site | **Feita** (falta testar com a controladora de verdade) |
| 2 | Odômetro na controladora (km certo, inclusive dos pontos do microSD) | A fazer |
| 3 | Perfis de regras (padrão e personalizados), baixados pela controladora | A fazer |
| 4 | Login próprio no broker (cada controladora só acessa os tópicos dela) | Código parcial, falta o usuário de provisionamento |
| 5 | Atualização do firmware pelo 4G (OTA) | A fazer |

Cada etapa só começa depois que a anterior foi testada.

---

## Etapa 1 — Identidade pelo IMEI e aprovação no site

### Antes e depois

| | Antes | Agora |
|---|---|---|
| Cadastro | Cadastrar no site, anotar o número e gravar `CODIGO = "2"` no firmware | Ligar a controladora e clicar em **Aprovar** no site |
| Firmware | Um `.bin` diferente para cada controladora | O mesmo `.bin` para todas |
| Senha | Digitada no site e no firmware | Criada pela própria controladora |
| Tópicos | `frota/2/...` | `frota/<imei>/...` |

### Como funciona

```
 Controladora (ESP32)                    Broker MQTT                 Backend / Site
 ────────────────────                    ───────────                 ──────────────
 1. Liga, lê o IMEI (AT+CGSN)
 2. 1º boot: cria a senha e guarda
    no Preferences
 3. Conecta e publica ───────────────► provisionamento/<imei> ──────► 4. Cria "Aguardando aprovação"
    {"imei","senha","versao"} (retido)                                   e apaga a mensagem retida
                                                                     5. Sino + Telegram avisam
                                                                     6. Gestor clica em "Aprovar"
                                                                        e escolhe o veículo
 8. Recebe cartões e estado ◄──────── frota/<imei>/cartoes ◄──────── 7. Publica cartões e estado
 9. Manda pontos ────────────────────► frota/<imei>/telemetria ─────► 10. Salva (só se aprovada)
```

1. **IMEI**: o número de fábrica do modem A7670, com 15 dígitos, impresso na etiqueta. Não muda e não se repete, por isso serve de identidade. Se o modem não responder ao `AT+CGSN`, a controladora usa o último IMEI que leu (guardado no Preferences).
2. **Senha**: 20 letras e números sorteados pelo próprio chip (`esp_random()`) na primeira vez que a controladora liga. Fica no Preferences e não muda mais, a não ser que a memória seja apagada.
3. **Provisionamento**: a cada conexão, a controladora publica, **retido**, em `provisionamento/<imei>`:
   ```json
   {"imei":"356938035643809","senha":"(20 caracteres)","versao":"3.1"}
   ```
   Retido quer dizer que, se o backend estiver fora do ar, ele recebe a mensagem quando voltar. Depois de ler, o backend **apaga** a mensagem do broker, porque ela tem a senha.
4. **O backend confere**: IMEI com 15 dígitos e dígito verificador certo, o IMEI do tópico igual ao da mensagem e senha com pelo menos 8 caracteres. Se algo estiver errado, ignora a mensagem.
5. **Aguardando aprovação**: enquanto não é aprovada, a controladora **não recebe** cartões nem comandos e os pontos dela **não são salvos**. Na prática, ninguém consegue ligar o carro com ela.

### O que acontece em cada caso

| Caso | O que o backend faz |
|---|---|
| IMEI que nunca apareceu | Cria a controladora como **Aguardando aprovação** e avisa no sino e no Telegram |
| Já aguardando, liga de novo | Atualiza a senha, a versão e o último contato |
| Aprovada, mesma senha | Atualiza a versão e o último contato. Nada muda para o gestor |
| Aprovada, **senha diferente** (memória apagada) | Continua funcionando com a senha antiga. Aparece **"pediu uma senha nova"** para aprovar |
| Cadastrada à mão antes (firmware antigo) com o mesmo IMEI | Passa a usar o IMEI nos tópicos na hora e pede para aprovar a senha nova |

### A tela de Controladoras

- O botão **Nova controladora** e o campo **Senha** saíram. A tela se atualiza sozinha a cada 15 segundos.
- **Aguardando aprovação**: um quadro no topo, que só aparece quando há alguma, com o IMEI, a versão do firmware e a hora.
  - **Aprovar**: escolhe o veículo (opcional) e a linha do chip (opcional). Se o veículo já tiver outra controladora, a antiga fica **sem veículo**: é o caso de trocar a controladora de um carro.
  - **Recusar**: tira da lista. Se ela ligar de novo, aparece outra vez.
- **Tabela**: as controladoras aprovadas, com IMEI, veículo, versão do firmware e último contato. As que ainda têm o firmware antigo aparecem com a etiqueta **Antigo**.
- **Editar**: só o que o gestor sabe (veículo, linha do chip e MAC). O IMEI e a senha vêm da controladora.
- **Comandos** e **Veículos** não mostram as controladoras que aguardam aprovação.
- **Permissões**: "Controladoras > Cadastrar" passou a se chamar **"Aprovar novas"**. "Editar" continua para editar, inativar, excluir e recusar.
- **Notificações**: tipo novo, **"Controladora nova"** (sino e Telegram). Dá para desligar em Configurações > Minhas notificações.

### Compatibilidade com o firmware antigo

A controladora 2 que já está no carro **continua funcionando** sem regravar. Uma controladora que nunca se apresentou (versão do firmware vazia) segue usando o número nos tópicos (`frota/2/...`). Ela só passa para o IMEI quando recebe o firmware novo e se apresenta.

### Como testar com a controladora de verdade

1. Subir o backend e o site com estas mudanças. O banco ganha sozinho as colunas `situacao`, `senha_pendente`, `versao_firmware` e `ultimo_contato` (`ddl-auto=update`).
2. Gravar o `controladora_v3.ino` novo, que não tem mais `CODIGO`. A cópia do anterior ficou em `controladora_v3.ino.bak-antes-imei`, na mesma pasta.
3. No monitor serial, conferir:
   - `[Boot] senha da controladora criada` (só na primeira vez)
   - `[Modem] IMEI 35...`
   - `### MQTT CONECTADO como controladora-35... ###`
   - `[MQTT] apresentada em provisionamento/35...`
4. No site, em até 15 segundos, ela aparece em **Aguardando aprovação**. Confira se o IMEI bate com a etiqueta do modem.
5. **Aprovar** e escolher o veículo que estava com a controladora 2. A 2 fica sem veículo.
6. No monitor serial: chegam a lista de cartões e o último estado (bloqueado ou liberado) no tópico novo.
7. Testar: passar um cartão, mandar BLOQUEAR e DESBLOQUEAR em Comandos, e conferir os pontos no mapa.
8. A controladora 2 antiga pode ser **inativada**. Se tiver histórico de comandos, excluir pode não ser possível, porque o histórico aponta para ela.
9. **Teste da senha nova**: apague o Preferences, por exemplo com "Erase All Flash" na Arduino IDE, e grave de novo. A controladora continua funcionando e o site mostra "pediu uma senha nova".

### Limitações (citar no TCC)

- **A senha viaja aberta**: enquanto o TLS não estiver ligado (`USAR_TLS 0`), a mensagem de provisionamento com a senha passa sem criptografia pela rede da operadora. Isso se resolve com a seção 3.2 do `SEGURANCA.md`.
- **O login no broker ainda é o compartilhado**: hoje qualquer controladora com o usuário `frota` poderia publicar em `provisionamento/` com o IMEI de outra. O backend não troca a senha de uma controladora aprovada sem o gestor aprovar, mas o risco do usuário compartilhado continua até a etapa 4.
- **Quem garante a identidade é o gestor**: o site não tem como saber se o IMEI é de uma placa da empresa. Por isso existe o "Aprovar", e o IMEI deve ser conferido com a etiqueta.

### Arquivos alterados nesta etapa

- **Firmware** `controladora_v3.ino`:
  - `VERSAO_FIRMWARE`;
  - `lerImei()`, `extrairImei()`, `montarTopicos()`;
  - `carregarOuCriarSenha()`, `publicarProvisionamento()`;
  - `mqttPublicar(..., retido)`;
  - login próprio com IMEI e senha.
- **Backend**:
  - `model/Controladora.java` (situação, senha pendente, versão, último contato, `getCodigoMqtt()`);
  - `service/ControladoraService.java` (provisionamento e aprovação; o cadastro manual saiu);
  - `controller/ControladoraController.java` (`POST /api/controladora/{id}/aprovar`; o `POST /api/controladora` saiu);
  - `dto/AprovacaoControladoraDTO.java`;
  - `service/MqttService.java` (assina `provisionamento/+`; códigos em texto);
  - `ComandoService`, `CartaoRfidService`, `LocalizacaoService`, `MqttAcessoService` e `VeiculoService` (usam o código MQTT e ignoram as que aguardam aprovação);
  - `NotificacaoService` e `PerfilService` (notificação `CONTROLADORA`);
  - `CatalogoPermissoes` ("Aprovar novas");
  - teste novo `ControladoraServiceTest` (7 casos).
- **Site**:
  - `pages/Controladoras.jsx` (reescrita);
  - `pages/comandos.jsx`, `pages/veiculos/Veiculos.jsx` (filtram as que aguardam aprovação);
  - `components/Notificacoes.jsx`, `components/PreferenciasNotificacao.jsx`.
- **Documentação**: este arquivo, `SEGURANCA.md` §3.1 e `CLAUDE.md`.

---

## O que falta fazer

### Etapa 2 — Odômetro na controladora
Substitui a soma de km feita no servidor (`RevisaoService.atualizarQuilometragem`), que perde os pontos que chegam atrasados do microSD.

- [ ] Firmware: somar a distância entre leituras do GPS **só** com GPS válido e acima de 3 km/h, ignorando saltos impossíveis. Guardar no Preferences a cada 1 km e ao desligar a chave, para não gastar a memória.
- [ ] Firmware: mandar o campo `odometro` (km) em cada ponto, inclusive nos que vão para o microSD.
- [ ] Backend: guardar o maior `odometro` recebido de cada veículo, porque os pontos do SD chegam fora de ordem.
- [ ] Backend: km atual = km que o gestor informou + (odômetro agora − odômetro na hora em que ele informou).
- [ ] Retirar a soma de km do servidor. A tela de revisão (próxima revisão, aviso de 500 km, botão "Revisão") continua igual.

### Etapa 3 — Perfis de regras
Substitui o "bloqueio de madrugada" com a lista de cartões vazia e o tópico `regras`.

- [ ] Site: tela de **Perfis de regras**, com um perfil **Padrão** e perfis personalizados. Cada controladora usa um perfil.
- [ ] Backend: publicar o perfil (retido) em `frota/<imei>/config` com um número de versão. A controladora responde "versão N aplicada" e o site mostra se ela está em dia.
- [ ] Firmware: guardar o perfil no Preferences e usar os valores no lugar das constantes fixas.
- [ ] Regras previstas:
  - exigir cartão;
  - tolerância da chave (60 s);
  - bloqueio de madrugada (início e fim);
  - alarme de excesso de velocidade (limite do veículo);
  - intervalo de envio com o carro ligado e desligado;
  - ângulo de curva;
  - limites de freada, aceleração e virada brusca;
  - motor ocioso (novo);
  - duração do APITAR.
- [ ] Fixo, sem configuração: o bloqueio só acontece abaixo de 5 km/h (segurança).

### Etapa 4 — Login próprio no broker
- [ ] Criar no broker um usuário **só de provisionamento**, que só pode publicar em `provisionamento/+`, para a controladora nova se apresentar antes de ser aprovada.
- [ ] Firmware: entrar com o login próprio (IMEI e senha). Se o broker recusar, porque ainda não foi aprovada, entrar com o de provisionamento só para se apresentar.
- [ ] VM: ativar o dynamic-security e o TLS (`SEGURANCA.md` §3) e depois trocar a senha do usuário `frota`.

### Etapa 5 — Atualização pelo 4G (OTA)
- [ ] Site: enviar o `.bin` e a versão, escolher as controladoras e acompanhar o andamento (aguardando, baixando %, instalada ou falhou).
- [ ] Backend: guardar o arquivo e o SHA-256 e liberar o download só para as controladoras aprovadas (IMEI e senha).
- [ ] Firmware:
  - esperar um momento seguro (chave desligada e veículo parado);
  - baixar pelos comandos HTTP do modem para o microSD, continuando de onde parou;
  - conferir o SHA-256, gravar na partição livre e reiniciar;
  - voltar para a versão anterior se a nova não conectar.
- [ ] Opcional: assinatura do firmware (a controladora confere com uma chave pública antes de instalar).
- [ ] A primeira versão com OTA precisa ser gravada pelo USB.

### Pendências das mudanças anteriores (ainda não commitadas)
- [ ] Decidir o que fazer com a **soma de km no servidor** (`RevisaoService`). Ela some na etapa 2, mas a tela de revisão pode ser aproveitada.
- [ ] Decidir sobre o **bloqueio de madrugada** atual, que some na etapa 3 e vira uma regra do perfil.
- [ ] Atualizar a especificação do firmware (`Documentacao_Firmware_Controladora` em PDF/HTML) com o IMEI e o provisionamento.

### TCC
- [ ] Atualizar o texto: a controladora agora se apresenta pelo IMEI e o gestor aprova (seções do cadastro de controladoras e da comunicação MQTT).
- [ ] Refazer as figuras da tela de Controladoras e as que já estavam pendentes (39, 45 e 54; conferir a 47).
- [ ] Escrever a seção 3.5 (Testes). Os testes automáticos deste plano estão em `ControladoraServiceTest`.
- [ ] Citar as limitações de segurança desta etapa e o plano das etapas 4 e 5 como trabalhos futuros.
