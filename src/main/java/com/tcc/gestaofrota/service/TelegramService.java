package com.tcc.gestaofrota.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.tcc.gestaofrota.model.Permissao;
import com.tcc.gestaofrota.model.Usuario;
import com.tcc.gestaofrota.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Avisos pelo Telegram.
 *
 * Como o usuário conecta:
 *  1. No Perfil ele pede um código (gerarLinkDeConexao) e abre t.me/<bot>?start=<código>.
 *  2. O Telegram manda "/start <código>" pro bot. A cada 3 s este Service pergunta ao
 *     Telegram se chegou mensagem nova (getUpdates) — assim não precisa de HTTPS público.
 *  3. Achou o código: guarda o chat_id no usuário. Daí em diante ele recebe os avisos.
 *
 * Sem app.telegram.token (variável TELEGRAM_TOKEN), tudo aqui fica desligado.
 */
@Service
public class TelegramService {

    private static final long CODIGO_VALIDO_SEGUNDOS = 600;   // 10 min pra tocar em "Iniciar"

    private final UsuarioRepository usuarioRepository;
    private final PerfilService perfilService;
    private final String token;
    private final RestClient http;

    private final Map<String, Pedido> codigos = new ConcurrentHashMap<>();
    private final SecureRandom aleatorio = new SecureRandom();
    private long proximoUpdate = 0;           // offset do getUpdates: não reler mensagens
    private String nomeDoBot;                 // descoberto com getMe

    private record Pedido(Long usuarioId, Instant expira) {}

    public TelegramService(UsuarioRepository usuarioRepository,
                           PerfilService perfilService,
                           @Value("${app.telegram.token:}") String token) {
        this.usuarioRepository = usuarioRepository;
        this.perfilService = perfilService;
        this.token = token == null ? "" : token.trim();

        SimpleClientHttpRequestFactory fabrica = new SimpleClientHttpRequestFactory();
        fabrica.setConnectTimeout(5000);
        fabrica.setReadTimeout(10000);
        this.http = RestClient.builder()
                .baseUrl("https://api.telegram.org/bot" + this.token)
                .requestFactory(fabrica)
                .build();
    }

    public boolean ativo() {
        return !token.isEmpty();
    }

    public String nomeDoBot() {
        if (!ativo()) return null;
        if (nomeDoBot == null) {
            try {
                JsonNode r = http.get().uri("/getMe").retrieve().body(JsonNode.class);
                nomeDoBot = r.path("result").path("username").asText(null);
            } catch (Exception e) {
                System.out.println("[Telegram] getMe falhou (token certo?): " + e.getMessage());
            }
        }
        return nomeDoBot;
    }

    // ===================== ENVIAR =====================

