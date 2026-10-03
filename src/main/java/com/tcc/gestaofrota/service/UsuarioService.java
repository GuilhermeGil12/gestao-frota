package com.tcc.gestaofrota.service;

import java.util.List;
import java.util.Map;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import com.tcc.gestaofrota.model.Funcionario;
import com.tcc.gestaofrota.model.Usuario;
import com.tcc.gestaofrota.repository.FuncionarioRepository;
import com.tcc.gestaofrota.repository.UsuarioRepository;



@Service
public class UsuarioService {
    
    private final UsuarioRepository usuarioRepository;
    private final FuncionarioRepository funcionarioRepository;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public UsuarioService(UsuarioRepository usuarioRepository, FuncionarioRepository funcionarioRepository){
        this.usuarioRepository = usuarioRepository;
        this.funcionarioRepository = funcionarioRepository;
    }

    public List<Usuario> listarTodos(){
        return usuarioRepository.findAll();
    }

     public Usuario criar(Map<String, Object> dados) {
        Long idFuncionario = Long.valueOf(dados.get("idFuncionario").toString());
        Funcionario funcionario = funcionarioRepository.findById(idFuncionario)
                .orElseThrow(() -> new RuntimeException("Funcionário não encontrado"));

        if (usuarioRepository.existsByFuncionarioId(idFuncionario)) {
            throw new RuntimeException("Funcionário já possui um usuário cadastrado");
        }

        Usuario u = new Usuario();
        u.setFuncionario(funcionario);
        u.setEmail(dados.get("email").toString());
        u.setSenha(encoder.encode(dados.get("senha").toString()));
        u.setAtivo(true);
        return usuarioRepository.save(u);
    }
}
