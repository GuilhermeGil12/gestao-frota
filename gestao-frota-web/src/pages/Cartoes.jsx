import { useState, useEffect } from "react";
import api from "../services/api";
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

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";

function Cartoes() {
    const [funcionarios, setFuncionarios] = useState([]);
    const [termoBusca, setTermoBusca] = useState("");
    const [isModalCartoesOpen, setIsModalCartoesOpen] = useState(false);
    const [funcionarioSelecionado, setFuncionarioSelecionado] = useState(null);
    const [novoUid, setNovoUid] = useState("");

    // 2. Estado para controlar qual cartão está sendo excluído no Shadcn
    const [idCartaoParaExcluir, setIdCartaoParaExcluir] = useState(null);

    const carregarFuncionarios = async () => {
        try {
            const res = await api.get('/funcionarios');
            setFuncionarios(res.data);
            if (funcionarioSelecionado) {
                const updated = res.data.find(f => f.id === funcionarioSelecionado.id);
                setFuncionarioSelecionado(updated);
            }
        } catch (e) { console.error(e); }
    };

    useEffect(() => { carregarFuncionarios(); }, []);

    const erroMsg = (e, fallback) => e?.response?.data?.message || fallback;

    const abrirPainelCartoes = (f) => { setFuncionarioSelecionado(f); setNovoUid(""); setIsModalCartoesOpen(true); };

    const handleVincularCartao = async () => {
        if (!novoUid.trim()) return toast.warning("Digite ou aproxime o cartão no leitor RFID!");
        if (!funcionarioSelecionado?.ativo) return toast.error("Não é possível vincular cartão a um funcionário inativo.");
        try {
            await api.post('/cartaorfid', { uid: novoUid.trim(), ativo: true, funcionario: { id: funcionarioSelecionado.id } });
            toast.success("Cartão vinculado com sucesso!");
            setNovoUid("");
            carregarFuncionarios();
        } catch (e) {
            toast.error(erroMsg(e, "Erro ao vincular cartão."));
        }
    };

    const handleAlternarStatus = async (cartao) => {
        try {
            if (cartao.ativo) await api.patch(`/cartaorfid/${cartao.id}/inativar`);
            else await api.patch(`/cartaorfid/${cartao.id}/ativar`);
            toast.success(cartao.ativo ? "Cartão inativado!" : "Cartão reativado!");
            carregarFuncionarios();
        } catch (e) {
            toast.error(erroMsg(e, "Erro ao mudar status do cartão."));
        }
    };

    const confirmarExclusao = async () => {
        if (!idCartaoParaExcluir) return;
        try {
            await api.delete(`/cartaorfid/${idCartaoParaExcluir}`);
            toast.success("Cartão removido!");
            carregarFuncionarios();
        } catch (e) {
            toast.error(erroMsg(e, "Erro ao remover o cartão."));
        } finally {
            setIdCartaoParaExcluir(null);
        }
    };

    const buscaMinuscula = termoBusca.toLocaleLowerCase();
    const funcionariosFiltrados = funcionarios.filter((f) => {
        const nome = f.nome ? f.nome.toLocaleLowerCase() : "";
        const cpf = f.cpf ? f.cpf.toLocaleLowerCase() : "";
        const temCartaoBuscado = f.cartoes && f.cartoes.some(cartao => cartao.uid && cartao.uid.toLocaleLowerCase().includes(buscaMinuscula));
        return nome.includes(buscaMinuscula) || cpf.includes(buscaMinuscula) || temCartaoBuscado;
    });

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-6 border-b border-border pb-4 gap-4">
                <h1 className="text-xl font-semibold text-foreground">Vinculo de Cartoes RFID</h1>
                <Input type="text" placeholder="Buscar por Nome, CPF ou Codigo do Cracha..." value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)} className="max-w-sm" />
            </div>

            <Dialog open={isModalCartoesOpen} onOpenChange={setIsModalCartoesOpen}>
                <DialogContent className="max-w-[850px]">
                    <DialogHeader>
                        <DialogTitle>Cartoes de: <span className="text-blue-400">{funcionarioSelecionado?.nome}</span></DialogTitle>
                        <DialogDescription>Gerencie os cartoes RFID vinculados a este funcionario.</DialogDescription>
                    </DialogHeader>
                    {funcionarioSelecionado && (
                        <div className="flex gap-6 mt-4">
                            {/* Lado esquerdo: lista de cartoes */}
                            <div className="flex-[2]">
                                <h3 className="text-sm text-muted-foreground border-b border-border pb-2 mb-3">Cartoes Vinculados</h3>
                                {(!funcionarioSelecionado.cartoes || funcionarioSelecionado.cartoes.length === 0) ? (
                                    <div className="bg-muted/50 p-4 rounded-lg text-center text-muted-foreground text-sm">Nenhum cartao vinculado no momento.</div>
                                ) : (
                                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                        {funcionarioSelecionado.cartoes.map(cartao => (
                                            <div key={cartao.id} className={`flex justify-between items-center bg-card p-3 rounded-md border-l-4 ${cartao.ativo ? 'border-l-green-500' : 'border-l-red-500'}`}>
                                                <div>
                                                    <strong className="block text-foreground text-base tracking-wider">{cartao.uid}</strong>
                                                    <Badge variant={cartao.ativo ? "default" : "destructive"} className={`text-xs mt-1 ${cartao.ativo ? 'bg-green-600' : ''}`}>{cartao.ativo ? "ATIVO" : "INATIVO"}</Badge>
                                                </div>
                                                <div className="flex gap-2">
                                                    {/* CORREÇÃO DO EVENTO AQUI (Passando o 'e' corretamente) */}
                                                    <Button size="sm" variant={cartao.ativo ? "secondary" : "default"} onClick={(e) => { e.stopPropagation(); handleAlternarStatus(cartao); }}>
                                                        {cartao.ativo ? "Inativar" : "Ativar"}
                                                    </Button>
                                                    
                                                    {/* BOTÃO DE EXCLUIR APENAS ABRE O MODAL DO SHADCN */}
                                                    <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); setIdCartaoParaExcluir(cartao.id); }}>
                                                        Excluir
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Lado direito: novo cartao */}
                            <div className="flex-1 bg-card p-5 rounded-lg border border-border h-fit">
                                {funcionarioSelecionado?.ativo === false ? (
                                    <div className="text-center space-y-2">
                                        <p className="text-sm font-semibold text-red-400">Funcionário Inativo</p>
                                        <p className="text-xs text-muted-foreground">Reative o funcionário antes de vincular novos cartões.</p>
                                    </div>
                                ) : (
                                    <>
                                        <h3 className="text-sm font-semibold text-blue-400 mb-3">+ Novo Cartão</h3>
                                        <div className="space-y-3">
                                            <div className="space-y-2">
                                                <Label>Código RFID (Passe o crachá)</Label>
                                                <Input type="text" placeholder="Ex: A1B2C3D4" value={novoUid} onChange={(e) => setNovoUid(e.target.value.toUpperCase())} />
                                            </div>
                                            <Button className="w-full" onClick={handleVincularCartao}>Vincular</Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Table>
                <TableHeader><TableRow>
                    <TableHead className="w-[30%]">Nome do Funcionario</TableHead><TableHead className="w-[20%]">Cargo</TableHead>
                    <TableHead className="w-[20%]">Setor</TableHead><TableHead className="w-[30%] text-center">Açao</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                    {(!Array.isArray(funcionariosFiltrados) || funcionariosFiltrados.length === 0) ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum funcionario encontrado.</TableCell></TableRow>
                    ) : (
                        funcionariosFiltrados.map(f => (
                            <TableRow key={f.id}>
                                <TableCell className="font-semibold">{f.nome}</TableCell>
                                <TableCell>{f.cargo}</TableCell>
                                <TableCell className="uppercase">{f.setor?.nome}</TableCell>
                                <TableCell className="text-center"><Button size="sm" onClick={() => abrirPainelCartoes(f)}>Gerenciar Cartoes</Button></TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            {/* 4. MODAL DE CONFIRMAÇÃO DO SHADCN UI (Substituindo o SweetAlert) */}
            <AlertDialog open={idCartaoParaExcluir !== null} onOpenChange={(open) => !open && setIdCartaoParaExcluir(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remover Cartao?</AlertDialogTitle>
                            <AlertDialogDescription asChild>
                                <span>
                                O funcionario perderá o acesso deste cartao permanentemente.
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

export default Cartoes;