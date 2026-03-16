package com.tcc.gestaofrota.repository;

import com.tcc.gestaofrota.model.Localizacao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
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
            "AND CAST(l.dataHora AS date) = :data " +
            "ORDER BY l.dataHora ASC")
    List<Localizacao> buscarRotaPorDia(@Param("idVeiculo") Long idVeiculo, @Param("data") LocalDate data);


    /*findTop: Busque apenas o PRIMEIRO resultado (Limit 1).

    ByVeiculoId: Onde o ID do veículo seja igual ao número que eu passar.

    OrderByDataHoraDesc: Organize pela data e hora do GPS, do mais novo para o mais velho (Decrescente).

    Optional<>: Como vimos antes, é a nossa "Caixa Misteriosa". Se o carro for zero km e nunca tiver andado, a caixa volta vazia e não quebra o sistema.

     */

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
}
