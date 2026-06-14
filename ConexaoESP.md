# Integração ESP32-S3 (LILYGO T-A7670G) com Sistema Web

## Visão Geral

Este documento explica como conectar o módulo **LILYGO T-A7670G-S3-Standard** com um sistema web **Spring Boot + React**, enviando dados via rede **4G (Vivo)** usando HTTP POST.

---

## Requisitos

### Hardware
- LILYGO T-A7670G-S3-Standard
- Chip SIM Vivo (com plano de dados ativo)
- Antena LTE conectada
- Cabo USB-C (porta ESP32, não a do modem)

### Software
- Arduino IDE 2.x
- Pacote ESP32 da Espressif instalado
- Biblioteca **TinyGSM fork** (lewisxhe): https://github.com/lewisxhe/TinyGSM
- Java Spring Boot (backend)
- React (frontend)
- ngrok (para expor o servidor local)

---

## Pinos da Placa (S3-Standard)

| Função | GPIO |
|---|---|
| MODEM_TX_PIN | 4 |
| MODEM_RX_PIN | 5 |
| BOARD_PWRKEY_PIN | 46 |
| MODEM_DTR_PIN | 7 |

---

## Configuração do Arduino IDE

| Opção | Valor |
|---|---|
| Board | ESP32S3 Dev Module |
| USB CDC on Boot | **Enabled** |
| Flash Size | 16MB |
| PSRAM | OPI PSRAM |
| Upload Speed | 921600 |
| Port | COM da placa (porta ESP32) |

> ⚠️ A placa tem dois USB-C. Use sempre o marcado como **ESP32** para gravar código.

---

## Instalação da Biblioteca TinyGSM

1. Baixe o ZIP: https://github.com/lewisxhe/TinyGSM/archive/refs/heads/master.zip
2. No Arduino IDE: **Sketch → Include Library → Add .ZIP Library...**
3. Selecione o ZIP baixado

> ⚠️ Não use a versão do Library Manager — ela não suporta o A7670G.

---

## Arquivo config.h

Crie um arquivo `config.h` na **mesma pasta** do sketch:

```cpp
#ifndef CONFIG_H
#define CONFIG_H

#define TINY_GSM_MODEM_A7670
#define TINY_GSM_RX_BUFFER 1024

#endif
```

---

## Código ESP32

```cpp
#include "config.h"
#include <TinyGsmClient.h>
#include <HardwareSerial.h>

#define MODEM_TX_PIN      4
#define MODEM_RX_PIN      5
#define BOARD_PWRKEY_PIN  46
#define MODEM_DTR_PIN     7
#define MODEM_BAUDRATE    115200

const char APN[]      = "zap.vivo.com.br";
const char APN_USER[] = "vivo";
const char APN_PASS[] = "vivo";

// URL do servidor com autenticação nos query params
const char URL[] = "https://SEU_NGROK.ngrok-free.dev/api/localizacao/enviar?codigo=SEU_CODIGO&senha=SUA_SENHA";

HardwareSerial SerialAT(1);
TinyGsm modem(SerialAT);

void ligarModem() {
  pinMode(MODEM_DTR_PIN, OUTPUT);
  digitalWrite(MODEM_DTR_PIN, LOW);
  pinMode(BOARD_PWRKEY_PIN, OUTPUT);
  digitalWrite(BOARD_PWRKEY_PIN, LOW);
  delay(100);
  digitalWrite(BOARD_PWRKEY_PIN, HIGH);
  delay(100);
  digitalWrite(BOARD_PWRKEY_PIN, LOW);
  Serial.println("Aguardando boot do A7670G (10s)...");
  delay(10000);
}

bool enviarPost() {
  // Monte o JSON com os dados do seu sensor/GPS
  String body = "[{"
    "\"data_localizacao\":\"2025-01-01 12:00:00\","
    "\"latitude\":\"-23.5613\","
    "\"longitude\":\"-46.6558\","
    "\"velocidade\":\"0\","
    "\"altitude\":\"760\","
    "\"qtd_satelite\":\"8\","
    "\"ign\":\"1\","
    "\"crachastr\":\"UID_DO_CARTAO\""
  "}]";

  int bodyLen = body.length();

  SerialAT.println("AT+HTTPTERM");
  delay(1000);
  while (SerialAT.available()) SerialAT.read();

  SerialAT.println("AT+HTTPINIT");
  delay(1000);
  String r = "";
  while (SerialAT.available()) { char c = SerialAT.read(); r += c; }
  if (r.indexOf("OK") < 0) return false;

  SerialAT.println("AT+HTTPPARA=\"URL\",\"" + String(URL) + "\"");
  delay(1000);
  while (SerialAT.available()) SerialAT.read();

  SerialAT.println("AT+HTTPPARA=\"CONTENT\",\"application/json\"");
  delay(1000);
  while (SerialAT.available()) SerialAT.read();

  SerialAT.println("AT+HTTPDATA=" + String(bodyLen) + ",10000");
  delay(500);

  String prompt = "";
  unsigned long ts = millis();
  while (millis() - ts < 5000) {
    while (SerialAT.available()) { char c = SerialAT.read(); prompt += c; }
    if (prompt.indexOf("DOWNLOAD") >= 0) break;
  }

  if (prompt.indexOf("DOWNLOAD") < 0) {
    SerialAT.println("AT+HTTPTERM");
    return false;
  }

  SerialAT.print(body);
  delay(3000);
  while (SerialAT.available()) SerialAT.read();

  SerialAT.println("AT+HTTPACTION=1");
  delay(500);

  String respAction = "";
  ts = millis();
  while (millis() - ts < 15000) {
    while (SerialAT.available()) { char c = SerialAT.read(); respAction += c; ts = millis(); }
    if (respAction.indexOf("+HTTPACTION") >= 0) break;
  }

  SerialAT.println("AT+HTTPREAD=0,500");
  delay(3000);
  String respRead = "";
  while (SerialAT.available()) { char c = SerialAT.read(); respRead += c; }

  SerialAT.println("AT+HTTPTERM");
  delay(1000);
  while (SerialAT.available()) SerialAT.read();

  return respAction.indexOf(",200,") >= 0 || respRead.indexOf("Dados recebidos") >= 0;
}

void setup() {
  Serial.begin(115200);
  delay(2000);

  ligarModem();

  SerialAT.begin(MODEM_BAUDRATE, SERIAL_8N1, MODEM_RX_PIN, MODEM_TX_PIN);
  delay(500);

  if (!modem.init()) {
    modem.restart();
    delay(5000);
    modem.init();
  }

  while (!modem.isNetworkConnected()) {
    Serial.print(".");
    delay(1500);
  }

  modem.gprsConnect(APN, APN_USER, APN_PASS);
}

void loop() {
  if (enviarPost()) {
    Serial.println("[OK] Dados salvos!");
  } else {
    Serial.println("[!!] Falhou, tentando em 30s...");
  }
  delay(30000);
}
```

