package com.tcc.gestaofrota.repository;

import com.tcc.gestaofrota.model.Controladora;
import com.tcc.gestaofrota.model.Veiculo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;


public interface ControladoraRepository extends JpaRepository <Controladora, Long> {

    //O objetivo do existsBy é bloquear repetições
    boolean existsByVeiculoId(Long idVeiculo);

    boolean existsByMacControladora(String macControladora);

    boolean existsByImei(String imei);

    // Na edição: outra controladora (que não seja esta) já usa o MAC/IMEI?
    boolean existsByMacControladoraAndIdControladoraNot(String macControladora, Long idControladora);

    boolean existsByImeiAndIdControladoraNot(String imei, Long idControladora);

    Optional<Controladora> findByImei(String imei);

    // Controladoras esperando aprovação (sino de notificações).
    List<Controladora> findBySituacao(String situacao);

    Long idControladora(Long idControladora);
}
