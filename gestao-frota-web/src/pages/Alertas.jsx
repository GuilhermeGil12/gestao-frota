import React, { useState, useEffect } from 'react';
import "../App.css";
import { toast } from "react-toastify";
import axios from 'axios';


function Alertas() {
    const [dataBusca, setDataBusca] = useState("");
    const [veiculosReais, setVeiculosReais] = useState([]);
    const [veiculoSelecionado, setVeiculoSelecionado] = useState("");
    const [historicoAlertas, setHistoricoAlertas] = useState([]);

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
            const response = await axios.get(`http://localhost:8080/api/localizacao/alerta`, {
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
                <h1>Alertas</h1>
            </div>

            {/* FILTROS */}
            <div style={{ display: "flex", gap: "15px", background: "#1a1a1a", padding: "20px", borderRadius: "8px", border: "1px solid #333", width: "100%", marginBottom: "30px", alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                    <label style={{ display: "block", color: "#ccc", marginBottom: "5px", fontSize: "0.9rem" }}>Data Início</label>
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
                    🔍 Filtrar
                </button>


            </div>
            <table style={{ maxWidth: "100%" , marginTop: "20px"}}>
                <thead>
                <tr>
                    <th>Placa</th>
                    <th>Motorista</th>
                    <th>Velocidade</th>
                    <th>Data</th>
                    <th>Hora</th>
                </tr>
                </thead>
                <tbody></tbody>
            </table>




        </div>
    );
}

export default Alertas;