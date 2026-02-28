package com.tcc.gestaofrota.service;


import com.tcc.gestaofrota.model.CartaoRfid;
import com.tcc.gestaofrota.repository.CartaoRfidRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class CartaoRfidService {

    private final CartaoRfidRepository cartaoRfidRepository;

    public CartaoRfidService(CartaoRfidRepository cartaoRfidRepository) {
        this.cartaoRfidRepository = cartaoRfidRepository;
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

}
