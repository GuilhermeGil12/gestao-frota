package com.tcc.gestaofrota.service;

import com.tcc.gestaofrota.model.Comando;
import com.tcc.gestaofrota.model.Controladora;
import com.tcc.gestaofrota.repository.ComandoRepository;
import com.tcc.gestaofrota.repository.ControladoraRepository;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class ComandoService {

    // Os comandos que mudam o estado do veículo (vão pro tópico "estado", retido).
    private static final List<String> TIPOS_DE_ESTADO = List.of("BLOQUEAR", "DESBLOQUEAR");

    private final ComandoRepository comandoRepository;
    private final ControladoraRepository controladoraRepository;
    private final MqttService mqttService;

    public ComandoService(ComandoRepository comandoRepository,
                          ControladoraRepository controladoraRepository,
                          MqttService mqttService) {
        this.comandoRepository = comandoRepository;
        this.controladoraRepository = controladoraRepository;
        this.mqttService = mqttService;
    }

    // Frontend chama isso para enviar um comando a um veículo.
    // Recebe o id da controladora e o tipo ("BLOQUEAR", "DESBLOQUEAR" ou "APITAR").
    // O comando fica PENDENTE até a controladora responder pelo MQTT que executou.
    public Comando enviarComando(Long idControladora, String tipo) {
        Controladora controladora = controladoraRepository.findById(idControladora)
                .orElseThrow(() -> new RuntimeException("Controladora não encontrada!"));

        if (!tipo.equals("BLOQUEAR") && !tipo.equals("DESBLOQUEAR") && !tipo.equals("APITAR")) {
            throw new RuntimeException("Tipo de comando inválido. Use BLOQUEAR, DESBLOQUEAR ou APITAR.");
        }

        Comando comando = new Comando();
        comando.setControladora(controladora);
        comando.setTipo(tipo);
        comando.setStatus("PENDENTE");
        comando.setCriadoEm(LocalDateTime.now());
        Comando salvo = comandoRepository.save(comando);

        // O id vai junto pro ESP devolver na resposta.
        publicarNoMqtt(salvo);

        return salvo;
    }

    private void publicarNoMqtt(Comando comando) {
        Long codigo = comando.getControladora().getIdControladora();
        switch (comando.getTipo()) {
            case "BLOQUEAR"    -> mqttService.publicarEstado(codigo, comando.getIdComando(), "BLOQUEADO");
            case "DESBLOQUEAR" -> mqttService.publicarEstado(codigo, comando.getIdComando(), "LIBERADO");
            default            -> mqttService.publicarComando(codigo, comando.getIdComando(), comando.getTipo());
        }
    }

    // A controladora respondeu no tópico frota/<codigo>/resposta.
    @EventListener
    public void aoReceberResposta(MqttService.RespostaRecebida resposta) {
        Optional<Comando> busca = comandoRepository.findById(resposta.idComando());
        // Só aceita a confirmação da própria controladora do comando.
        if (busca.isEmpty() || !busca.get().getControladora().getIdControladora().equals(resposta.codigoControladora())) {
            System.out.println("[MQTT] resposta ignorada: comando " + resposta.idComando()
                    + " não pertence à controladora " + resposta.codigoControladora());
            return;
        }
        confirmarExecucao(resposta.idComando());
        System.out.println("[MQTT] comando " + resposta.idComando() + " EXECUTADO");
    }

    // O broker pode ter reiniciado e perdido as mensagens retidas: publica de novo o
    // último BLOQUEAR/DESBLOQUEAR de cada controladora. O ESP ignora se já executou esse id.
    @EventListener
    public void aoConectarMqtt(MqttService.Conectado evento) {
        for (Controladora controladora : controladoraRepository.findAll()) {
            comandoRepository
                    .findFirstByControladora_IdControladoraAndTipoInOrderByCriadoEmDesc(controladora.getIdControladora(), TIPOS_DE_ESTADO)
                    .ifPresent(this::publicarNoMqtt);
        }
    }

    // ESP chama isso no polling. Retorna o comando mais antigo ainda pendente.
    // Se não houver nenhum, retorna Optional vazio → controller responde 204.
    public Optional<Comando> buscarPendente(Long idControladora) {
        List<Comando> pendentes = comandoRepository.findPendentes(idControladora);
        return pendentes.isEmpty() ? Optional.empty() : Optional.of(pendentes.get(0));
    }

    // Marca o comando como EXECUTADO e registra o horário.
    // O estado é retido no MQTT, então o ESP pode confirmar o mesmo comando mais de uma vez:
    // a primeira confirmação vale, as outras não mudam o horário.
    public Comando confirmarExecucao(Long idComando) {
        Comando comando = comandoRepository.findById(idComando)
                .orElseThrow(() -> new RuntimeException("Comando não encontrado!"));

        if ("EXECUTADO".equals(comando.getStatus())) return comando;

        comando.setStatus("EXECUTADO");
        comando.setExecutadoEm(LocalDateTime.now());

        return comandoRepository.save(comando);
    }

    // Frontend usa isso para mostrar o histórico de comandos de um veículo.
    public List<Comando> listarPorControladora(Long idControladora) {
        return comandoRepository.findByControladora_IdControladoraOrderByCriadoEmDesc(idControladora);
    }

    // Lista todos os comandos de todas as controladoras, do mais novo para o mais antigo.
    public List<Comando> listarTodos() {
        return comandoRepository.findAll(Sort.by(Sort.Direction.DESC, "criadoEm"));
    }
}
