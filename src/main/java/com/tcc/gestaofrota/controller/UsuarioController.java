package com.tcc.gestaofrota.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.tcc.gestaofrota.model.Usuario;
import com.tcc.gestaofrota.service.RecuperacaoSenhaService;
import com.tcc.gestaofrota.service.UsuarioService;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;
import java.util.Map;


@RestController
@RequestMapping("/api/usuario")
@PreAuthorize("hasAuthority('configuracoes.usuarios')")
public class UsuarioController {
    

    private final UsuarioService usuarioService;
    private final RecuperacaoSenhaService recuperacaoSenhaService;

    public UsuarioController(UsuarioService usuarioService, RecuperacaoSenhaService recuperacaoSenhaService){
        this.usuarioService = usuarioService;
        this.recuperacaoSenhaService = recuperacaoSenhaService;
    }

    @PostMapping
    public ResponseEntity<Usuario> criar(@RequestBody Map<String, Object> usuario){


        Usuario novoUsuario = usuarioService.criar(usuario);
        return ResponseEntity.status(201).body(novoUsuario);

    }

    @GetMapping
    public ResponseEntity<List<Usuario>> listarTodos(){
        List<Usuario> lista = usuarioService.listarTodos();

        return ResponseEntity.ok(lista);
    }

    @GetMapping("/email/{email}")
    public ResponseEntity<Usuario> buscarPorEmail(@PathVariable String email){
        return usuarioService.buscarPorEmail(email)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Usuario> atualizar(@PathVariable Long id, @RequestBody Map<String, Object> dados){
        Usuario usuarioAtualizado = usuarioService.atualizar(id, dados);

        return ResponseEntity.ok(usuarioAtualizado);
    }

    @PatchMapping("/inativar/{id}")
    public  ResponseEntity<Usuario> inativar(@PathVariable Long id){
        Usuario usuarioInativado = usuarioService.toggleAtivo(id);

        return ResponseEntity.ok(usuarioInativado);
    }

    @PostMapping("/{id}/codigo-recuperacao")
    public ResponseEntity<Void> solicitarCodigo(@PathVariable Long id){
        recuperacaoSenhaService.solicitarCodigo(id);

        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/validar-codigo")
    public ResponseEntity<Void> validarCodigo(@PathVariable Long id, @RequestBody Map<String, Object> dados){
        Object codigo = dados.get("codigo");

        if (codigo == null) {
            throw new RuntimeException("Informe o código");
        }

        recuperacaoSenhaService.validarCodigo(id, codigo.toString());

        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/redefinir-senha")
    public ResponseEntity<Void> redefinirSenha(@PathVariable Long id, @RequestBody Map<String, Object> dados){
        Object codigo = dados.get("codigo");
        Object novaSenha = dados.get("novaSenha");

        if (codigo == null || novaSenha == null) {
            throw new RuntimeException("Informe o código e a nova senha");
        }

        recuperacaoSenhaService.redefinirSenha(id, codigo.toString(), novaSenha.toString());

        return ResponseEntity.noContent().build();
    }
}
