package com.tcc.gestaofrota.service;

import com.tcc.gestaofrota.model.Cerca;
import com.tcc.gestaofrota.model.Localizacao;
import com.tcc.gestaofrota.model.Veiculo;
import com.tcc.gestaofrota.repository.LocalizacaoRepository;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

// Relatórios "Detalhado" (todos os pontos) e "Visitas" (entradas e saídas das cercas).
// O "Resumo" por veículo continua no LocalizacaoService.gerarRelatorioQuilometragem.
@Service
public class RelatorioService {

    private static final double LIMITE_PADRAO = 110;
    private static final int MAX_PONTOS = 20000;            // protege o navegador num período muito grande
    private static final double RAIO_PADRAO_METROS = 100;   // mesmo padrão da tela de Cercas
    private static final long VISITA_MINIMA_SEGUNDOS = 60;  // menos que isso é só passar na frente

    private final LocalizacaoRepository localizacaoRepository;
    private final CercaService cercaService;

    public RelatorioService(LocalizacaoRepository localizacaoRepository, CercaService cercaService) {
        this.localizacaoRepository = localizacaoRepository;
        this.cercaService = cercaService;
    }

    private List<Localizacao> buscarPontos(LocalDateTime inicio, LocalDateTime fim, Long idVeiculo) {
        List<Localizacao> pontos = idVeiculo == null
                ? localizacaoRepository.findByDataHoraBetweenOrderByDataHoraAsc(inicio, fim)
                : localizacaoRepository.findByVeiculoIdAndDataHoraBetweenOrderByDataHoraAsc(idVeiculo, inicio, fim);
        return pontos.stream().filter(p -> p.getVeiculo() != null).collect(Collectors.toList());
    }

    private double limiteDo(Veiculo veiculo) {
        return veiculo.getVelocidadeMaxima() != null && veiculo.getVelocidadeMaxima() > 0
                ? veiculo.getVelocidadeMaxima() : LIMITE_PADRAO;
    }

    // "Nome | Cartão: UID" → [nome, uid]
    private String[] separarMotorista(String texto) {
        if (texto == null || texto.isBlank()) return new String[]{"Não identificado", null};
        String[] partes = texto.split(" \\| Cartão: ", 2);
        String uid = partes.length > 1 && !partes[1].isBlank() ? partes[1].trim() : null;
        return new String[]{partes[0].trim(), uid};
    }

    // ===================== DETALHADO =====================

    public Map<String, Object> pontos(LocalDateTime inicio, LocalDateTime fim, Long idVeiculo) {
        List<Localizacao> todos = buscarPontos(inicio, fim, idVeiculo);
        boolean limitado = todos.size() > MAX_PONTOS;
        List<Localizacao> pontos = limitado ? todos.subList(0, MAX_PONTOS) : todos;

        List<Map<String, Object>> linhas = new ArrayList<>();
        for (Localizacao p : pontos) {
            Veiculo v = p.getVeiculo();
            String[] motorista = separarMotorista(p.getMotorista());
            double velocidade = p.getVelocidade() != null ? p.getVelocidade() : 0.0;

            Map<String, Object> linha = new HashMap<>();
            linha.put("id", p.getId());
            linha.put("dataHora", p.getDataHora());
            linha.put("idVeiculo", v.getId());
            linha.put("placa", v.getPlaca());
            linha.put("nomeVeiculo", v.getNome());
            linha.put("motorista", motorista[0]);
            linha.put("cartao", motorista[1]);
            linha.put("latitude", p.getLatitude());
            linha.put("longitude", p.getLongitude());
            linha.put("velocidade", velocidade);
            linha.put("excesso", velocidade > limiteDo(v));
            linha.put("evento", p.getEvento());
            linha.put("ignicao", p.getStatus() != null && p.getStatus() != 0);
            linha.put("qtdSatelite", p.getQtdSatelite());
            linha.put("tensaoPosChave", p.getTensaoPosChave());
            linha.put("tensaoSistema", p.getTensaoSistema());
            linhas.add(linha);
        }

        Map<String, Object> resposta = new HashMap<>();
        resposta.put("pontos", linhas);
        resposta.put("total", todos.size());
        resposta.put("limitado", limitado);
        resposta.put("maximo", MAX_PONTOS);
        return resposta;
    }

    // ===================== VISITAS =====================

    /**
     * Uma visita começa no primeiro ponto dentro da cerca e termina no primeiro ponto fora dela.
     * Passagens com menos de 1 minuto lá dentro são descartadas (o carro só passou na rua).
     * Se o período acabar com o veículo ainda dentro, a visita fica "em andamento" (sem saída).
     */
    public List<Map<String, Object>> visitas(LocalDateTime inicio, LocalDateTime fim, Long idVeiculo) {
        List<Cerca> cercas = cercaService.listarAtivas().stream()
                .filter(c -> c.getLatitude() != null && c.getLongitude() != null)
                .toList();
        if (cercas.isEmpty()) return List.of();

        Map<Long, List<Localizacao>> porVeiculo = buscarPontos(inicio, fim, idVeiculo).stream()
                .filter(p -> p.getLatitude() != null && p.getLongitude() != null && p.getDataHora() != null)
                .collect(Collectors.groupingBy(p -> p.getVeiculo().getId(), LinkedHashMap::new, Collectors.toList()));

        List<Map<String, Object>> visitas = new ArrayList<>();
        for (List<Localizacao> pontos : porVeiculo.values()) {
            for (Cerca cerca : cercas) {
                double raio = cerca.getRaio() != null && cerca.getRaio() > 0 ? cerca.getRaio() : RAIO_PADRAO_METROS;
                Localizacao entrada = null;

                for (Localizacao p : pontos) {
                    boolean dentro = distanciaMetros(p.getLatitude(), p.getLongitude(),
                            cerca.getLatitude(), cerca.getLongitude()) <= raio;
                    if (dentro && entrada == null) {
                        entrada = p;
                    } else if (!dentro && entrada != null) {
                        adicionarVisita(visitas, cerca, entrada, p.getDataHora(), false);
                        entrada = null;
                    }
                }
                if (entrada != null) {
                    adicionarVisita(visitas, cerca, entrada, pontos.get(pontos.size() - 1).getDataHora(), true);
                }
            }
        }

        visitas.sort(Comparator.comparing(m -> (LocalDateTime) m.get("entrada")));
        return visitas;
    }

    private void adicionarVisita(List<Map<String, Object>> visitas, Cerca cerca, Localizacao entrada,
                                 LocalDateTime ate, boolean emAndamento) {
        long segundos = Duration.between(entrada.getDataHora(), ate).getSeconds();
        if (!emAndamento && segundos < VISITA_MINIMA_SEGUNDOS) return;

        Veiculo v = entrada.getVeiculo();
        Map<String, Object> visita = new HashMap<>();
        visita.put("idCerca", cerca.getId());
        visita.put("cerca", cerca.getNome());
        visita.put("responsavel", cerca.getFuncionario() != null ? cerca.getFuncionario().getNome() : null);
        visita.put("idVeiculo", v.getId());
        visita.put("placa", v.getPlaca());
        visita.put("nomeVeiculo", v.getNome());
        visita.put("motorista", separarMotorista(entrada.getMotorista())[0]);
        visita.put("entrada", entrada.getDataHora());
        visita.put("saida", emAndamento ? null : ate);
        visita.put("minutos", Math.max(0, Math.round(segundos / 60.0)));
        visita.put("emAndamento", emAndamento);
        visitas.add(visita);
    }

    private double distanciaMetros(double lat1, double lon1, double lat2, double lon2) {
        double raioTerra = 6371000;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return raioTerra * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
