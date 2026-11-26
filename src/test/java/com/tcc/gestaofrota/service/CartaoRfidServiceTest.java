package com.tcc.gestaofrota.service;

import com.tcc.gestaofrota.model.Configuracao;
import com.tcc.gestaofrota.model.Controladora;
import com.tcc.gestaofrota.model.Veiculo;
import com.tcc.gestaofrota.repository.CartaoRfidRepository;
import com.tcc.gestaofrota.repository.ControladoraRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** As regras que vão para a controladora levam o limite de velocidade do veículo dela. */
class CartaoRfidServiceTest {

    private static final String IMEI = "356938035643809";

    private MqttService mqtt;
    private CartaoRfidService servico;
    private Controladora c;

    @BeforeEach
    void preparar() {
        mqtt = mock(MqttService.class);
        ConfiguracaoService config = mock(ConfiguracaoService.class);
        when(config.buscar()).thenReturn(new Configuracao());
        servico = new CartaoRfidService(mock(CartaoRfidRepository.class), mock(FuncionarioService.class),
                mock(ControladoraRepository.class), mqtt, mock(AtividadeService.class), config);

        c = new Controladora();
        c.setIdControladora(2L);
        c.setImei(IMEI);
        c.setVersaoFirmware("3.2");
        c.setSituacao(Controladora.APROVADA);
    }

    @Test
    void regrasLevamOLimiteDoVeiculo() {
        Veiculo v = new Veiculo();
        v.setVelocidadeMaxima(120.0);
        c.setVeiculo(v);
        servico.publicarCartoes(c);
        verify(mqtt).publicarRegras(eq(IMEI), anyBoolean(), eq(22), eq(6), eq(120));
    }

    @Test
    void semVeiculoOuSemLimiteVale110() {
        servico.publicarCartoes(c);
        verify(mqtt).publicarRegras(eq(IMEI), anyBoolean(), eq(22), eq(6), eq(110));

        Veiculo v = new Veiculo(); // veículo sem limite cadastrado
        c.setVeiculo(v);
        servico.publicarCartoes(c);
        verify(mqtt, times(2)).publicarRegras(eq(IMEI), anyBoolean(), eq(22), eq(6), eq(110));
    }
}
