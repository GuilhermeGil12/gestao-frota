import { useState, useEffect } from "react";
import api from "../services/api";
//import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { maskIP, maskMAC } from "../utils/mascaras.js";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { toast } from 'sonner';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "../components/ui/alert-dialog";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../components/ui/dialog";
import { useAuth } from "../context/AuthContext";

function Controladoras() {
    const { temPermissao } = useAuth();
    const [controladoras, setControladoras] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const initialState = { idControladora: null, ipControladora: "", macControladora: "", senha: "", ativo: true };
    const [formData, setFormData] = useState(initialState);

    const [controladoraParaExcluir, setControladoraParaExcluir] = useState(null);

    const carregar = async () => {
        try {
            const res = await api.get('/controladora');
            setControladoras(Array.isArray(res.data) ? res.data : []);
        } catch (e) { console.error("Erro na requisicao:", e); setControladoras([]); }
    };

    useEffect(() => { carregar(); }, []);


    const erroMsg = (e, fallback) => e?.response?.data?.message || fallback;

    const handleSalvar = async (e) => {
        e.preventDefault();
        try {
            if (formData.idControladora) await api.put(`/controladora/${formData.idControladora}`, formData);
            else await api.post('/controladora', formData);
            setIsModalOpen(false);
            carregar();
            toast.success("Controladora salva com sucesso!");
        } catch (e) { toast.error(erroMsg(e, "Erro ao salvar a controladora.")); }
    };

    const handleInativar = async (controladora) => {
        try {
            await api.patch(`/controladora/${controladora.idControladora}/inativar`);
            toast.success(controladora.ativo ? "Controladora desativada!" : "Controladora ativada!");
            carregar();
        } catch(e) { toast.error(erroMsg(e, "Erro ao mudar status da controladora.")); }
    };

    const confirmarExclusao = async () => {
        if (!controladoraParaExcluir) return;
        try {
            await api.delete(`/controladora/${controladoraParaExcluir}`);
            toast.success("Controladora excluída com sucesso!");
            carregar();
        } catch (e) {
            toast.error(erroMsg(e, "Não foi possível excluir a controladora."));
        } finally {
            setControladoraParaExcluir(null);
        }
    };

    const handleExcluirClique = (idControladora) => {
        setControladoraParaExcluir(idControladora);
    };

    const abrirModal = (c = null) => { setFormData(c || initialState); setIsModalOpen(true); };

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
                <h1 className="text-xl font-semibold text-foreground">Gestao de Controladoras</h1>
                {temPermissao("controladoras.cadastrar") && (
                    <Button onClick={() => abrirModal()}>+ Nova Controladora</Button>
                )}
            </div>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-[600px]">
                    <DialogHeader><DialogTitle>{formData.idControladora ? "Editar Controladora" : "Cadastrar Controladora"}</DialogTitle><DialogDescription>Preencha os dados da controladora.</DialogDescription></DialogHeader>
                    <form onSubmit={handleSalvar} className="space-y-4">
                        <div className="space-y-2"><Label>Endereco IP</Label><Input placeholder="192.168.0.1" value={formData.ipControladora} onChange={e => setFormData({ ...formData, ipControladora: maskIP(e.target.value) })} required /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Endereco MAC</Label><Input placeholder="00:1B:44:11:3A:B7" value={formData.macControladora} onChange={e => setFormData({ ...formData, macControladora: maskMAC(e.target.value) })} required /></div>
                            <div className="space-y-2"><Label>Senha</Label><Input type="password" placeholder="Senha do equipamento" value={formData.senha} onChange={e => setFormData({ ...formData, senha: e.target.value })} required /></div>
                        </div>
                        <DialogFooter className="border-t border-border pt-4"><Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button><Button type="submit">Confirmar</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Table>
                <TableHeader><TableRow>
                    <TableHead className="w-[10%]">Status</TableHead><TableHead className="w-[15%]">ID Banco</TableHead>
                    <TableHead className="w-[25%]">IP Controladora</TableHead><TableHead className="w-[25%]">MAC Controladora</TableHead><TableHead className="w-[25%] text-center">Acoes</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                    {(!Array.isArray(controladoras) || controladoras.length === 0) ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma controladora encontrada no banco.</TableCell></TableRow>
                    ) : (
                        controladoras.map(c => (
                            <TableRow key={c.idControladora}>
                                <TableCell><Badge variant={c.ativo ? "default" : "secondary"} className={c.ativo ? "bg-green-600" : ""}>{c.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
                                <TableCell>#{c.idControladora}</TableCell>
                                <TableCell>{c.ipControladora}</TableCell>
                                <TableCell>{c.macControladora}</TableCell>
                                <TableCell>
                                    <div className="flex gap-2 justify-center">
                                        {temPermissao("controladoras.editar") && (
                                            <Button size="sm" variant="outline" onClick={() => abrirModal(c)}>Editar</Button>
                                        )}
                                        {temPermissao("controladoras.editar") && (
                                            <Button size="sm" variant={c.ativo ? "secondary" : "default"} onClick={(e) =>{e.stopPropagation(); handleInativar(c)}}>
                                                {c.ativo ? "Inativar" : "Ativar"}
                                            </Button>
                                        )}
                                        {temPermissao("controladoras.editar") && (
                                            <Button size="sm" variant="destructive" onClick={() => handleExcluirClique(c.idControladora)}>Excluir</Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            <AlertDialog open={controladoraParaExcluir !== null} onOpenChange={(open) => !open && setControladoraParaExcluir(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Controladora?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <span>
                                Todas as informações vinculadas a ela serão apagadas!
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmarExclusao}>
                            Sim, remover
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export default Controladoras;
