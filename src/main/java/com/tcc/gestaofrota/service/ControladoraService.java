package com.tcc.gestaofrota.service;

import com.tcc.gestaofrota.model.Controladora;
import com.tcc.gestaofrota.model.Veiculo;
import com.tcc.gestaofrota.repository.ControladoraRepository;
import com.tcc.gestaofrota.repository.VeiculoRepository;
import com.tcc.gestaofrota.util.Validacoes;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Controladoras: a controladora se apresenta sozinha e o gestor só aprova.
 *
 *  1. Ao ligar, a controladora lê o IMEI do modem e publica em provisionamento/<imei>
 *     {"imei":"...","senha":"...","versao":"3.1"} — a senha ela mesma criou no primeiro boot.
 *  2. O backend cria a controladora como AGUARDANDO (ou atualiza a versão, se já existe).
 *  3. Em Controladoras, o gestor clica em "Aprovar" e escolhe o veículo.
 *  4. Aprovada, ela recebe cartões e comandos em frota/<imei>/... e os pontos dela são salvos.
 *
 * Se uma controladora já aprovada aparecer com outra senha (ex.: a memória foi apagada),
 * ela continua funcionando e a senha nova fica pendente até o gestor aprovar de novo.
 * Passo a passo completo: PLANO_CONTROLADORA.md.
 */
@Service
public class ControladoraService {

    /** Aprovada (ou mudou de tópico/senha): quem publica no MQTT manda tudo de novo pra ela. */
    public record ControladoraAprovada(Long idControladora) {}

    private static final int TAMANHO_MAXIMO_VERSAO = 20;

    private final ControladoraRepository controladoraRepository;
    private final VeiculoRepository veiculoRepository;
    private final AtividadeService atividadeService;
    private final MqttService mqttService;
    private final MqttAcessoService mqttAcessoService;
    private final TelegramService telegramService;
    private final ApplicationEventPublisher eventos;

    public ControladoraService(ControladoraRepository controladoraRepository,
                               VeiculoRepository veiculoRepository,
                               AtividadeService atividadeService,
                               MqttService mqttService,
                               MqttAcessoService mqttAcessoService,
                               TelegramService telegramService,
                               ApplicationEventPublisher eventos) {
        this.controladoraRepository = controladoraRepository;
        this.veiculoRepository = veiculoRepository;
        this.atividadeService = atividadeService;
        this.mqttService = mqttService;
        this.mqttAcessoService = mqttAcessoService;
        this.telegramService = telegramService;
        this.eventos = eventos;
    }

    // ==========================================
    // PROVISIONAMENTO (a controladora se apresenta)
    // ==========================================

    @EventListener
    @Transactional
    public void aoReceberProvisionamento(MqttService.ProvisionamentoRecebido p) {
        String imei;
        try {
            imei = Validacoes.imeiOpcional(p.imei());
            Validacoes.senha(p.senha());
        } catch (RuntimeException e) {
            System.out.println("[Provisionamento] recusado (" + p.imeiDoTopico() + "): " + e.getMessage());
            mqttService.limparProvisionamento(p.imeiDoTopico());
            return;
        }
        // O IMEI do tópico e o da mensagem têm que ser o mesmo.
        if (imei == null || !imei.equals(p.imeiDoTopico())) {
            System.out.println("[Provisionamento] recusado: IMEI do tópico diferente do IMEI da mensagem");
            mqttService.limparProvisionamento(p.imeiDoTopico());
            return;
        }
        String versao = p.versao() == null || p.versao().isBlank() ? "?"
                : p.versao().substring(0, Math.min(p.versao().length(), TAMANHO_MAXIMO_VERSAO));

        Optional<Controladora> existente = controladoraRepository.findByImei(imei);
        if (existente.isEmpty()) {
            criarAguardando(imei, p.senha(), versao);
        } else {
            atualizarExistente(existente.get(), p.senha(), versao);
        }
        // A mensagem tem a senha: já foi lida, sai do broker.
        mqttService.limparProvisionamento(imei);
    }

    private void criarAguardando(String imei, String senha, String versao) {
        Controladora c = new Controladora();
        c.setImei(imei);
        c.setSenha(senha);
        c.setVersaoFirmware(versao);
        c.setSituacao(Controladora.AGUARDANDO);
        c.setAtivo(true);
        c.setCriadoEm(LocalDateTime.now());
        c.setUltimoContato(LocalDateTime.now());
        Controladora salva = controladoraRepository.save(c);
        atividadeService.registrar("CONTROLADORA", "Controladora nova se apresentou (IMEI " + imei
                + ", firmware " + versao + ") e aguarda aprovação");
        telegramService.avisar("CONTROLADORA", "controladoras.cadastrar",
                "📟 <b>Controladora nova</b>\nIMEI " + imei + " se apresentou e aguarda aprovação em Controladoras.");
        System.out.println("[Provisionamento] controladora #" + salva.getIdControladora() + " (IMEI " + imei + ") aguardando aprovação");
    }

    private void atualizarExistente(Controladora c, String senha, String versao) {
        // Firmware antigo cadastrado à mão com o IMEI: a partir de agora o tópico passa a ser o IMEI.
        boolean mudouDeTopico = c.getVersaoFirmware() == null && c.estaAprovada();
        c.setVersaoFirmware(versao);
        c.setUltimoContato(LocalDateTime.now());

        if (!c.estaAprovada()) {
            c.setSenha(senha); // ainda aguardando: vale sempre a última senha que ela mandou
        } else if (senha.equals(c.getSenha())) {
            c.setSenhaPendente(null); // voltou à senha aprovada: nada pendente
        } else if (!senha.equals(c.getSenhaPendente())) {
            c.setSenhaPendente(senha);
            atividadeService.registrar("CONTROLADORA", "Controladora #" + c.getIdControladora()
                    + " (IMEI " + c.getImei() + ") mandou uma senha nova; aguarda aprovação");
            telegramService.avisar("CONTROLADORA", "controladoras.cadastrar",
                    "📟 <b>Controladora pediu nova senha</b>\nIMEI " + c.getImei()
                            + (c.getVeiculo() != null ? " (" + TelegramService.esc(c.getVeiculo().getPlaca()) + ")" : "")
                            + ". Aprove a troca em Controladoras.");
        }
        controladoraRepository.save(c);
        if (mudouDeTopico) eventos.publishEvent(new ControladoraAprovada(c.getIdControladora()));
    }

