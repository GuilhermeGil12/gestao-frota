import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


// 👇 IMPORTAÇÃO DAS DUAS IMAGENS (A PARADA E A ANIMADA)
import iconeSinoGif from './assets/icons8-sino.gif';
import iconeSinoPng from './assets/icons8-sino-48.png';

// Importação do Menu (que fica fixo na lateral)
import Menu from './components/Menu';

// Importação de todas as suas Telas (Páginas)
import Dashboard from './pages/Dashboard';
import Funcionarios from './pages/Funcionarios';
import Veiculos from './pages/Veiculos';
import Rotas from './pages/Rotas';
import Controladoras from './pages/Controladoras';
import Cartoes from './pages/Cartoes';
import Configuracoes from './pages/Configuracoes';
import Relatorios from './pages/Relatorios';

function App() {
    // 1. Controle da caixinha do sino (aberta/fechada)
    const [isNotificacaoOpen, setIsNotificacaoOpen] = useState(false);

    // 2. Controle do mouse (saber se o mouse está em cima do botão)
    const [isHovering, setIsHovering] = useState(false);

    // 3. Dados FALSOS só para testarmos o visual agora (depois vamos puxar do Java)
    const notificacoes = [
        { id: 1, texto: "⚠️ A CNH do motorista Guilherme Gil vence em 5 dias.", tempo: "Há 2 horas" },
        { id: 2, texto: "🔧 Veículo ABC-1234 atingiu a quilometragem para revisão.", tempo: "Há 4 horas" },
        { id: 3, texto: "🚫 Tentativa de acesso negada fora do horário (Cartão: AABBCC).", tempo: "Ontem" }
    ];

    return (
        <Router>
            <div className="app-container" style={{ display: "flex", height: "100vh" }}>

                {/* O Menu fica aqui fora para não recarregar quando mudarmos de tela */}
                <Menu />

                {/* Div coluna: empilha a Barra do Sino no topo e o Conteúdo embaixo */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

                    {/* ========================================================= */}
                    {/* BARRA SUPERIOR GLOBAL (O Sino Inteligente) */}
                    {/* ========================================================= */}
                    <div className="global-topbar">
                        <div className="notification-wrapper">

                            <button
                                className="btn-bell"
                                onClick={() => setIsNotificacaoOpen(!isNotificacaoOpen)}
                                onMouseEnter={() => setIsHovering(true)}   // Mouse Entrou!
                                onMouseLeave={() => setIsHovering(false)}  // Mouse Saiu!
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                {/* 👇 A Mágica: Se o mouse estiver em cima, mostra o GIF. Senão, mostra o PNG. */}
                                <img
                                    src={isHovering ? iconeSinoGif : iconeSinoPng}
                                    alt="Notificações"
                                    style={{ width: "28px", height: "28px", filter: "invert(1)" }}
                                />

                                {/* Bolinha vermelha com a quantidade de notificações */}
                                {notificacoes.length > 0 && (
                                    <span className="notification-badge">{notificacoes.length}</span>
                                )}
                            </button>

                            {/* DROPDOWN - A caixinha que abre ao clicar */}
                            {isNotificacaoOpen && (
                                <div className="notification-dropdown">
                                    <div className="dropdown-header">
                                        <h4>Notificações Recentes</h4>
                                    </div>

                                    <div className="dropdown-list">
                                        {notificacoes.map(notif => (
                                            <div key={notif.id} className="notification-item">
                                                <p>{notif.texto}</p>
                                                <span className="time">{notif.tempo}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="dropdown-footer">
                                        <button className="btn-ver-todas" onClick={() => setIsNotificacaoOpen(false)}>
                                            Ver todas as notificações
                                        </button>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                    {/* ========================================================= */}

                    {/* O main envolve as telas e aplica aquele fundo preto absoluto */}
                    <main className="conteudo-principal" style={{ flex: 1, overflowY: "auto", position: "relative" }}>
                        <Routes>
                            {/* Rota do Dashboard (Tela Inicial com os cards) */}
                            <Route path="/dashboard" element={<Dashboard />} />

                            {/* Rotas dos Cadastros */}
                            <Route path="/funcionarios" element={<Funcionarios />} />
                            <Route path="/veiculos" element={<Veiculos />} />
                            <Route path="/rotas" element={<Rotas />} />
                            <Route path="/controladoras" element={<Controladoras />} />
                            <Route path="/cartoes" element={<Cartoes />} />
                            <Route path="/configuracoes" element={<Configuracoes />} />
                            <Route path="/relatorios" element={<Relatorios />} />

                            {/* Se o usuário entrar só em "localhost:5173/", joga ele direto pro Dashboard */}
                            <Route path="/" element={<Navigate to="/dashboard" />} />
                        </Routes>
                    </main>

                </div>

                <ToastContainer autoClose={3000} theme="colored" />
            </div>
        </Router>
    );
}

export default App;