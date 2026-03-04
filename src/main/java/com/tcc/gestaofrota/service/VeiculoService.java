package com.tcc.gestaofrota.service;


import com.tcc.gestaofrota.model.Veiculo;
import com.tcc.gestaofrota.repository.VeiculoRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class VeiculoService {

    private final VeiculoRepository veiculoRepository;

    /**
     * Construtor utilizado para a Injeção de Dependências (Padrão Ouro do Spring Boot).
     * * Por que usamos o construtor em vez de colocar @Autowired direto na variável?
     * 1. Segurança: Permite usar a palavra 'final' na variável do repositório, garantindo
     * que ela nunca seja substituída ou fique nula durante a execução.
     * 2. Testabilidade: Cria uma "porta de entrada" clara, permitindo injetar um
     * repositório falso (Mock) facilmente na hora de criar Testes Unitários.
     * 3. Clareza de Design: Deixa explícito que o Service depende obrigatoriamente
     * deste repositório para ser instanciado e funcionar.
     */

    public VeiculoService(VeiculoRepository veiculoRepository) {
        this.veiculoRepository = veiculoRepository;
    }

    public Optional<Veiculo> buscarPorPlaca(String placa){
        return veiculoRepository.findByPlaca(placa);
    }

    public Veiculo salvar(Veiculo veiculo){

        Optional<Veiculo> jaExiste = veiculoRepository.findByPlaca(veiculo.getPlaca());
        if(jaExiste.isPresent()){
           throw new RuntimeException("Já existe Veículo com essa Placa cadastrada!");
       }

        Optional<Veiculo> renavamExiste = veiculoRepository.findByRenavam(veiculo.getRenavam());
        if(renavamExiste.isPresent()){
            throw new RuntimeException("Já existe Veículo com esse Renavam cadastrado!");
        }

        return veiculoRepository.save(veiculo);


    }

    public List<Veiculo> listarTodas(){
        return veiculoRepository.findAll();
    }

    public Veiculo buscarPorId(Long id){
        Optional<Veiculo> caixaMisteriosa = veiculoRepository.findById(id);

        if(caixaMisteriosa.isEmpty()){
            throw new RuntimeException("Veiculo não encontrado no banco de dados!");
        }
        //Se a caixa não está vazia, nós pegamos a permissão lá de dentro e devolvemos
        return caixaMisteriosa.get();
    }

    public Veiculo atualizar(Long id, Veiculo veiculoNovo){

        Veiculo veiculoAntigo = buscarPorId(id);

        //vai pegar o valor que vem do front e coloca dentro da variavel antiga, substitui
        //não coloquei a mudança da placa pois não será possível alterar a placa
        veiculoAntigo.setKmAtual(veiculoNovo.getKmAtual());
        veiculoAntigo.setRenavam(veiculoNovo.getRenavam());
        veiculoAntigo.setVelocidadeMaxima(veiculoNovo.getVelocidadeMaxima());
        veiculoAntigo.setNome(veiculoNovo.getNome());


    }

    public void deletar(Long id){
        buscarPorId(id);

        veiculoRepository.deleteById(id);
    }

}
