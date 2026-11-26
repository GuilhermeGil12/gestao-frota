package com.tcc.gestaofrota.service;

import com.tcc.gestaofrota.model.Configuracao;
import com.tcc.gestaofrota.model.Localizacao;
import com.tcc.gestaofrota.model.Veiculo;
import com.tcc.gestaofrota.repository.LocalizacaoRepository;
import com.tcc.gestaofrota.repository.VeiculoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Revisão por km: cálculo da próxima revisão, soma do GPS e aviso único no Telegram. */
class RevisaoServiceTest {

    private VeiculoRepository veiculoRepository;
    private LocalizacaoRepository localizacaoRepository;
    private TelegramService telegram;
    private RevisaoService servico;
    private Veiculo veiculo;
    private LocalDateTime base;

    @BeforeEach
    void preparar() {
        veiculoRepository = mock(VeiculoRepository.class);
        localizacaoRepository = mock(LocalizacaoRepository.class);
        telegram = mock(TelegramService.class);
        ConfiguracaoService config = mock(ConfiguracaoService.class);
        Configuracao c = new Configuracao();
        c.setKmRevisao(10000);
        when(config.buscar()).thenReturn(c);
        servico = new RevisaoService(veiculoRepository, localizacaoRepository, config, telegram,
                mock(AtividadeService.class));

        base = LocalDateTime.now().minusHours(1);
        veiculo = new Veiculo();
        veiculo.setId(1L);
        veiculo.setPlaca("ABC1D23");
        veiculo.setKmAtual(9400.0);
        veiculo.setKmContadoAte(base);
        when(veiculoRepository.findAll()).thenReturn(List.of(veiculo));
        when(veiculoRepository.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    private Localizacao ponto(double lat, int minutos) {
        Localizacao p = new Localizacao();
        p.setLatitude(lat);
        p.setLongitude(-49.97);
        p.setDataHora(base.plusMinutes(minutos));
        return p;
    }

    @Test
    void semRevisaoRegistradaValeOProximoMultiplo() {
        assertEquals(10000.0, servico.proximaRevisao(veiculo));
        veiculo.setKmUltimaRevisao(9000.0);
        assertEquals(19000.0, servico.proximaRevisao(veiculo));
    }

    @Test
    void revisaoSoPodeSerRegistradaQuandoChegaAHora() {
        when(veiculoRepository.findById(1L)).thenReturn(Optional.of(veiculo));
        veiculo.setKmAtual(4997.0); // faltam 5.003 km para os 10.000
        assertThrows(RuntimeException.class, () -> servico.registrarRevisao(1L));
        assertNull(veiculo.getKmUltimaRevisao());

        veiculo.setKmAtual(9600.0); // faltam 400 km: agora pode
        servico.registrarRevisao(1L);
        assertEquals(9600.0, veiculo.getKmUltimaRevisao());
    }

    @Test
    void semKmInformadoNaoCalcula() {
        veiculo.setKmAtual(null);
        assertNull(servico.proximaRevisao(veiculo));
        assertFalse(servico.precisaAvisar(veiculo));
    }

    @Test
    void somaOsKmDoGpsEAvisaUmaVezSo() {
        // ~111 km por grau de latitude: 0,9° ≈ 100 km em 60 min (velocidade possível).
        Localizacao antes = ponto(-20.0, 0);
        Localizacao depois = ponto(-20.9, 60);
        when(localizacaoRepository.findTopByVeiculoIdAndDataHoraLessThanEqualOrderByDataHoraDesc(eq(1L), any()))
                .thenReturn(Optional.of(antes));
        when(localizacaoRepository.findByVeiculoIdAndDataHoraAfterOrderByDataHoraAsc(eq(1L), any()))
                .thenReturn(List.of(depois));

        servico.atualizarQuilometragem();
        assertEquals(9500.0, veiculo.getKmAtual(), 1.0);
        verify(telegram, times(1)).avisar(eq("REVISAO"), anyString(), anyString());

        // Sem pontos novos: não repete o aviso.
        when(localizacaoRepository.findByVeiculoIdAndDataHoraAfterOrderByDataHoraAsc(eq(1L), any()))
                .thenReturn(List.of());
        servico.atualizarQuilometragem();
        verify(telegram, times(1)).avisar(eq("REVISAO"), anyString(), anyString());
    }

    @Test
    void saltoImpossivelDoGpsNaoConta() {
        // 100 km em 1 minuto = erro do GPS.
        when(localizacaoRepository.findTopByVeiculoIdAndDataHoraLessThanEqualOrderByDataHoraDesc(eq(1L), any()))
                .thenReturn(Optional.of(ponto(-20.0, 0)));
        when(localizacaoRepository.findByVeiculoIdAndDataHoraAfterOrderByDataHoraAsc(eq(1L), any()))
                .thenReturn(List.of(ponto(-20.9, 1)));
        servico.atualizarQuilometragem();
        assertEquals(9400.0, veiculo.getKmAtual());
    }
}
