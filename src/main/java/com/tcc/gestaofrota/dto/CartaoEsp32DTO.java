package com.tcc.gestaofrota.dto;

public class CartaoEsp32DTO
{
    private String uid;
    private String nivel;

    public CartaoEsp32DTO(String uid, String nivel){
        this.uid = uid;
        this.nivel = nivel;
    }

    public String getUid() {
        return uid;
    }

    public void setUid(String uid) {
        this.uid = uid;
    }

    public String getNivel() {
        return nivel;
    }

    public void setNivel(String nivel) {
        this.nivel = nivel;
    }
}
