package com.tcc.gestaofrota.repository;


import com.tcc.gestaofrota.model.Veiculo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;


/**
 * Interface que aplica o padrão DAO (Data Access Object) para a entidade Funcionario.
 * * Ao estender JpaRepository, o Spring Data JPA gera automaticamente a implementação
 * dos métodos fundamentais de CRUD (Create, Read, Update, Delete) em tempo de execução.
 * * @param <Funcionario> Tipo da entidade que este repositório gerencia.
 * @param <Long> Tipo do identificador (Chave Primária) da entidade.
 */

@Repository
public interface VeiculoRepository extends JpaRepository<Veiculo, Long> {
    // Aqui o Spring injeta automaticamente comandos como save(), findAll(), findById(), etc.

     Optional<Veiculo> findByPlaca(String placa);

     Optional<Veiculo> findByRenavam(String renavam);

}


