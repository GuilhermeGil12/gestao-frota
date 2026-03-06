package com.tcc.gestaofrota.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@EntityListeners(AuditingEntityListener.class) //preenche as datas criado_em / atualizado
@Table(name = "funcionario")
public class Funcionario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_funcionario")
    private Long id;

    @Column(name = "nome")
    private String nome;

    @Column(name = "cpf")
    private String cpf;

    @Column(name = "rg")
    private String rg;

    @Column(name = "setor")
    private String setor;

    // AQUI ESTÁ A MÁGICA DA CHAVE ESTRANGEIRA (FK):
    @ManyToOne
    @JoinColumn(name = "id_permissao", referencedColumnName = "id_permissao")
    private Permissao permissao; // Alterado de String para a Classe Permissao

    @Column(name = "nivel_motorista")
    private Integer nivelMotorista; // Ajustado para camelCase

    @Column(name = "ativo")
    private Boolean ativo;

    @CreatedDate //pega a data que aquele registro foi criado
    @Column(name = "criado_em")
    private LocalDateTime criadoEm;

    @LastModifiedDate // usado para pegar a ultima atualizacao
    @Column(name = "atualizado_em")
    private LocalDateTime atualizadoEm;

    @OneToMany(mappedBy = "funcionario")
    @JsonIgnoreProperties("funcionario")
    private List<CartaoRfid> cartoes;

    // ==========================================
    // GETTERS E SETTERS (Atualizados)
    // ==========================================

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getCpf() {
        return cpf;
    }

    public void setCpf(String cpf) {
        this.cpf = cpf;
    }

    public String getRg() {
        return rg;
    }

    public void setRg(String rg) {
        this.rg = rg;
    }

    public String getSetor() {
        return setor;
    }

    public void setSetor(String setor) {
        this.setor = setor;
    }

    public Permissao getPermissao() {
        return permissao;
    }

    public void setPermissao(Permissao permissao) {
        this.permissao = permissao;
    }

    public Integer getNivelMotorista() {
        return nivelMotorista;
    }

    public void setNivelMotorista(Integer nivelMotorista) {
        this.nivelMotorista = nivelMotorista;
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

    public List<CartaoRfid> getCartoes() {
        return cartoes;
    }

    public void setCartoes(List<CartaoRfid> cartoes) {
        this.cartoes = cartoes;
    }
}