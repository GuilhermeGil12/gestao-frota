import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Botão de "adicionar" flutuante no canto de baixo à direita.
 * No celular fica só o "+" redondo; a partir de 640px aparece o texto junto.
 * Fica acima dos mapas (z 1000), mas abaixo do menu aberto e das janelas.
 */
function BotaoFlutuante({ rotulo, onClick, icone = Plus }) {
    const Icone = icone;
    return (
        <Button
            onClick={onClick}
            aria-label={rotulo}
            title={rotulo}
            className="fixed bottom-5 right-5 z-[1050] size-14 rounded-full p-0 shadow-lg sm:size-auto sm:h-12 sm:px-5 md:bottom-8 md:right-8"
        >
            <Icone className="size-5" />
            <span className="hidden sm:inline">{rotulo}</span>
        </Button>
    );
}

export default BotaoFlutuante;
