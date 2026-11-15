import { useCallback, useState } from "react";
import { toast } from "sonner";

/**
 * Erros de um formulário, campo por campo.
 *
 *   const { erros, validar, limpar, resetar } = useErros();
 *
 *   // no salvar:
 *   if (!validar({ cpf: validarCPF(form.cpf), nome: validarNomeCompleto(form.nome) })) return;
 *
 *   // no onChange de um campo: some o erro dele enquanto a pessoa corrige
 *   limpar("cpf");
 *
 * O id de cada campo na tela precisa ser `campo-<nome>` (ex.: "campo-cpf"),
 * para o primeiro campo com erro receber o foco.
 */
export function useErros() {
    const [erros, setErros] = useState({});

    const validar = useCallback((regras) => {
        const encontrados = Object.fromEntries(Object.entries(regras).filter(([, msg]) => msg));
        setErros(encontrados);

        const campos = Object.keys(encontrados);
        if (campos.length === 0) return true;

        toast.error(campos.length === 1 ? "Corrija o campo destacado." : `Corrija os ${campos.length} campos destacados.`);
        // Espera a tela desenhar o erro e leva o cursor ao primeiro campo errado.
        requestAnimationFrame(() => document.getElementById(`campo-${campos[0]}`)?.focus());
        return false;
    }, []);

    const limpar = useCallback((campo) => {
        setErros((atuais) => {
            if (!atuais[campo]) return atuais;
            const restantes = { ...atuais };
            delete restantes[campo];
            return restantes;
        });
    }, []);

    const resetar = useCallback(() => setErros({}), []);

    return { erros, validar, limpar, resetar };
}
