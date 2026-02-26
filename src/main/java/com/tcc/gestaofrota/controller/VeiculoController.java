package com.tcc.gestaofrota.controller;


import com.tcc.gestaofrota.model.Veiculo;
import com.tcc.gestaofrota.service.VeiculoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/veiculos")
public class VeiculoController {

    @Autowired
    private VeiculoService veiculoService;

    //Metodo para salvar via POST
    @PostMapping
    public ResponseEntity<Veiculo> criar(@RequestBody Veiculo veiculo){
        Veiculo novoVeiculo = veiculoService.salvar(veiculo);
        return ResponseEntity.ok(novoVeiculo);
    }

    //Metodo para buscar por PLACA via GET
    @GetMapping("/placa/{placa}")
    public ResponseEntity<Veiculo> buscarPorPlaca(@PathVariable String placa){
        return veiculoService.buscarPorPlaca(placa)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());

    }

}
