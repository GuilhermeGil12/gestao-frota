package com.tcc.gestaofrota.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tcc.gestaofrota.dto.CoordenadaEsp32DTO;
import org.eclipse.paho.client.mqttv3.*;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * Ponte MQTT do backend.
 *  - Assina   frota/+/telemetria → recebe os pontos do ESP e salva no banco
 *  - Assina   frota/+/resposta   → o ESP confirma que executou um comando
 *  - Publica  frota/<codigo>/estado  → BLOQUEADO/LIBERADO com o id do comando (retido)
 *  - Publica  frota/<codigo>/comando → APITAR com o id do comando (não retido)
 *  - Publica  frota/<codigo>/cartoes → lista de UIDs liberados (retida)
 *
 * Retido = o broker guarda a última mensagem do tópico e entrega pro ESP assim que ele
 * se inscreve. Assim uma controladora que estava sem sinal recebe o estado quando volta.
 *
 * Os outros Services não são chamados direto daqui (eles já dependem deste, e o Spring
 * não aceita dependência circular). Em vez disso, este Service avisa por eventos:
 * Conectado e RespostaRecebida. Quem precisa, escuta com @EventListener.
 */
@Service
public class MqttService {

    private static final String TOPICO_TELEMETRIA = "frota/+/telemetria"; // + = qualquer controladora
    private static final String TOPICO_RESPOSTA = "frota/+/resposta";

    /** O backend (re)conectou no broker: hora de republicar o que é retido. */
    public record Conectado() {}

    /** A controladora <codigo> confirmou que executou o comando <idComando>. */
    public record RespostaRecebida(Long codigoControladora, Long idComando) {}

    private final LocalizacaoService localizacaoService;
    private final ApplicationEventPublisher eventos;
    // Campo desconhecido no ponto não derruba o lote inteiro (firmware novo com backend antigo e vice-versa).
    private final ObjectMapper mapper = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    private MqttClient client;

    private final String broker;
    private final String usuario;
    private final String senha;

    public MqttService(LocalizacaoService localizacaoService,
                       ApplicationEventPublisher eventos,
                       @Value("${app.mqtt.broker}") String broker,
                       @Value("${app.mqtt.usuario}") String usuario,
                       @Value("${app.mqtt.senha}") String senha) {
        this.localizacaoService = localizacaoService;
        this.eventos = eventos;
        this.broker = broker;
        this.usuario = usuario;
        this.senha = senha;
    }

    // Conecta só com a aplicação pronta: os @EventListener dos outros Services já existem.
    @EventListener(ApplicationReadyEvent.class)
    public void iniciar() {
        try {
            client = new MqttClient(broker, "backend-frota-" + System.currentTimeMillis(), new MemoryPersistence());
            MqttConnectOptions opts = new MqttConnectOptions();
            opts.setCleanSession(true);
            opts.setAutomaticReconnect(true);

            if (usuario != null && !usuario.isBlank()) {
                opts.setUserName(usuario);
                opts.setPassword(senha.toCharArray());
            }

            client.setCallback(new MqttCallbackExtended() {
                @Override
                public void connectComplete(boolean reconexao, String serverURI) {
                    // Com cleanSession, as assinaturas se perdem a cada reconexão: assina de novo.
                    try {
                        client.subscribe(TOPICO_TELEMETRIA, 1);
                        client.subscribe(TOPICO_RESPOSTA, 1);
                        System.out.println("[MQTT] backend " + (reconexao ? "reconectado" : "conectado")
                                + " e inscrito em " + TOPICO_TELEMETRIA + " e " + TOPICO_RESPOSTA);
                    } catch (MqttException e) {
                        System.out.println("[MQTT] falha ao assinar os tópicos: " + e.getMessage());
                    }
                    // Fora da thread do Paho: publicar dentro do callback pode travar o cliente.
                    CompletableFuture.runAsync(() -> eventos.publishEvent(new Conectado()));
                }

                @Override
                public void connectionLost(Throwable cause) {
                    System.out.println("[MQTT] conexao perdida: " + (cause != null ? cause.getMessage() : ""));
                }

                @Override
                public void messageArrived(String topic, MqttMessage message) {
                    // topic = frota/<codigo>/telemetria ou frota/<codigo>/resposta
                    String[] partes = topic.split("/");
                    String codigo = partes[1];
                    String payload = new String(message.getPayload());
                    if (partes[2].equals("resposta")) {
                        receberResposta(codigo, payload);
                    } else {
                        receberTelemetria(codigo, payload);
                    }
                }

                @Override
                public void deliveryComplete(IMqttDeliveryToken token) { }
            });

            client.connect(opts);
        } catch (MqttException e) {
            System.out.println("[MQTT] falha ao iniciar: " + e.getMessage());
        }
    }

    private void receberTelemetria(String codigo, String payload) {
        try {
            List<CoordenadaEsp32DTO> lote =
                    mapper.readValue(payload, new TypeReference<List<CoordenadaEsp32DTO>>() {});
            localizacaoService.salvarLoteMqtt(codigo, lote);
            System.out.println("[MQTT] telemetria de " + codigo + ": " + lote.size() + " ponto(s) salvo(s).");
        } catch (Exception e) {
            System.out.println("[MQTT] erro ao processar telemetria: " + e.getMessage());
        }
    }

    // payload = {"id":15,"status":"EXECUTADO"}
    private void receberResposta(String codigo, String payload) {
        try {
            JsonNode json = mapper.readTree(payload);
            if (!"EXECUTADO".equals(json.path("status").asText())) return;
            eventos.publishEvent(new RespostaRecebida(Long.parseLong(codigo), json.path("id").asLong()));
        } catch (Exception e) {
            System.out.println("[MQTT] resposta inválida de " + codigo + ": " + payload);
        }
    }

    private void publicar(String topico, String payload, boolean retido) {
        try {
            if (client != null && client.isConnected()) {
                MqttMessage msg = new MqttMessage(payload.getBytes());
                msg.setQos(1);
                msg.setRetained(retido);
                client.publish(topico, msg);
                System.out.println("[MQTT] publicado em " + topico + (retido ? " (retido)" : "") + ": " + payload);
            } else {
                System.out.println("[MQTT] cliente nao conectado — nada publicado em " + topico);
            }
        } catch (MqttException e) {
            System.out.println("[MQTT] erro ao publicar em " + topico + ": " + e.getMessage());
        }
    }

    private String json(Object valor) {
        try {
            return mapper.writeValueAsString(valor);
        } catch (Exception e) {
            throw new RuntimeException("Erro ao montar JSON do MQTT", e);
        }
    }

    // estado = "BLOQUEADO" ou "LIBERADO". Retido: a controladora recebe mesmo se estava sem sinal.
    public void publicarEstado(Long codigo, Long idComando, String estado) {
        publicar("frota/" + codigo + "/estado", json(Map.of("id", idComando, "estado", estado)), true);
    }

    // Ações de momento (APITAR): não retido, pra não disparar horas depois.
    public void publicarComando(Long codigo, Long idComando, String tipo) {
        publicar("frota/" + codigo + "/comando", json(Map.of("id", idComando, "tipo", tipo)), false);
    }

    public void publicarCartoes(Long codigo, List<String> uids) {
        publicar("frota/" + codigo + "/cartoes", json(uids), true);
    }
}
