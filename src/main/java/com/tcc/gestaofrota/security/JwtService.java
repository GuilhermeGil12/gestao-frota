package com.tcc.gestaofrota.security;

import com.tcc.gestaofrota.model.Usuario;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;

@Service
public class JwtService {

    private final SecretKey chave;
    private final long validadeAccessMinutos;

    public JwtService(@Value("${app.jwt.segredo}") String segredo,
                      @Value("${app.jwt.access-validade-minutos}") long validadeAccessMinutos) {
        if (segredo == null || segredo.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException(
                    "app.jwt.segredo precisa ter ao menos 32 caracteres. Defina a variável JWT_SECRET.");
        }
        this.chave = Keys.hmacShaKeyFor(segredo.getBytes(StandardCharsets.UTF_8));
        this.validadeAccessMinutos = validadeAccessMinutos;
    }

    public String gerarAccessToken(Usuario usuario) {
        Date agora = new Date();
        Date expiracao = new Date(agora.getTime() + validadeAccessMinutos * 60_000);

        List<String> permissoes = usuario.getPermissoes().stream()
                .map(p -> p.getNomePermissao())
                .toList();

        return Jwts.builder()
                .subject(usuario.getEmail())
                .claim("id", usuario.getId())
                .claim("nome", usuario.getNomeUsuario())
                .claim("permissoes", permissoes)
                .issuedAt(agora)
                .expiration(expiracao)
                .signWith(chave)
                .compact();
    }

    public Claims lerClaims(String token) {
        return Jwts.parser()
                .verifyWith(chave)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean tokenValido(String token) {
        try {
            lerClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public String extrairEmail(String token) {
        return lerClaims(token).getSubject();
    }
}
