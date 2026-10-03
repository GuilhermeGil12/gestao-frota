import { useState, useEffect } from "react";
import api from "../services/api";
import { toast } from 'sonner';
import { MapPin } from "lucide-react";
import MapaPicker from "../components/MapaPicker";


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

import { maskCPF, maskRG } from '../utils/mascaras';
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../components/ui/dialog";
import Setores from "./configuracoes/Setores";

function Funcionarios() {
    const [funcionarios, setFuncionarios] = useState([]);
    const [termoBusca, setTermoBusca] = useState("");
    const [mapaAberto, setMapaAberto] = useState(false);
    const [pinPos, setPinPos] = useState(null); // { lat, lng }
    const [setor, setSetores] = useState([]);

    // 1. NOVO ESTADO: Controla o filtro de status (todos, ativos, inativos)
    const [filtroStatus, setFiltroStatus] = useState("ativos");

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [funcionarioSelecionado, setFuncionarioSelecionado] = useState(null);
    const [funcionarioParaExcluir, setFuncionarioParaExcluir] = useState(null);
    const [buscandoLocal, setBuscandoLocal] = useState(false);

    const initialState = {
        id: null, nome: "", cpf: "", rg: "", numeroTelefone: "", email: "",
        matricula: "", cargo: "", setor: "", nivelMotorista: "",
        numCNH: "", categoriaCNH: "", validadeCNH: "", ativo: true,
        endereco: "", numero: "", bairro: "", cidade: "", cep: ""
    };

    const [formData, setFormData] = useState(initialState);

    const carregar = async () => {
        try {
            const res = await api.get('/funcionarios');
            setFuncionarios(res.data);
        } catch (e) { 
            toast.error("Erro ao carregar os funcionários!")
            console.error(e); }
    };

    const carregarSetores = async () =>{

        try{
        const res = await api.get('/setores');
        setSetores(res.data);

        }
        catch(e){
            console.log("Erro ao carregar setores " + e)
        }
    }

    useEffect(() => { carregar(); }, []);
    useEffect(() => { carregarSetores(); }, []);

    const erroMsg = (e, fallback) => e?.response?.data?.message || fallback;

    const maskCEP = (v) => v.replace(/\D/g, "").replace(/^(\d{5})(\d)/, "$1-$2").slice(0, 9);

    const handleCepChange = async (valor) => {
        const cepFormatado = maskCEP(valor);
        setFormData(prev => ({ ...prev, cep: cepFormatado }));

        const apenasNumeros = cepFormatado.replace(/\D/g, "");
        if (apenasNumeros.length === 8) {
            try {
                const res = await fetch(`https://viacep.com.br/ws/${apenasNumeros}/json/`);
                const dados = await res.json();
                if (!dados.erro) {
                    setFormData(prev => ({
                        ...prev,
                        cep: cepFormatado,
                        endereco: dados.logradouro || "",
                        bairro: dados.bairro || "",
                        cidade: dados.localidade || "",
                    }));
                } else {
                    setFormData(prev => ({ ...prev, endereco: "", bairro: "", cidade: "" }));
                    toast.error("CEP não encontrado.");
                }
            } catch {
                setFormData(prev => ({ ...prev, endereco: "", bairro: "", cidade: "" }));
                toast.error("Não foi possível buscar o CEP.");
            }
        }
    };

    const handleSalvar = async (e) => {
        e.preventDefault();
        if (!formData.nome.trim()) return toast.error("Nome é obrigatório.");
        if (!formData.cpf.trim()) return toast.error("CPF é obrigatório.");
        if (!formData.rg.trim()) return toast.error("RG é obrigatório.");
        if (!formData.numeroTelefone.trim()) return toast.error("Telefone é obrigatório.");
        if (!formData.email.trim()) return toast.error("E-mail é obrigatório.");
        if (!formData.matricula.trim()) return toast.error("Matrícula é obrigatório.");
        if (!formData.cargo.trim()) return toast.error("Cargo é obrigatório.");
        if (!formData.setor) return toast.error("Setor é obrigatório.");


        if (formData.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email)) {
                return toast.error("Endereço de e-mail inválido.");
            }
        }
        try {
            if (formData.id) await api.put(`/funcionarios/${formData.id}`, formData);
            else await api.post('/funcionarios', formData);
            setIsModalOpen(false);
            carregar();
            toast.success("Funcionário salvo com sucesso!");
        } catch (e) { toast.error(erroMsg(e, "Não foi possível salvar o funcionário.")); }
    };

    const confirmarExclusao = async () => {
        if (!funcionarioParaExcluir) return;
        try {
            await api.delete(`/funcionarios/${funcionarioParaExcluir.id}`);
            carregar();
            toast.success("Funcionário inativado com sucesso!");
        } catch (e) { toast.error(erroMsg(e, "Não foi possível inativar o funcionário.")); }
        finally { setFuncionarioParaExcluir(null); }
    };

    const abrirModal = (f = null) => { setFormData(f || initialState); setIsModalOpen(true); };
    const abrirModalVisualizacao = (f) => { setFuncionarioSelecionado(f); setIsViewModalOpen(true); };

    // 2. FILTRAGEM DUPLA: Filtra por texto E por status de ativação
    const funcionariosFiltrados = funcionarios.filter((f) => {
        const buscaMinuscula = termoBusca.toLocaleLowerCase();
        const nome = f.nome ? f.nome.toLocaleLowerCase() : "";
        const cpf = f.cpf ? f.cpf.toLocaleLowerCase() : "";

        // Regra do filtro de texto
        const bateTexto = nome.includes(buscaMinuscula) || cpf.includes(buscaMinuscula);

        // Regra do filtro de status (Combobox)
        if (filtroStatus === "ativos") return bateTexto && f.ativo === true;
        if (filtroStatus === "inativos") return bateTexto && f.ativo === false;
        return bateTexto; // "todos"
    });

    const buscarCoordenadas = async () => {
        if (!formData.cidade) return toast.error("Preencha pelo menos a cidade.");

        setBuscandoLocal(true);
        const toastId = toast.loading("Buscando localização...");

        const tentativas = [
            `${formData.endereco}, ${formData.numero}, ${formData.bairro}, ${formData.cidade}, SP, Brasil`,
            `${formData.endereco}, ${formData.cidade}, SP, Brasil`,
            `${formData.cidade}, SP, Brasil`,
        ];

        try {
            for (const query of tentativas) {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
                    { headers: { "Accept-Language": "pt-BR" } }
                );
                const dados = await res.json();

                if (dados.length > 0) {
                    setPinPos({ lat: parseFloat(dados[0].lat), lng: parseFloat(dados[0].lon) });
                    setMapaAberto(true);
                    toast.success("Localização encontrada!", { id: toastId });
                    return;
                }
            }
            toast.error("Endereço não encontrado no mapa.", { id: toastId });
        } catch {
            toast.error("Não foi possível buscar o endereço.", { id: toastId });
        } finally {
            setBuscandoLocal(false);
        }
    };
    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-6 border-b border-border pb-4 gap-4">
                <h1 className="text-xl font-semibold text-foreground">Gestão de Funcionários</h1>

                <div className="flex items-center gap-3 flex-1 max-w-xl">
                    {/* Barra de Pesquisa */}
                    <Input type="text" placeholder="Pesquisar por Nome ou CPF..." value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)} className="w-full" />

                    {/* 3. NOVO COMPONENTE: Filtro de exibição por status */}
                    <select
                        value={filtroStatus}
                        onChange={(e) => setFiltroStatus(e.target.value)}
                        className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border-border text-foreground"
                    >
                        <option value="ativos" className="bg-background text-foreground">Apenas Ativos</option>
                        <option value="inativos" className="bg-background text-foreground">Apenas Inativos</option>
                        <option value="todos" className="bg-background text-foreground">Mostrar Todos</option>
                    </select>
                </div>

                <Button onClick={() => abrirModal()}>+ Novo Funcionário</Button>
            </div>

            {/* Modal de Cadastro/Edicao */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-[850px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{formData.id ? "Editar Funcionário" : "Cadastrar Funcionário"}</DialogTitle>
                        <DialogDescription>Preencha os dados do funcionário abaixo.</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSalvar} className="space-y-6" noValidate>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b border-border pb-2">Dados Pessoais</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2 space-y-2"><Label>Nome Completo</Label><Input value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} required /></div>
                            <div className="space-y-2"><Label>CPF</Label><Input value={formData.cpf} onChange={e => setFormData({ ...formData, cpf: maskCPF(e.target.value) })} placeholder="000.000.000-00" required /></div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2"><Label>RG</Label><Input value={formData.rg} onChange={e => setFormData({ ...formData, rg: maskRG(e.target.value) })} required /></div>
                            <div className="space-y-2"><Label>Telefone</Label><Input value={formData.numeroTelefone} onChange={e => setFormData({ ...formData, numeroTelefone: e.target.value })} placeholder="(17) 99999-9999" /></div>
                            <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="funcionario@empresa.com" /></div>
                            <div className="space-y-2"><Label>Rua/Logradouro</Label><Input type="" value={formData.endereco} onChange={e => setFormData({ ...formData, endereco: e.target.value })} placeholder="Rua Amazonas" /></div>
                            <div className="space-y-2"><Label>Número</Label><Input type="text" value={formData.numero} onChange={e => setFormData({ ...formData, numero: e.target.value })} placeholder="123" /></div>
                            <div className="space-y-2"><Label>Bairro</Label><Input type="text" value={formData.bairro} onChange={e => setFormData({ ...formData, bairro: e.target.value })} placeholder="Centro" /></div>
                            <div className="space-y-2"><Label>Cidade</Label><Input type="text" value={formData.cidade} onChange={e => setFormData({ ...formData, cidade: e.target.value })} placeholder="São Paulo" /></div>
                            <div className="space-y-2"><Label>CEP</Label><Input type="text" value={formData.cep} onChange={e => handleCepChange(e.target.value)} placeholder="00000-000" maxLength={9} /></div>
                            <div className="col-span-3 flex justify-end">
                                <Button type="button" variant="outline" onClick={buscarCoordenadas} disabled={buscandoLocal}>
                                    {buscandoLocal ? (
                                        <>
                                            <span className="h-4 w-4 mr-2 animate-spin border-2 border-current border-t-transparent rounded-full inline-block" />
                                            Buscando...
                                        </>
                                    ) : (
                                        <>
                                            <MapPin className="h-4 w-4 mr-2" />
                                            Localizar no Mapa
                                        </>
                                    )}
                                </Button>
                            </div>

                            {mapaAberto && pinPos && (
                                <div className="col-span-3 space-y-3">
                                    <p className="text-sm text-muted-foreground">
                                        Clique no mapa ou arraste o pin para ajustar a localização.
                                    </p>
                                    <MapaPicker
                                        posicao={pinPos}
                                        onMover={(novaPos) => setPinPos(novaPos)}
                                    />
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            setFormData(prev => ({ ...prev, latitude: pinPos.lat, longitude: pinPos.lng }));
                                            setMapaAberto(false);
                                            toast.success("Localização confirmada!");
                                        }}
                                    >
                                        Confirmar Localização
                                    </Button>
                                </div>
                            )}

                        </div>

                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b border-border pb-2">Dados Corporativos</h3>
                        <div className="grid grid-cols-4 gap-4">
                            <div className="space-y-2"><Label>Matrícula</Label><Input value={formData.matricula} onChange={e => setFormData({ ...formData, matricula: e.target.value })} placeholder="Ex: 107858" required /></div>
                            <div className="space-y-2"><Label>Cargo</Label><Input value={formData.cargo} onChange={e => setFormData({ ...formData, cargo: e.target.value })} required /></div>
                            <div className="space-y-2">
                                <Label>Setor</Label>
                                
                                <select value={formData.setor?.id} onChange={e => setFormData({ ...formData, setor: {id: Number(e.target.value)} })} required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                                    {setor.map (s => (

                                        <option value={s.id}>{s.nome}</option>

                                    ))}
                                   
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>Nível Motorista</Label>
                                <select value={formData.nivelMotorista} onChange={e => setFormData({ ...formData, nivelMotorista: e.target.value })} required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                                    <option value="">Selecione...</option>
                                    <option value="0">Não possui</option>
                                    <option value="1">1 (Básico)</option>
                                    <option value="2">2 (Intermediário)</option>
                                    <option value="3">3 (Avançado)</option>
                                </select>
                            </div>
                        </div>

                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b border-border pb-2">Dados de Direção</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2"><Label>Número CNH</Label><Input value={formData.numCNH} onChange={e => setFormData({ ...formData, numCNH: e.target.value })} disabled={formData.nivelMotorista === "0"} required /></div>
                            <div className="space-y-2">
                                <Label>Categoria CNH</Label>
                                <select value={formData.categoriaCNH} onChange={e => setFormData({ ...formData, categoriaCNH: e.target.value })} disabled={formData.nivelMotorista === "0"} required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                                    <option value="">Selecione...</option>
                                    <option value="A">A</option><option value="B">B</option><option value="AB">AB</option>
                                    <option value="C">C</option><option value="D">D</option><option value="naopossui">Não possui</option>
                                </select>
                            </div>
                            <div className="space-y-2"><Label>Validade CNH</Label><Input type="date" value={formData.validadeCNH} onChange={e => setFormData({ ...formData, validadeCNH: e.target.value })} disabled={formData.nivelMotorista === "0"} /></div>
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
                        <DialogTitle>Detalhes do Funcionário</DialogTitle>
                        <DialogDescription>Informações completas do funcionário.</DialogDescription>
                    </DialogHeader>
                    {funcionarioSelecionado && (
                        <div className="space-y-6">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b border-border pb-2">Dados Pessoais</h3>
                            <div className="grid grid-cols-4 gap-4">
                                <div className="col-span-2"><span className="block text-xs text-muted-foreground">Nome Completo</span><span>{funcionarioSelecionado.nome}</span></div>
                                <div><span className="block text-xs text-muted-foreground">CPF</span><span>{funcionarioSelecionado.cpf}</span></div>
                                <div><span className="block text-xs text-muted-foreground">RG</span><span>{funcionarioSelecionado.rg}</span></div>
                                <div><span className="block text-xs text-muted-foreground">Telefone</span><span>{funcionarioSelecionado.numeroTelefone || "Não informado"}</span></div>
                                <div className="col-span-3"><span className="block text-xs text-muted-foreground">E-mail</span><span>{funcionarioSelecionado.email || "Não informado"}</span></div>
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
                        <TableHead className="w-[10%]">ID</TableHead>
                        <TableHead className="w-[25%]">Nome</TableHead>
                        <TableHead className="w-[15%]">CPF</TableHead>
                        <TableHead className="w-[15%]">RG</TableHead>
                        <TableHead className="w-[15%]">Setor</TableHead>
                        <TableHead className="w-[10%]">Nível</TableHead>
                        <TableHead className="w-[10%]">Status</TableHead>
                        <TableHead className="w-[20%] text-center">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {(!Array.isArray(funcionariosFiltrados) || funcionariosFiltrados.length === 0) ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum funcionário encontrado.</TableCell></TableRow>
                    ) : (
                        funcionariosFiltrados.map(f => (
                            // 4. MUDANÇA VISUAL: Se f.ativo for falso, a linha ganha opacidade de 45% e um tom acinzentado
                            <TableRow key={f.id} className={!f.ativo ? "opacity-45 bg-muted/20 hover:bg-muted/30 transition-opacity" : ""}>
                                <TableCell>#{f.id}</TableCell>
                                <TableCell onClick={() => abrirModalVisualizacao(f)} className={`cursor-pointer font-semibold transition-colors ${f.ativo ? 'text-foreground hover:text-blue-400' : 'text-muted-foreground line-through'}`} title="Clique para ver detalhes">
                                    {f.nome} {!f.ativo && " (Inativo)"}
                                </TableCell>
                                <TableCell>{f.cpf}</TableCell>
                                <TableCell>{f.rg}</TableCell>
                                <TableCell className="">{f.setor?.nome}</TableCell>
                                <TableCell>Nível {f.nivelMotorista}</TableCell>
                                <TableCell>{f.ativo ? "Ativo" : "Desativado"}</TableCell>
                                <TableCell>
                                    <div className="flex gap-2 justify-center">
                                        {f.ativo ? (
                                            <>
                                                <Button size="sm" variant="outline" onClick={() => abrirModal(f)}>Editar</Button>
                                                <Button size="sm" variant="destructive" onClick={() => setFuncionarioParaExcluir(f)}>Inativar</Button>
                                            </>
                                        ) : (
                                            // Se já estiver inativo, você pode dar a opção de reativar no futuro!
                                            <Button size="sm" variant="secondary" onClick={async () => {
                                                try {
                                                    await api.put(`/funcionarios/${f.id}`, { ...f, ativo: true });
                                                    toast.success("Funcionário reativado!");
                                                    carregar();
                                                } catch (e) { toast.error("Erro ao reativar."); }
                                            }}>Reativar</Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            {/* AlertDialog do Shadcn UI */}
            <AlertDialog open={funcionarioParaExcluir !== null} onOpenChange={(open) => !open && setFuncionarioParaExcluir(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                            <span>
                                Deseja INATIVAR o funcionário <strong className="font-bold text-foreground">{funcionarioParaExcluir?.nome}.</strong>? Ele perderá seu acesso!
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmarExclusao}>
                            Sim, inativar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export default Funcionarios;