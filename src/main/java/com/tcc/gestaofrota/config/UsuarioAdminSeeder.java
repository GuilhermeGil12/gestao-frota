package com.tcc.gestaofrota.config;

import com.tcc.gestaofrota.model.Usuario;
import com.tcc.gestaofrota.repository.PermissaoRepository;
import com.tcc.gestaofrota.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.HashSet;

/**
 * Mantem um usuario administrador com todas as permissoes. Roda depois do
 * PermissaoSeeder para que o catalogo ja exista no banco.
 */
@Configuration
public class UsuarioAdminSeeder {

    private static final Logger log = LoggerFactory.getLogger(UsuarioAdminSeeder.class);

    @Bean
    @Order(2)
    ApplicationRunner garantirAdmin(UsuarioRepository usuarioRepository,
                                    PermissaoRepository permissaoRepository,
                                    @Value("${app.admin.email}") String email,
                                    @Value("${app.admin.senha}") String senha) {
        return args -> {
            String emailNormalizado = email.trim().toLowerCase();
            BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

            Usuario admin = usuarioRepository.findByEmail(emailNormalizado).orElseGet(() -> {
                Usuario novo = new Usuario();
                novo.setNomeUsuario("Administrador");
                novo.setEmail(emailNormalizado);
                novo.setSenha(encoder.encode(senha));
                log.info("Usuário administrador criado: {}", emailNormalizado);
                return novo;
            });

            // Reativa e devolve todas as permissoes a cada boot: o admin nunca fica trancado fora.
            admin.setAtivo(true);
            admin.setPermissoes(new HashSet<>(permissaoRepository.findAll()));
            usuarioRepository.save(admin);
        };
    }
}
