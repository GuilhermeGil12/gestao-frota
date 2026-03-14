import React, { useState, useEffect } from 'react';
import "../App.css";
import { toast } from "react-toastify";
import { MapContainer, TileLayer, Polyline, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';

// --- CONFIGURAÇÃO DE ÍCONES (Leaflet Bug Fix) ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// --- COMPONENTE AUXILIAR: MOVE A CÂMERA DO MAPA ---
function ChangeView({ center }) {
    const map = useMap();
    if (center) {
        map.setView(center, 15);
    }
    return null;
}

function Rotas() {
    const [dataBusca, setDataBusca] = useState("");
    const [veiculosReais, setVeiculosReais] = useState([]);
    const [veiculoSelecionado, setVeiculoSelecionado] = useState("");
    const [historicoRotas, setHistoricoRotas] = useState([]);
    const [temaEscuro, setTemaEscuro] = useState(true);

    // 1. CARREGA OS VEÍCULOS DO BANCO AO ABRIR A TELA
    useEffect(() => {
        axios.get("http://localhost:8080/api/veiculos")
            .then(response => {
                setVeiculosReais(response.data);
            })
            .catch(error => {
                console.error("Erro ao carregar veículos:", error);
                toast.error("Não foi possível carregar a lista de veículos.");
            });
    }, []);

    const handleBuscarRotas = async () => {
        if (!dataBusca || !veiculoSelecionado) {
            toast.error("Selecione a data e o veículo.");
            return;
        }

        try {
            const response = await axios.get(`http://localhost:8080/api/localizacao/rota`, {
                params: {
                    idVeiculo: veiculoSelecionado,
                    data: dataBusca
                }
            });

            if (response.data.length === 0) {
                setHistoricoRotas([]);
                toast.warn("Nenhum dado encontrado para este veículo nesse dia.");
            } else {
                setHistoricoRotas(response.data);
                toast.success(`${response.data.length} pontos de telemetria carregados!`);
            }
        } catch (error) {
            console.error("Erro Axios:", error);
            toast.error("Erro ao conectar com o servidor Spring Boot.");
        }
    };

    const handleMudarTema = async () =>{
        setTemaEscuro(!temaEscuro);
    }

    return (
        <div className="conteudo-principal" style={{ alignItems: "flex-start", width: "100%", padding: "20px" }}>
            <div className="header-actions" style={{ maxWidth: "100%", marginBottom: "20px" }}>
                <h1>Rastreamento de Percurso Diário</h1>
            </div>

            {/* FILTROS */}
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
                    <label style={{ display: "block", color: "#ccc", marginBottom: "5px", fontSize: "0.9rem" }}>Veículo Real</label>
                    <select
                        value={veiculoSelecionado}
                        onChange={(e) => setVeiculoSelecionado(e.target.value)}
                        className="search-input"
                        style={{ width: "100%", cursor: "pointer", borderRadius: "8px", background: "#333", color: "#fff" }}
                    >
                        <option value="">Selecione a Placa...</option>
                        {veiculosReais.map((v) => (
                            <option key={v.id_veiculo || v.id} value={v.id_veiculo || v.id}>
                                {v.placa} - {v.modelo}
                            </option>
                        ))}
                    </select>
                </div>

                <button className="save" onClick={handleBuscarRotas} style={{ padding: "10px 25px", height: "42px" }}>
                    🔍 Gerar Trajeto
                </button>
                <h5>Tema:</h5>
                <button className="save" onClick={handleMudarTema}
                        style={{padding: "10px 15", heigh:"42px", marginLef: "10px", background: temaEscuro ? "#fff" : "#333", color: temaEscuro ? "#000" : "#fff"}}>

                </button>
            </div>

            {/* ÁREA DO MAPA */}
            <div style={{ width: "100%", height: "60%", borderRadius: "12px", overflow: "hidden", border: "1px solid #333", position: "relative" }}>

                {/* LEGENDA */}
                <div style={{ position: "absolute", top: "10px", right: "10px", zIndex: 1000, background: "rgba(0,0,0,0.85)", padding: "12px", borderRadius: "8px", fontSize: "0.85rem", color: "white", border: "1px solid #444" }}>
                    <b style={{ color: "#00d2ff" }}>Legenda de Status:</b><br/>
                    ⚪ <b>Parado</b> (0)<br/>
                    🟡 <b>Ignição</b> (1)<br/>
                    🔵 <b>Em Movimento</b> (10)<br/>
                    <hr style={{margin: "5px 0", borderColor: "#555"}}/>
                    🔴 <b>Excesso Velocidade</b> (>110km/h)
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
                                // Captura o status independente do nome que vem do Java (status ou ign)
                                const valorStatus = Number(ponto.status !== undefined ? ponto.status : ponto.ign);

                                return (
                                    <CircleMarker
                                        key={index}
                                        center={[ponto.lat, ponto.lng]}
                                        radius={index === 0 || index === historicoRotas.length - 1 ? 8 : 5}
                                        pathOptions={{
                                            fillColor: ponto.velocidade > 110 ? 'red' :
                                                (valorStatus === 0 ? '#bdc3c7' :
                                                    valorStatus === 1 ? '#f1c40f' : '#3498db'),
                                            color: 'white',
                                            weight: 1,
                                            fillOpacity: 1
                                        }}
                                    >
                                        <Popup>
                                            <div style={{ color: "#000", minWidth: "220px" }}>
                                                <strong style={{ fontSize: "1.1rem" }}>📍 Telemetria em Tempo Real</strong><br/>
                                                <span>👤 Motorista: <b>{ponto.motorista}</b></span>
                                                <hr style={{ margin: "8px 0" }}/>

                                                🕒 <b>Horário:</b> {ponto.hora}<br/>
                                                🚀 <b>Velocidade:</b>
                                                <span style={{ color: ponto.velocidade > 80 ? 'red' : 'green', fontWeight: 'bold' }}>
                                                      {" "}{ponto.velocidade} km/h
                                                </span><br/>

                                                {/* LÓGICA DE STATUS ULTRA-RESISTENTE A ERROS */}
                                                ⚡ <b>Status:</b> {(() => {
                                                // Tenta encontrar o valor em qualquer uma dessas propriedades
                                                const s = ponto.status !== undefined ? ponto.status :
                                                    ponto.ign !== undefined ? ponto.ign :
                                                        ponto.status_ignicao; // Caso seu backend use esse nome

                                                const valorNumerico = parseInt(s);

                                                if (isNaN(valorNumerico)) {
                                                    return <span style={{color: "red"}}>Indisponível</span>;
                                                }

                                                if (valorNumerico === 0) return <span style={{color: "#7f8c8d", fontWeight: "bold"}}>🛑 Parado</span>;
                                                if (valorNumerico === 1) return <span style={{color: "#d35400", fontWeight: "bold"}}>🔑 Ignição</span>;
                                                if (valorNumerico === 10) return <span style={{color: "#2980b9", fontWeight: "bold"}}>🚚 Movimento</span>;

                                                return <span>Desconhecido ({valorNumerico})</span>;
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