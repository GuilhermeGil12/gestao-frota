package com.tcc.gestaofrota.service;

import com.tcc.gestaofrota.model.Comando;
import com.tcc.gestaofrota.model.Controladora;
import com.tcc.gestaofrota.repository.ComandoRepository;
import com.tcc.gestaofrota.repository.ControladoraRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class ComandoService {

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
    // Recebe o id da controladora e o tipo ("BLOQUEAR" ou "DESBLOQUEAR").
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

        // Publica no MQTT pro ESP receber NA HORA (o save acima mantém o HTTP funcionando também)
        mqttService.publicarComando(String.valueOf(idControladora), tipo);

        return salvo;
    }

    // ESP chama isso no polling. Retorna o comando mais antigo ainda pendente.
    // Se não houver nenhum, retorna Optional vazio → controller responde 204.
    public Optional<Comando> buscarPendente(Long idControladora) {
        List<Comando> pendentes = comandoRepository.findPendentes(idControladora);
        return pendentes.isEmpty() ? Optional.empty() : Optional.of(pendentes.get(0));
    }

    // ESP chama isso após executar o comando.
    // Marca o comando como EXECUTADO e registra o horário.
    public Comando confirmarExecucao(Long idComando) {
        Comando comando = comandoRepository.findById(idComando)
                .orElseThrow(() -> new RuntimeException("Comando não encontrado!"));

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
