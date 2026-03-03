package com.tcc.gestaofrota.repository;

import com.tcc.gestaofrota.model.Localizacao;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Date;
import java.util.Optional;

public interface LocalizacaoRepository extends JpaRepository <Localizacao, Long> {

    // Aqui o Spring injeta automaticamente comandos como save(), findAll(), findById(), etc.
     Optional<Localizacao> findByVeiculoId(Long id);

    Optional<Localizacao> findByMotorista(String motorista);

    //buscar pela data
    Optional<Localizacao> findByDataHora(Date dataHora);

}
