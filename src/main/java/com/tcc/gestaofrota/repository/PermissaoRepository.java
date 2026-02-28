package com.tcc.gestaofrota.repository;

import com.tcc.gestaofrota.model.Permissao;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PermissaoRepository extends JpaRepository <Permissao, Long> {


    Optional<Permissao> findByNomePermissao(String nomePermissao);
}
