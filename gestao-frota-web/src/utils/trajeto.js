// src/utils/trajeto.js
//
// Desenho do trajeto no mapa, igual nas telas de Rotas e de Monitoramento.
// O Leaflet desenha em SVG e não lê as classes do Tailwind, por isso as cores ficam aqui.
// Estilo parecido com o do Google Maps: linha azul com uma borda mais escura em volta.

export const CORES_TRAJETO = {
    normal: '#1a73e8',      // azul: dentro do limite
    normalBorda: '#0b57d0', // borda do azul
    excesso: '#e53935',     // vermelho: acima do limite
    excessoBorda: '#a50e0e',
    inicio: '#16a34a',      // marcador de início
    fim: '#111827',         // marcador de fim / ponto selecionado
    branco: '#ffffff',
};

/** Borda (vai por baixo, mais grossa) e linha (por cima) de um trecho. */
export const linhaBorda = (excesso) => ({
    color: excesso ? CORES_TRAJETO.excessoBorda : CORES_TRAJETO.normalBorda,
    weight: 9, opacity: 1, lineCap: 'round', lineJoin: 'round',
});
export const linhaTrecho = (excesso) => ({
    color: excesso ? CORES_TRAJETO.excesso : CORES_TRAJETO.normal,
    weight: 6, opacity: 1, lineCap: 'round', lineJoin: 'round',
});

/**
 * Divide o trajeto em trechos azuis e vermelhos (acima do limite).
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

/**
 * Para onde o carro está indo (0 = norte, 90 = leste), pelos dois últimos pontos
 * que estão a pelo menos 5 m um do outro. Sem movimento, devolve null (sem seta).
 */
export function rumoAtual(pontos) {
    const ultimo = pontos[pontos.length - 1];
    if (!ultimo) return null;
    for (let i = pontos.length - 2; i >= 0; i--) {
        const p = pontos[i];
        const dy = (ultimo.lat - p.lat) * 111320;
        const dx = (ultimo.lng - p.lng) * 111320 * Math.cos((ultimo.lat * Math.PI) / 180);
        if (Math.hypot(dx, dy) >= 5) return (Math.atan2(dx, dy) * 180) / Math.PI;
    }
    return null;
}
