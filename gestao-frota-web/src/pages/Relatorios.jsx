import { useState, useEffect, useMemo } from "react";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Search, Download, Route, Clock, Gauge, AlertTriangle, Activity, FileText } from "lucide-react";
import api from '../services/api';
import { toast } from "sonner";
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { format, parse, subDays } from "date-fns";
import DataPicker from "../components/DataPicker";
import Paginacao from "../components/Paginacao";
import { usePaginacao } from "../utils/usePaginacao";
import { useAuth } from "../context/AuthContext";

const TODOS = "TODOS";

function hojeMenos(dias) {
    return format(subDays(new Date(), dias), "yyyy-MM-dd");
}

// "2026-11-08" → "08/11/2026"
function dataBr(iso) {
    return iso ? format(parse(iso, "yyyy-MM-dd", new Date()), "dd/MM/yyyy") : "-";
}

// 135 → "2 h 15 min"
function formatarDuracao(minutos) {
    const total = Math.round(minutos || 0);
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h === 0) return `${m} min`;
    return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

function Resumo({ icone, rotulo, valor, destaque }) {
    return (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
            <div className="rounded-md bg-muted p-2 text-muted-foreground">
                {icone}
            </div>
            <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{rotulo}</p>
                <p className={`truncate text-sm font-semibold ${destaque ? 'text-destructive' : 'text-foreground'}`}>{valor}</p>
            </div>
        </div>
    );
}

