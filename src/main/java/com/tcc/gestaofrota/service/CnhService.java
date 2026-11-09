package com.tcc.gestaofrota.service;

import com.tcc.gestaofrota.model.CartaoRfid;
import com.tcc.gestaofrota.model.Funcionario;
import com.tcc.gestaofrota.repository.CartaoRfidRepository;
import com.tcc.gestaofrota.repository.FuncionarioRepository;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * CNH vencida (com "Bloquear CNH vencida" ligado em Configurações > Geral):
 *  1. a CNH do funcionário fica PENDENTE;
 *  2. os cartões ativos dele são bloqueados (e a lista nova vai pro ESP pelo MQTT);
 *  3. só voltam quando alguém VALIDA a CNH com uma validade nova.
 */
@Service
public class CnhService {

    private final TelegramService telegramService;

    private final AtividadeService atividadeService;

    private final FuncionarioRepository funcionarioRepository;
    private final CartaoRfidRepository cartaoRfidRepository;
    private final CartaoRfidService cartaoRfidService;
    private final ConfiguracaoService configuracaoService;

    public CnhService(FuncionarioRepository funcionarioRepository,
                      CartaoRfidRepository cartaoRfidRepository,
                      CartaoRfidService cartaoRfidService,
                      ConfiguracaoService configuracaoService,
            AtividadeService atividadeService,
            TelegramService telegramService) {
        this.funcionarioRepository = funcionarioRepository;
        this.cartaoRfidRepository = cartaoRfidRepository;
        this.cartaoRfidService = cartaoRfidService;
        this.configuracaoService = configuracaoService;
        this.atividadeService = atividadeService;
        this.telegramService = telegramService;
    }

    private boolean regraLigada() {
        return Boolean.TRUE.equals(configuracaoService.buscar().getBloquearCnhVencida());
    }

    private boolean vencida(Funcionario f) {
        return f.getValidadeCNH() != null && f.getValidadeCNH().isBefore(LocalDate.now());
    }

    // Todo dia logo depois da meia-noite, e uma vez quando o sistema sobe.
    @Scheduled(cron = "0 5 0 * * *")
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void verificarTodas() {
        if (!regraLigada()) return;
        int bloqueados = 0;
        for (Funcionario f : funcionarioRepository.findByAtivoTrue()) {
            if (vencida(f) && !Boolean.TRUE.equals(f.getCnhPendente())) {
                marcarPendenteSemPublicar(f);
                bloqueados++;
            }
        }
        if (bloqueados > 0) {
            cartaoRfidService.publicarCartoesParaTodas();
            System.out.println("[CNH] " + bloqueados + " funcionário(s) com CNH vencida: cartões bloqueados.");
        }
    }

    // Depois de salvar um funcionário (a validade pode ter sido editada para uma data passada).
    @Transactional
    public void verificar(Funcionario f) {
        if (!regraLigada() || !Boolean.TRUE.equals(f.getAtivo())) return;
        if (vencida(f) && !Boolean.TRUE.equals(f.getCnhPendente())) {
            marcarPendenteSemPublicar(f);
            cartaoRfidService.publicarCartoesParaTodas();
        }
    }

    private void marcarPendenteSemPublicar(Funcionario f) {
        f.setCnhPendente(true);
        funcionarioRepository.save(f);
        atividadeService.registrar("CNH", "CNH de " + f.getNome() + " vencida: CNH pendente e cartões bloqueados");
        telegramService.avisar("CNH_VENCIDA", "funcionarios.visualizar",
                "⚠️ <b>CNH vencida</b>\nA CNH de <b>" + TelegramService.esc(f.getNome()) + "</b> venceu em "
                + f.getValidadeCNH().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                + ".\nOs cartões foram bloqueados até a nova CNH ser validada no sistema.");
        for (CartaoRfid cartao : cartaoRfidRepository.findByFuncionarioIdAndAtivoTrue(f.getId())) {
            cartao.setAtivo(false);
            cartao.setBloqueadoPorCnh(true);
            cartaoRfidRepository.save(cartao);
        }
    }

    // Validar = a nova CNH foi conferida. Libera os cartões que a CNH vencida tinha bloqueado.
    @Transactional
    public Funcionario validar(Long idFuncionario) {
        Funcionario f = funcionarioRepository.findById(idFuncionario)
                .orElseThrow(() -> new RuntimeException("Funcionário não encontrado!"));
        if (f.getValidadeCNH() == null || vencida(f)) {
            throw new RuntimeException("Atualize a validade da CNH para uma data futura antes de validar.");
        }

        f.setCnhPendente(false);
        funcionarioRepository.save(f);
        atividadeService.registrar("CNH", "Validou a CNH de " + f.getNome() + " e liberou os cartões");

        List<CartaoRfid> bloqueados = cartaoRfidRepository.findByFuncionarioIdAndBloqueadoPorCnhTrue(f.getId());
        for (CartaoRfid cartao : bloqueados) {
            cartao.setAtivo(true);
            cartao.setBloqueadoPorCnh(false);
            cartaoRfidRepository.save(cartao);
        }
        if (!bloqueados.isEmpty()) cartaoRfidService.publicarCartoesParaTodas();
        return f;
    }
}