    /** Manda uma mensagem (HTML simples: <b>, <i>, <a href>). Devolve false se falhar. */
    public boolean enviar(String chatId, String html) {
        if (!ativo() || chatId == null) return false;
        try {
            http.post().uri("/sendMessage")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("chat_id", chatId, "text", html, "parse_mode", "HTML",
                            "disable_web_page_preview", true))
                    .retrieve()
                    .toBodilessEntity();
            return true;
        } catch (Exception e) {
            System.out.println("[Telegram] falha ao enviar para " + chatId + ": " + e.getMessage());
            return false;
        }
    }

    /**
     * Aviso para todos que: conectaram o Telegram, têm a permissão da tela
     * e não desligaram esse tipo em "Minhas notificações".
     * Roda em segundo plano: a ação que gerou o aviso não espera o Telegram responder.
     */
    public void avisar(String tipo, String permissaoNecessaria, String html) {
        if (!ativo()) return;
        List<String> destinos = new ArrayList<>();
        for (Usuario u : usuarioRepository.findByAtivoTrueAndTelegramChatIdIsNotNull()) {
            boolean temPermissao = u.getPermissoes() != null && u.getPermissoes().stream()
                    .map(Permissao::getNomePermissao).anyMatch(permissaoNecessaria::equals);
            if (temPermissao && !perfilService.notificacoesDesativadas(u).contains(tipo)) {
                destinos.add(u.getTelegramChatId());
            }
        }
        if (destinos.isEmpty()) return;
        CompletableFuture.runAsync(() -> destinos.forEach(chat -> enviar(chat, html)));
    }

    /** Protege nomes e placas que vão dentro do HTML da mensagem. */
    public static String esc(String texto) {
        if (texto == null) return "";
        return texto.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    // ===================== CONECTAR / DESCONECTAR =====================

    /** Link que o usuário abre no celular: t.me/<bot>?start=<código>. */
    public Map<String, Object> gerarLinkDeConexao(String email) {
        if (!ativo()) throw new RuntimeException("O Telegram não está configurado no servidor (TELEGRAM_TOKEN).");
        String bot = nomeDoBot();
        if (bot == null) throw new RuntimeException("Não foi possível falar com o bot do Telegram. Confira o token.");
        Usuario u = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado."));

        codigos.values().removeIf(p -> p.expira().isBefore(Instant.now()));
        String codigo = Long.toString(Math.abs(aleatorio.nextLong()), 36);
        codigos.put(codigo, new Pedido(u.getId(), Instant.now().plusSeconds(CODIGO_VALIDO_SEGUNDOS)));
        return Map.of("link", "https://t.me/" + bot + "?start=" + codigo, "bot", bot);
    }

    public Map<String, Object> status(String email) {
        Usuario u = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado."));
        Map<String, Object> s = new HashMap<>();
        s.put("disponivel", ativo());
        s.put("conectado", u.getTelegramChatId() != null);
        s.put("bot", ativo() ? nomeDoBot() : null);
        return s;
    }

    public void desconectar(String email) {
        Usuario u = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado."));
        String chat = u.getTelegramChatId();
        u.setTelegramChatId(null);
        usuarioRepository.save(u);
        if (chat != null) enviar(chat, "🔌 Telegram desconectado do Frota System. Você não vai mais receber avisos aqui.");
    }

    public void enviarTeste(String email) {
        Usuario u = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado."));
        if (u.getTelegramChatId() == null) throw new RuntimeException("Conecte o Telegram primeiro.");
        boolean ok = enviar(u.getTelegramChatId(), "✅ <b>Teste do Frota System</b>\nSe você está lendo isto, os avisos vão chegar aqui.");
        if (!ok) throw new RuntimeException("O Telegram recusou a mensagem. Tente desconectar e conectar de novo.");
    }

    // ===================== RECEBER (getUpdates) =====================

    @Scheduled(fixedDelay = 3000, initialDelay = 5000)
    public void buscarMensagens() {
        if (!ativo()) return;
        try {
            JsonNode r = http.get()
                    .uri(u -> u.path("/getUpdates").queryParam("offset", proximoUpdate).queryParam("timeout", 0).build())
                    .retrieve()
                    .body(JsonNode.class);
            for (JsonNode update : r.path("result")) {
                proximoUpdate = update.path("update_id").asLong() + 1;
                JsonNode msg = update.path("message");
                if (msg.isMissingNode()) continue;
                tratarMensagem(msg.path("chat").path("id").asText(), msg.path("text").asText(""));
            }
        } catch (Exception e) {
            // Sem internet ou token errado: tenta de novo daqui a 3 s, sem encher o log.
        }
    }

    private void tratarMensagem(String chatId, String texto) {
        if (texto.startsWith("/start")) {
            String codigo = texto.length() > 6 ? texto.substring(6).trim() : "";
            Pedido pedido = codigos.remove(codigo);
            if (pedido == null || pedido.expira().isBefore(Instant.now())) {
                enviar(chatId, "👋 Este é o bot do <b>Frota System</b>.\n"
                        + "Para receber avisos, entre no site, vá em <b>Meu perfil → Telegram</b> e toque em <b>Conectar</b>.");
                return;
            }
            usuarioRepository.findById(pedido.usuarioId()).ifPresent(u -> {
                // Um chat só pode estar ligado a um usuário.
                usuarioRepository.findByTelegramChatId(chatId).ifPresent(outro -> {
                    if (!outro.getId().equals(u.getId())) {
                        outro.setTelegramChatId(null);
                        usuarioRepository.save(outro);
                    }
                });
                u.setTelegramChatId(chatId);
                usuarioRepository.save(u);
                enviar(chatId, "✅ <b>Telegram conectado!</b>\nOlá, " + esc(u.getNomeUsuario())
                        + ". Você vai receber aqui os avisos do Frota System.\n"
                        + "Escolha quais em <b>Meu perfil → Minhas notificações</b>. Para desligar, envie /sair.");
            });
        } else if (texto.startsWith("/sair")) {
            usuarioRepository.findByTelegramChatId(chatId).ifPresent(u -> {
                u.setTelegramChatId(null);
                usuarioRepository.save(u);
            });
            enviar(chatId, "🔌 Pronto, você não vai mais receber avisos aqui.");
        }
    }
}
