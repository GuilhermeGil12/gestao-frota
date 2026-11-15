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

    // Limite de velocidade do veículo em JPQL: o cadastrado, ou 110 km/h se não tiver.
    String LIMITE_DO_VEICULO = "(CASE WHEN l.veiculo.velocidadeMaxima IS NULL OR l.veiculo.velocidadeMaxima <= 0"
            + " THEN 110 ELSE l.veiculo.velocidadeMaxima END)";


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

    // Alerta = ponto acima do limite DO VEÍCULO (sem limite cadastrado, vale 110 km/h). Mais recentes primeiro.
    @Query("SELECT l FROM Localizacao l WHERE l.veiculo.id = :veiculoId AND l.velocidade > " + LIMITE_DO_VEICULO
            + " AND l.dataHora BETWEEN :inicio AND :fim ORDER BY l.dataHora DESC")
    List<Localizacao> buscarAlertaPorVeiculo(
            @Param("veiculoId") Long veiculoId,
            @Param("inicio") LocalDateTime inicio,
            @Param("fim") LocalDateTime fim
    );

    @Query("SELECT l FROM Localizacao l WHERE l.velocidade > " + LIMITE_DO_VEICULO
            + " AND l.dataHora BETWEEN :inicio AND :fim ORDER BY l.dataHora DESC")
    List<Localizacao> buscarTodosAlertasNoPeriodo(
            @Param("inicio") LocalDateTime inicio,
            @Param("fim") LocalDateTime fim
    );

    @Query("SELECT l FROM Localizacao l WHERE l.dataHora = " +
            "(SELECT MAX(l2.dataHora) FROM Localizacao l2 WHERE l2.veiculo = l.veiculo)")
    List<Localizacao> buscarUltimaDeCadaVeiculo();

    List<Localizacao> findByDataHoraBetweenOrderByDataHoraAsc(LocalDateTime inicio, LocalDateTime fim);

    List<Localizacao> findByVeiculoIdAndDataHoraBetweenOrderByDataHoraAsc(Long idVeiculo, LocalDateTime inicio, LocalDateTime fim);
}
