package com.tcc.gestaofrota.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "controladora")
public class Controladora {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_controladora")
    private Long idControladora;

    // A MÁGICA ESTÁ AQUI: Isso impede o Java de ficar indo e voltando num loop infinito!
    @JsonIgnore
    @OneToOne
    @JoinColumn(name = "id_veiculo", referencedColumnName = "id_veiculo", unique = true)
    private Veiculo veiculo;

    @Column(name = "senha")
    private String senha;

    @Column(name = "ip", length = 15)
    private String ipControladora;

    @Column(name = "mac", length = 17)
    private String macControladora;

    @Column(name = "ativo")
    private Boolean ativo;

    @Column(name = "criado_em")
    private LocalDateTime criadoEm;

    @Column(name = "atualizado_em")
    private LocalDateTime atualizadoEm;

    // ==========================================
    // GETTERS E SETTERS
    // ==========================================

    public Long getIdControladora() {
        return idControladora;
    }

    public void setIdControladora(Long idControladora) {
        this.idControladora = idControladora;
    }

    public Veiculo getVeiculo() {
        return veiculo;
    }

    public void setVeiculo(Veiculo veiculo) {
        this.veiculo = veiculo;
    }

    public String getSenha() {
        return senha;
    }

    public void setSenha(String senha) {
        this.senha = senha;
    }

    public String getIpControladora() {
        return ipControladora;
    }

    public void setIpControladora(String ipControladora) {
        this.ipControladora = ipControladora;
    }

    public String getMacControladora() {
        return macControladora;
    }

    public void setMacControladora(String macControladora) {
        this.macControladora = macControladora;
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
}