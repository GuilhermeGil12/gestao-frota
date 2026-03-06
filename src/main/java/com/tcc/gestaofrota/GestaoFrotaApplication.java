package com.tcc.gestaofrota;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing // sem isso a data continua vazia, mesmo colocando a tag na model de funcionarios
public class GestaoFrotaApplication {

    public static void main(String[] args) {
        SpringApplication.run(GestaoFrotaApplication.class, args);
    }

}
