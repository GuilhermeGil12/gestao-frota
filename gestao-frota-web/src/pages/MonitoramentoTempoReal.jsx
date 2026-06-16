import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';

// Conserta os ícones padrão do Leaflet (mesma correção do Rotas.jsx)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Marcador pulsante (radar) com os 2 últimos dígitos da placa no meio
function iconeCarro(placa) {
    const num = (placa || "").slice(-2); // últimos 2 caracteres da placa
    return L.divIcon({
        className: '',
        html: `<div class="carro-wrap">
                 <span class="carro-onda"></span>
                 <span class="carro-badge">${num}</span>
               </div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -16],
    });
}

function statusTexto(s) {
    const v = Number(s);
    if (v === 0) return "Parado";
    if (v === 1) return "Ignição";
    if (v === 10) return "Em Movimento";
    return "—";
}

function corStatus(velocidade, status) {
    if (velocidade > 110) return 'red';
    const v = Number(status);
    if (v === 0) return '#bdc3c7';   // parado (cinza)
    if (v === 1) return '#f1c40f';   // ignição (amarelo)
    return '#3498db';                // movimento (azul)
}

// Data de hoje em yyyy-MM-dd (horário local)
function hojeLocal() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Recentraliza o mapa só quando troca o carro selecionado (não a cada refresh)
function Centralizar({ posicao, gatilho }) {
    const map = useMap();
    useEffect(() => {
        if (posicao) map.setView(posicao, 15);
    }, [gatilho]); // eslint-disable-line
    return null;
}

function MonitoramentoTempoReal() {
    const [veiculos, setVeiculos] = useState([]);
    const [veiculoSelecionado, setVeiculoSelecionado] = useState("TODOS");
    const [posicoes, setPosicoes] = useState([]); // modo "todos"
    const [rota, setRota] = useState([]);          // modo "um carro"

    // Lista de veículos pro filtro (uma vez)
    useEffect(() => {
        axios.get("http://localhost:8080/api/veiculos")
            .then(r => setVeiculos(r.data))
            .catch(e => console.error("Erro ao carregar veículos:", e));
    }, []);

    // Busca as posições conforme o filtro — na hora e a cada 5s
    useEffect(() => {
        let ativo = true;

        const buscar = async () => {
            try {
                if (veiculoSelecionado === "TODOS") {
                    const r = await axios.get("http://localhost:8080/api/localizacao/ultimas");
                    // Remove duplicados: 1 ponto por veículo
                    const porVeiculo = new Map();
                    r.data.forEach(p => porVeiculo.set(p.idVeiculo, p));
                    if (ativo) { setPosicoes([...porVeiculo.values()]); setRota([]); }
                } else {
                    const r = await axios.get("http://localhost:8080/api/localizacao/rota", {
                        params: { idVeiculo: veiculoSelecionado, data: hojeLocal() }
                    });
                    if (ativo) { setRota(r.data); setPosicoes([]); }
                }
            } catch (e) {
                console.error("Erro no monitoramento:", e);
            }
        };

        buscar();
        const intervalo = setInterval(buscar, 5000); // atualiza sozinho a cada 5s
        return () => { ativo = false; clearInterval(intervalo); };
    }, [veiculoSelecionado]);

    // Modo "um carro": placa (pro badge) e posição atual = último ponto
    const veiculoObj = veiculos.find(v => String(v.id_veiculo || v.id) === String(veiculoSelecionado));
    const placaSelecionada = veiculoObj ? veiculoObj.placa : "";
    const ultimo = rota.length > 0 ? rota[rota.length - 1] : null;
    const posAtual = ultimo ? [ultimo.lat, ultimo.lng] : null;

    return (
        <div className="w-full space-y-6">
            {/* CSS do efeito de onda (radar) + badge com o número */}
            <style>{`
                .carro-wrap { position: relative; width: 34px; height: 34px; }
                .carro-badge { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                    width: 28px; height: 28px; background: #2563eb; color: #fff; border: 2px solid #fff;
                    border-radius: 50%; display: flex; align-items: center; justify-content: center;
                    font-size: 12px; font-weight: bold; z-index: 2; box-shadow: 0 0 5px rgba(0,0,0,.5); }
                .carro-onda { position: absolute; top: 50%; left: 50%; width: 28px; height: 28px;
                    background: rgba(37,99,235,.40); border-radius: 50%;
                    transform: translate(-50%, -50%); animation: ondaAnim 1.6s ease-out infinite; }
                @keyframes ondaAnim {
                    0%   { transform: translate(-50%, -50%) scale(0.7); opacity: 1; }
                    100% { transform: translate(-50%, -50%) scale(3);   opacity: 0; }
                }
            `}</style>

            <div className="flex items-center justify-between border-b border-border pb-4">
                <h1 className="text-xl font-semibold text-foreground">Monitoramento em Tempo Real</h1>
            </div>

            {/* Filtro */}
            <div className="flex gap-4 items-end flex-wrap">
                <div className="min-w-[220px] space-y-2">
                    <label className="text-sm text-muted-foreground">Veículo</label>
                    <select
                        value={veiculoSelecionado}
                        onChange={(e) => setVeiculoSelecionado(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                        <option value="TODOS">Todos os Veículos</option>
                        {veiculos.map(v => (
                            <option key={v.id_veiculo || v.id} value={v.id_veiculo || v.id}>
                                {v.placa} - {v.modelo}
                            </option>
                        ))}
                    </select>
                </div>
                <span className="text-xs text-muted-foreground pb-2">🔴 Ao vivo — atualiza a cada 5s</span>
            </div>

            {/* Mapa */}
            <div className="w-full h-[800px] rounded-xl overflow-hidden border border-border">
                <MapContainer center={[-15.78, -47.93]} zoom={4} style={{ height: "100%", width: "100%" }}>
                    <TileLayer
                        attribution='&copy; CARTO'
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    />

                    {/* MODO TODOS: cada carro pulsando, com os 2 últimos dígitos da placa */}
                    {veiculoSelecionado === "TODOS" && posicoes.map((p) => (
                        <Marker key={p.idVeiculo} position={[p.lat, p.lng]} icon={iconeCarro(p.placa)}>
                            <Popup>
                                <div style={{ color: "#000", minWidth: "200px" }}>
                                    <strong style={{ fontSize: "1.05rem" }}>{p.placa}</strong><br />
                                    Motorista: <b>{p.motorista}</b><br />
                                    Velocidade: {p.velocidade} km/h<br />
                                    Status: {statusTexto(p.status)}<br />
                                    Última att.: {p.dataHora ? new Date(p.dataHora).toLocaleString("pt-BR") : "—"}
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    {/* MODO UM CARRO: linha + cada ponto clicável (dados do momento) + ponto atual pulsando */}
                    {veiculoSelecionado !== "TODOS" && rota.length > 0 && (
                        <>
                            <Polyline positions={rota.map(p => [p.lat, p.lng])} color="#2563eb" weight={3} opacity={0.5} />

                            {/* Cada ponto da rota com os dados daquele momento */}
                            {rota.map((ponto, index) => (
                                <CircleMarker
                                    key={index}
                                    center={[ponto.lat, ponto.lng]}
                                    radius={5}
                                    pathOptions={{
                                        fillColor: corStatus(ponto.velocidade, ponto.status),
                                        color: 'white', weight: 1, fillOpacity: 1
                                    }}
                                >
                                    <Popup>
                                        <div style={{ color: "#000", minWidth: "200px" }}>
                                            <strong>Ponto {index + 1} de {rota.length}</strong><br />
                                            Motorista: <b>{ponto.motorista}</b><br />
                                            Velocidade: {ponto.velocidade} km/h<br />
                                            Status: {statusTexto(ponto.status)}<br />
                                            {ponto.hora ? `Hora: ${ponto.hora}` : ""}
                                        </div>
                                    </Popup>
                                </CircleMarker>
                            ))}

                            {/* Posição ATUAL (último ponto) pulsando com o número do carro */}
                            <Marker position={posAtual} icon={iconeCarro(placaSelecionada)}>
                                <Popup>
                                    <div style={{ color: "#000", minWidth: "200px" }}>
                                        <strong>Posição atual — {placaSelecionada}</strong><br />
                                        Motorista: <b>{ultimo.motorista}</b><br />
                                        Velocidade: {ultimo.velocidade} km/h<br />
                                        Status: {statusTexto(ultimo.status)}<br />
                                        {ultimo.hora ? `Hora: ${ultimo.hora}` : ""}
                                    </div>
                                </Popup>
                            </Marker>

                            <Centralizar posicao={posAtual} gatilho={veiculoSelecionado} />
                        </>
                    )}
                </MapContainer>
            </div>

            {veiculoSelecionado !== "TODOS" && rota.length === 0 && (
                <p className="text-muted-foreground text-sm">
                    Nenhum ponto hoje pra esse veículo (GPS sem fix ou sem dado no dia).
                </p>
            )}
        </div>
    );
}

export default MonitoramentoTempoReal;
