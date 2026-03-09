package com.tcc.gestaofrota.service;


import com.tcc.gestaofrota.model.Controladora;
import com.tcc.gestaofrota.model.Veiculo;
import com.tcc.gestaofrota.repository.ControladoraRepository;
import com.tcc.gestaofrota.repository.VeiculoRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class VeiculoService {

    private final VeiculoRepository veiculoRepository;
    private final ControladoraRepository controladoraRepository;

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

    public VeiculoService(VeiculoRepository veiculoRepository, ControladoraRepository controladoraRepository) {
        this.veiculoRepository = veiculoRepository;
        this.controladoraRepository = controladoraRepository;
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

        // Lógica para vincular a controladora se ela vier preenchida
        if (veiculo.getControladora() != null && veiculo.getControladora().getIdControladora() != null) {
            Controladora controladora = controladoraRepository.findById(veiculo.getControladora().getIdControladora())
                    .orElseThrow(() -> new RuntimeException("Controladora não encontrada"));
            
            // O relacionamento é bidirecional, mas o dono da chave é a Controladora (lado @OneToOne com @JoinColumn)
            // Porém, como estamos salvando o Veículo, precisamos garantir que a controladora aponte para este veículo.
            // Mas espere! O mapeamento diz que Controladora tem o @JoinColumn.
            // Então precisamos salvar a controladora com o veículo setado nela.
            
            // Vamos salvar o veículo primeiro para ter um ID
            Veiculo veiculoSalvo = veiculoRepository.save(veiculo);
            
            controladora.setVeiculo(veiculoSalvo);
            controladoraRepository.save(controladora);
            
            veiculoSalvo.setControladora(controladora);
            return veiculoSalvo;
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
        veiculoAntigo.setAtivo(veiculoNovo.getAtivo()); // Permitir atualizar o status

        // Lógica para atualizar a controladora
        if (veiculoNovo.getControladora() != null && veiculoNovo.getControladora().getIdControladora() != null) {
            // Se o usuário selecionou uma controladora nova
            Controladora novaControladora = controladoraRepository.findById(veiculoNovo.getControladora().getIdControladora())
                    .orElseThrow(() -> new RuntimeException("Controladora não encontrada"));

            // Se o veículo já tinha uma controladora antes, precisamos desvincular a antiga
            if (veiculoAntigo.getControladora() != null) {
                Controladora antigaControladora = veiculoAntigo.getControladora();
                antigaControladora.setVeiculo(null);
                controladoraRepository.save(antigaControladora);
            }

            // Vincula a nova controladora a este veículo
            novaControladora.setVeiculo(veiculoAntigo);
            controladoraRepository.save(novaControladora);
            
            veiculoAntigo.setControladora(novaControladora);
        } else if (veiculoNovo.getControladora() == null) {
            // Se o usuário selecionou "Nenhuma / Sem Rastreador", precisamos desvincular a atual se existir
            if (veiculoAntigo.getControladora() != null) {
                Controladora antigaControladora = veiculoAntigo.getControladora();
                antigaControladora.setVeiculo(null);
                controladoraRepository.save(antigaControladora);
                veiculoAntigo.setControladora(null);
            }
        }

        return veiculoRepository.save(veiculoAntigo);
    }

    public void deletar(Long id){
        Veiculo veiculo = buscarPorId(id);
        
        // Antes de deletar o veículo, precisamos desvincular a controladora se houver
        if (veiculo.getControladora() != null) {
            Controladora c = veiculo.getControladora();
            c.setVeiculo(null);
            controladoraRepository.save(c);
        }

        veiculoRepository.deleteById(id);
    }
}
