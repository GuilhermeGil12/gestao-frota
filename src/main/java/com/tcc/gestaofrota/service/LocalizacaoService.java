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
import java.util.List;
import java.util.Optional;

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
                    DateTimeFormatter formatador = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
                    LocalDateTime dataHoraGps = LocalDateTime.parse(dataHoraString, formatador);
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
            // AQUI: Troquei de 'repository' para 'localizacaoRepository'
            return localizacaoRepository.buscarTodosAlertasNoPeriodo(inicio, fim);
        } else {
            // AQUI: Troquei de 'repository' para 'localizacaoRepository'
            return localizacaoRepository.buscarAlertaPorVeiculo(idVeiculo, inicio, fim);
        }
    }
}