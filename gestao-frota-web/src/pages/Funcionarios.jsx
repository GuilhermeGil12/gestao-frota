import { useState, useEffect } from "react";
import api from "../services/api";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import { maskCPF, maskRG } from '../utils/mascaras';
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../components/ui/dialog";

function Funcionarios() {
    const [funcionarios, setFuncionarios] = useState([]);
    const [termoBusca, setTermoBusca] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [funcionarioSelecionado, setFuncionarioSelecionado] = useState(null);

    const initialState = {
        id: null, nome: "", cpf: "", rg: "", numeroTelefone: "", email: "",
        matricula: "", cargo: "", setor: "", nivelMotorista: "",
        numCNH: "", categoriaCNH: "", validadeCNH: "", ativo: true
    };

    const [formData, setFormData] = useState(initialState);

    const carregar = async () => {
        try {
            const res = await api.get('/funcionarios');
            setFuncionarios(res.data);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { carregar(); }, []);

    const handleSalvar = async (e) => {
        e.preventDefault();
        try {
            if (formData.id) await api.put(`/funcionarios/${formData.id}`, formData);
            else await api.post('/funcionarios', formData);
            setIsModalOpen(false);
            carregar();
            toast.success("Funcionario salvo com sucesso!");
        } catch (e) { toast.error("Ops! Nao foi possivel salvar este funcionario."); }
    };

    const handleExcluir = async (id) => {
        const confirmacao = await Swal.fire({
            title: 'Tem certeza?', text: "Deseja EXCLUIR permanentemente este funcionario?",
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6', confirmButtonText: 'Sim, excluir!',
            cancelButtonText: 'Cancelar', background: '#1e1e1e', color: '#ffffff'
        });
        if (confirmacao.isConfirmed) {
            try {
                await api.delete(`/funcionarios/${id}`);
                carregar();
                toast.success("Funcionario excluido com sucesso!");
            } catch (e) { toast.error("Ops! Nao foi possivel excluir este funcionario."); }
        }
    };

    const abrirModal = (f = null) => { setFormData(f || initialState); setIsModalOpen(true); };
    const abrirModalVisualizacao = (f) => { setFuncionarioSelecionado(f); setIsViewModalOpen(true); };

    const buscaMinuscula = termoBusca.toLocaleLowerCase();
    const funcionariosFiltrados = funcionarios.filter((f) => {
        const nome = f.nome ? f.nome.toLocaleLowerCase() : "";
        const cpf = f.cpf ? f.cpf.toLocaleLowerCase() : "";
        return nome.includes(buscaMinuscula) || cpf.includes(buscaMinuscula);
    });

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-6 border-b border-border pb-4 gap-4">
                <h1 className="text-xl font-semibold text-foreground">Gestao de Funcionarios</h1>
                <Input type="text" placeholder="Pesquisar por Nome ou CPF..." value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)} className="max-w-xs" />
                <Button onClick={() => abrirModal()}>+ Novo Funcionario</Button>
            </div>

            {/* Modal de Cadastro/Edicao */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-[850px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{formData.id ? "Editar Funcionario" : "Cadastrar Funcionario"}</DialogTitle>
                        <DialogDescription>Preencha os dados do funcionario abaixo.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSalvar} className="space-y-6">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b border-border pb-2">Dados Pessoais</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2 space-y-2"><Label>Nome Completo</Label><Input value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} required /></div>
                            <div className="space-y-2"><Label>CPF</Label><Input value={formData.cpf} onChange={e => setFormData({ ...formData, cpf: maskCPF(e.target.value) })} placeholder="000.000.000-00" required /></div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2"><Label>RG</Label><Input value={formData.rg} onChange={e => setFormData({ ...formData, rg: maskRG(e.target.value) })} required /></div>
                            <div className="space-y-2"><Label>Telefone</Label><Input value={formData.numeroTelefone} onChange={e => setFormData({ ...formData, numeroTelefone: e.target.value })} placeholder="(17) 99999-9999" /></div>
                            <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="funcionario@empresa.com" /></div>
                        </div>

                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b border-border pb-2">Dados Corporativos</h3>
                        <div className="grid grid-cols-4 gap-4">
                            <div className="space-y-2"><Label>Matricula</Label><Input value={formData.matricula} onChange={e => setFormData({ ...formData, matricula: e.target.value })} placeholder="Ex: 107858" required /></div>
                            <div className="space-y-2"><Label>Cargo</Label><Input value={formData.cargo} onChange={e => setFormData({ ...formData, cargo: e.target.value })} required /></div>
                            <div className="space-y-2">
                                <Label>Setor</Label>
                                <select value={formData.setor} onChange={e => setFormData({ ...formData, setor: e.target.value })} required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                                    <option value="">Selecione...</option>
                                    <option value="dev">DEV</option>
                                    <option value="vendas">Vendas</option>
                                    <option value="estoque">Estoque</option>
                                    <option value="financeiro">Financeiro</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>Nivel Motorista</Label>
                                <select value={formData.nivelMotorista} onChange={e => setFormData({ ...formData, nivelMotorista: e.target.value })} required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                                    <option value="">Selecione...</option>
                                    <option value="1">1 (Basico)</option>
                                    <option value="2">2 (Intermediario)</option>
                                    <option value="3">3 (Avancado)</option>
                                </select>
                            </div>
                        </div>

                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b border-border pb-2">Dados de Direcao</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2"><Label>Numero CNH</Label><Input value={formData.numCNH} onChange={e => setFormData({ ...formData, numCNH: e.target.value })} required /></div>
                            <div className="space-y-2">
                                <Label>Categoria CNH</Label>
                                <select value={formData.categoriaCNH} onChange={e => setFormData({ ...formData, categoriaCNH: e.target.value })} required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                                    <option value="">Selecione...</option>
                                    <option value="A">A</option><option value="B">B</option><option value="AB">AB</option>
                                    <option value="C">C</option><option value="D">D</option><option value="naopossui">Nao possui</option>
                                </select>
                            </div>
                            <div className="space-y-2"><Label>Validade CNH</Label><Input type="date" value={formData.validadeCNH} onChange={e => setFormData({ ...formData, validadeCNH: e.target.value })} /></div>
                        </div>

                        <DialogFooter className="border-t border-border pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                            <Button type="submit">Confirmar</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal de Visualizacao */}
            <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                <DialogContent className="max-w-[1000px]">
                    <DialogHeader>
                        <DialogTitle>Detalhes do Funcionario</DialogTitle>
                        <DialogDescription>Informacoes completas do funcionario.</DialogDescription>
                    </DialogHeader>
                    {funcionarioSelecionado && (
                        <div className="space-y-6">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b border-border pb-2">Dados Pessoais</h3>
                            <div className="grid grid-cols-4 gap-4">
                                <div className="col-span-2"><span className="block text-xs text-muted-foreground">Nome Completo</span><span>{funcionarioSelecionado.nome}</span></div>
                                <div><span className="block text-xs text-muted-foreground">CPF</span><span>{funcionarioSelecionado.cpf}</span></div>
                                <div><span className="block text-xs text-muted-foreground">RG</span><span>{funcionarioSelecionado.rg}</span></div>
                                <div><span className="block text-xs text-muted-foreground">Telefone</span><span>{funcionarioSelecionado.numeroTelefone || "Nao informado"}</span></div>
                                <div className="col-span-3"><span className="block text-xs text-muted-foreground">E-mail</span><span>{funcionarioSelecionado.email || "Nao informado"}</span></div>
                            </div>
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b border-border pb-2">Dados Corporativos</h3>
                            <div className="grid grid-cols-4 gap-4">
                                <div><span className="block text-xs text-muted-foreground">Matricula</span><span>{funcionarioSelecionado.matricula}</span></div>
                                <div><span className="block text-xs text-muted-foreground">Cargo</span><span>{funcionarioSelecionado.cargo}</span></div>
                                <div><span className="block text-xs text-muted-foreground">Setor</span><span className="uppercase">{funcionarioSelecionado.setor}</span></div>
                                <div><span className="block text-xs text-muted-foreground">Nivel Motorista</span><span>{funcionarioSelecionado.nivelMotorista}</span></div>
                            </div>
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b border-border pb-2">Dados de Direcao</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div><span className="block text-xs text-muted-foreground">Numero CNH</span><span>{funcionarioSelecionado.numCNH}</span></div>
                                <div><span className="block text-xs text-muted-foreground">Categoria</span><span>{funcionarioSelecionado.categoriaCNH}</span></div>
                                <div><span className="block text-xs text-muted-foreground">Validade</span><span>{funcionarioSelecionado.validadeCNH}</span></div>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="border-t border-border pt-4">
                        <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>Fechar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Tabela */}
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[25%]">Nome</TableHead>
                        <TableHead className="w-[15%]">CPF</TableHead>
                        <TableHead className="w-[15%]">RG</TableHead>
                        <TableHead className="w-[15%]">Setor</TableHead>
                        <TableHead className="w-[10%]">Nivel</TableHead>
                        <TableHead className="w-[20%] text-center">Acoes</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {(!Array.isArray(funcionariosFiltrados) || funcionariosFiltrados.length === 0) ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{termoBusca ? "Nenhum funcionario encontrado com esta pesquisa." : "Nenhum funcionario encontrado no banco."}</TableCell></TableRow>
                    ) : (
                        funcionariosFiltrados.map(f => (
                            <TableRow key={f.id}>
                                <TableCell onClick={() => abrirModalVisualizacao(f)} className="cursor-pointer font-semibold text-foreground hover:text-blue-400 transition-colors" title="Clique para ver detalhes">{f.nome}</TableCell>
                                <TableCell>{f.cpf}</TableCell>
                                <TableCell>{f.rg}</TableCell>
                                <TableCell className="uppercase">{f.setor}</TableCell>
                                <TableCell>Nivel {f.nivelMotorista}</TableCell>
                                <TableCell>
                                    <div className="flex gap-2 justify-center">
                                        <Button size="sm" variant="outline" onClick={() => abrirModal(f)}>Editar</Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleExcluir(f.id)}>Excluir</Button>
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

export default Funcionarios;
