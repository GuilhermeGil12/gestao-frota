package com.tcc.gestaofrota.model;


import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import java.util.HashSet;
import java.util.Set;

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


    // O hash nunca sai em resposta de API.
    @JsonIgnore
    @Column(name = "senha_usuario", nullable = false)
    private String senha;

    @Column(name = "ativo")
    private Boolean ativo;

    // Foto do perfil como data URL ("data:image/jpeg;base64,...").
    // Fica fora do JSON comum (listas de usuários); sai só em /api/perfil.
    @JsonIgnore
    @Column(name = "foto", columnDefinition = "TEXT")
    private String foto;

    // Tipos de notificação que o usuário desligou, separados por vírgula. Vazio = recebe todas.
    @JsonIgnore
    @Column(name = "notificacoes_desativadas", length = 300)
    private String notificacoesDesativadas;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "usuario_permissao",
            joinColumns = @JoinColumn(name = "id_usuario"),
            inverseJoinColumns = @JoinColumn(name = "id_permissao")
    )
    private Set<Permissao> permissoes = new HashSet<>();

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

    public Set<Permissao> getPermissoes() { return permissoes; }
    public void setPermissoes(Set<Permissao> permissoes) { this.permissoes = permissoes; }

    public String getFoto() { return foto; }
    public void setFoto(String foto) { this.foto = foto; }

    public String getNotificacoesDesativadas() { return notificacoesDesativadas; }
    public void setNotificacoesDesativadas(String notificacoesDesativadas) { this.notificacoesDesativadas = notificacoesDesativadas; }
}
