package com.tcc.gestaofrota.repository;

import com.tcc.gestaofrota.model.Comando;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ComandoRepository extends JpaRepository<Comando, Long> {

    // Busca comandos PENDENTES de uma controladora, do mais antigo para o mais novo.
    // Retorna List para evitar erro quando há múltiplos pendentes.
    // O service pega apenas o primeiro da lista.
    @Query("SELECT c FROM Comando c WHERE c.controladora.idControladora = :idControladora AND c.status = 'PENDENTE' ORDER BY c.criadoEm ASC")
    List<Comando> findPendentes(@Param("idControladora") Long idControladora);

    // Lista todos os comandos de uma controladora, do mais novo para o mais antigo.
    // Usado pelo frontend para mostrar o histórico.
    List<Comando> findByControladora_IdControladoraOrderByCriadoEmDesc(Long idControladora);
}
