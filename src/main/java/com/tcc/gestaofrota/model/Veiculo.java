package com.tcc.gestaofrota.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "veiculo")
public class Veiculo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_veiculo")
    private Long id;

    @Column(name = "placa", unique = true, length = 8)
    private String placa;

    @Column(name = "renavam", unique = true)
    private String renavam;

    @Column(name = "km_atual")
    private Double kmAtual;

    // Km do odômetro na última revisão. Vazio = revisões nos múltiplos do intervalo (10.000, 20.000...).
    @Column(name = "km_ultima_revisao")
    private Double kmUltimaRevisao;

    // Até que horário os pontos do GPS já foram somados ao km atual (uso interno).
    @JsonIgnore
    @Column(name = "km_contado_ate")
    private LocalDateTime kmContadoAte;

    // Km da revisão que já foi avisada no Telegram, para não repetir o aviso (uso interno).
    @JsonIgnore
    @Column(name = "aviso_revisao_km")
    private Double avisoRevisaoKm;

    // Calculado na hora pelo RevisaoService (não fica no banco).
    @Transient
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Double proximaRevisaoKm;

    @Column(name = "velocidade_maxima")
    private Double velocidadeMaxima;

    @Column(name = "nome")
    private String nome;

    @Column(name = "ativo")
    private Boolean ativo;

    @Column(name = "criado_em")
    private LocalDateTime criadoEm;

    @Column(name = "atualizado_em")
    private LocalDateTime atualizadoEm;

    @OneToOne(mappedBy = "veiculo", cascade = CascadeType.ALL)
    private Controladora controladora;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getPlaca() {
        return placa;
    }

    public void setPlaca(String placa) {
        this.placa = placa;
    }

    public String getRenavam() {
        return renavam;
    }

    public void setRenavam(String renavam) {
        this.renavam = renavam;
    }

    public Double getKmAtual() {
        return kmAtual;
    }

    public void setKmAtual(Double kmAtual) {
        this.kmAtual = kmAtual;
    }

    public Double getVelocidadeMaxima() {
        return velocidadeMaxima;
    }

    public void setVelocidadeMaxima(Double velocidadeMaxima) {
        this.velocidadeMaxima = velocidadeMaxima;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
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

    public Controladora getControladora() {
        return controladora;
    }

    public void setControladora(Controladora controladora) {
        this.controladora = controladora;
    }

    public Double getKmUltimaRevisao() { return kmUltimaRevisao; }
    public void setKmUltimaRevisao(Double kmUltimaRevisao) { this.kmUltimaRevisao = kmUltimaRevisao; }

    public LocalDateTime getKmContadoAte() { return kmContadoAte; }
    public void setKmContadoAte(LocalDateTime kmContadoAte) { this.kmContadoAte = kmContadoAte; }

    public Double getAvisoRevisaoKm() { return avisoRevisaoKm; }
    public void setAvisoRevisaoKm(Double avisoRevisaoKm) { this.avisoRevisaoKm = avisoRevisaoKm; }

    public Double getProximaRevisaoKm() { return proximaRevisaoKm; }
    public void setProximaRevisaoKm(Double proximaRevisaoKm) { this.proximaRevisaoKm = proximaRevisaoKm; }
}
