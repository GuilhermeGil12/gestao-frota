import { useMemo } from 'react';
import { Polyline } from 'react-leaflet';
import { dividirTrechos, linhaBorda, linhaTrecho } from '../utils/trajeto';

// Linha do trajeto (Rotas e Monitoramento): azul com borda escura, vermelho acima do limite.
// Todas as bordas vão primeiro e as linhas por cima, para a emenda entre trechos não aparecer.
export default function TrajetoMapa({ pontos, limite }) {
    const trechos = useMemo(() => dividirTrechos(pontos, limite), [pontos, limite]);
    if (pontos.length < 2) return null;
    return (
        <>
            {trechos.map((t, i) => (
                <Polyline key={`borda-${i}`} positions={t.pontos} pathOptions={linhaBorda(t.excesso)} interactive={false} />
            ))}
            {trechos.map((t, i) => (
                <Polyline key={`linha-${i}`} positions={t.pontos} pathOptions={linhaTrecho(t.excesso)} interactive={false} />
            ))}
        </>
    );
}
