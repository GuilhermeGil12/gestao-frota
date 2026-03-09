import { Link } from 'react-router-dom';

function Menu() {
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
                    <li className="sidebar-item">
                        <Link to="/veiculos">Veículos</Link>
                    </li>
                    <li className="sidebar-item">
                        <Link to="/controladoras">Controladoras</Link>
                    </li>

                    {/* Estes itens ainda não têm tela, então deixamos como links inativos por enquanto */}
                    <li className="sidebar-item"><a style={{cursor: 'pointer'}}>Cartão</a></li>
                    <li className="sidebar-item"><a style={{cursor: 'pointer'}}>Configuração</a></li>
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