function Relatorios() {
    const { temPermissao } = useAuth();
    const podeExportar = temPermissao("relatorios.exportar");

    const [dataInicio, setDataInicio] = useState(hojeMenos(6));
    const [dataFim, setDataFim] = useState(hojeMenos(0));
    const [veiculos, setVeiculos] = useState([]);
    const [veiculoSelecionado, setVeiculoSelecionado] = useState(TODOS);
    const [dados, setDados] = useState([]);
    // O período do relatório que está na tela (pode ser diferente dos filtros, se o usuário mexeu neles depois).
    const [periodoGerado, setPeriodoGerado] = useState(null);
    const [carregando, setCarregando] = useState(false);

    async function buscarRelatorio(inicio, fim, idVeiculo) {
        if (!inicio || !fim) {
            toast.error("Selecione as datas de início e fim.");
            return;
        }
        if (inicio > fim) {
            toast.error("A data inicial não pode ser depois da data final.");
            return;
        }
        setCarregando(true);
        try {
            const params = { inicio: `${inicio}T00:00:00`, fim: `${fim}T23:59:59` };
            if (idVeiculo !== TODOS) params.idVeiculo = idVeiculo;
            const resp = await api.get("/localizacao/relatorio-km", { params });
            const lista = Array.isArray(resp.data) ? resp.data : [];
            setDados(lista);
            setPeriodoGerado({ inicio, fim });
            if (lista.length === 0) toast.warning("Nenhum registro no período selecionado.");
        } catch {
            toast.error("Erro ao gerar o relatório.");
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        api.get("/veiculos")
            .then((resp) => setVeiculos(Array.isArray(resp.data) ? resp.data : []))
            .catch(() => toast.error("Não foi possível carregar a lista de veículos."));
        buscarRelatorio(hojeMenos(6), hojeMenos(0), TODOS);
    }, []);

    function aplicarAtalho(dias) {
        const inicio = hojeMenos(dias - 1);
        const fim = hojeMenos(0);
        setDataInicio(inicio);
        setDataFim(fim);
        buscarRelatorio(inicio, fim, veiculoSelecionado);
    }

    const totais = useMemo(() => ({
        km: dados.reduce((s, d) => s + (d.kmRodados || 0), 0),
        minutos: dados.reduce((s, d) => s + (d.minutosEmMovimento || 0), 0),
        maxima: dados.length ? Math.max(...dados.map((d) => d.velocidadeMaxima || 0)) : 0,
        excessos: dados.reduce((s, d) => s + (d.excessos || 0), 0),
        eventos: dados.reduce((s, d) => s + (d.freadas || 0) + (d.aceleracoes || 0) + (d.viradasBruscas || 0), 0),
    }), [dados]);

    function baixarPdf() {
        if (dados.length === 0 || !periodoGerado) {
            toast.error("Gere o relatório antes de baixar.");
            return;
        }
        const doc = new jsPDF({ orientation: "landscape" });
        const periodo = `${dataBr(periodoGerado.inicio)} a ${dataBr(periodoGerado.fim)}`;

        doc.setFontSize(16);
        doc.text("Relatório de utilização da frota", 14, 16);
        doc.setFontSize(10);
        doc.text(`Período: ${periodo}`, 14, 23);
        doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 28);
        doc.text(
            `Total: ${totais.km.toFixed(1)} km · ${formatarDuracao(totais.minutos)} em movimento · `
            + `máx. ${totais.maxima.toFixed(0)} km/h · ${totais.excessos} excesso(s) · ${totais.eventos} evento(s) de condução`,
            14, 33
        );

        autoTable(doc, {
            startY: 38,
            theme: "grid",
            head: [["Veículo", "Motoristas", "Distância", "Em movimento", "Vel. média", "Vel. máxima", "Excessos", "Freadas", "Acelerações", "Viradas bruscas"]],
            body: dados.map((d) => [
                d.nome ? `${d.placa} - ${d.nome}` : d.placa,
                (d.motoristas || []).join(", ") || "Não identificado",
                `${(d.kmRodados || 0).toFixed(1)} km`,
                formatarDuracao(d.minutosEmMovimento),
                `${(d.velocidadeMedia || 0).toFixed(0)} km/h`,
                `${(d.velocidadeMaxima || 0).toFixed(0)} km/h`,
                d.excessos ?? 0,
                d.freadas ?? 0,
                d.aceleracoes ?? 0,
                d.viradasBruscas ?? 0,
            ]),
        });

        doc.save(`relatorio-frota_${periodoGerado.inicio}_${periodoGerado.fim}.pdf`);
    }

    const paginacao = usePaginacao(dados, 20);

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
                <h1 className="text-xl font-semibold text-foreground">Relatórios de Utilização</h1>
                {podeExportar && (
                    <Button variant="outline" onClick={baixarPdf} disabled={dados.length === 0}>
                        <Download className="h-4 w-4 mr-2" />Baixar PDF
                    </Button>
                )}
            </div>

            {/* Filtros */}
            <Card>
                <CardContent className="pt-6 space-y-4">
                    <div className="flex gap-4 items-end flex-wrap">
                        <div className="flex-1 min-w-[200px] space-y-2">
                            <Label htmlFor="data-inicio">Data inicial</Label>
                            <DataPicker id="data-inicio" value={dataInicio} onChange={setDataInicio} />
                        </div>
                        <div className="flex-1 min-w-[200px] space-y-2">
                            <Label htmlFor="data-fim">Data final</Label>
                            <DataPicker id="data-fim" value={dataFim} onChange={setDataFim} />
                        </div>
                        <div className="flex-1 min-w-[200px] space-y-2">
                            <Label>Veículo</Label>
                            <Select value={veiculoSelecionado} onValueChange={setVeiculoSelecionado}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Selecione um veículo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={TODOS}>Todos os veículos</SelectItem>
                                    {veiculos.map((v) => (
                                        <SelectItem key={v.id} value={String(v.id)}>
                                            {v.nome ? `${v.placa} - ${v.nome}` : v.placa}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={() => buscarRelatorio(dataInicio, dataFim, veiculoSelecionado)} disabled={carregando}>
                            <Search className="h-4 w-4 mr-2" />{carregando ? "Gerando..." : "Gerar"}
                        </Button>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button variant="secondary" size="sm" onClick={() => aplicarAtalho(1)}>Hoje</Button>
                        <Button variant="secondary" size="sm" onClick={() => aplicarAtalho(7)}>Últimos 7 dias</Button>
                        <Button variant="secondary" size="sm" onClick={() => aplicarAtalho(30)}>Últimos 30 dias</Button>
                    </div>
                </CardContent>
            </Card>

            {/* Resumo do período */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                <Resumo icone={<Route className="size-4" />} rotulo="Distância percorrida" valor={`${totais.km.toFixed(1)} km`} />
                <Resumo icone={<Clock className="size-4" />} rotulo="Tempo em movimento" valor={formatarDuracao(totais.minutos)} />
                <Resumo icone={<Gauge className="size-4" />} rotulo="Velocidade máxima" valor={`${totais.maxima.toFixed(0)} km/h`} />
                <Resumo icone={<AlertTriangle className="size-4" />} rotulo="Excessos de velocidade" valor={totais.excessos} destaque={totais.excessos > 0} />
                <Resumo icone={<Activity className="size-4" />} rotulo="Eventos de condução" valor={totais.eventos} destaque={totais.eventos > 0} />
            </div>

            {/* Detalhamento por veículo */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="size-4 text-muted-foreground" />
                        Detalhamento por veículo
                    </CardTitle>
                    <CardDescription>
                        {periodoGerado
                            ? `De ${dataBr(periodoGerado.inicio)} a ${dataBr(periodoGerado.fim)}. Eventos de condução = freadas, acelerações e viradas bruscas detectadas pela controladora.`
                            : "Selecione o período e clique em Gerar."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Veículo</TableHead>
                                <TableHead>Motoristas</TableHead>
                                <TableHead>Distância</TableHead>
                                <TableHead>Em movimento</TableHead>
                                <TableHead>Vel. média</TableHead>
                                <TableHead>Vel. máxima</TableHead>
                                <TableHead>Excessos</TableHead>
                                <TableHead>Freadas</TableHead>
                                <TableHead>Acelerações</TableHead>
                                <TableHead>Viradas bruscas</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {dados.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                                        {carregando ? "Gerando relatório..." : "Nenhum registro no período."}
                                    </TableCell>
                                </TableRow>
                            ) : paginacao.visiveis.map((d) => (
                                <TableRow key={d.idVeiculo}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-semibold">{d.placa}</span>
                                            {d.nome && <span className="text-xs text-muted-foreground">{d.nome}</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {(d.motoristas || []).join(", ") || "Não identificado"}
                                    </TableCell>
                                    <TableCell className="tabular-nums">{(d.kmRodados || 0).toFixed(1)} km</TableCell>
                                    <TableCell className="tabular-nums">{formatarDuracao(d.minutosEmMovimento)}</TableCell>
                                    <TableCell className="tabular-nums">{(d.velocidadeMedia || 0).toFixed(0)} km/h</TableCell>
                                    <TableCell className={`tabular-nums ${d.velocidadeMaxima > d.limiteVelocidade ? 'font-semibold text-destructive' : ''}`}>
                                        {(d.velocidadeMaxima || 0).toFixed(0)} km/h
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={d.excessos > 0 ? "destructive" : "outline"}>{d.excessos ?? 0}</Badge>
                                    </TableCell>
                                    <TableCell className="tabular-nums">{d.freadas ?? 0}</TableCell>
                                    <TableCell className="tabular-nums">{d.aceleracoes ?? 0}</TableCell>
                                    <TableCell className="tabular-nums">{d.viradasBruscas ?? 0}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <Paginacao
                        pagina={paginacao.pagina}
                        totalPaginas={paginacao.totalPaginas}
                        totalItens={paginacao.totalItens}
                        inicio={paginacao.inicio}
                        fim={paginacao.fim}
                        onChange={paginacao.setPagina}
                    />
                </CardContent>
            </Card>
        </div>
    );
}

export default Relatorios;
