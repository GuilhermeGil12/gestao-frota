package com.tcc.gestaofrota.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "controladora")
public class Controladora {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_controladora")
    private Long idControladora;

    // @JsonIgnoreProperties ignora só o campo "controladora" dentro do Veiculo,
    // evitando o loop infinito sem esconder o veículo inteiro da resposta.
    @JsonIgnoreProperties("controladora")
    @OneToOne
    @JoinColumn(name = "id_veiculo", referencedColumnName = "id_veiculo", unique = true)
    private Veiculo veiculo;

    // Só entra pelo JSON (cadastro/edição); nunca sai na listagem para o navegador.
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Column(name = "senha")
    private String senha;

    // A controladora é identificada pelo id (o código no tópico MQTT frota/<id>/...).
    // O IP não é guardado: no 4G ele muda a cada conexão e não identifica nada.
    // (A coluna "ip" antiga pode continuar no banco; não é mais usada.)

    // Opcional. Único quando informado (conferido no ControladoraService).
    @Column(name = "mac", length = 17)
    private String macControladora;

    // IMEI do modem 4G (impresso na placa). Opcional; identifica a placa física.
    @Column(name = "imei", length = 15, unique = true)
    private String imei;

    // Número do chip 4G, para saber qual linha recarregar ou cancelar. Opcional.
    @Column(name = "linha_chip", length = 20)
    private String linhaChip;

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

    public String getImei() {
        return imei;
    }

    public void setImei(String imei) {
        this.imei = imei;
    }

    public String getLinhaChip() {
        return linhaChip;
    }

    public void setLinhaChip(String linhaChip) {
        this.linhaChip = linhaChip;
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