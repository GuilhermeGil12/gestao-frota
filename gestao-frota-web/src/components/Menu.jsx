import { Link } from 'react-router-dom';
import React, { useState } from 'react';
import logoEmpresa from '../assets/logocompleta.svg';

// Recebemos isOpen e a função de fechar via props do App.js
function Menu({ isOpen, toggleMenu }) {
    const [isVeiculosOpen, setIsVeiculosOpen] = useState(false);

    return (
        <nav
            className={`sidebar-container ${isOpen ? 'open' : 'closed'}`}
            style={{
                width: '260px',
                position: 'fixed',
                left: isOpen ? '0' : '-260px', // Move o menu para fora da tela
                top: 0,
                height: '100vh',
                transition: 'left 0.3s ease', // Efeito de deslizar
                background: '#1a1a1a',
                zIndex: 1200,
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            {/* Bloco Superior: Logo e Botão de Fechar */}
            <div className="sidebar-top">
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '15px',
                    borderBottom: '1px solid #333'
                }}>
                    {/* SUA LOGO SVG - Agora com tamanho fixo para o menu aberto */}
                    <img
                        src={logoEmpresa}
                        alt="Logo Empresa"
                        style={{
                            width: '150px',
                            height: 'auto',
                            display: 'block',
                            // 👇 ESTA LINHA FAZ A MÁGICA 👇
                            filter: 'invert(1)' // Inverte preto para branco
                        }}
                    />

                    {/* Botão de fechar (✖) */}
                    <button
                        onClick={toggleMenu}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '1.2rem'
                        }}
                    >
                        ✖
                    </button>
                </div>

                <ul className="sidebar-list">
                    <li className="sidebar-item">
                        <Link to="/dashboard">Dashboard</Link>
                    </li>
                    <li className="sidebar-item">
                        <Link to="/funcionarios">Funcionários</Link>
                    </li>

                    {/* Submenu de Veículos */}
                    <li className="sidebar-item">
                        <div
                            className="submenu-trigger-button"
                            onClick={() => setIsVeiculosOpen(!isVeiculosOpen)}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                        >
                            <span>Veículos</span>
                            <span className="arrow-icon">{isVeiculosOpen ? '▼' : '▶'}</span>
                        </div>

                        {isVeiculosOpen && (
                            <ul className="sidebar-list submenu-list">
                                <li className="sidebar-item submenu-item">
                                    <Link to="/veiculos">Lista de Veículos</Link>
                                </li>
                                <li className="sidebar-item submenu-item">
                                    <Link to="/Rotas">Rotas</Link>
                                </li>
                            </ul>
                        )}
                    </li>

                    <li className="sidebar-item">
                        <Link to="/controladoras">Controladoras</Link>
                    </li>
                    <li className="sidebar-item">
                        <Link to="/cartoes">Cartões</Link>
                    </li>
                    <li className="sidebar-item">
                        <Link to="/Relatorios">Relatórios</Link>
                    </li>
                    <li className="sidebar-item">
                        <Link to="/configuracoes">Configuração</Link>
                    </li>
                    <li className="sidebar-item"><a style={{cursor: 'pointer'}}>Sair</a></li>
                </ul>
            </div>

            <div className="sidebar-footer" style={{ padding: '20px', marginTop: 'auto' }}>
                <Link to="/perfil" className="btn-perfil">Perfil</Link>
            </div>
        </nav>
    );
}

export default Menu;