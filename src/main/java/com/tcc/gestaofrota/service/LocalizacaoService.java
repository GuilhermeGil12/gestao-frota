package com.tcc.gestaofrota.service;


import com.tcc.gestaofrota.model.Localizacao;
import com.tcc.gestaofrota.repository.LocalizacaoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class LocalizacaoService {

    private final LocalizacaoRepository localizacaoRepository;

    public LocalizacaoService(LocalizacaoRepository localizacaoRepository) {
        this.localizacaoRepository = localizacaoRepository;
    }

//    // Agora recebemos uma LISTA de dados do ESP32
//    public void salvarLoteDeLocalizacoes(List<Localizacao> loteDoEsp32) {
//
//        // Criamos uma sacola vazia só para guardar os dados bons
//        List<Localizacao> dadosValidosParaSalvar = new ArrayList<>();
//
//        // O Java vai olhar linha por linha (as 10 linhas)
//        for (Localizacao linha : loteDoEsp32) {
//
//            // 1. A VALIDAÇÃO MATEMÁTICA: É zero? Ignora essa linha e vai pra próxima.
//            if (linha.getLatitude() != 0.0 && linha.getLongitude() != 0.0) {
//
//                // 2. Carimba a hora que o servidor RECEBEU o pacote
//                linha.setRecebidoEM().now());
//
//                // 3. Coloca na sacola de dados bons
//                dadosValidosParaSalvar.add(linha);
//            }
//        }

        // 4. A MÁGICA DA PERFORMANCE: Salva as 10 linhas boas de uma vez só!
//        localizacaoRepository.saveAll(dadosValidosParaSalvar);
//    }
}
