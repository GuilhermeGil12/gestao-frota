package com.tcc.gestaofrota.repository;

import com.tcc.gestaofrota.model.Controladora;
import com.tcc.gestaofrota.model.Veiculo;
import org.springframework.data.jpa.repository.JpaRepository;



public interface ControladoraRepository extends JpaRepository <Controladora, Long> {

    //O objetivo do existsBy é bloquear repetições
    boolean existsByVeiculoId(Long idVeiculo);

    boolean existsByIpControladora(String ipControladora);

    boolean existsByMacControladora(String macControladora);
}
