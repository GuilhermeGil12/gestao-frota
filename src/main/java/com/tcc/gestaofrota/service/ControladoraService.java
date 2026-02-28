package com.tcc.gestaofrota.service;


import com.tcc.gestaofrota.model.Controladora;
import com.tcc.gestaofrota.repository.ControladoraRepository;
import org.springframework.stereotype.Service;



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
}
