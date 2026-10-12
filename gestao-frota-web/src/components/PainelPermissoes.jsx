import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

function PainelPermissoes({ catalogo = [], selecionadas = [], onChange }) {
    const marcada = (chave) => selecionadas.includes(chave);

    const alternarAcao = (chave) => {
        onChange(
            marcada(chave)
                ? selecionadas.filter((c) => c !== chave)
                : [...selecionadas, chave]
        );
    };

    const alternarGrupo = (grupo) => {
        const chavesDoGrupo = grupo.acoes.map((a) => a.chave);
        const todasMarcadas = chavesDoGrupo.every(marcada);

        onChange(
            todasMarcadas
                ? selecionadas.filter((c) => !chavesDoGrupo.includes(c))
                : [...new Set([...selecionadas, ...chavesDoGrupo])]
        );
    };

    // "indeterminate" pinta o traço no lugar do check: algumas ações marcadas, não todas.
    const estadoDoGrupo = (grupo) => {
        const chaves = grupo.acoes.map((a) => a.chave);
        const marcadas = chaves.filter(marcada).length;
        if (marcadas === 0) return false;
        if (marcadas === chaves.length) return true;
        return "indeterminate";
    };

    const todasAsChaves = catalogo.flatMap((g) => g.acoes.map((a) => a.chave));
    const totalMarcadas = todasAsChaves.filter(marcada).length;

    if (catalogo.length === 0) {
        return (
            <p className="py-8 text-center text-sm text-muted-foreground">
                Carregando permissões...
            </p>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-sm text-muted-foreground">
                    {totalMarcadas} de {todasAsChaves.length} permissões
                </span>
                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onChange(todasAsChaves)}
                    >
                        Marcar todas
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onChange([])}
                    >
                        Limpar
                    </Button>
                </div>
            </div>

            <Accordion type="multiple" className="w-full">
                {catalogo.map((grupo) => (
                    <AccordionItem key={grupo.chave} value={grupo.chave}>
                        <div className="flex items-center gap-3">
                            <Checkbox
                                checked={estadoDoGrupo(grupo)}
                                onCheckedChange={() => alternarGrupo(grupo)}
                                aria-label={`Marcar todas as permissões de ${grupo.rotulo}`}
                            />
                            <AccordionTrigger className="flex-1 font-medium">
                                {grupo.rotulo}
                            </AccordionTrigger>
                        </div>
                        <AccordionContent>
                            <div className="space-y-3 pl-7">
                                {grupo.acoes.map((acao) => (
                                    <label
                                        key={acao.chave}
                                        className="flex cursor-pointer items-center gap-3 text-sm font-normal text-foreground"
                                    >
                                        <Checkbox
                                            checked={marcada(acao.chave)}
                                            onCheckedChange={() => alternarAcao(acao.chave)}
                                        />
                                        {acao.rotulo}
                                    </label>
                                ))}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    );
}

export default PainelPermissoes;
