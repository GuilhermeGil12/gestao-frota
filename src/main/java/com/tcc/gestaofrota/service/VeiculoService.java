package com.tcc.gestaofrota.service;


import com.tcc.gestaofrota.model.Controladora;
import com.tcc.gestaofrota.model.Veiculo;
import com.tcc.gestaofrota.repository.ControladoraRepository;
import com.tcc.gestaofrota.repository.VeiculoRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tcc.gestaofrota.util.Validacoes;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
public class VeiculoService {

    private final AtividadeService atividadeService;

    private final VeiculoRepository veiculoRepository;
    private final ControladoraRepository controladoraRepository;
    private final RevisaoService revisaoService;

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

    /** O limite de velocidade de um veículo mudou, ou uma controladora trocou de veículo. */
    public record LimiteOuVinculoAlterado() {}

    private final ApplicationEventPublisher eventos;

    public VeiculoService(VeiculoRepository veiculoRepository, ControladoraRepository controladoraRepository,
            AtividadeService atividadeService, RevisaoService revisaoService, ApplicationEventPublisher eventos) {
        this.eventos = eventos;
        this.revisaoService = revisaoService;
        this.veiculoRepository = veiculoRepository;
        this.controladoraRepository = controladoraRepository;
        this.atividadeService = atividadeService;
    }

    public Optional<Veiculo> buscarPorPlaca(String placa){
        return veiculoRepository.findByPlaca(placa);
    }

    @Transactional
    public Veiculo salvar(Veiculo veiculo){
        Validacoes.obrigatorio(veiculo.getNome(), "Nome do veículo");
        Validacoes.tamanho(veiculo.getNome(), 2, 60, "Nome do veículo");
        Validacoes.placa(veiculo.getPlaca());
        Validacoes.renavam(veiculo.getRenavam());
        Validacoes.velocidadeMaximaOpcional(veiculo.getVelocidadeMaxima());

        Optional<Veiculo> jaExiste = veiculoRepository.findByPlaca(veiculo.getPlaca());
        if(jaExiste.isPresent()){
           throw new RuntimeException("Já existe Veículo com essa Placa cadastrada!");
       }

        Optional<Veiculo> renavamExiste = veiculoRepository.findByRenavam(veiculo.getRenavam());
        if(renavamExiste.isPresent()){
            throw new RuntimeException("Já existe Veículo com esse Renavam cadastrado!");
        }

        Long controladoraId = (veiculo.getControladora() != null) ? veiculo.getControladora().getIdControladora() : null;
        if (controladoraId != null) exigirAprovada(controladoraId);

        // Remove a referência detached antes de salvar para evitar cascade em entidade detached
        veiculo.setControladora(null);
        validarKm(veiculo.getKmAtual());
        veiculo.setKmUltimaRevisao(null);
        // O GPS começa a somar a partir do km informado agora.
        veiculo.setKmContadoAte(veiculo.getKmAtual() != null ? LocalDateTime.now() : null);
        Veiculo veiculoSalvo = veiculoRepository.save(veiculo);
        atividadeService.registrar("VEICULO", "Cadastrou o veículo " + veiculoSalvo.getPlaca());

        if (controladoraId != null) {
            Controladora controladora = controladoraRepository.findById(controladoraId)
                    .orElseThrow(() -> new RuntimeException("Controladora não encontrada"));
            controladora.setVeiculo(veiculoSalvo);
            controladoraRepository.save(controladora);
            veiculoSalvo.setControladora(controladora);
            eventos.publishEvent(new LimiteOuVinculoAlterado()); // a controladora recebe o limite do veículo
        }

        return veiculoSalvo;
    }

    public List<Veiculo> listarTodas(){
        return veiculoRepository.findAll().stream().map(revisaoService::comProximaRevisao).toList();
    }

    private void validarKm(Double km) {
        if (km != null && (km < 0 || km > 9_999_999)) {
            throw new RuntimeException("O km atual deve ser entre 0 e 9.999.999.");
        }
    }

