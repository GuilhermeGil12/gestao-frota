package com.tcc.gestaofrota.service;

import com.tcc.gestaofrota.model.Atividade;
import com.tcc.gestaofrota.model.Usuario;
import com.tcc.gestaofrota.repository.AtividadeRepository;
import com.tcc.gestaofrota.repository.UsuarioRepository;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Log de atividades. Os outros Services chamam registrar("CARTAO", "Inativou o cartão ...")
 * e o usuário é descoberto aqui, pelo token da requisição. Sem usuário logado
 * (tarefa agendada, mensagem do MQTT), quem aparece é o "Sistema".
 */
@Service
public class AtividadeService {

    public static final String SISTEMA = "Sistema";

    /** Quem está fazendo a ação agora. id null = Sistema. */
    public record Autor(Long id, String nome) {}

    private final AtividadeRepository atividadeRepository;
    private final UsuarioRepository usuarioRepository;

    public AtividadeService(AtividadeRepository atividadeRepository, UsuarioRepository usuarioRepository) {
        this.atividadeRepository = atividadeRepository;
        this.usuarioRepository = usuarioRepository;
    }

    public Autor autorAtual() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            return new Autor(null, SISTEMA);
        }
        // O "nome" da autenticação é o e-mail (subject do token).
        Optional<Usuario> usuario = usuarioRepository.findByEmail(auth.getName());
        return usuario.map(u -> new Autor(u.getId(), u.getNomeUsuario())).orElse(new Autor(null, SISTEMA));
    }

    public void registrar(String categoria, String descricao) {
        // O log nunca pode derrubar a ação principal: se falhar, só avisa no console.
        try {
            Autor autor = autorAtual();
            Atividade a = new Atividade();
            a.setDataHora(LocalDateTime.now());
            a.setUsuarioId(autor.id());
            a.setUsuarioNome(autor.nome());
            a.setCategoria(categoria);
            a.setDescricao(descricao.length() > 300 ? descricao.substring(0, 300) : descricao);
            atividadeRepository.save(a);
        } catch (Exception e) {
            System.out.println("[Atividade] não registrada (" + categoria + "): " + e.getMessage());
        }
    }

    // No máximo 1000 registros por consulta (os mais recentes).
    public List<Atividade> listar(LocalDateTime inicio, LocalDateTime fim, String categoria) {
        if (categoria == null || categoria.isBlank()) {
            return atividadeRepository.findTop1000ByDataHoraBetweenOrderByDataHoraDesc(inicio, fim);
        }
        return atividadeRepository.findTop1000ByCategoriaAndDataHoraBetweenOrderByDataHoraDesc(categoria, inicio, fim);
    }
}
