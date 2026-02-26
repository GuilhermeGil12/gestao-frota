package com.tcc.gestaofrota.model;


import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "controladora")
public class Controladora {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_controladora")
    private Long idControladora;

    @OneToOne
    @JoinColumn(name = "id_veiculo", referencedColumnName = "id_veiculo", unique = true)

    @Column(name = "id_veiculo")
    private String idVeiculo;

    @Column(name = "senha")
    private String senha;

    @Column(name = "ip", length = 15)
    private String ipControladora;

    @Column(name = "mac", length = 17)
    private String macControladora;

    @Column(name = "criado_em")
    private LocalDateTime criadoEm;

    @Column(name = "atualizado_em")
    private LocalDateTime atualizadoEm;
}
