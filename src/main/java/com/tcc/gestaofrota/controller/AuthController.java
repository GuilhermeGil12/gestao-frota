package com.tcc.gestaofrota.controller;

import com.tcc.gestaofrota.model.Permissao;
import com.tcc.gestaofrota.model.RefreshToken;
import com.tcc.gestaofrota.model.Usuario;
import com.tcc.gestaofrota.security.JwtService;
import com.tcc.gestaofrota.security.RefreshTokenService;
import com.tcc.gestaofrota.service.UsuarioService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UsuarioService usuarioService;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;

    public AuthController(UsuarioService usuarioService,
                          JwtService jwtService,
                          RefreshTokenService refreshTokenService) {
        this.usuarioService = usuarioService;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, Object> credenciais) {
        Object email = credenciais.get("email");
        Object senha = credenciais.get("senha");

        if (email == null || senha == null) {
            throw new RuntimeException("Informe e-mail e senha");
        }

        Usuario usuario = usuarioService.autenticar(email.toString(), senha.toString());

        String accessToken = jwtService.gerarAccessToken(usuario);
        String refreshToken = refreshTokenService.emitir(usuario);

        return ResponseEntity.ok(montarResposta(usuario, accessToken, refreshToken));
    }

    @PostMapping("/refresh")
    public ResponseEntity<Map<String, Object>> refresh(@RequestBody Map<String, Object> corpo) {
        Object tokenRecebido = corpo.get("refreshToken");

        if (tokenRecebido == null) {
            throw new RuntimeException("Sessão inválida. Faça login novamente");
        }

        RefreshToken registro = refreshTokenService.validar(tokenRecebido.toString());
        Usuario usuario = registro.getUsuario();

        if (!Boolean.TRUE.equals(usuario.getAtivo())) {
            refreshTokenService.revogarTodosDoUsuario(usuario.getId());
            throw new RuntimeException("Usuário inativo. Procure o administrador");
        }

        String novoRefresh = refreshTokenService.rotacionar(registro);
        String accessToken = jwtService.gerarAccessToken(usuario);

        return ResponseEntity.ok(montarResposta(usuario, accessToken, novoRefresh));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestBody Map<String, Object> corpo) {
        Object tokenRecebido = corpo.get("refreshToken");

        if (tokenRecebido != null) {
            refreshTokenService.revogar(tokenRecebido.toString());
        }

        return ResponseEntity.noContent().build();
    }

    private Map<String, Object> montarResposta(Usuario usuario, String accessToken, String refreshToken) {
        Map<String, Object> usuarioMap = new HashMap<>();
        usuarioMap.put("id", usuario.getId());
        usuarioMap.put("nomeUsuario", usuario.getNomeUsuario());
        usuarioMap.put("email", usuario.getEmail());
        usuarioMap.put("permissoes", usuario.getPermissoes().stream().map(Permissao::getNomePermissao).toList());

        Map<String, Object> resposta = new HashMap<>();
        resposta.put("usuario", usuarioMap);
        resposta.put("accessToken", accessToken);
        resposta.put("refreshToken", refreshToken);
        return resposta;
    }
}
