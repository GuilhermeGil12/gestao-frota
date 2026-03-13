import React, { useState } from "react";
import "../App.css";

function Relatorios() {
    // ==========================================
    // 1. ESTADOS (Filtros e Dados)
    // ==========================================
    const [dataInicio, setDataInicio] = useState("");
    const [dataFim, setDataFim] = useState("");
    const [veiculoSelecionado, setVeiculoSelecionado] = useState("TODOS");

    // Dados FALSOS para você ver como o layout vai ficar (Depois o Spring Boot vai mandar isso)
    const [resumo, setResumo] = useState({
        distanciaTotal: "1.245",
        velocidadeMax: "112",
        tempoMovimento: "18h 30m"
    });

    const [historicoRotas, setHistoricoRotas] = useState([
        { id: 1, data: "10/03/2026 08:30", veiculo: "ABC-1234", motorista: "Guilherme Gil", velMax: "85 km/h", distancia: "45 km" },
        { id: 2, data: "11/03/2026 09:15", veiculo: "XYZ-9876", motorista: "Carlos Silva", velMax: "112 km/h", distancia: "120 km" }
    ]);

    // ==========================================
    // 2. AÇÃO DE FILTRAR (Onde chamaremos a API)
    // ==========================================
    const handleGerarRelatorio = () => {
        if (!dataInicio || !dataFim) {
            alert("Por favor, selecione as datas de início e fim!");
            return;
        }

        console.log(`Buscando dados de ${dataInicio} até ${dataFim} para o veículo: ${veiculoSelecionado}`);
        // Aqui entrará o seu: api.get(`/relatorios?inicio=${dataInicio}&fim=${dataFim}...`)

        alert("Simulando busca no banco de dados...");
    };

    return (
        <div className="conteudo-principal" style={{ alignItems: "flex-start", width: "100%", padding: "20px" }}>

            <div className="header-actions" style={{ maxWidth: "100%", marginBottom: "20px" }}>
                <h1>📊 Relatórios de Telemetria</h1>
            </div>

            {/* BARRA DE FILTROS */}
            <div style={{ display: "flex", gap: "15px", background: "#1a1a1a", padding: "20px", borderRadius: "8px", border: "1px solid #333", width: "100%", marginBottom: "30px", alignItems: "flex-end" }}>

                <div style={{ flex: 1 }}>
                    <label style={{ display: "block", color: "#ccc", marginBottom: "5px", fontSize: "0.9rem" }}>Data Inicial</label>
                    <input
                        type="date"
                        value={dataInicio}
                        onChange={(e) => setDataInicio(e.target.value)}
                        className="search-input"
                        style={{ width: "100%", borderRadius: "8px"}}
                    />
                </div>

                <div style={{ flex: 1 }}>
                    <label style={{ display: "block", color: "#ccc", marginBottom: "5px", fontSize: "0.9rem" }}>Data Final</label>
                    <input
                        type="date"
                        value={dataFim}
                        onChange={(e) => setDataFim(e.target.value)}
                        className="search-input"
                        style={{ width: "100%", borderRadius: "8px", }}
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
                        <option value="TODOS">Todos os Veículos</option>
                        <option value="ABC-1234">ABC-1234 (Fiat Uno)</option>
                        <option value="XYZ-9876">XYZ-9876 (VW Gol)</option>
                    </select>
                </div>

                <button className="save" onClick={handleGerarRelatorio} style={{ padding: "10px 25px", height: "42px" }}>
                    🔍 Gerar
                </button>
            </div>

            {/* CARDS DE RESUMO (O Ouro do Relatório) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px", width: "100%", marginBottom: "30px" }}>

                <div style={{ background: "#1e1e1e", padding: "20px", borderRadius: "8px", borderLeft: "5px solid #00d2ff", boxShadow: "0 4px 6px rgba(0,0,0,0.3)" }}>
                    <h4 style={{ color: "#aaa", margin: "0 0 10px 0", fontSize: "0.9rem", textTransform: "uppercase" }}>Distância Percorrida</h4>
                    <h2 style={{ color: "#fff", margin: 0, fontSize: "2rem" }}>{resumo.distanciaTotal} <span style={{ fontSize: "1rem", color: "#888" }}>km</span></h2>
                </div>

                <div style={{ background: "#1e1e1e", padding: "20px", borderRadius: "8px", borderLeft: "5px solid #ff3d00", boxShadow: "0 4px 6px rgba(0,0,0,0.3)" }}>
                    <h4 style={{ color: "#aaa", margin: "0 0 10px 0", fontSize: "0.9rem", textTransform: "uppercase" }}>Velocidade Máxima</h4>
                    <h2 style={{ color: "#fff", margin: 0, fontSize: "2rem" }}>{resumo.velocidadeMax} <span style={{ fontSize: "1rem", color: "#888" }}>km/h</span></h2>
                </div>

                <div style={{ background: "#1e1e1e", padding: "20px", borderRadius: "8px", borderLeft: "5px solid #00e676", boxShadow: "0 4px 6px rgba(0,0,0,0.3)" }}>
                    <h4 style={{ color: "#aaa", margin: "0 0 10px 0", fontSize: "0.9rem", textTransform: "uppercase" }}>Tempo em Movimento</h4>
                    <h2 style={{ color: "#fff", margin: 0, fontSize: "2rem" }}>{resumo.tempoMovimento}</h2>
                </div>

            </div>

            {/* TABELA DE DETALHES */}
            <div style={{ width: "100%", background: "#1a1a1a", borderRadius: "8px", padding: "20px", border: "1px solid #333" }}>
                <h3 style={{ color: "#fff", marginTop: 0, marginBottom: "20px" }}>Detalhamento das Viagens</h3>

                <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
                    <thead>
                    <tr style={{ borderBottom: "2px solid #333", color: "#00d2ff" }}>
                        <th style={{ padding: "10px" }}>Data/Hora</th>
                        <th style={{ padding: "10px" }}>Veículo</th>
                        <th style={{ padding: "10px" }}>Motorista</th>
                        <th style={{ padding: "10px" }}>Vel. Máxima</th>
                        <th style={{ padding: "10px" }}>Distância</th>
                    </tr>
                    </thead>
                    <tbody>
                    {historicoRotas.map((rota) => (
                        <tr key={rota.id} style={{ borderBottom: "1px solid #222" }}>
                            <td style={{ padding: "12px 10px", color: "#ddd" }}>{rota.data}</td>
                            <td style={{ padding: "12px 10px", fontWeight: "bold", color: "#fff" }}>{rota.veiculo}</td>
                            <td style={{ padding: "12px 10px", color: "#bbb" }}>{rota.motorista}</td>
                            <td style={{ padding: "12px 10px", color: "#ff3d00", fontWeight: "bold" }}>{rota.velMax}</td>
                            <td style={{ padding: "12px 10px", color: "#00e676" }}>{rota.distancia}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

        </div>
    );
}

export default Relatorios;