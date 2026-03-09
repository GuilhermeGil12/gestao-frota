package com.tcc.gestaofrota.service;


import com.tcc.gestaofrota.dto.CoordenadaEsp32DTO;
import com.tcc.gestaofrota.model.Controladora;
import com.tcc.gestaofrota.model.Localizacao;
import com.tcc.gestaofrota.model.Veiculo;
import com.tcc.gestaofrota.repository.ControladoraRepository;
import com.tcc.gestaofrota.repository.LocalizacaoRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class LocalizacaoService {

    private final LocalizacaoRepository localizacaoRepository;
    private final ControladoraRepository controladoraRepository;

    public LocalizacaoService(LocalizacaoRepository localizacaoRepository, ControladoraRepository controladoraRepository) {
        this.localizacaoRepository = localizacaoRepository;
        this.controladoraRepository = controladoraRepository;
    }

     public void processarLoteDoEsp32(String codigoControladora, String senha, List<CoordenadaEsp32DTO> loteDoEsp32){

         // 1. Convertendo o código que veio como String do ESP32 para Long (pois o banco espera Long)
        Long id = Long.parseLong(codigoControladora);

         Optional<Controladora> controladoraBusca = controladoraRepository.findByIdControladoraAndSenha(id, senha);

         if(controladoraBusca.isEmpty()){
            throw new RuntimeException("Credenciais inválidas! Controladora não encontrada ou senha incorreta.");
         }


         //tira a controladora dentro do Optional usando o .get, vai passar o valor que está dentro da variavel controladoraBusca
         Controladora controladoraAutenticada = controladoraBusca.get();

         //como a controladora está vinculada, puxamos o veiculo completo que está vinculado a controladora
         //que está dentro da variavel controladoraAutenticada, esse veiculo que puxamos fica dentro da
         //variavel carroEsp32
         Veiculo carroDoEsp32 = controladoraAutenticada.getVeiculo();

         // 1. Cria uma sacola vazia para as localizações oficiais que vão para o banco
         List<Localizacao> localizacoesParaSalvar = new ArrayList<>();

         // 2. O Java olha linha por linha (cada DTO) do lote que o ESP32 mandou
         for (CoordenadaEsp32DTO dto: loteDoEsp32) {

             // Transforma o texto do ESP32 em número decimal (Double)
             double lat = Double.parseDouble(dto.getLatitude());
             double lng = Double.parseDouble(dto.getLongitude());

             if (lat != 0.0 && lng != 0.0) {

                 Localizacao novaLoc = new Localizacao();

                 // 1. Amarra o carro (AGORA VAI DAR CERTO!)
                 novaLoc.setVeiculo(carroDoEsp32);

                 // 2. Preenche Lat e Lng
                 novaLoc.setLatitude(lat);
                 novaLoc.setLongitude(lng);

                 // 3. Preenchendo a Altitude e Velocidade
                 novaLoc.setAltitude(Double.parseDouble(dto.getAltitude()));
                 novaLoc.setVelocidade(Double.parseDouble(dto.getVelocidade()));

                 // 4. Convertendo a Ignição (String) para Status (Integer)
                 novaLoc.setStatus(Integer.parseInt(dto.getIgn()));

                 // 5. Preenchendo o Motorista
                 novaLoc.setMotorista(dto.getCrachastr());

                 // 6. Marcando a hora exata que o servidor recebeu o pacote
                 novaLoc.setRecebidoEM(LocalDateTime.now());

                 // 7. ️ Pegando a Data/Hora do GPS
                 String dataHoraString = dto.getData_localizacao();

                 DateTimeFormatter formatador = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

                 LocalDateTime dataHoraGps = LocalDateTime.parse(dataHoraString, formatador);
                 novaLoc.setDataHora(dataHoraGps);

                 // Coloca na sacola de dados bons
                 localizacoesParaSalvar.add(novaLoc);
             }

         }

         localizacaoRepository.saveAll(localizacoesParaSalvar);
     }//fim do metodo
    public Optional<Localizacao> buscarUltimaLocalizacao(Long veiculoId) {
        // Ele vai lá no repository e usa aquele "buscador mágico" que você já tinha criado!
        return localizacaoRepository.findTopByVeiculoIdOrderByDataHoraDesc(veiculoId);
    }

}//fim da classe
