import { useEffect, useState } from "react";
import api from '../services/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";

function Comandos() {
    const { temPermissao } = useAuth();
    const podeEnviarComando =
        temPermissao("comandos.bloquear") || temPermissao("comandos.desbloquear");
    const [comandos, setComandos] = useState([]);
    const [controladoras, setControladoras] = useState([]);
    const [dialogAberto, setDialogAberto] = useState(false);
    const [idControladoraSelecionada, setIdControladoraSelecionada] = useState("");
    const [tipoSelecionado, setTipoSelecionado] = useState("");
    const [carregando, setCarregando] = useState(false);

    // Busca a lista de comandos ao abrir a página
    useEffect(() => {
        buscarComandos();
        buscarControladoras();
    }, []);

    async function buscarComandos() {
        try {
            const resp = await api.get('/comandos');
            setComandos(Array.isArray(resp.data) ? resp.data : []);
        } catch (err) {
            toast.error("Erro ao buscar comandos: " + err.message);
        }
    }

    async function buscarControladoras() {
        try {
            const resp = await api.get('/controladora');
            setControladoras(resp.data);
        } catch (err) {
            toast.error("Erro ao buscar controladoras.");
        }
    }

    async function enviarComando() {
        if (!idControladoraSelecionada || !tipoSelecionado) {
            toast.error("Selecione o veículo e o tipo de comando.");
            return;
        }

        setCarregando(true);
        try {
            await api.post(`/comandos/${idControladoraSelecionada}`, { tipo: tipoSelecionado });

            toast.success("Comando enviado! O veículo receberá em até 10 segundos.");
            setDialogAberto(false);
            setIdControladoraSelecionada("");
            setTipoSelecionado("");
            buscarComandos(); // Atualiza a tabela
        } catch {
            toast.error("Erro ao enviar comando.");
        } finally {
            setCarregando(false);
        }
    }

    function formatarData(dataStr) {
        if (!dataStr) return "-";
        return new Date(dataStr).toLocaleString("pt-BR");
    }

    function labelVeiculo(controladora) {
        const placa = controladora.veiculo?.placa || "Sem veículo";
        return `Controladora ${controladora.idControladora} — ${placa}`;
    }

    return (
        <div className="w-full space-y-6">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between border-b border-border pb-4">
                <h1 className="text-xl font-semibold text-foreground">Comandos Remotos</h1>
                {podeEnviarComando && (
                    <Button onClick={() => setDialogAberto(true)}>Novo Comando</Button>
                )}
            </div>

            {/* Tabela de histórico */}
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[20%]">Data/Hora</TableHead>
                        <TableHead className="w-[20%]">Veículo</TableHead>
                        <TableHead className="w-[15%]">Comando</TableHead>
                        <TableHead className="w-[15%]">Status</TableHead>
                        <TableHead className="w-[20%]">Executado em</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {comandos.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                Nenhum comando enviado ainda.
                            </TableCell>
                        </TableRow>
                    ) : (
                        comandos.map((cmd) => (
                            <TableRow key={cmd.idComando}>
                                <TableCell>{formatarData(cmd.criadoEm)}</TableCell>
                                <TableCell>
                                    {cmd.controladora?.veiculo?.placa || `Controladora ${cmd.controladora?.idControladora}`}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={cmd.tipo === "BLOQUEAR" ? "destructive" : "outline"}>
                                        {cmd.tipo}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={cmd.status === "EXECUTADO" ? "default" : "secondary"}>
                                        {cmd.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>{formatarData(cmd.executadoEm)}</TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            {/* Dialog — Novo Comando */}
            <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Enviar Novo Comando</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Veículo</Label>
                            <Select onValueChange={setIdControladoraSelecionada} value={idControladoraSelecionada}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o veículo..." />
                                </SelectTrigger>
                                <SelectContent className="">
                                    {controladoras.map((c) => (
                                        <SelectItem key={c.idControladora} value={String(c.idControladora)}>
                                            {labelVeiculo(c)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Comando</Label>
                            <Select onValueChange={setTipoSelecionado} value={tipoSelecionado}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o comando..." />
                                </SelectTrigger>
                                <SelectContent className="">
                                    {temPermissao("comandos.bloquear") && (
                                        <SelectItem value="BLOQUEAR">Bloquear veículo</SelectItem>
                                    )}
                                    {temPermissao("comandos.desbloquear") && (
                                        <SelectItem value="DESBLOQUEAR">Desbloquear veículo</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogAberto(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={enviarComando} disabled={carregando}>
                            {carregando ? "Enviando..." : "Enviar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default Comandos;