---

## Backend Spring Boot

### Controller

O endpoint recebe `codigo` e `senha` como **query params** na URL e o JSON no body:

```java
@PostMapping("/enviar")
public ResponseEntity<String> receberDadosDoEsp32(
        @RequestParam String codigo,
        @RequestParam String senha,
        @RequestBody List<CoordenadaEsp32DTO> loteDoEsp32){

    localizacaoService.processarLoteDoEsp32(codigo, senha, loteDoEsp32);
    return ResponseEntity.ok("Dados recebidos e salvos com sucesso!");
}
```

### DTO

```java
public class CoordenadaEsp32DTO {
    private String data_localizacao;
    private String latitude;
    private String longitude;
    private String velocidade;
    private String altitude;
    private String qtd_satelite;
    private String ign;
    private String crachastr;
    // getters e setters...
}
```

---

## Expondo o Servidor com ngrok

O ESP32 acessa a internet pela rede 4G da Vivo, portanto não consegue acessar `localhost`. O ngrok cria um túnel público:

1. Crie conta grátis em https://ngrok.com
2. Instale pelo Microsoft Store
3. Configure o token:
```
ngrok config add-authtoken SEU_TOKEN
```
4. Com o Spring Boot rodando na porta 8080, inicie o túnel:
```
ngrok http 8080
```
5. Copie a URL gerada (ex: `https://abc123.ngrok-free.dev`) e coloque no ESP32

> ⚠️ A URL do ngrok muda toda vez que você reinicia. Atualize no código do ESP32 sempre que reiniciar o ngrok.

---

## Fluxo Completo

```
ESP32-S3
  └── A7670G (4G Vivo)
        └── Internet
              └── ngrok (túnel público)
                    └── localhost:8080
                          └── Spring Boot
                                └── Banco de Dados
                                      └── React (frontend)
```

---

## Problemas Comuns

| Problema | Causa | Solução |
|---|---|---|
| `TinyGsmClient.h: No such file` | Biblioteca não instalada | Instale o fork do lewisxhe |
| `Please define GSM modem model` | Define fora de ordem | Use o `config.h` separado |
| Serial Monitor vazio | USB CDC on Boot desativado | Ative em Tools e regrave |
| HTTP 307 Redirect | ESP32 usando HTTP em vez de HTTPS | Use porta 443 ou URL com `https://` |
| HTTP 500 | Body vazio ou credenciais erradas | Use query params para `codigo` e `senha` |
| `Falha ao conectar` | ngrok não está rodando | Inicie o ngrok antes de testar |

---

## APN da Vivo

| Campo | Valor |
|---|---|
| APN | `zap.vivo.com.br` |
| Usuário | `vivo` |
| Senha | `vivo` |
| APN alternativa | `vivobr.com` |