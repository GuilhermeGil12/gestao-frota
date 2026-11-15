package com.tcc.gestaofrota.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;

import java.util.ArrayList;
import java.util.List;

/**
 * Só no perfil "prod" (a VM): se faltar alguma variável de ambiente de segurança,
 * o sistema se RECUSA a subir, em vez de rodar com as senhas de desenvolvimento
 * que estão no application.properties (admin123, segredo JWT conhecido, broker público).
 *
 * Melhor o site fora do ar com um erro claro no log do que no ar com uma senha que
 * está no GitHub.
 */
@Configuration
@Profile("prod")
public class VerificacaoSegurancaProducao {

    private static final String SEGREDO_JWT_DEV = "troque-este-segredo-de-desenvolvimento-32chars";
    private static final String SENHA_ADMIN_DEV = "admin123";

    @Bean
    @Order(0)
    ApplicationRunner verificarSegredos(@Value("${app.jwt.segredo}") String segredoJwt,
                                        @Value("${app.admin.senha}") String senhaAdmin,
                                        @Value("${app.mqtt.broker}") String broker,
                                        @Value("${app.mqtt.usuario}") String usuarioMqtt) {
        return args -> {
            List<String> problemas = new ArrayList<>();

            if (SEGREDO_JWT_DEV.equals(segredoJwt) || segredoJwt.length() < 32) {
                problemas.add("JWT_SECRET não definido ou com menos de 32 caracteres");
            }
            if (SENHA_ADMIN_DEV.equals(senhaAdmin)) {
                problemas.add("ADMIN_SENHA não definido (está usando a senha padrão admin123)");
            }
            if (broker.contains("emqx.io")) {
                problemas.add("MQTT_BROKER não definido (está usando o broker PÚBLICO de teste)");
            }
            if (usuarioMqtt == null || usuarioMqtt.isBlank()) {
                problemas.add("MQTT_USER não definido (o backend entraria no broker sem usuário)");
            }

            if (!problemas.isEmpty()) {
                throw new IllegalStateException("Configuração de produção insegura. Defina as variáveis de ambiente:\n - "
                        + String.join("\n - ", problemas));
            }
        };
    }
}
