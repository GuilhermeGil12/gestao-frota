package com.tcc.gestaofrota.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "comando")
public class Comando {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_comando")
    private Long idComando;

    @ManyToOne
    @JoinColumn(name = "id_controladora", nullable = false)
    private Controladora controladora;

    @Column(name = "tipo", nullable = false, length = 20)
    private String tipo; // "BLOQUEAR" ou "DESBLOQUEAR"

    @Column(name = "status", nullable = false, length = 20)
    private String status; // "PENDENTE" ou "EXECUTADO"

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm;

    @Column(name = "executado_em")
    private LocalDateTime executadoEm;

    // ==========================================
    // GETTERS E SETTERS
    // ==========================================

    public Long getIdComando() {
        return idComando;
    }

    public void setIdComando(Long idComando) {
        this.idComando = idComando;
    }

    public Controladora getControladora() {
        return controladora;
    }

    public void setControladora(Controladora controladora) {
        this.controladora = controladora;
    }

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getCriadoEm() {
        return criadoEm;
    }

    public void setCriadoEm(LocalDateTime criadoEm) {
        this.criadoEm = criadoEm;
    }

    public LocalDateTime getExecutadoEm() {
        return executadoEm;
    }

    public void setExecutadoEm(LocalDateTime executadoEm) {
        this.executadoEm = executadoEm;
    }
}
