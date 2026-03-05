package com.tcc.gestaofrota.service;


import com.tcc.gestaofrota.model.Funcionario;
import com.tcc.gestaofrota.repository.FuncionarioRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class FuncionarioService {

    private final FuncionarioRepository funcionarioRepository;

    public FuncionarioService(FuncionarioRepository funcionarioRepository) {
        this.funcionarioRepository = funcionarioRepository;
    }

    public Funcionario buscarPorNome(String nome) { //
        return funcionarioRepository.findByNome(nome)
                .orElseThrow(() -> new RuntimeException("Funcionário com o nome " + nome + " não encontrado"));
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

    public List<Funcionario> listarTodas(){
        return funcionarioRepository.findAll();

    }

    public Funcionario buscarPorId(Long id){
        Optional<Funcionario> caixaMisteriosa = funcionarioRepository.findById(id);

        if (caixaMisteriosa.isEmpty()){
            throw new RuntimeException("Nehum funcionário encontrado no banco de dados!");
        }
        //Se a caixa não está vazia, nós pegamos a permissão lá de dentro e devolvemos
        return caixaMisteriosa.get();
    }

    public Funcionario atualizar(Long id, Funcionario funcionarioNovo){
        Funcionario funcionarioAntigo = buscarPorId(id);

        funcionarioAntigo.setCpf(funcionarioNovo.getCpf());
        funcionarioAntigo.setRg(funcionarioNovo.getRg());
        funcionarioAntigo.setNome(funcionarioNovo.getNome());
        funcionarioAntigo.setCartoes(funcionarioNovo.getCartoes());
        funcionarioAntigo.setNivelMotorista(funcionarioNovo.getNivelMotorista());
        funcionarioAntigo.setPermissao(funcionarioNovo.getPermissao());
        funcionarioAntigo.setSetor(funcionarioNovo.getSetor());

        return funcionarioRepository.save(funcionarioAntigo);
    }

    public void inativar(Long id){
        Funcionario funcionarioInativo = buscarPorId(id);

        funcionarioInativo.setAtivo(false);

        funcionarioRepository.save(funcionarioInativo);
    }

    public void deletar(Long id){
        buscarPorId(id);

        funcionarioRepository.deleteById(id);
    }

}
