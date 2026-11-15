package com.tcc.gestaofrota.service;


import com.tcc.gestaofrota.model.Cerca;
import com.tcc.gestaofrota.model.Funcionario;
import com.tcc.gestaofrota.repository.CercaRepository;
import com.tcc.gestaofrota.repository.FuncionarioRepository;
import com.tcc.gestaofrota.model.Setor;
import com.tcc.gestaofrota.repository.SetorRepository;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.List;
import java.util.Optional;

import com.tcc.gestaofrota.util.Validacoes;

import javax.management.RuntimeErrorException;

@Service
public class FuncionarioService {

    private final AtividadeService atividadeService;

    private final FuncionarioRepository funcionarioRepository;
    private final CercaRepository cercaRepository;
    private final SetorRepository setorRepository;

    public FuncionarioService(FuncionarioRepository funcionarioRepository, CercaRepository cercaRepository,
            AtividadeService atividadeService, SetorRepository setorRepository) {
        this.funcionarioRepository = funcionarioRepository;
        this.cercaRepository = cercaRepository;
        this.atividadeService = atividadeService;
        this.setorRepository = setorRepository;
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

    /**
     * Formato e tamanho dos campos (mesmas regras do formulário).
     * antigo == null: cadastro novo, valida tudo. Na atualização, só o que mudou
     * (o botão de reativar reenvia o registro inteiro, e cadastros antigos podem estar fora do padrão).
     */
    private void validarCampos(Funcionario f, Funcionario antigo) {
        boolean novo = antigo == null;
        if (Validacoes.mudou(f.getNome(), novo ? null : antigo.getNome(), novo)) Validacoes.nomeCompleto(f.getNome());
        if (Validacoes.mudou(f.getCpf(), novo ? null : antigo.getCpf(), novo)) Validacoes.cpf(f.getCpf());
        if (Validacoes.mudou(f.getRg(), novo ? null : antigo.getRg(), novo)) Validacoes.rg(f.getRg());
        if (Validacoes.mudou(f.getNumeroTelefone(), novo ? null : antigo.getNumeroTelefone(), novo)) Validacoes.telefone(f.getNumeroTelefone());
        if (Validacoes.mudou(f.getEmail(), novo ? null : antigo.getEmail(), novo)) Validacoes.email(f.getEmail());
        if (Validacoes.mudou(f.getCep(), novo ? null : antigo.getCep(), novo)) Validacoes.cepOpcional(f.getCep());
        if (Validacoes.mudou(f.getMatricula(), novo ? null : antigo.getMatricula(), novo)) {
            Validacoes.obrigatorio(f.getMatricula(), "Matrícula");
            Validacoes.tamanho(f.getMatricula(), 1, 20, "Matrícula");
        }
        if (Validacoes.mudou(f.getCargo(), novo ? null : antigo.getCargo(), novo)) {
            Validacoes.obrigatorio(f.getCargo(), "Cargo");
            Validacoes.tamanho(f.getCargo(), 2, 60, "Cargo");
        }

        // Quem dirige (nível 1 a 3) precisa de CNH completa.
        boolean dirige = f.getNivelMotorista() != null && f.getNivelMotorista() > 0;
        if (dirige) {
            if (Validacoes.mudou(f.getNumCNH(), novo ? null : antigo.getNumCNH(), novo)
                    || Validacoes.mudou(f.getNivelMotorista(), novo ? null : antigo.getNivelMotorista(), novo)) {
                Validacoes.cnh(f.getNumCNH());
            }
            if (Validacoes.mudou(f.getCategoriaCNH(), novo ? null : antigo.getCategoriaCNH(), novo)
                    || Validacoes.mudou(f.getNivelMotorista(), novo ? null : antigo.getNivelMotorista(), novo)) {
                if (f.getCategoriaCNH() == null || !f.getCategoriaCNH().matches("A|B|C|D|E|AB|AC|AD|AE")) {
                    throw new RuntimeException("Escolha a categoria da CNH.");
                }
            }
            if (Validacoes.mudou(f.getValidadeCNH(), novo ? null : antigo.getValidadeCNH(), novo)
                    || Validacoes.mudou(f.getNivelMotorista(), novo ? null : antigo.getNivelMotorista(), novo)) {
                Validacoes.validadeCnh(f.getValidadeCNH());
            }
        }
    }

    // Regra de negócio // se já existe eu não salvo
    public Funcionario salvar(Funcionario funcionario){
        validarCampos(funcionario, null);

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
        aplicarLider(funcionario, funcionario);
        Funcionario salvo = funcionarioRepository.save(funcionario);
        atividadeService.registrar("FUNCIONARIO", "Cadastrou o funcionário " + salvo.getNome());
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

    @Transactional
    public Funcionario atualizar(Long id, Funcionario funcionarioNovo){
        Funcionario funcionarioAntigo = buscarPorId(id);
        validarCampos(funcionarioNovo, funcionarioAntigo);
        boolean estavaAtivo = !Boolean.FALSE.equals(funcionarioAntigo.getAtivo()); // antes dos setters

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

        aplicarLider(funcionarioAntigo, funcionarioNovo);
        Funcionario atualizado = funcionarioRepository.save(funcionarioAntigo);
        // Inativado pela edição (ativo=false): também deixa de liderar, igual ao botão Inativar.
        if (estavaAtivo && Boolean.FALSE.equals(atualizado.getAtivo())) {
            liberarLideranca(atualizado);
        }
        atividadeService.registrar("FUNCIONARIO", "Editou o funcionário " + atualizado.getNome());
        criarOuAtualizarCercaCasa(atualizado);
        return atualizado;
    }

    // Líder direto vindo do formulário (liderId). null = sem líder próprio (vale o do setor).
    private void aplicarLider(Funcionario destino, Funcionario dados) {
        if (!dados.isLiderInformado()) return;
        Long liderId = dados.getLiderIdInformado();
        if (liderId == null) {
            destino.setLider(null);
            return;
        }
        if (liderId.equals(destino.getId())) {
            throw new RuntimeException("O funcionário não pode ser líder dele mesmo.");
        }
        Funcionario lider = buscarPorId(liderId);
        if (!Boolean.TRUE.equals(lider.getAtivo())) {
            throw new RuntimeException("O líder escolhido (" + lider.getNome() + ") está inativo.");
        }
        // Não deixa fechar um ciclo (A lidera B e B lidera A): subindo a partir do novo líder,
        // não pode chegar no próprio funcionário.
        Funcionario acima = lider;
        for (int passos = 0; acima != null && passos < 100; passos++) {
            if (destino.getId() != null && destino.getId().equals(acima.getId())) {
                throw new RuntimeException(lider.getNome() + " já está abaixo de " + destino.getNome()
                        + " na liderança. Escolha outro líder.");
            }
            acima = acima.getLider();
        }
        destino.setLider(lider);
    }

    /**
     * Inativa o funcionário. Quem está inativo não lidera ninguém: ele deixa de ser líder
     * dos setores e dos liderados diretos (que passam a seguir o líder do setor).
     * Devolve o que mudou, para a tela avisar.
     */
    @Transactional
    public Map<String, Object> inativar(Long id){
        Funcionario funcionarioInativo = buscarPorId(id);

        funcionarioInativo.setAtivo(false);
        funcionarioRepository.save(funcionarioInativo);

        Map<String, Object> liberado = liberarLideranca(funcionarioInativo);
        atividadeService.registrar("FUNCIONARIO", "Inativou o funcionário " + funcionarioInativo.getNome()
                + descreverLiberacao(liberado));
        return liberado;
    }

    /** Tira o funcionário da liderança de setores e de liderados diretos. */
    private Map<String, Object> liberarLideranca(Funcionario lider) {
        List<Setor> setores = setorRepository.findByLider_Id(lider.getId());
        setores.forEach(s -> s.setLider(null));
        setorRepository.saveAll(setores);

        List<Funcionario> liderados = funcionarioRepository.findByLider_Id(lider.getId());
        liderados.forEach(f -> f.setLider(null));
        funcionarioRepository.saveAll(liderados);

        Map<String, Object> resultado = new HashMap<>();
        resultado.put("setores", setores.stream().map(Setor::getNome).toList());
        resultado.put("liderados", liderados.size());
        return resultado;
    }

    private static String descreverLiberacao(Map<String, Object> liberado) {
        @SuppressWarnings("unchecked")
        List<String> setores = (List<String>) liberado.get("setores");
        int liderados = (int) liberado.get("liderados");
        if (setores.isEmpty() && liderados == 0) return "";
        StringBuilder sb = new StringBuilder(" (deixou de liderar");
        if (!setores.isEmpty()) sb.append(" o setor ").append(String.join(", ", setores));
        if (!setores.isEmpty() && liderados > 0) sb.append(" e");
        if (liderados > 0) sb.append(" ").append(liderados).append(liderados == 1 ? " funcionário" : " funcionários");
        return sb.append(")").toString();
    }

    /**
     * Ao subir o servidor: quem já estava inativo e ainda aparece como líder
     * (inativado antes desta regra existir) é tirado da liderança.
     */
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void liberarLiderancaDeInativos() {
        List<Setor> setores = setorRepository.findByLider_AtivoFalse();
        setores.forEach(s -> s.setLider(null));
        setorRepository.saveAll(setores);

        List<Funcionario> liderados = funcionarioRepository.findByLider_AtivoFalse();
        liderados.forEach(f -> f.setLider(null));
        funcionarioRepository.saveAll(liderados);
    }

    public void deletar(Long id){
        Funcionario excluido = buscarPorId(id);

        funcionarioRepository.deleteById(id);
        atividadeService.registrar("FUNCIONARIO", "Excluiu o funcionário " + excluido.getNome());
    }


    public void autenticar( String email, String senha){
        buscarPorEmail(email);

        

    }

}
