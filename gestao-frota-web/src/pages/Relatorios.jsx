import { useState, useEffect, useMemo } from "react";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
    Search, Download, FileSpreadsheet, Route, Clock, Gauge, AlertTriangle, Activity, FileText,
    MapPin, ListOrdered, Building2, ExternalLink,
} from "lucide-react";
import api from '../services/api';
import { toast } from "sonner";
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { format, parse, subDays } from "date-fns";
import DataPicker from "../components/DataPicker";
import Paginacao from "../components/Paginacao";
import { usePaginacao } from "../utils/usePaginacao";
import { useAuth } from "../context/AuthContext";

const BOM = String.fromCharCode(0xfeff);

const TODOS = "TODOS";

// Por que a controladora gerou o ponto (mesmos rótulos da tela de Rotas).
const ROTULOS_EVENTO = {
    IGNICAO_ON: 'Ignição ligada',
    IGNICAO_OFF: 'Ignição desligada',
    ACELERACAO: 'Aceleração brusca',
    FREADA: 'Freada brusca',
    VIRADA_BRUSCA: 'Virada brusca',
    EXCESSO_INICIO: 'Início de excesso',
    EXCESSO_FIM: 'Fim de excesso',
    PARADA: 'Parada',
    PARTIDA: 'Partida',
    CURVA: 'Curva',
    TEMPO: 'Periódico',
};

const EVENTOS_CONDUCAO = ['FREADA', 'ACELERACAO', 'VIRADA_BRUSCA'];

// Filtros do relatório detalhado.
const FILTROS_PONTOS = {
    todos: { rotulo: "Todos os pontos", aceita: () => true },
    conducao: { rotulo: "Só eventos de condução", aceita: (p) => EVENTOS_CONDUCAO.includes(p.evento) },
    excesso: { rotulo: "Só acima do limite", aceita: (p) => p.excesso },
    ignicao: { rotulo: "Só ligar/desligar", aceita: (p) => p.evento === 'IGNICAO_ON' || p.evento === 'IGNICAO_OFF' },
};

function hojeMenos(dias) {
    return format(subDays(new Date(), dias), "yyyy-MM-dd");
}

// "2026-11-08" → "08/11/2026"
function dataBr(iso) {
    return iso ? format(parse(iso, "yyyy-MM-dd", new Date()), "dd/MM/yyyy") : "-";
}

// LocalDateTime do backend ("2026-11-08T15:30:12") → "08/11/2026 15:30:12"
function dataHoraBr(valor, comSegundos = true) {
    return valor ? format(new Date(valor), comSegundos ? "dd/MM/yyyy HH:mm:ss" : "dd/MM/yyyy HH:mm") : "-";
}

// 135 → "2 h 15 min"
function formatarDuracao(minutos) {
    const total = Math.round(minutos || 0);
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h === 0) return `${m} min`;
    return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

function rotuloEvento(evento) {
    return evento ? (ROTULOS_EVENTO[evento] || evento) : "—";
}

function nomeVeiculo(placa, nome) {
    return nome ? `${placa} - ${nome}` : placa;
}

function linkMapa(lat, lng) {
    return `https://www.google.com/maps?q=${lat},${lng}`;
}

function celulaCsv(valor) {
    if (valor === null || valor === undefined) return '""';
    return `"${String(valor).replace(/"/g, '""')}"`;
}

