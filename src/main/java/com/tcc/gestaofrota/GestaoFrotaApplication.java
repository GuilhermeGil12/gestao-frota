package com.tcc.gestaofrota;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

// @EnableScheduling liga as tarefas agendadas (@Scheduled), como a verificação diária de CNH vencida.
@SpringBootApplication
@EnableScheduling
public class GestaoFrotaApplication {

    public static void main(String[] args) {
        // Deixe apenas a inicialização padrão do Spring aqui:
        SpringApplication.run(GestaoFrotaApplication.class, args);
    }
}