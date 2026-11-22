package com.tcc.gestaofrota.service;

import com.tcc.gestaofrota.model.Controladora;
import com.tcc.gestaofrota.model.Veiculo;
import com.tcc.gestaofrota.repository.ComandoRepository;
import com.tcc.gestaofrota.repository.ControladoraRepository;
import com.tcc.gestaofrota.repository.VeiculoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Provisionamento: a controladora se apresenta pelo IMEI e o gestor aprova. */
class ControladoraServiceTest {

    private static final String IMEI = "356938035643809"; // IMEI de exemplo com dígito verificador certo
    private static final String SENHA = "SenhaGeradaPeloEsp32";

    private ControladoraRepository repositorio;
    private MqttService mqtt;
    private ApplicationEventPublisher eventos;
    private ComandoRepository comandos;
    private ControladoraService servico;

    @BeforeEach
    void preparar() {
        repositorio = mock(ControladoraRepository.class);
        mqtt = mock(MqttService.class);
        eventos = mock(ApplicationEventPublisher.class);
        comandos = mock(ComandoRepository.class);
        servico = new ControladoraService(repositorio, mock(VeiculoRepository.class), comandos, mock(AtividadeService.class),
                mqtt, mock(MqttAcessoService.class), mock(TelegramService.class), eventos);
        when(repositorio.save(any())).thenAnswer(i -> {
            Controladora c = i.getArgument(0);
            if (c.getIdControladora() == null) c.setIdControladora(7L);
            return c;
        });
    }

    private MqttService.ProvisionamentoRecebido mensagem(String imeiTopico, String imei, String senha) {
        return new MqttService.ProvisionamentoRecebido(imeiTopico, imei, senha, "3.1");
    }

    private Controladora aprovada(String senha) {
        Controladora c = new Controladora();
        c.setIdControladora(2L);
        c.setImei(IMEI);
        c.setSenha(senha);
        c.setVersaoFirmware("3.1");
        c.setSituacao(Controladora.APROVADA);
        return c;
    }

    @Test
    void imeiNovoFicaAguardandoAprovacao() {
        when(repositorio.findByImei(IMEI)).thenReturn(Optional.empty());

        servico.aoReceberProvisionamento(mensagem(IMEI, IMEI, SENHA));

        ArgumentCaptor<Controladora> salva = ArgumentCaptor.forClass(Controladora.class);
        verify(repositorio).save(salva.capture());
        assertEquals(Controladora.AGUARDANDO, salva.getValue().getSituacao());
        assertEquals(SENHA, salva.getValue().getSenha());
        assertFalse(salva.getValue().estaAprovada());
        verify(mqtt).limparProvisionamento(IMEI); // a senha não fica guardada no broker
    }

    @Test
    void imeiDoTopicoDiferenteDaMensagemEhRecusado() {
        servico.aoReceberProvisionamento(mensagem("490154203237518", IMEI, SENHA));
        verify(repositorio, never()).save(any());
    }

    @Test
    void imeiInvalidoOuSenhaCurtaSaoRecusados() {
        servico.aoReceberProvisionamento(mensagem("123456789012345", "123456789012345", SENHA));
        servico.aoReceberProvisionamento(mensagem(IMEI, IMEI, "curta"));
        verify(repositorio, never()).save(any());
    }

    @Test
    void aprovadaComSenhaNovaContinuaComASenhaAntigaAteAprovar() {
        Controladora c = aprovada(SENHA);
        when(repositorio.findByImei(IMEI)).thenReturn(Optional.of(c));
        when(repositorio.findById(2L)).thenReturn(Optional.of(c));

        servico.aoReceberProvisionamento(mensagem(IMEI, IMEI, "OutraSenhaDoEsp32"));
        assertEquals(SENHA, c.getSenha());
        assertTrue(c.isTrocaDeSenhaPendente());

        servico.aprovar(2L, null, null);
        assertEquals("OutraSenhaDoEsp32", c.getSenha());
        assertFalse(c.isTrocaDeSenhaPendente());
    }

    @Test
    void aprovarLiberaEAvisaQuemPublicaNoMqtt() {
        Controladora c = aprovada(SENHA);
        c.setSituacao(Controladora.AGUARDANDO);
        when(repositorio.findById(2L)).thenReturn(Optional.of(c));

        servico.aprovar(2L, null, "(17) 99999-9999");

        assertTrue(c.estaAprovada());
        assertEquals("17999999999", c.getLinhaChip());
        verify(eventos).publishEvent(new ControladoraService.ControladoraAprovada(2L));
        assertThrows(RuntimeException.class, () -> servico.aprovar(2L, null, null)); // já aprovada
    }

    @Test
    void excluirDesligaOVeiculoEApagaOsComandosAntes() {
        Controladora c = aprovada(SENHA);
        Veiculo v = new Veiculo();
        v.setControladora(c);
        c.setVeiculo(v);
        when(repositorio.findById(2L)).thenReturn(Optional.of(c));

        servico.deletar(2L);

        assertNull(v.getControladora()); // sem isso o cascade do veículo "desfaz" o delete
        assertNull(c.getVeiculo());
        verify(comandos).deleteByControladora_IdControladora(2L);
        verify(repositorio).delete(c);
    }

    @Test
    void firmwareAntigoUsaONumeroEFirmwareNovoUsaOImei() {
        Controladora antiga = new Controladora();
        antiga.setIdControladora(2L);
        antiga.setImei(IMEI); // IMEI digitado à mão, mas o firmware antigo ainda usa "2"
        assertEquals("2", antiga.getCodigoMqtt());

        antiga.setVersaoFirmware("3.1"); // se apresentou pelo provisionamento
        assertEquals(IMEI, antiga.getCodigoMqtt());
    }

    @Test
    void cadastradaAMaoPassaParaOImeiAoSeApresentar() {
        Controladora c = aprovada("SenhaDigitadaNoSite");
        c.setVersaoFirmware(null); // firmware antigo
        when(repositorio.findByImei(IMEI)).thenReturn(Optional.of(c));

        servico.aoReceberProvisionamento(mensagem(IMEI, IMEI, SENHA));

        assertEquals(IMEI, c.getCodigoMqtt());
        assertTrue(c.isTrocaDeSenhaPendente()); // a senha que ela criou ainda precisa ser aprovada
        verify(eventos).publishEvent(new ControladoraService.ControladoraAprovada(2L)); // cartões no tópico novo
    }
}
