import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
//import { ToastContainer } from 'react-toastify';
//import 'react-toastify/dist/ReactToastify.css';
import { Toaster } from 'sonner';
import { Bell } from 'lucide-react';
import { cn } from './lib/utils';
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

import Dashboard     from './pages/Dashboard';
import MonitoramentoTempoReal from './pages/MonitoramentoTempoReal';
import Funcionarios  from './pages/Funcionarios';
import Veiculos      from './pages/veiculos/Veiculos';
import Rotas         from './pages/veiculos/Rotas';
import Alertas       from './pages/veiculos/Alertas';
import Cercas        from './pages/veiculos/Cercas';
import Controladoras from './pages/Controladoras';
import Cartoes       from './pages/Cartoes';
import Configuracoes from './pages/configuracoes/Configuracoes';
import Permissoes    from './pages/configuracoes/Permissoes';
import Relatorios    from './pages/Relatorios';

const W_OPEN   = 240;
const W_CLOSED =  56;

function App() {
    const [isMenuOpen, setIsMenuOpen] = useState(true);
    const toggleMenu = () => setIsMenuOpen(prev => !prev);

    const notificacoes = [
        { id: 1, texto: "A CNH do motorista Guilherme Gil vence em 5 dias.",       tempo: "Ha 2 horas" },
        { id: 2, texto: "Veiculo ABC-1234 atingiu a quilometragem para revisao.", tempo: "Ha 4 horas" },
        { id: 3, texto: "Tentativa de acesso negada fora do horario.",             tempo: "Ontem"      },
    ];

    return (
        <Router>
            <div className="flex h-screen bg-background overflow-hidden">
                <Menu isOpen={isMenuOpen} toggleMenu={toggleMenu} />

                <div
                    className="flex-1 flex flex-col overflow-hidden transition-[margin-left] duration-300"
                    style={{ marginLeft: isMenuOpen ? W_OPEN : W_CLOSED }}
                >
                    {/* Topbar */}
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

                    {/* Conteudo principal */}
                    <main className="flex-1 overflow-y-auto p-6">
                        <Routes>
                            <Route path="/dashboard"     element={<Dashboard />}     />
                            <Route path="/Monitoramento"   element={<MonitoramentoTempoReal/>} />
                            <Route path="/funcionarios"  element={<Funcionarios />}  />
                            <Route path="/veiculos"      element={<Veiculos />}      />
                            <Route path="/rotas"         element={<Rotas />}         />
                            <Route path="/alertas"       element={<Alertas />}       />
                            <Route path="/cercas"        element={<Cercas />} />
                            <Route path="/controladoras" element={<Controladoras />} />
                            <Route path="/cartoes"       element={<Cartoes />}       />
                            <Route path="/configuracoes"            element={<Configuracoes />} />
                            <Route path="/configuracoes/permissoes" element={<Permissoes />}    />
                            <Route path="/relatorios"               element={<Relatorios />}    />
                            <Route path="/"              element={<Navigate to="/dashboard" />} />
                        </Routes>
                    </main>
                </div>

                {/* <ToastContainer autoClose={3000} theme="colored" /> */}
                <Toaster theme="dark" richColors position="bottom-center" />
            </div>
        </Router>
    );
}

export default App;
