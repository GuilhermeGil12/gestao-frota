import { cn } from "@/lib/utils";

// Fundo do login: mapa de cidade visto de cima, minimalista, girado em relação ao cartão.
// Os quarteirões têm tamanhos diferentes (como numa cidade de verdade) e os veículos
// andam pelas ruas emitindo pequenos sinais, como a controladora pelo 4G.

const CENTRO = { x: 800, y: 500 };
const GIRO = -17;

// Gerador simples com semente fixa: o mapa sai sempre igual, mas irregular.
function sorteador(semente) {
    let s = semente;
    return () => {
        s = (s * 1664525 + 1013904223) % 4294967296;
        return s / 4294967296;
    };
}

function linhas(inicio, fim, minimo, variacao, aleatorio) {
    const pos = [inicio];
    while (pos[pos.length - 1] < fim) pos.push(pos[pos.length - 1] + minimo + aleatorio() * variacao);
    return pos;
}

const sorte = sorteador(7);
const RUAS_V = linhas(-700, 2300, 110, 170, sorte);
const RUAS_H = linhas(-650, 1650, 95, 140, sorte);
const MEIA_RUA = 11;
const VIELA = 7;

function gerarQuarteiroes() {
    const blocos = [];
    for (let i = 0; i < RUAS_V.length - 1; i++) {
        for (let j = 0; j < RUAS_H.length - 1; j++) {
            const x = RUAS_V[i] + MEIA_RUA;
            const y = RUAS_H[j] + MEIA_RUA;
            const w = RUAS_V[i + 1] - RUAS_V[i] - MEIA_RUA * 2;
            const h = RUAS_H[j + 1] - RUAS_H[j] - MEIA_RUA * 2;
            const r = sorte();
            if (r < 0.07) continue; // terreno vazio / praça
            if (r < 0.32 && w > 120) {
                const corte = w * (0.35 + sorte() * 0.3);
                blocos.push({ x, y, w: corte - VIELA, h });
                blocos.push({ x: x + corte + VIELA, y, w: w - corte - VIELA, h });
            } else if (r < 0.52 && h > 110) {
                const corte = h * (0.35 + sorte() * 0.3);
                blocos.push({ x, y, w, h: corte - VIELA });
                blocos.push({ x, y: y + corte + VIELA, w, h: h - corte - VIELA });
            } else {
                blocos.push({ x, y, w, h });
            }
        }
    }
    return blocos;
}

const QUARTEIROES = gerarQuarteiroes();

// Avenida curva que corta a malha.
const AVENIDA = "M-700 1350 C 100 1000, 600 760, 1050 560 S 1800 160, 2300 -250";

// Rua mais próxima de uma coordenada, para as rotas seguirem as ruas.
const perto = (lista, valor) => lista.reduce((a, b) => (Math.abs(b - valor) < Math.abs(a - valor) ? b : a));

const vx = (v) => perto(RUAS_V, v);
const hy = (v) => perto(RUAS_H, v);

const VEICULOS = [
    { rota: `M${vx(500)} -700 V${hy(380)} H${vx(1250)} V1700`, duracao: 30, atraso: -4 },
    { rota: `M-700 ${hy(620)} H${vx(900)} V${hy(200)} H2300`, duracao: 34, atraso: -16 },
    { rota: `M2300 ${hy(820)} H${vx(300)} V-700`, duracao: 28, atraso: -9 },
    { rota: AVENIDA, duracao: 24, atraso: -6 },
    { rota: AVENIDA, duracao: 24, atraso: -18 },
    { rota: `M${vx(1450)} 1700 V${hy(520)} H-700`, duracao: 26, atraso: -12 },
    { rota: `M-700 ${hy(100)} H${vx(650)} V${hy(900)} H2300`, duracao: 38, atraso: -22 },
];

export default function FundoCidade({ className }) {
    return (
        <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden="true">
            <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
                <g transform={`rotate(${GIRO} ${CENTRO.x} ${CENTRO.y})`}>
                    <g fill="var(--muted)" opacity="0.7">
                        {QUARTEIROES.map((b) => (
                            <rect key={`${b.x}-${b.y}`} x={b.x} y={b.y} width={b.w} height={b.h} rx="5" />
                        ))}
                    </g>

                    <path d={AVENIDA} fill="none" stroke="var(--background)" strokeWidth="34" />

                    {VEICULOS.map((v, i) => (
                        <g
                            key={i}
                            className="fundo-veiculo"
                            style={{ offsetPath: `path("${v.rota}")`, animationDuration: `${v.duracao}s`, animationDelay: `${v.atraso}s` }}
                        >
                            <circle r="6" fill="none" stroke="var(--foreground)" strokeWidth="1.5" className="fundo-onda" style={{ animationDelay: `${(i % 4) * 0.5}s` }} />
                            <rect x="-9" y="-5" width="18" height="10" rx="3.5" fill="var(--foreground)" opacity="0.8" />
                        </g>
                    ))}
                </g>
            </svg>

            {/* clareia o centro para o formulário ficar legível */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--background)_12%,transparent_60%)] opacity-80" />
        </div>
    );
}
