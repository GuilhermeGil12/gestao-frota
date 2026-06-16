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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class LocalizacaoService {

    private final FuncionarioRepository funcionarioRepository;
    private final LocalizacaoRepository localizacaoRepository;
    private final ControladoraRepository controladoraRepository;
    private final CartaoRfidRepository cartaoRfidRepository;

    // Construtor com todas as dependências injetadas
    public LocalizacaoService(LocalizacaoRepository localizacaoRepository,
                              ControladoraRepository controladoraRepository,
                              FuncionarioRepository funcionarioRepository,
                              CartaoRfidRepository cartaoRfidRepository) {
        this.localizacaoRepository = localizacaoRepository;
        this.controladoraRepository = controladoraRepository;
        this.funcionarioRepository = funcionarioRepository;
        this.cartaoRfidRepository = cartaoRfidRepository;
    }

    public void processarLoteDoEsp32(String codigoControladora, String senha, List<CoordenadaEsp32DTO> loteDoEsp32) {

        // 1. Autenticação da Controladora
        Long id = Long.parseLong(codigoControladora);
        Optional<Controladora> controladoraBusca = controladoraRepository.findByIdControladoraAndSenha(id, senha);

        if (controladoraBusca.isEmpty()) {
            throw new RuntimeException("Credenciais inválidas! Controladora não encontrada ou senha incorreta.");
        }

        Controladora controladoraAutenticada = controladoraBusca.get();
        Veiculo carroDoEsp32 = controladoraAutenticada.getVeiculo();

        List<Localizacao> localizacoesParaSalvar = new ArrayList<>();

        for (CoordenadaEsp32DTO dto : loteDoEsp32) {

            // Converte coordenadas vindas do ESP32
            double lat = Double.parseDouble(dto.getLatitude());
            double lng = Double.parseDouble(dto.getLongitude());

            // Só processa se a coordenada for válida (GPS com sinal)
            if (lat != 0.0 && lng != 0.0) {

                Localizacao novaLoc = new Localizacao();
                novaLoc.setVeiculo(carroDoEsp32);
                novaLoc.setLatitude(lat);
                novaLoc.setLongitude(lng);
                novaLoc.setAltitude(Double.parseDouble(dto.getAltitude()));
                novaLoc.setVelocidade(Double.parseDouble(dto.getVelocidade()));
                novaLoc.setStatus(Integer.parseInt(dto.getIgn()));
                novaLoc.setRecebidoEM(LocalDateTime.now());

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
                    DateTimeFormatter formatador = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
                    LocalDateTime dataHoraGps = LocalDateTime.parse(dataHoraString.trim(), formatador);
                    novaLoc.setDataHora(dataHoraGps);
                } catch (Exception e) {
                    // Fallback caso a data do GPS venha mal formatada
                    novaLoc.setDataHora(LocalDateTime.now());
                }

                localizacoesParaSalvar.add(novaLoc);
            }
        }

        // Salva todos os pontos do lote de uma vez (mais performático)
        localizacaoRepository.saveAll(localizacoesParaSalvar);
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
    private double calcularDistancia(double lat1, double lon1, double lat2, double lon2) {
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

        // 3. Varre os pontos de cada veículo calculando a distância sequencial
        locaisPorVeiculo.forEach((veicId, listaPontos) -> {
            double kmTotal = 0.0;
            double velMaxima = 0.0;
            String placa = listaPontos.get(0).getVeiculo().getPlaca();

            for (int i = 0; i < listaPontos.size() - 1; i++) {
                Localizacao atual = listaPontos.get(i);
                Localizacao proximo = listaPontos.get(i + 1);

                if (atual.getVelocidade() != null && atual.getVelocidade() > velMaxima) {
                    velMaxima = atual.getVelocidade();
                }

                if (atual.getLatitude() != null && atual.getLongitude() != null &&
                        proximo.getLatitude() != null && proximo.getLongitude() != null) {

                    kmTotal += calcularDistancia(
                            atual.getLatitude(), atual.getLongitude(),
                            proximo.getLatitude(), proximo.getLongitude()
                    );
                }
            }

            // Formata a resposta em um Map estruturado para o JSON
            Map<String, Object> dadosVeiculo = new HashMap<>();
            dadosVeiculo.put("idVeiculo", veicId);
            dadosVeiculo.put("placa", placa);
            dadosVeiculo.put("kmRodados", Math.round(kmTotal * 100.0) / 100.0); // Arredonda 2 casas
            dadosVeiculo.put("totalRegistros", listaPontos.size());
            dadosVeiculo.put("velocidadeMaxima", Math.round(velMaxima * 100.0) / 100.0);
            // Pega o nome do último condutor registrado no período
            dadosVeiculo.put("motorista", listaPontos.get(listaPontos.size() - 1).getMotorista());

            relatorioFinal.add(dadosVeiculo);
        });

        return relatorioFinal;
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

            resposta.add(m);
        }
        return resposta;
    }
}