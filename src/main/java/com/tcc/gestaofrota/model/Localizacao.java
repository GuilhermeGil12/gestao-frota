package com.tcc.gestaofrota.model;


import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import javax.xml.crypto.Data;
import java.sql.Date;
import java.time.LocalDateTime;

@Entity
@Table(name = "localizacao_atual")
public class Localizacao {

    @Column(name = "id_localizacao")
    private Long id;

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

    @Column(name = "motorista")
    private String motorista;

    @Column(name = "data_hora")
    private Date dataHora;

    @Column(name = "recebido_em")
    private LocalDateTime recebidoEM;
}
