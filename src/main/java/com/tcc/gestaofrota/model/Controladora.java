package com.tcc.gestaofrota.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
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

    /** Esperando o gestor clicar em "Aprovar" no site. */
    public static final String AGUARDANDO = "AGUARDANDO";
    public static final String APROVADA = "APROVADA";

    // A senha é criada pela própria controladora (primeiro boot) e chega pelo provisionamento.
    // Nunca sai para o navegador.
    @JsonIgnore
    @Column(name = "senha")
    private String senha;

    // A controladora mandou uma senha diferente da aprovada (ex.: a memória dela foi apagada).
    // Só passa a valer quando o gestor aprovar de novo.
    @JsonIgnore
    @Column(name = "senha_pendente")
    private String senhaPendente;

    // AGUARDANDO ou APROVADA. Nulo = cadastrada antes do provisionamento (vale como aprovada).
    @Column(name = "situacao", length = 20)
    private String situacao;

    // Versão do firmware que a controladora informou no último provisionamento.
    // Nula = firmware antigo, que ainda usa o número da controladora nos tópicos.
    @Column(name = "versao_firmware", length = 20)
    private String versaoFirmware;

    // Última mensagem recebida dela (provisionamento ou telemetria).
    @Column(name = "ultimo_contato")
    private LocalDateTime ultimoContato;

    // A controladora é identificada pelo IMEI do modem (o código no tópico MQTT frota/<imei>/...).
    // O IP não é guardado: no 4G ele muda a cada conexão e não identifica nada.
    // (A coluna "ip" antiga pode continuar no banco; não é mais usada.)

    // Opcional. Único quando informado (conferido no ControladoraService).
    @Column(name = "mac", length = 17)
    private String macControladora;

    // IMEI do modem 4G. A própria controladora informa ao ligar; é a identidade dela.
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
    // IDENTIDADE NO MQTT
    // ==========================================

    /**
     * O código que vai nos tópicos frota/<código>/...
     * Firmware novo (já se apresentou pelo provisionamento): o IMEI.
     * Firmware antigo (cadastrada à mão, nunca se apresentou): o número da controladora.
     */
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    public String getCodigoMqtt() {
        if (versaoFirmware != null && imei != null) return imei;
        return idControladora == null ? null : String.valueOf(idControladora);
    }

    /** Só a controladora aprovada recebe cartões e comandos e tem os pontos salvos. */
    public boolean estaAprovada() {
        return !AGUARDANDO.equals(situacao);
    }

    /** Mandou senha nova e espera o gestor aprovar a troca (a tela mostra um aviso). */
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    public boolean isTrocaDeSenhaPendente() {
        return senhaPendente != null;
    }

    // ==========================================
    // GETTERS E SETTERS
    // ==========================================

    public String getSenhaPendente() {
        return senhaPendente;
    }

    public void setSenhaPendente(String senhaPendente) {
        this.senhaPendente = senhaPendente;
    }

    public String getSituacao() {
        return situacao;
    }

    public void setSituacao(String situacao) {
        this.situacao = situacao;
    }

    public String getVersaoFirmware() {
        return versaoFirmware;
    }

    public void setVersaoFirmware(String versaoFirmware) {
        this.versaoFirmware = versaoFirmware;
    }

    public LocalDateTime getUltimoContato() {
        return ultimoContato;
    }

    public void setUltimoContato(LocalDateTime ultimoContato) {
        this.ultimoContato = ultimoContato;
    }

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