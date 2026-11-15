package com.tcc.gestaofrota.repository;

import com.tcc.gestaofrota.model.Setor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;


@Repository
public interface SetorRepository extends JpaRepository<Setor, Long> {


    Optional<Setor> findByNome(String nome);
    Optional<Setor> findByAtivoTrue();

    // Setores liderados por alguém.
    List<Setor> findByLider_Id(Long idLider);

    // Setores cujo líder está inativo.
    List<Setor> findByLider_AtivoFalse();



}
