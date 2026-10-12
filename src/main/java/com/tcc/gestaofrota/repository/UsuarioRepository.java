package com.tcc.gestaofrota.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.tcc.gestaofrota.model.Usuario;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    
    Optional<Usuario> findByEmail(String email);
    boolean existsByFuncionarioId(Long funcionarioId);
    Optional<Usuario> findByFuncionarioId(Long funcionarioId);
}
