
import {
    Users, Car, LayoutDashboard, CreditCard,
    FileText, Settings, Radio, LogOut, Cpu, Menu as MenuIcon, ChevronRight, User,
    ShieldAlert
} from "lucide-react";


    const menuItems = [

     

        { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
        { to: "/Monitoramento", icon: Radio, label: "Monitoramento"},
        { to: "/funcionarios", icon: Users, label: "Funcionários" },
        {to: "/comandos", icon: ShieldAlert, label: "Comandos"},
        {to: "/veiculos", label: "Veículos", icon: Car, children: [
            {to: "/rotas", label: "Lista de Veículos"}, 
            {to: "/alertas", label: "Alertas"},
            {to: "/cercas", label: "Cercas"}]},
        {to: "/controladoras", icon: Cpu, label: "Controladoras"},
        {to: "/cartoes", icon: CreditCard, label: "Cartões"},
        {to: "/relatorios", icon: FileText, label: "Relatórios"},
        {to: "/configuracoes", icon: Settings, label: "Configurações", children: [
            {to: "/geral", label: "Geral"},
            {to: "/permissoes", label: "Permissões"},
            {to: "/setores", label : "Setores"}
        ] }
    ];

    
    
export default menuItems;