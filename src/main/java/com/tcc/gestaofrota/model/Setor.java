package com.tcc.gestaofrota.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;


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

   // Líder padrão do setor: recebe o relatório de quem é do setor e não tem líder próprio.
   @JsonIgnore
   @ManyToOne(fetch = FetchType.LAZY)
   @JoinColumn(name = "id_lider", referencedColumnName = "id_funcionario")
   private Funcionario lider;

   @Transient
   private Long liderIdInformado;

   // Permissões padrão do setor: aplicadas aos usuários dos funcionários deste setor.
   // @JsonIgnore: o setor aparece dentro do funcionário e não precisa levar a lista junto.
   @JsonIgnore
   @ManyToMany(fetch = FetchType.LAZY)
   @JoinTable(
           name = "setor_permissao",
           joinColumns = @JoinColumn(name = "id_setor"),
           inverseJoinColumns = @JoinColumn(name = "id_permissao")
   )
   private Set<Permissao> permissoes = new HashSet<>();

   public Set<Permissao> getPermissoes() {
      return permissoes;
   }

   public void setPermissoes(Set<Permissao> permissoes) {
      this.permissoes = permissoes;
   }

   @JsonIgnore
   public Funcionario getLider() {
      return lider;
   }

   public void setLider(Funcionario lider) {
      this.lider = lider;
   }

   @JsonProperty("liderId")
   public Long getLiderId() {
      return lider != null ? lider.getId() : null;
   }

   @JsonProperty("liderId")
   public void setLiderId(Long liderId) {
      this.liderIdInformado = liderId;
   }

   @JsonIgnore
   public Long getLiderIdInformado() {
      return liderIdInformado;
   }
}
