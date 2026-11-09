package com.tcc.gestaofrota.controller;

import com.tcc.gestaofrota.service.RelatorioLiderService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/relatorios-lideres")
public class RelatorioLiderController {

    private final RelatorioLiderService relatorioLiderService;

    public RelatorioLiderController(RelatorioLiderService relatorioLiderService) {
        this.relatorioLiderService = relatorioLiderService;
    }

    // Envia agora o relatório da semana passada (o mesmo da segunda às 7h). Serve pra testar.
    @PreAuthorize("hasAuthority('configuracoes.geral')")
    @PostMapping("/enviar")
    public ResponseEntity<Map<String, Object>> enviarAgora() {
        LocalDate[] semana = relatorioLiderService.semanaPassada();
        List<RelatorioLiderService.ResultadoEnvio> resultados = relatorioLiderService.enviar(semana[0], semana[1]);
        return ResponseEntity.ok(Map.of("inicio", semana[0], "fim", semana[1], "resultados", resultados));
    }
}
