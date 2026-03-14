import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Importação das imagens (Sino)
import iconeSinoGif from './assets/icons8-sino.gif';
import iconeSinoPng from './assets/icons8-sino-48.png';

// Importação do Menu
import Menu from './components/Menu';

// Importação das Telas
import Dashboard from './pages/Dashboard';
import Funcionarios from './pages/Funcionarios';
import Veiculos from './pages/Veiculos';
import Rotas from './pages/Rotas';
import Controladoras from './pages/Controladoras';
import Cartoes from './pages/Cartoes';
import Configuracoes from './pages/Configuracoes';
import Relatorios from './pages/Relatorios';

function App() {
    // 1. Estados para o Menu
    const [isMenuOpen, setIsMenuOpen] = useState(true);

    // 2. Estados para o Sino (Notificação)
    const [isNotificacaoOpen, setIsNotificacaoOpen] = useState(false);
    const [isHovering, setIsHovering] = useState(false);

    // Função para abrir/fechar o menu
    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    const notificacoes = [
        { id: 1, texto: "⚠️ A CNH do motorista Guilherme Gil vence em 5 dias.", tempo: "Há 2 horas" },
        { id: 2, texto: "🔧 Veículo ABC-1234 atingiu a quilometragem para revisão.", tempo: "Há 4 horas" },
        { id: 3, texto: "🚫 Tentativa de acesso negada fora do horário.", tempo: "Ontem" }
    ];

    return (
        <Router>
            <div className="app-container" style={{ display: "flex", height: "100vh", background: "#121212", overflow: "hidden" }}>

                {/* MENU LATERAL (Passamos o estado para ele se esconder) */}
                <Menu isOpen={isMenuOpen} toggleMenu={toggleMenu} />

                {/* COLUNA DA DIREITA (Topbar + Conteúdo) */}
                <div style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    marginLeft: isMenuOpen ? "260px" : "0",
                    transition: "margin-left 0.3s ease",
                    overflow: "hidden"
                }}>

                    {/* BARRA SUPERIOR (TOPBAR) */}
                    <div className="global-topbar" style={{
                        height: "60px",
                        background: "#1a1a1a",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0 20px",
                        borderBottom: "1px solid #333",
                        zIndex: 1000
                    }}>
                        {/* Botão Hambúrguer (Só aparece se o menu estiver fechado) */}
                        {!isMenuOpen && (
                            <button
                                onClick={toggleMenu}
                                style={{ background: "none", border: "none", color: "#fff", fontSize: "1.5rem", cursor: "pointer" }}
                            >
                                ☰
                            </button>
                        )}

                        <div style={{ flex: 1 }}></div>

                        {/* BLOCO DO SINO (Original seu) */}
                        <div className="notification-wrapper" style={{ position: "relative" }}>
                            <button
                                className="btn-bell"
                                onClick={() => setIsNotificacaoOpen(!isNotificacaoOpen)}
                                onMouseEnter={() => setIsHovering(true)}
                                onMouseLeave={() => setIsHovering(false)}
                                style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}
                            >
                                <img
                                    src={isHovering ? iconeSinoGif : iconeSinoPng}
                                    alt="Notificações"
                                    style={{ width: "28px", height: "28px", filter: "invert(1)" }}
                                />
                                {notificacoes.length > 0 && (
                                    <span className="notification-badge" style={{ position: "absolute", top: "-5px", right: "-5px", background: "red", color: "white", borderRadius: "50%", padding: "2px 6px", fontSize: "10px" }}>
                                        {notificacoes.length}
                                    </span>
                                )}
                            </button>

                            {isNotificacaoOpen && (
                                <div className="notification-dropdown" style={{ position: "absolute", right: 0, top: "45px", background: "#fff", color: "#000", width: "300px", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.5)", zIndex: 2000 }}>
                                    <div style={{ padding: "15px", borderBottom: "1px solid #eee" }}>
                                        <h4 style={{ margin: 0 }}>Notificações Recentes</h4>
                                    </div>
                                    <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                                        {notificacoes.map(notif => (
                                            <div key={notif.id} style={{ padding: "12px", borderBottom: "1px solid #f9f9f9" }}>
                                                <p style={{ margin: "0 0 5px 0", fontSize: "0.9rem", color: "#333" }}>{notif.texto}</p>
                                                <span style={{ fontSize: "0.75rem", color: "#888" }}>{notif.tempo}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ÁREA ONDE AS TELAS SÃO CARREGADAS */}
                    <main className="conteudo-principal" style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
                        <Routes>
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/funcionarios" element={<Funcionarios />} />
                            <Route path="/veiculos" element={<Veiculos />} />
                            <Route path="/rotas" element={<Rotas />} />
                            <Route path="/controladoras" element={<Controladoras />} />
                            <Route path="/cartoes" element={<Cartoes />} />
                            <Route path="/configuracoes" element={<Configuracoes />} />
                            <Route path="/relatorios" element={<Relatorios />} />
                            <Route path="/" element={<Navigate to="/dashboard" />} />
                        </Routes>
                    </main>

                </div>

                <ToastContainer autoClose={3000} theme="colored" />
            </div>
        </Router>
    );
}

// ESTA LINHA ABAIXO É A QUE RESOLVE O ERRO DO SEU PRINT!
export default App;