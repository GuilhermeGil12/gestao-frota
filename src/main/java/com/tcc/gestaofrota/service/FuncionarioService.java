package com.tcc.gestaofrota.service;


import com.tcc.gestaofrota.model.Cerca;
import com.tcc.gestaofrota.model.Funcionario;
import com.tcc.gestaofrota.repository.CercaRepository;
import com.tcc.gestaofrota.repository.FuncionarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.List;
import java.util.Optional;

import javax.management.RuntimeErrorException;

@Service
public class FuncionarioService {

    private final FuncionarioRepository funcionarioRepository;
    private final CercaRepository cercaRepository;
    

    public FuncionarioService(FuncionarioRepository funcionarioRepository, CercaRepository cercaRepository) {
        this.funcionarioRepository = funcionarioRepository;
        this.cercaRepository = cercaRepository;
    }

    private void criarOuAtualizarCercaCasa(Funcionario funcionario) {
        if (funcionario.getLatitude() == null || funcionario.getLongitude() == null) return;

        List<Cerca> cercasDoFuncionario = cercaRepository.findByFuncionarioId(funcionario.getId());

        // Busca a cerca "Casa" já existente (criada automaticamente)
        cercasDoFuncionario.stream()
                .filter(c -> c.getNome() != null && c.getNome().startsWith("Casa - "))
                .findFirst()
                .ifPresentOrElse(
                    cercaExistente -> {
                        cercaExistente.setLatitude(funcionario.getLatitude());
                        cercaExistente.setLongitude(funcionario.getLongitude());
                        cercaExistente.setNome("Casa - " + funcionario.getNome());
                        cercaRepository.save(cercaExistente);
                    },
                    () -> {
                        Cerca nova = new Cerca();
                        nova.setNome("Casa - " + funcionario.getNome());
                        nova.setLatitude(funcionario.getLatitude());
                        nova.setLongitude(funcionario.getLongitude());
                        nova.setRaio(100.0);
                        nova.setAtivo(true);
                        nova.setFuncionario(funcionario);
                        cercaRepository.save(nova);
                    }
                );
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
        Funcionario salvo = funcionarioRepository.save(funcionario);
        criarOuAtualizarCercaCasa(salvo);
        return salvo;
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

    public Funcionario buscarPorEmail(String email){
        Optional<Funcionario> caixaMisteriosa = funcionarioRepository.findByEmail(email);

        if(caixaMisteriosa.isEmpty()){
            throw new RuntimeException( "Nenhum email encontrado no banco de dados!");
        }
        return caixaMisteriosa.get();
    }

    public Funcionario atualizar(Long id, Funcionario funcionarioNovo){
        Funcionario funcionarioAntigo = buscarPorId(id);

        funcionarioAntigo.setNome(funcionarioNovo.getNome());
        funcionarioAntigo.setCpf(funcionarioNovo.getCpf());
        funcionarioAntigo.setRg(funcionarioNovo.getRg());
        funcionarioAntigo.setNumeroTelefone(funcionarioNovo.getNumeroTelefone());
        funcionarioAntigo.setEmail(funcionarioNovo.getEmail());
        funcionarioAntigo.setCargo(funcionarioNovo.getCargo());
        funcionarioAntigo.setMatricula(funcionarioNovo.getMatricula());
        funcionarioAntigo.setSetor(funcionarioNovo.getSetor());
        funcionarioAntigo.setNivelMotorista(funcionarioNovo.getNivelMotorista());
        funcionarioAntigo.setNumCNH(funcionarioNovo.getNumCNH());
        funcionarioAntigo.setCategoriaCNH(funcionarioNovo.getCategoriaCNH());
        funcionarioAntigo.setValidadeCNH(funcionarioNovo.getValidadeCNH());
        funcionarioAntigo.setPermissao(funcionarioNovo.getPermissao());
        funcionarioAntigo.setCartoes(funcionarioNovo.getCartoes());
        funcionarioAntigo.setAtivo(funcionarioNovo.getAtivo());
        funcionarioAntigo.setSenha(funcionarioNovo.getSenha());
        funcionarioAntigo.setLatitude(funcionarioNovo.getLatitude());
        funcionarioAntigo.setLongitude(funcionarioNovo.getLongitude());
        funcionarioAntigo.setEndereco(funcionarioNovo.getEndereco());
        funcionarioAntigo.setNumero(funcionarioNovo.getNumero());
        funcionarioAntigo.setBairro(funcionarioNovo.getBairro());
        funcionarioAntigo.setCidade(funcionarioNovo.getCidade());
        funcionarioAntigo.setCep(funcionarioNovo.getCep());

        Funcionario atualizado = funcionarioRepository.save(funcionarioAntigo);
        criarOuAtualizarCercaCasa(atualizado);
        return atualizado;
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


    public void autenticar( String email, String senha){
        buscarPorEmail(email);

        

    }

}
