import { Link } from 'react-router-dom';
import React, { useState } from 'react';
import logoEmpresa from '../assets/logocompleta.svg';
import {
    Users, Car, House, IdentificationCard,
    FileText, Gear, SignOut, Cpu, List
} from "@phosphor-icons/react";

const W_OPEN   = 240;
const W_CLOSED =  56;

const CSS = `
    .sidebar-nav ul {
        list-style: none;
        margin: 0;
        padding: 0;
    }

    .menu-btn {
        display: flex;
        align-items: center;
        gap: 14px;
        width: 100%;
        padding: 10px 14px;
        color: #ffffff;
        text-decoration: none;
        font-size: 0.93rem;
        cursor: pointer;
        border: none;
        background: transparent;
        box-sizing: border-box;
        white-space: nowrap;
        overflow: hidden;
        border-radius: 0;
        transition: background-color 0.2s ease, color 0.2s ease,
                    border-radius 0.2s ease, padding-left 0.2s ease;
        text-align: left;
    }

    .menu-btn:hover {
        background-color: #a30000;
        color: #ffffff;
        border-radius: 8px;
        padding-left: 25px;
    }
    .menu-btn:hover svg {
        color: #ffffff !important;
    }

    .menu-btn .btn-icon {
        flex-shrink: 0;
        display: flex;
        align-items: center;
    }

    .menu-btn .btn-label {
        overflow: hidden;
        transition: opacity 0.2s ease, max-width 0.25s ease;
        max-width: 200px;
        opacity: 1;
    }

    /* Quando colapsado: centraliza ícone e esconde label */
    .sidebar-closed .menu-btn {
        justify-content: center;
        padding: 10px 0;
        gap: 0;
    }
    .sidebar-closed .menu-btn:hover {
        padding-left: 0;
        border-radius: 6px;
    }
    .sidebar-closed .menu-btn .btn-label {
        max-width: 0;
        opacity: 0;
        pointer-events: none;
    }

    .menu-btn .btn-arrow {
        margin-left: auto;
        font-size: 0.6rem;
        color: #666;
        transition: transform 0.25s ease;
        flex-shrink: 0;
    }
    .menu-btn .btn-arrow.open {
        transform: rotate(90deg);
    }
    .sidebar-closed .menu-btn .btn-arrow {
        display: none;
    }

    .submenu {
        background: #141414;
        overflow: hidden;
    }
    .submenu .menu-btn {
        padding-left: 52px;
        font-size: 0.86rem;
        color: #bbb;
        justify-content: flex-start;
    }
    .submenu .menu-btn:hover {
        padding-left: 58px;
    }
    .sidebar-closed .submenu {
        display: none;
    }

    .btn-sair { color: #ff4d4d !important; }
    .btn-sair svg { color: #ff4d4d !important; }
    .btn-sair:hover { background-color: #7a0000 !important; color: #fff !important; }

    .sidebar-toggle {
        background: none;
        border: none;
        color: #aaa;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 6px;
        border-radius: 6px;
        transition: color 0.2s, background 0.2s;
        flex-shrink: 0;
    }
    .sidebar-toggle:hover {
        color: #fff;
        background: rgba(255,255,255,0.08);
    }

    .perfil-link {
        display: flex;
        align-items: center;
        gap: 10px;
        background: #2a2a2a;
        color: #fff;
        padding: 10px 14px;
        border-radius: 8px;
        text-decoration: none;
        font-size: 0.88rem;
        white-space: nowrap;
        overflow: hidden;
        transition: background 0.2s, color 0.2s;
        justify-content: flex-start;
    }
    .sidebar-closed .perfil-link {
        justify-content: center;
        padding: 10px 0;
    }
    .perfil-link:hover {
        background: #a30000;
        color: #fff;
    }
    .sidebar-closed .perfil-label {
        display: none;
    }
`;

