import { useState, useEffect } from "react";
import api from "../services/api";
import "../App.css";

function Dashboard() {
    const [veiculos, setVeiculos] = useState([]);

    const carregarDados = async () => {
        try {
            // 1. Pega a lista de veículos
            const resVeiculos = await api.get('/veiculos');

            if (Array.isArray(resVeiculos.data)) {
                const listaVeiculos = resVeiculos.data;

                // 2. A MÁGICA DOS MOTOBOYS (Promise.all): Busca a localização de TODOS os carros ao mesmo tempo
                const veiculosTurbinados = await Promise.all(
                    listaVeiculos.map(async (veiculo) => {
                        try {
                            // Bate na nova rota que criamos no Java!
                            const resLoc = await api.get(`/localizacao/ultima/${veiculo.id}`);

                            // Se tiver dados, junta o veículo com a localização. Se não (erro 204), a loc fica nula.
                            return { ...veiculo, ultimaLocalizacao: resLoc.data || null };
                        } catch (err) {
                            console.error(`O carro ${veiculo.placa} ainda não tem localização no banco.`);
                            return { ...veiculo, ultimaLocalizacao: null };
                        }
                    })
                );

                // 3. Salva a lista final com as localizações embutidas
                setVeiculos(veiculosTurbinados);
            } else {
                setVeiculos([]);
            }
        } catch (error) {
            console.error("Erro ao carregar veículos para o Dashboard:", error);
            setVeiculos([]);
        }
    };

    useEffect(() => {
        carregarDados();
        const intervalo = setInterval(() => { carregarDados(); }, 30000); // Atualiza a cada 30 seg
        return () => clearInterval(intervalo);
    }, []);

    // Funçãozinha para deixar a data bonita (Ex: 07/03/2026 14:30)
    const formatarData = (dataString) => {
        if (!dataString) return "Sem sinal";
        const data = new Date(dataString);
        return data.toLocaleString('pt-BR'); // Padrão Brasil
    };

    const definirStatus = (veiculo) => {
        if (!veiculo.ativo) return { texto: "Inativo", classe: "dot-desligado", cor: "#e74c3c" };
        if (!veiculo.controladora) return { texto: "Sem Rastreador", classe: "dot-desligando", cor: "#f39c12" };

        // Agora podemos saber se está andando ou parado pela velocidade!
        const loc = veiculo.ultimaLocalizacao;
        if (loc && loc.velocidade > 0) return { texto: "Em Movimento", classe: "dot-movimento", cor: "#2ecc71" };

        return { texto: "Parado", classe: "dot-parado", cor: "#3498db" };
    };

    return (
        <div className="conteudo-principal" style={{ alignItems: "stretch", width: "100%" }}>
            <div className="header-actions" style={{ maxWidth: "100%" }}>
                <h1>Dashboard de Monitoramento</h1>
            </div>

            <div className="dashboard-grid" style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
                gap: "1.5rem",
                width: "100%",
                maxWidth: "100%"
            }}>
                {(!Array.isArray(veiculos) || veiculos.length === 0) ? (
                    <p style={{ color: "#888", textAlign: "center" }}>Nenhum veículo cadastrado no sistema.</p>
                ) : (
                    veiculos.map(veiculo => {
                        const status = definirStatus(veiculo);
                        const loc = veiculo.ultimaLocalizacao; // Atalho para facilitar a digitação abaixo

                        return (
                            <div className="dash-card" key={veiculo.id}>
                                <div className="card-header" style={{ color: status.cor }}>
                                    <div className={`status-dot ${status.classe}`}></div>
                                    {status.texto}
                                </div>

                                {/* AQUI ESTÃO OS DADOS QUE VOCÊ PEDIU */}
                                <div className="card-info"><strong>[Placa]</strong> <span style={{ textTransform: "uppercase" }}>{veiculo.placa}</span></div>
                                <div className="card-info"><strong>[Motorista]</strong> {loc && loc.motorista ? loc.motorista : "Nenhum"}</div>
                                <div className="card-info"><strong>[Velocidade]</strong> {loc && loc.velocidade !== null ? `${loc.velocidade} km/h` : "0 km/h"}</div>
                                <div className="card-info"><strong>[Data/Hora]</strong> {loc && loc.dataHora ? formatarData(loc.dataHora) : "Aguardando sinal..."}</div>

                                <div className="card-actions">
                                    <button className="btn-seguir">Ver no Mapa</button>
                                    <button className="btn-google">Histórico</button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

export default Dashboard;