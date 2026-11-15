package com.tcc.gestaofrota.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Limite de tentativas de login por e-mail, contra quem tenta adivinhar senhas.
 *
 * Depois de N senhas erradas seguidas, o e-mail fica bloqueado por alguns minutos,
 * mesmo que a senha certa seja digitada. Um login certo zera a contagem.
 *
 * Fica em memória: reiniciar o servidor zera tudo (aceitável, e sem tabela nova).
 * É por e-mail, não por IP, porque atrás do Nginx todas as requisições
 * chegariam com o mesmo IP (127.0.0.1) e uma pessoa bloquearia todo mundo.
 */
@Service
public class LimiteLoginService {

    private final int maxTentativas;
    private final Duration bloqueio;

    private final Map<String, Registro> registros = new ConcurrentHashMap<>();

    private static class Registro {
        int falhas;
        Instant bloqueadoAte;
    }

    public LimiteLoginService(@Value("${app.login.max-tentativas:5}") int maxTentativas,
                              @Value("${app.login.bloqueio-minutos:15}") int bloqueioMinutos) {
        this.maxTentativas = maxTentativas;
        this.bloqueio = Duration.ofMinutes(bloqueioMinutos);
    }

    /** Lança erro se o e-mail estiver bloqueado agora. Chamar ANTES de conferir a senha. */
    public void verificar(String email) {
        Registro r = registros.get(chave(email));
        if (r == null || r.bloqueadoAte == null) return;

        Instant agora = Instant.now();
        if (agora.isBefore(r.bloqueadoAte)) {
            long minutos = Math.max(1, Duration.between(agora, r.bloqueadoAte).toMinutes() + 1);
            throw new RuntimeException("Muitas tentativas erradas. Tente de novo em " + minutos + " min.");
        }
        // O bloqueio acabou: começa a contar de novo.
        registros.remove(chave(email));
    }

    public void registrarFalha(String email) {
        Registro r = registros.computeIfAbsent(chave(email), k -> new Registro());
        synchronized (r) {
            r.falhas++;
            if (r.falhas >= maxTentativas) {
                r.bloqueadoAte = Instant.now().plus(bloqueio);
            }
        }
    }

    public void registrarSucesso(String email) {
        registros.remove(chave(email));
    }

    private static String chave(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }
}
