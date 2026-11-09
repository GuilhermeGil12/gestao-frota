import { useEffect, useState } from "react";
import { Bot } from "lucide-react";
import api from "@/services/api";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";

// ---- Cache das fotos (compartilhado por todos os avatares da tela) ----
// Uma tabela com 50 linhas do mesmo usuário faz UMA requisição só:
// os ids pedidos no mesmo instante são juntados e buscados de uma vez.
const fotos = new Map();      // id -> data URL ou null (sem foto)
const pendentes = new Set();
const ouvintes = new Set();
let agendado = null;

async function buscarPendentes() {
    const ids = [...pendentes];
    pendentes.clear();
    agendado = null;
    try {
        const res = await api.get("/perfil/fotos", { params: { ids: ids.join(",") } });
        ids.forEach((id) => fotos.set(id, res.data?.[String(id)] ?? null));
    } catch {
        ids.forEach((id) => fotos.set(id, null));
    }
    ouvintes.forEach((avisar) => avisar());
}

function pedirFoto(id) {
    if (fotos.has(id) || pendentes.has(id)) return;
    pendentes.add(id);
    if (!agendado) agendado = setTimeout(buscarPendentes, 30);
}

function useFotoUsuario(id) {
    const [, atualizar] = useState(0);
    useEffect(() => {
        if (id == null) return undefined;
        const avisar = () => atualizar((n) => n + 1);
        ouvintes.add(avisar);
        pedirFoto(id);
        return () => ouvintes.delete(avisar);
    }, [id]);
    return id == null ? null : fotos.get(id) ?? null;
}

function iniciais(nome) {
    return (nome || "?").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

/**
 * Foto redonda de quem fez a ação; passando o mouse aparece o nome.
 * id null + nome "Sistema" = ação automática (ícone de robô).
 */
function AvatarUsuario({ id, nome, className = "size-7" }) {
    const { usuario } = useAuth();
    const fotoDoCache = useFotoUsuario(id);
    // A própria foto vem da sessão: muda na hora em que o usuário troca no Perfil.
    const foto = id != null && usuario?.id === id ? usuario.foto : fotoDoCache;
    const sistema = id == null && nome === "Sistema";
    const rotulo = nome || "Usuário desconhecido";

    return (
        <TooltipProvider delayDuration={150}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span
                        tabIndex={0}
                        aria-label={rotulo}
                        className={`inline-flex ${className} shrink-0 cursor-default items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-[10px] font-semibold text-muted-foreground`}
                    >
                        {foto ? (
                            <img src={foto} alt="" className="size-full object-cover" />
                        ) : sistema ? (
                            <Bot className="size-3.5" />
                        ) : (
                            iniciais(rotulo)
                        )}
                    </span>
                </TooltipTrigger>
                <TooltipContent>{rotulo}</TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

export default AvatarUsuario;
