package com.tcc.gestaofrota.dto;

public class CoordenadaEsp32DTO {


    private String data_localizacao;
    private String latitude;
    private String longitude;
    private String velocidade;
    private String altitude;
    private String qtd_satelite;
    private String ign;
    private String crachastr;
    private String tensao;
    private String tensao_pos_chave;
    private String tensao_sistema;

    public String getTensao() {
        return tensao;
    }

    public void setTensao(String tensao) {
        this.tensao = tensao;
    }

    public String getTensao_pos_chave() {
        return tensao_pos_chave;
    }

    public void setTensao_pos_chave(String tensao_pos_chave) {
        this.tensao_pos_chave = tensao_pos_chave;
    }

    public String getTensao_sistema() {
        return tensao_sistema;
    }

    public void setTensao_sistema(String tensao_sistema) {
        this.tensao_sistema = tensao_sistema;
    }

    public String getData_localizacao() {
        return data_localizacao;
    }

    public void setData_localizacao(String data_localizacao) {
        this.data_localizacao = data_localizacao;
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

    public String getVelocidade() {
        return velocidade;
    }

    public void setVelocidade(String velocidade) {
        this.velocidade = velocidade;
    }

    public String getAltitude() {
        return altitude;
    }

    public void setAltitude(String altitude) {
        this.altitude = altitude;
    }

    public String getQtd_satelite() {
        return qtd_satelite;
    }

    public void setQtd_satelite(String qtd_satelite) {
        this.qtd_satelite = qtd_satelite;
    }

    public String getIgn() {
        return ign;
    }

    public void setIgn(String ign) {
        this.ign = ign;
    }

    public String getCrachastr() {
        return crachastr;
    }

    public void setCrachastr(String crachastr) {
        this.crachastr = crachastr;
    }
}
