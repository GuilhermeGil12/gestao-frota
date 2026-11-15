import { useState, useEffect, useCallback } from 'react';
import { toast } from "sonner";
import api from '../../services/api';
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Search } from "lucide-react";
import Paginacao from "../../components/Paginacao";
import { usePaginacao } from "../../utils/usePaginacao";

const LIMITE_PADRAO = 110;

const TIPOS = [
    { valor: "todos", rotulo: "Todos" },
    { valor: "velocidade", rotulo: "Excesso de velocidade" },
    { valor: "visitas", rotulo: "Visitas às cercas" },
];

const SELECT = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

// Data local em yyyy-MM-dd (toISOString usaria UTC e, à noite, pularia para o dia seguinte).
function dataLocal(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// O ponto guarda "Nome | Cartão: UID"; separa as duas partes para mostrar melhor.
function separarMotorista(texto) {
    if (!texto) return { nome: "Não identificado", cartao: null };
    const [nome, cartao] = texto.split(" | Cartão: ");
    return { nome: nome || "Não identificado", cartao: cartao || null };
}

const kmh = (v) => `${Number(v || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km/h`;

function duracao(minutos) {
    if (minutos < 60) return `${minutos} min`;
    return `${Math.floor(minutos / 60)} h ${minutos % 60} min`;
}

// Excesso e visita viram o mesmo formato de linha, para a tabela mostrar os dois juntos.
function linhaDeExcesso(a) {
    const limite = Number(a.veiculo?.velocidadeMaxima) > 0 ? Number(a.veiculo.velocidadeMaxima) : LIMITE_PADRAO;
    return {
        chave: `v-${a.id}`,
        tipo: "velocidade",
        data: a.dataHora ? new Date(a.dataHora) : null,
        placa: a.veiculo?.placa,
        motorista: separarMotorista(a.motorista),
        detalhe: <><span className="font-semibold text-destructive">{kmh(a.velocidade)}</span> <span className="text-muted-foreground">(limite {kmh(limite)})</span></>,
    };
}

function linhaDeVisita(v) {
    const ondeFoi = v.casaFuncionario && v.responsavel ? `Casa de ${v.responsavel}` : v.cerca;
    return {
        chave: `c-${v.idCerca}-${v.idVeiculo}-${v.entrada}`,
        tipo: v.casaFuncionario ? "casa" : "visita",
        data: v.entrada ? new Date(v.entrada) : null,
        placa: v.placa,
        motorista: { nome: v.motorista || "Não identificado", cartao: null },
        detalhe: <>{ondeFoi} <span className="text-muted-foreground">· {v.emAndamento ? "ainda está lá" : `ficou ${duracao(v.minutos)}`}</span></>,
    };
}

const SELO = {
    velocidade: <Badge variant="outline" className="border-destructive/40 text-destructive">Velocidade</Badge>,
    visita: <Badge variant="outline">Visita</Badge>,
    casa: <Badge variant="secondary">Casa de funcionário</Badge>,
};

function Alertas() {
    const hoje = new Date();
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(hoje.getDate() - 7);

    const [dataInicio, setDataInicio] = useState(dataLocal(seteDiasAtras));
    const [dataFinal, setDataFinal] = useState(dataLocal(hoje));
    const [tipo, setTipo] = useState("todos");
    const [veiculoSelecionado, setVeiculoSelecionado] = useState("");
    const [veiculos, setVeiculos] = useState([]);
    const [linhas, setLinhas] = useState([]);
    const [carregando, setCarregando] = useState(false);

    const carregar = useCallback(async (inicio, fim, tipoAlerta, idVeiculo) => {
        setCarregando(true);
        try {
            const buscas = [];
            if (tipoAlerta !== "visitas") {
                buscas.push(api.get("/localizacao/alerta", {
                    params: { dataInicio: inicio, dataFinal: fim, idVeiculo: idVeiculo || null },
                }).then(r => (Array.isArray(r.data) ? r.data : []).map(linhaDeExcesso)));
            }
            if (tipoAlerta !== "velocidade") {
                buscas.push(api.get("/localizacao/relatorio-visitas", {
                    params: { inicio: `${inicio}T00:00:00`, fim: `${fim}T23:59:59`, idVeiculo: idVeiculo || null },
                }).then(r => (Array.isArray(r.data) ? r.data : []).map(linhaDeVisita)));
            }
            const juntas = (await Promise.all(buscas)).flat();
            juntas.sort((a, b) => (b.data?.getTime() ?? 0) - (a.data?.getTime() ?? 0)); // mais recentes primeiro
            setLinhas(juntas);
        } catch (e) {
            toast.error(e?.response?.data?.message || "Não foi possível carregar os alertas.");
        } finally {
            setCarregando(false);
        }
    }, []);

    useEffect(() => {
        api.get("/veiculos")
            .then(res => setVeiculos(Array.isArray(res.data) ? res.data : []))
            .catch(() => toast.error("Não foi possível carregar os veículos."));
        carregar(dataInicio, dataFinal, tipo, null);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps -- só ao abrir a tela

    const filtrar = () => {
        if (!dataInicio || !dataFinal) return toast.error("Selecione as datas de início e fim.");
        if (dataInicio > dataFinal) return toast.error("A data inicial é depois da data final.");
        carregar(dataInicio, dataFinal, tipo, veiculoSelecionado);
    };

    const paginacao = usePaginacao(linhas, 20);

    return (
        <div className="w-full space-y-6">
            <div className="flex flex-wrap items-center justify-between border-b border-border pb-4 gap-3">
                <h1 className="text-xl font-semibold text-foreground">Alertas</h1>
            </div>

            {/* Filtros */}
            <Card>
                <CardContent>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.2fr_1.2fr_auto] lg:items-end">
                        <div className="space-y-2">
                            <Label htmlFor="alerta-inicio">Data inicial</Label>
                            <Input id="alerta-inicio" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="alerta-fim">Data final</Label>
                            <Input id="alerta-fim" type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="alerta-tipo">Tipo de alerta</Label>
                            <select id="alerta-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} className={SELECT}>
                                {TIPOS.map(t => <option key={t.valor} value={t.valor}>{t.rotulo}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="alerta-veiculo">Veículo</Label>
                            <select id="alerta-veiculo" value={veiculoSelecionado} onChange={(e) => setVeiculoSelecionado(e.target.value)} className={SELECT}>
                                <option value="">Todos os veículos</option>
                                {veiculos.map((v) => (
                                    <option key={v.id} value={v.id}>{v.placa}{v.nome ? ` · ${v.nome}` : ""}</option>
                                ))}
                            </select>
                        </div>
                        <Button onClick={filtrar} disabled={carregando}><Search className="size-4" />Filtrar</Button>
                    </div>
                </CardContent>
            </Card>

            {/* Excessos (um por ponto acima do limite) e visitas às cercas, mais recentes primeiro */}
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Placa</TableHead>
                        <TableHead>Motorista</TableHead>
                        <TableHead>O que aconteceu</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Hora</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {linhas.length > 0 ? (
                        paginacao.visiveis.map((l) => (
                            <TableRow key={l.chave}>
                                <TableCell>{SELO[l.tipo]}</TableCell>
                                <TableCell className="font-semibold">{l.placa || "—"}</TableCell>
                                <TableCell>
                                    <span className="block">{l.motorista.nome}</span>
                                    {l.motorista.cartao && <span className="block text-xs text-muted-foreground">Cartão {l.motorista.cartao}</span>}
                                </TableCell>
                                <TableCell className="tabular-nums">{l.detalhe}</TableCell>
                                <TableCell className="tabular-nums">{l.data ? l.data.toLocaleDateString("pt-BR") : "—"}</TableCell>
                                <TableCell className="tabular-nums">{l.data ? l.data.toLocaleTimeString("pt-BR") : "—"}</TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                                {carregando ? "Carregando..." : "Nenhum alerta no período."}
                            </TableCell>
                        </TableRow>
                    )}
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
        </div>
    );
}

export default Alertas;
