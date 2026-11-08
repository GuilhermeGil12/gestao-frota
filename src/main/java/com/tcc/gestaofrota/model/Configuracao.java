package com.tcc.gestaofrota.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

// Configurações gerais do sistema. Existe uma linha só (id = 1).
@Entity
@Table(name = "configuracao")
public class Configuracao {

    public static final Long ID_UNICO = 1L;

    @Id
    @Column(name = "id_configuracao")
    private Long id = ID_UNICO;

    // Aparece no cabeçalho dos relatórios em PDF.
    @Column(name = "nome_empresa", length = 120)
    private String nomeEmpresa = "Frota System";

    // Quantos dias antes do vencimento da CNH a notificação começa a aparecer.
    @Column(name = "dias_aviso_cnh")
    private Integer diasAvisoCnh = 30;

    @Column(name = "km_revisao")
    private Integer kmRevisao = 10000;

    // Regras que dependem da controladora (ainda não aplicadas pelo firmware).
    @Column(name = "bloquear_cnh_vencida")
    private Boolean bloquearCnhVencida = false;

    @Column(name = "bloquear_madrugada")
    private Boolean bloquearMadrugada = false;

    @Column(name = "atualizado_em")
    private LocalDateTime atualizadoEm;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNomeEmpresa() {
        return nomeEmpresa;
    }

    public void setNomeEmpresa(String nomeEmpresa) {
        this.nomeEmpresa = nomeEmpresa;
    }

    public Integer getDiasAvisoCnh() {
        return diasAvisoCnh;
    }

    public void setDiasAvisoCnh(Integer diasAvisoCnh) {
        this.diasAvisoCnh = diasAvisoCnh;
    }

    public Integer getKmRevisao() {
        return kmRevisao;
    }

    public void setKmRevisao(Integer kmRevisao) {
        this.kmRevisao = kmRevisao;
    }

    public Boolean getBloquearCnhVencida() {
        return bloquearCnhVencida;
    }

    public void setBloquearCnhVencida(Boolean bloquearCnhVencida) {
        this.bloquearCnhVencida = bloquearCnhVencida;
    }

    public Boolean getBloquearMadrugada() {
        return bloquearMadrugada;
    }

    public void setBloquearMadrugada(Boolean bloquearMadrugada) {
        this.bloquearMadrugada = bloquearMadrugada;
    }

    public LocalDateTime getAtualizadoEm() {
        return atualizadoEm;
    }

    public void setAtualizadoEm(LocalDateTime atualizadoEm) {
        this.atualizadoEm = atualizadoEm;
    }
}
