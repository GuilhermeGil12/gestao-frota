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
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Login próprio de cada controladora no broker (plugin dynamic-security do Mosquitto).
 *
 * Com app.mqtt.acesso-por-controladora=true, a controladora de IMEI 356789012345678 entra no
 * broker com usuário "356789012345678", client id "controladora-356789012345678" e a senha que
 * ela mesma criou (aprovada no site), e só pode:
 *   - publicar em frota/<imei>/telemetria, frota/<imei>/resposta e provisionamento/<imei>
 *     (versão do firmware a cada conexão);
 *   - assinar frota/<imei>/estado, comando, cartoes e regras.
 * A controladora ainda não aprovada entra com o usuário "provisionamento" (criado à mão na VM,
 * SEGURANCA.md §3.1), que só pode publicar em provisionamento/+.
 * Assim, uma controladora (ou alguém com a senha dela) não lê nem manda nada das outras.
 *
 * O backend mantém o broker igual ao cadastro: permissões ao aprovar, desativa ao inativar e
 * apaga ao excluir. A senha o banco não tem (só o hash): ela é repassada ao broker quando a
 * controladora se apresenta com a senha aprovada (ControladoraService.atualizarExistente).
 * Por isso, logo depois de aprovar, a controladora leva até ~2 min para entrar com o login
 * próprio: é recusada uma vez, se apresenta pelo usuário de provisionamento e já entra.
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

    // Controladoras cuja senha já foi enviada ao broker desde que o backend conectou nele.
    // O broker derruba o cliente quando a senha ou as permissões dele mudam; se o backend
    // reenviasse a cada apresentação, a controladora cairia e voltaria sem parar.
    // Guarda só "código + hash da senha" (na memória, nunca no banco nem no log).
    private final Set<String> senhaJaEnviada = ConcurrentHashMap.newKeySet();

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

    /** Permissões e ativo/inativo, sem mexer na senha. */
    public void sincronizar(Controladora c) {
        sincronizar(c, null);
    }

    /**
     * Cria (ou atualiza) o usuário e as permissões da controladora no broker.
     * senhaLegivel: a senha que a controladora acabou de mandar (já conferida com o hash), ou
     * null para não mexer na senha. Nunca vai para o banco nem para o log.
     */
    public void sincronizar(Controladora c, String senhaLegivel) {
        if (!ligado || c.getCodigoMqtt() == null) return;
        if (!c.estaAprovada()) return; // só entra no broker depois de aprovada
        if (senhaLegivel != null && !senhaJaEnviada.add(c.getCodigoMqtt() + ":" + senhaLegivel.hashCode())) {
            return; // o broker já tem esta senha: não mexe (senão ele derruba a controladora)
        }
        String base = "frota/" + c.getCodigoMqtt() + "/";
        List<Map<String, Object>> acls = List.of(
                acl("publishClientSend", base + "telemetria"),
                acl("publishClientSend", base + "resposta"),
                acl("publishClientSend", "provisionamento/" + c.getCodigoMqtt()),
                acl("subscribeLiteral", base + "estado"),
                acl("subscribeLiteral", base + "comando"),
                acl("subscribeLiteral", base + "cartoes"),
                acl("subscribeLiteral", base + "regras"));

        List<Map<String, Object>> comandos = new ArrayList<>();
        // "create" falha se já existe (normal); os comandos seguintes deixam tudo igual ao cadastro.
        comandos.add(Map.of("command", "createRole", "rolename", papel(c), "acls", acls));
        // Papel que já existia (versão anterior): acrescenta as permissões que faltarem.
        for (Map<String, Object> a : acls) {
            comandos.add(Map.of("command", "addRoleACL", "rolename", papel(c), "acltype", a.get("acltype"),
                    "topic", a.get("topic"), "allow", true));
        }
        // Sem senha ainda, o usuário existe mas ninguém consegue entrar com ele.
        comandos.add(Map.of("command", "createClient", "username", usuario(c),
                "clientid", papel(c), "roles", List.of(Map.of("rolename", papel(c)))));
        if (senhaLegivel != null) {
            comandos.add(Map.of("command", "setClientPassword", "username", usuario(c), "password", senhaLegivel));
        }
        comandos.add(Map.of("command", "setClientId", "username", usuario(c), "clientid", papel(c)));
        comandos.add(Map.of("command", "addClientRole", "username", usuario(c), "rolename", papel(c)));
        comandos.add(Map.of("command", Boolean.FALSE.equals(c.getAtivo()) ? "disableClient" : "enableClient",
                "username", usuario(c)));
        enviar(comandos);
    }

    /** Excluída no site: some do broker também. */
    public void remover(Controladora c) {
        if (!ligado || c.getCodigoMqtt() == null) return;
        senhaJaEnviada.removeIf(chave -> chave.startsWith(c.getCodigoMqtt() + ":"));
        enviar(List.of(
                Map.of("command", "deleteClient", "username", usuario(c)),
                Map.of("command", "deleteRole", "rolename", papel(c))));
    }

    // O broker pode ter reiniciado ou sido configurado agora: garante todas as controladoras.
    @EventListener
    public void aoConectarMqtt(MqttService.Conectado evento) {
        if (!ligado) return;
        // O broker pode ter reiniciado e perdido o cadastro: a senha de cada uma vai de novo
        // na próxima vez que ela se apresentar.
        senhaJaEnviada.clear();
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
