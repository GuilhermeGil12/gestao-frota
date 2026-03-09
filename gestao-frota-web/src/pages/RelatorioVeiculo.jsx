import { useState, useEffect } from "react";
import api from "../services/api";
import { MapContainer, TileLayer, Polyline, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

// Configuração do ícone padrão do Leaflet
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function RelatorioVeiculo() {
    const [veiculos, setVeiculos] = useState([]);
    const [veiculoSelecionado, setVeiculoSelecionado] = useState("");
    const [dataInicio, setDataInicio] = useState("");
    const [dataFim, setDataFim] = useState("");
    const [rota, setRota] = useState([]);
    const [carregando, setCarregando] = useState(false);

    useEffect(() => {
        const carregarVeiculos = async () => {
            try {
                const res = await api.get("/veiculos");
                if (Array.isArray(res.data)) {
                    setVeiculos(res.data);
                }
            } catch (e) {
                console.error("Erro ao carregar veículos", e);
            }
        };
        carregarVeiculos();
    }, []);

    const buscarRota = async (e) => {
        e.preventDefault();
        if (!veiculoSelecionado || !dataInicio || !dataFim) {
            alert("Preencha todos os campos!");
            return;
        }

        setCarregando(true);
        try {
            // Formata as datas para ISO 8601 (ex: 2023-10-27T10:00:00)
            const inicioISO = new Date(dataInicio).toISOString().slice(0, 19);
            const fimISO = new Date(dataFim).toISOString().slice(0, 19);

            const res = await api.get(`/localizacao/historico/${veiculoSelecionado}`, {
                params: { inicio: inicioISO, fim: fimISO }
            });

            setRota(res.data);
        } catch (e) {
            console.error("Erro ao buscar rota", e);
            alert("Erro ao buscar histórico de localização.");
        } finally {
            setCarregando(false);
        }
    };

    // Calcula o centro do mapa com base na rota ou usa um padrão
    const centroMapa = rota.length > 0 
        ? [rota[0].latitude, rota[0].longitude] 
        : [-23.55052, -46.633308]; // São Paulo como padrão

    return (
        <div className="conteudo-principal" style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column" }}>
            <div className="header-actions" style={{ padding: "20px", background: "#f8f9fa", borderBottom: "1px solid #ddd" }}>
                <h1>Relatório de Rotas</h1>
                <form onSubmit={buscarRota} style={{ display: "flex", gap: "15px", alignItems: "end", flexWrap: "wrap" }}>
                    <div className="input-container">
                        <label>Veículo</label>
                        <select 
                            value={veiculoSelecionado} 
                            onChange={(e) => setVeiculoSelecionado(e.target.value)}
                            style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
                        >
                            <option value="">Selecione um veículo...</option>
                            {veiculos.map(v => (
                                <option key={v.id} value={v.id}>{v.nome} - {v.placa}</option>
                            ))}
                        </select>
                    </div>
                    <div className="input-container">
                        <label>Data/Hora Início</label>
                        <input 
                            type="datetime-local" 
                            value={dataInicio} 
                            onChange={(e) => setDataInicio(e.target.value)}
                            style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
                        />
                    </div>
                    <div className="input-container">
                        <label>Data/Hora Fim</label>
                        <input 
                            type="datetime-local" 
                            value={dataFim} 
                            onChange={(e) => setDataFim(e.target.value)}
                            style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
                        />
                    </div>
                    <button type="submit" className="save" disabled={carregando} style={{ height: "38px" }}>
                        {carregando ? "Buscando..." : "Gerar Relatório"}
                    </button>
                </form>
            </div>

            <div style={{ flex: 1, position: "relative" }}>
                <MapContainer center={centroMapa} zoom={13} style={{ height: "100%", width: "100%" }}>
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    
                    {/* Desenha a linha da rota */}
                    {rota.length > 0 && (
                        <Polyline 
                            positions={rota.map(p => [p.latitude, p.longitude])}
                            color="blue"
                            weight={4}
                        />
                    )}

                    {/* Adiciona marcadores em cada ponto */}
                    {rota.map((ponto, index) => (
                        <Marker key={index} position={[ponto.latitude, ponto.longitude]}>
                            <Popup>
                                <div>
                                    <strong>Data/Hora:</strong> {new Date(ponto.dataHora).toLocaleString()}<br/>
                                    <strong>Velocidade:</strong> {ponto.velocidade} km/h<br/>
                                    <strong>Motorista:</strong> {ponto.motorista || "N/A"}
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>
        </div>
    );
}

export default RelatorioVeiculo;