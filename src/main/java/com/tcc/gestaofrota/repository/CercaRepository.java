package com.tcc.gestaofrota.repository;

import com.tcc.gestaofrota.model.Cerca;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CercaRepository extends JpaRepository<Cerca, Long> {
    List<Cerca> findByAtivoTrue();
    List<Cerca> findByFuncionarioId(Long funcionarioId);
}