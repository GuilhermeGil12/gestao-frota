package com.tcc.gestaofrota.repository;

import com.tcc.gestaofrota.model.CodigoRecuperacao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CodigoRecuperacaoRepository extends JpaRepository<CodigoRecuperacao, Long> {

    List<CodigoRecuperacao> findByUsuarioIdAndUsadoFalse(Long usuarioId);

    Optional<CodigoRecuperacao> findTopByUsuarioIdOrderByCriadoEmDesc(Long usuarioId);

    @Modifying
    @Query("UPDATE CodigoRecuperacao c SET c.usado = true WHERE c.usuario.id = :usuarioId AND c.usado = false")
    void invalidarPendentes(@Param("usuarioId") Long usuarioId);
}