    public Veiculo buscarPorId(Long id){
        Optional<Veiculo> caixaMisteriosa = veiculoRepository.findById(id);

        if(caixaMisteriosa.isEmpty()){
            throw new RuntimeException("Veiculo não encontrado no banco de dados!");
        }
        //Se a caixa não está vazia, nós pegamos a permissão lá de dentro e devolvemos
        return caixaMisteriosa.get();
    }

    @Transactional
    public Veiculo atualizar(Long id, Veiculo veiculoNovo){

        Veiculo veiculoAntigo = buscarPorId(id);

        // Só o que mudou (o botão de ativar/inativar reenvia o veículo inteiro).
        if (Validacoes.mudou(veiculoNovo.getNome(), veiculoAntigo.getNome(), false)) {
            Validacoes.obrigatorio(veiculoNovo.getNome(), "Nome do veículo");
            Validacoes.tamanho(veiculoNovo.getNome(), 2, 60, "Nome do veículo");
        }
        if (Validacoes.mudou(veiculoNovo.getRenavam(), veiculoAntigo.getRenavam(), false)) {
            Validacoes.renavam(veiculoNovo.getRenavam());
            // Mesma regra do cadastro: o RENAVAM não pode ser de outro veículo.
            veiculoRepository.findByRenavam(veiculoNovo.getRenavam())
                    .filter(outro -> !outro.getId().equals(id))
                    .ifPresent(outro -> {
                        throw new RuntimeException("Já existe Veículo com esse Renavam cadastrado! (" + outro.getPlaca() + ")");
                    });
        }
        if (Validacoes.mudou(veiculoNovo.getVelocidadeMaxima(), veiculoAntigo.getVelocidadeMaxima(), false)) {
            Validacoes.velocidadeMaximaOpcional(veiculoNovo.getVelocidadeMaxima());
        }

        //vai pegar o valor que vem do front e coloca dentro da variavel antiga, substitui
        //não coloquei a mudança da placa pois não será possível alterar a placa
        // Km digitado à mão: vira a nova base e o GPS volta a somar a partir de agora.
        if (!Objects.equals(veiculoNovo.getKmAtual(), veiculoAntigo.getKmAtual())) {
            validarKm(veiculoNovo.getKmAtual());
            veiculoAntigo.setKmAtual(veiculoNovo.getKmAtual());
            veiculoAntigo.setKmContadoAte(veiculoNovo.getKmAtual() != null ? LocalDateTime.now() : null);
        }
        veiculoAntigo.setRenavam(veiculoNovo.getRenavam());
        veiculoAntigo.setVelocidadeMaxima(veiculoNovo.getVelocidadeMaxima());
        veiculoAntigo.setNome(veiculoNovo.getNome());
        veiculoAntigo.setAtivo(veiculoNovo.getAtivo()); // Permitir atualizar o status

        // Lógica para atualizar a controladora
        if (veiculoNovo.getControladora() != null && veiculoNovo.getControladora().getIdControladora() != null) {
            exigirAprovada(veiculoNovo.getControladora().getIdControladora());
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

        Veiculo atualizado = veiculoRepository.save(veiculoAntigo);
        atividadeService.registrar("VEICULO", "Editou o veículo " + atualizado.getPlaca());
        // O limite de velocidade vai para a controladora pelo tópico de regras.
        eventos.publishEvent(new LimiteOuVinculoAlterado());
        return revisaoService.comProximaRevisao(atualizado);
    }

    @Transactional
    public void deletar(Long id){
        Veiculo veiculo = buscarPorId(id);
        
        // Antes de deletar o veículo, precisamos desvincular a controladora se houver
        if (veiculo.getControladora() != null) {
            Controladora c = veiculo.getControladora();
            c.setVeiculo(null);
            controladoraRepository.save(c);
        }

        veiculoRepository.deleteById(id);
        atividadeService.registrar("VEICULO", "Excluiu o veículo " + veiculo.getPlaca());
    }

    // Controladora aguardando aprovação só ganha veículo pelo botão "Aprovar" em Controladoras.
    private void exigirAprovada(Long idControladora) {
        controladoraRepository.findById(idControladora).ifPresent(c -> {
            if (!c.estaAprovada()) {
                throw new RuntimeException("Esta controladora ainda não foi aprovada. Aprove em Controladoras.");
            }
        });
    }
}
