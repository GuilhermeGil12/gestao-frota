package com.tcc.gestaofrota.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "permissao")
public class Permissao {


    @Column(name = "id_permissao")
    private Long id;

    @Column(name = "id_veiculo")
    private Long idVeiculo;

    @Column(name = "nivel")
    private String nivel;

    @Column(name = "criado_em")
    private LocalDateTime criadoEm;

    @Column(name = "atualizado_em")
    private LocalDateTime atualizadoEm;
}
