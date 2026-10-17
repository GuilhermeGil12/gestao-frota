import { Link, useNavigate } from 'react-router-dom';
import React, { useState } from 'react';
import logoLight from '../assets/logocompleta-light.svg';
import logoDark from '../assets/logocompleta-dark.svg';
import {
    Users, Car, LayoutDashboard, CreditCard,
    FileText, Settings, Radio, LogOut, Cpu, Menu as MenuIcon, ChevronRight, User,
    ShieldAlert
} from "lucide-react";
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from './ui/alert-dialog';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

function Menu({ isOpen, toggleMenu }) {
    const [veiculosOpen, setVeiculosOpen] = useState(false);
    const [configOpen, setConfigOpen] = useState(false);
    const [confirmarSaida, setConfirmarSaida] = useState(false);
    const { tema } = useTheme();
    const { usuario, logout, temPermissao } = useAuth();
    const navigate = useNavigate();

    const sair = async () => {
        setConfirmarSaida(false);
        await logout();
        navigate("/login", { replace: true });
    };

    const menuItems = [
        { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", permissao: "dashboard.visualizar" },
        { to: "/Monitoramento", icon: Radio, label: "Monitoramento", permissao: "monitoramento.visualizar" },
        { to: "/funcionarios", icon: Users, label: "Funcionários", permissao: "funcionarios.visualizar" },
        { to: "/comandos", icon: ShieldAlert, label: "Comandos", permissao: "comandos.visualizar" },
    ].filter(item => temPermissao(item.permissao));

    const veiculosSubmenu = [
        { to: "/veiculos", label: "Lista de Veículos", permissao: "veiculos.visualizar" },
        { to: "/rotas", label: "Rotas", permissao: "veiculos.rotas" },
        { to: "/alertas", label: "Alertas", permissao: "veiculos.alertas" },
        { to: "/cercas", label: "Cercas", permissao: "veiculos.cercas" },
    ].filter(item => temPermissao(item.permissao));

    const bottomItems = [
        { to: "/controladoras", icon: Cpu, label: "Controladoras", permissao: "controladoras.visualizar" },
        { to: "/cartoes", icon: CreditCard, label: "Cartões", permissao: "cartoes.visualizar" },
        { to: "/relatorios", icon: FileText, label: "Relatórios", permissao: "relatorios.visualizar" },
    ].filter(item => temPermissao(item.permissao));

    const configSubMenu = [
        { to: "/configuracoes", label: "Geral", permissao: "configuracoes.geral" },
        { to: "/configuracoes/permissoes", label: "Permissões", permissao: "configuracoes.permissoes" },
        { to: "/configuracoes/setores", label: "Setores", permissao: "configuracoes.setores" },
        { to: "/configuracoes/usuario", label: "Usuários", permissao: "configuracoes.usuarios" },
    ].filter(item => temPermissao(item.permissao));

    const mostrarVeiculos = veiculosSubmenu.length > 0;
    const mostrarConfig = configSubMenu.length > 0;

    return (
        <nav
            className={cn(
                "fixed top-0 left-0 h-screen flex flex-col z-50 bg-sidebar border-r border-sidebar-border shadow-xl transition-all duration-300 overflow-x-hidden overflow-y-auto",
                isOpen ? "w-60 min-w-60" : "w-14 min-w-14"
            )}
        >
            {/* Topo: logo + toggle */}
            <div className={cn(
                "flex items-center border-b border-sidebar-border shrink-0 min-h-[60px]",
                isOpen ? "justify-between px-4 py-3.5" : "justify-center py-3.5"
            )}>
                {isOpen && (
                    tema == 'dark' ?
                    <img src={logoDark} alt="Logo" className="w-[130px] shrink-0" />
                    : <img src={logoLight} alt="Logo" className="w-[130px] shrink-0" />

                )}
                <Button variant="ghost" size="icon" onClick={toggleMenu} className="text-muted-foreground hover:text-foreground">
                    <MenuIcon className="h-5 w-5" />
                </Button>
            </div>

            {/* Itens do menu */}
            <ul className="flex-1 p-1.5 m-0 list-none space-y-0.5">
                {menuItems.map(item => (
                    <li key={item.to}>
                        <Link
                            to={item.to}
                            className={cn(
                                "flex items-center gap-3.5 w-full px-3.5 py-2.5 text-sidebar-foreground/70 text-sm no-underline rounded-md transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
                                !isOpen && "justify-center px-0 gap-0"
                            )}
                        >
                            <item.icon className="h-5 w-5 shrink-0" />
                            {isOpen && <span>{item.label}</span>}
                        </Link>
                    </li>
                ))}

                {/* Veiculos com submenu */}
                {mostrarVeiculos && (
                <li>
                    <button
                        onClick={() => setVeiculosOpen(v => !v)}
                        className={cn(
                            "flex items-center gap-3.5 w-full px-3.5 py-2.5 text-sidebar-foreground/70 text-sm bg-transparent border-none cursor-pointer rounded-md transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground text-left",
                            !isOpen && "justify-center px-0 gap-0"
                        )}
                    >
                        <Car className="h-5 w-5 shrink-0" />
                        {isOpen && (
                            <>
                                <span>Veículos</span>
                                <ChevronRight className={cn(
                                    "h-3.5 w-3.5 ml-auto text-muted-foreground transition-transform duration-200",
                                    veiculosOpen && "rotate-90"
                                )} />
                            </>
                        )}
                    </button>
                    {veiculosOpen && isOpen && (
                        <ul className="list-none p-0 m-0 bg-sidebar-accent/50 rounded-md mt-0.5">
                            {veiculosSubmenu.map(sub => (
                                <li key={sub.to}>
                                    <Link
                                        to={sub.to}
                                        className="flex items-center pl-13 py-2 text-sidebar-foreground/60 text-[0.82rem] no-underline rounded-md transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                                    >
                                        {sub.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </li>
                )}

                {bottomItems.map(item => (
                    <li key={item.to}>
                        <Link
                            to={item.to}
                            className={cn(
                                "flex items-center gap-3.5 w-full px-3.5 py-2.5 text-sidebar-foreground/70 text-sm no-underline rounded-md transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
                                !isOpen && "justify-center px-0 gap-0"
                            )}
                        >
                            <item.icon className="h-5 w-5 shrink-0" />
                            {isOpen && <span>{item.label}</span>}
                        </Link>
                    </li>
                ))}

                {mostrarConfig && (
                <li>
                    <button
                    //inverte o valor de c
                    onClick={() => setConfigOpen(c => !c)}
                    className={cn(
                        "flex items-center gap-3.5 w-full px-3.5 py-2.5 text-sidebar-foreground/70 text-sm bg-transparent border-none cursor-pointer rounded-md transition-colors hover:bg-sidebar-accent hover:text-siderbar-foreground text-left ",
                        !isOpen && "justify-center px-0 gap-0"
                    )}>
                        <Settings className="h-5 w-5 shrink-0"/>
                        {isOpen && (
                            <>
                            <span>Configurações</span>
                            <ChevronRight className={cn(
                                 "h-3.5 w-3.5 ml-auto text-muted-foreground transition-transform duration-200",
                                 configOpen && "rotate-90"
                            )}/>
                            </>
                        )}

                    </button>
                    {configOpen && isOpen && (
                        <ul className="list-none p-0 m-0 bg-sidebar-accent/50 rounded-md mt-0.5">
                            {configSubMenu.map(sub => (
                                <li key={sub.to}>
                                    <Link
                                        to={sub.to}
                                        className="flex items-center pl-13 py-2 text-sidebar-foreground/60 text-[0.82rem] no-underline rounded-md transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                                    >
                                        {sub.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </li>
                )}

                {/* Sair */}
                <li className="mt-2">
                    <button
                        onClick={() => setConfirmarSaida(true)}
                        className={cn(
                            "flex items-center gap-3.5 w-full px-3.5 py-2.5 text-red-400 text-sm bg-transparent border-none cursor-pointer rounded-md transition-colors hover:bg-destructive hover:text-destructive-foreground",
                            !isOpen && "justify-center px-0 gap-0"
                        )}
                    >
                        <LogOut className="h-5 w-5 shrink-0" />
                        {isOpen && <span>Sair</span>}
                    </button>
                </li>
            </ul>

            {/* Perfil */}
            <div className="p-2 border-t border-sidebar-border shrink-0">
                <Link
                    to="/perfil"
                    className={cn(
                        "flex items-center gap-2.5 bg-sidebar-accent text-sidebar-foreground px-3.5 py-2.5 rounded-lg text-sm no-underline transition-colors hover:bg-sidebar-accent/80",
                        !isOpen && "justify-center px-0"
                    )}
                >
                    <User className="h-5 w-5 shrink-0" />
                    {isOpen && (
                        <span className="truncate">{usuario?.nomeUsuario ?? "Perfil"}</span>
                    )}
                </Link>
            </div>

            <AlertDialog open={confirmarSaida} onOpenChange={setConfirmarSaida}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Sair do sistema?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Você precisará entrar novamente com seu e-mail e senha.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={sair}
                        >
                            Sim, sair
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </nav>
    );
}

export default Menu;
