import { useState, useEffect } from "react";
import api from "../services/api";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import { maskPlaca } from '../utils/mascaras';
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../components/ui/dialog";

function Veiculos() {
    const [veiculos, setVeiculos] = useState([]);
    const [controladorasLivres, setControladorasLivres] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [termoBusca, setTermoBusca] = useState("");

    const initialState = { id: null, nome: "", placa: "", renavam: "", kmAtual: "", velocidadeMaxima: "", ativo: true, controladoraId: "" };
    const [formData, setFormData] = useState(initialState);

    const carregarDados = async () => {
        try {
            const resVeiculos = await api.get('/veiculos');
            setVeiculos(Array.isArray(resVeiculos.data) ? resVeiculos.data : []);
            const resControladoras = await api.get('/controladora');
            setControladorasLivres(Array.isArray(resControladoras.data) ? resControladoras.data : []);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { carregarDados(); }, []);

    const handleSalvar = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData };
            payload.controladora = payload.controladoraId ? { idControladora: payload.controladoraId } : null;
            if (formData.id) await api.put(`/veiculos/${formData.id}`, payload);
            else await api.post('/veiculos', payload);
            setIsModalOpen(false);
            carregarDados();
            toast.success("Veiculo salvo com sucesso!");
        } catch (e) { toast.error("Ops! Nao foi possivel salvar este veiculo"); }
    };

    const handleInativar = async (veiculo) => {
        const confirmacao = await Swal.fire({ title: 'Tem certeza?', text: "Deseja alterar o status deste veiculo?", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', confirmButtonText: 'Sim!', cancelButtonText: 'Cancelar', background: '#1e1e1e', color: '#ffffff' });
        if (confirmacao.isConfirmed) {
            try { await api.put(`/veiculos/${veiculo.id}`, { ...veiculo, ativo: !veiculo.ativo }); carregarDados(); toast.success("Status alterado com sucesso!"); }
            catch (e) { toast.error("Ops! Nao foi possivel alterar este veiculo."); }
        }
    };

    const handleExcluir = async (id) => {
        const confirmacao = await Swal.fire({ title: 'Tem certeza?', text: "Deseja EXCLUIR permanentemente este veiculo?", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', confirmButtonText: 'Sim, excluir!', cancelButtonText: 'Cancelar', background: '#1e1e1e', color: '#ffffff' });
        if (confirmacao.isConfirmed) {
            try { await api.delete(`/veiculos/${id}`); carregarDados(); toast.success("Veiculo excluido com sucesso"); }
            catch (e) { toast.error("Ops! Nao foi possivel excluir este veiculo."); }
        }
    };

    const abrirModal = (v = null) => {
        if (v) setFormData({ ...v, controladoraId: v.controladora ? v.controladora.idControladora : "" });
        else setFormData(initialState);
        setIsModalOpen(true);
    };

    const buscaMinuscula = termoBusca.toLocaleLowerCase();
    const veiculosFiltrados = veiculos.filter((v) => {
        const placa = v.placa ? v.placa.toLowerCase() : "";
        const nome = v.nome ? v.nome.toLowerCase() : "";
        return placa.includes(buscaMinuscula) || nome.includes(buscaMinuscula);
    });

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-6 border-b border-border pb-4 gap-4">
                <h1 className="text-xl font-semibold text-foreground">Gestao de Veiculos</h1>
                <Input type="text" placeholder="Pesquisar por Nome ou Placa..." value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)} className="max-w-xs" />
                <Button onClick={() => abrirModal()}>+ Novo Veiculo</Button>
            </div>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-[700px]">
                    <DialogHeader><DialogTitle>{formData.id ? "Editar Veiculo" : "Cadastrar Veiculo"}</DialogTitle><DialogDescription>Preencha os dados do veiculo.</DialogDescription></DialogHeader>
                    <form onSubmit={handleSalvar} className="space-y-4">
                        <div className="space-y-2"><Label>Nome do Veiculo</Label><Input value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} required /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Placa</Label><Input value={formData.placa} onChange={e => setFormData({ ...formData, placa: maskPlaca(e.target.value) })} required /></div>
                            <div className="space-y-2"><Label>Renavam</Label><Input value={formData.renavam} onChange={e => setFormData({ ...formData, renavam: e.target.value })} required /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Vel. Maxima (km/h)</Label><Input type="number" value={formData.velocidadeMaxima} onChange={e => setFormData({ ...formData, velocidadeMaxima: e.target.value })} /></div>
                            <div className="space-y-2">
                                <Label>Vincular Controladora</Label>
                                <select value={formData.controladoraId} onChange={e => setFormData({ ...formData, controladoraId: e.target.value })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                                    <option value="">Nenhuma / Sem Rastreador</option>
                                    {Array.isArray(controladorasLivres) && controladorasLivres.map(c => (<option key={c.idControladora} value={c.idControladora}>ID: {c.idControladora} - IP: {c.ipControladora}</option>))}
                                </select>
                            </div>
                        </div>
                        <DialogFooter className="border-t border-border pt-4"><Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button><Button type="submit">Confirmar</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Table>
                <TableHeader><TableRow>
                    <TableHead className="w-[10%]">Status</TableHead><TableHead className="w-[20%]">Nome</TableHead><TableHead className="w-[15%]">Placa</TableHead>
                    <TableHead className="w-[15%]">Renavam</TableHead><TableHead className="w-[20%]">Controladora</TableHead><TableHead className="w-[20%] text-center">Acoes</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                    {(!Array.isArray(veiculosFiltrados) || veiculosFiltrados.length === 0) ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{termoBusca ? "Nenhum veiculo encontrado com esta pesquisa." : "Nenhum veiculo encontrado no banco."}</TableCell></TableRow>
                    ) : (
                        veiculosFiltrados.map(v => (
                            <TableRow key={v.id}>
                                <TableCell><Badge variant={v.ativo ? "default" : "secondary"} className={v.ativo ? "bg-green-600" : ""}>{v.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
                                <TableCell>{v.nome}</TableCell>
                                <TableCell className="uppercase">{v.placa}</TableCell>
                                <TableCell>{v.renavam}</TableCell>
                                <TableCell>{v.controladora ? `IP: ${v.controladora.ipControladora}` : "Desvinculado"}</TableCell>
                                <TableCell>
                                    <div className="flex gap-2 justify-center">
                                        <Button size="sm" variant="outline" onClick={() => abrirModal(v)}>Editar</Button>
                                        <Button size="sm" variant={v.ativo ? "secondary" : "default"} onClick={() => handleInativar(v)}>{v.ativo ? "Inativar" : "Ativar"}</Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleExcluir(v.id)}>Excluir</Button>
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

export default Veiculos;
