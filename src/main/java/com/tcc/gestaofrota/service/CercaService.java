package com.tcc.gestaofrota.service;

import com.tcc.gestaofrota.model.Cerca;
import com.tcc.gestaofrota.repository.CercaRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class CercaService {

    private final CercaRepository cercaRepository;

    public CercaService(CercaRepository cercaRepository) {
        this.cercaRepository = cercaRepository;
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
        return cercaRepository.save(cerca);
    }

    public Cerca atualizar(Long id, Cerca cercaNova) {
        Cerca cercaAntiga = buscarPorId(id);
        cercaAntiga.setNome(cercaNova.getNome());
        cercaAntiga.setLatitude(cercaNova.getLatitude());
        cercaAntiga.setLongitude(cercaNova.getLongitude());
        cercaAntiga.setRaio(cercaNova.getRaio());
        cercaAntiga.setAtivo(cercaNova.getAtivo());
        cercaAntiga.setFuncionario(cercaNova.getFuncionario());
        return cercaRepository.save(cercaAntiga);
    }

    public void deletar(Long id) {
        buscarPorId(id);
        cercaRepository.deleteById(id);
    }
}