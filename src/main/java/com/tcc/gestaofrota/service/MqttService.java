package com.tcc.gestaofrota.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tcc.gestaofrota.dto.CoordenadaEsp32DTO;
import jakarta.annotation.PostConstruct;
import org.eclipse.paho.client.mqttv3.*;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Ponte MQTT do backend.
 *  - Inscreve em frota/+/telemetria  → recebe os pontos do ESP e salva no banco
 *  - Publica em  frota/<codigo>/comando → manda comando (BLOQUEAR/APITAR/...) pro ESP
 *
 * Não destrói nada do HTTP — é um caminho a mais. Pra reverter, é só remover este arquivo.
 */
@Service
public class MqttService {

    private static final String TOPICO_TELEMETRIA = "frota/+/telemetria"; // + = qualquer controladora

    private final LocalizacaoService localizacaoService;
    private final ObjectMapper mapper = new ObjectMapper();
    private MqttClient client;

    private final String broker;
    private final String usuario;
    private final String senha;

    public MqttService(LocalizacaoService localizacaoService,
                       @Value("${app.mqtt.broker}") String broker,
                       @Value("${app.mqtt.usuario}") String usuario,
                       @Value("${app.mqtt.senha}") String senha) {
        this.localizacaoService = localizacaoService;
        this.broker = broker;
        this.usuario = usuario;
        this.senha = senha;
    }

    @PostConstruct
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

            client.setCallback(new MqttCallback() {
                @Override
                public void connectionLost(Throwable cause) {
                    System.out.println("[MQTT] conexao perdida: " + (cause != null ? cause.getMessage() : ""));
                }

                @Override
                public void messageArrived(String topic, MqttMessage message) {
                    try {
                        // topic = frota/<codigo>/telemetria
                        String codigo = topic.split("/")[1];
                        String payload = new String(message.getPayload());
                        List<CoordenadaEsp32DTO> lote =
                                mapper.readValue(payload, new TypeReference<List<CoordenadaEsp32DTO>>() {});
                        localizacaoService.salvarLoteMqtt(codigo, lote);
                        System.out.println("[MQTT] telemetria de " + codigo + ": " + lote.size() + " ponto(s) salvo(s).");
                    } catch (Exception e) {
                        System.out.println("[MQTT] erro ao processar telemetria: " + e.getMessage());
                    }
                }

                @Override
                public void deliveryComplete(IMqttDeliveryToken token) { }
            });

            client.connect(opts);
            client.subscribe(TOPICO_TELEMETRIA, 1);
            System.out.println("[MQTT] backend conectado no broker e inscrito em " + TOPICO_TELEMETRIA);
        } catch (MqttException e) {
            System.out.println("[MQTT] falha ao iniciar: " + e.getMessage());
        }
    }

    // Publica um comando pra uma controladora (o ESP inscrito recebe na hora)
    public void publicarComando(String codigo, String tipo) {
        try {
            if (client != null && client.isConnected()) {
                client.publish("frota/" + codigo + "/comando", new MqttMessage(tipo.getBytes()));
                System.out.println("[MQTT] comando '" + tipo + "' publicado pra controladora " + codigo);
            } else {
                System.out.println("[MQTT] cliente nao conectado — comando nao publicado.");
            }
        } catch (MqttException e) {
            System.out.println("[MQTT] erro ao publicar comando: " + e.getMessage());
        }
    }
}
