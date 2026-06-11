import React, { useState, useEffect } from 'react';
import { toast } from "react-toastify";
import { MapContainer, TileLayer, Polyline, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent } from "../../components/ui/card";
import { Search, Sun, Moon } from "lucide-react";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function ChangeView({ center }) {
    const map = useMap();
    if (center) map.setView(center, 15);
    return null;
}

function Rotas() {
    const [dataBusca, setDataBusca] = useState("");
    const [veiculosReais, setVeiculosReais] = useState([]);
    const [veiculoSelecionado, setVeiculoSelecionado] = useState("");
    const [historicoRotas, setHistoricoRotas] = useState([]);
    const [temaEscuro, setTemaEscuro] = useState(false);

    useEffect(() => {
        axios.get("http://localhost:8080/api/veiculos")
            .then(response => setVeiculosReais(response.data))
            .catch(error => { console.error("Erro ao carregar veiculos:", error); toast.error("Nao foi possivel carregar a lista de veiculos."); });
    }, []);

    const handleBuscarRotas = async () => {
        if (!dataBusca || !veiculoSelecionado) { toast.error("Selecione a data e o veiculo."); return; }
        try {
            const response = await axios.get(`http://localhost:8080/api/localizacao/rota`, { params: { idVeiculo: veiculoSelecionado, data: dataBusca } });
            if (response.data.length === 0) { setHistoricoRotas([]); toast.warn("Nenhum dado encontrado para este veiculo nesse dia."); }
            else { setHistoricoRotas(response.data); toast.success(`${response.data.length} pontos de telemetria carregados!`); }
        } catch (error) { console.error("Erro Axios:", error); toast.error("Erro ao conectar com o servidor Spring Boot."); }
    };

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
                <h1 className="text-xl font-semibold text-foreground">Rastreamento de Percurso Diario</h1>
            </div>

            {/* Filtros */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-4 items-end flex-wrap">
                        <div className="flex-1 min-w-[200px] space-y-2">
                            <Label>Data da Viagem</Label>
                            <Input type="date" value={dataBusca} onChange={(e) => setDataBusca(e.target.value)} />
                        </div>
                        <div className="flex-1 min-w-[200px] space-y-2">
                            <Label>Veiculo Real</Label>
                            <select value={veiculoSelecionado} onChange={(e) => setVeiculoSelecionado(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                                <option value="">Selecione a Placa...</option>
                                {veiculosReais.map((v) => (<option key={v.id_veiculo || v.id} value={v.id_veiculo || v.id}>{v.placa} - {v.modelo}</option>))}
                            </select>
                        </div>
                        <Button onClick={handleBuscarRotas}><Search className="h-4 w-4 mr-2" />Gerar Trajeto</Button>
                        <Button variant="outline" size="icon" onClick={() => setTemaEscuro(!temaEscuro)}>
                            {temaEscuro ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Mapa */}
            <div className="w-full h-[500px] rounded-xl overflow-hidden border border-border relative">
                {/* Legenda */}
                <div className="absolute top-3 right-3 z-[1000] bg-black/85 p-3 rounded-lg text-xs text-white border border-border">
                    <b className="text-blue-400">Legenda de Status:</b><br />
                    Parado (0)<br />
                    Ignicao (1)<br />
                    Em Movimento (10)<br />
                    <hr className="my-1 border-border" />
                    Excesso Velocidade (&gt;110km/h)
                </div>

                <MapContainer center={[-23.5505, -46.6333]} zoom={13} style={{ height: "100%", width: "100%" }}>
                    <TileLayer
                        attribution='&copy; CARTO'
                        url={temaEscuro
                            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                        }
                    />
                    {historicoRotas.length > 0 && <ChangeView center={[historicoRotas[0].lat, historicoRotas[0].lng]} />}
                    {historicoRotas.length > 0 && (
                        <>
                            <Polyline positions={historicoRotas.map(p => [p.lat, p.lng])} color="#ff4d4d" weight={3} opacity={0.7} />
                            {historicoRotas.map((ponto, index) => {
                                const valorStatus = Number(ponto.status !== undefined ? ponto.status : ponto.ign);
                                return (
                                    <CircleMarker
                                        key={index}
                                        center={[ponto.lat, ponto.lng]}
                                        radius={index === 0 || index === historicoRotas.length - 1 ? 8 : 5}
                                        pathOptions={{
                                            fillColor: ponto.velocidade > 110 ? 'red' : (valorStatus === 0 ? '#bdc3c7' : valorStatus === 1 ? '#f1c40f' : '#3498db'),
                                            color: 'white', weight: 1, fillOpacity: 1
                                        }}
                                    >
                                        <Popup>
                                            <div style={{ color: "#000", minWidth: "220px" }}>
                                                <strong style={{ fontSize: "1.1rem" }}>Telemetria em Tempo Real</strong><br />
                                                <span>Motorista: <b>{ponto.motorista}</b></span>
                                                <hr style={{ margin: "8px 0" }} />
                                                <b>Horario:</b> {ponto.hora}<br />
                                                <b>Velocidade:</b>{" "}
                                                <span style={{ color: ponto.velocidade > 80 ? 'red' : 'green', fontWeight: 'bold' }}>{ponto.velocidade} km/h</span><br />
                                                <b>Status:</b> {(() => {
                                                    const s = ponto.status !== undefined ? ponto.status : ponto.ign !== undefined ? ponto.ign : ponto.status_ignicao;
                                                    const v = parseInt(s);
                                                    if (isNaN(v)) return <span style={{ color: "red" }}>Indisponivel</span>;
                                                    if (v === 0) return <span style={{ color: "#7f8c8d", fontWeight: "bold" }}>Parado</span>;
                                                    if (v === 1) return <span style={{ color: "#d35400", fontWeight: "bold" }}>Ignicao</span>;
                                                    if (v === 10) return <span style={{ color: "#2980b9", fontWeight: "bold" }}>Movimento</span>;
                                                    return <span>Desconhecido ({v})</span>;
                                                })()}
                                            </div>
                                        </Popup>
                                    </CircleMarker>
                                );
                            })}
                        </>
                    )}
                </MapContainer>
            </div>
        </div>
    );
}

export default Rotas;
