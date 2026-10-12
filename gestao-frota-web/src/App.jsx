import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Bell } from 'lucide-react';
import { Button } from './components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from './components/ui/dropdown-menu';
import { Badge } from './components/ui/badge';

import Menu from './components/Menu';

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

    const notificacoes = [
        { id: 1, texto: "A CNH do motorista Guilherme Gil vence em 5 dias.",       tempo: "Ha 2 horas" },
        { id: 2, texto: "Veiculo ABC-1234 atingiu a quilometragem para revisao.", tempo: "Ha 4 horas" },
        { id: 3, texto: "Tentativa de acesso negada fora do horario.",             tempo: "Ontem"      },
    ];

    return (
        <div className="flex h-screen bg-background overflow-hidden">
            <Menu isOpen={isMenuOpen} toggleMenu={toggleMenu} />

            <div
                className="flex-1 flex flex-col overflow-hidden transition-[margin-left] duration-300"
                style={{ marginLeft: isMenuOpen ? W_OPEN : W_CLOSED }}
            >
                <header className="h-[60px] bg-card flex items-center justify-end px-5 border-b border-border z-40">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="relative">
                                <Bell className="h-5 w-5" />
                                {notificacoes.length > 0 && (
                                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-red-600 text-white border-0">
                                        {notificacoes.length}
                                    </Badge>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-80">
                            <DropdownMenuLabel>Notificacoes Recentes</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <div className="max-h-80 overflow-y-auto">
                                {notificacoes.map(notif => (
                                    <div key={notif.id} className="px-4 py-3 border-b border-border last:border-0 hover:bg-accent cursor-pointer transition-colors">
                                        <p className="text-sm text-foreground leading-relaxed">{notif.texto}</p>
                                        <span className="text-xs text-muted-foreground mt-1 block">{notif.tempo}</span>
                                    </div>
                                ))}
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
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
