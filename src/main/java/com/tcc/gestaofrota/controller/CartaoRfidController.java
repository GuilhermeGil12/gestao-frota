package com.tcc.gestaofrota.controller;


import com.tcc.gestaofrota.dto.CartaoEsp32DTO;
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

    @PatchMapping("/{id}/inativar")
    public ResponseEntity<Void> inativar(@PathVariable Long id){
        cartaoRfidService.inativar(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id){
        cartaoRfidService.deletar(id);

        return ResponseEntity.noContent().build();
    }

    @GetMapping(value = "/dispositivos", produces = "text/plain")
    public ResponseEntity<String> listarParaEsp32() {
        String dados = cartaoRfidService.listarParaEsp32();
        return ResponseEntity.ok(dados);
    }

    @PatchMapping("/{id}/ativar")
    public ResponseEntity<Void> ativar(@PathVariable Long id){
        cartaoRfidService.ativar(id);
        return ResponseEntity.noContent().build();
    }

}
