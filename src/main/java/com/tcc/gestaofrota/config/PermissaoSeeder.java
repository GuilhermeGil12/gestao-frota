package com.tcc.gestaofrota.config;

import com.tcc.gestaofrota.model.Permissao;
import com.tcc.gestaofrota.repository.PermissaoRepository;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDateTime;

/** Garante que toda chave do catalogo exista na tabela permissao. */
@Configuration
public class PermissaoSeeder {

    @Bean
    @org.springframework.core.annotation.Order(1)
    ApplicationRunner sincronizarPermissoes(PermissaoRepository repository) {
        return args -> CatalogoPermissoes.todasAsChaves().forEach(chave -> {
            if (repository.findByNomePermissao(chave).isEmpty()) {
                Permissao p = new Permissao();
                p.setNomePermissao(chave);
                p.setCriadoEm(LocalDateTime.now());
                repository.save(p);
            }
        });
    }
}
