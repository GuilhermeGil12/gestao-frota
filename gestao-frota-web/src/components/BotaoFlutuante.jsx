import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Botão de "adicionar".
 * No celular (abaixo de 768px) flutua no canto de baixo à direita, só com o "+" redondo,
 * acima dos mapas (z 1000) e abaixo do menu aberto e das janelas.
 * No computador vira um botão normal, no lugar onde foi colocado (o cabeçalho da página).
 */
function BotaoFlutuante({ rotulo, onClick, icone = Plus }) {
    const Icone = icone;
    return (
        <Button
            onClick={onClick}
            aria-label={rotulo}
            title={rotulo}
            className="max-md:fixed max-md:bottom-5 max-md:right-5 max-md:z-[1050] max-md:size-14 max-md:rounded-full max-md:p-0 max-md:shadow-lg"
        >
            <Icone className="max-md:size-5" />
            <span className="hidden md:inline">{rotulo}</span>
        </Button>
    );
}

export default BotaoFlutuante;
