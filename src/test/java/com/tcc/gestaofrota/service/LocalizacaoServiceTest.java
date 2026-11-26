package com.tcc.gestaofrota.service;

import com.tcc.gestaofrota.dto.CoordenadaEsp32DTO;
import com.tcc.gestaofrota.model.Controladora;
import com.tcc.gestaofrota.model.Localizacao;
import com.tcc.gestaofrota.model.Veiculo;
import com.tcc.gestaofrota.repository.CartaoRfidRepository;
import com.tcc.gestaofrota.repository.ControladoraRepository;
import com.tcc.gestaofrota.repository.FuncionarioRepository;
import com.tcc.gestaofrota.repository.LocalizacaoRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Lote reenviado (a confirmação se perdeu): o ponto que já está no banco não é gravado de novo. */
class LocalizacaoServiceTest {

    private static final String IMEI = "356938035643809";

    @Test
    @SuppressWarnings("unchecked")
    void pontoQueJaEstaNoBancoNaoEGravadoDeNovo() {
        LocalizacaoRepository localizacoes = mock(LocalizacaoRepository.class);
        ControladoraRepository controladoras = mock(ControladoraRepository.class);
        LocalizacaoService servico = new LocalizacaoService(localizacoes, controladoras,
                mock(FuncionarioRepository.class), mock(CartaoRfidRepository.class),
                mock(TelegramService.class), mock(AvisoCercaService.class));

        Veiculo veiculo = new Veiculo();
        veiculo.setId(7L);
        Controladora c = new Controladora();
        c.setIdControladora(2L);
        c.setImei(IMEI);
        c.setVersaoFirmware("3.1");
        c.setSituacao(Controladora.APROVADA);
        c.setVeiculo(veiculo);
        when(controladoras.findByImei(IMEI)).thenReturn(Optional.of(c));

        // O primeiro ponto já foi salvo da outra vez; o segundo é novo.
        when(localizacoes.existsByVeiculoIdAndDataHoraAndLatitudeAndLongitude(
                eq(7L), eq(LocalDateTime.of(2026, 11, 24, 6, 45, 53)), anyDouble(), anyDouble())).thenReturn(true);

        servico.salvarLoteMqtt(IMEI, List.of(
                ponto("2026-11-24 06:45:53", "-20.35700"),
                ponto("2026-11-24 06:46:03", "-20.35900")));

        ArgumentCaptor<List<Localizacao>> salvos = ArgumentCaptor.forClass(List.class);
        verify(localizacoes).saveAll(salvos.capture());
        assertEquals(1, salvos.getValue().size());
        assertEquals(LocalDateTime.of(2026, 11, 24, 6, 46, 3), salvos.getValue().get(0).getDataHora());
    }

    @Test
    @SuppressWarnings("unchecked")
    void pontoEstragadoNaoDerrubaOLoteInteiro() {
        LocalizacaoRepository localizacoes = mock(LocalizacaoRepository.class);
        ControladoraRepository controladoras = mock(ControladoraRepository.class);
        LocalizacaoService servico = new LocalizacaoService(localizacoes, controladoras,
                mock(FuncionarioRepository.class), mock(CartaoRfidRepository.class),
                mock(TelegramService.class), mock(AvisoCercaService.class));
        Veiculo veiculo = new Veiculo();
        veiculo.setId(7L);
        Controladora c = new Controladora();
        c.setIdControladora(2L);
        c.setImei(IMEI);
        c.setVersaoFirmware("3.1");
        c.setSituacao(Controladora.APROVADA);
        c.setVeiculo(veiculo);
        when(controladoras.findByImei(IMEI)).thenReturn(Optional.of(c));

        CoordenadaEsp32DTO bom = ponto("2026-11-24 06:45:53", "-20.35700");
        CoordenadaEsp32DTO semVelocidade = ponto("2026-11-24 06:46:03", "-20.35900");
        semVelocidade.setVelocidade("nan");     // GPS teve um soluço
        semVelocidade.setAltitude(null);
        CoordenadaEsp32DTO semPosicao = ponto("2026-11-24 06:46:13", "abc");

        servico.salvarLoteMqtt(IMEI, List.of(bom, semVelocidade, semPosicao));

        ArgumentCaptor<List<Localizacao>> salvos = ArgumentCaptor.forClass(List.class);
        verify(localizacoes).saveAll(salvos.capture());
        assertEquals(2, salvos.getValue().size());               // só o sem posição foi descartado
        assertEquals(null, salvos.getValue().get(1).getVelocidade()); // gravado sem a velocidade
        assertEquals(-20.359, salvos.getValue().get(1).getLatitude(), 1e-9);
    }

    private static CoordenadaEsp32DTO ponto(String dataHora, String latitude) {
        CoordenadaEsp32DTO p = new CoordenadaEsp32DTO();
        p.setData_localizacao(dataHora);
        p.setLatitude(latitude);
        p.setLongitude("-49.77700");
        p.setVelocidade("100");
        p.setAltitude("400");
        p.setIgn("1");
        p.setCrachastr("");
        p.setLote("42");
        return p;
    }
}