function baixarCsv(nomeArquivo, cabecalho, linhas) {
    const conteudo = [cabecalho, ...linhas].map((l) => l.map(celulaCsv).join(";")).join("\n");
    // O BOM no começo faz o Excel abrir os acentos certos.
    const blob = new Blob([BOM + conteudo], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nomeArquivo;
    link.click();
    URL.revokeObjectURL(url);
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

function Vazio({ colunas, carregando, texto }) {
    return (
        <TableRow>
            <TableCell colSpan={colunas} className="text-center py-8 text-muted-foreground">
                {carregando ? "Gerando relatório..." : texto}
            </TableCell>
        </TableRow>
    );
}

function Relatorios() {
    const { temPermissao } = useAuth();
    const podeExportar = temPermissao("relatorios.exportar");

    const [dataInicio, setDataInicio] = useState(hojeMenos(6));
    const [dataFim, setDataFim] = useState(hojeMenos(0));
    const [veiculos, setVeiculos] = useState([]);
    const [veiculoSelecionado, setVeiculoSelecionado] = useState(TODOS);
    const [aba, setAba] = useState("resumo");
    const [filtroPontos, setFiltroPontos] = useState("todos");
    const [nomeEmpresa, setNomeEmpresa] = useState("");

    const [resumo, setResumo] = useState([]);
    const [detalhado, setDetalhado] = useState({ pontos: [], total: 0, limitado: false, maximo: 0 });
    const [visitas, setVisitas] = useState([]);
    // O período que está na tela (pode ser diferente dos filtros, se o usuário mexeu neles depois).
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
            const [resResumo, resPontos, resVisitas] = await Promise.all([
                api.get("/localizacao/relatorio-km", { params }),
                api.get("/localizacao/relatorio-pontos", { params }),
                api.get("/localizacao/relatorio-visitas", { params }),
            ]);
            const listaResumo = Array.isArray(resResumo.data) ? resResumo.data : [];
            setResumo(listaResumo);
            setDetalhado({ pontos: [], total: 0, limitado: false, maximo: 0, ...resPontos.data });
            setVisitas(Array.isArray(resVisitas.data) ? resVisitas.data : []);
            setPeriodoGerado({ inicio, fim });
            if (listaResumo.length === 0) toast.warning("Nenhum registro no período selecionado.");
            else if (resPontos.data?.limitado) {
                toast.warning(`O período tem ${resPontos.data.total} pontos; o detalhado mostra os primeiros ${resPontos.data.maximo}. Diminua o período para ver todos.`);
            }
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
        api.get("/configuracoes")
            .then((resp) => setNomeEmpresa(resp.data?.nomeEmpresa || ""))
            .catch(() => {});
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
        km: resumo.reduce((s, d) => s + (d.kmRodados || 0), 0),
        minutos: resumo.reduce((s, d) => s + (d.minutosEmMovimento || 0), 0),
        maxima: resumo.length ? Math.max(...resumo.map((d) => d.velocidadeMaxima || 0)) : 0,
        excessos: resumo.reduce((s, d) => s + (d.excessos || 0), 0),
        eventos: resumo.reduce((s, d) => s + (d.freadas || 0) + (d.aceleracoes || 0) + (d.viradasBruscas || 0), 0),
    }), [resumo]);

    const pontosFiltrados = useMemo(
        () => detalhado.pontos.filter(FILTROS_PONTOS[filtroPontos].aceita),
        [detalhado, filtroPontos]
    );

    const totaisVisitas = useMemo(() => ({
        quantidade: visitas.length,
        locais: new Set(visitas.map((v) => v.idCerca)).size,
        minutos: visitas.reduce((s, v) => s + (v.minutos || 0), 0),
    }), [visitas]);

    // ===================== EXPORTAR =====================

    function cabecalhoPdf(doc, titulo, linhaTotais) {
        const periodo = `${dataBr(periodoGerado.inicio)} a ${dataBr(periodoGerado.fim)}`;
        let y = 14;
        if (nomeEmpresa) {
            doc.setFontSize(10);
            doc.text(nomeEmpresa, 14, y);
            y += 7;
        }
        doc.setFontSize(16);
        doc.text(titulo, 14, y);
        doc.setFontSize(10);
        doc.text(`Período: ${periodo}`, 14, y + 7);
        doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, y + 12);
        if (linhaTotais) doc.text(linhaTotais, 14, y + 17);
        return y + (linhaTotais ? 22 : 17);
    }

    function baixarPdf() {
        if (!periodoGerado) {
            toast.error("Gere o relatório antes de baixar.");
            return;
        }
        const doc = new jsPDF({ orientation: "landscape" });
        const sufixo = `${periodoGerado.inicio}_${periodoGerado.fim}`;

        if (aba === "resumo") {
            if (resumo.length === 0) return toast.error("Não há dados para exportar.");
            const startY = cabecalhoPdf(doc, "Relatório de utilização da frota — Resumo",
                `Total: ${totais.km.toFixed(1)} km · ${formatarDuracao(totais.minutos)} em movimento · `
                + `máx. ${totais.maxima.toFixed(0)} km/h · ${totais.excessos} excesso(s) · ${totais.eventos} evento(s) de condução`);
            autoTable(doc, {
                startY, theme: "grid",
                head: [["Veículo", "Motoristas", "Distância", "Em movimento", "Vel. média", "Vel. máxima", "Excessos", "Freadas", "Acelerações", "Viradas bruscas"]],
                body: resumo.map((d) => [
                    nomeVeiculo(d.placa, d.nome),
                    (d.motoristas || []).join(", ") || "Não identificado",
                    `${(d.kmRodados || 0).toFixed(1)} km`,
                    formatarDuracao(d.minutosEmMovimento),
                    `${(d.velocidadeMedia || 0).toFixed(0)} km/h`,
                    `${(d.velocidadeMaxima || 0).toFixed(0)} km/h`,
                    d.excessos ?? 0, d.freadas ?? 0, d.aceleracoes ?? 0, d.viradasBruscas ?? 0,
                ]),
            });
            doc.save(`relatorio-resumo_${sufixo}.pdf`);
        } else if (aba === "detalhado") {
            if (pontosFiltrados.length === 0) return toast.error("Não há pontos para exportar.");
            const startY = cabecalhoPdf(doc, "Relatório de utilização da frota — Detalhado",
                `${pontosFiltrados.length} ponto(s) · ${FILTROS_PONTOS[filtroPontos].rotulo}`);
            autoTable(doc, {
                startY, theme: "grid", styles: { fontSize: 8 },
                head: [["Data/hora", "Veículo", "Motorista", "Velocidade", "Evento", "Ignição", "Satélites", "Latitude", "Longitude"]],
                body: pontosFiltrados.map((p) => [
                    dataHoraBr(p.dataHora),
                    nomeVeiculo(p.placa, p.nomeVeiculo),
                    p.motorista,
                    `${(p.velocidade || 0).toFixed(0)} km/h${p.excesso ? " (excesso)" : ""}`,
                    rotuloEvento(p.evento),
                    p.ignicao ? "Ligada" : "Desligada",
                    p.qtdSatelite ?? "—",
                    p.latitude?.toFixed(5), p.longitude?.toFixed(5),
                ]),
            });
            doc.save(`relatorio-detalhado_${sufixo}.pdf`);
        } else {
            if (visitas.length === 0) return toast.error("Não há visitas para exportar.");
            const startY = cabecalhoPdf(doc, "Relatório de visitas",
                `${totaisVisitas.quantidade} visita(s) em ${totaisVisitas.locais} local(is) · ${formatarDuracao(totaisVisitas.minutos)} no total`);
            autoTable(doc, {
                startY, theme: "grid",
                head: [["Local", "Responsável", "Veículo", "Motorista", "Entrada", "Saída", "Duração"]],
                body: visitas.map((v) => [
                    v.cerca, v.responsavel || "—", nomeVeiculo(v.placa, v.nomeVeiculo), v.motorista,
                    dataHoraBr(v.entrada, false),
                    v.emAndamento ? "Ainda no local" : dataHoraBr(v.saida, false),
                    formatarDuracao(v.minutos),
                ]),
            });
            doc.save(`relatorio-visitas_${sufixo}.pdf`);
        }
    }

    function exportarCsv() {
        if (!periodoGerado) {
            toast.error("Gere o relatório antes de baixar.");
            return;
        }
        const sufixo = `${periodoGerado.inicio}_${periodoGerado.fim}`;
        if (aba === "resumo") {
            baixarCsv(`relatorio-resumo_${sufixo}.csv`,
                ["Placa", "Veículo", "Motoristas", "Distância (km)", "Em movimento (min)", "Vel. média (km/h)", "Vel. máxima (km/h)", "Excessos", "Freadas", "Acelerações", "Viradas bruscas"],
                resumo.map((d) => [d.placa, d.nome, (d.motoristas || []).join(", "), (d.kmRodados || 0).toFixed(2).replace(".", ","),
                    d.minutosEmMovimento, (d.velocidadeMedia || 0).toFixed(1).replace(".", ","), (d.velocidadeMaxima || 0).toFixed(0),
                    d.excessos, d.freadas, d.aceleracoes, d.viradasBruscas]));
        } else if (aba === "detalhado") {
            baixarCsv(`relatorio-detalhado_${sufixo}.csv`,
                ["Data/hora", "Placa", "Veículo", "Motorista", "Cartão", "Velocidade (km/h)", "Acima do limite", "Evento", "Ignição", "Satélites", "Latitude", "Longitude", "Pós-chave (V)", "Bateria (V)"],
                pontosFiltrados.map((p) => [dataHoraBr(p.dataHora), p.placa, p.nomeVeiculo, p.motorista, p.cartao,
                    (p.velocidade || 0).toFixed(1).replace(".", ","), p.excesso ? "Sim" : "Não", rotuloEvento(p.evento),
                    p.ignicao ? "Ligada" : "Desligada", p.qtdSatelite, p.latitude, p.longitude, p.tensaoPosChave, p.tensaoSistema]));
        } else {
            baixarCsv(`relatorio-visitas_${sufixo}.csv`,
                ["Local", "Responsável", "Placa", "Veículo", "Motorista", "Entrada", "Saída", "Duração (min)"],
                visitas.map((v) => [v.cerca, v.responsavel, v.placa, v.nomeVeiculo, v.motorista, dataHoraBr(v.entrada),
                    v.emAndamento ? "Ainda no local" : dataHoraBr(v.saida), v.minutos]));
        }
    }

    const paginacaoResumo = usePaginacao(resumo, 20);
    const paginacaoPontos = usePaginacao(pontosFiltrados, 50);
    const paginacaoVisitas = usePaginacao(visitas, 20);

    const descricaoPeriodo = periodoGerado
        ? `De ${dataBr(periodoGerado.inicio)} a ${dataBr(periodoGerado.fim)}.`
        : "Selecione o período e clique em Gerar.";

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4 gap-4">
                <h1 className="text-xl font-semibold text-foreground">Relatórios</h1>
                {podeExportar && (
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={exportarCsv} disabled={!periodoGerado}>
                            <FileSpreadsheet className="h-4 w-4 mr-2" />Excel (CSV)
                        </Button>
                        <Button variant="outline" onClick={baixarPdf} disabled={!periodoGerado}>
                            <Download className="h-4 w-4 mr-2" />PDF
                        </Button>
                    </div>
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
                                        <SelectItem key={v.id} value={String(v.id)}>{nomeVeiculo(v.placa, v.nome)}</SelectItem>
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

            <Tabs value={aba} onValueChange={setAba} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="resumo"><FileText className="h-4 w-4 mr-1" />Resumo</TabsTrigger>
                    <TabsTrigger value="detalhado"><ListOrdered className="h-4 w-4 mr-1" />Detalhado</TabsTrigger>
                    <TabsTrigger value="visitas"><MapPin className="h-4 w-4 mr-1" />Visitas</TabsTrigger>
                </TabsList>

                {/* ===================== RESUMO ===================== */}
                <TabsContent value="resumo" className="space-y-6">
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                        <Resumo icone={<Route className="size-4" />} rotulo="Distância percorrida" valor={`${totais.km.toFixed(1)} km`} />
                        <Resumo icone={<Clock className="size-4" />} rotulo="Tempo em movimento" valor={formatarDuracao(totais.minutos)} />
                        <Resumo icone={<Gauge className="size-4" />} rotulo="Velocidade máxima" valor={`${totais.maxima.toFixed(0)} km/h`} />
                        <Resumo icone={<AlertTriangle className="size-4" />} rotulo="Excessos de velocidade" valor={totais.excessos} destaque={totais.excessos > 0} />
                        <Resumo icone={<Activity className="size-4" />} rotulo="Eventos de condução" valor={totais.eventos} destaque={totais.eventos > 0} />
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Resumo por veículo</CardTitle>
                            <CardDescription>{descricaoPeriodo} Eventos de condução = freadas, acelerações e viradas bruscas detectadas pela controladora.</CardDescription>
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
                                    {resumo.length === 0 ? (
                                        <Vazio colunas={10} carregando={carregando} texto="Nenhum registro no período." />
                                    ) : paginacaoResumo.visiveis.map((d) => (
                                        <TableRow key={d.idVeiculo}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold">{d.placa}</span>
                                                    {d.nome && <span className="text-xs text-muted-foreground">{d.nome}</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{(d.motoristas || []).join(", ") || "Não identificado"}</TableCell>
                                            <TableCell className="tabular-nums">{(d.kmRodados || 0).toFixed(1)} km</TableCell>
                                            <TableCell className="tabular-nums">{formatarDuracao(d.minutosEmMovimento)}</TableCell>
                                            <TableCell className="tabular-nums">{(d.velocidadeMedia || 0).toFixed(0)} km/h</TableCell>
                                            <TableCell className={`tabular-nums ${d.velocidadeMaxima > d.limiteVelocidade ? 'font-semibold text-destructive' : ''}`}>
                                                {(d.velocidadeMaxima || 0).toFixed(0)} km/h
                                            </TableCell>
                                            <TableCell><Badge variant={d.excessos > 0 ? "destructive" : "outline"}>{d.excessos ?? 0}</Badge></TableCell>
                                            <TableCell className="tabular-nums">{d.freadas ?? 0}</TableCell>
                                            <TableCell className="tabular-nums">{d.aceleracoes ?? 0}</TableCell>
                                            <TableCell className="tabular-nums">{d.viradasBruscas ?? 0}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <Paginacao pagina={paginacaoResumo.pagina} totalPaginas={paginacaoResumo.totalPaginas} totalItens={paginacaoResumo.totalItens}
                                       inicio={paginacaoResumo.inicio} fim={paginacaoResumo.fim} onChange={paginacaoResumo.setPagina} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ===================== DETALHADO ===================== */}
                <TabsContent value="detalhado">
                    <Card>
                        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                            <div className="space-y-1.5">
                                <CardTitle>Todos os pontos registrados</CardTitle>
                                <CardDescription>
                                    {descricaoPeriodo} {pontosFiltrados.length} de {detalhado.pontos.length} ponto(s).
                                    {detalhado.limitado && ` O período tem ${detalhado.total} pontos; mostrando os primeiros ${detalhado.maximo}.`}
                                </CardDescription>
                            </div>
                            <Select value={filtroPontos} onValueChange={setFiltroPontos}>
                                <SelectTrigger className="w-56">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(FILTROS_PONTOS).map(([chave, f]) => (
                                        <SelectItem key={chave} value={chave}>{f.rotulo}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Data/hora</TableHead>
                                        <TableHead>Veículo</TableHead>
                                        <TableHead>Motorista</TableHead>
                                        <TableHead>Velocidade</TableHead>
                                        <TableHead>Evento</TableHead>
                                        <TableHead>Ignição</TableHead>
                                        <TableHead>Satélites</TableHead>
                                        <TableHead>Local</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pontosFiltrados.length === 0 ? (
                                        <Vazio colunas={8} carregando={carregando} texto="Nenhum ponto para o filtro selecionado." />
                                    ) : paginacaoPontos.visiveis.map((p) => (
                                        <TableRow key={p.id}>
                                            <TableCell className="tabular-nums whitespace-nowrap">{dataHoraBr(p.dataHora)}</TableCell>
                                            <TableCell className="font-medium">{p.placa}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span>{p.motorista}</span>
                                                    {p.cartao && <span className="text-xs text-muted-foreground">Cartão {p.cartao}</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell className={`tabular-nums ${p.excesso ? 'font-semibold text-destructive' : ''}`}>
                                                {(p.velocidade || 0).toFixed(0)} km/h
                                            </TableCell>
                                            <TableCell>
                                                {EVENTOS_CONDUCAO.includes(p.evento)
                                                    ? <Badge variant="destructive">{rotuloEvento(p.evento)}</Badge>
                                                    : <span className="text-muted-foreground">{rotuloEvento(p.evento)}</span>}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={p.ignicao ? "secondary" : "outline"}>{p.ignicao ? "Ligada" : "Desligada"}</Badge>
                                            </TableCell>
                                            <TableCell className="tabular-nums">
                                                {p.qtdSatelite === 0
                                                    ? <span className="text-muted-foreground">Sem GPS</span>
                                                    : (p.qtdSatelite ?? "—")}
                                            </TableCell>
                                            <TableCell>
                                                <a href={linkMapa(p.latitude, p.longitude)} target="_blank" rel="noreferrer"
                                                   className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground tabular-nums">
                                                    {p.latitude?.toFixed(5)}, {p.longitude?.toFixed(5)}
                                                    <ExternalLink className="h-3 w-3" />
                                                </a>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <Paginacao pagina={paginacaoPontos.pagina} totalPaginas={paginacaoPontos.totalPaginas} totalItens={paginacaoPontos.totalItens}
                                       inicio={paginacaoPontos.inicio} fim={paginacaoPontos.fim} onChange={paginacaoPontos.setPagina} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ===================== VISITAS ===================== */}
                <TabsContent value="visitas" className="space-y-6">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <Resumo icone={<MapPin className="size-4" />} rotulo="Visitas" valor={totaisVisitas.quantidade} />
                        <Resumo icone={<Building2 className="size-4" />} rotulo="Locais visitados" valor={totaisVisitas.locais} />
                        <Resumo icone={<Clock className="size-4" />} rotulo="Tempo nos locais" valor={formatarDuracao(totaisVisitas.minutos)} />
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Visitas às cercas</CardTitle>
                            <CardDescription>
                                {descricaoPeriodo} Cada visita vai da entrada do veículo na cerca até a saída.
                                Passagens de menos de 1 minuto não contam. Cadastre os locais em Veículos → Cercas.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Local</TableHead>
                                        <TableHead>Responsável</TableHead>
                                        <TableHead>Veículo</TableHead>
                                        <TableHead>Motorista</TableHead>
                                        <TableHead>Entrada</TableHead>
                                        <TableHead>Saída</TableHead>
                                        <TableHead>Duração</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {visitas.length === 0 ? (
                                        <Vazio colunas={7} carregando={carregando} texto="Nenhuma visita às cercas no período." />
                                    ) : paginacaoVisitas.visiveis.map((v, i) => (
                                        <TableRow key={`${v.idCerca}-${v.idVeiculo}-${v.entrada}-${i}`}>
                                            <TableCell className="font-medium">{v.cerca}</TableCell>
                                            <TableCell className="text-muted-foreground">{v.responsavel || "—"}</TableCell>
                                            <TableCell>{v.placa}</TableCell>
                                            <TableCell>{v.motorista}</TableCell>
                                            <TableCell className="tabular-nums whitespace-nowrap">{dataHoraBr(v.entrada, false)}</TableCell>
                                            <TableCell className="tabular-nums whitespace-nowrap">
                                                {v.emAndamento ? <Badge variant="secondary">Ainda no local</Badge> : dataHoraBr(v.saida, false)}
                                            </TableCell>
                                            <TableCell className="tabular-nums">{formatarDuracao(v.minutos)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <Paginacao pagina={paginacaoVisitas.pagina} totalPaginas={paginacaoVisitas.totalPaginas} totalItens={paginacaoVisitas.totalItens}
                                       inicio={paginacaoVisitas.inicio} fim={paginacaoVisitas.fim} onChange={paginacaoVisitas.setPagina} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default Relatorios;
