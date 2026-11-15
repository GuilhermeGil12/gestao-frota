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
import { useAuth } from "../context/AuthContext";
import Paginacao from "../components/Paginacao";
import { usePaginacao } from "../utils/usePaginacao";
import { maskUID } from "../utils/mascaras";
import { validarUID } from "../utils/validacoes";
import { useErros } from "../utils/useErros";
import { Trash2 } from "lucide-react";

function Cartoes() {
    const { temPermissao } = useAuth();
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

    const { erros, validar, limpar, resetar } = useErros();

    const abrirPainelCartoes = (f) => { setFuncionarioSelecionado(f); setNovoUid(""); resetar(); setIsModalCartoesOpen(true); };

    const handleVincularCartao = async () => {
        if (!funcionarioSelecionado?.ativo) return toast.error("Não é possível vincular cartão a um funcionário inativo.");
        if (!validar({ uid: validarUID(novoUid) })) return;
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

    const paginacao = usePaginacao(funcionariosFiltrados, 20);

    return (
        <div className="w-full">
            <div className="flex flex-wrap items-center justify-between mb-6 border-b border-border pb-4 gap-4">
                <h1 className="text-xl font-semibold text-foreground">Vínculo de Cartões RFID</h1>
                <Input type="text" placeholder="Buscar por Nome, CPF ou Código do Crachá..." value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)} className="max-w-sm" />
            </div>

            <Dialog open={isModalCartoesOpen} onOpenChange={setIsModalCartoesOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Cartões</DialogTitle>
                        <DialogDescription>
                            {funcionarioSelecionado?.nome}
                            {funcionarioSelecionado?.cargo ? ` · ${funcionarioSelecionado.cargo}` : ""}
                        </DialogDescription>
                    </DialogHeader>

                    {funcionarioSelecionado && (
                        <div className="space-y-6">
                            {/* Vincular um cartão novo */}
                            {funcionarioSelecionado.ativo === false ? (
                                <p className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                                    Funcionário inativo. Reative em Funcionários para vincular cartões.
                                </p>
                            ) : temPermissao("cartoes.vincular") && (
                                <section className="space-y-2">
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b border-border pb-2">Vincular cartão</h3>
                                    <Label htmlFor="campo-uid">Código do cartão</Label>
                                    <div className="flex gap-2">
                                        <Input id="campo-uid" type="text" placeholder="Passe o crachá no leitor ou digite" value={novoUid}
                                               className={`font-mono tracking-wider ${erros.uid ? "border-destructive" : ""}`}
                                               aria-invalid={erros.uid ? true : undefined}
                                               aria-describedby={erros.uid ? "campo-uid-erro" : "campo-uid-ajuda"}
                                               onChange={(e) => { setNovoUid(maskUID(e.target.value)); limpar("uid"); }}
                                               onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleVincularCartao(); } }}
                                               autoComplete="off" spellCheck={false} autoFocus />
                                        <Button onClick={handleVincularCartao}>Vincular</Button>
                                    </div>
                                    {erros.uid ? (
                                        <p id="campo-uid-erro" role="alert" className="text-sm text-destructive">{erros.uid}</p>
                                    ) : (
                                        <p id="campo-uid-ajuda" className="text-xs text-muted-foreground">8, 14 ou 20 caracteres, só números e letras de A a F.</p>
                                    )}
                                </section>
                            )}

                            {/* Cartões que o funcionário já tem */}
                            <section className="space-y-2">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b border-border pb-2">
                                    Vinculados{funcionarioSelecionado.cartoes?.length ? ` (${funcionarioSelecionado.cartoes.length})` : ""}
                                </h3>
                                {(!funcionarioSelecionado.cartoes || funcionarioSelecionado.cartoes.length === 0) ? (
                                    <p className="py-6 text-center text-sm text-muted-foreground">Nenhum cartão vinculado.</p>
                                ) : (
                                    <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-md border border-border">
                                        {funcionarioSelecionado.cartoes.map(cartao => (
                                            <li key={cartao.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                                                <div className="min-w-0 space-y-1">
                                                    <span className={`block font-mono text-sm tracking-wider ${cartao.ativo ? "text-foreground" : "text-muted-foreground line-through"}`}>
                                                        {cartao.uid}
                                                    </span>
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <Badge variant={cartao.ativo ? "outline" : "secondary"}>{cartao.ativo ? "Ativo" : "Inativo"}</Badge>
                                                        {cartao.bloqueadoPorCnh && (
                                                            <Badge variant="outline" className="border-destructive/40 text-destructive" title="Valide a CNH em Funcionários para liberar">
                                                                CNH pendente
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                {temPermissao("cartoes.editar") && (
                                                    <div className="flex items-center gap-1">
                                                        <Button size="sm" variant="outline" onClick={() => handleAlternarStatus(cartao)}>
                                                            {cartao.ativo ? "Inativar" : "Ativar"}
                                                        </Button>
                                                        <Button size="icon" variant="ghost" className="size-8 text-muted-foreground hover:text-destructive"
                                                                onClick={() => setIdCartaoParaExcluir(cartao.id)} aria-label={`Excluir o cartão ${cartao.uid}`} title="Excluir">
                                                            <Trash2 className="size-4" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Table>
                <TableHeader><TableRow>
                    <TableHead>Funcionário</TableHead><TableHead>Cargo</TableHead>
                    <TableHead>Setor</TableHead><TableHead>Cartões</TableHead><TableHead className="text-right">Ações</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                    {(!Array.isArray(funcionariosFiltrados) || funcionariosFiltrados.length === 0) ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum funcionário encontrado.</TableCell></TableRow>
                    ) : (
                        paginacao.visiveis.map(f => (
                            <TableRow key={f.id}>
                                <TableCell className="font-semibold">{f.nome}</TableCell>
                                <TableCell>{f.cargo}</TableCell>
                                <TableCell className="uppercase">{f.setor?.nome}</TableCell>
                                <TableCell className="tabular-nums text-muted-foreground">
                                    {f.cartoes?.length
                                        ? `${f.cartoes.filter(c => c.ativo).length} ativo${f.cartoes.filter(c => c.ativo).length === 1 ? "" : "s"} de ${f.cartoes.length}`
                                        : "Nenhum"}
                                </TableCell>
                                <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => abrirPainelCartoes(f)}>Gerenciar cartões</Button></TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
            <Paginacao
                pagina={paginacao.pagina}
                totalPaginas={paginacao.totalPaginas}
                totalItens={paginacao.totalItens}
                inicio={paginacao.inicio}
                fim={paginacao.fim}
                onChange={paginacao.setPagina}
            />

            {/* 4. MODAL DE CONFIRMAÇÃO DO SHADCN UI (Substituindo o SweetAlert) */}
            <AlertDialog open={idCartaoParaExcluir !== null} onOpenChange={(open) => !open && setIdCartaoParaExcluir(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir este cartão?</AlertDialogTitle>
                            <AlertDialogDescription asChild>
                                <span>
                                O cartão deixa de ligar o veículo e sai da lista. Para só bloquear por um tempo, use Inativar.
                                </span>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmarExclusao}>
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export default Cartoes;