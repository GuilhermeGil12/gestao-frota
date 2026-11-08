import { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/services/api";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

// Mesmos tipos do PerfilService.TIPOS_NOTIFICACAO no backend.
const TIPOS = [
    { tipo: "CNH_VENCENDO", rotulo: "CNH vencendo", descricao: "Motoristas com a CNH perto de vencer." },
    { tipo: "CNH_VENCIDA", rotulo: "CNH vencida / pendente", descricao: "CNH vencida e cartão bloqueado até validar." },
    { tipo: "COMANDO_EXECUTADO", rotulo: "Comandos executados", descricao: "Bloqueio, desbloqueio ou apito confirmado pelo veículo." },
];

// Preferências do usuário logado: cada um escolhe o que aparece no próprio sino.
function PreferenciasNotificacao() {
    const [desativadas, setDesativadas] = useState([]);
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        api.get("/perfil")
            .then((res) => setDesativadas(res.data?.notificacoesDesativadas ?? []))
            .catch(() => toast.error("Erro ao carregar suas preferências de notificação."))
            .finally(() => setCarregando(false));
    }, []);

    // Salva na hora em que o usuário mexe no botão.
    const alternar = async (tipo, ligado) => {
        const anteriores = desativadas;
        const novas = ligado ? desativadas.filter((t) => t !== tipo) : [...desativadas, tipo];
        setDesativadas(novas);
        try {
            await api.put("/perfil/notificacoes", novas);
            toast.success(ligado ? "Notificação ativada." : "Notificação desativada.");
        } catch {
            setDesativadas(anteriores);
            toast.error("Erro ao salvar a preferência.");
        }
    };

    return (
        <div className="space-y-4">
            {TIPOS.map((t, i) => (
                <div key={t.tipo} className={`flex items-center justify-between gap-4 ${i > 0 ? "border-t border-border pt-4" : ""}`}>
                    <div className="space-y-0.5">
                        <Label htmlFor={`notif-${t.tipo}`}>{t.rotulo}</Label>
                        <p className="text-xs text-muted-foreground">{t.descricao}</p>
                    </div>
                    <Switch
                        id={`notif-${t.tipo}`}
                        checked={!desativadas.includes(t.tipo)}
                        onCheckedChange={(v) => alternar(t.tipo, v)}
                        disabled={carregando}
                    />
                </div>
            ))}
        </div>
    );
}

export default PreferenciasNotificacao;
