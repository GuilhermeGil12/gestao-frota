import { useState, useEffect } from "react";
import BotaoFlutuante from "../../components/BotaoFlutuante";
import api from "../../services/api";
//import { toast } from "react-toastify";
import Swal from "sweetalert2";
import {toast} from 'sonner';
import { maskPlaca, maskNumeros } from '../../utils/mascaras';
import { validarPlaca, validarRenavam, validarVelocidadeMaxima, validarKm, obrigatorio, tamanho, primeiroErro } from '../../utils/validacoes';
import { useErros } from '../../utils/useErros';
import Campo from "../../components/Campo";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../../components/ui/dialog";

import { useAuth } from "../../context/AuthContext";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import Paginacao from "../../components/Paginacao";
import { usePaginacao } from "../../utils/usePaginacao";


const km = (v) => `${Math.round(Number(v)).toLocaleString("pt-BR")} km`;
// Mesmo aviso do back-end (RevisaoService.KM_AVISO): a partir de 500 km antes.
const KM_AVISO_REVISAO = 500;

// O botão "Revisão" só aparece quando chegou a hora: a 500 km ou menos, ou já vencida.
function horaDaRevisao(veiculo) {
    if (veiculo.kmAtual == null || veiculo.proximaRevisaoKm == null) return false;
    return veiculo.proximaRevisaoKm - veiculo.kmAtual <= KM_AVISO_REVISAO;
}

function Revisao({ veiculo }) {
    if (veiculo.proximaRevisaoKm == null) return <span className="text-muted-foreground">Informe o km</span>;
    const faltam = veiculo.proximaRevisaoKm - veiculo.kmAtual;
    return (
        <div className="flex flex-col gap-1">
            <span className="tabular-nums">{km(veiculo.proximaRevisaoKm)}</span>
            {faltam <= 0 && <Badge variant="destructive" className="w-fit">Vencida</Badge>}
            {faltam > 0 && faltam <= KM_AVISO_REVISAO && <Badge variant="outline" className="w-fit border-destructive/40 text-destructive">Faltam {km(faltam)}</Badge>}
        </div>
    );
}

