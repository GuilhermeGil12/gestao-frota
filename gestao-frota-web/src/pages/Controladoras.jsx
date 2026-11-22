import { useState, useEffect } from "react";
import api from "../services/api";
import Swal from 'sweetalert2';
import { format } from "date-fns";
import { maskMAC, maskTelefone } from "../utils/mascaras.js";
import { validarMAC, validarTelefone, sePreenchido } from "../utils/validacoes";
import { useErros } from "../utils/useErros";
import Campo from "../components/Campo";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from 'sonner';
import { Cpu, KeyRound } from "lucide-react";

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

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../components/ui/dialog";
import { useAuth } from "../context/AuthContext";
import Paginacao from "../components/Paginacao";
import { usePaginacao } from "../utils/usePaginacao";

// A controladora se apresenta sozinha ao ligar (provisionamento/<imei>): a lista se atualiza
// sozinha pra ela aparecer sem precisar recarregar a página.
const ATUALIZAR_A_CADA_MS = 15000;
const SEM_VEICULO = "nenhum"; // o Select do Radix não aceita valor vazio

const aguardando = (c) => c.situacao === "AGUARDANDO";
const precisaAprovar = (c) => aguardando(c) || c.trocaDeSenhaPendente;

function dataHora(valor) {
    return valor ? format(new Date(valor), "dd/MM/yyyy HH:mm") : "—";
}

function nomeVeiculo(v) {
    return v ? `${v.placa}${v.nome ? ` · ${v.nome}` : ""}` : "";
}

// Lista de veículos para o Select. Mostra quando o veículo já tem outra controladora
// (ao escolher, a antiga fica sem veículo — é o caso de trocar a controladora do carro).
function SelecionarVeiculo({ veiculos, valor, onChange, idControladora }) {
    return (
        <Select value={valor} onValueChange={onChange}>
            <SelectTrigger id="campo-veiculo"><SelectValue placeholder="Sem veículo" /></SelectTrigger>
            <SelectContent>
                <SelectItem value={SEM_VEICULO}>Sem veículo</SelectItem>
                {veiculos.map((v) => {
                    const outra = v.controladora && v.controladora.idControladora !== idControladora
                        ? ` (troca a controladora #${v.controladora.idControladora})` : "";
                    return <SelectItem key={v.id} value={String(v.id)}>{nomeVeiculo(v)}{outra}</SelectItem>;
                })}
            </SelectContent>
        </Select>
    );
}

