import { useState, useEffect } from "react";
import api from "../services/api";
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { maskIP, maskMAC } from "../utils/mascaras.js";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../components/ui/dialog";

function Controladoras() {
    const [controladoras, setControladoras] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const initialState = { idControladora: null, ipControladora: "", macControladora: "", senha: "", ativo: true };
    const [formData, setFormData] = useState(initialState);

    const carregar = async () => {
        try {
            const res = await api.get('/controladora');
            setControladoras(Array.isArray(res.data) ? res.data : []);
        } catch (e) { console.error("Erro na requisicao:", e); setControladoras([]); }
    };

    useEffect(() => { carregar(); }, []);

    const handleSalvar = async (e) => {
        e.preventDefault();
        try {
            if (formData.idControladora) await api.put(`/controladora/${formData.idControladora}`, formData);
            else await api.post('/controladora', formData);
            setIsModalOpen(false); carregar();
            toast.success("Controladora salva com sucesso!");
        } catch (e) { toast.error("Erro ao salvar. Verifique se o IP ou MAC ja existem!"); }
    };

    const handleInativar = async (controladora) => {
        const isAtivo = controladora.ativo;
        const acao = isAtivo ? "INATIVAR" : "ATIVAR";
        const confirmacao = await Swal.fire({ title: 'Tem certeza?', text: `Deseja ${acao} esta controladora?`, icon: 'warning', showCancelButton: true, confirmButtonColor: isAtivo ? '#d33' : '#28a745', cancelButtonColor: '#3085d6', confirmButtonText: `Sim, ${acao}!`, cancelButtonText: 'Cancelar', background: '#1e1e1e', color: '#ffffff' });
        if (confirmacao.isConfirmed) {
            try { await api.patch(`/controladora/${controladora.idControladora}/inativar`); carregar(); toast.success(`Controladora ${isAtivo ? 'inativada' : 'ativada'} com sucesso`); }
            catch (e) { toast.error("Ops! Nao foi possivel alterar o status desta controladora."); }
        }
    };

    const handleExcluir = async (idControladora) => {
        const confirmacao = await Swal.fire({ title: 'Tem certeza?', text: "Deseja EXCLUIR permanentemente esta controladora?", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', confirmButtonText: 'Sim, excluir!', cancelButtonText: 'Cancelar', background: '#1e1e1e', color: '#ffffff' });
        if (confirmacao.isConfirmed) {
            try { await api.delete(`/controladora/${idControladora}`); carregar(); toast.success("Controladora excluida com sucesso!"); }
            catch (e) { toast.error("Ops! Nao foi possivel excluir esta controladora."); }
        }
    };

    const abrirModal = (c = null) => { setFormData(c || initialState); setIsModalOpen(true); };

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
                <h1 className="text-xl font-semibold text-foreground">Gestao de Controladoras</h1>
                <Button onClick={() => abrirModal()}>+ Nova Controladora</Button>
            </div>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-[600px]">
                    <DialogHeader><DialogTitle>{formData.idControladora ? "Editar Controladora" : "Cadastrar Controladora"}</DialogTitle><DialogDescription>Preencha os dados da controladora GPS.</DialogDescription></DialogHeader>
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
                                        <Button size="sm" variant="outline" onClick={() => abrirModal(c)}>Editar</Button>
                                        <Button size="sm" variant={c.ativo ? "secondary" : "default"} onClick={() => handleInativar(c)}>{c.ativo ? "Inativar" : "Ativar"}</Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleExcluir(c.idControladora)}>Excluir</Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

export default Controladoras;
