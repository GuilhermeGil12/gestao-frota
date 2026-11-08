import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/ThemeContext";

// Alterna claro/escuro. Fica no topo, ao lado das notificações.
function BotaoTema() {
    const { tema, toggleTema } = useTheme();
    const escuro = tema === "dark";
    const rotulo = escuro ? "Mudar para tema claro" : "Mudar para tema escuro";

    return (
        <Button variant="ghost" size="icon" onClick={toggleTema} aria-label={rotulo} title={rotulo}>
            {escuro ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
    );
}

export default BotaoTema;
