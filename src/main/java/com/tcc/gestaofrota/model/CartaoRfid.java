package com.tcc.gestaofrota.model;


import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import org.hibernate.annotations.CollectionId;

import java.time.LocalDateTime;

@Entity
@Table(name = "cartao_rfid")
public class CartaoRfid {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_cartao")
    private Long id;

    @Column(name = "uid", nullable = false, unique = true)
    private String uid;

    @Column(name = "ativo")
    private Boolean ativo;

    // Bloqueado automaticamente porque a CNH do dono venceu (volta ao validar a CNH).
    @Column(name = "bloqueado_por_cnh")
    private Boolean bloqueadoPorCnh = false;

    @Column(name = "criado_em")
    private LocalDateTime criadoEm;

    @Column(name = "atualizado_em")
    private LocalDateTime atualizadoEm;

    // Define que muitos cartões podem pertencer a um único funcionário (N:1).
    // O @JoinColumn indica que a coluna 'id_funcionario' no banco de dados é a Chave Estrangeira (FK)
    // que conecta este cartão ao seu dono na tabela de funcionários.
    @ManyToOne
    @JoinColumn(name = "id_funcionario")
    @JsonIgnoreProperties("cartoes")
    private Funcionario funcionario;


    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUid() {
        return uid;
    }

    public void setUid(String uid) {
        this.uid = uid;
    }

    public Boolean getAtivo() {
        return ativo;
    }

    public void setAtivo(Boolean ativo) {
        this.ativo = ativo;
    }

    public LocalDateTime getCriadoEm() {
        return criadoEm;
    }

    public void setCriadoEm(LocalDateTime criadoEm) {
        this.criadoEm = criadoEm;
    }

    public LocalDateTime getAtualizadoEm() {
        return atualizadoEm;
    }

    public void setAtualizadoEm(LocalDateTime atualizadoEm) {
        this.atualizadoEm = atualizadoEm;
    }

    public Funcionario getFuncionario() {
        return funcionario;
    }

    public void setFuncionario(Funcionario funcionario) {
        this.funcionario = funcionario;
    }


    public Boolean getBloqueadoPorCnh() {
        return bloqueadoPorCnh;
    }

    public void setBloqueadoPorCnh(Boolean bloqueadoPorCnh) {
        this.bloqueadoPorCnh = bloqueadoPorCnh;
    }

}
