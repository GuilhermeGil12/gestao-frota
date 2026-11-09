import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import { Search } from "lucide-react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import DataPicker from "@/components/DataPicker";
import AvatarUsuario from "@/components/AvatarUsuario";
import Paginacao from "../../components/Paginacao";
import { usePaginacao } from "../../utils/usePaginacao";

const TODAS = "TODAS";

const CATEGORIAS = {
    COMANDO: "Comandos",
    CARTAO: "Cartões",
    CNH: "CNH",
    FUNCIONARIO: "Funcionários",
    VEICULO: "Veículos",
    CONTROLADORA: "Controladoras",
    CERCA: "Cercas",
    USUARIO: "Usuários",
    SETOR: "Setores",
    CONFIGURACAO: "Configurações",
};

function hojeMenos(dias) {
    return format(subDays(new Date(), dias), "yyyy-MM-dd");
}

// Registro de quem fez o quê: cada linha mostra a foto de quem fez (passe o mouse para ver o nome).
function Atividades() {
    const [dataInicio, setDataInicio] = useState(hojeMenos(6));
    const [dataFim, setDataFim] = useState(hojeMenos(0));
    const [categoria, setCategoria] = useState(TODAS);
    const [busca, setBusca] = useState("");
    const [atividades, setAtividades] = useState([]);
    const [carregando, setCarregando] = useState(false);

    async function buscar(inicio, fim, cat) {
        if (!inicio || !fim || inicio > fim) {
            toast.error("Confira as datas do período.");
            return;
        }
        setCarregando(true);
        try {
            const params = { inicio: `${inicio}T00:00:00`, fim: `${fim}T23:59:59` };
            if (cat !== TODAS) params.categoria = cat;
            const res = await api.get("/atividades", { params });
            setAtividades(Array.isArray(res.data) ? res.data : []);
        } catch {
            toast.error("Erro ao carregar as atividades.");
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        buscar(hojeMenos(6), hojeMenos(0), TODAS);
    }, []);

    const filtradas = useMemo(() => {
        const termo = busca.trim().toLowerCase();
        if (!termo) return atividades;
        return atividades.filter((a) =>
            a.descricao.toLowerCase().includes(termo) || (a.usuarioNome ?? "").toLowerCase().includes(termo));
    }, [atividades, busca]);

    const paginacao = usePaginacao(filtradas, 30);

    return (
        <div className="w-full space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                <h1 className="text-xl font-semibold text-foreground">Registro de atividades</h1>
                <p className="text-sm text-muted-foreground">Quem fez o quê no sistema. Passe o mouse na foto para ver o nome.</p>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
                        <div className="space-y-2">
                            <Label htmlFor="ativ-inicio">Data inicial</Label>
                            <DataPicker id="ativ-inicio" value={dataInicio} onChange={setDataInicio} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ativ-fim">Data final</Label>
                            <DataPicker id="ativ-fim" value={dataFim} onChange={setDataFim} />
                        </div>
                        <div className="space-y-2">
                            <Label>Categoria</Label>
                            <Select value={categoria} onValueChange={setCategoria}>
                                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={TODAS}>Todas</SelectItem>
                                    {Object.entries(CATEGORIAS).map(([chave, rotulo]) => (
                                        <SelectItem key={chave} value={chave}>{rotulo}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ativ-busca">Buscar</Label>
                            <Input id="ativ-busca" placeholder="Nome, placa, cartão..." value={busca} onChange={(e) => setBusca(e.target.value)} />
                        </div>
                        <Button onClick={() => buscar(dataInicio, dataFim, categoria)} disabled={carregando}>
                            <Search className="h-4 w-4 mr-2" />{carregando ? "Buscando..." : "Filtrar"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-12">Quem</TableHead>
                        <TableHead className="w-40">Quando</TableHead>
                        <TableHead className="w-36">Categoria</TableHead>
                        <TableHead>O que fez</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filtradas.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                                {carregando ? "Carregando..." : "Nenhuma atividade no período."}
                            </TableCell>
                        </TableRow>
                    ) : paginacao.visiveis.map((a) => (
                        <TableRow key={a.id}>
                            <TableCell><AvatarUsuario id={a.usuarioId} nome={a.usuarioNome} /></TableCell>
                            <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
                                {format(new Date(a.dataHora), "dd/MM/yyyy HH:mm")}
                            </TableCell>
                            <TableCell><Badge variant="outline">{CATEGORIAS[a.categoria] ?? a.categoria}</Badge></TableCell>
                            <TableCell className="min-w-56">{a.descricao}</TableCell>
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
        </div>
    );
}

export default Atividades;
