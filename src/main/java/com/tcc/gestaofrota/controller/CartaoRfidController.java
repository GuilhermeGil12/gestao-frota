package com.tcc.gestaofrota.controller;


import com.tcc.gestaofrota.model.CartaoRfid;

import com.tcc.gestaofrota.service.CartaoRfidService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cartaorfid")
public class CartaoRfidController
{
    private final CartaoRfidService cartaoRfidService;

    public CartaoRfidController(CartaoRfidService cartaoRfidService) {
        this.cartaoRfidService = cartaoRfidService;
    }

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

    @GetMapping("/funcionario/{funcionarioId}")
    public ResponseEntity<List<CartaoRfid>> listarPorFuncionario(@PathVariable Long funcionarioId) {
        List<CartaoRfid> cartoes = cartaoRfidService.listarPorFuncionario(funcionarioId);
        return ResponseEntity.ok(cartoes);
    }
}
