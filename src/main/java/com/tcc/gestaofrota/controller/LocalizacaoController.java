package com.tcc.gestaofrota.controller;

import com.tcc.gestaofrota.model.Localizacao;
import com.tcc.gestaofrota.repository.LocalizacaoRepository;
import com.tcc.gestaofrota.service.LocalizacaoService;
import com.tcc.gestaofrota.service.RelatorioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/localizacao")
public class LocalizacaoController {

    private final LocalizacaoService localizacaoService;
    private final RelatorioService relatorioService;

    @Autowired
    private LocalizacaoRepository repository;

    public LocalizacaoController(LocalizacaoService localizacaoService, RelatorioService relatorioService) {
        this.localizacaoService = localizacaoService;
        this.relatorioService = relatorioService;
    }

    // A controladora envia os pontos só pelo MQTT (frota/<código>/telemetria).
    // A antiga rota HTTP POST /enviar foi removida: era aberta, sem login.

    // 2. Busca a última localização (Usado no Dashboard)
    @PreAuthorize("hasAuthority('monitoramento.visualizar')")
    @GetMapping("/ultima/{idVeiculo}")
    public ResponseEntity<Localizacao> buscarUltimaLocalizacao(@PathVariable Long idVeiculo) {
        Optional<Localizacao> ultimaLoc = localizacaoService.buscarUltimaLocalizacao(idVeiculo);
        return ultimaLoc.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.noContent().build());
    }

    // 3. Busca a rota completa do dia (tela de Rotas e o rastro do veículo no Monitoramento)
    @PreAuthorize("hasAnyAuthority('veiculos.rotas', 'monitoramento.visualizar')")
    @GetMapping("/rota")
    public ResponseEntity<List<Map<String, Object>>> obterRota(
            @RequestParam Long idVeiculo,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate data) {

        LocalDateTime inicio = data.atStartOfDay();
        LocalDateTime fim = data.plusDays(1).atStartOfDay();
        List<Localizacao> pontos = repository.buscarRotaPorDia(idVeiculo, inicio, fim);

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("HH:mm:ss");
        List<Map<String, Object>> response = pontos.stream().map(p -> {
            Map<String, Object> pontoMap = new HashMap<>();
            pontoMap.put("lat", p.getLatitude());
            pontoMap.put("lng", p.getLongitude());
            pontoMap.put("velocidade", p.getVelocidade());
            pontoMap.put("hora", p.getDataHora() != null ? p.getDataHora().toLocalTime().format(fmt) : null);
            pontoMap.put("motorista", p.getMotorista());
            pontoMap.put("status", p.getStatus());
            pontoMap.put("tensaoPosChave", p.getTensaoPosChave());
            pontoMap.put("tensaoSistema", p.getTensaoSistema());
            pontoMap.put("evento", p.getEvento());
            pontoMap.put("qtdSatelite", p.getQtdSatelite());
            return pontoMap;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasAuthority('veiculos.alertas')")
    @GetMapping("/alerta")
    public ResponseEntity<List<Localizacao>> obterAlerta(
            @RequestParam(required = false) Long idVeiculo,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFinal) {

        List<Localizacao> alertas = localizacaoService.buscarAlerta(idVeiculo, dataInicio, dataFinal);
        return ResponseEntity.ok(alertas);
    }


    // Adicione este endpoint dentro do seu LocalizacaoController existente:
    // Cole este endpoint dentro do seu LocalizacaoController atual:

    @PreAuthorize("hasAuthority('relatorios.visualizar')")
    @GetMapping("/relatorio-km")
    public ResponseEntity<List<Map<String, Object>>> obterRelatorioKm(
            @RequestParam("inicio") @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) LocalDateTime inicio,
            @RequestParam("fim") @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) LocalDateTime fim,
            @RequestParam(value = "idVeiculo", required = false) Long idVeiculo) {

        // idVeiculo opcional: se vier, filtra só aquele carro; se não vier, calcula a frota toda
        List<Map<String, Object>> relatorio = localizacaoService.gerarRelatorioQuilometragem(inicio, fim, idVeiculo);
        return ResponseEntity.ok(relatorio);
    }

    // Relatório detalhado: todos os pontos do período. Resposta: { pontos, total, limitado, maximo }
    @PreAuthorize("hasAuthority('relatorios.visualizar')")
    @GetMapping("/relatorio-pontos")
    public ResponseEntity<Map<String, Object>> obterRelatorioPontos(
            @RequestParam("inicio") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime inicio,
            @RequestParam("fim") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fim,
            @RequestParam(value = "idVeiculo", required = false) Long idVeiculo) {
        return ResponseEntity.ok(relatorioService.pontos(inicio, fim, idVeiculo));
    }

    // Visitas: entradas e saídas dos veículos nas cercas (aba Visitas dos Relatórios e tela de Alertas).
    @PreAuthorize("hasAnyAuthority('relatorios.visualizar', 'veiculos.alertas')")
    @GetMapping("/relatorio-visitas")
    public ResponseEntity<List<Map<String, Object>>> obterRelatorioVisitas(
            @RequestParam("inicio") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime inicio,
            @RequestParam("fim") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fim,
            @RequestParam(value = "idVeiculo", required = false) Long idVeiculo) {
        return ResponseEntity.ok(relatorioService.visitas(inicio, fim, idVeiculo));
    }

    @PreAuthorize("hasAuthority('monitoramento.visualizar')")
    @GetMapping("/ultimas")
    public ResponseEntity<List<Map<String, Object>>> buscarUltimas() {
        List<Map<String, Object>> ultimas = localizacaoService.buscarUltimasLocalizacoes();
        return ResponseEntity.ok(ultimas);
    }
}