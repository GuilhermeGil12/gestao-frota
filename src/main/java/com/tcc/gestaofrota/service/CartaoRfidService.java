package com.tcc.gestaofrota.service;


import com.tcc.gestaofrota.dto.CartaoEsp32DTO;
import com.tcc.gestaofrota.model.CartaoRfid;
import com.tcc.gestaofrota.repository.CartaoRfidRepository;
import com.tcc.gestaofrota.repository.FuncionarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class CartaoRfidService {



    private final CartaoRfidRepository cartaoRfidRepository;
    private final FuncionarioService funcionarioService;


    public CartaoRfidService(CartaoRfidRepository cartaoRfidRepository, FuncionarioService funcionarioService) {
        this.cartaoRfidRepository = cartaoRfidRepository;
        this.funcionarioService = funcionarioService;
    }

    public Optional<CartaoRfid> buscarPorUid(String uid){
        return cartaoRfidRepository.findByUid(uid);
    }

    public CartaoRfid salvar(CartaoRfid cartaoRfid){
        Optional<CartaoRfid> jaExiste = cartaoRfidRepository.findByUid(cartaoRfid.getUid());
        if (jaExiste.isPresent()){
            throw new RuntimeException("Já existe um cartão com esse UID cadastrado!");
        }

        return cartaoRfidRepository.save(cartaoRfid);
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
        buscarPorId(id);

        cartaoRfidRepository.deleteById(id);
    }

    //inativar cartao
    public void inativar(Long id){
        CartaoRfid cartao = buscarPorId(id);

        cartao.setAtivo(false);

        cartaoRfidRepository.save(cartao);
    }

    public void ativar(Long id) {
        CartaoRfid cartao = cartaoRfidRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cartão não encontrado"));

        cartao.setAtivo(true);
        cartaoRfidRepository.save(cartao);
    }

    public String listarParaEsp32() {
        return cartaoRfidRepository.findByAtivoTrue().stream()
                .map(cartao ->
                        cartao.getUid().replace(" ", "") + "," + cartao.getFuncionario().getNivelMotorista()
                )
                .collect(Collectors.joining(";")); // Une tudo com ; entre eles
    }



}
