package com.tcc.gestaofrota.service;


import com.tcc.gestaofrota.model.Controladora;
import com.tcc.gestaofrota.repository.ControladoraRepository;
import org.aspectj.apache.bcel.classfile.Module;
import org.springframework.expression.spel.ast.OpAnd;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;


@Service
public class ControladoraService {


    private final ControladoraRepository controladoraRepository;

    /**
     * Construtor utilizado para a Injeção de Dependências (Padrão Ouro do Spring Boot).
     * * Por que usamos o construtor em vez de colocar @Autowired direto na variável?
     * 1. Segurança: Permite usar a palavra 'final' na variável do repositório, garantindo
     * que ela nunca seja substituída ou fique nula durante a execução.
     * 2. Testabilidade: Cria uma "porta de entrada" clara, permitindo injetar um
     * repositório falso (Mock) facilmente na hora de criar Testes Unitários.
     * 3. Clareza de Design: Deixa explícito que o Service depende obrigatoriamente
     * deste repositório para ser instanciado e funcionar.
     */

    public ControladoraService(ControladoraRepository controladoraRepository) {
        this.controladoraRepository = controladoraRepository;
    }

    public Controladora salvar(Controladora controladora){


        if (controladoraRepository.existsByIpControladora(controladora.getIpControladora())){
            throw new RuntimeException("Já existe uma controladora com esse IP cadastrada!");

        }
        if (controladoraRepository.existsByMacControladora(controladora.getMacControladora())){
            throw new RuntimeException("Já existe uma controladora com esse MAC cadastrada!");
        }

        // Primeiro verificamos se o front-end mandou um veículo e se ele tem ID.
        // Depois fazemos a busca rápida no banco só pelo número do ID!
        if (controladora.getVeiculo() != null && controladora.getVeiculo().getId() != null) {
            if (controladoraRepository.existsByVeiculoId(controladora.getVeiculo().getId())) {
                throw new RuntimeException("Este veículo já possui uma controladora vinculada!");
            }
        }
        return controladoraRepository.save(controladora);
    }

    public List<Controladora> listarTodas(){
        return controladoraRepository.findAll();
    }

    public Controladora buscarPorId(Long id){
        Optional<Controladora> caixaMisteriosa = controladoraRepository.findById(id);

        if (caixaMisteriosa.isEmpty()){
            throw new RuntimeException("Controladora não encontrada no banco de dados!");
        }

        //Se a caixa não está vazia, nós pegamos a permissão lá de dentro e devolvemos
        return caixaMisteriosa.get();
    }

    public Controladora atualizar(Long id, Controladora controladoraNova){

        Controladora controladoraAntiga = buscarPorId(id);

        //pego o valor que está na nova (vem do body) e pego da nova e coloco na antiga e depois descarto a antiga
        controladoraAntiga.setIpControladora(controladoraNova.getIpControladora());
        controladoraAntiga.setMacControladora(controladoraNova.getMacControladora());
        controladoraAntiga.setSenha(controladoraNova.getSenha());

        controladoraAntiga.setVeiculo(controladoraNova.getVeiculo());

        return controladoraRepository.save(controladoraAntiga);

    }

    public void deletar(Long id){
        buscarPorId(id);

        controladoraRepository.deleteById(id);
    }

    public void inativar(Long id){
        Controladora controladora = buscarPorId(id);

        // Se estiver ativo, inativa. Se estiver inativo, ativa.
        if (controladora.getAtivo() == null) {
            controladora.setAtivo(true); // Assume true se for nulo
        }
        controladora.setAtivo(!controladora.getAtivo());

        controladoraRepository.save(controladora);
    }
}
