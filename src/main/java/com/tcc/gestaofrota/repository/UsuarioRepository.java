package com.tcc.gestaofrota.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.tcc.gestaofrota.model.Usuario;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    
    Optional<Usuario> findByEmail(String email);
    boolean existsByFuncionarioId(Long funcionarioId);
    Optional<Usuario> findByFuncionarioId(Long funcionarioId);

    // Usuários cujo funcionário pertence ao setor.
    List<Usuario> findByFuncionario_Setor_Id(Long idSetor);
}
