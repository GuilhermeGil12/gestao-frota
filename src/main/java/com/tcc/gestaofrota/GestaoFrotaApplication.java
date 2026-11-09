package com.tcc.gestaofrota;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.TimeZone;

// @EnableScheduling liga as tarefas agendadas (@Scheduled), como a verificação diária de CNH vencida.
@SpringBootApplication
@EnableScheduling
public class GestaoFrotaApplication {

    public static void main(String[] args) {
        // A VM roda em UTC, mas os pontos chegam do ESP no horário de Brasília.
        // Sem isto, "agora" no servidor fica 3 h à frente e as comparações de tempo erram
        // (ex.: o aviso de excesso no Telegram achava que todo ponto era antigo).
        TimeZone.setDefault(TimeZone.getTimeZone("America/Sao_Paulo"));
        SpringApplication.run(GestaoFrotaApplication.class, args);
    }
}