package com.tcc.gestaofrota.controller;


import com.tcc.gestaofrota.model.Funcionario;
import com.tcc.gestaofrota.service.FuncionarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
        Funcionario novoFuncionario = funcionarioService.salvar(funcionario);
        return ResponseEntity.ok(novoFuncionario);
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
}
