function Menu() {
    return (
        <nav className="sidebar-container">
            {/* Bloco Superior: Logo e Navegação */}
            <div className="sidebar-top">
                <h2 className="sidebar-logo">Frota System</h2>
                <ul className="sidebar-list">
                    <li className="sidebar-item"><a href="/">Dashboard</a></li>
                    <li className="sidebar-item"><a href="/funcionarios">Funcionários</a></li>
                    <li className="sidebar-item"><a>Veículo</a></li>
                    <li className="sidebar-item"><a>Cartão</a></li>
                    <li className="sidebar-item"><a>Controladora</a></li>
                    <li className="sidebar-item"><a>Configuração</a></li>
                    <li className="sidebar-item"><a>Sair</a></li>
                </ul>
            </div>

            {/* Bloco Inferior: Perfil fixado no final */}
            <div className="sidebar-footer">
                <a href="/perfil" className="btn-perfil">Perfil</a>
            </div>
        </nav>
    );
}

export default Menu;