package com.tcc.gestaofrota.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

// Registro de quem fez o quê no sistema (log de atividades).
// Guarda o id e o NOME do usuário na hora da ação: se o usuário mudar de nome
// ou for excluído depois, o registro continua contando o que aconteceu.
@Entity
@Table(name = "atividade", indexes = @Index(name = "idx_atividade_data", columnList = "data_hora"))
public class Atividade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_atividade")
    private Long id;

    @Column(name = "data_hora", nullable = false)
    private LocalDateTime dataHora;

    // null = feito pelo próprio sistema (ex.: bloqueio automático de CNH vencida).
    @Column(name = "id_usuario")
    private Long usuarioId;

    @Column(name = "nome_usuario", length = 120)
    private String usuarioNome;

    // COMANDO, CARTAO, CNH, FUNCIONARIO, VEICULO, CONTROLADORA, CERCA, USUARIO, SETOR, CONFIGURACAO
    @Column(name = "categoria", length = 30, nullable = false)
    private String categoria;

    @Column(name = "descricao", length = 300, nullable = false)
    private String descricao;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public LocalDateTime getDataHora() {
        return dataHora;
    }

    public void setDataHora(LocalDateTime dataHora) {
        this.dataHora = dataHora;
    }

    public Long getUsuarioId() {
        return usuarioId;
    }

    public void setUsuarioId(Long usuarioId) {
        this.usuarioId = usuarioId;
    }

    public String getUsuarioNome() {
        return usuarioNome;
    }

    public void setUsuarioNome(String usuarioNome) {
        this.usuarioNome = usuarioNome;
    }

    public String getCategoria() {
        return categoria;
    }

    public void setCategoria(String categoria) {
        this.categoria = categoria;
    }

    public String getDescricao() {
        return descricao;
    }

    public void setDescricao(String descricao) {
        this.descricao = descricao;
    }
}
