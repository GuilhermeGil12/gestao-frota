package com.tcc.gestaofrota.controller;

import com.tcc.gestaofrota.model.Comando;
import com.tcc.gestaofrota.service.ComandoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/comandos")
public class ComandoController {

    private final ComandoService comandoService;

    public ComandoController(ComandoService comandoService) {
        this.comandoService = comandoService;
    }

    // Frontend → envia um novo comando para uma controladora.
    // Body: { "tipo": "BLOQUEAR" }
    // Exemplo: POST /api/comandos/5
    @PostMapping("/{idControladora}")
    public ResponseEntity<Comando> enviarComando(
            @PathVariable Long idControladora,
            @RequestBody Map<String, String> body) {

        String tipo = body.get("tipo");
        Comando comando = comandoService.enviarComando(idControladora, tipo);
        return ResponseEntity.ok(comando);
    }

    // ESP → verifica se tem algum comando pendente para executar.
    // Exemplo: GET /api/comandos/pendente/5
    // Resposta: 200 com o comando, ou 204 se não houver nenhum.
    @GetMapping("/pendente/{idControladora}")
    public ResponseEntity<Comando> buscarPendente(@PathVariable Long idControladora) {
        Optional<Comando> pendente = comandoService.buscarPendente(idControladora);

        if (pendente.isEmpty()) {
            return ResponseEntity.noContent().build(); // 204 = sem conteúdo
        }

        return ResponseEntity.ok(pendente.get());
    }

    // ESP → confirma que executou o comando.
    // Exemplo: POST /api/comandos/12/confirmar
    @PostMapping("/{idComando}/confirmar")
    public ResponseEntity<Comando> confirmar(@PathVariable Long idComando) {
        Comando comando = comandoService.confirmarExecucao(idComando);
        return ResponseEntity.ok(comando);
    }

    // Frontend → lista o histórico de comandos de uma controladora.
    // Exemplo: GET /api/comandos/historico/5
    @GetMapping("/historico/{idControladora}")
    public ResponseEntity<List<Comando>> listarHistorico(@PathVariable Long idControladora) {
        List<Comando> historico = comandoService.listarPorControladora(idControladora);
        return ResponseEntity.ok(historico);
    }

    // Frontend → lista todos os comandos de todas as controladoras.
    // Exemplo: GET /api/comandos
    @GetMapping
    public ResponseEntity<List<Comando>> listarTodos() {
        return ResponseEntity.ok(comandoService.listarTodos());
    }
}
