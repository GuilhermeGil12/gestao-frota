package com.tcc.gestaofrota.service;

import com.tcc.gestaofrota.model.Cerca;
import com.tcc.gestaofrota.model.Funcionario;
import com.tcc.gestaofrota.model.Localizacao;
import com.tcc.gestaofrota.model.Veiculo;
import com.tcc.gestaofrota.repository.CercaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/** Aviso de entrada/saída de cerca no Telegram (sem banco, sem Telegram de verdade). */
class AvisoCercaServiceTest {

    // Cerca de 100 m em volta deste ponto.
    private static final double LAT = -20.4219, LNG = -49.9742;
    // ~1 grau de latitude = 111 km  →  0,001° ≈ 111 m
    private static final double DENTRO = LAT + 0.0003;      // ~33 m do centro
    private static final double NA_BORDA = LAT + 0.00100;   // ~111 m: passou do raio, mas não dos 20 m de folga
    private static final double LONGE = LAT + 0.0100;       // ~1,1 km

    private CercaRepository cercaRepository;
    private TelegramService telegram;
    private AvisoCercaService servico;
    private Veiculo veiculo;
    private LocalDateTime agora;

    @BeforeEach
    void preparar() {
        Cerca base = new Cerca();
        base.setId(1L);
        base.setNome("Base Principal");
        base.setLatitude(LAT);
        base.setLongitude(LNG);
        base.setRaio(100.0);

        cercaRepository = mock(CercaRepository.class);
        when(cercaRepository.findByAtivoTrue()).thenReturn(List.of(base));
        telegram = mock(TelegramService.class);
        servico = new AvisoCercaService(cercaRepository, telegram);

        veiculo = new Veiculo();
        veiculo.setId(10L);
        veiculo.setPlaca("ABC1D23");
        agora = LocalDateTime.now().minusMinutes(10);
    }

    private Localizacao ponto(double lat, int minutos) {
        Localizacao p = new Localizacao();
        p.setLatitude(lat);
        p.setLongitude(LNG);
        p.setDataHora(agora.plusMinutes(minutos));
        p.setMotorista("José Carlos | Cartão: 8DB352E4");
        return p;
    }

    private List<String> mensagens() {
        ArgumentCaptor<String> texto = ArgumentCaptor.forClass(String.class);
        verify(telegram, atLeast(0)).avisar(eq("VISITA_CERCA"), anyString(), texto.capture());
        return texto.getAllValues();
    }

    @Test
    void entraOscilaNaBordaESai() {
        servico.processar(veiculo, List.of(ponto(LONGE, 0)));    // 1º ponto: só anota (fora)
        servico.processar(veiculo, List.of(ponto(DENTRO, 1)));   // entrou → avisa
        servico.processar(veiculo, List.of(ponto(NA_BORDA, 2))); // GPS oscilou na borda → não avisa
        servico.processar(veiculo, List.of(ponto(DENTRO, 3)));   // continua dentro → não avisa
        servico.processar(veiculo, List.of(ponto(LONGE, 6)));    // saiu depois de 5 min → avisa

        List<String> m = mensagens();
        assertEquals(2, m.size(), "uma mensagem de entrada e uma de saída: " + m);
        assertTrue(m.get(0).contains("entrou em <b>Base Principal</b>"));
        assertTrue(m.get(0).contains("José Carlos"));
        assertTrue(m.get(1).contains("saiu de <b>Base Principal</b>"));
        assertTrue(m.get(1).contains("Ficou 5 min"));
    }

    @Test
    void primeiroPontoDepoisDeReiniciarNaoAvisa() {
        // Carro já parado dentro da base quando o servidor liga: não é uma "entrada".
        servico.processar(veiculo, List.of(ponto(DENTRO, 0), ponto(DENTRO, 1)));
        assertTrue(mensagens().isEmpty());
    }

    @Test
    void passagemRapidaAvisaEntradaMasNaoSaida() {
        servico.processar(veiculo, List.of(ponto(LONGE, 0)));
        Localizacao entra = ponto(DENTRO, 1);
        Localizacao sai = ponto(LONGE, 1);
        sai.setDataHora(entra.getDataHora().plusSeconds(30)); // ficou só 30 s
        servico.processar(veiculo, List.of(entra, sai));

        List<String> m = mensagens();
        assertEquals(1, m.size(), "só a entrada (menos de 1 min dentro não conta como visita): " + m);
        assertTrue(m.get(0).contains("entrou"));
    }

    @Test
    void pontosAntigosDoCartaoSdNaoAvisam() {
        agora = LocalDateTime.now().minusHours(3); // reenviados depois de 3 h sem sinal
        servico.processar(veiculo, List.of(ponto(LONGE, 0)));
        servico.processar(veiculo, List.of(ponto(DENTRO, 1), ponto(LONGE, 10)));
        assertTrue(mensagens().isEmpty());
    }

    @Test
    void casaDoFuncionarioTemMensagemPropria() {
        Funcionario ana = new Funcionario();
        ana.setNome("Ana Paula");
        Cerca casa = new Cerca();
        casa.setId(2L);
        casa.setNome("Casa - Ana Paula");
        casa.setLatitude(LAT);
        casa.setLongitude(LNG);
        casa.setRaio(100.0);
        casa.setFuncionario(ana);
        casa.setCasaFuncionario(true);
        when(cercaRepository.findByAtivoTrue()).thenReturn(List.of(casa));

        servico.processar(veiculo, List.of(ponto(LONGE, 0)));
        servico.processar(veiculo, List.of(ponto(DENTRO, 1)));

        List<String> m = mensagens();
        assertEquals(1, m.size());
        assertTrue(m.get(0).contains("chegou na casa de <b>Ana Paula</b>"), m.get(0));
    }
}
