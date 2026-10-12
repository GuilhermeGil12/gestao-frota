import api from "@/services/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../../components/ui/table";
import { useEffect, useState } from "react";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "../../components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { InputCodigo } from "@/components/ui/input-codigo";
import PainelPermissoes from "@/components/PainelPermissoes";
import { Eye, EyeOff, ClipboardList, Shield, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

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
} from "@/components/ui/alert-dialog";

function Usuario() {
    const { temPermissao } = useAuth();
    const initialState = {
        nomeUsuario: "",
        email: "",
        senha: "",
        idFuncionario: "",
        confirmarSenha: "",
        permissoes: [],
    };

    const [formData, setFormData] = useState(initialState);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [usuarioInativar, setUsuarioInativar] = useState(null);
    const [termoBusca, setTermoBusca] = useState("");
    const [verSenha, setVerSenha] = useState(false);
    const [verConfirmarSenha, setVerConfirmarSenha] = useState(false);

    const [isRedefinirOpen, setIsRedefinirOpen] = useState(false);
    const [enviandoCodigo, setEnviandoCodigo] = useState(false);
    const [validandoCodigo, setValidandoCodigo] = useState(false);
    const [etapaRedefinir, setEtapaRedefinir] = useState("codigo");
    const [segundosReenvio, setSegundosReenvio] = useState(0);
    const [redefinirData, setRedefinirData] = useState({
        usuarioId: null,
        email: "",
        codigo: "",
        novaSenha: "",
        confirmarNovaSenha: "",
    });

    const erroMsg = (e, fallback) => e?.response?.data?.message || fallback;


    const abrirModal = (u = null) => {
        if (u) {
            setFormData({
                id: u.id,
                nomeUsuario: u.nomeUsuario,
                email: u.email,
                senha: "",
                confirmarSenha: "",
                idFuncionario: u.funcionario ? String(u.funcionario.id) : "",
                permissoes: (u.permissoes ?? []).map((p) => p.nomePermissao),
            });
        } else {
            setFormData(initialState);
        }
        setIsModalOpen(true);
    };
    const [funcionarios, setFuncionarios] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [catalogoPermissoes, setCatalogoPermissoes] = useState([]);

    const carregar = async () => {
        try {
            const res = await api.get("/usuario");
            setUsuarios(res.data);
        } catch (e) {
            toast.error("Erro ao carregar usuários!");
            console.error(e);
        }
    };

    const carregarFuncionarios = async () => {
        try {
            const res = await api.get("/funcionarios");
            setFuncionarios(res.data);
        } catch (e) {
            toast.error("Erro ao carregar os funcionários");
            console.log(e);
        }
    };

    useEffect(() => {
        carregarFuncionarios();
    }, []);
    const carregarCatalogoPermissoes = async () => {
        try {
            const res = await api.get("/permissoes/catalogo");
            setCatalogoPermissoes(res.data);
        } catch (e) {
            toast.error("Erro ao carregar as permissões");
            console.error(e);
        }
    };

    useEffect(() => {
        carregar();
    }, []);
    useEffect(() => {
        carregarCatalogoPermissoes();
    }, []);

    useEffect(() => {
        if (segundosReenvio <= 0) return;
        const timer = setTimeout(() => setSegundosReenvio(segundosReenvio - 1), 1000);
        return () => clearTimeout(timer);
    }, [segundosReenvio]);

    const handleSalvar = async () => {
        const payload = {
            nomeUsuario: formData.nomeUsuario,
            email: formData.email,
            senha: formData.senha,
            idFuncionario:
                !formData.idFuncionario || formData.idFuncionario === "null"
                    ? null
                    : formData.idFuncionario,
            permissoes: formData.permissoes ?? [],
        };



        if (formData.senha != formData.confirmarSenha) {
            toast.error("As senhas precisam ser idênticas.");
            return;
        }



        try {
            if (formData.nomeUsuario) {
                if (formData.id) {
                    await api.put(`/usuario/${formData.id}`, payload);
                } else {
                    if (!formData.senha) {
                        toast.error("Preencha todos os campos.");
                        return
                    }
                    else {
                        await api.post(`/usuario`, payload);

                    }
                }
            }
            else {
                toast.error("Preencha todos os campos.");
                return
            }

            toast.success("Usuário salvo com sucesso!")
            setIsModalOpen(false);
            carregar();
        } catch (e) {
            toast.error(erroMsg(e, "Não foi possível salvar o usuário"));
            
            return;
        }
    };

    const abrirRedefinirSenha = async () => {
        if (!formData.id) return;

        setRedefinirData({
            usuarioId: formData.id,
            email: formData.email,
            codigo: "",
            novaSenha: "",
            confirmarNovaSenha: "",
        });
        setEtapaRedefinir("codigo");
        setIsRedefinirOpen(true);
        setEnviandoCodigo(true);

        try {
            await api.post(`/usuario/${formData.id}/codigo-recuperacao`);
            toast.success("Código enviado para o e-mail do usuário.");
            setSegundosReenvio(30);
        } catch (e) {
            toast.error(erroMsg(e, "Não foi possível enviar o código."));
            setIsRedefinirOpen(false);
        } finally {
            setEnviandoCodigo(false);
        }
    };

    const handleValidarCodigo = async () => {
        if (redefinirData.codigo.length !== 6) {
            toast.error("Digite os 6 dígitos do código.");
            return;
        }

        setValidandoCodigo(true);
        try {
            await api.post(`/usuario/${redefinirData.usuarioId}/validar-codigo`, {
                codigo: redefinirData.codigo,
            });
            setEtapaRedefinir("senha");
        } catch (e) {
            toast.error(erroMsg(e, "Código inválido."));
        } finally {
            setValidandoCodigo(false);
        }
    };

    const reenviarCodigo = async () => {
        setEnviandoCodigo(true);
        try {
            await api.post(`/usuario/${redefinirData.usuarioId}/codigo-recuperacao`);
            toast.success("Novo código enviado.");
            setRedefinirData((atual) => ({ ...atual, codigo: "" }));
            setSegundosReenvio(30);
        } catch (e) {
            toast.error(erroMsg(e, "Não foi possível reenviar o código."));
        } finally {
            setEnviandoCodigo(false);
        }
    };

    const handleRedefinirSenha = async () => {
        if (redefinirData.novaSenha.length < 8) {
            toast.error("A nova senha deve ter pelo menos 8 caracteres.");
            return;
        }
        if (redefinirData.novaSenha !== redefinirData.confirmarNovaSenha) {
            toast.error("As senhas precisam ser idênticas.");
            return;
        }

        try {
            await api.post(`/usuario/${redefinirData.usuarioId}/redefinir-senha`, {
                codigo: redefinirData.codigo,
                novaSenha: redefinirData.novaSenha,
            });
            toast.success("Senha redefinida com sucesso!");
            setIsRedefinirOpen(false);
        } catch (e) {
            toast.error(erroMsg(e, "Não foi possível redefinir a senha."));
        }
    };

    const handleInativar = async() => {
        if(!usuarioInativar) return;
        try {
            await api.patch(`/usuario/inativar/${usuarioInativar.id}`);
            carregar();
            
            toast.success(usuarioInativar.ativo ? "Usuário inativado com sucesso!"
                 : "Usuário ativado com sucesso!");
        }
        catch (e) {
            toast.error(erroMsg(e,"Erro ao inativar usuário!"));
        }
        finally{setUsuarioInativar(null);}

    };

    const usuariosFiltrados = usuarios.filter((u) => {
        const busca = termoBusca.toLocaleLowerCase();
        const nome = u.nomeUsuario ? u.nomeUsuario.toLocaleLowerCase() : "";
        const email = u.email ? u.email.toLocaleLowerCase() : "";
        return nome.includes(busca) || email.includes(busca);
    });

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-6 border-b border-border pb-4 gap-4">
                <h1 className="text-xl font-semibold text-foreground">Usuários</h1>
                <Input
                    type="text"
                    placeholder="Pesquise por nome ou e-mail"
                    className="max-w-xs"
                    value={termoBusca}
                    onChange={(e) => setTermoBusca(e.target.value)}
                />
                {temPermissao("configuracoes.usuarios") && (
                    <Button onClick={() => abrirModal()}>+ Novo Usuário</Button>
                )}
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {usuariosFiltrados.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                Nenhum usuário encontrado.
                            </TableCell>
                        </TableRow>
                    ) : usuariosFiltrados.map((u) => (
                        <TableRow key={u.id}>
                            <TableCell>{u.id}</TableCell>
                            <TableCell>{u.nomeUsuario}</TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>{u.ativo ? "Ativo" : "Desativado" }</TableCell>

                            <TableCell>
                                <div className="flex gap-4">
                                    <Button size="sm" onClick={() => abrirModal(u)}>Editar</Button>
                                    {u.ativo ? (
                                        <Button size="sm" variant="destructive" onClick={() => setUsuarioInativar(u)}>Inativar</Button>
                                    ) : <Button size="sm" variant="secondary" onClick={() => setUsuarioInativar(u)}>Reativar</Button>
                                    }
                                    
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-[600px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {formData.id ? "Editar usuário" : "Cadastrar usuário"}
                        </DialogTitle>
                        <DialogDescription>
                            Preencha os dados do usuário abaixo.
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs>
                        <TabsList>
                            <TabsTrigger value="dados">
                                <ClipboardList />
                                Dados
                            </TabsTrigger>
                            <TabsTrigger value="permissoes">
                                <Shield />
                                Permissões
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="dados">
                            <FieldGroup className="grid grid-col-2">
                                <Field>
                                    <Label>Nome</Label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            placeholder="Nome"
                                            value={formData.nomeUsuario}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    nomeUsuario: e.target.value,
                                                })
                                            }
                                            required
                                        />
                                        <Select
                                            value={formData.idFuncionario}
                                            onValueChange={(valor) =>
                                                setFormData({ ...formData, idFuncionario: valor })
                                            }
                                            required
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione um funcionário" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="null">Null</SelectItem>
                                                {funcionarios.map((f) => (
                                                    <SelectItem key={f.id} value={String(f.id)}>
                                                        {f.nome}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </Field>
                                <Field>
                                    <Label>Email</Label>
                                    <Input
                                        placeholder="example@email.com"
                                        value={formData.email}
                                        onChange={(e) =>
                                            setFormData({ ...formData, email: e.target.value })
                                        }
                                        required
                                    ></Input>
                                </Field>
                                {formData.id ? (
                                    <Field>
                                        <Label>Senha</Label>
                                        <div className="flex items-center justify-between gap-4 rounded-md border border-border p-3">
                                            <span className="text-sm text-muted-foreground">
                                                A senha atual não pode ser exibida.
                                            </span>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={abrirRedefinirSenha}
                                            >
                                                Redefinir senha
                                            </Button>
                                        </div>
                                    </Field>
                                ) : (
                                    <>
                                        <Field>
                                            <Label>Senha</Label>
                                            <div className="relative">
                                                <Input
                                                    type={verSenha ? "text" : "password"}
                                                    className="pr-10"
                                                    value={formData.senha}
                                                    onChange={(e) =>
                                                        setFormData({ ...formData, senha: e.target.value })
                                                    }
                                                    required
                                                ></Input>
                                                <button
                                                    type="button"
                                                    onClick={() => setVerSenha(!verSenha)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                                                    aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}
                                                >
                                                    {verSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                                </button>
                                            </div>
                                        </Field>
                                        <Field>
                                            <Label>Confirme a senha</Label>
                                            <div className="relative">
                                                <Input
                                                    type={verConfirmarSenha ? "text" : "password"}
                                                    className="pr-10"
                                                    value={formData.confirmarSenha}
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            confirmarSenha: e.target.value,
                                                        })
                                                    }
                                                    required
                                                ></Input>
                                                <button
                                                    type="button"
                                                    onClick={() => setVerConfirmarSenha(!verConfirmarSenha)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                                                    aria-label={verConfirmarSenha ? "Ocultar senha" : "Mostrar senha"}
                                                >
                                                    {verConfirmarSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                                </button>
                                            </div>
                                        </Field>
                                    </>
                                )}
                                <Field orientation="horizontal">
                                    <Button onClick={() => handleSalvar()}>
                                        {formData.id ? "Salvar" : "Cadastrar"}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsModalOpen(false)}
                                    >
                                        Cancelar
                                    </Button>
                                </Field>
                            </FieldGroup>
                        </TabsContent>
                        <TabsContent value="permissoes">
                            <PainelPermissoes
                                catalogo={catalogoPermissoes}
                                selecionadas={formData.permissoes}
                                onChange={(permissoes) => setFormData({ ...formData, permissoes })}
                            />
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>

            <AlertDialog open={usuarioInativar !== null} onOpenChange={(open) => !open && setUsuarioInativar(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                            <span>
                                Deseja INATIVAR o funcionário <strong className="font-bold text-foreground">{usuarioInativar?.nomeUsuario}.</strong>? Ele perderá seu acesso!
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleInativar}>
                            Sim, inativar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={isRedefinirOpen} onOpenChange={setIsRedefinirOpen}>
                <DialogContent className="max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle>Redefinir senha</DialogTitle>
                        <DialogDescription>
                            {etapaRedefinir === "codigo" ? (
                                <>
                                    Enviamos um código de 6 dígitos para{" "}
                                    <strong className="text-foreground">{redefinirData.email}</strong>.
                                    Ele vale por 15 minutos.
                                </>
                            ) : (
                                "Código confirmado. Agora defina a nova senha."
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    {etapaRedefinir === "codigo" ? (
                        <>
                            <div className="py-4">
                                {enviandoCodigo ? (
                                    <div className="flex flex-col items-center gap-3 py-6 text-muted-foreground">
                                        <Loader2 className="size-7 animate-spin" />
                                        <span className="text-sm">Enviando o código...</span>
                                    </div>
                                ) : (
                                    <InputCodigo
                                        value={redefinirData.codigo}
                                        disabled={validandoCodigo}
                                        onChange={(codigo) =>
                                            setRedefinirData({ ...redefinirData, codigo })
                                        }
                                    />
                                )}
                            </div>

                            <DialogFooter className="sm:justify-between">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={enviandoCodigo || segundosReenvio > 0}
                                    onClick={reenviarCodigo}
                                >
                                    {segundosReenvio > 0
                                        ? `Reenviar em ${segundosReenvio}s`
                                        : "Reenviar código"}
                                </Button>
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => setIsRedefinirOpen(false)}>
                                        Cancelar
                                    </Button>
                                    <Button
                                        onClick={handleValidarCodigo}
                                        disabled={
                                            redefinirData.codigo.length !== 6 ||
                                            validandoCodigo ||
                                            enviandoCodigo
                                        }
                                    >
                                        {validandoCodigo && <Loader2 className="size-4 animate-spin" />}
                                        {validandoCodigo ? "Validando..." : "Continuar"}
                                    </Button>
                                </div>
                            </DialogFooter>
                        </>
                    ) : (
                        <>
                            <FieldGroup>
                                <Field>
                                    <Label>Nova senha</Label>
                                    <Input
                                        type="password"
                                        placeholder="Mínimo 8 caracteres"
                                        value={redefinirData.novaSenha}
                                        onChange={(e) =>
                                            setRedefinirData({ ...redefinirData, novaSenha: e.target.value })
                                        }
                                    />
                                </Field>
                                <Field>
                                    <Label>Confirme a nova senha</Label>
                                    <Input
                                        type="password"
                                        value={redefinirData.confirmarNovaSenha}
                                        onChange={(e) =>
                                            setRedefinirData({
                                                ...redefinirData,
                                                confirmarNovaSenha: e.target.value,
                                            })
                                        }
                                    />
                                </Field>
                            </FieldGroup>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsRedefinirOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button onClick={handleRedefinirSenha}>Redefinir senha</Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>


    );
}

export default Usuario;
