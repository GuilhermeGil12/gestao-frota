package com.tcc.gestaofrota.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "cerca")
public class Cerca {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_cerca")
    private Long id;

    @Column(name = "nome")
    private String nome;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "raio")
    private Double raio;

    @Column(name = "ativo")
    private Boolean ativo = true;

    @CreatedDate
    @Column(name = "criado_em")
    private LocalDateTime criadoEm;

    @ManyToOne
    @JoinColumn(name = "id_funcionario", referencedColumnName = "id_funcionario")
    private Funcionario funcionario;

    // true = é a cerca da casa do funcionário, criada e movida sozinha pelo cadastro dele.
    // Marcada por este campo (e não pelo nome) para que renomear a cerca não gere uma duplicada.
    // Só o sistema define: o JSON vindo da tela não consegue mudar.
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    @Column(name = "casa_funcionario")
    private Boolean casaFuncionario = false;

    // Getters e Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public Double getRaio() { return raio; }
    public void setRaio(Double raio) { this.raio = raio; }

    public Boolean getAtivo() { return ativo; }
    public void setAtivo(Boolean ativo) { this.ativo = ativo; }

    public LocalDateTime getCriadoEm() { return criadoEm; }
    public void setCriadoEm(LocalDateTime criadoEm) { this.criadoEm = criadoEm; }

    public Funcionario getFuncionario() { return funcionario; }
    public void setFuncionario(Funcionario funcionario) { this.funcionario = funcionario; }

    public boolean isCasaFuncionario() { return Boolean.TRUE.equals(casaFuncionario); }
    public void setCasaFuncionario(Boolean casaFuncionario) { this.casaFuncionario = casaFuncionario; }
}