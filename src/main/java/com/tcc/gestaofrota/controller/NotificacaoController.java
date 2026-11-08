package com.tcc.gestaofrota.controller;

import com.tcc.gestaofrota.dto.NotificacaoDTO;
import com.tcc.gestaofrota.service.NotificacaoService;
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

    public NotificacaoController(NotificacaoService notificacaoService) {
        this.notificacaoService = notificacaoService;
    }

    @GetMapping
    public ResponseEntity<List<NotificacaoDTO>> listar() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        Set<String> permissoes = auth == null ? Set.of() : auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toSet());
        return ResponseEntity.ok(notificacaoService.listar(permissoes));
    }
}
