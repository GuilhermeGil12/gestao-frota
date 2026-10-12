package com.tcc.gestaofrota.repository;

import com.tcc.gestaofrota.model.Permissao;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface PermissaoRepository extends JpaRepository <Permissao, Long> {


    Optional<Permissao> findByNomePermissao(String nomePermissao);

    List<Permissao> findByNomePermissaoIn(Set<String> nomes);
}
