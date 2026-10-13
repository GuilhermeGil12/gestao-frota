import React, { useState, useEffect, useMemo } from 'react';
import { toast } from "sonner";
import { MapContainer, TileLayer, Polyline, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import api from '../../services/api';
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Search, MapPin, Route, Gauge, Clock, AlertTriangle, User } from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import Paginacao from "../../components/Paginacao";
import { usePaginacao } from "../../utils/usePaginacao";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// O Leaflet desenha em SVG e nao enxerga classes do Tailwind, entao as cores dos
// marcadores ficam aqui — e a legenda usa as mesmas, pra nunca divergir do mapa.
const CORES_MAPA = {
    desligado: '#94a3b8',
    parado: '#eab308',
    movimento: '#3b82f6',
    excesso: '#ef4444',
    trajeto: '#ef4444',
};

const LIMITE_PADRAO = 110;
const VELOCIDADE_PARADO = 3; // abaixo disso o GPS oscila mesmo com o carro parado

function classificar(ponto, limite) {
    const status = Number(ponto.status ?? ponto.ign);
    const velocidade = Number(ponto.velocidade) || 0;

    if (velocidade > limite) return { chave: 'excesso', rotulo: 'Excesso', variante: 'destructive' };
    if (status === 0) return { chave: 'desligado', rotulo: 'Desligado', variante: 'outline' };
    if (status === 10 || velocidade >= VELOCIDADE_PARADO) return { chave: 'movimento', rotulo: 'Em movimento', variante: 'default' };
    return { chave: 'parado', rotulo: 'Ligado parado', variante: 'secondary' };
}

// O backend grava "Nome | Cartão: UID"; separamos pra mostrar o nome em destaque.
function separarMotorista(texto) {
    if (!texto) return { nome: 'Não identificado', cartao: null };
    const [nome, cartao] = texto.split(' | Cartão: ');
    return { nome: nome || 'Não identificado', cartao: cartao || null };
}

