import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';

import Menu from './components/Menu';
import Notificacoes from './components/Notificacoes';
import BotaoTema from './components/BotaoTema';

import Dashboard          from './pages/Dashboard';
import MonitoramentoTempoReal from './pages/MonitoramentoTempoReal';
import Funcionarios       from './pages/Funcionarios';
import Veiculos           from './pages/veiculos/Veiculos';
import Rotas              from './pages/veiculos/Rotas';
import Alertas            from './pages/veiculos/Alertas';
import Cercas             from './pages/veiculos/Cercas';
import Controladoras      from './pages/Controladoras';
import Cartoes            from './pages/Cartoes';
import Configuracoes      from './pages/configuracoes/Configuracoes';
import Permissoes         from './pages/configuracoes/Permissoes';
import Relatorios         from './pages/Relatorios';
import Comandos           from './pages/comandos';
import Login              from './pages/login';
import Setores            from './pages/configuracoes/Setores';
import Usuario from './pages/configuracoes/Usuario';
import Perfil from './pages/Perfil';
import { useAuth } from './context/AuthContext';

const W_OPEN   = 240;
const W_CLOSED =  56;

/** Sem sessao volta para o login; sem a permissao exigida mostra o aviso. */
function RotaProtegida({ permissao, children }) {
    const { autenticado, temPermissao } = useAuth();

    if (!autenticado) return <Navigate to="/login" replace />;

    if (permissao && !temPermissao(permissao)) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <h2 className="text-lg font-semibold text-foreground">Acesso negado</h2>
                <p className="text-sm text-muted-foreground">
                    Você não tem permissão para acessar esta tela.
                </p>
            </div>
        );
    }

    return children;
}

function LayoutPrincipal() {
    const [isMenuOpen, setIsMenuOpen] = useState(true);
    const toggleMenu = () => setIsMenuOpen(prev => !prev);
    const { autenticado } = useAuth();

    if (!autenticado) return <Navigate to="/login" replace />;

    return (
        <div className="flex h-screen bg-background overflow-hidden">
            <Menu isOpen={isMenuOpen} toggleMenu={toggleMenu} />

            <div
                className="flex-1 flex flex-col overflow-hidden transition-[margin-left] duration-300"
                style={{ marginLeft: isMenuOpen ? W_OPEN : W_CLOSED }}
            >
                <header className="h-[60px] bg-card flex items-center justify-end px-5 border-b border-border z-40">
                    <div className="flex items-center gap-1">
                        <BotaoTema />
                        <Notificacoes />
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-6">
                    <Routes>
                        <Route path="/dashboard"                element={<RotaProtegida permissao="dashboard.visualizar"><Dashboard /></RotaProtegida>} />
                        <Route path="/Monitoramento"            element={<RotaProtegida permissao="monitoramento.visualizar"><MonitoramentoTempoReal /></RotaProtegida>} />
                        <Route path="/Comandos"                 element={<RotaProtegida permissao="comandos.visualizar"><Comandos /></RotaProtegida>} />
                        <Route path="/funcionarios"             element={<RotaProtegida permissao="funcionarios.visualizar"><Funcionarios /></RotaProtegida>} />
                        <Route path="/veiculos"                 element={<RotaProtegida permissao="veiculos.visualizar"><Veiculos /></RotaProtegida>} />
                        <Route path="/rotas"                    element={<RotaProtegida permissao="veiculos.rotas"><Rotas /></RotaProtegida>} />
                        <Route path="/alertas"                  element={<RotaProtegida permissao="veiculos.alertas"><Alertas /></RotaProtegida>} />
                        <Route path="/cercas"                   element={<RotaProtegida permissao="veiculos.cercas"><Cercas /></RotaProtegida>} />
                        <Route path="/controladoras"            element={<RotaProtegida permissao="controladoras.visualizar"><Controladoras /></RotaProtegida>} />
                        <Route path="/cartoes"                  element={<RotaProtegida permissao="cartoes.visualizar"><Cartoes /></RotaProtegida>} />
                        <Route path="/configuracoes"            element={<RotaProtegida permissao="configuracoes.geral"><Configuracoes /></RotaProtegida>} />
                        <Route path="/configuracoes/permissoes" element={<RotaProtegida permissao="configuracoes.permissoes"><Permissoes /></RotaProtegida>} />
                        <Route path="/configuracoes/setores"    element={<RotaProtegida permissao="configuracoes.setores"><Setores /></RotaProtegida>} />
                        <Route path="/configuracoes/usuario"    element={<RotaProtegida permissao="configuracoes.usuarios"><Usuario /></RotaProtegida>} />
                        <Route path="/relatorios"               element={<RotaProtegida permissao="relatorios.visualizar"><Relatorios /></RotaProtegida>} />
                        <Route path="/perfil"                   element={<RotaProtegida><Perfil /></RotaProtegida>} />
                        <Route path="/"                         element={<Navigate to="/dashboard" />} />
                    </Routes>
                </main>
            </div>

            <Toaster theme="dark" richColors position="bottom-center" />
        </div>
    );
}

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/*"    element={<LayoutPrincipal />} />
            </Routes>
        </Router>
    );
}

export default App;
