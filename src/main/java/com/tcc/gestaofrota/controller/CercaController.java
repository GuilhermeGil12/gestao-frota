package com.tcc.gestaofrota.controller;

import com.tcc.gestaofrota.model.Cerca;
import com.tcc.gestaofrota.service.CercaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cercas")
public class CercaController {

    private final CercaService cercaService;

    public CercaController(CercaService cercaService) {
        this.cercaService = cercaService;
    }

    @GetMapping
    public List<Cerca> listar() {
        return cercaService.listarTodas();
    }

    @GetMapping("/{id}")
    public Cerca buscarPorId(@PathVariable Long id) {
        return cercaService.buscarPorId(id);
    }

    @PostMapping
    public Cerca salvar(@RequestBody Cerca cerca) {
        return cercaService.salvar(cerca);
    }

    @PutMapping("/{id}")
    public Cerca atualizar(@PathVariable Long id, @RequestBody Cerca cerca) {
        return cercaService.atualizar(id, cerca);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        cercaService.deletar(id);
        return ResponseEntity.noContent().build();
    }
}