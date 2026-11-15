package com.tcc.gestaofrota.service;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import com.tcc.gestaofrota.model.Funcionario;
import com.tcc.gestaofrota.model.Permissao;
import com.tcc.gestaofrota.model.Usuario;
import com.tcc.gestaofrota.repository.FuncionarioRepository;
import com.tcc.gestaofrota.repository.PermissaoRepository;
import com.tcc.gestaofrota.repository.UsuarioRepository;
import com.tcc.gestaofrota.security.LimiteLoginService;
import com.tcc.gestaofrota.util.Validacoes;
import com.tcc.gestaofrota.security.RefreshTokenService;

@Service
public class UsuarioService {

    private final AtividadeService atividadeService;

    private final UsuarioRepository usuarioRepository;
    private final FuncionarioRepository funcionarioRepository;
    private final PermissaoRepository permissaoRepository;
    private final RefreshTokenService refreshTokenService;
    private final SetorService setorService;
    private final LimiteLoginService limiteLogin;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public UsuarioService(UsuarioRepository usuarioRepository,
                          FuncionarioRepository funcionarioRepository,
                          PermissaoRepository permissaoRepository,
                          RefreshTokenService refreshTokenService,
                          SetorService setorService,
            AtividadeService atividadeService,
                          LimiteLoginService limiteLogin) {
        this.limiteLogin = limiteLogin;
        this.usuarioRepository = usuarioRepository;
        this.funcionarioRepository = funcionarioRepository;
        this.permissaoRepository = permissaoRepository;
        this.refreshTokenService = refreshTokenService;
        this.setorService = setorService;
        this.atividadeService = atividadeService;
    }

    /** Converte a lista de chaves vinda do frontend nas entidades correspondentes. */
    private Set<Permissao> resolverPermissoes(Object valorBruto) {
        if (!(valorBruto instanceof Collection<?> colecao)) {
            return new HashSet<>();
        }
        Set<String> chaves = colecao.stream()
                .filter(java.util.Objects::nonNull)
                .map(Object::toString)
                .collect(Collectors.toSet());

        if (chaves.isEmpty()) {
            return new HashSet<>();
        }
        return new HashSet<>(permissaoRepository.findByNomePermissaoIn(chaves));
    }

    public List<Usuario> listarTodos() {
        return usuarioRepository.findAll();
    }

    public Usuario criar(Map<String, Object> dados) {

        Object idBruto = dados.get("idFuncionario");
        Funcionario funcionario = null;

        if(idBruto != null) {
            Long idFuncionario = Long.valueOf(dados.get("idFuncionario").toString());
             funcionario = funcionarioRepository.findById(idFuncionario)
                    .orElseThrow(() -> new RuntimeException("Funcionário não encontrado"));

            if (usuarioRepository.existsByFuncionarioId(idFuncionario)) {
                throw new RuntimeException("Funcionário já possui um usuário cadastrado");
            }
        }





        String nomeNovo = dados.get("nomeUsuario") == null ? null : dados.get("nomeUsuario").toString();
        String emailNovo = dados.get("email") == null ? null : dados.get("email").toString();
        String senhaNova = dados.get("senha") == null ? null : dados.get("senha").toString();
        Validacoes.obrigatorio(nomeNovo, "Nome");
        Validacoes.tamanho(nomeNovo, 2, 80, "Nome");
        Validacoes.email(emailNovo);
        Validacoes.senha(senhaNova);

        Usuario u = new Usuario();
        u.setNomeUsuario(nomeNovo.trim());
        u.setFuncionario(funcionario);
        u.setEmail(dados.get("email").toString().trim().toLowerCase());
        u.setSenha(encoder.encode(dados.get("senha").toString()));
        u.setAtivo(true);
        Set<Permissao> permissoes = resolverPermissoes(dados.get("permissoes"));
        // Nenhuma permissão marcada: o usuário começa com as permissões padrão do setor do funcionário.
        if (permissoes.isEmpty() && funcionario != null && funcionario.getSetor() != null) {
            permissoes = setorService.permissoesDoSetor(funcionario.getSetor().getId());
        }
        u.setPermissoes(permissoes);
        Usuario criado = usuarioRepository.save(u);
        atividadeService.registrar("USUARIO", "Criou o usuário " + criado.getNomeUsuario() + " (" + criado.getEmail() + ")");
        return criado;
    }

