package com.tcc.gestaofrota.controller;

import com.tcc.gestaofrota.dto.CoordenadaEsp32DTO;
import com.tcc.gestaofrota.model.Localizacao;
import com.tcc.gestaofrota.service.LocalizacaoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/localizacao")
@CrossOrigin(origins = "*") // <--- SUPER IMPORTANTE: Libera o React para buscar esses dados!
public class LocalizacaoController {

    private final LocalizacaoService localizacaoService;

    public LocalizacaoController(LocalizacaoService localizacaoService) {
        this.localizacaoService = localizacaoService;
    }

    // 1. Porta de Entrada (Usada pelo ESP32/Hardware)
    @PostMapping("/enviar")
    public ResponseEntity<String> receberDadosDoEsp32(
            @RequestHeader("codigo") String codigo,
            @RequestHeader("senha") String senha,
            @RequestBody List<CoordenadaEsp32DTO> loteDoEsp32){

        localizacaoService.processarLoteDoEsp32(codigo, senha, loteDoEsp32);
        return ResponseEntity.ok("Dados recebidos e salvos com sucesso!");
    }

    // =======================================================
    // 2. Porta de Saída (Usada pelo React / Dashboard)
    // =======================================================
    @GetMapping("/ultima/{idVeiculo}")
    public ResponseEntity<Localizacao> buscarUltimaLocalizacao(@PathVariable Long idVeiculo) {

        Optional<Localizacao> ultimaLoc = localizacaoService.buscarUltimaLocalizacao(idVeiculo);

        // Se a "caixa" tiver uma localização dentro, devolve ela (Código 200 OK)
        if (ultimaLoc.isPresent()) {
            return ResponseEntity.ok(ultimaLoc.get());
        }

        // Se o carro nunca mandou localização na vida, devolve vazio sem dar erro na tela (Código 204 No Content)
        return ResponseEntity.noContent().build();
    }
}
