// src/utils/trajeto.js
//
// Desenho do trajeto no mapa, igual nas telas de Rotas e de Monitoramento.
// O Leaflet desenha em SVG e não lê as classes do Tailwind, por isso as cores ficam aqui.

export const CORES_TRAJETO = {
    normal: '#16a34a',   // verde: dentro do limite
    excesso: '#dc2626',  // vermelho: acima do limite
    contorno: '#ffffff', // contorno branco por baixo da linha, para aparecer em qualquer fundo
    fim: '#111827',      // ponto final / ponto selecionado
};

/** Estilo da linha (o contorno vai por baixo, mais grosso). */
export const LINHA_CONTORNO = { color: CORES_TRAJETO.contorno, weight: 9, opacity: 0.9, lineCap: 'round', lineJoin: 'round' };
export const linhaTrecho = (excesso) => ({
    color: excesso ? CORES_TRAJETO.excesso : CORES_TRAJETO.normal,
    weight: 5, opacity: 1, lineCap: 'round', lineJoin: 'round',
});

/**
 * Divide o trajeto em trechos verdes e vermelhos (acima do limite).
 * Cada trecho novo começa no ponto anterior, para a linha não ficar com buraco.
 */
export function dividirTrechos(pontos, limite) {
    const trechos = [];
    pontos.forEach((p, i) => {
        const excesso = Number(p.velocidade) > limite;
        const atual = trechos[trechos.length - 1];
        if (!atual || atual.excesso !== excesso) {
            const anterior = i > 0 ? [[pontos[i - 1].lat, pontos[i - 1].lng]] : [];
            trechos.push({ excesso, pontos: [...anterior, [p.lat, p.lng]] });
        } else {
            atual.pontos.push([p.lat, p.lng]);
        }
    });
    return trechos;
}
