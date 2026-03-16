import React, { useState, useEffect } from 'react';
import "../App.css";
import { toast } from "react-toastify";
import axios from 'axios';

function Alertas() {
    const [dataInicio, setDataInicio] = useState("");
    const [dataFinal, setDataFinal] = useState("");
    const [veiculoSelecionado, setVeiculoSelecionado] = useState("");

    const [veiculosReais, setVeiculosReais] = useState([]);
    const [historicoAlertas, setHistoricoAlertas] = useState([]);

    const carregarDados = async (inicio, fim, veiculoId) => {
        try {
            const response = await axios.get("http://localhost:8080/api/localizacao/alerta", {
                params: {
                    dataInicio: inicio,
                    dataFinal: fim,
                    idVeiculo: veiculoId || null
                }
            });

            setHistoricoAlertas(response.data);

            if (response.data.length === 0) {
                toast.warn("Nenhum alerta encontrado para este período.");
            } else {
                toast.success(`${response.data.length} alertas carregados.`);
            }
        } catch (error) {
            console.error("Erro ao buscar alertas:", error);
            toast.error("Erro ao conectar com o servidor. Verifique se o backend está rodando.");
        }
    };

    useEffect(() => {
        // Carrega a lista de veículos para o filtro
        axios.get("http://localhost:8080/api/veiculos")
            .then(res => setVeiculosReais(res.data))
            .catch(() => toast.error("Erro ao carregar veículos."));

        // Calcula os últimos 7 dias automaticamente
        const hoje = new Date();
        const seteDiasAtras = new Date();
        seteDiasAtras.setDate(hoje.getDate() - 7);

        const strFim = hoje.toISOString().split('T')[0];
        const strInicio = seteDiasAtras.toISOString().split('T')[0];

        setDataInicio(strInicio);
        setDataFinal(strFim);

        // Dispara a busca inicial
        carregarDados(strInicio, strFim, null);
    }, []);

    const handleBuscarAlertas = () => {
        if (!dataInicio || !dataFinal) {
            toast.error("Selecione as datas de início e fim.");
            return;
        }
        carregarDados(dataInicio, dataFinal, veiculoSelecionado);
    };

    return (
        <div className="conteudo-principal" style={{ display: "flex", flexDirection: "column", width: "100%", padding: "20px", boxSizing: "border-box" }}>

            <div className="header-actions" style={{ width: "100%", marginBottom: "20px" }}>
                <h1>Histórico de Alertas (Velocidade > 110km/h)</h1>
            </div>

            {/* BARRA DE FILTROS */}
            <div style={{ display: "flex", gap: "15px", background: "#1a1a1a", padding: "20px", borderRadius: "8px", border: "1px solid #333", width: "100%", marginBottom: "30px", alignItems: "flex-end", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: "200px" }}>
                    <label style={{ display: "block", color: "#ccc", marginBottom: "5px", fontSize: "0.9rem" }}>Data Início</label>
                    <input
                        type="date"
                        value={dataInicio}
                        onChange={(e) => setDataInicio(e.target.value)}
                        className="search-input"
                        style={{ width: "100%", borderRadius: "8px" }}
                    />
                </div>
                <div style={{ flex: 1, minWidth: "200px" }}>
                    <label style={{ display: "block", color: "#ccc", marginBottom: "5px", fontSize: "0.9rem" }}>Data Final</label>
                    <input
                        type="date"
                        value={dataFinal}
                        onChange={(e) => setDataFinal(e.target.value)}
                        className="search-input"
                        style={{ width: "100%", borderRadius: "8px" }}
                    />
                </div>
                <div style={{ flex: 1, minWidth: "200px" }}>
                    <label style={{ display: "block", color: "#ccc", marginBottom: "5px", fontSize: "0.9rem" }}>Veículo (Opcional)</label>
                    <select
                        value={veiculoSelecionado}
                        onChange={(e) => setVeiculoSelecionado(e.target.value)}
                        className="search-input"
                        style={{ width: "100%", borderRadius: "8px", background: "#333", color: "#fff" }}
                    >
                        <option value="">Todos os Veículos</option>
                        {veiculosReais.map((v) => (
                            <option key={v.id_veiculo || v.id} value={v.id_veiculo || v.id}>
                                {v.placa} - {v.modelo}
                            </option>
                        ))}
                    </select>
                </div>
                <button className="save" onClick={handleBuscarAlertas} style={{ padding: "10px 25px", height: "42px", minWidth: "120px" }}>
                    🔍 Filtrar
                </button>
            </div>

            {/* TABELA DE RESULTADOS */}
            <div style={{ width: "100%", overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                    <tr style={{ borderBottom: "2px solid #444", color: "#ccc" }}>
                        <th style={{ padding: "12px" }}>Placa</th>
                        <th style={{ padding: "12px" }}>Motorista</th>
                        <th style={{ padding: "12px" }}>Velocidade</th>
                        <th style={{ padding: "12px" }}>Data</th>
                        <th style={{ padding: "12px" }}>Hora</th>
                    </tr>
                    </thead>
                    <tbody>
                    {historicoAlertas.length > 0 ? (
                        historicoAlertas.map((alerta, index) => {

                            // LOGICA DA PLACA:
                            // 1º Tenta pegar da controladora vinculada
                            // 2º Se não tiver, tenta pegar direto do veículo (caso exista)
                            // 3º Se falhar, mostra N/A
                            const placa = alerta.controladora?.veiculo?.placa || alerta.veiculo?.placa || "N/A";

                            return (
                                <tr key={index} style={{ borderBottom: "1px solid #222", color: "#eee" }}>
                                    <td style={{ padding: "12px", fontWeight: "bold" }}>{placa}</td>
                                    <td style={{ padding: "12px" }}>{alerta.motorista || "Desconhecido"}</td>
                                    <td style={{ padding: "12px", color: "#ff4d4d", fontWeight: "bold" }}>
                                        {alerta.velocidade} km/h
                                    </td>
                                    {/* LOGICA DA DATA: Ajustado para dataHora, que é o nome correto no Java */}
                                    <td style={{ padding: "12px" }}>
                                        {alerta.dataHora ? new Date(alerta.dataHora).toLocaleDateString('pt-BR') : "-"}
                                    </td>
                                    <td style={{ padding: "12px" }}>
                                        {alerta.dataHora ? new Date(alerta.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : "-"}
                                    </td>
                                </tr>
                            );
                        })
                    ) : (
                        <tr>
                            <td colSpan="5" style={{ textAlign: "center", padding: "40px", color: "#777" }}>
                                Nenhum alerta encontrado para o período selecionado.
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Alertas;