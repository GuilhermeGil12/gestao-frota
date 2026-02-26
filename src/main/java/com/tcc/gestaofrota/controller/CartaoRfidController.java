package com.tcc.gestaofrota.controller;


import com.tcc.gestaofrota.model.CartaoRfid;

import com.tcc.gestaofrota.service.CartaoRfidService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cartaorfid")
public class CartaoRfidController
{
    @Autowired
    private CartaoRfidService cartaoRfidService;

    @PostMapping
    public ResponseEntity<CartaoRfid> criar(@RequestBody CartaoRfid cartaoRfid){
        CartaoRfid novoCartao = cartaoRfidService.salvar(cartaoRfid);
        return ResponseEntity.ok(novoCartao);
    }

    @GetMapping("/uid/{uid}")
    public ResponseEntity<CartaoRfid> buscarPorUid(@PathVariable String uid){
        return cartaoRfidService.buscarPorUid(uid)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
