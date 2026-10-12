package com.tcc.gestaofrota.controller;


import com.tcc.gestaofrota.model.Setor;
import com.tcc.gestaofrota.service.SetorService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/setores")
public class SetorController {

    private final SetorService setorService;

    public SetorController(SetorService setorService) {
        this.setorService = setorService;
    }

    @PreAuthorize("hasAuthority('configuracoes.setores')")
    @GetMapping
    public ResponseEntity<List<Setor>> listarSetores(){

        List<Setor> listaSetor = setorService.listarSetores();

        return ResponseEntity.ok(listaSetor);


    }

    @PreAuthorize("hasAuthority('configuracoes.setores')")
    @PostMapping
    public Setor salvar(@RequestBody  Setor setor){

        Setor setorSalvo = setorService.salvar(setor);
        return setorSalvo;
    }
}
