function Menu() {
    return (
        <nav className="sidebar-container"> {/* Nome único */}
            <h2 className="sidebar-logo">Frota System</h2>
            <ul className="sidebar-list">
                <li className="sidebar-item"><a href="/">Dashboard</a></li>
                <li className="sidebar-item"><a href="/funcionarios">Funcionários</a></li>
            </ul>
        </nav>
    )
}

export default Menu;