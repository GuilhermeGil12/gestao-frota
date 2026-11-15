package com.tcc.gestaofrota.repository;

import com.tcc.gestaofrota.model.Controladora;
import com.tcc.gestaofrota.model.Veiculo;
import org.aspectj.weaver.ast.And;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;


public interface ControladoraRepository extends JpaRepository <Controladora, Long> {

    //O objetivo do existsBy é bloquear repetições
    boolean existsByVeiculoId(Long idVeiculo);

    boolean existsByMacControladora(String macControladora);

    boolean existsByImei(String imei);

    // Na edição: outra controladora (que não seja esta) já usa o MAC/IMEI?
    boolean existsByMacControladoraAndIdControladoraNot(String macControladora, Long idControladora);

    boolean existsByImeiAndIdControladoraNot(String imei, Long idControladora);

    Optional<Controladora> findByIdControladoraAndSenha(Long idControladora, String senha);

    Long idControladora(Long idControladora);
}
