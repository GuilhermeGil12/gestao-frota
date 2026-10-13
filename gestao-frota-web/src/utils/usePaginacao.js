import { useState } from "react";

export function usePaginacao(itens, porPagina = 20) {
    const lista = Array.isArray(itens) ? itens : [];
    const [pagina, setPagina] = useState(1);
    const [tamanhoAnterior, setTamanhoAnterior] = useState(lista.length);

    // Busca ou filtro novos mudam o tamanho da lista: volta pra primeira pagina,
    // senao o usuario cai numa pagina que nao existe mais.
    if (tamanhoAnterior !== lista.length) {
        setTamanhoAnterior(lista.length);
        setPagina(1);
    }

    const totalPaginas = Math.max(1, Math.ceil(lista.length / porPagina));
    const paginaAtual = Math.min(pagina, totalPaginas);
    const inicio = (paginaAtual - 1) * porPagina;

    return {
        visiveis: lista.slice(inicio, inicio + porPagina),
        pagina: paginaAtual,
        totalPaginas,
        totalItens: lista.length,
        inicio: lista.length === 0 ? 0 : inicio + 1,
        fim: Math.min(inicio + porPagina, lista.length),
        setPagina,
    };
}
