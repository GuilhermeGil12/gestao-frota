import React, { useState } from "react";
import "../App.css";
import { toast } from "react-toastify";

function Configuracoes() {
    // ==========================================
    // 1. ESTADOS (As memórias das configurações)
    // ==========================================
    const [diasCnh, setDiasCnh] = useState(30);
    const [kmRevisao, setKmRevisao] = useState(10000);
    const [bloquearCnhVencida, setBloquearCnhVencida] = useState(true);
    const [bloquearMadrugada, setBloquearMadrugada] = useState(false);
    const [nomeEmpresa, setNomeEmpresa] = useState("Transportes Silva Ltda");

    // ==========================================
    // 2. FUNÇÃO DE SALVAR
    // ==========================================
    const handleSalvar = () => {
        // No futuro, isso aqui vai mandar um PUT/POST pro Spring Boot!
        console.log("Salvando:", { diasCnh, kmRevisao, bloquearCnhVencida, bloquearMadrugada, nomeEmpresa });
        toast.success("Configurações salvas com sucesso!");
    };

    const handleBackup = () => {
        toast.info("Gerando arquivo de backup (.csv)...");
    };

    return (
        <div className="conteudo-principal" style={{ alignItems: "flex-start", width: "100%", padding: "20px" }}>

            <div className="header-actions" style={{ maxWidth: "100%", marginBottom: "30px" }}>
                <h1>⚙️ Configurações do Sistema</h1>
                <button className="save" onClick={handleSalvar} style={{ padding: "10px 20px", fontSize: "1rem" }}>
                    💾 Salvar Alterações
                </button>
            </div>

            {/* GRID DE CARDS DE CONFIGURAÇÃO */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "25px", width: "100%" }}>

                {/* CARD 1: REGRAS E SEGURANÇA */}
                <div className="config-card">
                    <div className="config-header">
                        <h3>⚠️ Regras de Segurança</h3>
                        <p>Controle os bloqueios automáticos dos crachás.</p>
                    </div>
                    <div className="config-body">

                        <div className="config-item">
                            <div>
                                <strong>Bloquear CNH Vencida</strong>
                                <span>Impede o motorista de acessar o veículo se a CNH expirar.</span>
                            </div>
                            {/* A nossa chavinha toggle */}
                            <label className="toggle-switch">
                                <input type="checkbox" checked={bloquearCnhVencida} onChange={(e) => setBloquearCnhVencida(e.target.checked)} />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="config-item">
                            <div>
                                <strong>Bloqueio de Madrugada</strong>
                                <span>Bloqueia acessos fora do horário comercial (22h - 06h).</span>
                            </div>
                            <label className="toggle-switch">
                                <input type="checkbox" checked={bloquearMadrugada} onChange={(e) => setBloquearMadrugada(e.target.checked)} />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                    </div>
                </div>

                {/* CARD 2: ALERTAS E NOTIFICAÇÕES */}
                <div className="config-card">
                    <div className="config-header">
                        <h3>🔔 Alertas do Sistema</h3>
                        <p>Quando o painel deve te avisar dos problemas.</p>
                    </div>
                    <div className="config-body">

                        <div className="config-item-input">
                            <label>Aviso prévio de CNH (Dias)</label>
                            <input
                                type="number"
                                value={diasCnh}
                                onChange={(e) => setDiasCnh(e.target.value)}
                                className="search-input"
                                style={{ width: "100px", textAlign: "center" }}
                            />
                        </div>

                        <div className="config-item-input">
                            <label>Aviso de Revisão (A cada X km)</label>
                            <input
                                type="number"
                                value={kmRevisao}
                                onChange={(e) => setKmRevisao(e.target.value)}
                                className="search-input"
                                style={{ width: "120px", textAlign: "center" }}
                                step="1000"
                            />
                        </div>

                    </div>
                </div>

                {/* CARD 3: SISTEMA E DADOS */}
                <div className="config-card">
                    <div className="config-header">
                        <h3>🏢 Personalização e Dados</h3>
                        <p>Ajustes gerais e backup de informações.</p>
                    </div>
                    <div className="config-body">

                        <div className="config-item-input" style={{ flexDirection: "column", alignItems: "flex-start", gap: "10px" }}>
                            <label>Nome da Empresa (Para relatórios)</label>
                            <input
                                type="text"
                                value={nomeEmpresa}
                                onChange={(e) => setNomeEmpresa(e.target.value)}
                                className="search-input"
                                style={{ width: "100%" }}
                            />
                        </div>

                        <div style={{ marginTop: "20px", borderTop: "1px solid #333", paddingTop: "20px" }}>
                            <button onClick={handleBackup} style={{ background: "#28a745", color: "#fff", border: "none", padding: "10px 15px", borderRadius: "5px", cursor: "pointer", width: "100%", fontWeight: "bold" }}>
                                📥 Exportar Backup (CSV)
                            </button>
                        </div>

                    </div>
                </div>


                <div className="config-card">
                    <div className="config-header">
                        <h3>Alertas</h3>
                        <p>Visualizar alertas</p>
                    </div>
                </div>

            </div>

        </div>
    );
}

export default Configuracoes;