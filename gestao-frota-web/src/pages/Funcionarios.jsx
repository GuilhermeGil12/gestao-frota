import { useState, useEffect } from "react";
import BotaoFlutuante from "../components/BotaoFlutuante";
import api from "../services/api";
import { toast } from 'sonner';
import { MapPin, Search } from "lucide-react";
import { combinaBusca } from "../utils/busca";
import MapaPicker from "../components/MapaPicker";


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

import { maskCPF, maskRG, maskTelefone, maskCEP, maskNumeros } from '../utils/mascaras';
import {
    validarNomeCompleto, validarCPF, validarRG, validarTelefone, validarEmail, validarCEP,
    validarCNH, validarValidadeCNH, obrigatorio, tamanho, primeiroErro, sePreenchido,
} from '../utils/validacoes';
import { useErros } from '../utils/useErros';
import Campo from "../components/Campo";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../components/ui/dialog";
import Setores from "./configuracoes/Setores";
import { useAuth } from "../context/AuthContext";
import Paginacao from "../components/Paginacao";
import { usePaginacao } from "../utils/usePaginacao";

function Funcionarios() {
    const { temPermissao } = useAuth();
    const [funcionarios, setFuncionarios] = useState([]);
    const [termoBusca, setTermoBusca] = useState("");
    const [mapaAberto, setMapaAberto] = useState(false);
    const [pinPos, setPinPos] = useState(null); // { lat, lng }
    const [setor, setSetores] = useState([]);

    // 1. NOVO ESTADO: Controla o filtro de status (todos, ativos, inativos)
    const [filtroStatus, setFiltroStatus] = useState("ativos");

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [funcionarioSelecionado, setFuncionarioSelecionado] = useState(null);
    const [funcionarioParaExcluir, setFuncionarioParaExcluir] = useState(null);
    const [buscandoLocal, setBuscandoLocal] = useState(false);

    const initialState = {
        id: null, nome: "", cpf: "", rg: "", numeroTelefone: "", email: "",
        matricula: "", cargo: "", setor: "", nivelMotorista: "",
        numCNH: "", categoriaCNH: "", validadeCNH: "", ativo: true, liderId: null,
        endereco: "", numero: "", bairro: "", cidade: "", cep: ""
    };

    const [formData, setFormData] = useState(initialState);
    const { erros, validar, limpar, resetar } = useErros();
    const naoDirige = String(formData.nivelMotorista) === "0";

    // Muda um campo e apaga o erro dele (a pessoa está corrigindo).
    const mudar = (campo, valor) => {
        setFormData(prev => ({ ...prev, [campo]: valor }));
        limpar(campo);
    };

    const carregar = async () => {
        try {
            const res = await api.get('/funcionarios');
            setFuncionarios(res.data);
        } catch (e) { 
            toast.error("Erro ao carregar os funcionários!")
            console.error(e); }
    };

    const carregarSetores = async () =>{

        try{
        const res = await api.get('/setores');
        setSetores(res.data);

        }
        catch(e){
            console.log("Erro ao carregar setores " + e)
        }
    }

    useEffect(() => { carregar(); }, []);
    useEffect(() => { carregarSetores(); }, []);

    const erroMsg = (e, fallback) => e?.response?.data?.message || fallback;

    // Nome do líder do setor (quem lidera o funcionário que não tem líder próprio).
    // idFuncionario: o líder do setor não é líder dele mesmo.
    const liderDoSetor = (idSetor, idFuncionario) => {
        const s = setor.find(x => x.id === idSetor);
        if (!s?.liderNome || s.liderId === idFuncionario) return null;
        return s.liderNome;
    };

    // "2026-11-08" < hoje? (compara só a data, sem fuso)
    const cnhVencida = (f) => {
        if (!f.validadeCNH) return false;
        const hoje = new Date();
        const hojeIso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
        return f.validadeCNH < hojeIso;
    };

    // A nova CNH foi conferida: tira a pendência e libera os cartões que tinham sido bloqueados.
    const validarCnh = async (f) => {
        if (cnhVencida(f)) {
            toast.error("Atualize a validade da CNH (botão Editar) antes de validar.");
            return;
        }
        try {
            await api.post(`/funcionarios/${f.id}/validar-cnh`);
            toast.success(`CNH de ${f.nome} validada. Cartões liberados.`);
            carregar();
        } catch (e) {
            toast.error(erroMsg(e, "Erro ao validar a CNH."));
        }
    };

    const handleCepChange = async (valor) => {
        const cepFormatado = maskCEP(valor);
        mudar("cep", cepFormatado);

        const apenasNumeros = cepFormatado.replace(/\D/g, "");
        if (apenasNumeros.length === 8) {
            try {
                const res = await fetch(`https://viacep.com.br/ws/${apenasNumeros}/json/`);
                const dados = await res.json();
                if (!dados.erro) {
                    setFormData(prev => ({
                        ...prev,
                        cep: cepFormatado,
                        endereco: dados.logradouro || "",
                        bairro: dados.bairro || "",
                        cidade: dados.localidade || "",
                    }));
                } else {
                    setFormData(prev => ({ ...prev, endereco: "", bairro: "", cidade: "" }));
                    toast.error("CEP não encontrado.");
                }
            } catch {
                setFormData(prev => ({ ...prev, endereco: "", bairro: "", cidade: "" }));
                toast.error("Não foi possível buscar o CEP.");
            }
        }
    };

    const handleSalvar = async (e) => {
        e.preventDefault();
        const motorista = formData.nivelMotorista !== "" && String(formData.nivelMotorista) !== "0";

        const ok = validar({
            nome: validarNomeCompleto(formData.nome),
            cpf: validarCPF(formData.cpf),
            rg: validarRG(formData.rg),
            numeroTelefone: validarTelefone(formData.numeroTelefone),
            email: validarEmail(formData.email),
            numero: tamanho(formData.numero, 0, 10, "Número"),
            cep: sePreenchido(formData.cep, validarCEP),
            matricula: primeiroErro(obrigatorio(formData.matricula, "Matrícula"), tamanho(formData.matricula, 1, 20, "Matrícula")),
            cargo: primeiroErro(obrigatorio(formData.cargo, "Cargo"), tamanho(formData.cargo, 2, 60, "Cargo")),
            setor: obrigatorio(formData.setor?.id, "Setor"),
            nivelMotorista: obrigatorio(formData.nivelMotorista, "Nível de motorista"),
            numCNH: motorista ? validarCNH(formData.numCNH) : null,
            categoriaCNH: motorista && (!formData.categoriaCNH || formData.categoriaCNH === "naopossui")
                ? "Escolha a categoria da CNH." : null,
            validadeCNH: motorista ? validarValidadeCNH(formData.validadeCNH) : null,
        });
        if (!ok) return;

        try {
            if (formData.id) await api.put(`/funcionarios/${formData.id}`, formData);
            else await api.post('/funcionarios', formData);
            setIsModalOpen(false);
            carregar();
            toast.success("Funcionário salvo com sucesso!");
        } catch (e) { toast.error(erroMsg(e, "Não foi possível salvar o funcionário.")); }
    };

    const confirmarExclusao = async () => {
        if (!funcionarioParaExcluir) return;
        try {
            await api.delete(`/funcionarios/${funcionarioParaExcluir.id}`);
            carregar();
            toast.success("Funcionário inativado com sucesso!");
        } catch (e) { toast.error(erroMsg(e, "Não foi possível inativar o funcionário.")); }
        finally { setFuncionarioParaExcluir(null); }
    };

    const abrirModal = (f = null) => { setFormData(f || initialState); resetar(); setIsModalOpen(true); };
    const abrirModalVisualizacao = (f) => { setFuncionarioSelecionado(f); setIsViewModalOpen(true); };

    // 2. FILTRAGEM DUPLA: Filtra por texto E por status de ativação
    const funcionariosFiltrados = funcionarios.filter((f) => {
        // Regra do filtro de texto: sem acento e sem máscara (CPF, RG e telefone com ou sem pontos)
        const bateTexto = combinaBusca(termoBusca, [
            f.nome, f.cpf, f.rg, f.matricula, f.email, f.cargo, f.setor?.nome, f.numCNH, f.numeroTelefone,
        ]);

        // Regra do filtro de status (Combobox)
        if (filtroStatus === "ativos") return bateTexto && f.ativo === true;
        if (filtroStatus === "inativos") return bateTexto && f.ativo === false;
        return bateTexto; // "todos"
    });

    const buscarCoordenadas = async () => {
        if (!formData.cidade) return toast.error("Preencha pelo menos a cidade.");

        setBuscandoLocal(true);
        const toastId = toast.loading("Buscando localização...");

        const tentativas = [
            `${formData.endereco}, ${formData.numero}, ${formData.bairro}, ${formData.cidade}, SP, Brasil`,
            `${formData.endereco}, ${formData.cidade}, SP, Brasil`,
            `${formData.cidade}, SP, Brasil`,
        ];

        try {
            for (const query of tentativas) {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
                    { headers: { "Accept-Language": "pt-BR" } }
                );
                const dados = await res.json();

                if (dados.length > 0) {
                    setPinPos({ lat: parseFloat(dados[0].lat), lng: parseFloat(dados[0].lon) });
                    setMapaAberto(true);
                    toast.success("Localização encontrada!", { id: toastId });
                    return;
                }
            }
            toast.error("Endereço não encontrado no mapa.", { id: toastId });
        } catch {
            toast.error("Não foi possível buscar o endereço.", { id: toastId });
        } finally {
            setBuscandoLocal(false);
        }
    };
    const paginacao = usePaginacao(funcionariosFiltrados, 20);

    return (
        <div className="w-full">
            <div className="flex flex-wrap items-center justify-between mb-6 border-b border-border pb-4 gap-4">
                <h1 className="text-xl font-semibold text-foreground">Gestão de Funcionários</h1>

                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-1 sm:flex-row sm:items-center sm:max-w-xl">
                    {/* Barra de Pesquisa */}
                    <div className="relative w-full">
                        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Nome, CPF, matrícula, setor..."
                            value={termoBusca}
                            onChange={(e) => setTermoBusca(e.target.value)}
                            className="w-full pl-8"
                            aria-label="Pesquisar funcionários"
                        />
                    </div>

                    {/* 3. NOVO COMPONENTE: Filtro de exibição por status */}
                    <select
                        value={filtroStatus}
                        onChange={(e) => setFiltroStatus(e.target.value)}
                        className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border-border text-foreground"
                    >
                        <option value="ativos" className="bg-background text-foreground">Apenas Ativos</option>
                        <option value="inativos" className="bg-background text-foreground">Apenas Inativos</option>
                        <option value="todos" className="bg-background text-foreground">Mostrar Todos</option>
                    </select>
                </div>

                {temPermissao("funcionarios.cadastrar") && (
                    <BotaoFlutuante rotulo="Novo funcionário" onClick={() => abrirModal()} />
                )}
            </div>

            {/* Modal de Cadastro/Edicao */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-[850px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{formData.id ? "Editar Funcionário" : "Cadastrar Funcionário"}</DialogTitle>
                        <DialogDescription>Preencha os dados do funcionário abaixo.</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSalvar} className="space-y-6" noValidate>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b border-border pb-2">Dados Pessoais</h3>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <Campo id="campo-nome" rotulo="Nome completo" erro={erros.nome} obrigatorio className="sm:col-span-2">
                                <Input value={formData.nome} onChange={e => mudar("nome", e.target.value)} maxLength={120} autoComplete="off" />
                            </Campo>
                            <Campo id="campo-cpf" rotulo="CPF" erro={erros.cpf} obrigatorio>
                                <Input value={formData.cpf} onChange={e => mudar("cpf", maskCPF(e.target.value))} placeholder="000.000.000-00" inputMode="numeric" />
                            </Campo>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <Campo id="campo-rg" rotulo="RG" erro={erros.rg} obrigatorio>
                                <Input value={formData.rg} onChange={e => mudar("rg", maskRG(e.target.value))} placeholder="00.000.000-0" />
                            </Campo>
                            <Campo id="campo-numeroTelefone" rotulo="Telefone" erro={erros.numeroTelefone} obrigatorio>
                                <Input type="tel" value={formData.numeroTelefone} onChange={e => mudar("numeroTelefone", maskTelefone(e.target.value))} placeholder="(17) 99999-9999" inputMode="numeric" />
                            </Campo>
                            <Campo id="campo-email" rotulo="E-mail" erro={erros.email} obrigatorio>
                                <Input type="email" value={formData.email} onChange={e => mudar("email", e.target.value.trim())} placeholder="funcionario@empresa.com" maxLength={120} />
                            </Campo>
                            <Campo id="campo-cep" rotulo="CEP" erro={erros.cep} ajuda="Preenche a rua, o bairro e a cidade.">
                                <Input value={formData.cep} onChange={e => handleCepChange(e.target.value)} placeholder="00000-000" inputMode="numeric" />
                            </Campo>
                            <Campo id="campo-endereco" rotulo="Rua/Logradouro">
                                <Input value={formData.endereco} onChange={e => mudar("endereco", e.target.value)} placeholder="Rua Amazonas" maxLength={120} />
                            </Campo>
                            <Campo id="campo-numero" rotulo="Número" erro={erros.numero}>
                                <Input value={formData.numero} onChange={e => mudar("numero", e.target.value)} placeholder="123" maxLength={10} />
                            </Campo>
                            <Campo id="campo-bairro" rotulo="Bairro">
                                <Input value={formData.bairro} onChange={e => mudar("bairro", e.target.value)} placeholder="Centro" maxLength={80} />
                            </Campo>
                            <Campo id="campo-cidade" rotulo="Cidade">
                                <Input value={formData.cidade} onChange={e => mudar("cidade", e.target.value)} placeholder="São Paulo" maxLength={80} />
                            </Campo>
                            <div className="sm:col-span-3 flex justify-end">
                                <Button type="button" variant="outline" onClick={buscarCoordenadas} disabled={buscandoLocal}>
                                    {buscandoLocal ? (
                                        <>
                                            <span className="h-4 w-4 mr-2 animate-spin border-2 border-current border-t-transparent rounded-full inline-block" />
                                            Buscando...
                                        </>
                                    ) : (
                                        <>
                                            <MapPin className="h-4 w-4 mr-2" />
                                            Localizar no Mapa
                                        </>
                                    )}
                                </Button>
                            </div>

                            {mapaAberto && pinPos && (
                                <div className="sm:col-span-3 space-y-3">
                                    <p className="text-sm text-muted-foreground">
                                        Clique no mapa ou arraste o pin para ajustar a localização.
                                    </p>
                                    <MapaPicker
                                        posicao={pinPos}
                                        onMover={(novaPos) => setPinPos(novaPos)}
                                    />
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            setFormData(prev => ({ ...prev, latitude: pinPos.lat, longitude: pinPos.lng }));
                                            setMapaAberto(false);
                                            toast.success("Localização confirmada!");
                                        }}
                                    >
                                        Confirmar Localização
                                    </Button>
                                </div>
                            )}

                        </div>

                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b border-border pb-2">Dados Corporativos</h3>
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                            <Campo id="campo-matricula" rotulo="Matrícula" erro={erros.matricula} obrigatorio>
                                <Input value={formData.matricula} onChange={e => mudar("matricula", e.target.value)} placeholder="Ex: 107858" maxLength={20} />
                            </Campo>
                            <Campo id="campo-cargo" rotulo="Cargo" erro={erros.cargo} obrigatorio>
                                <Input value={formData.cargo} onChange={e => mudar("cargo", e.target.value)} maxLength={60} />
                            </Campo>
                            <Campo id="campo-setor" rotulo="Setor" erro={erros.setor} obrigatorio>
                                <select value={formData.setor?.id ?? ""} onChange={e => mudar("setor", e.target.value ? { id: Number(e.target.value) } : "")} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                                    <option value="">Selecione...</option>
                                    {setor.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                                </select>
                            </Campo>
                            <div className="space-y-2 col-span-2 md:col-span-4">
                                <Label htmlFor="func-lider">Líder</Label>
                                <select
                                    id="func-lider"
                                    value={formData.liderId ?? ""}
                                    onChange={e => setFormData({ ...formData, liderId: e.target.value ? Number(e.target.value) : null })}
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                >
                                    <option value="">
                                        {liderDoSetor(formData.setor?.id) ? `Líder do setor (${liderDoSetor(formData.setor?.id)})` : "Sem líder"}
                                    </option>
                                    {funcionarios
                                        .filter(f => f.ativo && f.id !== formData.id)
                                        .map(f => <option key={f.id} value={f.id}>{f.nome}{f.cargo ? ` — ${f.cargo}` : ""}</option>)}
                                </select>
                                <p className="text-xs text-muted-foreground">
                                    O líder recebe toda segunda, por e-mail, o relatório de condução dos seus liderados.
                                    Sem líder próprio, vale o líder do setor.
                                </p>
                            </div>
                            <Campo id="campo-nivelMotorista" rotulo="Nível motorista" erro={erros.nivelMotorista} obrigatorio>
                                <select value={formData.nivelMotorista ?? ""} onChange={e => mudar("nivelMotorista", e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                                    <option value="">Selecione...</option>
                                    <option value="0">Não dirige</option>
                                    <option value="1">1 (Básico)</option>
                                    <option value="2">2 (Intermediário)</option>
                                    <option value="3">3 (Avançado)</option>
                                </select>
                            </Campo>
                        </div>

                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b border-border pb-2">Dados de Direção</h3>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <Campo id="campo-numCNH" rotulo="Número da CNH" erro={erros.numCNH} obrigatorio={!naoDirige}>
                                <Input value={formData.numCNH ?? ""} onChange={e => mudar("numCNH", maskNumeros(e.target.value, 11))} placeholder="11 números" inputMode="numeric" disabled={naoDirige} />
                            </Campo>
                            <Campo id="campo-categoriaCNH" rotulo="Categoria da CNH" erro={erros.categoriaCNH} obrigatorio={!naoDirige}>
                                <select value={formData.categoriaCNH ?? ""} onChange={e => mudar("categoriaCNH", e.target.value)} disabled={naoDirige} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                                    <option value="">Selecione...</option>
                                    {["A", "B", "C", "D", "E", "AB", "AC", "AD", "AE"].map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </Campo>
                            <Campo id="campo-validadeCNH" rotulo="Validade da CNH" erro={erros.validadeCNH} obrigatorio={!naoDirige}>
                                <Input type="date" value={formData.validadeCNH ?? ""} onChange={e => mudar("validadeCNH", e.target.value)} disabled={naoDirige} />
                            </Campo>
                        </div>

                        <DialogFooter className="border-t border-border pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                            <Button type="submit">Confirmar</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal de Visualizacao */}
            <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                <DialogContent className="max-w-[1000px]">
                    <DialogHeader>
                        <DialogTitle>Detalhes do Funcionário</DialogTitle>
                        <DialogDescription>Informações completas do funcionário.</DialogDescription>
                    </DialogHeader>
                    {funcionarioSelecionado && (
                        <div className="space-y-6">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b border-border pb-2">Dados Pessoais</h3>
                            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                                <div className="col-span-2"><span className="block text-xs text-muted-foreground">Nome Completo</span><span>{funcionarioSelecionado.nome}</span></div>
                                <div><span className="block text-xs text-muted-foreground">CPF</span><span>{funcionarioSelecionado.cpf}</span></div>
                                <div><span className="block text-xs text-muted-foreground">RG</span><span>{funcionarioSelecionado.rg}</span></div>
                                <div><span className="block text-xs text-muted-foreground">Telefone</span><span>{funcionarioSelecionado.numeroTelefone || "Não informado"}</span></div>
                                <div className="col-span-2 md:col-span-3"><span className="block text-xs text-muted-foreground">E-mail</span><span>{funcionarioSelecionado.email || "Não informado"}</span></div>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="border-t border-border pt-4">
                        <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>Fechar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Tabela */}
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>CPF</TableHead>
                        <TableHead>RG</TableHead>
                        <TableHead>Setor</TableHead>
                        <TableHead>Nível</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {(!Array.isArray(funcionariosFiltrados) || funcionariosFiltrados.length === 0) ? (
                        <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{termoBusca ? `Nenhum funcionário encontrado para "${termoBusca}".` : "Nenhum funcionário encontrado."}</TableCell></TableRow>
                    ) : (
                        paginacao.visiveis.map(f => (
                            // 4. MUDANÇA VISUAL: Se f.ativo for falso, a linha ganha opacidade de 45% e um tom acinzentado
                            <TableRow key={f.id} className={!f.ativo ? "opacity-45 bg-muted/20 hover:bg-muted/30 transition-opacity" : ""}>
                                <TableCell>#{f.id}</TableCell>
                                <TableCell onClick={() => abrirModalVisualizacao(f)} className={`cursor-pointer font-semibold transition-colors ${f.ativo ? 'text-foreground hover:text-blue-400' : 'text-muted-foreground line-through'}`} title="Clique para ver detalhes">
                                    {f.nome} {!f.ativo && " (Inativo)"}
                                </TableCell>
                                <TableCell>{f.cpf}</TableCell>
                                <TableCell>{f.rg}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span>{f.setor?.nome}</span>
                                        {(f.liderNome || liderDoSetor(f.setor?.id, f.id)) && (
                                            <span className="text-xs text-muted-foreground">Líder: {f.liderNome || liderDoSetor(f.setor?.id, f.id)}</span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>Nível {f.nivelMotorista}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col items-start gap-1">
                                        <span>{f.ativo ? "Ativo" : "Desativado"}</span>
                                        {f.cnhPendente ? (
                                            <Badge variant="outline" className="whitespace-nowrap border-destructive/40 text-destructive" title="Cartões bloqueados até validar a nova CNH">CNH pendente</Badge>
                                        ) : cnhVencida(f) && (
                                            <Badge variant="outline" className="whitespace-nowrap border-destructive/40 text-destructive">CNH vencida</Badge>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex justify-end gap-2 whitespace-nowrap">
                                        {f.ativo ? (
                                            <>
                                                {temPermissao("funcionarios.editar") && (
                                                    <Button size="sm" variant="outline" onClick={() => abrirModal(f)}>Editar</Button>
                                                )}
                                                {temPermissao("funcionarios.editar") && f.cnhPendente && (
                                                    <Button size="sm" onClick={() => validarCnh(f)}>Validar CNH</Button>
                                                )}
                                                {temPermissao("funcionarios.inativar") && (
                                                    <Button size="sm" variant="destructive" onClick={() => setFuncionarioParaExcluir(f)}>Inativar</Button>
                                                )}
                                            </>
                                        ) : (
                                            temPermissao("funcionarios.inativar") && (
                                            <Button size="sm" variant="secondary" onClick={async () => {
                                                try {
                                                    await api.put(`/funcionarios/${f.id}`, { ...f, ativo: true });
                                                    toast.success("Funcionário reativado!");
                                                    carregar();
                                                } catch { toast.error("Erro ao reativar."); }
                                            }}>Reativar</Button>
                                            )
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

            {/* AlertDialog do Shadcn UI */}
            <AlertDialog open={funcionarioParaExcluir !== null} onOpenChange={(open) => !open && setFuncionarioParaExcluir(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                            <span>
                                Deseja INATIVAR o funcionário <strong className="font-bold text-foreground">{funcionarioParaExcluir?.nome}.</strong>? Ele perderá seu acesso!
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmarExclusao}>
                            Sim, inativar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export default Funcionarios;