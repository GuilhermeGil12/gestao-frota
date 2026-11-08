import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Search, ShieldCheck, Loader2 } from "lucide-react";
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

// Papel inicial de cada setor: as permissões com que um usuário NOVO começa.
// Depois de criado, o usuário é ajustado individualmente em Configurações → Usuários.
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

    const handleSalvar = async () => {
        setSalvando(true);
        try {
            await api.put(`/setores/${setorEditando.id}/permissoes`, selecionadas);
            toast.success(`Papel inicial do setor ${setorEditando.nome} salvo!`);
            setSetorEditando(null);
            carregarSetores();
        } catch (e) {
            toast.error(erroMsg(e, "Erro ao salvar o papel inicial."));
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
                <h1 className="text-xl font-semibold text-foreground">Papel inicial por setor</h1>
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="w-64 pl-8" placeholder="Buscar setor..." value={busca} onChange={(e) => setBusca(e.target.value)} />
                </div>
            </div>

            <Card>
                <CardContent className="pt-6 text-sm text-muted-foreground space-y-1">
                    <p>
                        O papel inicial é o conjunto de permissões com que um <strong className="text-foreground">usuário novo</strong> começa.
                        Ao cadastrar um usuário para um funcionário deste setor, essas permissões já vêm marcadas.
                    </p>
                    <p>
                        Mudar o papel inicial não altera os usuários que já existem. Para ajustar um usuário,
                        use <Link to="/configuracoes/usuario" className="text-foreground underline underline-offset-4">Configurações → Usuários</Link>.
                    </p>
                </CardContent>
            </Card>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Setor</TableHead>
                        <TableHead>Funcionários</TableHead>
                        <TableHead>Papel inicial</TableHead>
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
                            <TableCell className="tabular-nums">{s.quantidadeFuncionarios}</TableCell>
                            <TableCell>
                                {s.permissoes?.length ? (
                                    <Badge variant="secondary">{s.permissoes.length} de {totalPermissoes} permissões</Badge>
                                ) : (
                                    <Badge variant="outline">Não definido</Badge>
                                )}
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="outline" size="sm" onClick={() => abrirEdicao(s)}>
                                    <ShieldCheck className="h-3.5 w-3.5 mr-1" />Definir papel
                                </Button>
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
                        <DialogTitle>Papel inicial do setor {setorEditando?.nome}</DialogTitle>
                        <DialogDescription>
                            {selecionadas.length} de {totalPermissoes} permissões marcadas. Vale para os próximos usuários criados.
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
