import { Children, cloneElement, isValidElement } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Campo de formulário: rótulo + o input (filho) + mensagem de erro embaixo.
 *
 *   <Campo id="campo-cpf" rotulo="CPF" erro={erros.cpf}>
 *       <Input value={...} onChange={...} />
 *   </Campo>
 *
 * Liga sozinho o rótulo ao campo (id), marca o campo como inválido (borda vermelha)
 * e avisa o leitor de tela qual é o erro (aria-describedby).
 */
function Campo({ id, rotulo, erro, ajuda, obrigatorio = false, className, children }) {
    const idErro = `${id}-erro`;
    const idAjuda = `${id}-ajuda`;
    const descritores = [erro && idErro, ajuda && idAjuda].filter(Boolean).join(" ") || undefined;

    const filho = Children.only(children);
    const campo = isValidElement(filho)
        ? cloneElement(filho, {
            id,
            "aria-invalid": erro ? true : undefined,
            "aria-describedby": descritores,
            className: cn(filho.props.className, erro && "border-destructive"),
        })
        : filho;

    return (
        <div className={cn("space-y-2", className)}>
            <Label htmlFor={id}>
                {rotulo}
                {obrigatorio && <span className="text-destructive" aria-hidden="true">*</span>}
            </Label>
            {campo}
            {erro ? (
                <p id={idErro} role="alert" className="text-sm text-destructive">{erro}</p>
            ) : ajuda ? (
                <p id={idAjuda} className="text-xs text-muted-foreground">{ajuda}</p>
            ) : null}
        </div>
    );
}

export default Campo;
