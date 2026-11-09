import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Switch } from "../../components/ui/switch";
import { Save, Download, Loader2, Mail } from "lucide-react";
import api from "../../services/api";
import PreferenciasNotificacao from "../../components/PreferenciasNotificacao";

const BOM = String.fromCharCode(0xfeff);

const PADRAO = {
    nomeEmpresa: "",
    diasAvisoCnh: 30,
    kmRevisao: 10000,
    bloquearCnhVencida: true,
    bloquearMadrugada: false,
};

function erroMsg(e, padrao) {
    return e?.response?.data?.message || padrao;
}

// Uma célula de CSV: aspas em volta e aspas internas dobradas.
function celula(valor) {
    if (valor === null || valor === undefined) return '""';
    return `"${String(valor).replace(/"/g, '""')}"`;
}

function secaoCsv(titulo, colunas, linhas) {
    return [
        celula(titulo),
        colunas.map(([rotulo]) => celula(rotulo)).join(";"),
        ...linhas.map((l) => colunas.map(([, pegar]) => celula(pegar(l))).join(";")),
        "",
    ].join("\n");
}

function Configuracoes() {
    const [config, setConfig] = useState(PADRAO);
    const [carregando, setCarregando] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [exportando, setExportando] = useState(false);
    const [enviandoRelatorio, setEnviandoRelatorio] = useState(false);
    const [resultadoRelatorio, setResultadoRelatorio] = useState(null);

    // Mesmo envio da segunda às 7h, feito agora (semana passada). Serve pra testar.
    const enviarRelatorioAgora = async () => {
        setEnviandoRelatorio(true);
        try {
            const res = await api.post("/relatorios-lideres/enviar");
            setResultadoRelatorio(res.data);
            const lista = res.data.resultados ?? [];
            const enviados = lista.filter((r) => r.enviado).length;
            if (lista.length === 0) toast.warning("Nenhum líder cadastrado. Defina líderes em Funcionários ou Setores.");
            else if (enviados === lista.length) toast.success(`Relatório enviado para ${enviados} líder(es).`);
            else toast.warning(`Enviado para ${enviados} de ${lista.length} líder(es). Veja os detalhes no card.`);
        } catch (e) {
            toast.error(erroMsg(e, "Erro ao enviar os relatórios."));
        } finally {
            setEnviandoRelatorio(false);
        }
    };

    useEffect(() => {
        api.get("/configuracoes")
            .then((res) => setConfig({ ...PADRAO, ...res.data }))
            .catch(() => toast.error("Erro ao carregar as configurações."))
            .finally(() => setCarregando(false));
    }, []);

    const alterar = (campo, valor) => setConfig((c) => ({ ...c, [campo]: valor }));

    const handleSalvar = async () => {
        if (!config.nomeEmpresa?.trim()) {
            toast.error("Informe o nome da empresa.");
            return;
        }
        setSalvando(true);
        try {
            const res = await api.put("/configuracoes", {
                ...config,
                diasAvisoCnh: Number(config.diasAvisoCnh),
                kmRevisao: Number(config.kmRevisao),
            });
            setConfig({ ...PADRAO, ...res.data });
            toast.success("Configurações salvas com sucesso!");
        } catch (e) {
            toast.error(erroMsg(e, "Erro ao salvar as configurações."));
        } finally {
            setSalvando(false);
        }
    };

    // Um arquivo .csv (abre no Excel) com veículos, funcionários e cartões.
    const handleBackup = async () => {
        setExportando(true);
        try {
            const [veiculos, funcionarios, cartoes] = await Promise.all([
                api.get("/veiculos").then((r) => r.data).catch(() => []),
                api.get("/funcionarios").then((r) => r.data).catch(() => []),
                api.get("/cartaorfid/liberados").then((r) => r.data).catch(() => []),
            ]);

            const conteudo = [
                secaoCsv("Veículos", [
                    ["Placa", (v) => v.placa],
                    ["Nome", (v) => v.nome],
                    ["Renavam", (v) => v.renavam],
                    ["Km atual", (v) => v.kmAtual],
                    ["Velocidade máxima", (v) => v.velocidadeMaxima],
                    ["Ativo", (v) => (v.ativo ? "Sim" : "Não")],
                ], veiculos),
                secaoCsv("Funcionários", [
                    ["Nome", (f) => f.nome],
                    ["CPF", (f) => f.cpf],
                    ["Matrícula", (f) => f.matricula],
                    ["Setor", (f) => f.setor?.nome],
                    ["CNH", (f) => f.numCNH],
                    ["Categoria", (f) => f.categoriaCNH],
                    ["Validade CNH", (f) => (f.validadeCNH ? format(new Date(`${f.validadeCNH}T00:00:00`), "dd/MM/yyyy") : "")],
                    ["Ativo", (f) => (f.ativo ? "Sim" : "Não")],
                ], funcionarios),
                secaoCsv("Cartões liberados", [["UID", (uid) => uid]], cartoes),
            ].join("\n");

            // O BOM no começo faz o Excel abrir os acentos certos.
            const blob = new Blob([BOM + conteudo], { type: "text/csv;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `backup-frota_${format(new Date(), "yyyy-MM-dd")}.csv`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success("Backup exportado!");
        } catch {
            toast.error("Erro ao exportar o backup.");
        } finally {
            setExportando(false);
        }
    };

    return (
        <div className="w-full space-y-6">
            <div className="flex flex-wrap items-center justify-between border-b border-border pb-4 gap-3">
                <h1 className="text-xl font-semibold text-foreground">Configurações do Sistema</h1>
                <Button onClick={handleSalvar} disabled={carregando || salvando}>
                    {salvando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Salvar alterações
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* Empresa */}
                <Card>
                    <CardHeader>
                        <CardTitle>Empresa</CardTitle>
                        <CardDescription>Aparece no cabeçalho dos relatórios em PDF.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Label htmlFor="nome-empresa">Nome da empresa</Label>
                        <Input
                            id="nome-empresa"
                            value={config.nomeEmpresa}
                            onChange={(e) => alterar("nomeEmpresa", e.target.value)}
                            placeholder="Ex.: Transportes Silva Ltda"
                            disabled={carregando}
                        />
                    </CardContent>
                </Card>

                {/* Avisos */}
                <Card>
                    <CardHeader>
                        <CardTitle>Avisos</CardTitle>
                        <CardDescription>Quando o sistema deve avisar nas notificações.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between gap-4">
                            <div className="space-y-0.5">
                                <Label htmlFor="dias-cnh">Aviso de CNH vencendo</Label>
                                <p className="text-xs text-muted-foreground">Dias de antecedência.</p>
                            </div>
                            <Input id="dias-cnh" type="number" min={0} max={365} value={config.diasAvisoCnh}
                                   onChange={(e) => alterar("diasAvisoCnh", e.target.value)} className="w-24 text-center" disabled={carregando} />
                        </div>
                        <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
                            <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="km-revisao">Revisão a cada</Label>
                                    <Badge variant="outline">Em breve</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">Km entre revisões. O aviso ainda não é gerado.</p>
                            </div>
                            <Input id="km-revisao" type="number" min={1} step={1000} value={config.kmRevisao}
                                   onChange={(e) => alterar("kmRevisao", e.target.value)} className="w-28 text-center" disabled={carregando} />
                        </div>
                    </CardContent>
                </Card>

                {/* Regras de acesso */}
                <Card>
                    <CardHeader>
                        <CardTitle>Regras de acesso ao veículo</CardTitle>
                        <CardDescription>O que impede um motorista de liberar o veículo com o cartão.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between gap-4">
                            <div className="space-y-0.5">
                                <Label htmlFor="cnh-vencida">Bloquear CNH vencida</Label>
                                <p className="text-xs text-muted-foreground">
                                    Quando a CNH vence, os cartões do motorista são bloqueados e a CNH fica pendente
                                    até ser validada em Funcionários. Verificado todo dia e ao salvar o funcionário.
                                </p>
                            </div>
                            <Switch id="cnh-vencida" checked={!!config.bloquearCnhVencida}
                                    onCheckedChange={(v) => alterar("bloquearCnhVencida", v)} disabled={carregando} />
                        </div>
                        <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
                            <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="madrugada">Bloqueio de madrugada</Label>
                                    <Badge variant="outline">Em breve</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">Não liberar o veículo das 22h às 6h.</p>
                            </div>
                            <Switch id="madrugada" checked={!!config.bloquearMadrugada}
                                    onCheckedChange={(v) => alterar("bloquearMadrugada", v)} disabled={carregando} />
                        </div>
                    </CardContent>
                </Card>

                {/* Notificações do usuário logado */}
                <Card>
                    <CardHeader>
                        <CardTitle>Minhas notificações</CardTitle>
                        <CardDescription>O que aparece no seu sino. Salva na hora e vale só para você.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <PreferenciasNotificacao />
                    </CardContent>
                </Card>

                {/* Relatório semanal dos líderes */}
                <Card>
                    <CardHeader>
                        <CardTitle>Relatório semanal dos líderes</CardTitle>
                        <CardDescription>
                            Toda segunda às 7h, cada líder recebe por e-mail a condução da semana anterior dos seus liderados,
                            e um aviso no Telegram (se conectou).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button variant="outline" className="w-full" onClick={enviarRelatorioAgora} disabled={enviandoRelatorio}>
                            {enviandoRelatorio ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                            Enviar agora (semana passada)
                        </Button>
                        {resultadoRelatorio && (
                            <ul className="space-y-2 text-sm">
                                {(resultadoRelatorio.resultados ?? []).map((r) => (
                                    <li key={r.lider} className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
                                        <span>
                                            <span className="font-medium">{r.lider}</span>
                                            <span className="text-muted-foreground"> · {r.liderados} liderado(s)</span>
                                        </span>
                                        {r.enviado ? (
                                            <Badge variant="secondary">{r.telegram ? "E-mail + Telegram" : "E-mail"}</Badge>
                                        ) : (
                                            <span className="text-xs text-destructive">{r.erro || "Não enviado"}</span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                {/* Dados */}
                <Card>
                    <CardHeader>
                        <CardTitle>Dados</CardTitle>
                        <CardDescription>Exporta veículos, funcionários e cartões em um arquivo CSV (abre no Excel).</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="outline" className="w-full" onClick={handleBackup} disabled={exportando}>
                            {exportando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                            Exportar backup (CSV)
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default Configuracoes;
