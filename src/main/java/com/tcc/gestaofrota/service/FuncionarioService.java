package com.tcc.gestaofrota.service;


import com.tcc.gestaofrota.model.Funcionario;
import com.tcc.gestaofrota.repository.FuncionarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class FuncionarioService {

    private final FuncionarioRepository funcionarioRepository;

    public FuncionarioService(FuncionarioRepository funcionarioRepository) {
        this.funcionarioRepository = funcionarioRepository;
    }

    public Optional<Funcionario> buscarPorNome(String nome){
        return funcionarioRepository.findByNome(nome);
    }

    public Optional<Funcionario> buscarPorCpf(String cpf){
        return funcionarioRepository.findByCpf(cpf);
    }

    // Regra de negócio // se já existe eu não salvo
    public Funcionario salvar(Funcionario funcionario){

        //Regra de não cadastrar dois funcionarios com o mesmo cpf
        //Faz a busca cpf e coloca dentro da variaval jaExiste
        Optional<Funcionario> jaExiste = funcionarioRepository.findByCpf(funcionario.getCpf());

        //pega a variavel que tem o numero do cpf dentro e faz uma condição, se já existe!
        if(jaExiste.isPresent()){
            throw new RuntimeException("Já existe um funcionário com este CPF cadastrado!");
        }

        Optional<Funcionario> rgExiste = funcionarioRepository.findByRg(funcionario.getRg());
        if (rgExiste.isPresent()){
            throw new RuntimeException("Já existe funcionário com este RG cadastrado!");
        }

        //caso não existir, ele retorna o valor e salva
        return funcionarioRepository.save(funcionario);
    }
}
