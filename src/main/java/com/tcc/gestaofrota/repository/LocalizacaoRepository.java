package com.tcc.gestaofrota.repository;

import com.tcc.gestaofrota.model.Localizacao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Date;
import java.util.List;
import java.util.Optional;

public interface LocalizacaoRepository extends JpaRepository <Localizacao, Long> {

    // Aqui o Spring injeta automaticamente comandos como save(), findAll(), findById(), etc.
     Optional<Localizacao> findByVeiculoId(Long id);

    Optional<Localizacao> findByMotorista(String motorista);

    //buscar pela data
    Optional<Localizacao> findByDataHora(Date dataHora);

    @Query("SELECT l FROM Localizacao l WHERE l.veiculo.id = :idVeiculo " +
            "AND l.dataHora >= :inicio AND l.dataHora < :fim " +
            "ORDER BY l.dataHora ASC")
    List<Localizacao> buscarRotaPorDia(@Param("idVeiculo") Long idVeiculo,
                                       @Param("inicio") LocalDateTime inicio,
                                       @Param("fim") LocalDateTime fim);




    Optional<Localizacao> findTopByVeiculoIdOrderByDataHoraDesc(Long veiculoId);

    @Query("SELECT l FROM Localizacao l WHERE l.veiculo.id = :veiculoId AND l.velocidade > 110 AND l.dataHora BETWEEN :inicio AND :fim")
    List<Localizacao> buscarAlertaPorVeiculo(
            @Param("veiculoId") Long veiculoId,
            @Param("inicio") LocalDateTime inicio,
            @Param("fim") LocalDateTime fim
    );

    // Repare no final: l.dataHora BETWEEN :inicio AND :fim
    @Query("SELECT l FROM Localizacao l WHERE l.velocidade > 110 AND l.dataHora BETWEEN :inicio AND :fim")
    List<Localizacao> buscarTodosAlertasNoPeriodo(
            @Param("inicio") LocalDateTime inicio,
            @Param("fim") LocalDateTime fim
    );

    @Query("SELECT l FROM Localizacao l WHERE l.dataHora = " +
            "(SELECT MAX(l2.dataHora) FROM Localizacao l2 WHERE l2.veiculo = l.veiculo)")
    List<Localizacao> buscarUltimaDeCadaVeiculo();

    List<Localizacao> findByDataHoraBetweenOrderByDataHoraAsc(LocalDateTime inicio, LocalDateTime fim);
}
