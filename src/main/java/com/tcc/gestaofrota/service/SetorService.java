package com.tcc.gestaofrota.service;


import com.tcc.gestaofrota.model.Setor;
import com.tcc.gestaofrota.repository.SetorRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class SetorService {

    private final SetorRepository setorRepository;


    public SetorService(SetorRepository setorRepository) {
        this.setorRepository = setorRepository;
    }

    public List<Setor> listarSetores(){
        return setorRepository.findAll();
    }



    public Setor salvar(Setor setor) {

        if(setor.getNome() == null) {
         throw new RuntimeException("Setor não cadastrado! Necessário inserir o nome do setor.");
        }
        Optional<Setor> setorSalvo = setorRepository.findByNome(setor.getNome());

        if(setorSalvo.isPresent()){
            throw new RuntimeException("Já existe um setor com esse nome cadastrado!");
        }

        Setor salvo = setorRepository.save(setor);
        System.out.println("Setor " + setor.getNome() +  " salvo com sucesso!");
        return salvo;

    }
}
