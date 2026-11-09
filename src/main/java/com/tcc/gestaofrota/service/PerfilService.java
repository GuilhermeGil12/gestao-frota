package com.tcc.gestaofrota.service;

import com.tcc.gestaofrota.model.Funcionario;
import com.tcc.gestaofrota.model.Usuario;
import com.tcc.gestaofrota.repository.UsuarioRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

// Tudo que o próprio usuário logado pode ver e mudar sobre si mesmo.
// O usuário é sempre o do token (e-mail), nunca um id vindo do frontend.
@Service
public class PerfilService {

    // Tipos de notificação que o usuário pode ligar/desligar.
    public static final List<String> TIPOS_NOTIFICACAO = List.of("CNH_VENCENDO", "CNH_VENCIDA", "COMANDO_EXECUTADO", "EXCESSO_VELOCIDADE", "RELATORIO_SEMANAL");

    // A foto chega já reduzida pelo navegador; o limite só impede abuso.
    private static final int TAMANHO_MAXIMO_FOTO = 400_000;
    private static final Pattern FORMATO_FOTO = Pattern.compile("^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$");
    private static final int SENHA_MINIMA = 6;

    private final UsuarioRepository usuarioRepository;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public PerfilService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    private Usuario usuarioLogado(String email) {
        return usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado."));
    }

    public Map<String, Object> buscar(String email) {
        Usuario u = usuarioLogado(email);
        Map<String, Object> perfil = new HashMap<>();
        perfil.put("id", u.getId());
        perfil.put("nomeUsuario", u.getNomeUsuario());
        perfil.put("email", u.getEmail());
        perfil.put("foto", u.getFoto());
        perfil.put("notificacoesDesativadas", new ArrayList<>(notificacoesDesativadas(u)));
        perfil.put("quantidadePermissoes", u.getPermissoes() == null ? 0 : u.getPermissoes().size());

        Funcionario f = u.getFuncionario();
        if (f != null) {
            Map<String, Object> funcionario = new HashMap<>();
            funcionario.put("nome", f.getNome());
            funcionario.put("cargo", f.getCargo());
            funcionario.put("matricula", f.getMatricula());
            funcionario.put("setor", f.getSetor() != null ? f.getSetor().getNome() : null);
            funcionario.put("telefone", f.getNumeroTelefone());
            funcionario.put("validadeCNH", f.getValidadeCNH());
            funcionario.put("cnhPendente", Boolean.TRUE.equals(f.getCnhPendente()));
            perfil.put("funcionario", funcionario);
        }
        return perfil;
    }

    public Map<String, Object> atualizarNome(String email, String nome) {
        if (nome == null || nome.isBlank()) throw new RuntimeException("Informe o nome.");
        if (nome.trim().length() > 80) throw new RuntimeException("O nome pode ter no máximo 80 caracteres.");
        Usuario u = usuarioLogado(email);
        u.setNomeUsuario(nome.trim());
        usuarioRepository.save(u);
        return buscar(email);
    }

    public void trocarSenha(String email, String senhaAtual, String novaSenha) {
        Usuario u = usuarioLogado(email);
        if (senhaAtual == null || !encoder.matches(senhaAtual, u.getSenha())) {
            throw new RuntimeException("A senha atual está incorreta.");
        }
        if (novaSenha == null || novaSenha.length() < SENHA_MINIMA) {
            throw new RuntimeException("A nova senha precisa ter pelo menos " + SENHA_MINIMA + " caracteres.");
        }
        if (encoder.matches(novaSenha, u.getSenha())) {
            throw new RuntimeException("A nova senha precisa ser diferente da atual.");
        }
        u.setSenha(encoder.encode(novaSenha));
        usuarioRepository.save(u);
    }

    // foto = data URL ("data:image/jpeg;base64,..."); null remove a foto.
    public Map<String, Object> atualizarFoto(String email, String foto) {
        if (foto != null) {
            if (foto.length() > TAMANHO_MAXIMO_FOTO) throw new RuntimeException("A foto é grande demais.");
            if (!FORMATO_FOTO.matcher(foto).matches()) throw new RuntimeException("Envie uma imagem PNG, JPG ou WEBP.");
        }
        Usuario u = usuarioLogado(email);
        u.setFoto(foto);
        usuarioRepository.save(u);
        return buscar(email);
    }

    public Map<String, Object> atualizarNotificacoes(String email, Collection<String> desativadas) {
        Usuario u = usuarioLogado(email);
        String valor = desativadas == null ? "" : desativadas.stream()
                .filter(TIPOS_NOTIFICACAO::contains)
                .distinct()
                .collect(Collectors.joining(","));
        u.setNotificacoesDesativadas(valor.isEmpty() ? null : valor);
        usuarioRepository.save(u);
        return buscar(email);
    }

    // Fotos de vários usuários de uma vez (listas de log): { "3": "data:image/jpeg;base64,..." }.
    // Quem não tem foto não aparece no mapa (o site mostra as iniciais).
    public Map<String, String> fotos(Collection<Long> ids) {
        Map<String, String> fotos = new HashMap<>();
        if (ids == null || ids.isEmpty()) return fotos;
        for (Usuario u : usuarioRepository.findAllById(ids)) {
            if (u.getFoto() != null) fotos.put(String.valueOf(u.getId()), u.getFoto());
        }
        return fotos;
    }

    public Set<String> notificacoesDesativadas(String email) {
        return usuarioRepository.findByEmail(email).map(this::notificacoesDesativadas).orElse(Set.of());
    }

    public Set<String> notificacoesDesativadas(Usuario u) {
        String valor = u.getNotificacoesDesativadas();
        if (valor == null || valor.isBlank()) return Set.of();
        return Arrays.stream(valor.split(",")).map(String::trim).filter(s -> !s.isEmpty()).collect(Collectors.toSet());
    }
}
