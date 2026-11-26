package com.tcc.gestaofrota.service;

import com.tcc.gestaofrota.dto.CoordenadaEsp32DTO;
import com.tcc.gestaofrota.model.CartaoRfid;
import com.tcc.gestaofrota.model.Controladora;
import com.tcc.gestaofrota.model.Localizacao;
import com.tcc.gestaofrota.model.Veiculo;
import com.tcc.gestaofrota.repository.CartaoRfidRepository;
import com.tcc.gestaofrota.repository.ControladoraRepository;
import com.tcc.gestaofrota.repository.FuncionarioRepository;
import com.tcc.gestaofrota.repository.LocalizacaoRepository;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class LocalizacaoService {

    private final TelegramService telegramService;

    // Mesmos valores da controladora e da tela de Rotas.
    private static final double LIMITE_VELOCIDADE = 110;  // padrão, quando o veículo não tem limite cadastrado
    // Só para o AVISO no Telegram: o aviso abre acima do limite e só fecha 5 km/h abaixo dele.
    // Sem isso, andar a 109/111 km/h mandaria várias mensagens. (A CONTAGEM de excessos é por ponto.)
    private static final double MARGEM_FIM_EXCESSO = 5;
    private static final double VELOCIDADE_PARADO = 3;    // abaixo disso o GPS oscila mesmo parado
    private static final long INTERVALO_MAXIMO_SEGUNDOS = 300; // mais que isso entre pontos = sem sinal

    private final FuncionarioRepository funcionarioRepository;
    private final LocalizacaoRepository localizacaoRepository;
    private final ControladoraRepository controladoraRepository;
    private final CartaoRfidRepository cartaoRfidRepository;
    private final AvisoCercaService avisoCercaService;

    // Construtor com todas as dependências injetadas
    public LocalizacaoService(LocalizacaoRepository localizacaoRepository,
                              ControladoraRepository controladoraRepository,
                              FuncionarioRepository funcionarioRepository,
                              CartaoRfidRepository cartaoRfidRepository,
            TelegramService telegramService,
                              AvisoCercaService avisoCercaService) {
        this.avisoCercaService = avisoCercaService;
        this.localizacaoRepository = localizacaoRepository;
        this.controladoraRepository = controladoraRepository;
        this.funcionarioRepository = funcionarioRepository;
        this.cartaoRfidRepository = cartaoRfidRepository;
        this.telegramService = telegramService;
    }

    // A identidade vem do tópico frota/<codigo>/telemetria (IMEI ou, no firmware antigo, o número).
    public void salvarLoteMqtt(String codigoControladora, List<CoordenadaEsp32DTO> loteDoEsp32) {
        Optional<Controladora> controladoraBusca = buscarPorCodigoMqtt(codigoControladora);
        if (controladoraBusca.isEmpty()) {
            System.out.println("[MQTT] Controladora " + codigoControladora + " não encontrada — ignorando lote.");
            return;
        }
        Controladora controladora = controladoraBusca.get();
        if (!controladora.estaAprovada()) {
            System.out.println("[MQTT] Controladora " + codigoControladora + " aguardando aprovação — ignorando lote.");
            return;
        }
        controladora.setUltimoContato(LocalDateTime.now());
        controladoraRepository.save(controladora);
        salvarPontos(controladora.getVeiculo(), loteDoEsp32);
    }

    // IMEI tem 15 números; o número da controladora (firmware antigo) é bem menor.
    // O filtro garante que o código é o que ela usa hoje (quem já usa o IMEI não aceita o número).
    private Optional<Controladora> buscarPorCodigoMqtt(String codigo) {
        if (codigo == null || !codigo.matches("\\d{1,15}")) return Optional.empty();
        Optional<Controladora> busca = codigo.length() == 15
                ? controladoraRepository.findByImei(codigo)
                : controladoraRepository.findById(Long.parseLong(codigo));
        return busca.filter(c -> codigo.equals(c.getCodigoMqtt()));
    }

    // Firmwares antigos nao mandam as tensoes: nesse caso o campo fica nulo em vez de quebrar.
    // Número estragado ("nan", "inf", texto) vira null: o ponto é gravado sem aquele campo.
    private Double paraDouble(String valor) {
        if (valor == null || valor.isBlank()) return null;
        try {
            double d = Double.parseDouble(valor.trim());
            return Double.isFinite(d) ? d : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    // Latitude e longitude existem, estão na faixa do planeta e não são o 0,0 de "GPS sem sinal".
    private static boolean posicaoValida(Double lat, Double lng) {
        return lat != null && lng != null
                && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
                && lat != 0.0 && lng != 0.0;
    }

    // A chave chega como 1/0; aceita também true/false pra um ponto mal formatado não derrubar o lote.
    private Integer paraStatus(String ign) {
        if (ign == null) return 0;
        if (ign.equalsIgnoreCase("true")) return 1;
        if (ign.equalsIgnoreCase("false")) return 0;
        Double valor = paraDouble(ign);
        return valor != null ? valor.intValue() : 0;
    }

    // Lógica de salvar os pontos — compartilhada entre HTTP e MQTT
    private void salvarPontos(Veiculo carroDoEsp32, List<CoordenadaEsp32DTO> loteDoEsp32) {

        List<Localizacao> localizacoesParaSalvar = new ArrayList<>();

        for (CoordenadaEsp32DTO dto : loteDoEsp32) {

            // Cada ponto é lido sozinho e um campo estragado (ex.: "nan" quando o GPS falha) vira
            // "sem valor", em vez de derrubar o lote inteiro: um lote com erro nunca seria
            // confirmado, a controladora reenviaria para sempre e a fila do microSD travaria.
            // (Erro do BANCO continua derrubando o lote: sem confirmação, ele é reenviado depois.)
            Double lat = paraDouble(dto.getLatitude());
            Double lng = paraDouble(dto.getLongitude());

            // Sem posição válida (GPS sem sinal ou número estragado) não dá pra desenhar: descarta o ponto.
            if (posicaoValida(lat, lng)) {

                Localizacao novaLoc = new Localizacao();
                novaLoc.setVeiculo(carroDoEsp32);
                novaLoc.setLatitude(lat);
                novaLoc.setLongitude(lng);
                novaLoc.setAltitude(paraDouble(dto.getAltitude()));
                novaLoc.setVelocidade(paraDouble(dto.getVelocidade()));
                novaLoc.setStatus(paraStatus(dto.getIgn()));
                novaLoc.setRecebidoEM(LocalDateTime.now());
                novaLoc.setTensaoPosChave(paraDouble(dto.getTensao_pos_chave()));
                novaLoc.setTensaoSistema(paraDouble(dto.getTensao_sistema()));
                novaLoc.setEvento(dto.getEvento());
                Double satelites = paraDouble(dto.getQtd_satelite());
                novaLoc.setQtdSatelite(satelites != null ? satelites.intValue() : null);

                // --- LÓGICA DE IDENTIFICAÇÃO DO MOTORISTA ---
                String uidCartao = dto.getCrachastr(); // Código enviado pelo ESP32

                // Busca o objeto CartaoRfid pelo campo 'uid'
                Optional<CartaoRfid> cartaoBusca = cartaoRfidRepository.findByUid(uidCartao);

                if (cartaoBusca.isPresent() && cartaoBusca.get().getFuncionario() != null) {
                    // Se achou o cartão e ele tem um funcionário vinculado
                    String nomeMotorista = cartaoBusca.get().getFuncionario().getNome();
                    novaLoc.setMotorista(nomeMotorista + " | Cartão: " + uidCartao);
                } else {
                    // Se o cartão não existir no banco ou não tiver dono vinculado
                    novaLoc.setMotorista("Não Identificado | Cartão: " + uidCartao);
                }
                // --------------------------------------------

                // Tratamento da Data/Hora do GPS
                try {
                    String dataHoraString = dto.getData_localizacao();
                    // O ESP manda com fração de segundo (ex: "2026-06-14 19:44:44.000000").
                    // Remove tudo a partir do ponto pra casar com o formato "yyyy-MM-dd HH:mm:ss".
                    if (dataHoraString != null && dataHoraString.contains(".")) {
                        dataHoraString = dataHoraString.substring(0, dataHoraString.indexOf("."));
                    }
                    // Aceita também o formato ISO ("2026-11-08T15:30:12").
                    if (dataHoraString != null) dataHoraString = dataHoraString.replace('T', ' ');
                    DateTimeFormatter formatador = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
                    LocalDateTime dataHoraGps = LocalDateTime.parse(dataHoraString.trim(), formatador);
                    novaLoc.setDataHora(dataHoraGps);
                } catch (Exception e) {
                    // Fallback caso a data do GPS venha mal formatada
                    novaLoc.setDataHora(LocalDateTime.now());
                }

                // Reenvio de um lote que já tinha sido salvo (a confirmação se perdeu no caminho): ignora.
                if (carroDoEsp32 != null && localizacaoRepository.existsByVeiculoIdAndDataHoraAndLatitudeAndLongitude(
                        carroDoEsp32.getId(), novaLoc.getDataHora(), lat, lng)) {
                    continue;
                }

                localizacoesParaSalvar.add(novaLoc);
            }
        }

        // Antes de salvar: compara com o último ponto gravado pra saber se o excesso COMEÇOU agora.
        avisarExcessos(carroDoEsp32, localizacoesParaSalvar);
        // Entrou ou saiu de alguma cerca? Avisa no Telegram.
        avisoCercaService.processar(carroDoEsp32, localizacoesParaSalvar);

        // Salva todos os pontos do lote de uma vez (mais performático)
        localizacaoRepository.saveAll(localizacoesParaSalvar);
    }

    /** Excesso em andamento de um veículo (guardado em memória entre um lote e outro). */
    private static class Episodio {
        LocalDateTime inicio;
        double maxima;
        Double latMaxima, lngMaxima;
        String motorista;
    }

    private final Map<Long, Episodio> excessosEmAndamento = new java.util.concurrent.ConcurrentHashMap<>();

    /**
     * Avisos de excesso no Telegram, um por episódio:
     *  - quando passa do limite: "🚨 Excesso de velocidade" (uma vez);
     *  - quando volta a ficar 5 km/h abaixo do limite: "✅ Fim do excesso" com a velocidade MÁXIMA
     *    atingida, a duração e o lugar da máxima.
     * Pontos com mais de 30 min (reenviados do SD depois de um tempo sem sinal) não avisam.
     */
    private void avisarExcessos(Veiculo veiculo, List<Localizacao> pontos) {
        if (veiculo == null || pontos.isEmpty()) return;
        double limite = veiculo.getVelocidadeMaxima() != null && veiculo.getVelocidadeMaxima() > 0
                ? veiculo.getVelocidadeMaxima() : LIMITE_VELOCIDADE;
        LocalDateTime recente = LocalDateTime.now().minusMinutes(30);
        String placa = TelegramService.esc(veiculo.getPlaca());

        for (Localizacao p : pontos) {
            if (p.getVelocidade() == null || p.getDataHora() == null || !p.getDataHora().isAfter(recente)) continue;
            double v = p.getVelocidade();
            Episodio ep = excessosEmAndamento.get(veiculo.getId());

            if (ep == null && v > limite) {
                ep = new Episodio();
                ep.inicio = p.getDataHora();
                ep.maxima = v;
                ep.latMaxima = p.getLatitude();
                ep.lngMaxima = p.getLongitude();
                ep.motorista = nomeDoMotorista(p.getMotorista());
                excessosEmAndamento.put(veiculo.getId(), ep);
                telegramService.avisar("EXCESSO_VELOCIDADE", "monitoramento.visualizar",
                        "🚨 <b>Excesso de velocidade</b>\n<b>" + placa + "</b> a <b>" + kmh(v) + "</b> (limite " + kmh(limite) + ")\n"
                        + "Motorista: " + TelegramService.esc(motoristaOuPadrao(ep.motorista)) + "\n"
                        + linkMapa(p.getLatitude(), p.getLongitude()));
            } else if (ep != null) {
                if (v > ep.maxima) {
                    ep.maxima = v;
                    ep.latMaxima = p.getLatitude();
                    ep.lngMaxima = p.getLongitude();
                }
                if (v < limite - MARGEM_FIM_EXCESSO) {
                    excessosEmAndamento.remove(veiculo.getId());
                    long segundos = java.time.Duration.between(ep.inicio, p.getDataHora()).getSeconds();
                    telegramService.avisar("EXCESSO_VELOCIDADE", "monitoramento.visualizar",
                            "✅ <b>Fim do excesso</b>\n<b>" + placa + "</b> chegou a <b>" + kmh(ep.maxima) + "</b> (limite " + kmh(limite) + ")\n"
                            + "Duração: " + duracao(segundos) + "\n"
                            + "Motorista: " + TelegramService.esc(motoristaOuPadrao(ep.motorista)) + "\n"
                            + linkMapa(ep.latMaxima, ep.lngMaxima).replace("Ver no mapa", "Onde atingiu a máxima"));
                }
            }
        }
    }

    private static String kmh(double v) {
        return Math.round(v) + " km/h";
    }

    private static String duracao(long segundos) {
        if (segundos < 60) return Math.max(segundos, 0) + " s";
        return (segundos / 60) + " min " + (segundos % 60) + " s";
    }

    private static String motoristaOuPadrao(String nome) {
        return nome != null ? nome : "Não identificado";
    }

    private static String linkMapa(Double lat, Double lng) {
        return "<a href=\"https://www.google.com/maps?q=" + lat + "," + lng + "\">📍 Ver no mapa</a>";
    }

    public Optional<Localizacao> buscarUltimaLocalizacao(Long veiculoId) {
        return localizacaoRepository.findTopByVeiculoIdOrderByDataHoraDesc(veiculoId);
    }

    public List<Localizacao> buscarAlerta(Long idVeiculo, LocalDate dataInicio, LocalDate dataFinal) {
        // Define hora 00:00:00 para o início e 23:59:59 para o fim
        LocalDateTime inicio = dataInicio.atStartOfDay();
        LocalDateTime fim = dataFinal.atTime(23, 59, 59);

        if (idVeiculo == null) {
            return localizacaoRepository.buscarTodosAlertasNoPeriodo(inicio, fim);
        } else {
            return localizacaoRepository.buscarAlertaPorVeiculo(idVeiculo, inicio, fim);
        }
    }

    // Função interna para calcular a distância entre duas coordenadas (Fórmula de Haversine)
    public static double calcularDistancia(double lat1, double lon1, double lat2, double lon2) {
        double raioTerraKm = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return raioTerraKm * c;
    }

    // Gera o relatório agregando e calculando as distâncias dos lotes do ESP32.
    // idVeiculo opcional: se vier, considera só aquele carro; se for null, a frota toda.
    public List<Map<String, Object>> gerarRelatorioQuilometragem(LocalDateTime inicio, LocalDateTime fim, Long idVeiculo) {
        // 1. Busca todos os pontos enviados pelos ESP32 no período
        List<Localizacao> registros = localizacaoRepository.findByDataHoraBetweenOrderByDataHoraAsc(inicio, fim);

        // 2. Agrupa a lista de pontos pelo ID do veículo (filtrando nulos por segurança).
        //    Se idVeiculo foi informado, mantém só os registros daquele veículo.
        Map<Long, List<Localizacao>> locaisPorVeiculo = registros.stream()
                .filter(l -> l.getVeiculo() != null && l.getVeiculo().getId() != null)
                .filter(l -> idVeiculo == null || idVeiculo.equals(l.getVeiculo().getId()))
                .collect(Collectors.groupingBy(l -> l.getVeiculo().getId()));

        List<Map<String, Object>> relatorioFinal = new ArrayList<>();

        // 3. Varre os pontos de cada veículo calculando distância, tempo em movimento e eventos
        locaisPorVeiculo.forEach((veicId, listaPontos) -> {
            double kmTotal = 0.0;
            double velMaxima = 0.0;
            long segundosEmMovimento = 0;
            int excessos = 0, freadas = 0, aceleracoes = 0, viradasBruscas = 0;
            Set<String> motoristas = new LinkedHashSet<>();
            Veiculo veiculo = listaPontos.get(0).getVeiculo();
            String placa = veiculo.getPlaca();
            // Cada veículo pode ter o próprio limite; sem cadastro, vale o padrão.
            double limite = veiculo.getVelocidadeMaxima() != null && veiculo.getVelocidadeMaxima() > 0
                    ? veiculo.getVelocidadeMaxima() : LIMITE_VELOCIDADE;

            for (int i = 0; i < listaPontos.size(); i++) {
                Localizacao atual = listaPontos.get(i);
                double velocidade = atual.getVelocidade() != null ? atual.getVelocidade() : 0.0;

                velMaxima = Math.max(velMaxima, velocidade);

                // Cada ponto acima do limite conta como um excesso (mesma regra das Rotas e do e-mail).
                if (velocidade > limite) excessos++;

                // Eventos de condução marcados pela controladora (pontos antigos não têm evento).
                if ("FREADA".equals(atual.getEvento())) freadas++;
                else if ("ACELERACAO".equals(atual.getEvento())) aceleracoes++;
                else if ("VIRADA_BRUSCA".equals(atual.getEvento())) viradasBruscas++;

                String nome = nomeDoMotorista(atual.getMotorista());
                if (nome != null) motoristas.add(nome);

                if (i == listaPontos.size() - 1) break;
                Localizacao proximo = listaPontos.get(i + 1);

                if (atual.getLatitude() != null && atual.getLongitude() != null &&
                        proximo.getLatitude() != null && proximo.getLongitude() != null) {

                    kmTotal += calcularDistancia(
                            atual.getLatitude(), atual.getLongitude(),
                            proximo.getLatitude(), proximo.getLongitude()
                    );
                }

                // Tempo em movimento: intervalo até o próximo ponto, se o carro estava andando.
                // Intervalos muito longos são falta de sinal, não viagem: ficam de fora.
                if (velocidade >= VELOCIDADE_PARADO && atual.getDataHora() != null && proximo.getDataHora() != null) {
                    long segundos = Duration.between(atual.getDataHora(), proximo.getDataHora()).getSeconds();
                    if (segundos > 0 && segundos <= INTERVALO_MAXIMO_SEGUNDOS) segundosEmMovimento += segundos;
                }
            }

            double horasEmMovimento = segundosEmMovimento / 3600.0;
            double velMedia = horasEmMovimento > 0 ? kmTotal / horasEmMovimento : 0.0;

            // Formata a resposta em um Map estruturado para o JSON
            Map<String, Object> dadosVeiculo = new HashMap<>();
            dadosVeiculo.put("idVeiculo", veicId);
            dadosVeiculo.put("placa", placa);
            dadosVeiculo.put("nome", veiculo.getNome());
            dadosVeiculo.put("limiteVelocidade", limite);
            dadosVeiculo.put("kmRodados", Math.round(kmTotal * 100.0) / 100.0); // Arredonda 2 casas
            dadosVeiculo.put("totalRegistros", listaPontos.size());
            dadosVeiculo.put("velocidadeMaxima", Math.round(velMaxima * 100.0) / 100.0);
            dadosVeiculo.put("velocidadeMedia", Math.round(velMedia * 10.0) / 10.0);
            dadosVeiculo.put("minutosEmMovimento", Math.round(segundosEmMovimento / 60.0));
            dadosVeiculo.put("excessos", excessos);
            dadosVeiculo.put("freadas", freadas);
            dadosVeiculo.put("aceleracoes", aceleracoes);
            dadosVeiculo.put("viradasBruscas", viradasBruscas);
            dadosVeiculo.put("motoristas", new ArrayList<>(motoristas));
            dadosVeiculo.put("primeiroRegistro", listaPontos.get(0).getDataHora());
            dadosVeiculo.put("ultimoRegistro", listaPontos.get(listaPontos.size() - 1).getDataHora());
            // Pega o nome do último condutor registrado no período
            dadosVeiculo.put("motorista", listaPontos.get(listaPontos.size() - 1).getMotorista());

            relatorioFinal.add(dadosVeiculo);
        });

        // Quem rodou mais aparece primeiro.
        relatorioFinal.sort((a, b) -> Double.compare((double) b.get("kmRodados"), (double) a.get("kmRodados")));
        return relatorioFinal;
    }

    // O motorista é gravado como "Nome | Cartão: UID". Sem cartão identificado, não entra na lista.
    private String nomeDoMotorista(String texto) {
        if (texto == null || texto.isBlank()) return null;
        String nome = texto.split(" \\| Cartão: ")[0].trim();
        if (nome.isEmpty() || nome.equalsIgnoreCase("Não Identificado")) return null;
        return nome;
    }

    public List<Map<String, Object>> buscarUltimasLocalizacoes() {
        List<Localizacao> lista = localizacaoRepository.buscarUltimaDeCadaVeiculo();
        List<Map<String, Object>> resposta = new ArrayList<>();

        for (Localizacao l : lista) {
            Map<String, Object> m = new HashMap<>();
            m.put("idVeiculo", l.getVeiculo().getId());
            m.put("placa", l.getVeiculo().getPlaca());
            m.put("lat", l.getLatitude());
            m.put("lng", l.getLongitude());
            m.put("velocidade", l.getVelocidade());
            m.put("status", l.getStatus());
            m.put("motorista", l.getMotorista());
            m.put("dataHora", l.getDataHora());
            m.put("tensaoPosChave", l.getTensaoPosChave());
            m.put("tensaoSistema", l.getTensaoSistema());

            resposta.add(m);
        }
        return resposta;
    }
}