package com.tcc.gestaofrota.service;

import com.tcc.gestaofrota.model.Cerca;
import com.tcc.gestaofrota.repository.CercaRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class CercaService {

    private final AtividadeService atividadeService;

    private final CercaRepository cercaRepository;

    public CercaService(CercaRepository cercaRepository,
            AtividadeService atividadeService) {
        this.cercaRepository = cercaRepository;
        this.atividadeService = atividadeService;
    }

    public List<Cerca> listarAtivas() {
        return cercaRepository.findByAtivoTrue();
    }

    public List<Cerca> listarTodas() {
        return cercaRepository.findAll();
    }

    public Cerca buscarPorId(Long id) {
        return cercaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cerca não encontrada!"));
    }

    public Cerca salvar(Cerca cerca) {
        Cerca salva = cercaRepository.save(cerca);
        atividadeService.registrar("CERCA", "Cadastrou a cerca " + salva.getNome());
        return salva;
    }

    public Cerca atualizar(Long id, Cerca cercaNova) {
        Cerca cercaAntiga = buscarPorId(id);
        cercaAntiga.setNome(cercaNova.getNome());
        cercaAntiga.setLatitude(cercaNova.getLatitude());
        cercaAntiga.setLongitude(cercaNova.getLongitude());
        cercaAntiga.setRaio(cercaNova.getRaio());
        cercaAntiga.setAtivo(cercaNova.getAtivo());
        cercaAntiga.setFuncionario(cercaNova.getFuncionario());
        Cerca atualizada = cercaRepository.save(cercaAntiga);
        atividadeService.registrar("CERCA", "Editou a cerca " + atualizada.getNome());
        return atualizada;
    }

    public void deletar(Long id) {
        Cerca cerca = buscarPorId(id);
        cercaRepository.deleteById(id);
        atividadeService.registrar("CERCA", "Excluiu a cerca " + cerca.getNome());
    }
}