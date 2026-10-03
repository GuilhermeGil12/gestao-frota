package com.tcc.gestaofrota.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;


@Entity
@Table(name = "setor")
public class Setor {

   @Id
   @GeneratedValue(strategy = GenerationType.IDENTITY)
   @Column(name = "id_setor")
   private Long id;

   @Column(name = "nome", nullable = false)
   private String nome;

   public Long getId() {
      return id;
   }

   public void setId(Long id) {
      this.id = id;
   }

   public String getNome() {
      return nome;
   }

   public void setNome(String nome) {
      this.nome = nome;
   }

   public String getDescricao() {
      return descricao;
   }

   public void setDescricao(String descricao) {
      this.descricao = descricao;
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

   public boolean isAtivo() {
      return ativo;
   }

   public void setAtivo(boolean ativo) {
      this.ativo = ativo;
   }

   @Column(name = "descricao")
   private String descricao;

   @Column(name = "criado_em")
   private LocalDateTime criadoEm;

   @Column(name = "atualizado_em")
   private LocalDateTime atualizadoEm;

   @Column(name = "ativo")
   private boolean ativo;


}
