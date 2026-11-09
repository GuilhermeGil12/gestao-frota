import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, IdCard, ShieldCheck, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";

const ATUALIZAR_A_CADA_MS = 60000;

const ICONES = {
    CNH_VENCIDA: IdCard,
    CNH_VENCENDO: IdCard,
    COMANDO_EXECUTADO: ShieldCheck,
};

// O que já foi lido fica no navegador, separado por usuário.
function chaveLidas(usuario) {
    return `notificacoes-lidas-${usuario?.id ?? usuario?.email ?? "anon"}`;
}

function carregarLidas(usuario) {
    try {
        return new Set(JSON.parse(localStorage.getItem(chaveLidas(usuario)) || "[]"));
    } catch {
        return new Set();
    }
}

function salvarLidas(usuario, lidas) {
    try {
        localStorage.setItem(chaveLidas(usuario), JSON.stringify([...lidas]));
    } catch {
        // sem localStorage (aba anônima): só não lembra entre recarregamentos
    }
}

// A CNH tem data no futuro ("vence em 5 dias"); o comando, no passado ("há 2 horas").
function quando(n) {
    if (!n.data) return "";
    if (n.tipo !== "COMANDO_EXECUTADO") return "";
    return formatDistanceToNow(new Date(n.data), { addSuffix: true, locale: ptBR });
}

function Notificacoes() {
    const { usuario } = useAuth();
    const navigate = useNavigate();
    const [notificacoes, setNotificacoes] = useState([]);
    const [lidas, setLidas] = useState(() => carregarLidas(usuario));

    useEffect(() => {
        let ativo = true;
        const buscar = () => {
            api.get("/notificacoes")
                .then((res) => { if (ativo) setNotificacoes(Array.isArray(res.data) ? res.data : []); })
                .catch(() => {}); // o sino não deve encher a tela de erro se o servidor oscilar
        };
        buscar();
        const intervalo = setInterval(buscar, ATUALIZAR_A_CADA_MS);
        return () => { ativo = false; clearInterval(intervalo); };
    }, []);

    const naoLidas = notificacoes.filter((n) => !lidas.has(n.id));

    const marcarLidas = (ids) => {
        const novas = new Set([...lidas, ...ids]);
        // Esquece ids que não existem mais (CNH renovada, comando antigo), pra lista não crescer pra sempre.
        const atuais = new Set(notificacoes.map((n) => n.id));
        const limpas = new Set([...novas].filter((id) => atuais.has(id)));
        setLidas(limpas);
        salvarLidas(usuario, limpas);
    };

    const abrir = (n) => {
        marcarLidas([n.id]);
        if (n.link) navigate(n.link);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
                    <Bell className="h-5 w-5" />
                    {naoLidas.length > 0 && (
                        <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center px-1 text-[10px] border-0">
                            {naoLidas.length > 99 ? "99+" : naoLidas.length}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[calc(100vw-1.5rem)] sm:w-96">
                <div className="flex items-center justify-between pr-2">
                    <DropdownMenuLabel>Notificações</DropdownMenuLabel>
                    {naoLidas.length > 0 && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => marcarLidas(notificacoes.map((n) => n.id))}>
                            <CheckCheck className="h-3.5 w-3.5 mr-1" />Marcar todas como lidas
                        </Button>
                    )}
                </div>
                <DropdownMenuSeparator />
                <div className="max-h-96 overflow-y-auto">
                    {notificacoes.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhuma notificação.</p>
                    ) : notificacoes.map((n) => {
                        const Icone = ICONES[n.tipo] ?? Bell;
                        const lida = lidas.has(n.id);
                        return (
                            <button
                                key={n.id}
                                type="button"
                                onClick={() => abrir(n)}
                                className={`flex w-full gap-3 px-4 py-3 text-left border-b border-border last:border-0 hover:bg-accent transition-colors ${lida ? "opacity-60" : ""}`}
                            >
                                <Icone className={`mt-0.5 h-4 w-4 shrink-0 ${n.tipo === "CNH_VENCIDA" ? "text-destructive" : "text-muted-foreground"}`} />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-foreground">{n.titulo}</p>
                                        {!lida && <span className="size-2 rounded-full bg-primary" aria-label="não lida" />}
                                    </div>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{n.mensagem}</p>
                                    {quando(n) && <span className="text-xs text-muted-foreground">{quando(n)}</span>}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default Notificacoes;
