import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Mostra a primeira, a ultima e as vizinhas da atual; o resto vira "…".
function numerosVisiveis(pagina, totalPaginas) {
    const numeros = new Set([1, totalPaginas, pagina - 1, pagina, pagina + 1]);
    const ordenados = [...numeros]
        .filter((n) => n >= 1 && n <= totalPaginas)
        .sort((a, b) => a - b);

    const resultado = [];
    ordenados.forEach((n, i) => {
        if (i > 0 && n - ordenados[i - 1] > 1) resultado.push("…");
        resultado.push(n);
    });
    return resultado;
}

function Paginacao({ pagina, totalPaginas, totalItens, inicio, fim, onChange }) {
    if (totalItens === 0) return null;

    return (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-border pt-4 sm:flex-row">
            <span className="text-sm text-muted-foreground">
                Mostrando {inicio}–{fim} de {totalItens}
            </span>

            {totalPaginas > 1 && (
                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => onChange(1)}
                        disabled={pagina === 1}
                        aria-label="Primeira página"
                    >
                        <ChevronsLeft />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => onChange(pagina - 1)}
                        disabled={pagina === 1}
                        aria-label="Página anterior"
                    >
                        <ChevronLeft />
                    </Button>

                    {numerosVisiveis(pagina, totalPaginas).map((n, i) =>
                        n === "…" ? (
                            <span key={`reticencias-${i}`} className="px-1 text-sm text-muted-foreground">
                                …
                            </span>
                        ) : (
                            <Button
                                key={n}
                                variant={n === pagina ? "default" : "outline"}
                                size="icon-sm"
                                onClick={() => onChange(n)}
                                aria-current={n === pagina ? "page" : undefined}
                            >
                                {n}
                            </Button>
                        )
                    )}

                    <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => onChange(pagina + 1)}
                        disabled={pagina === totalPaginas}
                        aria-label="Próxima página"
                    >
                        <ChevronRight />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => onChange(totalPaginas)}
                        disabled={pagina === totalPaginas}
                        aria-label="Última página"
                    >
                        <ChevronsRight />
                    </Button>
                </div>
            )}
        </div>
    );
}

export default Paginacao;
