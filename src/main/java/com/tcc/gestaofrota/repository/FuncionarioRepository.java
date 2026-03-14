package com.tcc.gestaofrota.repository;



import com.tcc.gestaofrota.model.Funcionario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FuncionarioRepository  extends JpaRepository<Funcionario, Long> {

    Optional<Funcionario> findByNome(String nome);

    Optional<Funcionario> findByCpf(String cpf);

    Optional<Funcionario> findByRg(String rg);


}
