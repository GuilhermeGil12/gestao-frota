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
import com.tcc.gestaofrota.security.RefreshTokenService;

@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final FuncionarioRepository funcionarioRepository;
    private final PermissaoRepository permissaoRepository;
    private final RefreshTokenService refreshTokenService;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public UsuarioService(UsuarioRepository usuarioRepository,
                          FuncionarioRepository funcionarioRepository,
                          PermissaoRepository permissaoRepository,
                          RefreshTokenService refreshTokenService) {
        this.usuarioRepository = usuarioRepository;
        this.funcionarioRepository = funcionarioRepository;
        this.permissaoRepository = permissaoRepository;
        this.refreshTokenService = refreshTokenService;
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





        Usuario u = new Usuario();
        u.setNomeUsuario(dados.get("nomeUsuario").toString());
        u.setFuncionario(funcionario);
        u.setEmail(dados.get("email").toString().trim().toLowerCase());
        u.setSenha(encoder.encode(dados.get("senha").toString()));
        u.setAtivo(true);
        u.setPermissoes(resolverPermissoes(dados.get("permissoes")));
        return usuarioRepository.save(u);
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
        if(dados.containsKey("nomeUsuario")) u.setNomeUsuario(dados.get("nomeUsuario").toString());
        if (dados.containsKey("email")) u.setEmail(dados.get("email").toString().trim().toLowerCase());
        if (dados.containsKey("senha") && !dados.get("senha").toString().isBlank()) {
            u.setSenha(encoder.encode(dados.get("senha").toString()));
        }
        boolean permissoesMudaram = false;
        if (dados.containsKey("permissoes")) {
            Set<Permissao> novas = resolverPermissoes(dados.get("permissoes"));
            permissoesMudaram = !chavesDe(u.getPermissoes()).equals(chavesDe(novas));
            u.setPermissoes(novas);
        }

        Usuario salvo = usuarioRepository.save(u);

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

        // Mensagem igual para e-mail inexistente e senha errada: nao revela quais e-mails existem.
        Usuario u = usuarioRepository.findByEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new RuntimeException("E-mail ou senha inválidos"));

        if (!encoder.matches(senha, u.getSenha())) {
            throw new RuntimeException("E-mail ou senha inválidos");
        }

        if (!Boolean.TRUE.equals(u.getAtivo())) {
            throw new RuntimeException("Usuário inativo. Procure o administrador");
        }

        return u;
    }
}