function Controladoras() {
    const { temPermissao } = useAuth();
    const [controladoras, setControladoras] = useState([]);
    const [veiculos, setVeiculos] = useState([]);
    const { erros, validar, limpar, resetar } = useErros();

    // Editar (só o que o gestor sabe: veículo, linha do chip e MAC).
    const [edicao, setEdicao] = useState(null);
    // Aprovar (controladora nova ou troca de senha).
    const [aprovacao, setAprovacao] = useState(null);
    const [controladoraParaExcluir, setControladoraParaExcluir] = useState(null);

    const carregar = async () => {
        try {
            const res = await api.get('/controladora');
            setControladoras(Array.isArray(res.data) ? res.data : []);
        } catch (e) { console.error("Erro na requisicao:", e); setControladoras([]); }
    };

    const carregarVeiculos = async () => {
        try {
            const res = await api.get('/veiculos');
            setVeiculos((Array.isArray(res.data) ? res.data : []).filter((v) => v.ativo !== false));
        } catch { setVeiculos([]); } // sem permissão de veículos: aprova sem escolher
    };

    useEffect(() => {
        carregar();
        carregarVeiculos();
        const timer = setInterval(carregar, ATUALIZAR_A_CADA_MS);
        return () => clearInterval(timer);
    }, []);

    const erroMsg = (e, fallback) => e?.response?.data?.message || fallback;

    const pendentes = controladoras.filter(precisaAprovar);
    const aprovadas = controladoras.filter((c) => !aguardando(c));

    // ---------- Aprovar ----------
    const abrirAprovacao = (c) => {
        setAprovacao({
            controladora: c,
            idVeiculo: c.veiculo ? String(c.veiculo.id) : SEM_VEICULO,
            linhaChip: c.linhaChip ? maskTelefone(c.linhaChip) : "",
        });
        resetar();
    };

    const confirmarAprovacao = async (e) => {
        e.preventDefault();
        if (!validar({ linhaChip: sePreenchido(aprovacao.linhaChip, validarTelefone) })) return;
        const c = aprovacao.controladora;
        try {
            await api.post(`/controladora/${c.idControladora}/aprovar`, {
                idVeiculo: aprovacao.idVeiculo === SEM_VEICULO ? null : Number(aprovacao.idVeiculo),
                linhaChip: aprovacao.linhaChip,
            });
            toast.success(c.trocaDeSenhaPendente && !aguardando(c) ? "Nova senha aprovada!" : "Controladora aprovada!");
            setAprovacao(null);
            carregar();
            carregarVeiculos();
        } catch (e) { toast.error(erroMsg(e, "Erro ao aprovar a controladora.")); }
    };

    const recusar = async (c) => {
        const confirmacao = await Swal.fire({
            title: 'Recusar controladora?',
            text: `A controladora de IMEI ${c.imei} sai da lista. Se ela ligar de novo, aparece aqui outra vez.`,
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33',
            confirmButtonText: 'Recusar', cancelButtonText: 'Cancelar',
            background: '#1e1e1e', color: '#ffffff',
        });
        if (!confirmacao.isConfirmed) return;
        try {
            await api.delete(`/controladora/${c.idControladora}`);
            toast.success("Controladora recusada.");
            carregar();
        } catch (e) { toast.error(erroMsg(e, "Erro ao recusar a controladora.")); }
    };

    // ---------- Editar ----------
    const abrirEdicao = (c) => {
        setEdicao({
            idControladora: c.idControladora,
            imei: c.imei,
            idVeiculo: c.veiculo ? String(c.veiculo.id) : SEM_VEICULO,
            macControladora: c.macControladora ?? "",
            linhaChip: c.linhaChip ? maskTelefone(c.linhaChip) : "",
        });
        resetar();
    };

    const mudarEdicao = (campo, valor) => {
        setEdicao((prev) => ({ ...prev, [campo]: valor }));
        limpar(campo);
    };

    const salvarEdicao = async (e) => {
        e.preventDefault();
        const ok = validar({
            macControladora: sePreenchido(edicao.macControladora, validarMAC),
            linhaChip: sePreenchido(edicao.linhaChip, validarTelefone),
        });
        if (!ok) return;
        try {
            await api.put(`/controladora/${edicao.idControladora}`, {
                macControladora: edicao.macControladora,
                linhaChip: edicao.linhaChip,
                veiculo: edicao.idVeiculo === SEM_VEICULO ? null : { id: Number(edicao.idVeiculo) },
            });
            setEdicao(null);
            carregar();
            carregarVeiculos();
            toast.success("Controladora salva com sucesso!");
        } catch (e) { toast.error(erroMsg(e, "Erro ao salvar a controladora.")); }
    };

    const handleInativar = async (controladora) => {
        try {
            await api.patch(`/controladora/${controladora.idControladora}/inativar`);
            toast.success(controladora.ativo ? "Controladora desativada!" : "Controladora ativada!");
            carregar();
        } catch(e) { toast.error(erroMsg(e, "Erro ao mudar status da controladora.")); }
    };

    const confirmarExclusao = async () => {
        if (!controladoraParaExcluir) return;
        try {
            await api.delete(`/controladora/${controladoraParaExcluir}`);
            toast.success("Controladora excluída com sucesso!");
            carregar();
        } catch (e) {
            toast.error(erroMsg(e, "Não foi possível excluir a controladora."));
        } finally {
            setControladoraParaExcluir(null);
        }
    };

    const paginacao = usePaginacao(aprovadas, 20);
    const trocaDeSenha = aprovacao && !aguardando(aprovacao.controladora);

    return (
        <div className="w-full space-y-6">
            <div className="border-b border-border pb-4">
                <h1 className="text-xl font-semibold text-foreground">Controladoras</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Não é preciso cadastrar: a controladora aparece aqui sozinha na primeira vez que liga com o 4G.
                </p>
            </div>

            {/* ---------- Aguardando aprovação ---------- */}
            {pendentes.length > 0 && (
                <Card className="border-primary/40">
                    <CardHeader>
                        <CardTitle>Aguardando aprovação</CardTitle>
                        <CardDescription>
                            Confira o IMEI (está na etiqueta do modem) antes de aprovar.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {pendentes.map((c) => (
                            <div key={c.idControladora}
                                 className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
                                <div className="flex items-start gap-3 min-w-0">
                                    {aguardando(c)
                                        ? <Cpu className="h-5 w-5 mt-0.5 text-primary shrink-0" />
                                        : <KeyRound className="h-5 w-5 mt-0.5 text-primary shrink-0" />}
                                    <div className="min-w-0">
                                        <p className="font-medium tabular-nums">
                                            IMEI {c.imei}
                                            {!aguardando(c) && c.veiculo && <span className="text-muted-foreground"> · {nomeVeiculo(c.veiculo)}</span>}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {aguardando(c) ? "Controladora nova" : `Controladora #${c.idControladora} pediu uma senha nova`}
                                            {" · firmware "}{c.versaoFirmware ?? "?"}{" · "}{dataHora(c.ultimoContato)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {aguardando(c) && temPermissao("controladoras.editar") && (
                                        <Button size="sm" variant="outline" onClick={() => recusar(c)}>Recusar</Button>
                                    )}
                                    {temPermissao("controladoras.cadastrar") && (
                                        <Button size="sm" onClick={() => abrirAprovacao(c)}>Aprovar</Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* ---------- Aprovar ---------- */}
            <Dialog open={aprovacao !== null} onOpenChange={(open) => !open && setAprovacao(null)}>
                <DialogContent className="max-w-[520px]">
                    {aprovacao && (
                        <>
                            <DialogHeader>
                                <DialogTitle>{trocaDeSenha ? "Aprovar nova senha" : "Aprovar controladora"}</DialogTitle>
                                <DialogDescription>
                                    {trocaDeSenha
                                        ? `A controladora #${aprovacao.controladora.idControladora} (IMEI ${aprovacao.controladora.imei}) mandou uma senha diferente. Isso acontece quando a memória dela é apagada ou o firmware é regravado do zero. Ela continua funcionando com a senha antiga até você aprovar.`
                                        : `IMEI ${aprovacao.controladora.imei}. Depois de aprovada, ela recebe os cartões e os comandos, e os pontos dela passam a ser salvos.`}
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={confirmarAprovacao} className="space-y-4" noValidate>
                                <Campo id="campo-veiculo" rotulo="Veículo" ajuda="Opcional. Dá para escolher depois em Editar.">
                                    <SelecionarVeiculo veiculos={veiculos} valor={aprovacao.idVeiculo}
                                                       idControladora={aprovacao.controladora.idControladora}
                                                       onChange={(v) => setAprovacao((a) => ({ ...a, idVeiculo: v }))} />
                                </Campo>
                                <Campo id="campo-linhaChip" rotulo="Linha do chip 4G" erro={erros.linhaChip} ajuda="Opcional. Número do chip, para recarga ou cancelamento.">
                                    <Input type="tel" placeholder="(17) 99999-9999" value={aprovacao.linhaChip} inputMode="numeric"
                                           onChange={(e) => { setAprovacao((a) => ({ ...a, linhaChip: maskTelefone(e.target.value) })); limpar("linhaChip"); }} />
                                </Campo>
                                <DialogFooter className="border-t border-border pt-4">
                                    <Button type="button" variant="outline" onClick={() => setAprovacao(null)}>Cancelar</Button>
                                    <Button type="submit">Aprovar</Button>
                                </DialogFooter>
                            </form>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* ---------- Editar ---------- */}
            <Dialog open={edicao !== null} onOpenChange={(open) => !open && setEdicao(null)}>
                <DialogContent className="max-w-[600px]">
                    {edicao && (
                        <>
                            <DialogHeader>
                                <DialogTitle>Editar controladora #{edicao.idControladora}</DialogTitle>
                                <DialogDescription>
                                    {edicao.imei ? `IMEI ${edicao.imei}. O IMEI e a senha vêm da própria controladora.` : "Firmware antigo: ainda sem IMEI."}
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={salvarEdicao} className="space-y-4" noValidate>
                                <Campo id="campo-veiculo" rotulo="Veículo">
                                    <SelecionarVeiculo veiculos={veiculos} valor={edicao.idVeiculo} idControladora={edicao.idControladora}
                                                       onChange={(v) => mudarEdicao("idVeiculo", v)} />
                                </Campo>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <Campo id="campo-linhaChip" rotulo="Linha do chip 4G" erro={erros.linhaChip} ajuda="Opcional.">
                                        <Input type="tel" placeholder="(17) 99999-9999" value={edicao.linhaChip} inputMode="numeric"
                                               onChange={(e) => mudarEdicao("linhaChip", maskTelefone(e.target.value))} />
                                    </Campo>
                                    <Campo id="campo-macControladora" rotulo="Endereço MAC" erro={erros.macControladora} ajuda="Opcional.">
                                        <Input placeholder="00:1B:44:11:3A:B7" value={edicao.macControladora}
                                               onChange={(e) => mudarEdicao("macControladora", maskMAC(e.target.value))} />
                                    </Campo>
                                </div>
                                <DialogFooter className="border-t border-border pt-4">
                                    <Button type="button" variant="outline" onClick={() => setEdicao(null)}>Cancelar</Button>
                                    <Button type="submit">Salvar</Button>
                                </DialogFooter>
                            </form>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* ---------- Aprovadas ---------- */}
            <div>
                <Table>
                    <TableHeader><TableRow>
                        <TableHead>Status</TableHead><TableHead>Código</TableHead><TableHead>IMEI</TableHead><TableHead>Veículo</TableHead>
                        <TableHead>Firmware</TableHead><TableHead>Último contato</TableHead><TableHead>Linha do chip</TableHead><TableHead className="text-right">Ações</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                        {aprovadas.length === 0 ? (
                            <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                Nenhuma controladora aprovada. Ligue a controladora com o chip 4G e ela aparece aqui para aprovar.
                            </TableCell></TableRow>
                        ) : (
                            paginacao.visiveis.map(c => (
                                <TableRow key={c.idControladora}>
                                    <TableCell><Badge variant={c.ativo ? "default" : "secondary"} className={c.ativo ? "bg-green-600" : ""}>{c.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
                                    <TableCell className="font-semibold tabular-nums">#{c.idControladora}</TableCell>
                                    <TableCell className="tabular-nums">{c.imei || "—"}</TableCell>
                                    <TableCell>{c.veiculo ? nomeVeiculo(c.veiculo) : <span className="text-muted-foreground">Sem veículo</span>}</TableCell>
                                    <TableCell>
                                        {c.versaoFirmware
                                            ? <span className="tabular-nums">{c.versaoFirmware}</span>
                                            : <Badge variant="outline" title={`Ainda usa o código ${c.codigoMqtt} nos tópicos. Grave o firmware novo.`}>Antigo</Badge>}
                                    </TableCell>
                                    <TableCell className="tabular-nums">{dataHora(c.ultimoContato)}</TableCell>
                                    <TableCell className="tabular-nums">{c.linhaChip ? maskTelefone(c.linhaChip) : "—"}</TableCell>
                                    <TableCell>
                                        <div className="flex justify-end gap-2 whitespace-nowrap">
                                            {temPermissao("controladoras.editar") && (
                                                <Button size="sm" variant="outline" onClick={() => abrirEdicao(c)}>Editar</Button>
                                            )}
                                            {temPermissao("controladoras.editar") && (
                                                <Button size="sm" variant={c.ativo ? "secondary" : "default"} onClick={(e) =>{e.stopPropagation(); handleInativar(c)}}>
                                                    {c.ativo ? "Inativar" : "Ativar"}
                                                </Button>
                                            )}
                                            {temPermissao("controladoras.editar") && (
                                                <Button size="sm" variant="destructive" onClick={() => setControladoraParaExcluir(c.idControladora)}>Excluir</Button>
                                            )}
                                        </div>
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

            <AlertDialog open={controladoraParaExcluir !== null} onOpenChange={(open) => !open && setControladoraParaExcluir(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Controladora?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <span>
                                Todas as informações vinculadas a ela serão apagadas! Se ela ligar de novo, volta a aparecer para aprovação.
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

export default Controladoras;
