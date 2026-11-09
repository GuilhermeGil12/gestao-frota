package com.tcc.gestaofrota.service;


import com.tcc.gestaofrota.dto.CartaoEsp32DTO;
import com.tcc.gestaofrota.model.CartaoRfid;
import com.tcc.gestaofrota.model.Controladora;
import com.tcc.gestaofrota.repository.CartaoRfidRepository;
import com.tcc.gestaofrota.repository.ControladoraRepository;
import com.tcc.gestaofrota.repository.FuncionarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class CartaoRfidService {

    private final AtividadeService atividadeService;



    private final CartaoRfidRepository cartaoRfidRepository;
    private final FuncionarioService funcionarioService;
    private final ControladoraRepository controladoraRepository;
    private final MqttService mqttService;


    public CartaoRfidService(CartaoRfidRepository cartaoRfidRepository, FuncionarioService funcionarioService,
                             ControladoraRepository controladoraRepository, MqttService mqttService,
            AtividadeService atividadeService) {
        this.cartaoRfidRepository = cartaoRfidRepository;
        this.funcionarioService = funcionarioService;
        this.controladoraRepository = controladoraRepository;
        this.mqttService = mqttService;
        this.atividadeService = atividadeService;
    }

    // Manda a lista de cartões liberados (retida) pra uma controladora.
    public void publicarCartoes(Long idControladora) {
        mqttService.publicarCartoes(idControladora, listarUidsAtivos());
    }

    // Toda mudança em cartão vale pra frota inteira: publica pra todas as controladoras.
    public void publicarCartoesParaTodas() {
        List<String> uids = listarUidsAtivos();
        for (Controladora controladora : controladoraRepository.findAll()) {
            mqttService.publicarCartoes(controladora.getIdControladora(), uids);
        }
    }

    // O broker pode ter reiniciado e perdido as mensagens retidas: publica de novo.
    @EventListener
    public void aoConectarMqtt(MqttService.Conectado evento) {
        publicarCartoesParaTodas();
    }

    public Optional<CartaoRfid> buscarPorUid(String uid){
        return cartaoRfidRepository.findByUid(uid);
    }

    public CartaoRfid salvar(CartaoRfid cartaoRfid){
        Optional<CartaoRfid> jaExiste = cartaoRfidRepository.findByUid(cartaoRfid.getUid());
        if (jaExiste.isPresent()){
            throw new RuntimeException("Já existe um cartão com o UID '" + cartaoRfid.getUid() + "' cadastrado no sistema.");
        }

        if (cartaoRfid.getFuncionario() != null && cartaoRfid.getFuncionario().getId() != null) {
            com.tcc.gestaofrota.model.Funcionario funcionario = funcionarioService.buscarPorId(cartaoRfid.getFuncionario().getId());
            if (Boolean.FALSE.equals(funcionario.getAtivo())) {
                throw new RuntimeException("Não é possível vincular um cartão ao funcionário '" + funcionario.getNome() + "' pois ele está inativo.");
            }
            // CNH pendente: o cartão é cadastrado, mas já nasce bloqueado (libera ao validar a CNH).
            if (Boolean.TRUE.equals(funcionario.getCnhPendente())) {
                cartaoRfid.setAtivo(false);
                cartaoRfid.setBloqueadoPorCnh(true);
            }
        }

        CartaoRfid salvo = cartaoRfidRepository.save(cartaoRfid);
        atividadeService.registrar("CARTAO", "Cadastrou o cartão " + salvo.getUid() + (salvo.getFuncionario() != null ? " de " + salvo.getFuncionario().getNome() : ""));
        publicarCartoesParaTodas();
        return salvo;
    }
    // metodo listar cartão por funcionário
    public List<CartaoRfid> listarPorFuncionario(Long funcionarioId) {

        //validação para verificar se existe o funcionário
        funcionarioService.buscarPorId(funcionarioId);


        return cartaoRfidRepository.findByFuncionarioIdAndAtivoTrue(funcionarioId);
    }

    public CartaoRfid buscarPorId(Long id){
        Optional<CartaoRfid> caixaMisteriosa = cartaoRfidRepository.findById(id);

        if (caixaMisteriosa.isEmpty()){
            throw new RuntimeException("Cartão não encontrado no banco de dados!");
        }

        return caixaMisteriosa.get();
    }

    public void deletar(Long id){
        CartaoRfid excluido = buscarPorId(id);

        cartaoRfidRepository.deleteById(id);
        atividadeService.registrar("CARTAO", "Excluiu o cartão " + excluido.getUid() + (excluido.getFuncionario() != null ? " de " + excluido.getFuncionario().getNome() : ""));
        publicarCartoesParaTodas();
    }

    //inativar cartao
    public void inativar(Long id){
        CartaoRfid cartao = buscarPorId(id);

        cartao.setAtivo(false);

        cartaoRfidRepository.save(cartao);
        atividadeService.registrar("CARTAO", "Inativou o cartão " + cartao.getUid() + (cartao.getFuncionario() != null ? " de " + cartao.getFuncionario().getNome() : ""));
        publicarCartoesParaTodas();
    }

    public void ativar(Long id) {
        CartaoRfid cartao = cartaoRfidRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cartão não encontrado"));

        if (cartao.getFuncionario() != null && Boolean.TRUE.equals(cartao.getFuncionario().getCnhPendente())) {
            throw new RuntimeException("A CNH de " + cartao.getFuncionario().getNome()
                    + " está pendente. Valide a CNH em Funcionários para liberar o cartão.");
        }

        cartao.setAtivo(true);
        cartao.setBloqueadoPorCnh(false);
        cartaoRfidRepository.save(cartao);
        atividadeService.registrar("CARTAO", "Ativou o cartão " + cartao.getUid() + (cartao.getFuncionario() != null ? " de " + cartao.getFuncionario().getNome() : ""));
        publicarCartoesParaTodas();
    }

    public String listarParaEsp32() {
        return cartaoRfidRepository.findByAtivoTrue().stream()
                .map(cartao ->
                        cartao.getUid().replace(" ", "") + "," + cartao.getFuncionario().getNivelMotorista()
                )
                .collect(Collectors.joining(";")); // Une tudo com ; entre eles
    }

    // Retorna apenas os UIDs ativos em formato de lista.
    // Usado pelo novo ESP (T-A7670G) que espera JSON: ["UID1","UID2",...]
    public List<String> listarUidsAtivos() {
        return cartaoRfidRepository.findByAtivoTrue().stream()
                .map(cartao -> cartao.getUid().replace(" ", ""))
                .collect(Collectors.toList());
    }



}
