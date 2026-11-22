package com.tcc.gestaofrota.service;

import com.tcc.gestaofrota.model.Controladora;
import com.tcc.gestaofrota.repository.ControladoraRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/** Login próprio no broker: a senha vai uma vez só (o broker derruba o cliente quando ela muda). */
class MqttAcessoServiceTest {

    private static final String IMEI = "356938035643809";

    private MqttService mqtt;
    private MqttAcessoService servico;
    private Controladora c;

    @BeforeEach
    void preparar() {
        mqtt = mock(MqttService.class);
        servico = new MqttAcessoService(mqtt, mock(ControladoraRepository.class), true);
        c = new Controladora();
        c.setIdControladora(2L);
        c.setImei(IMEI);
        c.setVersaoFirmware("3.1");
        c.setSituacao(Controladora.APROVADA);
    }

    @Test
    void mesmaSenhaNaoEReenviadaACadaApresentacao() {
        servico.sincronizar(c, "SenhaDaControladora1");
        servico.sincronizar(c, "SenhaDaControladora1"); // reconectou e se apresentou de novo
        verify(mqtt, times(1)).publicarControle(anyString(), anyString());
    }

    @Test
    void senhaNovaOuBrokerReiniciadoEnviaDeNovo() {
        servico.sincronizar(c, "SenhaDaControladora1");
        servico.sincronizar(c, "OutraSenhaAprovada22"); // gestor aprovou uma senha nova
        verify(mqtt, times(2)).publicarControle(anyString(), anyString());

        servico.aoConectarMqtt(null); // backend reconectou: o broker pode ter perdido o cadastro
        servico.sincronizar(c, "OutraSenhaAprovada22");
        // 2 de antes + 1 do aoConectarMqtt (repositório vazio: nenhuma) + 1 desta
        verify(mqtt, times(3)).publicarControle(anyString(), anyString());
    }
}