    public Usuario atualizar(Long id, Map<String, Object> dados) {
        Usuario u = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        if(dados.containsKey("idFuncionario")){
            Object idBruto = dados.get("idFuncionario");

            if(idBruto == null){
                u.setFuncionario(null);
            }
            else{
                Long idFunc = Long.valueOf(idBruto.toString());
                Funcionario f = funcionarioRepository.findById(idFunc)
                        .orElseThrow(() -> new RuntimeException("Funcionário não encontrado"));

                // So e conflito se o funcionario estiver em OUTRO usuario; manter o proprio vinculo e valido.
                usuarioRepository.findByFuncionarioId(idFunc).ifPresent(dono -> {
                    if (!dono.getId().equals(id)) {
                        throw new RuntimeException("Funcionário já possui um usuário cadastrado");
                    }
                });

                u.setFuncionario(f);
            }
        }
        if (dados.containsKey("nomeUsuario")) {
            String nomeNovo = String.valueOf(dados.get("nomeUsuario"));
            Validacoes.obrigatorio(nomeNovo, "Nome");
            Validacoes.tamanho(nomeNovo, 2, 80, "Nome");
            u.setNomeUsuario(nomeNovo.trim());
        }
        if (dados.containsKey("email")) {
            String emailNovo = String.valueOf(dados.get("email"));
            Validacoes.email(emailNovo);
            u.setEmail(emailNovo.trim().toLowerCase());
        }
        if (dados.containsKey("senha") && dados.get("senha") != null && !dados.get("senha").toString().isBlank()) {
            Validacoes.senha(dados.get("senha").toString());
            u.setSenha(encoder.encode(dados.get("senha").toString()));
        }
        boolean permissoesMudaram = false;
        if (dados.containsKey("permissoes")) {
            Set<Permissao> novas = resolverPermissoes(dados.get("permissoes"));
            permissoesMudaram = !chavesDe(u.getPermissoes()).equals(chavesDe(novas));
            u.setPermissoes(novas);
        }

        Usuario salvo = usuarioRepository.save(u);
        atividadeService.registrar("USUARIO", "Editou o usuário " + salvo.getNomeUsuario()
                + (permissoesMudaram ? " (permissões alteradas)" : ""));

        // Derruba as sessoes abertas: o token antigo ainda carregaria as permissoes antigas.
        if (permissoesMudaram) {
            refreshTokenService.revogarTodosDoUsuario(salvo.getId());
        }

        return salvo;
    }

    private Set<String> chavesDe(Set<Permissao> permissoes) {
        if (permissoes == null) return Set.of();
        return permissoes.stream().map(Permissao::getNomePermissao).collect(Collectors.toSet());
    }

    public Usuario toggleAtivo(Long id) {
        Usuario u = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        u.setAtivo(!Boolean.TRUE.equals(u.getAtivo()));
        Usuario salvo = usuarioRepository.save(u);
        atividadeService.registrar("USUARIO",
                (Boolean.TRUE.equals(salvo.getAtivo()) ? "Ativou" : "Inativou") + " o usuário " + salvo.getNomeUsuario());

        // Inativar precisa ter efeito imediato, nao so no proximo login.
        if (!Boolean.TRUE.equals(salvo.getAtivo())) {
            refreshTokenService.revogarTodosDoUsuario(salvo.getId());
        }

        return salvo;
    }

    public Optional<Usuario> buscarPorEmail(String email) {
        return usuarioRepository.findByEmail(email);
    }

    public Usuario autenticar(String email, String senha) {
        if (email == null || senha == null) {
            throw new RuntimeException("Informe e-mail e senha");
        }

        // Bloqueado por muitas tentativas erradas? Recusa antes mesmo de olhar a senha.
        limiteLogin.verificar(email);

        // Mensagem igual para e-mail inexistente e senha errada: nao revela quais e-mails existem.
        // E-mail inexistente também conta como tentativa errada, pelo mesmo motivo.
        Usuario u = usuarioRepository.findByEmail(email.trim().toLowerCase()).orElse(null);

        if (u == null || !encoder.matches(senha, u.getSenha())) {
            limiteLogin.registrarFalha(email);
            throw new RuntimeException("E-mail ou senha inválidos");
        }

        limiteLogin.registrarSucesso(email);

        if (!Boolean.TRUE.equals(u.getAtivo())) {
            throw new RuntimeException("Usuário inativo. Procure o administrador");
        }

        return u;
    }
}
