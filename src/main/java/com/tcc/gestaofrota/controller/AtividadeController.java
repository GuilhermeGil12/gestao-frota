package com.tcc.gestaofrota.controller;

import com.tcc.gestaofrota.model.Atividade;
import com.tcc.gestaofrota.service.AtividadeService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/atividades")
public class AtividadeController {

    private final AtividadeService atividadeService;

    public AtividadeController(AtividadeService atividadeService) {
        this.atividadeService = atividadeService;
    }

    // Exemplo: GET /api/atividades?inicio=2026-11-01T00:00:00&fim=2026-11-08T23:59:59&categoria=COMANDO
    @PreAuthorize("hasAuthority('configuracoes.atividades')")
    @GetMapping
    public ResponseEntity<List<Atividade>> listar(
            @RequestParam("inicio") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime inicio,
            @RequestParam("fim") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fim,
            @RequestParam(value = "categoria", required = false) String categoria) {
        return ResponseEntity.ok(atividadeService.listar(inicio, fim, categoria));
    }
}
