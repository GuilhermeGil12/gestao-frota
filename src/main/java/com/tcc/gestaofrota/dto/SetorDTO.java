package com.tcc.gestaofrota.dto;

import java.util.List;

// O que as telas de Setores e Permissões mostram de cada setor.
public record SetorDTO(
        Long id,
        String nome,
        String descricao,
        boolean ativo,
        Long liderId,
        String liderNome,
        long quantidadeFuncionarios,
        long quantidadeUsuarios,
        List<String> permissoes
) {}
