import { Link } from 'react-router-dom';
import React, { useState } from 'react'; //

function Menu() {
    const [isVeiculosOpen, setIsVeiculosOpen] = useState(false);
    return (
        <nav className="sidebar-container">
            {/* Bloco Superior: Logo e Navegação Principal */}
            <div className="sidebar-top">
                <h2 className="sidebar-logo">Frota System</h2>
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
                    {/* ========================================== */}
                    <li className="sidebar-item">
                        <Link to="/controladoras">Controladoras</Link>
                    </li>
                    <li className="sidebar-item">
                        <Link to="/cartoes" className="menu-item">Cartões</Link>
                    </li>
                    <li className="sidebar-item">
                        <Link to="/Relatorios" className="menu-item">Relatórios</Link>
                    </li>
                    <li className="sidebar-item">
                        <Link to="/configuracoes" className="menu-item">Configuração</Link>
                    </li>


                    {/* Estes itens ainda não têm tela, então deixamos como links inativos por enquanto */}


                    <li className="sidebar-item"><a style={{cursor: 'pointer'}}>Sair</a></li>
                </ul>
            </div>

            {/* Bloco Inferior: Botão de Perfil fixado no final usando o flexbox do CSS */}
            <div className="sidebar-footer">
                <Link to="/perfil" className="btn-perfil">Perfil</Link>
            </div>
        </nav>
    );
}

export default Menu;