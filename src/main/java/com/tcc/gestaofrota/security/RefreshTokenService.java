package com.tcc.gestaofrota.security;

import com.tcc.gestaofrota.model.RefreshToken;
import com.tcc.gestaofrota.model.Usuario;
import com.tcc.gestaofrota.repository.RefreshTokenRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;

@Service
public class RefreshTokenService {

    private final RefreshTokenRepository repository;
    private final SecureRandom random = new SecureRandom();
    private final long validadeDias;

    public RefreshTokenService(RefreshTokenRepository repository,
                               @Value("${app.jwt.refresh-validade-dias}") long validadeDias) {
        this.repository = repository;
        this.validadeDias = validadeDias;
    }

    /** Devolve o token em texto puro — o banco guarda apenas o hash. */
    @Transactional
    public String emitir(Usuario usuario) {
        byte[] bytes = new byte[64];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        RefreshToken registro = new RefreshToken();
        registro.setUsuario(usuario);
        registro.setTokenHash(hash(token));
        registro.setExpiraEm(LocalDateTime.now().plusDays(validadeDias));
        registro.setRevogado(false);
        registro.setCriadoEm(LocalDateTime.now());
        repository.save(registro);

        return token;
    }

    @Transactional
    public RefreshToken validar(String token) {
        RefreshToken registro = repository.findByTokenHash(hash(token))
                .orElseThrow(() -> new RuntimeException("Sessão inválida. Faça login novamente"));

        if (Boolean.TRUE.equals(registro.getRevogado())) {
            // Reuso de token revogado costuma indicar roubo: derruba todas as sessoes do usuario.
            repository.revogarTodosDoUsuario(registro.getUsuario().getId());
            throw new RuntimeException("Sessão inválida. Faça login novamente");
        }

        if (registro.getExpiraEm().isBefore(LocalDateTime.now())) {
            registro.setRevogado(true);
            repository.save(registro);
            throw new RuntimeException("Sessão expirada. Faça login novamente");
        }

        return registro;
    }

    /** Rotaciona: o token usado e queimado e um novo e emitido. */
    @Transactional
    public String rotacionar(RefreshToken atual) {
        atual.setRevogado(true);
        repository.save(atual);
        return emitir(atual.getUsuario());
    }

    @Transactional
    public void revogarTodosDoUsuario(Long usuarioId) {
        repository.revogarTodosDoUsuario(usuarioId);
    }

    @Transactional
    public void revogar(String token) {
        repository.findByTokenHash(hash(token)).ifPresent(r -> {
            r.setRevogado(true);
            repository.save(r);
        });
    }

    private String hash(String valor) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(valor.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 indisponível", e);
        }
    }
}
