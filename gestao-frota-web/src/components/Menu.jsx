import { Link } from 'react-router-dom';
import React, { useState } from 'react';
import logoEmpresa from '../assets/logocompleta.svg';
import '../App.css';
import { Users, Car, House, IdentificationCardIcon, FileText, Gear, SignOut, Cpu } from "@phosphor-icons/react";

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

                <ul className="sidebar-list" id="menu-lateral">
                    <li className="sidebar-item">
                        <Link to="/dashboard" className="menu-link">
                            <House size={22} weight="regular" />
                            <span>Dashboard</span>
                        </Link>
                    </li>
                    <li className="sidebar-item">
                        <Link to="/funcionarios" className="menu-link">
                            <Users size={22} weight="regular" />
                            <span>Funcionários</span>
                        </Link>
                    </li>

                    {/* Submenu de Veículos */}
                    <li className="sidebar-item">
                        <div
                            className="submenu-trigger-button"
                            onClick={() => setIsVeiculosOpen(!isVeiculosOpen)}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                        >
                            <Car size={22} weight="regular" />
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
                                <li className="sidebar-item submenu-item">
                                    <Link to="/Alertas">Alertas</Link>
                                </li>
                            </ul>
                        )}
                    </li>

                    <li className="sidebar-item">
                        <Link to="/controladoras" className="menu-link">
                            <Cpu size={22} weight="regular" />
                            <span>Controladoras</span>
                        </Link>
                    </li>
                    <li className="sidebar-item">
                        <Link to="/cartoes" className="menu-link">
                            <IdentificationCardIcon size={22} weight="regular" />
                            Cartões
                        </Link>
                    </li>
                    <li className="sidebar-item">
                        <Link to="/Relatorios">
                            <FileText size={22} weight="regular" />
                            Relatórios
                        </Link>
                    </li>
                    <li className="sidebar-item">
                        <Link to="/configuracoes" className="menu-link">
                            <Gear size={22} weight="regular" />
                            Configuração
                        </Link>
                    </li>
                    <li className="sidebar-item">
                        <a style={{cursor: 'pointer'}} className="menu-link">
                            <SignOut size={22} weight="regular" />
                            <span>Sair</span>
                        </a>
                    </li>
                </ul>
            </div>

            <div className="sidebar-footer" style={{ padding: '20px', marginTop: 'auto' }}>
                <Link to="/perfil" className="btn-perfil">Perfil</Link>
            </div>
        </nav>
    );
}

export default Menu;