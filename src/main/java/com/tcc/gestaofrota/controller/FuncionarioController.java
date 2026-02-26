package com.tcc.gestaofrota.controller;


import com.tcc.gestaofrota.model.Funcionario;
import com.tcc.gestaofrota.service.FuncionarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/funcionarios")
public class FuncionarioController {

    @Autowired
    private FuncionarioService funcionarioService;

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

    @GetMapping("/nome/{nome}")
    public ResponseEntity<Funcionario> buscarPorNome(@PathVariable String nome){
        return funcionarioService.buscarPorNome(nome)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
