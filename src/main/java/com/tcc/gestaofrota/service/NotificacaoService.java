package com.tcc.gestaofrota.service;

import com.tcc.gestaofrota.dto.NotificacaoDTO;
import com.tcc.gestaofrota.model.Comando;
import com.tcc.gestaofrota.model.Funcionario;
import com.tcc.gestaofrota.repository.ComandoRepository;
import com.tcc.gestaofrota.repository.FuncionarioRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;

// As notificações são calculadas na hora a partir dos dados (não ficam gravadas).
@Service
public class NotificacaoService {

    private static final DateTimeFormatter DATA_BR = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final int DIAS_COMANDOS = 7;  // comandos executados nos últimos 7 dias

    private final FuncionarioRepository funcionarioRepository;
    private final ComandoRepository comandoRepository;
    private final ConfiguracaoService configuracaoService;

    public NotificacaoService(FuncionarioRepository funcionarioRepository,
                              ComandoRepository comandoRepository,
                              ConfiguracaoService configuracaoService) {
        this.funcionarioRepository = funcionarioRepository;
        this.comandoRepository = comandoRepository;
        this.configuracaoService = configuracaoService;
    }

    // Cada usuário só vê as notificações das telas que ele pode acessar,
    // e só dos tipos que ele não desligou (Configurações > Geral ou Perfil).
    public List<NotificacaoDTO> listar(Set<String> permissoes, Set<String> tiposDesativados) {
        List<NotificacaoDTO> lista = new ArrayList<>();
        if (permissoes.contains("funcionarios.visualizar")) lista.addAll(cnhVencendo());
        if (permissoes.contains("comandos.visualizar")) lista.addAll(comandosExecutados());
        return lista.stream().filter(n -> !tiposDesativados.contains(n.tipo())).toList();
    }

    // CNH vencida ou vencendo dentro do aviso configurado em Configurações > Geral.
    // As mais urgentes (vencidas há mais tempo) primeiro.
    private List<NotificacaoDTO> cnhVencendo() {
        int diasAviso = configuracaoService.buscar().getDiasAvisoCnh();
        LocalDate hoje = LocalDate.now();
        LocalDate limite = hoje.plusDays(diasAviso);

        return funcionarioRepository.findByAtivoTrue().stream()
                // Pendente aparece mesmo se a validade nova já foi digitada: ainda falta validar.
                .filter(f -> f.getValidadeCNH() != null
                        && (!f.getValidadeCNH().isAfter(limite) || Boolean.TRUE.equals(f.getCnhPendente())))
                .sorted(Comparator.comparing(Funcionario::getValidadeCNH))
                .map(f -> {
                    long dias = ChronoUnit.DAYS.between(hoje, f.getValidadeCNH());
                    boolean vencida = dias < 0;
                    boolean pendente = Boolean.TRUE.equals(f.getCnhPendente());
                    String quando;
                    if (vencida) quando = "venceu em " + f.getValidadeCNH().format(DATA_BR);
                    else if (dias == 0) quando = "vence hoje";
                    else if (dias == 1) quando = "vence amanhã";
                    else quando = "vence em " + dias + " dias (" + f.getValidadeCNH().format(DATA_BR) + ")";

                    String titulo = pendente ? "CNH pendente — cartão bloqueado" : vencida ? "CNH vencida" : "CNH vencendo";
                    String mensagem = "A CNH de " + f.getNome() + " " + quando + "."
                            + (pendente ? " O cartão fica bloqueado até a nova CNH ser validada em Funcionários." : "");
                    return new NotificacaoDTO(
                            "cnh-" + f.getId() + "-" + f.getValidadeCNH() + (pendente ? "-pendente" : ""),
                            vencida || pendente ? "CNH_VENCIDA" : "CNH_VENCENDO",
                            titulo,
                            mensagem,
                            f.getValidadeCNH().atStartOfDay(),
                            "/funcionarios"
                    );
                })
                .toList();
    }

    private List<NotificacaoDTO> comandosExecutados() {
        LocalDateTime desde = LocalDateTime.now().minusDays(DIAS_COMANDOS);
        return comandoRepository.findTop30ByStatusAndExecutadoEmAfterOrderByExecutadoEmDesc("EXECUTADO", desde)
                .stream()
                .map(this::notificacaoDoComando)
                .toList();
    }

    private NotificacaoDTO notificacaoDoComando(Comando c) {
        String veiculo = c.getControladora().getVeiculo() != null
                ? c.getControladora().getVeiculo().getPlaca()
                : "Controladora " + c.getControladora().getIdControladora();
        String acao = switch (c.getTipo()) {
            case "BLOQUEAR" -> "foi bloqueado";
            case "DESBLOQUEAR" -> "foi desbloqueado";
            case "APITAR" -> "apitou";
            default -> "executou " + c.getTipo();
        };
        return new NotificacaoDTO(
                "cmd-" + c.getIdComando(),
                "COMANDO_EXECUTADO",
                "Comando executado",
                "O veículo " + veiculo + " " + acao + ".",
                c.getExecutadoEm(),
                "/comandos"
        );
    }
}
