package com.tcc.gestaofrota.controller;

import com.tcc.gestaofrota.dto.CoordenadaEsp32DTO;
import com.tcc.gestaofrota.model.Localizacao;
import com.tcc.gestaofrota.repository.LocalizacaoRepository;
import com.tcc.gestaofrota.service.LocalizacaoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/localizacao")
@CrossOrigin(origins = "*")
public class LocalizacaoController {

    private final LocalizacaoService localizacaoService;

    @Autowired
    private LocalizacaoRepository repository;

    public LocalizacaoController(LocalizacaoService localizacaoService) {
        this.localizacaoService = localizacaoService;
    }

    // 1. Recebe dados do ESP32
    @PostMapping("/enviar")
    public ResponseEntity<String> receberDadosDoEsp32(
            @RequestHeader("codigo") String codigo,
            @RequestHeader("senha") String senha,
            @RequestBody List<CoordenadaEsp32DTO> loteDoEsp32){

        localizacaoService.processarLoteDoEsp32(codigo, senha, loteDoEsp32);
        return ResponseEntity.ok("Dados recebidos e salvos com sucesso!");
    }

    // 2. Busca a última localização (Usado no Dashboard)
    @GetMapping("/ultima/{idVeiculo}")
    public ResponseEntity<Localizacao> buscarUltimaLocalizacao(@PathVariable Long idVeiculo) {
        Optional<Localizacao> ultimaLoc = localizacaoService.buscarUltimaLocalizacao(idVeiculo);
        return ultimaLoc.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.noContent().build());
    }

    // 3. Busca a rota completa do dia (Usado na tela de Rotas/Mapa)
    @GetMapping("/rota")
    public ResponseEntity<List<Map<String, Object>>> obterRota(
            @RequestParam Long idVeiculo,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate data) {

        // Busca os pontos no repositório
        List<Localizacao> pontos = repository.buscarRotaPorDia(idVeiculo, data);

        // Formata para o React-Leaflet
        List<Map<String, Object>> response = pontos.stream().map(p -> {
            Map<String, Object> pontoMap = new HashMap<>();
            pontoMap.put("lat", p.getLatitude());
            pontoMap.put("lng", p.getLongitude());
            pontoMap.put("velocidade", p.getVelocidade());
            pontoMap.put("hora", p.getDataHora().toLocalTime().toString().substring(0, 5));
            pontoMap.put("motorista", p.getMotorista());

            // --- LINHA QUE ESTAVA FALTANDO ABAIXO ---
            pontoMap.put("status", p.getStatus());
            // ---------------------------------------

            return pontoMap;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/alerta")
    public ResponseEntity<List<Localizacao>> obterAlerta(
            @RequestParam(required = false) Long idVeiculo,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFinal) {

        List<Localizacao> alertas = localizacaoService.buscarAlerta(idVeiculo, dataInicio, dataFinal);
        return ResponseEntity.ok(alertas);
    }
}