package com.tcc.gestaofrota.service;

import com.tcc.gestaofrota.model.Localizacao;
import com.tcc.gestaofrota.model.Veiculo;
import com.tcc.gestaofrota.repository.LocalizacaoRepository;
import com.tcc.gestaofrota.repository.VeiculoRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Revisão por quilometragem (Configurações > Geral > "Revisão a cada").
 *
 *  1. O gestor informa o km do odômetro no cadastro do veículo.
 *  2. A cada 15 minutos o sistema soma ao km atual a distância dos pontos novos do GPS.
 *  3. Quando faltam 500 km ou menos para a próxima revisão, aparece no sino e chega um
 *     aviso no Telegram (uma vez por revisão).
 *  4. Ao fazer a revisão, o gestor clica em "Registrar revisão" na lista de veículos.
 *
 * Próxima revisão = km da última revisão + intervalo. Sem revisão registrada, vale o
 * próximo múltiplo do intervalo (com 10.000: 10.000, 20.000, 30.000...).
 */
@Service
public class RevisaoService {

    /** A partir de quantos km antes da revisão o aviso aparece. */
    public static final double KM_AVISO = 500;
    // Dois pontos seguidos que exigiriam mais que isso são erro do GPS, não viagem.
    private static final double VELOCIDADE_IMPOSSIVEL_KMH = 250;

    private final VeiculoRepository veiculoRepository;
    private final LocalizacaoRepository localizacaoRepository;
    private final ConfiguracaoService configuracaoService;
    private final TelegramService telegramService;
    private final AtividadeService atividadeService;

    public RevisaoService(VeiculoRepository veiculoRepository,
                          LocalizacaoRepository localizacaoRepository,
                          ConfiguracaoService configuracaoService,
                          TelegramService telegramService,
                          AtividadeService atividadeService) {
        this.veiculoRepository = veiculoRepository;
        this.localizacaoRepository = localizacaoRepository;
        this.configuracaoService = configuracaoService;
        this.telegramService = telegramService;
        this.atividadeService = atividadeService;
    }

    private double intervalo() {
        Integer km = configuracaoService.buscar().getKmRevisao();
        return km != null && km > 0 ? km : 10000;
    }

    /** Km em que a próxima revisão vence, ou null se o veículo ainda não tem km informado. */
    public Double proximaRevisao(Veiculo v) {
        if (v.getKmAtual() == null) return null;
        double intervalo = intervalo();
        if (v.getKmUltimaRevisao() != null) return v.getKmUltimaRevisao() + intervalo;
        return (Math.floor(v.getKmAtual() / intervalo) + 1) * intervalo;
    }

    /** Revisão vencida ou faltando KM_AVISO km ou menos. */
    public boolean precisaAvisar(Veiculo v) {
        Double proxima = proximaRevisao(v);
        return proxima != null && v.getKmAtual() >= proxima - KM_AVISO;
    }

    /** Preenche o campo calculado que a tela de veículos mostra. */
    public Veiculo comProximaRevisao(Veiculo v) {
        v.setProximaRevisaoKm(proximaRevisao(v));
        return v;
    }

    @Transactional
    public Veiculo registrarRevisao(Long idVeiculo) {
        Veiculo v = veiculoRepository.findById(idVeiculo)
                .orElseThrow(() -> new RuntimeException("Veículo não encontrado."));
        if (v.getKmAtual() == null) {
            throw new RuntimeException("Informe o km atual do veículo antes de registrar a revisão.");
        }
        v.setKmUltimaRevisao(v.getKmAtual());
        v.setAvisoRevisaoKm(null);
        Veiculo salvo = veiculoRepository.save(v);
        atividadeService.registrar("VEICULO", "Registrou a revisão do veículo " + v.getPlaca()
                + " com " + formatarKm(v.getKmAtual()));
        return comProximaRevisao(salvo);
    }

    // A cada 15 minutos: soma o km rodado e avisa as revisões que chegaram.
    @Scheduled(fixedDelay = 15 * 60 * 1000, initialDelay = 60 * 1000)
    @Transactional
    public void atualizarQuilometragem() {
        for (Veiculo v : veiculoRepository.findAll()) {
            if (v.getKmAtual() == null) continue; // sem km informado não há de onde contar
            if (v.getKmContadoAte() == null) {
                // Começa a contar a partir de agora.
                v.setKmContadoAte(LocalDateTime.now());
                veiculoRepository.save(v);
                continue;
            }
            somarPontosNovos(v);
            avisarSeChegou(v);
            veiculoRepository.save(v);
        }
    }

    private void somarPontosNovos(Veiculo v) {
        List<Localizacao> novos = localizacaoRepository
                .findByVeiculoIdAndDataHoraAfterOrderByDataHoraAsc(v.getId(), v.getKmContadoAte());
        if (novos.isEmpty()) return;

        // Liga o primeiro ponto novo ao último já contado, para não perder o trecho entre os dois.
        Optional<Localizacao> anterior = localizacaoRepository
                .findTopByVeiculoIdAndDataHoraLessThanEqualOrderByDataHoraDesc(v.getId(), v.getKmContadoAte());
        Localizacao ultimo = anterior.orElse(null);

        double km = 0;
        for (Localizacao atual : novos) {
            if (ultimo != null) km += trecho(ultimo, atual);
            if (atual.getLatitude() != null && atual.getLongitude() != null) ultimo = atual;
        }
        v.setKmAtual(Math.round((v.getKmAtual() + km) * 10.0) / 10.0);
        v.setKmContadoAte(novos.get(novos.size() - 1).getDataHora());
    }

    private double trecho(Localizacao a, Localizacao b) {
        if (a.getLatitude() == null || a.getLongitude() == null
                || b.getLatitude() == null || b.getLongitude() == null) return 0;
        double km = LocalizacaoService.calcularDistancia(a.getLatitude(), a.getLongitude(),
                b.getLatitude(), b.getLongitude());
        if (a.getDataHora() != null && b.getDataHora() != null) {
            double horas = Math.max(Duration.between(a.getDataHora(), b.getDataHora()).getSeconds(), 1) / 3600.0;
            if (km / horas > VELOCIDADE_IMPOSSIVEL_KMH) return 0;
        }
        return km;
    }

    private void avisarSeChegou(Veiculo v) {
        Double proxima = proximaRevisao(v);
        if (proxima == null || !precisaAvisar(v) || proxima.equals(v.getAvisoRevisaoKm())) return;

        double faltam = proxima - v.getKmAtual();
        String quando = faltam > 0 ? "faltam " + formatarKm(faltam) : "passou " + formatarKm(-faltam) + " do prazo";
        telegramService.avisar("REVISAO", "veiculos.visualizar",
                "🔧 <b>Revisão</b>\n<b>" + TelegramService.esc(v.getPlaca()) + "</b> está com "
                        + formatarKm(v.getKmAtual()) + ". A revisão é aos " + formatarKm(proxima)
                        + " (" + quando + ").");
        v.setAvisoRevisaoKm(proxima);
    }

    public static String formatarKm(double km) {
        return String.format(new java.util.Locale("pt", "BR"), "%,.0f km", km);
    }
}
