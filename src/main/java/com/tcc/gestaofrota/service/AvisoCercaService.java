package com.tcc.gestaofrota.service;

import com.tcc.gestaofrota.model.Cerca;
import com.tcc.gestaofrota.model.Localizacao;
import com.tcc.gestaofrota.model.Veiculo;
import com.tcc.gestaofrota.repository.CercaRepository;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Aviso no Telegram quando um veículo ENTRA e quando SAI de uma cerca.
 *
 * Acompanha, em memória, em quais cercas cada veículo está. A cada lote de pontos da controladora:
 *  - entrou (ficou a até "raio" metros do centro): manda "📍 entrou em ...";
 *    na cerca da casa de um funcionário, manda "🏠 chegou na casa de ...";
 *  - saiu (passou de raio + 20 m): manda "saiu de ... — ficou N min",
 *    mas só se ficou pelo menos 1 minuto (mesma regra do relatório de visitas).
 *
 * Cuidados:
 *  - Os 20 m a mais para "sair" evitam vários avisos quando o GPS oscila na borda da cerca.
 *  - Depois que o servidor reinicia, o primeiro ponto de cada veículo só anota onde ele está,
 *    sem avisar (senão um carro parado na base geraria "entrou" a cada reinício).
 *  - Pontos com mais de 30 min (reenviados do cartão SD depois de um tempo sem sinal)
 *    atualizam a posição, mas não avisam: seria notícia velha.
 */
@Service
public class AvisoCercaService {

    private static final double RAIO_PADRAO_METROS = 100;
    private static final double MARGEM_SAIDA_METROS = 20;
    private static final long VISITA_MINIMA_SEGUNDOS = 60;
    private static final DateTimeFormatter HORA = DateTimeFormatter.ofPattern("HH:mm");

    private final CercaRepository cercaRepository;
    private final TelegramService telegramService;

    /** Por veículo: as cercas em que ele está agora → quando entrou. */
    private final Map<Long, Map<Long, LocalDateTime>> dentroDe = new ConcurrentHashMap<>();

    public AvisoCercaService(CercaRepository cercaRepository, TelegramService telegramService) {
        this.cercaRepository = cercaRepository;
        this.telegramService = telegramService;
    }

    public void processar(Veiculo veiculo, List<Localizacao> pontos) {
        if (veiculo == null || pontos.isEmpty()) return;
        List<Cerca> cercas = cercaRepository.findByAtivoTrue().stream()
                .filter(c -> c.getLatitude() != null && c.getLongitude() != null)
                .toList();
        if (cercas.isEmpty()) return;

        boolean primeiraVez = !dentroDe.containsKey(veiculo.getId());
        Map<Long, LocalDateTime> atuais = dentroDe.computeIfAbsent(veiculo.getId(), k -> new ConcurrentHashMap<>());
        LocalDateTime recente = LocalDateTime.now().minusMinutes(30);

        for (Localizacao p : pontos) {
            if (p.getLatitude() == null || p.getLongitude() == null || p.getDataHora() == null) continue;
            boolean avisar = !primeiraVez && p.getDataHora().isAfter(recente);

            for (Cerca cerca : cercas) {
                double raio = cerca.getRaio() != null && cerca.getRaio() > 0 ? cerca.getRaio() : RAIO_PADRAO_METROS;
                double distancia = distanciaMetros(p.getLatitude(), p.getLongitude(), cerca.getLatitude(), cerca.getLongitude());
                LocalDateTime entrada = atuais.get(cerca.getId());

                if (entrada == null && distancia <= raio) {
                    atuais.put(cerca.getId(), p.getDataHora());
                    if (avisar) avisarEntrada(veiculo, cerca, p);
                } else if (entrada != null && distancia > raio + MARGEM_SAIDA_METROS) {
                    atuais.remove(cerca.getId());
                    long segundos = Duration.between(entrada, p.getDataHora()).getSeconds();
                    if (avisar && segundos >= VISITA_MINIMA_SEGUNDOS) avisarSaida(veiculo, cerca, p, segundos);
                }
            }
            primeiraVez = false;
        }
    }

    private void avisarEntrada(Veiculo v, Cerca cerca, Localizacao p) {
        String placa = TelegramService.esc(v.getPlaca());
        String motorista = TelegramService.esc(nomeDoMotorista(p.getMotorista()));
        String titulo = cerca.isCasaFuncionario() && cerca.getFuncionario() != null
                ? "🏠 <b>" + placa + "</b> chegou na casa de <b>" + TelegramService.esc(cerca.getFuncionario().getNome()) + "</b>"
                : "📍 <b>" + placa + "</b> entrou em <b>" + TelegramService.esc(cerca.getNome()) + "</b>";
        telegramService.avisar("VISITA_CERCA", "monitoramento.visualizar",
                titulo + "\n"
                + "Motorista: " + motorista + "\n"
                + "Horário: " + p.getDataHora().format(HORA) + "\n"
                + linkMapa(p.getLatitude(), p.getLongitude()));
    }

    private void avisarSaida(Veiculo v, Cerca cerca, Localizacao p, long segundos) {
        String onde = cerca.isCasaFuncionario() && cerca.getFuncionario() != null
                ? "da casa de <b>" + TelegramService.esc(cerca.getFuncionario().getNome()) + "</b>"
                : "de <b>" + TelegramService.esc(cerca.getNome()) + "</b>";
        telegramService.avisar("VISITA_CERCA", "monitoramento.visualizar",
                "↩️ <b>" + TelegramService.esc(v.getPlaca()) + "</b> saiu " + onde + "\n"
                + "Ficou " + duracao(segundos) + " (saiu às " + p.getDataHora().format(HORA) + ")");
    }

    private static String nomeDoMotorista(String texto) {
        if (texto == null || texto.isBlank()) return "Não identificado";
        String nome = texto.split(" \\| Cartão: ")[0].trim();
        return nome.isEmpty() ? "Não identificado" : nome;
    }

    private static String duracao(long segundos) {
        long minutos = segundos / 60;
        if (minutos < 60) return minutos + " min";
        return (minutos / 60) + " h " + (minutos % 60) + " min";
    }

    private static String linkMapa(Double lat, Double lng) {
        return "<a href=\"https://www.google.com/maps?q=" + lat + "," + lng + "\">📍 Ver no mapa</a>";
    }

    private static double distanciaMetros(double lat1, double lon1, double lat2, double lon2) {
        double raioTerra = 6371000;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return raioTerra * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
