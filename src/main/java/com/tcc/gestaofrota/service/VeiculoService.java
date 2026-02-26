package com.tcc.gestaofrota.service;


import com.tcc.gestaofrota.model.Veiculo;
import com.tcc.gestaofrota.repository.VeiculoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class VeiculoService {

    @Autowired
    private VeiculoRepository veiculoRepository;

    public Optional<Veiculo> buscarPorPlaca(String placa){
        return veiculoRepository.findByPlaca(placa);
    }

    public Veiculo salvar(Veiculo veiculo){

        Optional<Veiculo> jaExiste = veiculoRepository.findByPlaca(veiculo.getPlaca());
        if(jaExiste.isPresent()){
           throw new RuntimeException("Já existe Veículo com essa Placa cadastrada!");
       }

        Optional<Veiculo> renavamExiste = veiculoRepository.findByRenavam(veiculo.getRenavam());
        if(renavamExiste.isPresent()){
            throw new RuntimeException("Já existe Veículo com esse Renavam cadastrado!");
        }

        return veiculoRepository.save(veiculo);


    }

}
