package com.tcc.gestaofrota.controller;

import com.tcc.gestaofrota.model.Configuracao;
import com.tcc.gestaofrota.service.ConfiguracaoService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/configuracoes")
public class ConfiguracaoController {

    private final ConfiguracaoService configuracaoService;

    public ConfiguracaoController(ConfiguracaoService configuracaoService) {
        this.configuracaoService = configuracaoService;
    }

    // Qualquer usuário logado lê: o nome da empresa vai no cabeçalho dos relatórios.
    @GetMapping
    public ResponseEntity<Configuracao> buscar() {
        return ResponseEntity.ok(configuracaoService.buscar());
    }

    @PreAuthorize("hasAuthority('configuracoes.geral')")
    @PutMapping
    public ResponseEntity<Configuracao> salvar(@RequestBody Configuracao configuracao) {
        return ResponseEntity.ok(configuracaoService.salvar(configuracao));
    }
}
