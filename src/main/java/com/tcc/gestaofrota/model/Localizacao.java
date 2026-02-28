package com.tcc.gestaofrota.model;


import jakarta.persistence.*;

import javax.xml.crypto.Data;
import java.sql.Date;
import java.time.LocalDateTime;

@Entity
@Table(name = "localizacao_atual")
public class Localizacao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_localizacao")
    private Long id;

    @ManyToOne
    @JoinColumn(name = "id_veiculo")
    @Column(name = "id_veiculo")
    private Long idVeiculo;

    @Column(name = "laitude")
    private String latitude;

    @Column(name = "longitude")
    private String longitude;

    @Column(name = "altitude")
    private Double altitude;

    @Column(name = "velocidade")
    private Double velocidade;

    @Column(name = "status")
    private Integer status;

    @Column(name = "motorista_atual")
    private String motorista;

    @Column(name = "data_hora")
    private Date dataHora;

    @Column(name = "recebido_em")
    private LocalDateTime recebidoEM;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getIdVeiculo() {
        return idVeiculo;
    }

    public void setIdVeiculo(Long idVeiculo) {
        this.idVeiculo = idVeiculo;
    }

    public String getLatitude() {
        return latitude;
    }

    public void setLatitude(String latitude) {
        this.latitude = latitude;
    }

    public String getLongitude() {
        return longitude;
    }

    public void setLongitude(String longitude) {
        this.longitude = longitude;
    }

    public Double getAltitude() {
        return altitude;
    }

    public void setAltitude(Double altitude) {
        this.altitude = altitude;
    }

    public Double getVelocidade() {
        return velocidade;
    }

    public void setVelocidade(Double velocidade) {
        this.velocidade = velocidade;
    }

    public Integer getStatus() {
        return status;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public String getMotorista() {
        return motorista;
    }

    public void setMotorista(String motorista) {
        this.motorista = motorista;
    }

    public Date getDataHora() {
        return dataHora;
    }

    public void setDataHora(Date dataHora) {
        this.dataHora = dataHora;
    }

    public LocalDateTime getRecebidoEM() {
        return recebidoEM;
    }

    public void setRecebidoEM(LocalDateTime recebidoEM) {
        this.recebidoEM = recebidoEM;
    }

}
