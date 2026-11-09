package com.tcc.gestaofrota.controller;

import com.tcc.gestaofrota.service.PerfilService;
import com.tcc.gestaofrota.service.TelegramService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

// Perfil do usuário logado. Não precisa de permissão: cada um só mexe no próprio perfil.
@RestController
@RequestMapping("/api/perfil")
public class PerfilController {

    private final PerfilService perfilService;
    private final TelegramService telegramService;

    public PerfilController(PerfilService perfilService, TelegramService telegramService) {
        this.perfilService = perfilService;
        this.telegramService = telegramService;
    }

    // ===== Telegram =====

    // { disponivel, conectado, bot }
    @GetMapping("/telegram")
    public ResponseEntity<Map<String, Object>> statusTelegram() {
        return ResponseEntity.ok(telegramService.status(emailLogado()));
    }

    // Gera o link t.me/<bot>?start=<código> que conecta o Telegram a este usuário.
    @PostMapping("/telegram")
    public ResponseEntity<Map<String, Object>> conectarTelegram() {
        return ResponseEntity.ok(telegramService.gerarLinkDeConexao(emailLogado()));
    }

    @DeleteMapping("/telegram")
    public ResponseEntity<Void> desconectarTelegram() {
        telegramService.desconectar(emailLogado());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/telegram/teste")
    public ResponseEntity<Void> testarTelegram() {
        telegramService.enviarTeste(emailLogado());
        return ResponseEntity.noContent().build();
    }

    // O "nome" da autenticação é o e-mail (subject do token).
    private String emailLogado() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) throw new RuntimeException("Sessão expirada. Entre novamente.");
        return auth.getName();
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> buscar() {
        return ResponseEntity.ok(perfilService.buscar(emailLogado()));
    }

    // Fotos de outros usuários para os logs. Ex.: GET /api/perfil/fotos?ids=1,3,7
    @GetMapping("/fotos")
    public ResponseEntity<Map<String, String>> fotos(@RequestParam List<Long> ids) {
        if (ids.size() > 200) ids = ids.subList(0, 200);
        return ResponseEntity.ok(perfilService.fotos(ids));
    }

    // Body: { "nomeUsuario": "..." }
    @PutMapping
    public ResponseEntity<Map<String, Object>> atualizarNome(@RequestBody Map<String, String> dados) {
        return ResponseEntity.ok(perfilService.atualizarNome(emailLogado(), dados.get("nomeUsuario")));
    }

    // Body: { "senhaAtual": "...", "novaSenha": "..." }
    @PutMapping("/senha")
    public ResponseEntity<Void> trocarSenha(@RequestBody Map<String, String> dados) {
        perfilService.trocarSenha(emailLogado(), dados.get("senhaAtual"), dados.get("novaSenha"));
        return ResponseEntity.noContent().build();
    }

    // Body: { "foto": "data:image/jpeg;base64,..." }
    @PutMapping("/foto")
    public ResponseEntity<Map<String, Object>> atualizarFoto(@RequestBody Map<String, String> dados) {
        return ResponseEntity.ok(perfilService.atualizarFoto(emailLogado(), dados.get("foto")));
    }

    @DeleteMapping("/foto")
    public ResponseEntity<Map<String, Object>> removerFoto() {
        return ResponseEntity.ok(perfilService.atualizarFoto(emailLogado(), null));
    }

    // Body: ["COMANDO_EXECUTADO", ...] = tipos que o usuário NÃO quer receber.
    @PutMapping("/notificacoes")
    public ResponseEntity<Map<String, Object>> atualizarNotificacoes(@RequestBody List<String> desativadas) {
        return ResponseEntity.ok(perfilService.atualizarNotificacoes(emailLogado(), desativadas));
    }
}
