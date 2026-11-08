package com.tcc.gestaofrota.dto;

import java.time.LocalDateTime;

/**
 * Uma notificação do sino.
 * id é estável (ex.: "cmd-15", "cnh-3-2026-12-01"): o frontend usa pra lembrar o que já foi lido.
 * tipo: CNH_VENCIDA, CNH_VENCENDO ou COMANDO_EXECUTADO. link: tela que abre ao clicar.
 */
public record NotificacaoDTO(
        String id,
        String tipo,
        String titulo,
        String mensagem,
        LocalDateTime data,
        String link
) {}
