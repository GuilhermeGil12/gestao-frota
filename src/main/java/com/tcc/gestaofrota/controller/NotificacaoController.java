package com.tcc.gestaofrota.controller;

import com.tcc.gestaofrota.dto.NotificacaoDTO;
import com.tcc.gestaofrota.service.NotificacaoService;
import com.tcc.gestaofrota.service.PerfilService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/notificacoes")
public class NotificacaoController {

    private final NotificacaoService notificacaoService;
    private final PerfilService perfilService;

    public NotificacaoController(NotificacaoService notificacaoService, PerfilService perfilService) {
        this.notificacaoService = notificacaoService;
        this.perfilService = perfilService;
    }

    @GetMapping
    public ResponseEntity<List<NotificacaoDTO>> listar() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return ResponseEntity.ok(List.of());
        Set<String> permissoes = auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toSet());
        Set<String> desativadas = perfilService.notificacoesDesativadas(auth.getName());
        return ResponseEntity.ok(notificacaoService.listar(permissoes, desativadas));
    }
}
