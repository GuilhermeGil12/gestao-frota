package com.tcc.gestaofrota.model;


import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "usuario")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_usuario")
    private Long id;

    @OneToOne
    @JoinColumn(name = "id_funcionario")
    private Funcionario funcionario;

    @Column(name= "nome_usuario", nullable= false, unique=false)
    private String nomeUsuario;


    @Column(name = "email_usuario", nullable = false, unique = true)
    private String email;


    @Column(name = "senha_usuario", nullable = false)
    private String senha;

    @Column(name = "ativo")
    private Boolean ativo;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Funcionario getFuncionario() { return funcionario; }
    public void setFuncionario(Funcionario funcionario) { this.funcionario = funcionario; }

    public String getNomeUsuario() { return nomeUsuario;}
    public void setNomeUsuario(String nomeUsuario) { this.nomeUsuario = nomeUsuario;}
    
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getSenha() { return senha; }
    public void setSenha(String senha) { this.senha = senha; }

    public Boolean getAtivo() { return ativo; }
    public void setAtivo(Boolean ativo) { this.ativo = ativo; }
}
