import { useState, useEffect } from "react";
import BotaoFlutuante from "../components/BotaoFlutuante";
import api from "../services/api";
//import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { maskMAC, maskNumeros, maskTelefone } from "../utils/mascaras.js";
import { validarMAC, validarIMEI, validarTelefone, validarSenha, sePreenchido, SENHA_MINIMA } from "../utils/validacoes";
import { useErros } from "../utils/useErros";
import Campo from "../components/Campo";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
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

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../components/ui/dialog";
import { useAuth } from "../context/AuthContext";
import Paginacao from "../components/Paginacao";
import { usePaginacao } from "../utils/usePaginacao";

function Controladoras() {
    const { temPermissao } = useAuth();
    const [controladoras, setControladoras] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const initialState = { idControladora: null, macControladora: "", imei: "", linhaChip: "", senha: "", ativo: true };
    const [formData, setFormData] = useState(initialState);
    const { erros, validar, limpar, resetar } = useErros();

    const mudar = (campo, valor) => {
        setFormData(prev => ({ ...prev, [campo]: valor }));
        limpar(campo);
    };

    const [controladoraParaExcluir, setControladoraParaExcluir] = useState(null);

    const carregar = async () => {
        try {
            const res = await api.get('/controladora');
            setControladoras(Array.isArray(res.data) ? res.data : []);
        } catch (e) { console.error("Erro na requisicao:", e); setControladoras([]); }
    };

    useEffect(() => { carregar(); }, []);


    const erroMsg = (e, fallback) => e?.response?.data?.message || fallback;

    const handleSalvar = async (e) => {
        e.preventDefault();
        const ok = validar({
            macControladora: sePreenchido(formData.macControladora, validarMAC),
            imei: sePreenchido(formData.imei, validarIMEI),
            linhaChip: sePreenchido(formData.linhaChip, validarTelefone),
            // Na edição a senha é opcional (em branco = mantém a atual).
            senha: formData.idControladora ? sePreenchido(formData.senha, validarSenha) : validarSenha(formData.senha),
        });
        if (!ok) return;
        try {
            if (formData.idControladora) await api.put(`/controladora/${formData.idControladora}`, formData);
            else await api.post('/controladora', formData);
            setIsModalOpen(false);
            carregar();
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

    const handleExcluirClique = (idControladora) => {
        setControladoraParaExcluir(idControladora);
    };

    // Na edição, campos vazios do banco (null) viram "" para os inputs; a senha nunca vem do servidor.
    const abrirModal = (c = null) => {
        setFormData(c ? { ...initialState, ...c, macControladora: c.macControladora ?? "", imei: c.imei ?? "",
                          linhaChip: c.linhaChip ? maskTelefone(c.linhaChip) : "", senha: "" } : initialState);
        resetar();
        setIsModalOpen(true);
    };

    const paginacao = usePaginacao(controladoras, 20);

    return (
        <div className="w-full">
            <div className="flex flex-wrap items-center justify-between mb-6 border-b border-border pb-4 gap-3">
                <h1 className="text-xl font-semibold text-foreground">Controladoras</h1>
                {temPermissao("controladoras.cadastrar") && (
                    <BotaoFlutuante rotulo="Nova controladora" onClick={() => abrirModal()} />
                )}
            </div>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>{formData.idControladora ? `Editar controladora #${formData.idControladora}` : "Cadastrar controladora"}</DialogTitle>
                        <DialogDescription>
                            {formData.idControladora
                                ? `O código desta controladora é ${formData.idControladora}: é o CODIGO gravado no firmware.`
                                : "O código é gerado ao salvar. Grave esse número no firmware (CODIGO)."}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSalvar} className="space-y-4" noValidate>
                        <Campo id="campo-senha" rotulo="Senha" erro={erros.senha} obrigatorio={!formData.idControladora}
                               ajuda={formData.idControladora ? "Em branco, mantém a senha atual." : `Pelo menos ${SENHA_MINIMA} caracteres.`}>
                            <Input type="password" placeholder="Senha do equipamento" value={formData.senha ?? ""} onChange={e => mudar("senha", e.target.value)} autoComplete="new-password" />
                        </Campo>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Campo id="campo-macControladora" rotulo="Endereço MAC" erro={erros.macControladora} ajuda="Opcional.">
                                <Input placeholder="00:1B:44:11:3A:B7" value={formData.macControladora} onChange={e => mudar("macControladora", maskMAC(e.target.value))} />
                            </Campo>
                            <Campo id="campo-imei" rotulo="IMEI do modem" erro={erros.imei} ajuda="Opcional. 15 números, impresso na placa.">
                                <Input placeholder="15 números" value={formData.imei} onChange={e => mudar("imei", maskNumeros(e.target.value, 15))} inputMode="numeric" />
                            </Campo>
                        </div>
                        <Campo id="campo-linhaChip" rotulo="Linha do chip 4G" erro={erros.linhaChip} ajuda="Opcional. Número do chip, para recarga ou cancelamento.">
                            <Input type="tel" placeholder="(17) 99999-9999" value={formData.linhaChip} onChange={e => mudar("linhaChip", maskTelefone(e.target.value))} inputMode="numeric" />
                        </Campo>
                        <DialogFooter className="border-t border-border pt-4"><Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button><Button type="submit">Confirmar</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Table>
                <TableHeader><TableRow>
                    <TableHead>Status</TableHead><TableHead>Código</TableHead><TableHead>Veículo</TableHead>
                    <TableHead>IMEI</TableHead><TableHead>Linha do chip</TableHead><TableHead>MAC</TableHead><TableHead className="text-right">Ações</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                    {(!Array.isArray(controladoras) || controladoras.length === 0) ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma controladora cadastrada.</TableCell></TableRow>
                    ) : (
                        paginacao.visiveis.map(c => (
                            <TableRow key={c.idControladora}>
                                <TableCell><Badge variant={c.ativo ? "default" : "secondary"} className={c.ativo ? "bg-green-600" : ""}>{c.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
                                <TableCell className="font-semibold tabular-nums">#{c.idControladora}</TableCell>
                                <TableCell>{c.veiculo ? `${c.veiculo.placa}${c.veiculo.nome ? ` · ${c.veiculo.nome}` : ""}` : <span className="text-muted-foreground">Sem veículo</span>}</TableCell>
                                <TableCell className="tabular-nums">{c.imei || "—"}</TableCell>
                                <TableCell className="tabular-nums">{c.linhaChip ? maskTelefone(c.linhaChip) : "—"}</TableCell>
                                <TableCell className="tabular-nums">{c.macControladora || "—"}</TableCell>
                                <TableCell>
                                    <div className="flex justify-end gap-2 whitespace-nowrap">
                                        {temPermissao("controladoras.editar") && (
                                            <Button size="sm" variant="outline" onClick={() => abrirModal(c)}>Editar</Button>
                                        )}
                                        {temPermissao("controladoras.editar") && (
                                            <Button size="sm" variant={c.ativo ? "secondary" : "default"} onClick={(e) =>{e.stopPropagation(); handleInativar(c)}}>
                                                {c.ativo ? "Inativar" : "Ativar"}
                                            </Button>
                                        )}
                                        {temPermissao("controladoras.editar") && (
                                            <Button size="sm" variant="destructive" onClick={() => handleExcluirClique(c.idControladora)}>Excluir</Button>
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

            <AlertDialog open={controladoraParaExcluir !== null} onOpenChange={(open) => !open && setControladoraParaExcluir(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Controladora?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <span>
                                Todas as informações vinculadas a ela serão apagadas!
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
