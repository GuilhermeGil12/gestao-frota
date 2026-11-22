import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Car, Gauge, Power, WifiOff, MapPin } from "lucide-react";
import api from '../services/api';
import { CORES_TRAJETO, rumoAtual } from '../utils/trajeto';
import MapaFundo from '../components/MapaFundo';
import TrajetoMapa from '../components/TrajetoMapa';

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Conserta os ícones padrão do Leaflet (mesma correção do Rotas.jsx)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// O Leaflet desenha em SVG e não enxerga classes do Tailwind, então as cores do
// mapa ficam aqui — e a lista lateral usa as mesmas, pra nunca divergir do mapa.
const CORES_MAPA = {
    parado: '#94a3b8',
    ignicao: '#eab308',
    movimento: '#3b82f6',
    excesso: '#ef4444',
    semSinal: '#64748b',
};

const LIMITE_VELOCIDADE = 110;
const INTERVALO_MS = 5000;

// Marcador pulsante (radar) com os 2 últimos dígitos da placa no meio, na cor da situação.
// Em movimento, ganha uma seta apontando para onde o carro está indo (como no Google Maps).
function iconeCarro(placa, cor, rumo = null) {
    const num = (placa || "").slice(-2);
    const seta = rumo === null ? '' : `
        <span class="carro-seta" style="transform: translate(-50%, -50%) rotate(${Math.round(rumo)}deg)">
          <svg width="48" height="48" viewBox="0 0 48 48"><path d="M24 1 L31 11 L17 11 Z" fill="${cor}" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>
        </span>`;
    return L.divIcon({
        className: '',
        html: `<div class="carro-wrap" style="--cor: ${cor}">
                 <span class="carro-onda"></span>${seta}
                 <span class="carro-badge">${num}</span>
               </div>`,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
        popupAnchor: [0, -18],
    });
}

// Limite cadastrado no veículo; sem valor, vale o padrão de 110 km/h (mesma regra do back-end).
function limiteDo(veiculo) {
    return Number(veiculo?.velocidadeMaxima) > 0 ? Number(veiculo.velocidadeMaxima) : LIMITE_VELOCIDADE;
}

function classificar(ponto, limite = LIMITE_VELOCIDADE) {
    if (!ponto) return { chave: 'semSinal', rotulo: 'Sem sinal', variante: 'outline' };
    if (Number(ponto.velocidade) > limite) return { chave: 'excesso', rotulo: 'Excesso', variante: 'destructive' };
    const status = Number(ponto.status);
    if (status === 10) return { chave: 'movimento', rotulo: 'Em movimento', variante: 'default' };
    if (status === 1) return { chave: 'ignicao', rotulo: 'Ignição', variante: 'secondary' };
    return { chave: 'parado', rotulo: 'Parado', variante: 'outline' };
}

// Data de hoje em yyyy-MM-dd (horário local)
function hojeLocal() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const idDe = (v) => String(v.id_veiculo || v.id);

// Reposiciona o mapa só quando troca o filtro (não a cada atualização de 5s)
function Centralizar({ pontos, gatilho }) {
    const map = useMap();
    useEffect(() => {
        if (pontos.length === 1) map.setView(pontos[0], 15);
        else if (pontos.length > 1) map.fitBounds(pontos, { padding: [40, 40], maxZoom: 15 });
    }, [gatilho, pontos.length > 0]); // eslint-disable-line
    return null;
}

// Acompanha o carro escolhido: quando ele chega perto da borda do mapa, o mapa anda junto.
// Não mexe enquanto o carro está bem visível, para não atrapalhar quem está olhando outro ponto.
function SeguirCarro({ posicao }) {
    const map = useMap();
    const [lat, lng] = posicao;
    useEffect(() => {
        const areaConfortavel = map.getBounds().pad(-0.2);
        if (!areaConfortavel.contains([lat, lng])) {
            map.panTo([lat, lng], { animate: true });
        }
    }, [lat, lng, map]);
    return null;
}

