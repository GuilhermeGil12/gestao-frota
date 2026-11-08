import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { Search, ShieldCheck, Users, Loader2 } from "lucide-react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PainelPermissoes from "@/components/PainelPermissoes";
import Paginacao from "../../components/Paginacao";
import { usePaginacao } from "../../utils/usePaginacao";

function erroMsg(e, padrao) {
    return e?.response?.data?.message || padrao;
}

// Cores do tema atual (claro/escuro) para o sweetalert2, que não enxerga o Tailwind.
function corDoTema(variavel) {
    return getComputedStyle(document.documentElement).getPropertyValue(variavel).trim();
}

function Permissoes() {
    const [setores, setSetores] = useState([]);
    const [catalogo, setCatalogo] = useState([]);
    const [busca, setBusca] = useState("");
    const [setorEditando, setSetorEditando] = useState(null);
    const [selecionadas, setSelecionadas] = useState([]);
    const [salvando, setSalvando] = useState(false);

    const totalPermissoes = useMemo(
        () => catalogo.reduce((s, grupo) => s + grupo.acoes.length, 0),
        [catalogo]
    );

    const carregarSetores = async () => {
        try {
            const res = await api.get("/setores");
            setSetores(Array.isArray(res.data) ? res.data : []);
        } catch {
            toast.error("Erro ao carregar setores.");
        }
    };

    useEffect(() => {
        carregarSetores();
        api.get("/permissoes/catalogo")
            .then((res) => setCatalogo(Array.isArray(res.data) ? res.data : []))
            .catch(() => toast.error("Erro ao carregar a lista de permissões."));
    }, []);

    const abrirEdicao = (setor) => {
        setSetorEditando(setor);
        setSelecionadas(setor.permissoes ?? []);
    };

    // Pergunta se aplica agora aos usuários do setor (troca as permissões deles e pede novo login).
    const perguntarAplicar = async (setor) => {
        if (setor.quantidadeUsuarios === 0) return;
        const resposta = await Swal.fire({
            title: "Aplicar aos usuários?",
            text: `Os ${setor.quantidadeUsuarios} usuário(s) do setor ${setor.nome} vão receber exatamente estas permissões. `
                + "Quem tiver permissões diferentes precisará entrar no sistema de novo.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Aplicar",
            cancelButtonText: "Agora não",
            background: corDoTema("--card"),
            color: corDoTema("--foreground"),
            confirmButtonColor: corDoTema("--destructive"),
            cancelButtonColor: corDoTema("--muted-foreground"),
        });
        if (!resposta.isConfirmed) return;
        try {
            const res = await api.post(`/setores/${setor.id}/permissoes/aplicar`);
            const alterados = res.data?.usuariosAlterados ?? 0;
            toast.success(alterados === 0
                ? "Os usuários já tinham essas permissões."
                : `Permissões aplicadas a ${alterados} usuário(s).`);
        } catch (e) {
            toast.error(erroMsg(e, "Erro ao aplicar as permissões."));
        }
    };

    const handleSalvar = async () => {
        setSalvando(true);
        try {
            const res = await api.put(`/setores/${setorEditando.id}/permissoes`, selecionadas);
            toast.success(`Permissões do setor ${setorEditando.nome} salvas!`);
            setSetorEditando(null);
            await carregarSetores();
            await perguntarAplicar(res.data);
        } catch (e) {
            toast.error(erroMsg(e, "Erro ao salvar as permissões."));
        } finally {
            setSalvando(false);
        }
    };

    const filtrados = useMemo(() => {
        const termo = busca.trim().toLowerCase();
        return termo ? setores.filter((s) => s.nome.toLowerCase().includes(termo)) : setores;
    }, [setores, busca]);

    const paginacao = usePaginacao(filtrados, 20);

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4 gap-4">
                <h1 className="text-xl font-semibold text-foreground">Permissões por setor</h1>
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="w-64 pl-8" placeholder="Buscar setor..." value={busca} onChange={(e) => setBusca(e.target.value)} />
                </div>
            </div>

            <Card>
                <CardContent className="pt-6 text-sm text-muted-foreground space-y-1">
                    <p>
                        Cada setor tem um conjunto de permissões padrão. Um usuário novo, de funcionário desse setor,
                        já começa com elas, e você pode aplicá-las de uma vez a todos os usuários do setor.
                    </p>
                    <p>
                        Para ajustar um usuário específico, use <Link to="/configuracoes/usuario" className="text-foreground underline underline-offset-4">Configurações → Usuários</Link>.
                    </p>
                </CardContent>
            </Card>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Setor</TableHead>
                        <TableHead>Usuários</TableHead>
                        <TableHead>Permissões</TableHead>
                        <TableHead className="w-[1%] text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filtrados.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                {busca ? "Nenhum setor encontrado para a busca." : "Nenhum setor cadastrado."}
                            </TableCell>
                        </TableRow>
                    ) : paginacao.visiveis.map((s) => (
                        <TableRow key={s.id}>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">{s.nome}</span>
                                    {!s.ativo && <Badge variant="outline">Inativo</Badge>}
                                </div>
                            </TableCell>
                            <TableCell className="tabular-nums">{s.quantidadeUsuarios}</TableCell>
                            <TableCell>
                                <Badge variant={s.permissoes?.length ? "secondary" : "outline"}>
                                    {s.permissoes?.length ?? 0} de {totalPermissoes}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Button variant="outline" size="sm" onClick={() => abrirEdicao(s)}>
                                        <ShieldCheck className="h-3.5 w-3.5 mr-1" />Editar
                                    </Button>
                                    <Button variant="outline" size="sm" disabled={s.quantidadeUsuarios === 0} onClick={() => perguntarAplicar(s)}>
                                        <Users className="h-3.5 w-3.5 mr-1" />Aplicar aos usuários
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
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

            <Dialog open={!!setorEditando} onOpenChange={(aberto) => !aberto && setSetorEditando(null)}>
                <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Permissões do setor {setorEditando?.nome}</DialogTitle>
                        <DialogDescription>
                            {selecionadas.length} de {totalPermissoes} permissões marcadas.
                        </DialogDescription>
                    </DialogHeader>
                    <PainelPermissoes catalogo={catalogo} selecionadas={selecionadas} onChange={setSelecionadas} />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSetorEditando(null)}>Cancelar</Button>
                        <Button onClick={handleSalvar} disabled={salvando}>
                            {salvando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default Permissoes;
