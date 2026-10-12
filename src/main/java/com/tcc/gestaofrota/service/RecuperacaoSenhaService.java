package com.tcc.gestaofrota.service;

import com.tcc.gestaofrota.model.CodigoRecuperacao;
import com.tcc.gestaofrota.model.Usuario;
import com.tcc.gestaofrota.repository.CodigoRecuperacaoRepository;
import com.tcc.gestaofrota.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Comparator;

@Service
public class RecuperacaoSenhaService {

    private static final int TAMANHO_MINIMO_SENHA = 8;

    private final UsuarioRepository usuarioRepository;
    private final CodigoRecuperacaoRepository codigoRepository;
    private final EmailService emailService;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    private final SecureRandom random = new SecureRandom();

    private final int validadeMinutos;
    private final int maxTentativas;
    private final int intervaloReenvioSegundos;

    public RecuperacaoSenhaService(UsuarioRepository usuarioRepository,
                                   CodigoRecuperacaoRepository codigoRepository,
                                   EmailService emailService,
                                   @Value("${app.recuperacao.validade-minutos}") int validadeMinutos,
                                   @Value("${app.recuperacao.max-tentativas}") int maxTentativas,
                                   @Value("${app.recuperacao.intervalo-reenvio-segundos}") int intervaloReenvioSegundos) {
        this.usuarioRepository = usuarioRepository;
        this.codigoRepository = codigoRepository;
        this.emailService = emailService;
        this.validadeMinutos = validadeMinutos;
        this.maxTentativas = maxTentativas;
        this.intervaloReenvioSegundos = intervaloReenvioSegundos;
    }

    @Transactional
    public void solicitarCodigo(Long usuarioId) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        if (usuario.getEmail() == null || usuario.getEmail().isBlank()) {
            throw new RuntimeException("Este usuário não possui e-mail cadastrado");
        }

        // Trava de reenvio: impede usar o disparo de e-mail como ferramenta de spam.
        codigoRepository.findTopByUsuarioIdOrderByCriadoEmDesc(usuarioId).ifPresent(ultimo -> {
            long segundosDesdeUltimo = Duration.between(ultimo.getCriadoEm(), LocalDateTime.now()).getSeconds();
            if (segundosDesdeUltimo < intervaloReenvioSegundos) {
                long faltam = intervaloReenvioSegundos - segundosDesdeUltimo;
                throw new RuntimeException("Aguarde " + faltam + " segundos para pedir um novo código");
            }
        });

        // Um pedido novo cancela os anteriores: só o último código vale.
        codigoRepository.invalidarPendentes(usuarioId);

        String codigo = gerarCodigo();

        CodigoRecuperacao registro = new CodigoRecuperacao();
        registro.setUsuario(usuario);
        registro.setCodigoHash(encoder.encode(codigo));
        registro.setExpiraEm(LocalDateTime.now().plusMinutes(validadeMinutos));
        registro.setUsado(false);
        registro.setTentativas(0);
        registro.setCriadoEm(LocalDateTime.now());
        codigoRepository.save(registro);

        emailService.enviarCodigoRecuperacao(
                usuario.getEmail(),
                usuario.getNomeUsuario(),
                codigo,
                validadeMinutos
        );
    }

    /** Confere o código sem consumi-lo, para liberar a etapa da nova senha. */
    @Transactional
    public void validarCodigo(Long usuarioId, String codigoInformado) {
        conferirCodigo(usuarioId, codigoInformado);
    }

    @Transactional
    public void redefinirSenha(Long usuarioId, String codigoInformado, String novaSenha) {
        if (novaSenha == null || novaSenha.length() < TAMANHO_MINIMO_SENHA) {
            throw new RuntimeException("A senha deve ter pelo menos " + TAMANHO_MINIMO_SENHA + " caracteres");
        }

        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        CodigoRecuperacao registro = conferirCodigo(usuarioId, codigoInformado);

        registro.setUsado(true);
        codigoRepository.save(registro);

        usuario.setSenha(encoder.encode(novaSenha));
        usuarioRepository.save(usuario);
    }

    private CodigoRecuperacao conferirCodigo(Long usuarioId, String codigoInformado) {
        CodigoRecuperacao registro = codigoRepository.findByUsuarioIdAndUsadoFalse(usuarioId)
                .stream()
                .max(Comparator.comparing(CodigoRecuperacao::getCriadoEm))
                .orElseThrow(() -> new RuntimeException("Código inválido ou expirado"));

        if (registro.getExpiraEm().isBefore(LocalDateTime.now())) {
            registro.setUsado(true);
            codigoRepository.save(registro);
            throw new RuntimeException("Código inválido ou expirado");
        }

        if (registro.getTentativas() >= maxTentativas) {
            registro.setUsado(true);
            codigoRepository.save(registro);
            throw new RuntimeException("Número de tentativas excedido. Solicite um novo código");
        }

        if (!encoder.matches(codigoInformado, registro.getCodigoHash())) {
            registro.setTentativas(registro.getTentativas() + 1);
            codigoRepository.save(registro);
            throw new RuntimeException("Código inválido ou expirado");
        }

        return registro;
    }

    private String gerarCodigo() {
        return String.format("%06d", random.nextInt(1_000_000));
    }
}
