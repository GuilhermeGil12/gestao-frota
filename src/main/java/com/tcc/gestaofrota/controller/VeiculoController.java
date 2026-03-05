package com.tcc.gestaofrota.controller;


import com.tcc.gestaofrota.model.Permissao;
import com.tcc.gestaofrota.model.Veiculo;
import com.tcc.gestaofrota.service.VeiculoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static org.springframework.data.jpa.domain.AbstractPersistable_.id;

@RestController
@RequestMapping("/api/veiculos")
public class VeiculoController {

    final
    VeiculoService veiculoService;

    public VeiculoController(VeiculoService veiculoService) {
        this.veiculoService = veiculoService;
    }

    //Metodo para salvar via POST
    @PostMapping
    public ResponseEntity<Veiculo> criar(@RequestBody Veiculo veiculo){
        Veiculo novoVeiculo = veiculoService.salvar(veiculo);
        return ResponseEntity.ok(novoVeiculo);
    }

    @GetMapping
    public ResponseEntity<List<Veiculo>> listarTodas(){
        // o garçom (Controller) pede para o cozinheiro (Service) a lista
        List<Veiculo> lista = veiculoService.listarTodas();

        //o garçom entrega o prato com o status 200 OK
        return ResponseEntity.ok(lista);
    }

    //Metodo para buscar por PLACA via GET
    @GetMapping("/placa/{placa}")
    public ResponseEntity<Veiculo> buscarPorPlaca(@PathVariable String placa){
        return veiculoService.buscarPorPlaca(placa)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());

    }

    @PutMapping("/{id}")
    public ResponseEntity<Veiculo> atualizar(@PathVariable Long id, @RequestBody Veiculo veiculoNovo) {
        Veiculo veiculoAtualizado = veiculoService.atualizar(id, veiculoNovo);
        return ResponseEntity.ok(veiculoAtualizado); // Agora o tipo bate!
    }

    @DeleteMapping("/{id}")
        public ResponseEntity<Void> deletar(@PathVariable Long id){
            veiculoService.deletar(id);
            return ResponseEntity.noContent().build();
        }


}
