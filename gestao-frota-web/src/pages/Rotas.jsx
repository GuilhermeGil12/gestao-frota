import React, { useState } from 'react';
import "../App.css";
import { toast } from "react-toastify";
import { MapContainer, TileLayer, Polyline, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';

// 1. CORREÇÃO DOS ÍCONES DO LEAFLET (Para evitar que sumam no React)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// 2. COMPONENTE PARA MOVER A CÂMERA DO MAPA AUTOMATICAMENTE
function ChangeView({ center }) {
    const map = useMap();
    if (center) {
        map.setView(center, 14); // Define o zoom em 14 ao focar
    }
    return null;
}

function Rotas() {
    // Estados para os filtros
    const [dataBusca, setDataBusca] = useState("");
    const [veiculoSelecionado, setVeiculoSelecionado] = useState("");

    // O histórico agora guarda objetos com telemetria
    const [historicoRotas, setHistoricoRotas] = useState([]);

    const handleBuscarRotas = () => {
        if (!dataBusca || !veiculoSelecionado) {
            toast.error("Por favor, selecione a data e o veículo.");
            return;
        }

        // MOCK DATA: Simulação de como os dados virão do seu banco Java
        const rotaMock = [
            { lat: -23.5505, lng: -46.6333, velocidade: 40, hora: "08:10:00" },
            { lat: -23.5520, lng: -46.6350, velocidade: 85, hora: "08:15:22" }, // Excesso de velocidade
            { lat: -23.5540, lng: -46.6380, velocidade: 50, hora: "08:20:45" },
            { lat: -23.5560, lng: -46.6320, velocidade: 35, hora: "08:25:10" },
        ];

        setHistoricoRotas(rotaMock);
        toast.info(`Rota de ${veiculoSelecionado} carregada!`);
    };

    return (
        <div className="conteudo-principal" style={{ alignItems: "flex-start", width: "100%", padding: "20px" }}>
            <div className="header-actions" style={{ maxWidth: "100%", marginBottom: "20px" }}>
                <h1>Rastreamento de Percurso Diário</h1>
            </div>

            {/* BARRA DE FILTROS */}
            <div style={{ display: "flex", gap: "15px", background: "#1a1a1a", padding: "20px", borderRadius: "8px", border: "1px solid #333", width: "100%", marginBottom: "30px", alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                    <label style={{ display: "block", color: "#ccc", marginBottom: "5px", fontSize: "0.9rem" }}>Data da Viagem</label>
                    <input
                        type="date"
                        value={dataBusca}
                        onChange={(e) => setDataBusca(e.target.value)}
                        className="search-input"
                        style={{ width: "100%", borderRadius: "8px" }}
                    />
                </div>

                <div style={{ flex: 1 }}>
                    <label style={{ display: "block", color: "#ccc", marginBottom: "5px", fontSize: "0.9rem" }}>Veículo</label>
                    <select
                        value={veiculoSelecionado}
                        onChange={(e) => setVeiculoSelecionado(e.target.value)}
                        className="search-input"
                        style={{ width: "100%", cursor: "pointer", borderRadius: "8px" }}
                    >
                        <option value="">Selecione um veículo...</option>
                        <option value="ABC-1234">ABC-1234 (Fiat Uno)</option>
                        <option value="XYZ-9876">XYZ-9876 (VW Gol)</option>
                    </select>
                </div>

                <button className="save" onClick={handleBuscarRotas} style={{ padding: "10px 25px", height: "42px" }}>
                    🔍 Gerar Trajeto
                </button>
            </div>

            {/* ÁREA DO MAPA */}
            <div style={{
                width: "100%",
                height: "550px",
                borderRadius: "12px",
                overflow: "hidden",
                border: "1px solid #333",
                zIndex: 0
            }}>
                <MapContainer
                    center={[-23.5505, -46.6333]}
                    zoom={13}
                    style={{ height: "100%", width: "100%" }}
                >
                    {/* Estilo do Mapa (DARK MODE) */}
                    <TileLayer
                        attribution='&copy; CARTO'
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    />

                    {/* Move a câmera quando a rota carregar */}
                    {historicoRotas.length > 0 && (
                        <ChangeView center={[historicoRotas[0].lat, historicoRotas[0].lng]} />
                    )}

                    {historicoRotas.length > 0 && (
                        <>
                            {/* LINHA DO TRAJETO */}
                            <Polyline
                                positions={historicoRotas.map(p => [p.lat, p.lng])}
                                color="#ff4d4d"
                                weight={3}
                                opacity={0.7}
                            />

                            {/* PONTOS DE TELEMETRIA (BOLINHAS) */}
                            {historicoRotas.map((ponto, index) => (
                                <CircleMarker
                                    key={index}
                                    center={[ponto.lat, ponto.lng]}
                                    radius={5}
                                    pathOptions={{
                                        fillColor: ponto.velocidade > 80 ? 'red' : '#00d2ff',
                                        color: 'white',
                                        weight: 1,
                                        fillOpacity: 1
                                    }}
                                >
                                    <Popup>
                                        <div style={{ color: "#000" }}>
                                            <strong style={{ fontSize: "1.1rem" }}>Telemetria:</strong><br/>
                                            <hr style={{ margin: "5px 0" }}/>
                                            🕒 <b>Hora:</b> {ponto.hora}<br/>
                                            🚀 <b>Velocidade:</b> <span style={{ color: ponto.velocidade > 80 ? 'red' : 'inherit' }}>{ponto.velocidade} km/h</span><br/>
                                            📍 <b>Posição:</b> {ponto.lat.toFixed(4)}, {ponto.lng.toFixed(4)}
                                        </div>
                                    </Popup>
                                </CircleMarker>
                            ))}

                            {/* Marcador Especial para o FIM da rota (Onde o carro está) */}
                            <Marker position={[historicoRotas[historicoRotas.length - 1].lat, historicoRotas[historicoRotas.length - 1].lng]}>
                                <Popup>Última parada registrada</Popup>
                            </Marker>
                        </>
                    )}
                </MapContainer>
            </div>
        </div>
    );
}

export default Rotas;