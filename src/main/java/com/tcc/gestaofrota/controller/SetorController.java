package com.tcc.gestaofrota.controller;

import com.tcc.gestaofrota.dto.SetorDTO;
import com.tcc.gestaofrota.model.Setor;
import com.tcc.gestaofrota.service.SetorService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/setores")
public class SetorController {

    private final SetorService setorService;

    public SetorController(SetorService setorService) {
        this.setorService = setorService;
    }

    // Também usado pelo cadastro de funcionários (escolher o setor), pela tela de Permissões
    // e pelo cadastro de usuários (papel inicial do setor).
    @PreAuthorize("hasAnyAuthority('configuracoes.setores', 'configuracoes.permissoes', 'configuracoes.usuarios', 'funcionarios.visualizar')")
    @GetMapping
    public ResponseEntity<List<SetorDTO>> listarSetores(){
        return ResponseEntity.ok(setorService.listarResumo());
    }

    @PreAuthorize("hasAuthority('configuracoes.setores')")
    @PostMapping
    public Setor salvar(@RequestBody  Setor setor){
        Setor setorSalvo = setorService.salvar(setor);
        return setorSalvo;
    }

    @PreAuthorize("hasAuthority('configuracoes.setores')")
    @PutMapping("/{id}")
    public ResponseEntity<Setor> atualizar(@PathVariable Long id, @RequestBody Setor setor) {
        return ResponseEntity.ok(setorService.atualizar(id, setor));
    }

    @PreAuthorize("hasAuthority('configuracoes.setores')")
    @PatchMapping("/{id}/ativo")
    public ResponseEntity<Setor> alternarAtivo(@PathVariable Long id) {
        return ResponseEntity.ok(setorService.alternarAtivo(id));
    }

    // Papel inicial do setor. Body: ["veiculos.visualizar", "comandos.bloquear", ...]
    @PreAuthorize("hasAuthority('configuracoes.permissoes')")
    @PutMapping("/{id}/permissoes")
    public ResponseEntity<SetorDTO> salvarPermissoes(@PathVariable Long id, @RequestBody List<String> permissoes) {
        return ResponseEntity.ok(setorService.salvarPermissoes(id, permissoes));
    }
}