function Veiculos() {
    const { temPermissao } = useAuth();
    const [veiculos, setVeiculos] = useState([]);
    const [controladorasLivres, setControladorasLivres] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [termoBusca, setTermoBusca] = useState("");
    const [carroParaExcluir, setCarroParaExcluir] = useState(null);

    const initialState = { id: null, nome: "", placa: "", renavam: "", kmAtual: "", velocidadeMaxima: "", ativo: true, controladoraId: "" };
    const [formData, setFormData] = useState(initialState);
    const { erros, validar, limpar, resetar } = useErros();

    const mudar = (campo, valor) => {
        setFormData(prev => ({ ...prev, [campo]: valor }));
        limpar(campo);
    };

    const carregarDados = async () => {
        try {
            const resVeiculos = await api.get('/veiculos');
            setVeiculos(Array.isArray(resVeiculos.data) ? resVeiculos.data : []);
            const resControladoras = await api.get('/controladora');
            // Aguardando aprovação só ganha veículo pelo "Aprovar" em Controladoras.
            setControladorasLivres((Array.isArray(resControladoras.data) ? resControladoras.data : [])
                .filter((c) => c.situacao !== "AGUARDANDO"));
        } catch (e) { console.error(e); }
    };

    useEffect(() => { carregarDados(); }, []);

    const erroMsg = (e, fallback) => e?.response?.data?.message || fallback;

    const handleSalvar = async (e) => {
        e.preventDefault();
        const ok = validar({
            nome: primeiroErro(obrigatorio(formData.nome, "Nome do veículo"), tamanho(formData.nome, 2, 60, "Nome do veículo")),
            placa: validarPlaca(formData.placa),
            renavam: validarRenavam(formData.renavam),
            velocidadeMaxima: validarVelocidadeMaxima(formData.velocidadeMaxima),
            kmAtual: validarKm(formData.kmAtual),
        });
        if (!ok) return;
        try {
            const payload = { ...formData };
            payload.controladora = payload.controladoraId ? { idControladora: payload.controladoraId } : null;
            if (formData.id) await api.put(`/veiculos/${formData.id}`, payload);
            else await api.post('/veiculos', payload);
            setIsModalOpen(false);
            carregarDados();
            toast.success("Veículo salvo com sucesso!");
        } catch (e) { toast.error(erroMsg(e, "Não foi possível salvar o veículo.")); }
    };

    // Revisão feita: o km de agora vira o da última revisão e a contagem recomeça.
    const handleRevisao = async (veiculo) => {
        const confirmacao = await Swal.fire({
            title: 'Registrar revisão?',
            text: `O ${veiculo.placa} está com ${km(veiculo.kmAtual)}. A próxima revisão passa a contar a partir daqui.`,
            icon: 'question', showCancelButton: true, confirmButtonText: 'Registrar', cancelButtonText: 'Cancelar',
            background: '#1e1e1e', color: '#ffffff',
        });
        if (!confirmacao.isConfirmed) return;
        try {
            await api.post(`/veiculos/${veiculo.id}/revisao`);
            carregarDados();
            toast.success("Revisão registrada.");
        } catch (e) { toast.error(erroMsg(e, "Não foi possível registrar a revisão.")); }
    };

    const handleInativar = async (veiculo) => {
        const confirmacao = await Swal.fire({ title: 'Tem certeza?', text: "Deseja alterar o status deste veículo?", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', confirmButtonText: 'Sim!', cancelButtonText: 'Cancelar', background: '#1e1e1e', color: '#ffffff' });
        if (confirmacao.isConfirmed) {
            try { await api.put(`/veiculos/${veiculo.id}`, { ...veiculo, ativo: !veiculo.ativo }); carregarDados(); toast.success("Status alterado com sucesso!"); }
            catch { toast.error("Ops! Não foi possível alterar este veículo."); }
        }
    };

  

    const handleExcluirClique = (id) =>{
        setCarroParaExcluir(id)
    }

    const confirmarExclusao = async () => {
        if (!carroParaExcluir) return;
        try {
            await api.delete(`/veiculos/${carroParaExcluir}`);
            toast.success("Veículo excluído com sucesso!");
            carregarDados();
        } catch (e) {
            toast.error(erroMsg(e, "Não foi possível excluir o veículo."));
        } finally {
            setCarroParaExcluir(null);
        }
    }

    const abrirModal = (v = null) => {
        if (v) setFormData({ ...v, controladoraId: v.controladora ? v.controladora.idControladora : "" });
        else setFormData(initialState);
        resetar();
        setIsModalOpen(true);
    };

    const buscaMinuscula = termoBusca.toLocaleLowerCase();
    const veiculosFiltrados = veiculos.filter((v) => {
        const placa = v.placa ? v.placa.toLowerCase() : "";
        const nome = v.nome ? v.nome.toLowerCase() : "";
        return placa.includes(buscaMinuscula) || nome.includes(buscaMinuscula);
    });

    const paginacao = usePaginacao(veiculosFiltrados, 20);

    return (
        <div className="w-full">
            <div className="flex flex-wrap items-center justify-between mb-6 border-b border-border pb-4 gap-4">
                <h1 className="text-xl font-semibold text-foreground">Veículos</h1>
                <Input type="text" placeholder="Pesquisar por Nome ou Placa..." value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)} className="max-w-xs" />
                {temPermissao("veiculos.cadastrar") && (
                    <BotaoFlutuante rotulo="Novo veículo" onClick={() => abrirModal()} />
                )}
            </div>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-[700px]">
                    <DialogHeader><DialogTitle>{formData.id ? "Editar Veículo" : "Cadastrar Veículo"}</DialogTitle><DialogDescription>Preencha os dados do veículo.</DialogDescription></DialogHeader>
                    <form onSubmit={handleSalvar} className="space-y-4" noValidate>
                        <Campo id="campo-nome" rotulo="Nome do veículo" erro={erros.nome} obrigatorio>
                            <Input value={formData.nome} onChange={e => mudar("nome", e.target.value)} placeholder="Ex.: Strada branca" maxLength={60} />
                        </Campo>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Campo id="campo-placa" rotulo="Placa" erro={erros.placa} obrigatorio>
                                <Input value={formData.placa} onChange={e => mudar("placa", maskPlaca(e.target.value))} placeholder="ABC-1234 ou ABC1D23" />
                            </Campo>
                            <Campo id="campo-renavam" rotulo="RENAVAM" erro={erros.renavam} obrigatorio>
                                <Input value={formData.renavam ?? ""} onChange={e => mudar("renavam", maskNumeros(e.target.value, 11))} placeholder="11 números" inputMode="numeric" />
                            </Campo>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Campo id="campo-velocidadeMaxima" rotulo="Limite de velocidade (km/h)" erro={erros.velocidadeMaxima} ajuda="Em branco, vale 110 km/h.">
                                <Input type="number" min={20} max={200} step={1} value={formData.velocidadeMaxima ?? ""} onChange={e => mudar("velocidadeMaxima", e.target.value)} placeholder="110" inputMode="numeric" />
                            </Campo>
                            <Campo id="campo-kmAtual" rotulo="Km atual (odômetro)" erro={erros.kmAtual} ajuda="Depois de informado, o GPS soma os km rodados sozinho.">
                                <Input type="number" min={0} step={1} value={formData.kmAtual ?? ""} onChange={e => mudar("kmAtual", e.target.value)} placeholder="Ex.: 45000" inputMode="numeric" />
                            </Campo>
                            <div className="space-y-2">
                                <Label>Vincular Controladora</Label>
                                <select value={formData.controladoraId} onChange={e => setFormData({ ...formData, controladoraId: e.target.value })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                                    <option value="">Nenhuma / Sem Rastreador</option>
                                    {Array.isArray(controladorasLivres) && controladorasLivres.map(c => (<option key={c.idControladora} value={c.idControladora}>Controladora #{c.idControladora}{c.veiculo && c.veiculo.id !== formData.id ? ` (já está no ${c.veiculo.placa})` : ""}</option>))}
                                </select>
                            </div>
                        </div>
                        <DialogFooter className="border-t border-border pt-4"><Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button><Button type="submit">Confirmar</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Table>
                <TableHeader><TableRow>
                    <TableHead>Status</TableHead><TableHead>Nome</TableHead><TableHead>Placa</TableHead>
                    <TableHead>Renavam</TableHead><TableHead>Controladora</TableHead><TableHead>Km atual</TableHead>
                    <TableHead>Próxima revisão</TableHead><TableHead className="text-center">Ações</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                    {(!Array.isArray(veiculosFiltrados) || veiculosFiltrados.length === 0) ? (
                        <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{termoBusca ? "Nenhum veículo encontrado com esta pesquisa." : "Nenhum veículo encontrado no banco."}</TableCell></TableRow>
                    ) : (
                        paginacao.visiveis.map(v => (
                            <TableRow key={v.id}>
                                <TableCell><Badge variant={v.ativo ? "default" : "secondary"} className={v.ativo ? "bg-green-600" : ""}>{v.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
                                <TableCell>{v.nome}</TableCell>
                                <TableCell className="uppercase">{v.placa}</TableCell>
                                <TableCell>{v.renavam}</TableCell>
                                <TableCell>{v.controladora ? `#${v.controladora.idControladora}` : <span className="text-muted-foreground">Sem controladora</span>}</TableCell>
                                <TableCell className="tabular-nums whitespace-nowrap">{v.kmAtual != null ? km(v.kmAtual) : <span className="text-muted-foreground">—</span>}</TableCell>
                                <TableCell className="whitespace-nowrap"><Revisao veiculo={v} /></TableCell>
                                <TableCell>
                                    <div className="flex gap-2 justify-center">
                                        {temPermissao("veiculos.editar") && (
                                            <Button size="sm" variant="outline" onClick={() => abrirModal(v)}>Editar</Button>
                                        )}
                                        {temPermissao("veiculos.editar") && horaDaRevisao(v) && (
                                            <Button size="sm" variant="outline" onClick={() => handleRevisao(v)}>Revisão</Button>
                                        )}
                                        {temPermissao("veiculos.inativar") && (
                                            <Button size="sm" variant={v.ativo ? "secondary" : "default"} onClick={() => handleInativar(v)}>{v.ativo ? "Inativar" : "Ativar"}</Button>
                                        )}
                                        {temPermissao("veiculos.inativar") && (
                                            <Button size="sm" variant="destructive" onClick={(e) =>{e.stopPropagation(); handleExcluirClique(v.id)}}>Excluir</Button>
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

            <AlertDialog open={carroParaExcluir !== null} onOpenChange={(open) => !open && setCarroParaExcluir(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Veículo?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <span>
                                Todas as informações vinculadas a ele serão apagadas!
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

export default Veiculos;
