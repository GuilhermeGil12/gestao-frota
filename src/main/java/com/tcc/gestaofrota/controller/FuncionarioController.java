package com.tcc.gestaofrota.controller;


import com.tcc.gestaofrota.model.Funcionario;
import com.tcc.gestaofrota.service.FuncionarioService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/funcionarios")
public class FuncionarioController {

    private final FuncionarioService funcionarioService;

    public FuncionarioController(FuncionarioService funcionarioService) {
        this.funcionarioService = funcionarioService;
    }

    // Metodo para salvar via POST
    @PostMapping
    public ResponseEntity<Funcionario> criar(@RequestBody Funcionario funcionario){
        //para ver oque está recebendo

        System.out.println("Recebendo: " + funcionario.getNome() + " CPF: " + funcionario.getCpf());

        Funcionario novoFuncionario = funcionarioService.salvar(funcionario);
        return ResponseEntity.status(201).body(novoFuncionario);
    }

    //Metodo para BUSCAR por CPF via GET
    @GetMapping("/cpf/{cpf}")
    public ResponseEntity<Funcionario> buscarPorCpf(@PathVariable String cpf){
        return funcionarioService.buscarPorCpf(cpf)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/nome")
    public ResponseEntity<Funcionario> buscarPorNome(@RequestParam String nome) {
        Funcionario funcionario = funcionarioService.buscarPorNome(nome);
        return ResponseEntity.ok(funcionario);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Funcionario> atualizar(@PathVariable Long id, @RequestBody Funcionario funcionarioNovo){

        Funcionario funcionarioAtualizado = funcionarioService.atualizar(id, funcionarioNovo);

        return ResponseEntity.ok(funcionarioAtualizado);
    }

    @GetMapping
    public ResponseEntity<List<Funcionario>> listarTodas(){
        // o garçom (Controller) pede para o cozinheiro (Service) a lista
        List<Funcionario> lista = funcionarioService.listarTodas();

        //o garçom entrega o prato com o status 200 OK
        return ResponseEntity.ok(lista);
    }


    @PatchMapping("/{id}/inativar")
    public ResponseEntity<Funcionario> inativar(@PathVariable Long id){
        funcionarioService.inativar(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id){
        funcionarioService.deletar(id);

        return ResponseEntity.noContent().build();
    }
}
