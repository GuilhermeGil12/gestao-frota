package com.tcc.gestaofrota.controller;


import com.tcc.gestaofrota.model.Permissao;
import com.tcc.gestaofrota.service.PermissaoService;
import com.tcc.gestaofrota.service.VeiculoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/permissoes")
public class PermissaoController {

    final
    PermissaoService permissaoService;
    private final VeiculoService veiculoService;

    public PermissaoController(PermissaoService permissaoService, VeiculoService veiculoService){
        this.permissaoService = permissaoService;
        this.veiculoService = veiculoService;
    }

    @GetMapping
    public ResponseEntity<List<Permissao>> listarTodas(){
        // o garçom (Controller) pede para o cozinheiro (Service) a lista
        List<Permissao> lista = permissaoService.listarTodas();

        //o garçom entrega o prato com o status 200 OK
        return ResponseEntity.ok(lista);
    }

    //metodo da service
    @GetMapping("/{id}")
    public ResponseEntity<Permissao> buscarPorId(@PathVariable Long id){
        Permissao permissao = permissaoService.buscarPorId(id);

        // Retornamos 200 OK com o objeto dentro
        return ResponseEntity.ok(permissao);

    }

    @PostMapping("/{id}")
    public ResponseEntity<Permissao> salvar(@RequestBody Permissao permissao){
        Permissao permissaoSalva = permissaoService.salvar(permissao);

        return ResponseEntity.status(201).body(permissaoSalva);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Permissao> atualizar(@PathVariable Long id, @RequestBody Permissao permissaoNova) {
        // Chamamos a service que já faz toda aquela troca de "antiga pela nova"
        Permissao permissaoAtualizada = permissaoService.atualizar(id, permissaoNova);

        // Retornamos 200 OK com o resultado final
        return ResponseEntity.ok(permissaoAtualizada);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        permissaoService.deletar(id);

        // build() é usado porque não temos um "body" (corpo) para enviar
        return ResponseEntity.noContent().build();
    }




}
