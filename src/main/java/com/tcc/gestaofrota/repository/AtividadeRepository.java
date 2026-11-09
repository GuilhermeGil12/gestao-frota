package com.tcc.gestaofrota.repository;

import com.tcc.gestaofrota.model.Atividade;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface AtividadeRepository extends JpaRepository<Atividade, Long> {

    List<Atividade> findTop1000ByDataHoraBetweenOrderByDataHoraDesc(LocalDateTime inicio, LocalDateTime fim);

    List<Atividade> findTop1000ByCategoriaAndDataHoraBetweenOrderByDataHoraDesc(String categoria, LocalDateTime inicio, LocalDateTime fim);
}
