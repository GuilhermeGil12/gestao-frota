import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import iconeSinoGif from './assets/icons8-sino.gif';
import iconeSinoPng from './assets/icons8-sino-48.png';

import Menu from './components/Menu';

import Dashboard     from './pages/Dashboard';
import Funcionarios  from './pages/Funcionarios';
import Veiculos      from './pages/Veiculos';
import Rotas         from './pages/Rotas';
import Alertas       from './pages/Alertas';
import Controladoras from './pages/Controladoras';
import Cartoes       from './pages/Cartoes';
import Configuracoes from './pages/Configuracoes';
import Relatorios    from './pages/Relatorios';

// Deve bater com W_OPEN e W_CLOSED do Menu.jsx
const W_OPEN   = 240;
const W_CLOSED =  56;

function App() {
    const [isMenuOpen, setIsMenuOpen]           = useState(true);
    const [isNotificacaoOpen, setIsNotificacaoOpen] = useState(false);
    const [isHovering, setIsHovering]           = useState(false);

    const toggleMenu = () => setIsMenuOpen(prev => !prev);

    const notificacoes = [
        { id: 1, texto: "⚠️ A CNH do motorista Guilherme Gil vence em 5 dias.",       tempo: "Há 2 horas" },
        { id: 2, texto: "🔧 Veículo ABC-1234 atingiu a quilometragem para revisão.", tempo: "Há 4 horas" },
        { id: 3, texto: "🚫 Tentativa de acesso negada fora do horário.",             tempo: "Ontem"      },
    ];

    return (
        <Router>
            <div
                className="app-container"
                style={{ display: 'flex', height: '100vh', background: '#121212', overflow: 'hidden' }}
            >
                {/*
                    MENU LATERAL
                    O botão hamburguer/toggle já está DENTRO do Menu.
                    NÃO adicione nenhum botão ☰ fora daqui.
                */}
                <Menu isOpen={isMenuOpen} toggleMenu={toggleMenu} />

                {/* COLUNA DIREITA — acompanha a largura do menu */}
                <div style={{
                    flex          : 1,
                    display       : 'flex',
                    flexDirection : 'column',
                    marginLeft    : isMenuOpen ? W_OPEN : W_CLOSED,
                    transition    : 'margin-left 0.3s ease',
                    overflow      : 'hidden',
                }}>

                    {/* TOPBAR — SEM botão hamburguer aqui */}
                    <div
                        className="global-topbar"
                        style={{
                            height         : '60px',
                            background     : '#1a1a1a',
                            display        : 'flex',
                            alignItems     : 'center',
                            justifyContent : 'flex-end',   // alinha sino à direita
                            padding        : '0 20px',
                            borderBottom   : '1px solid #333',
                            zIndex         : 1000,
                        }}
                    >
                        {/* SINO */}
                        <div className="notification-wrapper" style={{ position: 'relative' }}>
                            <button
                                className="btn-bell"
                                onClick={() => setIsNotificacaoOpen(!isNotificacaoOpen)}
                                onMouseEnter={() => setIsHovering(true)}
                                onMouseLeave={() => setIsHovering(false)}
                                style={{
                                    background: 'none', border: 'none',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                                }}
                            >
                                <img
                                    src={isHovering ? iconeSinoGif : iconeSinoPng}
                                    alt="Notificações"
                                    style={{ width: '28px', height: '28px', filter: 'invert(1)' }}
                                />
                                {notificacoes.length > 0 && (
                                    <span style={{
                                        position: 'absolute', top: '-5px', right: '-5px',
                                        background: 'red', color: 'white',
                                        borderRadius: '50%', padding: '2px 6px', fontSize: '10px',
                                    }}>
                                        {notificacoes.length}
                                    </span>
                                )}
                            </button>

                            {isNotificacaoOpen && (
                                <div style={{
                                    position: 'absolute', right: 0, top: '45px',
                                    background: '#fff', color: '#000', width: '300px',
                                    borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', zIndex: 2000,
                                }}>
                                    <div style={{ padding: '15px', borderBottom: '1px solid #eee' }}>
                                        <h4 style={{ margin: 0 }}>Notificações Recentes</h4>
                                    </div>
                                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                        {notificacoes.map(notif => (
                                            <div key={notif.id} style={{ padding: '12px', borderBottom: '1px solid #f9f9f9' }}>
                                                <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem', color: '#333' }}>{notif.texto}</p>
                                                <span style={{ fontSize: '0.75rem', color: '#888' }}>{notif.tempo}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* CONTEÚDO PRINCIPAL */}
                    <main
                        className="conteudo-principal"
                        style={{ flex: 1, overflowY: 'auto', padding: '20px' }}
                    >
                        <Routes>
                            <Route path="/dashboard"     element={<Dashboard />}     />
                            <Route path="/funcionarios"  element={<Funcionarios />}  />
                            <Route path="/veiculos"      element={<Veiculos />}      />
                            <Route path="/rotas"         element={<Rotas />}         />
                            <Route path="/alertas"       element={<Alertas />}       />
                            <Route path="/controladoras" element={<Controladoras />} />
                            <Route path="/cartoes"       element={<Cartoes />}       />
                            <Route path="/configuracoes" element={<Configuracoes />} />
                            <Route path="/relatorios"    element={<Relatorios />}    />
                            <Route path="/"              element={<Navigate to="/dashboard" />} />
                        </Routes>
                    </main>
                </div>

                <ToastContainer autoClose={3000} theme="colored" />
            </div>
        </Router>
    );
}

export default App;