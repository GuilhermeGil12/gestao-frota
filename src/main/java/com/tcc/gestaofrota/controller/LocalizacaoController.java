package com.tcc.gestaofrota.controller;


import com.tcc.gestaofrota.dto.CoordenadaEsp32DTO;
import com.tcc.gestaofrota.service.LocalizacaoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/localizacao")
public class LocalizacaoController {

    private final LocalizacaoService localizacaoService;

    public LocalizacaoController(LocalizacaoService localizacaoService) {
        this.localizacaoService = localizacaoService;
    }

    @PostMapping("/enviar")
    public ResponseEntity<String> receberDadosDoEsp32(
            @RequestHeader("codigo") String codigo,
            @RequestHeader("senha") String senha,
            @RequestBody List<CoordenadaEsp32DTO> loteDoEsp32){

        //entregando os 3 parametros para a sevice
        localizacaoService.processarLoteDoEsp32(codigo, senha, loteDoEsp32);

        return ResponseEntity.ok("Dados recebidos e salvos com sucesso!");
    }
}