function Menu({ isOpen, toggleMenu }) {
    const [veiculosOpen, setVeiculosOpen] = useState(false);

    return (
        <>
            <style>{CSS}</style>
            <nav
                className={`sidebar-nav ${!isOpen ? 'sidebar-closed' : ''}`}
                style={{
                    width        : isOpen ? W_OPEN : W_CLOSED,
                    minWidth     : isOpen ? W_OPEN : W_CLOSED,
                    height       : '100vh',
                    position     : 'fixed',
                    top          : 0,
                    left         : 0,
                    background   : '#1a1a1a',
                    display      : 'flex',
                    flexDirection: 'column',
                    zIndex       : 1200,
                    transition   : 'width 0.3s ease, min-width 0.3s ease',
                    overflowX    : 'hidden',
                    overflowY    : 'auto',
                    boxShadow    : '6px 0 20px rgba(0,0,0,0.4)',
                }}
            >
                {/* ── Topo: logo + toggle ── */}
                <div style={{
                    display        : 'flex',
                    alignItems     : 'center',
                    justifyContent : isOpen ? 'space-between' : 'center',
                    padding        : isOpen ? '14px 16px' : '14px 0',
                    borderBottom   : '1px solid #2a2a2a',
                    flexShrink     : 0,
                    minHeight      : '60px',
                }}>
                    {isOpen && (
                        <img
                            src={logoEmpresa}
                            alt="Logo"
                            style={{ width: 130, filter: 'invert(1)', flexShrink: 0 }}
                        />
                    )}
                    {/* ÚNICO botão de toggle — não adicione outro fora deste componente */}
                    <button className="sidebar-toggle" onClick={toggleMenu}>
                        <List size={22} weight="bold" />
                    </button>
                </div>

                {/* ── Itens ── */}
                <ul style={{ flex: 1, padding: '8px 6px', margin: 0 }}>

                    <li>
                        <Link to="/dashboard" className="menu-btn">
                            <span className="btn-icon"><House size={20} /></span>
                            <span className="btn-label">Dashboard</span>
                        </Link>
                    </li>

                    <li>
                        <Link to="/funcionarios" className="menu-btn">
                            <span className="btn-icon"><Users size={20} /></span>
                            <span className="btn-label">Funcionários</span>
                        </Link>
                    </li>

                    {/* Veículos com submenu */}
                    <li>
                        <button className="menu-btn" onClick={() => setVeiculosOpen(v => !v)}>
                            <span className="btn-icon"><Car size={20} /></span>
                            <span className="btn-label">Veículos</span>
                            <span className={`btn-arrow ${veiculosOpen ? 'open' : ''}`}>▶</span>
                        </button>
                        {veiculosOpen && (
                            <ul className="submenu">
                                <li><Link to="/veiculos" className="menu-btn"><span className="btn-label">Lista de Veículos</span></Link></li>
                                <li><Link to="/Rotas"    className="menu-btn"><span className="btn-label">Rotas</span></Link></li>
                                <li><Link to="/Alertas"  className="menu-btn"><span className="btn-label">Alertas</span></Link></li>
                            </ul>
                        )}
                    </li>

                    <li>
                        <Link to="/controladoras" className="menu-btn">
                            <span className="btn-icon"><Cpu size={20} /></span>
                            <span className="btn-label">Controladoras</span>
                        </Link>
                    </li>

                    <li>
                        <Link to="/cartoes" className="menu-btn">
                            <span className="btn-icon"><IdentificationCard size={20} /></span>
                            <span className="btn-label">Cartões</span>
                        </Link>
                    </li>

                    <li>
                        <Link to="/Relatorios" className="menu-btn">
                            <span className="btn-icon"><FileText size={20} /></span>
                            <span className="btn-label">Relatórios</span>
                        </Link>
                    </li>

                    <li>
                        <Link to="/configuracoes" className="menu-btn">
                            <span className="btn-icon"><Gear size={20} /></span>
                            <span className="btn-label">Configuração</span>
                        </Link>
                    </li>

                    <li style={{ marginTop: '8px' }}>
                        <button className="menu-btn btn-sair">
                            <span className="btn-icon"><SignOut size={20} /></span>
                            <span className="btn-label">Sair</span>
                        </button>
                    </li>
                </ul>

                {/* ── Perfil ── */}
                <div style={{ padding: '12px 8px', borderTop: '1px solid #2a2a2a', flexShrink: 0 }}>
                    <Link to="/perfil" className="perfil-link">
                        <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>👤</span>
                        <span className="perfil-label">Perfil</span>
                    </Link>
                </div>
            </nav>
        </>
    );
}

export default Menu;