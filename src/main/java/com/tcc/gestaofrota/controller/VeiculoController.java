package com.tcc.gestaofrota.controller;

import com.tcc.gestaofrota.model.Veiculo;
import com.tcc.gestaofrota.service.VeiculoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/veiculos")
@CrossOrigin(origins = "*") // Permite que o React acesse este Controller
public class VeiculoController {

    private final VeiculoService veiculoService;

    public VeiculoController(VeiculoService veiculoService) {
        this.veiculoService = veiculoService;
    }

    // 1. Método para cadastrar um novo veículo
    @PostMapping
    public ResponseEntity<Veiculo> criar(@RequestBody Veiculo veiculo) {
        Veiculo novoVeiculo = veiculoService.salvar(veiculo);
        return ResponseEntity.ok(novoVeiculo);
    }

    // 2. Método que o React usará para preencher o Select de Rotas
    @GetMapping
    public ResponseEntity<List<Veiculo>> listarTodas() {
        // O garçom (Controller) pede para o cozinheiro (Service) a lista
        List<Veiculo> lista = veiculoService.listarTodas();
        // Entrega a lista com status 200 OK
        return ResponseEntity.ok(lista);
    }

    // 3. Método para buscar um veículo específico pela placa
    @GetMapping("/placa/{placa}")
    public ResponseEntity<Veiculo> buscarPorPlaca(@PathVariable String placa) {
        return veiculoService.buscarPorPlaca(placa)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // 4. Método para atualizar dados de um veículo existente
    @PutMapping("/{id}")
    public ResponseEntity<Veiculo> atualizar(@PathVariable Long id, @RequestBody Veiculo veiculoNovo) {
        Veiculo veiculoAtualizado = veiculoService.atualizar(id, veiculoNovo);
        return ResponseEntity.ok(veiculoAtualizado);
    }

    // 5. Método para remover um veículo do sistema
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        veiculoService.deletar(id);
        return ResponseEntity.noContent().build();
    }
}