function distanciaKm(a, b) {
    const R = 6371;
    const rad = (g) => (g * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

function formatarTensao(valor) {
    return valor != null ? `${Number(valor).toFixed(1)} V` : '—';
}

// So reposiciona quando o alvo muda — antes o mapa voltava pro inicio a cada re-render.
function FocarMapa({ alvo }) {
    const map = useMap();
    useEffect(() => {
        if (alvo) map.flyTo([alvo.lat, alvo.lng], alvo.zoom, { duration: 0.6 });
    }, [alvo, map]);
    return null;
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

function Rotas() {
    const [dataBusca, setDataBusca] = useState("");
    const [veiculosReais, setVeiculosReais] = useState([]);
    const [veiculoSelecionado, setVeiculoSelecionado] = useState("");
    const [historicoRotas, setHistoricoRotas] = useState([]);
    const [alvoMapa, setAlvoMapa] = useState(null);
    const [pontoAtivo, setPontoAtivo] = useState(null);

    const veiculo = veiculosReais.find(v => v.id == veiculoSelecionado);
    const limite = veiculo?.velocidadeMaxima || LIMITE_PADRAO;
    const paginacao = usePaginacao(historicoRotas, 25);

    useEffect(() => {
        api.get("/veiculos")
            .then(response => setVeiculosReais(response.data))
            .catch(error => { console.error("Erro ao carregar veiculos:", error); toast.error("Não foi possível carregar a lista de veículos."); });
    }, []);

    const resumo = useMemo(() => {
        if (historicoRotas.length === 0) return null;

        let distancia = 0;
        for (let i = 1; i < historicoRotas.length; i++) distancia += distanciaKm(historicoRotas[i - 1], historicoRotas[i]);

        const velocidades = historicoRotas.map(p => Number(p.velocidade) || 0);
        const emMovimento = velocidades.filter(v => v >= VELOCIDADE_PARADO);
        const motoristas = new Set(historicoRotas.map(p => separarMotorista(p.motorista).nome));

        return {
            inicio: historicoRotas[0].hora,
            fim: historicoRotas[historicoRotas.length - 1].hora,
            distancia,
            maxima: Math.max(...velocidades),
            media: emMovimento.length ? emMovimento.reduce((s, v) => s + v, 0) / emMovimento.length : 0,
            excessos: velocidades.filter(v => v > limite).length,
            motoristas: [...motoristas],
        };
    }, [historicoRotas, limite]);

    const handleBuscarRotas = async () => {
        if (!dataBusca || !veiculoSelecionado) { toast.error("Selecione a data e o veículo."); return; }
        try {
            const response = await api.get(`/localizacao/rota`, { params: { idVeiculo: veiculoSelecionado, data: dataBusca } });
            setPontoAtivo(null);
            if (response.data.length === 0) {
                setHistoricoRotas([]);
                toast.warning("Nenhum dado encontrado para este veículo nesse dia.");
            } else {
                setHistoricoRotas(response.data);
                setAlvoMapa({ lat: response.data[0].lat, lng: response.data[0].lng, zoom: 15 });
                toast.success(`${response.data.length} pontos de telemetria carregados!`);
            }
        } catch (error) {
            console.error("Erro Axios:", error);
            toast.error("Erro ao buscar o trajeto.");
        }
    };

    const focarPonto = (ponto, indiceGlobal) => {
        setPontoAtivo(indiceGlobal);
        setAlvoMapa({ lat: ponto.lat, lng: ponto.lng, zoom: 17 });
    };

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
                <h1 className="text-xl font-semibold text-foreground">Rastreamento de Percurso Diário</h1>
            </div>

            {/* Filtros */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-4 items-end flex-wrap">
                        <div className="flex-1 min-w-[200px] space-y-2">
                            <Label>Data da viagem</Label>
                            <Input type="date" value={dataBusca} onChange={(e) => setDataBusca(e.target.value)} />
                        </div>
                        <div className="flex-1 min-w-[200px] space-y-2">
                            <Label>Veículo</Label>
                            <select value={veiculoSelecionado} onChange={(e) => setVeiculoSelecionado(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                                <option value="">Selecione a placa...</option>
                                {veiculosReais.map((v) => (<option key={v.id} value={v.id}>{v.placa}{v.nome ? ` - ${v.nome}` : ''}</option>))}
                            </select>
                        </div>
                        <Button onClick={handleBuscarRotas}><Search className="h-4 w-4 mr-2" />Gerar trajeto</Button>
                    </div>
                </CardContent>
            </Card>

            {/* Resumo do trajeto */}
            {resumo && (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                    <Resumo icone={<Clock className="size-4" />} rotulo="Período" valor={`${resumo.inicio} – ${resumo.fim}`} />
                    <Resumo icone={<Route className="size-4" />} rotulo="Distância" valor={`${resumo.distancia.toFixed(1)} km`} />
                    <Resumo icone={<Gauge className="size-4" />} rotulo="Velocidade máxima" valor={`${resumo.maxima.toFixed(0)} km/h`} destaque={resumo.maxima > limite} />
                    <Resumo icone={<Gauge className="size-4" />} rotulo="Média em movimento" valor={`${resumo.media.toFixed(0)} km/h`} />
                    <Resumo icone={<AlertTriangle className="size-4" />} rotulo={`Excessos (>${limite} km/h)`} valor={resumo.excessos} destaque={resumo.excessos > 0} />
                    <Resumo icone={<User className="size-4" />} rotulo="Motorista" valor={resumo.motoristas.join(', ')} />
                </div>
            )}

            {/* Mapa */}
            <div className="w-full h-[600px] rounded-xl overflow-hidden border border-border relative">
                <div className="absolute top-3 right-3 z-[1000] space-y-1 rounded-lg border border-border bg-card/95 p-3 text-xs text-card-foreground shadow-md">
                    <p className="mb-1 font-semibold">Legenda</p>
                    {[
                        ['desligado', 'Desligado'],
                        ['parado', 'Ligado parado'],
                        ['movimento', 'Em movimento'],
                        ['excesso', `Acima de ${limite} km/h`],
                    ].map(([chave, rotulo]) => (
                        <div key={chave} className="flex items-center gap-2">
                            <span className="size-3 rounded-full border border-border" style={{ backgroundColor: CORES_MAPA[chave] }} />
                            {rotulo}
                        </div>
                    ))}
                </div>

                <MapContainer center={[-23.5505, -46.6333]} zoom={13} style={{ height: "100%", width: "100%" }}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <FocarMapa alvo={alvoMapa} />
                    {historicoRotas.length > 0 && (
                        <>
                            <Polyline positions={historicoRotas.map(p => [p.lat, p.lng])} color={CORES_MAPA.trajeto} weight={3} opacity={0.7} />
                            {historicoRotas.map((ponto, index) => {
                                const situacao = classificar(ponto, limite);
                                const extremo = index === 0 || index === historicoRotas.length - 1;
                                const ativo = index === pontoAtivo;
                                const motorista = separarMotorista(ponto.motorista);
                                return (
                                    <CircleMarker
                                        key={index}
                                        center={[ponto.lat, ponto.lng]}
                                        radius={ativo ? 10 : extremo ? 8 : 5}
                                        pathOptions={{
                                            fillColor: CORES_MAPA[situacao.chave],
                                            color: ativo ? '#000' : 'white',
                                            weight: ativo ? 3 : 1,
                                            fillOpacity: 1,
                                        }}
                                    >
                                        <Popup>
                                            <div className="min-w-[200px] space-y-1 text-sm">
                                                <p className="font-semibold">
                                                    {index === 0 ? 'Início do trajeto' : index === historicoRotas.length - 1 ? 'Fim do trajeto' : `Ponto ${index + 1}`}
                                                </p>
                                                <p>Horário: <b>{ponto.hora}</b></p>
                                                <p>Motorista: <b>{motorista.nome}</b></p>
                                                <p>Velocidade: <b>{ponto.velocidade} km/h</b></p>
                                                <p>Situação: <b>{situacao.rotulo}</b></p>
                                                <p>Pós-chave: <b>{formatarTensao(ponto.tensaoPosChave)}</b> · Bateria: <b>{formatarTensao(ponto.tensaoSistema)}</b></p>
                                            </div>
                                        </Popup>
                                    </CircleMarker>
                                );
                            })}
                        </>
                    )}
                </MapContainer>
            </div>

            {/* Pontos do trajeto */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MapPin className="size-4 text-muted-foreground" />
                        Pontos do trajeto
                    </CardTitle>
                    <CardDescription>
                        {veiculo && historicoRotas.length > 0
                            ? `${veiculo.placa}${veiculo.nome ? ` · ${veiculo.nome}` : ''} — clique em uma linha para localizar o ponto no mapa.`
                            : 'Selecione a data e o veículo para listar os pontos registrados.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>Horário</TableHead>
                                <TableHead>Motorista</TableHead>
                                <TableHead>Velocidade</TableHead>
                                <TableHead>Situação</TableHead>
                                <TableHead>Pós-chave</TableHead>
                                <TableHead>Bateria</TableHead>
                                <TableHead>Coordenadas</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginacao.totalItens === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum ponto de rota carregado.</TableCell>
                                </TableRow>
                            ) : (paginacao.visiveis.map((h, i) => {
                                const indiceGlobal = paginacao.inicio - 1 + i;
                                const situacao = classificar(h, limite);
                                const motorista = separarMotorista(h.motorista);
                                const velocidade = Number(h.velocidade) || 0;
                                return (
                                    <TableRow
                                        key={`${h.hora}-${indiceGlobal}`}
                                        onClick={() => focarPonto(h, indiceGlobal)}
                                        className={`cursor-pointer ${indiceGlobal === pontoAtivo ? 'bg-muted' : ''}`}
                                    >
                                        <TableCell className="text-muted-foreground">{indiceGlobal + 1}</TableCell>
                                        <TableCell className="font-medium tabular-nums">{h.hora}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span>{motorista.nome}</span>
                                                {motorista.cartao && <span className="text-xs text-muted-foreground">Cartão {motorista.cartao}</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell className={`tabular-nums ${velocidade > limite ? 'font-semibold text-destructive' : ''}`}>
                                            {velocidade.toFixed(0)} km/h
                                        </TableCell>
                                        <TableCell><Badge variant={situacao.variante}>{situacao.rotulo}</Badge></TableCell>
                                        <TableCell className="tabular-nums">{formatarTensao(h.tensaoPosChave)}</TableCell>
                                        <TableCell className="tabular-nums">{formatarTensao(h.tensaoSistema)}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground tabular-nums">
                                            {Number(h.lat).toFixed(5)}, {Number(h.lng).toFixed(5)}
                                        </TableCell>
                                    </TableRow>
                                );
                            }))}
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

export default Rotas;
