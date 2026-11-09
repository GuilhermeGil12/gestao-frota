import { useEffect, useMemo, useState } from "react";
import BotaoFlutuante from "@/components/BotaoFlutuante";
import { toast } from 'sonner';
import { Pencil, Search } from "lucide-react";
import api from "@/services/api";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import Paginacao from "../../components/Paginacao";
import { usePaginacao } from "../../utils/usePaginacao";

const FORM_VAZIO = { id: null, nome: "", descricao: "", liderId: "" };

function erroMsg(e, padrao) {
    return e?.response?.data?.message || padrao;
}

function Setores() {
    const [setores, setSetores] = useState([]);
    const [busca, setBusca] = useState("");
    const [modalAberto, setModalAberto] = useState(false);
    const [formData, setFormData] = useState(FORM_VAZIO);
    const [salvando, setSalvando] = useState(false);
    const [funcionarios, setFuncionarios] = useState([]);

    const carregarSetores = async () => {
        try {
            const res = await api.get('/setores');
            setSetores(Array.isArray(res.data) ? res.data : []);
        } catch {
            toast.error("Erro ao carregar setores.");
        }
    };

    useEffect(() => {
        carregarSetores();
        // Candidatos a líder do setor.
        api.get('/funcionarios')
            .then((res) => setFuncionarios(Array.isArray(res.data) ? res.data.filter((f) => f.ativo) : []))
            .catch(() => {});
    }, []);

    const abrirModal = (setor = null) => {
        setFormData(setor
            ? { id: setor.id, nome: setor.nome, descricao: setor.descricao ?? "", liderId: setor.liderId ? String(setor.liderId) : "" }
            : FORM_VAZIO);
        setModalAberto(true);
    };

    const handleSalvar = async (e) => {
        e.preventDefault();
        if (!formData.nome.trim()) {
            toast.error("O nome é obrigatório.");
            return;
        }
        setSalvando(true);
        try {
            const dados = {
                nome: formData.nome.trim(),
                descricao: formData.descricao.trim() || null,
                liderId: formData.liderId ? Number(formData.liderId) : null,
            };
            if (formData.id) {
                await api.put(`/setores/${formData.id}`, dados);
                toast.success("Setor atualizado!");
            } else {
                await api.post('/setores', dados);
                toast.success("Setor cadastrado!");
            }
            setModalAberto(false);
            carregarSetores();
        } catch (err) {
            toast.error(erroMsg(err, "Erro ao salvar o setor."));
        } finally {
            setSalvando(false);
        }
    };

    const alternarAtivo = async (setor) => {
        try {
            await api.patch(`/setores/${setor.id}/ativo`);
            toast.success(setor.ativo ? "Setor inativado." : "Setor ativado.");
            carregarSetores();
        } catch (err) {
            toast.error(erroMsg(err, "Erro ao mudar o status do setor."));
        }
    };

    const filtrados = useMemo(() => {
        const termo = busca.trim().toLowerCase();
        if (!termo) return setores;
        return setores.filter((s) =>
            s.nome.toLowerCase().includes(termo) || (s.descricao ?? "").toLowerCase().includes(termo));
    }, [setores, busca]);

    const paginacao = usePaginacao(filtrados, 20);

    return (
        <div className="w-full space-y-6">
            <div className="flex flex-wrap items-center justify-between border-b border-border pb-4 gap-4">
                <h1 className="text-xl font-semibold text-foreground">Setores</h1>
                <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
                    <div className="relative w-full sm:w-auto">
                        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            className="w-full sm:w-64 pl-8"
                            placeholder="Buscar setor..."
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                        />
                    </div>
                    <BotaoFlutuante rotulo="Novo setor" onClick={() => abrirModal()} />
                </div>
            </div>

            <Dialog open={modalAberto} onOpenChange={setModalAberto}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{formData.id ? "Editar setor" : "Cadastrar setor"}</DialogTitle>
                        <DialogDescription>As permissões do setor são definidas em Configurações → Permissões.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSalvar} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="setor-nome">Nome</Label>
                            <Input id="setor-nome" value={formData.nome} placeholder="Ex.: Logística"
                                   onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="setor-descricao">Descrição</Label>
                            <Textarea id="setor-descricao" value={formData.descricao} rows={3} placeholder="Opcional"
                                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="setor-lider">Líder do setor</Label>
                            <select
                                id="setor-lider"
                                value={formData.liderId}
                                onChange={(e) => setFormData({ ...formData, liderId: e.target.value })}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                <option value="">Sem líder</option>
                                {funcionarios.map((f) => (
                                    <option key={f.id} value={f.id}>{f.nome}{f.cargo ? ` — ${f.cargo}` : ""}</option>
                                ))}
                            </select>
                            <p className="text-xs text-muted-foreground">
                                Recebe o relatório semanal de quem é do setor e não tem um líder próprio.
                            </p>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
                            <Button type="submit" disabled={salvando}>{formData.id ? "Salvar" : "Cadastrar"}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Líder</TableHead>
                        <TableHead>Funcionários</TableHead>
                        <TableHead>Usuários</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[1%] text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filtrados.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                {busca ? "Nenhum setor encontrado para a busca." : "Nenhum setor cadastrado."}
                            </TableCell>
                        </TableRow>
                    ) : (
                        paginacao.visiveis.map((s) => (
                            <TableRow key={s.id}>
                                <TableCell className="font-medium">{s.nome}</TableCell>
                                <TableCell className="text-muted-foreground max-w-xs truncate">{s.descricao || "—"}</TableCell>
                                <TableCell>{s.liderNome || <span className="text-muted-foreground">—</span>}</TableCell>
                                <TableCell className="tabular-nums">{s.quantidadeFuncionarios}</TableCell>
                                <TableCell className="tabular-nums">{s.quantidadeUsuarios}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Switch checked={s.ativo} onCheckedChange={() => alternarAtivo(s)} aria-label="Ativo" />
                                        <Badge variant={s.ativo ? "default" : "outline"}>{s.ativo ? "Ativo" : "Inativo"}</Badge>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="outline" size="sm" onClick={() => abrirModal(s)}>
                                        <Pencil className="h-3.5 w-3.5 mr-1" />Editar
                                    </Button>
                                </TableCell>
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
        </div>
    );
}

export default Setores;
