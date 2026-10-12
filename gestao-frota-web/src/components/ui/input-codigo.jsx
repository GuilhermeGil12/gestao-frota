import { useRef } from "react";
import { cn } from "@/lib/utils";

function InputCodigo({ value = "", onChange, length = 6, disabled = false, className }) {
    const refs = useRef([]);

    const digitos = Array.from({ length }, (_, i) => value[i] ?? "");

    const atualizar = (index, digito) => {
        const novos = [...digitos];
        novos[index] = digito;
        onChange(novos.join("").slice(0, length));
    };

    const handleChange = (index, texto) => {
        const apenasNumeros = texto.replace(/\D/g, "");
        if (!apenasNumeros) {
            atualizar(index, "");
            return;
        }
        atualizar(index, apenasNumeros.slice(-1));
        if (index < length - 1) refs.current[index + 1]?.focus();
    };

    const handleKeyDown = (index, e) => {
        if (e.key === "Backspace" && !digitos[index] && index > 0) {
            e.preventDefault();
            atualizar(index - 1, "");
            refs.current[index - 1]?.focus();
        }
        if (e.key === "ArrowLeft" && index > 0) {
            e.preventDefault();
            refs.current[index - 1]?.focus();
        }
        if (e.key === "ArrowRight" && index < length - 1) {
            e.preventDefault();
            refs.current[index + 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const colado = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
        if (!colado) return;
        onChange(colado);
        refs.current[Math.min(colado.length, length - 1)]?.focus();
    };

    return (
        <div className={cn("flex justify-center gap-2", className)}>
            {digitos.map((digito, i) => (
                <input
                    key={i}
                    ref={(el) => (refs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    disabled={disabled}
                    value={digito}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    onFocus={(e) => e.target.select()}
                    className="size-12 rounded-md border border-input bg-transparent text-center text-xl font-semibold text-foreground shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                />
            ))}
        </div>
    );
}

export { InputCodigo };