function Resumo({ icone, rotulo, valor }) {
    return (
        <Card className="py-0">
            <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-md bg-muted p-2 text-muted-foreground">{icone}</div>
                <div>
                    <p className="text-xs text-muted-foreground">{rotulo}</p>
                    <p className="text-xl font-semibold text-foreground tabular-nums">{valor}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function DetalhesPonto({ titulo, ponto, limite }) {
    return (
        <div className="min-w-[200px] space-y-1 text-sm">
            <p className="font-semibold">{titulo}</p>
            <p>Motorista: <b>{ponto.motorista || 'Não identificado'}</b></p>
            <p>Velocidade: <b>{ponto.velocidade} km/h</b></p>
            <p>Situação: <b>{classificar(ponto, limite).rotulo}</b></p>
            {ponto.hora && <p>Horário: <b>{ponto.hora}</b></p>}
            {ponto.dataHora && <p>Atualizado: <b>{new Date(ponto.dataHora).toLocaleString("pt-BR")}</b></p>}
        </div>
    );
}

function MonitoramentoTempoReal() {
    const [veiculos, setVeiculos] = useState([]);
    const [veiculoSelecionado, setVeiculoSelecionado] = useState("TODOS");
    const [ultimas, setUltimas] = useState([]); // última posição de cada veículo
    const [rota, setRota] = useState([]);       // trajeto do dia do veículo selecionado

    useEffect(() => {
        api.get("/veiculos")
            .then(r => setVeiculos(r.data))
            .catch(e => console.error("Erro ao carregar veículos:", e));
    }, []);

    // Busca as posições na hora e a cada 5s. As últimas posições sempre vêm,
    // porque alimentam a lista lateral e o resumo mesmo com um veículo filtrado.
    useEffect(() => {
        let ativo = true;

        const buscar = async () => {
            try {
                const r = await api.get("/localizacao/ultimas");
                const porVeiculo = new Map();
                r.data.forEach(p => porVeiculo.set(String(p.idVeiculo), p));
                if (!ativo) return;
                setUltimas([...porVeiculo.values()]);

                if (veiculoSelecionado === "TODOS") { setRota([]); return; }

                const resRota = await api.get("/localizacao/rota", {
                    params: { idVeiculo: veiculoSelecionado, data: hojeLocal() }
                });
                if (!ativo) return;
                // Sem pontos hoje: mostra só a última posição conhecida (se existir)
                const ultima = porVeiculo.get(veiculoSelecionado);
                setRota(resRota.data.length > 0 ? resRota.data : ultima ? [ultima] : []);
            } catch (e) {
                console.error("Erro no monitoramento:", e);
            }
        };

        buscar();
        const intervalo = setInterval(buscar, INTERVALO_MS);
        return () => { ativo = false; clearInterval(intervalo); };
    }, [veiculoSelecionado]);

    // Junta cada veículo cadastrado com a última posição dele
    const frota = useMemo(() => {
        const porId = new Map(ultimas.map(p => [String(p.idVeiculo), p]));
        return veiculos.map(v => {
            const posicao = porId.get(idDe(v)) || null;
            return { ...v, id: idDe(v), posicao, situacao: classificar(posicao, limiteDo(v)) };
        });
    }, [veiculos, ultimas]);

    const contagem = useMemo(() => ({
        movimento: frota.filter(v => ['movimento', 'excesso'].includes(v.situacao.chave)).length,
        parados: frota.filter(v => ['parado', 'ignicao'].includes(v.situacao.chave)).length,
        semSinal: frota.filter(v => v.situacao.chave === 'semSinal').length,
    }), [frota]);

    const selecionado = frota.find(v => v.id === veiculoSelecionado);
    const ultimo = rota.length > 0 ? rota[rota.length - 1] : null;
    // Ao escolher um carro, enquadra o rastro do dia inteiro (não só onde ele está agora).
    const pontosFoco = veiculoSelecionado === "TODOS"
        ? ultimas.map(p => [p.lat, p.lng])
        : rota.map(p => [p.lat, p.lng]);

    // Divide o rastro em trechos: verde no limite, vermelho acima do limite do veículo.
    const limiteSelecionado = Number(selecionado?.velocidadeMaxima) > 0 ? Number(selecionado.velocidadeMaxima) : LIMITE_VELOCIDADE;
    const situacaoAtual = classificar(ultimo, limiteSelecionado);
    const emMovimento = ['movimento', 'excesso'].includes(situacaoAtual.chave);
    const rumo = useMemo(() => (emMovimento ? rumoAtual(rota) : null), [rota, emMovimento]);

    // Troca de veículo: limpa o rastro anterior na hora, para o mapa não enquadrar o carro errado.
    const escolherVeiculo = (id) => { setRota([]); setVeiculoSelecionado(id); };
    const alternarVeiculo = (id) => escolherVeiculo(veiculoSelecionado === id ? "TODOS" : id);

    return (
        <div className="w-full space-y-6">
            {/* CSS do efeito de onda (radar) + badge com o número */}
            <style>{`
                .carro-wrap { position: relative; width: 48px; height: 48px; }
                .carro-badge { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                    width: 28px; height: 28px; background: var(--cor); color: #fff; border: 3px solid #fff;
                    border-radius: 50%; display: flex; align-items: center; justify-content: center;
                    font-size: 12px; font-weight: bold; z-index: 3; box-shadow: 0 1px 6px rgba(0,0,0,.45); }
                .carro-seta { position: absolute; top: 50%; left: 50%; width: 48px; height: 48px; z-index: 2;
                    filter: drop-shadow(0 1px 2px rgba(0,0,0,.4)); transition: transform .6s ease; }
                .carro-onda { position: absolute; top: 50%; left: 50%; width: 28px; height: 28px;
                    background: var(--cor); border-radius: 50%;
                    transform: translate(-50%, -50%); animation: ondaAnim 1.8s ease-out infinite; }
                @keyframes ondaAnim {
                    0%   { transform: translate(-50%, -50%) scale(0.8); opacity: .45; }
                    100% { transform: translate(-50%, -50%) scale(2.6); opacity: 0; }
                }
            `}</style>

            {/* Cabeçalho */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
                <h1 className="text-xl font-semibold text-foreground">Monitoramento</h1>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Label htmlFor="filtro-veiculo" className="sr-only">Veículo</Label>
                        <Select value={veiculoSelecionado} onValueChange={escolherVeiculo}>
                            <SelectTrigger id="filtro-veiculo" className="w-56">
                                <SelectValue placeholder="Selecione um veículo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="TODOS">Todos os veículos</SelectItem>
                                {frota.map(v => (
                                    <SelectItem key={v.id} value={v.id}>
                                        {v.placa}{v.modelo ? ` - ${v.modelo}` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Resumo da frota */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Resumo icone={<Car className="size-4" />} rotulo="Veículos" valor={frota.length} />
                <Resumo icone={<Gauge className="size-4" />} rotulo="Em movimento" valor={contagem.movimento} />
                <Resumo icone={<Power className="size-4" />} rotulo="Parados" valor={contagem.parados} />
                <Resumo icone={<WifiOff className="size-4" />} rotulo="Sem sinal" valor={contagem.semSinal} />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
                {/* Mapa — "isolate" fecha os z-index do Leaflet aqui dentro, pra ele não cobrir o Select */}
                <div className="isolate h-[60vh] min-h-80 overflow-hidden rounded-xl border border-border lg:h-[640px]">
                    <MapContainer center={[-15.78, -47.93]} zoom={4} style={{ height: "100%", width: "100%" }}>
                        <MapaFundo />
                        <Centralizar pontos={pontosFoco} gatilho={veiculoSelecionado} />

                        {/* Todos: cada carro pulsando, com os 2 últimos dígitos da placa */}
                        {veiculoSelecionado === "TODOS" && ultimas.map((p) => {
                            const limite = limiteDo(frota.find(v => v.id === String(p.idVeiculo)));
                            return (
                                <Marker key={p.idVeiculo} position={[p.lat, p.lng]}
                                        icon={iconeCarro(p.placa, CORES_MAPA[classificar(p, limite).chave])}>
                                    <Popup><DetalhesPonto titulo={p.placa} ponto={p} limite={limite} /></Popup>
                                </Marker>
                            );
                        })}

                        {/* Um carro: rastro do dia (cresce a cada 5 s) + onde começou + posição atual pulsando */}
                        {veiculoSelecionado !== "TODOS" && ultimo && (
                            <>
                                <TrajetoMapa pontos={rota} limite={limiteSelecionado} />
                                {rota.length > 1 && (
                                    <CircleMarker center={[rota[0].lat, rota[0].lng]} radius={7}
                                                  pathOptions={{ fillColor: CORES_TRAJETO.inicio, color: CORES_TRAJETO.branco, weight: 3, fillOpacity: 1 }}>
                                        <Popup><DetalhesPonto titulo="Início do dia" ponto={rota[0]} limite={limiteSelecionado} /></Popup>
                                    </CircleMarker>
                                )}
                                <Marker position={[ultimo.lat, ultimo.lng]} zIndexOffset={1000}
                                        icon={iconeCarro(selecionado?.placa, CORES_MAPA[situacaoAtual.chave], rumo)}>
                                    <Popup><DetalhesPonto titulo={`Posição atual — ${selecionado?.placa ?? ''}`} ponto={ultimo} limite={limiteSelecionado} /></Popup>
                                </Marker>
                                <SeguirCarro posicao={[ultimo.lat, ultimo.lng]} />
                            </>
                        )}
                    </MapContainer>
                </div>

                {/* Lista lateral */}
                <Card className="flex h-[60vh] min-h-80 flex-col gap-0 py-0 lg:h-[640px]">
                    <CardHeader className="border-b border-border py-4">
                        <CardTitle className="text-base">Veículos</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-2">
                        {frota.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum veículo cadastrado.</p>
                        ) : frota.map(v => (
                            <button
                                key={v.id}
                                type="button"
                                onClick={() => alternarVeiculo(v.id)}
                                className={`flex w-full cursor-pointer items-center gap-3 rounded-md p-3 text-left transition-colors hover:bg-muted ${v.id === veiculoSelecionado ? 'bg-muted' : ''}`}
                            >
                                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: CORES_MAPA[v.situacao.chave] }} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-foreground">{v.placa}</p>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {v.posicao ? `${Number(v.posicao.velocidade) || 0} km/h · ${v.posicao.motorista || 'Sem motorista'}` : (v.modelo || '—')}
                                    </p>
                                </div>
                                <Badge variant={v.situacao.variante} className="shrink-0">{v.situacao.rotulo}</Badge>
                            </button>
                        ))}
                    </CardContent>
                </Card>
            </div>

            {veiculoSelecionado !== "TODOS" && !ultimo && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="size-4" />
                    Nenhuma posição registrada para esse veículo (GPS sem sinal ou sem dados).
                </p>
            )}
        </div>
    );
}

export default MonitoramentoTempoReal;
