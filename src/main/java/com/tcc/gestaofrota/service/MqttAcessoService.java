package com.tcc.gestaofrota.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tcc.gestaofrota.model.Controladora;
import com.tcc.gestaofrota.repository.ControladoraRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Login próprio de cada controladora no broker (plugin dynamic-security do Mosquitto).
 *
 * Com app.mqtt.acesso-por-controladora=true, a controladora de IMEI 356789012345678 entra no
 * broker com usuário "356789012345678", client id "controladora-356789012345678" e a senha que
 * ela mesma criou (aprovada no site), e só pode:
 *   - publicar em frota/<imei>/telemetria e frota/<imei>/resposta;
 *   - assinar frota/<imei>/estado, comando, cartoes e regras.
 * Ainda falta o usuário só de provisionamento, para a controladora nova se apresentar antes
 * de ser aprovada (etapa 4 do PLANO_CONTROLADORA.md).
 * Assim, uma controladora (ou alguém com a senha dela) não lê nem manda nada das outras.
 *
 * O backend mantém o broker igual ao cadastro: cria ao cadastrar, troca a senha ao editar,
 * desativa ao inativar e apaga ao excluir. Ao conectar no broker, sincroniza todas.
 * Desligado (padrão), não faz nada: todas usam o usuário compartilhado, como antes.
 * Passo a passo para ligar na VM: SEGURANCA.md.
 */
@Service
public class MqttAcessoService {

    public static final String TOPICO_CONTROLE = "$CONTROL/dynamic-security/v1";

    private final MqttService mqttService;
    private final ControladoraRepository controladoraRepository;
    private final boolean ligado;
    private final ObjectMapper mapper = new ObjectMapper();

    public MqttAcessoService(MqttService mqttService,
                             ControladoraRepository controladoraRepository,
                             @Value("${app.mqtt.acesso-por-controladora:false}") boolean ligado) {
        this.mqttService = mqttService;
        this.controladoraRepository = controladoraRepository;
        this.ligado = ligado;
    }

    private static String usuario(Controladora c) { return c.getCodigoMqtt(); }
    private static String papel(Controladora c) { return "controladora-" + c.getCodigoMqtt(); }

    private static Map<String, Object> acl(String tipo, String topico) {
        return Map.of("acltype", tipo, "topic", topico, "allow", true);
    }

    /** Cria (ou atualiza) o usuário e as permissões da controladora no broker. */
    public void sincronizar(Controladora c) {
        if (!ligado || c.getCodigoMqtt() == null || c.getSenha() == null || c.getSenha().isBlank()) return;
        if (!c.estaAprovada()) return; // só entra no broker depois de aprovada
        String base = "frota/" + c.getCodigoMqtt() + "/";
        List<Map<String, Object>> acls = List.of(
                acl("publishClientSend", base + "telemetria"),
                acl("publishClientSend", base + "resposta"),
                acl("subscribeLiteral", base + "estado"),
                acl("subscribeLiteral", base + "comando"),
                acl("subscribeLiteral", base + "cartoes"),
                acl("subscribeLiteral", base + "regras"));

        List<Map<String, Object>> comandos = new ArrayList<>();
        // "create" falha se já existe (normal); os comandos seguintes deixam tudo igual ao cadastro.
        comandos.add(Map.of("command", "createRole", "rolename", papel(c), "acls", acls));
        comandos.add(Map.of("command", "createClient", "username", usuario(c), "password", c.getSenha(),
                "clientid", papel(c), "roles", List.of(Map.of("rolename", papel(c)))));
        comandos.add(Map.of("command", "setClientPassword", "username", usuario(c), "password", c.getSenha()));
        comandos.add(Map.of("command", "setClientId", "username", usuario(c), "clientid", papel(c)));
        comandos.add(Map.of("command", "addClientRole", "username", usuario(c), "rolename", papel(c)));
        comandos.add(Map.of("command", Boolean.FALSE.equals(c.getAtivo()) ? "disableClient" : "enableClient",
                "username", usuario(c)));
        enviar(comandos);
    }

    /** Excluída no site: some do broker também. */
    public void remover(Controladora c) {
        if (!ligado || c.getCodigoMqtt() == null) return;
        enviar(List.of(
                Map.of("command", "deleteClient", "username", usuario(c)),
                Map.of("command", "deleteRole", "rolename", papel(c))));
    }

    // O broker pode ter reiniciado ou sido configurado agora: garante todas as controladoras.
    @EventListener
    public void aoConectarMqtt(MqttService.Conectado evento) {
        if (!ligado) return;
        controladoraRepository.findAll().forEach(this::sincronizar);
    }

    // Aprovada ou trocou a senha no site: cria/atualiza o usuário dela no broker.
    @EventListener
    public void aoAprovarControladora(ControladoraService.ControladoraAprovada evento) {
        controladoraRepository.findById(evento.idControladora()).ifPresent(this::sincronizar);
    }

    private void enviar(List<Map<String, Object>> comandos) {
        try {
            mqttService.publicarControle(TOPICO_CONTROLE, mapper.writeValueAsString(Map.of("commands", comandos)));
        } catch (Exception e) {
            System.out.println("[MQTT] erro ao montar comando do dynamic-security: " + e.getMessage());
        }
    }

    public boolean ligado() { return ligado; }
}
