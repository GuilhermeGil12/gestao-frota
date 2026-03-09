package com.tcc.gestaofrota.controller;


import com.tcc.gestaofrota.model.Controladora;
import com.tcc.gestaofrota.service.ControladoraService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/controladora")
public class ControladoraController {

    private final ControladoraService controladoraService;

    public ControladoraController(ControladoraService controladoraService) {
        this.controladoraService = controladoraService;
    }

    @PostMapping
    public ResponseEntity<Controladora> criar(@RequestBody Controladora controladora){
        Controladora controladoraNova = controladoraService.salvar(controladora);
        return ResponseEntity.ok(controladoraNova);
    }

    @GetMapping
    public ResponseEntity<List<Controladora>> listarTodas(){
        List<Controladora> lista = controladoraService.listarTodas();

        return ResponseEntity.ok(lista);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Controladora> atualizar(@PathVariable Long id, @RequestBody Controladora controladoraNova){
        Controladora controladoraAtualizada = controladoraService.atualizar(id, controladoraNova);

        return ResponseEntity.ok(controladoraAtualizada);
    }

    @PatchMapping("/{id}/inativar")
    public ResponseEntity<Void> inativar(@PathVariable Long id){
        controladoraService.inativar(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id){
        controladoraService.deletar(id);
        return ResponseEntity.noContent().build();
    }
}
