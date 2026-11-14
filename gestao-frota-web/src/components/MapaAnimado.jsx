import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Uma viagem curta contada em três momentos: o cartão libera o carro,
// o sistema avisa um excesso e a viagem termina com o resumo.
const EVENTOS = [
    { cor: "bg-green-500", titulo: "Cartão aceito", detalhe: "Ignição liberada para Guilherme" },
    { cor: "bg-orange-500", titulo: "92 km/h na Av. Brasil", detalhe: "Aviso enviado no Telegram" },
    { cor: "bg-blue-500", titulo: "Chegou ao cliente", detalhe: "5,9 km em 7 minutos" },
];

const PASSO_MS = 2200;
const CICLO_MS = 8200;

// Rota desenhada sobre uma malha de ruas. O mesmo traço guia o carrinho (offset-path no CSS).
const ROTA = "M60 300 L60 230 Q60 210 80 210 L210 210 Q230 210 230 190 L230 110 Q230 90 250 90 L420 90";

function usaMovimentoReduzido() {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function MapaAnimado({ compacto = false, className }) {
    const reduzido = usaMovimentoReduzido();
    const [passo, setPasso] = useState(reduzido ? EVENTOS.length - 1 : 0);
    const [ciclo, setCiclo] = useState(0);

    useEffect(() => {
        if (reduzido) return;
        const t1 = setTimeout(() => setPasso(1), PASSO_MS);
        const t2 = setTimeout(() => setPasso(2), PASSO_MS * 2);
        const fim = setTimeout(() => { setPasso(0); setCiclo((c) => c + 1); }, CICLO_MS);
        return () => [t1, t2, fim].forEach(clearTimeout);
    }, [ciclo, reduzido]);

    const visiveis = compacto ? [EVENTOS[passo]] : EVENTOS.slice(0, passo + 1);

    return (
        <figure
            className={cn("relative overflow-hidden rounded-2xl border bg-card", className)}
            aria-label="Ilustração de uma viagem: o motorista passa o cartão, o sistema avisa um excesso de velocidade e mostra o resumo da viagem"
        >
            <svg key={ciclo} viewBox="0 0 480 360" className="block w-full" aria-hidden="true">
                {/* malha de ruas */}
                <g stroke="var(--border)" strokeWidth="14" strokeLinecap="round" fill="none">
                    <path d="M0 210 H480" />
                    <path d="M0 90 H480" />
                    <path d="M60 0 V360" />
                    <path d="M230 0 V360" />
                    <path d="M380 0 V360" />
                    <path d="M0 300 H480" />
                </g>
                <g fill="var(--muted)">
                    <rect x="82" y="112" width="126" height="76" rx="6" />
                    <rect x="252" y="112" width="106" height="76" rx="6" />
                    <rect x="82" y="232" width="126" height="46" rx="6" />
                    <rect x="252" y="232" width="106" height="46" rx="6" />
                    <rect x="402" y="112" width="78" height="76" rx="6" />
                    <rect x="82" y="16" width="126" height="52" rx="6" />
                    <rect x="252" y="16" width="106" height="52" rx="6" />
                </g>

                {/* rota percorrida */}
                <path d={ROTA} className="mapa-rota" fill="none" stroke="var(--foreground)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" pathLength="1" />

                {/* origem e destino */}
                <circle cx="60" cy="300" r="9" fill="var(--card)" stroke="var(--foreground)" strokeWidth="4" />
                <g className="mapa-destino">
                    <circle cx="420" cy="90" r="14" fill="var(--foreground)" />
                    <circle cx="420" cy="90" r="5" fill="var(--card)" />
                </g>

                {/* veículo */}
                <g className="mapa-carro">
                    <circle r="16" fill="var(--foreground)" opacity="0.15" className="mapa-pulso" />
                    <circle r="9" fill="var(--foreground)" />
                </g>
            </svg>

            <div className={cn("pointer-events-none absolute inset-x-3 bottom-3 flex flex-col gap-2", compacto ? "" : "sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-64")}>
                {visiveis.map((ev, i) => (
                    <div key={`${ciclo}-${ev.titulo}`} className={cn("mapa-evento flex items-start gap-3 rounded-xl border bg-card/95 px-3.5 py-2.5 shadow-sm backdrop-blur", i < visiveis.length - 1 && "max-sm:hidden")}>
                        <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", ev.cor)} />
                        <span className="min-w-0">
                            <span className="block text-sm font-medium text-foreground">{ev.titulo}</span>
                            <span className="block text-xs text-muted-foreground">{ev.detalhe}</span>
                        </span>
                    </div>
                ))}
            </div>
        </figure>
    );
}
