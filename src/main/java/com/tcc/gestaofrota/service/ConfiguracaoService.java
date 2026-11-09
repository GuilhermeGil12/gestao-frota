package com.tcc.gestaofrota.service;

import com.tcc.gestaofrota.model.Configuracao;
import com.tcc.gestaofrota.repository.ConfiguracaoRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class ConfiguracaoService {

    private final AtividadeService atividadeService;

    private final ConfiguracaoRepository configuracaoRepository;

    public ConfiguracaoService(ConfiguracaoRepository configuracaoRepository,
            AtividadeService atividadeService) {
        this.configuracaoRepository = configuracaoRepository;
        this.atividadeService = atividadeService;
    }

    // Na primeira vez a linha ainda não existe: devolve os valores padrão (sem gravar).
    public Configuracao buscar() {
        return configuracaoRepository.findById(Configuracao.ID_UNICO).orElseGet(Configuracao::new);
    }

    public Configuracao salvar(Configuracao nova) {
        if (nova.getNomeEmpresa() == null || nova.getNomeEmpresa().isBlank()) {
            throw new RuntimeException("Informe o nome da empresa.");
        }
        if (nova.getDiasAvisoCnh() == null || nova.getDiasAvisoCnh() < 0 || nova.getDiasAvisoCnh() > 365) {
            throw new RuntimeException("O aviso de CNH deve ser entre 0 e 365 dias.");
        }
        if (nova.getKmRevisao() == null || nova.getKmRevisao() <= 0) {
            throw new RuntimeException("O intervalo de revisão deve ser maior que zero.");
        }

        Configuracao config = buscar();
        config.setNomeEmpresa(nova.getNomeEmpresa().trim());
        config.setDiasAvisoCnh(nova.getDiasAvisoCnh());
        config.setKmRevisao(nova.getKmRevisao());
        config.setBloquearCnhVencida(Boolean.TRUE.equals(nova.getBloquearCnhVencida()));
        config.setBloquearMadrugada(Boolean.TRUE.equals(nova.getBloquearMadrugada()));
        config.setAtualizadoEm(LocalDateTime.now());
        Configuracao salva = configuracaoRepository.save(config);
        atividadeService.registrar("CONFIGURACAO", "Alterou as configurações gerais");
        return salva;
    }
}
