package com.tcc.gestaofrota.controller;

import com.tcc.gestaofrota.model.Comando;
import com.tcc.gestaofrota.service.ComandoService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

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
        exigirPermissaoDoComando(tipo);

        Comando comando = comandoService.enviarComando(idControladora, tipo);
        return ResponseEntity.ok(comando);
    }

    /** BLOQUEAR e DESBLOQUEAR sao permissoes separadas, entao a checagem olha o tipo. */
    private void exigirPermissaoDoComando(String tipo) {
        String permissaoNecessaria = "DESBLOQUEAR".equalsIgnoreCase(tipo)
                ? "comandos.desbloquear"
                : "comandos.bloquear";

        var auth = SecurityContextHolder.getContext().getAuthentication();
        boolean autorizado = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals(permissaoNecessaria));

        if (!autorizado) {
            throw new AccessDeniedException("Você não tem permissão para executar este comando");
        }
    }

    // A controladora recebe comandos pelo MQTT (frota/<código>/comando) e confirma em
    // frota/<código>/resposta. As antigas rotas HTTP /pendente e /confirmar eram abertas,
    // sem login (qualquer um podia marcar um bloqueio como executado), e foram removidas.

    // Frontend → lista o histórico de comandos de uma controladora.
    // Exemplo: GET /api/comandos/historico/5
    @PreAuthorize("hasAuthority('comandos.visualizar')")
    @GetMapping("/historico/{idControladora}")
    public ResponseEntity<List<Comando>> listarHistorico(@PathVariable Long idControladora) {
        List<Comando> historico = comandoService.listarPorControladora(idControladora);
        return ResponseEntity.ok(historico);
    }

    // Frontend → lista todos os comandos de todas as controladoras.
    // Exemplo: GET /api/comandos
    @PreAuthorize("hasAuthority('comandos.visualizar')")
    @GetMapping
    public ResponseEntity<List<Comando>> listarTodos() {
        return ResponseEntity.ok(comandoService.listarTodos());
    }
}