    // ==========================================
    // APROVAÇÃO (gestor, pelo site)
    // ==========================================

    /**
     * Aprova a controladora (ou a troca de senha dela) e liga ao veículo escolhido.
     * Se o veículo já tinha outra controladora, ela fica sem veículo (é o caso de trocar a placa).
     */
    @Transactional
    public Controladora aprovar(Long id, Long idVeiculo, String linhaChip) {
        Controladora c = buscarPorId(id);
        boolean eraTrocaDeSenha = c.estaAprovada() && c.isTrocaDeSenhaPendente();
        if (c.estaAprovada() && !eraTrocaDeSenha) {
            throw new RuntimeException("Esta controladora já está aprovada.");
        }
        if (eraTrocaDeSenha) {
            c.setSenha(c.getSenhaPendente());
            c.setSenhaPendente(null);
        }
        c.setSituacao(Controladora.APROVADA);
        c.setLinhaChip(Validacoes.telefoneOpcional(linhaChip));
        String substituida = vincularVeiculo(c, idVeiculo);
        c.setAtualizadoEm(LocalDateTime.now());
        Controladora salva = controladoraRepository.save(c);

        atividadeService.registrar("CONTROLADORA", (eraTrocaDeSenha ? "Aprovou a nova senha da controladora #" : "Aprovou a controladora #")
                + id + " (IMEI " + c.getImei() + ")"
                + (salva.getVeiculo() != null ? " no veículo " + salva.getVeiculo().getPlaca() : "")
                + (substituida != null ? "; a controladora #" + substituida + " ficou sem veículo" : ""));
        eventos.publishEvent(new ControladoraAprovada(salva.getIdControladora()));
        return salva;
    }

    // Devolve o número da controladora que perdeu o veículo (ou null).
    private String vincularVeiculo(Controladora c, Long idVeiculo) {
        if (idVeiculo == null) return null;
        Veiculo v = veiculoRepository.findById(idVeiculo)
                .orElseThrow(() -> new RuntimeException("Veículo não encontrado."));
        Controladora anterior = v.getControladora();
        String substituida = null;
        if (anterior != null && !anterior.getIdControladora().equals(c.getIdControladora())) {
            anterior.setVeiculo(null);
            controladoraRepository.saveAndFlush(anterior); // solta o veículo antes (a coluna é única)
            substituida = String.valueOf(anterior.getIdControladora());
        }
        c.setVeiculo(v);
        return substituida;
    }

    // ==========================================
    // CONSULTA, EDIÇÃO, ATIVAR/INATIVAR, EXCLUIR
    // ==========================================

    public List<Controladora> listarTodas() {
        return controladoraRepository.findAll();
    }

    public Controladora buscarPorId(Long id) {
        return controladoraRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Controladora não encontrada no banco de dados!"));
    }

    // IMEI e senha vêm da própria controladora: aqui só o que o gestor sabe (MAC, linha, veículo).
    public Controladora atualizar(Long id, Controladora controladoraNova) {
        Controladora antiga = buscarPorId(id);

        String mac = Validacoes.macOpcional(controladoraNova.getMacControladora());
        if (mac != null && controladoraRepository.existsByMacControladoraAndIdControladoraNot(mac, id)) {
            throw new RuntimeException("Já existe uma controladora com esse MAC cadastrada!");
        }
        antiga.setMacControladora(mac);
        antiga.setLinhaChip(Validacoes.telefoneOpcional(controladoraNova.getLinhaChip()));

        Long idVeiculo = controladoraNova.getVeiculo() != null ? controladoraNova.getVeiculo().getId() : null;
        if (idVeiculo == null) antiga.setVeiculo(null);
        else vincularVeiculo(antiga, idVeiculo);
        antiga.setAtualizadoEm(LocalDateTime.now());

        Controladora atualizada = controladoraRepository.save(antiga);
        atividadeService.registrar("CONTROLADORA", "Editou a controladora " + id);
        return atualizada;
    }

    // Recusar uma controladora aguardando = excluir. Se ela ligar de novo, aparece de novo.
    public void deletar(Long id) {
        Controladora controladora = buscarPorId(id);
        controladoraRepository.deleteById(id);
        mqttAcessoService.remover(controladora);
        atividadeService.registrar("CONTROLADORA", (controladora.estaAprovada() ? "Excluiu a controladora " : "Recusou a controladora ")
                + id + (controladora.getImei() != null ? " (IMEI " + controladora.getImei() + ")" : ""));
    }

    public void inativar(Long id) {
        Controladora controladora = buscarPorId(id);

        // Se estiver ativo, inativa. Se estiver inativo, ativa.
        if (controladora.getAtivo() == null) {
            controladora.setAtivo(true); // Assume true se for nulo
        }
        controladora.setAtivo(!controladora.getAtivo());

        controladoraRepository.save(controladora);
        mqttAcessoService.sincronizar(controladora);
        atividadeService.registrar("CONTROLADORA",
                (controladora.getAtivo() ? "Ativou" : "Inativou") + " a controladora " + id);
    }
}
