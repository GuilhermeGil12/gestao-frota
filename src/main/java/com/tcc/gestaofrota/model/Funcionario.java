package com.tcc.gestaofrota.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@EntityListeners(AuditingEntityListener.class) //preenche as datas criado_em / atualizado
@Table(name = "funcionario")
public class Funcionario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_funcionario")
    private Long id;

    @Column(name = "nome")
    private String nome;

    @Column(name = "cpf")
    private String cpf;

    @Column(name = "numero_telefone")
    private String numeroTelefone;

    @Column(name = "end_email")
    private String email;

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public String getSenha() {
        return senha;
    }

    public void setSenha(String senha) {
        this.senha = senha;
    }

    @Column(name = "func_cargo")
    private String cargo;

    @Column(name = "num_matricula")
    private String matricula;

    @Column(name = "numero_cnh")
    private String numCNH;

    @Column(name = "categoria_cnh")
    private String categoriaCNH;

    @Column(name = "valida_cnh")
    private LocalDate validadeCNH;

    @Column(name = "rg")
    private String rg;

    @ManyToOne
    @JoinColumn(name = "id_setor", referencedColumnName = "id_setor")
    private Setor setor; // Alterado de String para a Classe Permissao

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "senha")
    private String senha;

    @Column(name = "endereco")
    private String endereco;

    @Column(name = "numero_casa")
    private String numero;

    @Column(name = "bairro")
    private String bairro;

    @Column(name = "cidade")
    private String cidade;

    @Column(name = "cep")
    private String cep;

    // AQUI ESTÁ A MÁGICA DA CHAVE ESTRANGEIRA (FK):
    @ManyToOne
    @JoinColumn(name = "id_permissao", referencedColumnName = "id_permissao")
    private Permissao permissao; // Alterado de String para a Classe Permissao

    @Column(name = "nivel_motorista")
    private Integer nivelMotorista; // Ajustado para camelCase

    @Column(name = "ativo")
    private Boolean ativo;

    @CreatedDate //pega a data que aquele registro foi criado
    @Column(name = "criado_em")
    private LocalDateTime criadoEm;

    @LastModifiedDate // usado para pegar a ultima atualizacao
    @Column(name = "atualizado_em")
    private LocalDateTime atualizadoEm;

    @OneToMany(mappedBy = "funcionario")
    @JsonIgnoreProperties("funcionario")
    private List<CartaoRfid> cartoes;


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

    public String getCpf() {
        return cpf;
    }

    public void setCpf(String cpf) {
        this.cpf = cpf;
    }

    public String getRg() {
        return rg;
    }

    public void setRg(String rg) {
        this.rg = rg;
    }

    public Setor getSetor() {
        return setor;
    }

    public void setSetor(Setor setor) {
        this.setor = setor;
    }

    public Permissao getPermissao() {
        return permissao;
    }

    public void setPermissao(Permissao permissao) {
        this.permissao = permissao;
    }

    public Integer getNivelMotorista() {
        return nivelMotorista;
    }

    public void setNivelMotorista(Integer nivelMotorista) {
        this.nivelMotorista = nivelMotorista;
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

    public List<CartaoRfid> getCartoes() {
        return cartoes;
    }

    public void setCartoes(List<CartaoRfid> cartoes) {
        this.cartoes = cartoes;
    }

    public String getNumeroTelefone() {
        return numeroTelefone;
    }

    public void setNumeroTelefone(String numeroTelefone) {
        this.numeroTelefone = numeroTelefone;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getCargo() {
        return cargo;
    }

    public void setCargo(String cargo) {
        this.cargo = cargo;
    }

    public String getMatricula() {
        return matricula;
    }

    public void setMatricula(String matricula) {
        this.matricula = matricula;
    }

    public String getNumCNH() {
        return numCNH;
    }

    public void setNumCNH(String numCNH) {
        this.numCNH = numCNH;
    }

    public String getCategoriaCNH() {
        return categoriaCNH;
    }

    public void setCategoriaCNH(String categoriaCNH) {
        this.categoriaCNH = categoriaCNH;
    }

    public LocalDate getValidadeCNH() {
        return validadeCNH;
    }

    public void setValidadeCNH(LocalDate validadeCNH) {
        this.validadeCNH = validadeCNH;
    }

    public String getEndereco() {
        return endereco;
    }

    public void setEndereco(String endereco) {
        this.endereco = endereco;
    }

    public String getNumero() {
        return numero;
    }

    public void setNumero(String numero) {
        this.numero = numero;
    }

    public String getBairro() {
        return bairro;
    }

    public void setBairro(String bairro) {
        this.bairro = bairro;
    }

    public String getCidade() {
        return cidade;
    }

    public void setCidade(String cidade) {
        this.cidade = cidade;
    }

    public String getCep() {
        return cep;
    }

    public void setCep(String cep) {
        this.cep = cep;
    }
}