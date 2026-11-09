import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Send, Loader2, Unplug, BellRing } from "lucide-react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const ESPERA_MAXIMA_MS = 10 * 60 * 1000;  // o código do link vale 10 min
const CONFERIR_A_CADA_MS = 3000;

function erroMsg(e, padrao) {
    return e?.response?.data?.message || padrao;
}

/**
 * Conectar o Telegram do usuário logado:
 * abre t.me/<bot>?start=<código>; quando a pessoa toca em "Iniciar", o backend
 * recebe o código e liga o chat a esta conta. Aqui a tela fica conferindo até conectar.
 */
function ConexaoTelegram() {
    const [status, setStatus] = useState(null);       // { disponivel, conectado, bot }
    const [aguardando, setAguardando] = useState(false);
    const [ocupado, setOcupado] = useState(false);
    const intervalo = useRef(null);

    const carregar = () => api.get("/perfil/telegram").then((res) => { setStatus(res.data); return res.data; });

    useEffect(() => {
        carregar().catch(() => setStatus({ disponivel: false, conectado: false }));
        return () => clearInterval(intervalo.current);
    }, []);

    const conectar = async () => {
        setOcupado(true);
        try {
            const res = await api.post("/perfil/telegram");
            window.open(res.data.link, "_blank", "noopener");
            setAguardando(true);
            const inicio = Date.now();
            clearInterval(intervalo.current);
            intervalo.current = setInterval(async () => {
                try {
                    const atual = await carregar();
                    if (atual.conectado) {
                        clearInterval(intervalo.current);
                        setAguardando(false);
                        toast.success("Telegram conectado!");
                    } else if (Date.now() - inicio > ESPERA_MAXIMA_MS) {
                        clearInterval(intervalo.current);
                        setAguardando(false);
                    }
                } catch {
                    // tenta de novo no próximo intervalo
                }
            }, CONFERIR_A_CADA_MS);
        } catch (e) {
            toast.error(erroMsg(e, "Não foi possível gerar o link do Telegram."));
        } finally {
            setOcupado(false);
        }
    };

    const testar = async () => {
        setOcupado(true);
        try {
            await api.post("/perfil/telegram/teste");
            toast.success("Mensagem de teste enviada. Confira o Telegram.");
        } catch (e) {
            toast.error(erroMsg(e, "Erro ao enviar o teste."));
        } finally {
            setOcupado(false);
        }
    };

    const desconectar = async () => {
        setOcupado(true);
        try {
            await api.delete("/perfil/telegram");
            await carregar();
            toast.success("Telegram desconectado.");
        } catch (e) {
            toast.error(erroMsg(e, "Erro ao desconectar."));
        } finally {
            setOcupado(false);
        }
    };

    if (!status) {
        return <p className="text-sm text-muted-foreground">Carregando...</p>;
    }

    if (!status.disponivel) {
        return (
            <p className="text-sm text-muted-foreground">
                O Telegram ainda não foi configurado no servidor. É preciso definir o token do bot (<code>TELEGRAM_TOKEN</code>).
            </p>
        );
    }

    if (status.conectado) {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Badge>Conectado</Badge>
                    <span className="text-sm text-muted-foreground">Os avisos chegam pelo bot @{status.bot}.</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={testar} disabled={ocupado}>
                        <BellRing className="h-4 w-4 mr-2" />Enviar teste
                    </Button>
                    <Button variant="outline" onClick={desconectar} disabled={ocupado}>
                        <Unplug className="h-4 w-4 mr-2" />Desconectar
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
                Receba no celular os avisos que você ativou em "Minhas notificações". Ao clicar, o Telegram abre
                no bot @{status.bot}: toque em <strong className="text-foreground">Iniciar</strong> e pronto.
            </p>
            <Button onClick={conectar} disabled={ocupado || aguardando}>
                {aguardando || ocupado ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                {aguardando ? "Aguardando você tocar em Iniciar..." : "Conectar Telegram"}
            </Button>
        </div>
    );
}

export default ConexaoTelegram;
