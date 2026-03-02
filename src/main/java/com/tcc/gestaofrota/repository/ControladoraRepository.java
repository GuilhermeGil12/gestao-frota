package com.tcc.gestaofrota.repository;

import com.tcc.gestaofrota.model.Controladora;
import com.tcc.gestaofrota.model.Veiculo;
import org.aspectj.weaver.ast.And;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;


public interface ControladoraRepository extends JpaRepository <Controladora, Long> {

    //O objetivo do existsBy é bloquear repetições
    boolean existsByVeiculoId(Long idVeiculo);

    boolean existsByIpControladora(String ipControladora);

    boolean existsByMacControladora(String macControladora);

    Optional<Controladora> findByIdControladoraAndSenha(Long idControladora, String senha);

    Long idControladora(Long idControladora);
}
