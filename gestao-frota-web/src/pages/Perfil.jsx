import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Camera, Trash2, Save, KeyRound, Loader2, Eye, EyeOff } from "lucide-react";
import api from "../services/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import PreferenciasNotificacao from "../components/PreferenciasNotificacao";
import ConexaoTelegram from "../components/ConexaoTelegram";
import { useAuth } from "../context/AuthContext";

const LADO_FOTO = 256;  // a foto é reduzida no navegador pra no máximo 256x256 antes de enviar

function erroMsg(e, padrao) {
    return e?.response?.data?.message || padrao;
}

function iniciais(nome) {
    return (nome || "?").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

// Lê a imagem escolhida, corta no centro (quadrado) e reduz. Devolve um data URL JPEG.
function reduzirFoto(arquivo) {
    return new Promise((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
        leitor.onload = () => {
            const img = new Image();
            img.onerror = () => reject(new Error("Arquivo de imagem inválido."));
            img.onload = () => {
                const lado = Math.min(img.width, img.height);
                const destino = Math.min(LADO_FOTO, lado);
                const canvas = document.createElement("canvas");
                canvas.width = destino;
                canvas.height = destino;
                canvas.getContext("2d").drawImage(
                    img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, destino, destino);
                resolve(canvas.toDataURL("image/jpeg", 0.85));
            };
            img.src = leitor.result;
        };
        leitor.readAsDataURL(arquivo);
    });
}

function Perfil() {
    const { atualizarUsuario } = useAuth();
    const [perfil, setPerfil] = useState(null);
    const [nome, setNome] = useState("");
    const [salvandoNome, setSalvandoNome] = useState(false);
    const [enviandoFoto, setEnviandoFoto] = useState(false);
    const [senhas, setSenhas] = useState({ atual: "", nova: "", confirmar: "" });
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const [salvandoSenha, setSalvandoSenha] = useState(false);
    const inputFoto = useRef(null);

    const aplicarPerfil = (dados) => {
        setPerfil(dados);
        setNome(dados.nomeUsuario ?? "");
        atualizarUsuario({ nomeUsuario: dados.nomeUsuario, foto: dados.foto ?? null });
    };

    useEffect(() => {
        api.get("/perfil")
            .then((res) => aplicarPerfil(res.data))
            .catch(() => toast.error("Erro ao carregar seu perfil."));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const escolherFoto = async (e) => {
        const arquivo = e.target.files?.[0];
        e.target.value = "";  // permite escolher o mesmo arquivo de novo
        if (!arquivo) return;
        if (!arquivo.type.startsWith("image/")) {
            toast.error("Escolha um arquivo de imagem.");
            return;
        }
        if (arquivo.size > 10 * 1024 * 1024) {
            toast.error("A imagem pode ter no máximo 10 MB.");
            return;
        }
        setEnviandoFoto(true);
        try {
            const foto = await reduzirFoto(arquivo);
            const res = await api.put("/perfil/foto", { foto });
            aplicarPerfil(res.data);
            toast.success("Foto atualizada!");
        } catch (err) {
            toast.error(erroMsg(err, err.message || "Erro ao enviar a foto."));
        } finally {
            setEnviandoFoto(false);
        }
    };

    const removerFoto = async () => {
        setEnviandoFoto(true);
        try {
            const res = await api.delete("/perfil/foto");
            aplicarPerfil(res.data);
            toast.success("Foto removida.");
        } catch (err) {
            toast.error(erroMsg(err, "Erro ao remover a foto."));
        } finally {
            setEnviandoFoto(false);
        }
    };

    const salvarNome = async (e) => {
        e.preventDefault();
        if (!nome.trim()) {
            toast.error("Informe o nome.");
            return;
        }
        setSalvandoNome(true);
        try {
            const res = await api.put("/perfil", { nomeUsuario: nome.trim() });
            aplicarPerfil(res.data);
            toast.success("Nome atualizado!");
        } catch (err) {
            toast.error(erroMsg(err, "Erro ao salvar o nome."));
        } finally {
            setSalvandoNome(false);
        }
    };

    const trocarSenha = async (e) => {
        e.preventDefault();
        if (senhas.nova.length < 6) {
            toast.error("A nova senha precisa ter pelo menos 6 caracteres.");
            return;
        }
        if (senhas.nova !== senhas.confirmar) {
            toast.error("A confirmação não é igual à nova senha.");
            return;
        }
        setSalvandoSenha(true);
        try {
            await api.put("/perfil/senha", { senhaAtual: senhas.atual, novaSenha: senhas.nova });
            setSenhas({ atual: "", nova: "", confirmar: "" });
            toast.success("Senha alterada!");
        } catch (err) {
            toast.error(erroMsg(err, "Erro ao trocar a senha."));
        } finally {
            setSalvandoSenha(false);
        }
    };

    const funcionario = perfil?.funcionario;
    const tipoSenha = mostrarSenha ? "text" : "password";

    return (
        <div className="w-full space-y-6">
            <div className="border-b border-border pb-4">
                <h1 className="text-xl font-semibold text-foreground">Meu perfil</h1>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Foto */}
                <Card>
                    <CardHeader>
                        <CardTitle>Foto</CardTitle>
                        <CardDescription>Aparece no menu lateral. PNG ou JPG; é recortada em quadrado.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        <div className="relative size-32 overflow-hidden rounded-full border border-border bg-muted">
                            {perfil?.foto ? (
                                <img src={perfil.foto} alt="Sua foto" className="size-full object-cover" />
                            ) : (
                                <span className="flex size-full items-center justify-center text-3xl font-semibold text-muted-foreground">
                                    {iniciais(perfil?.nomeUsuario)}
                                </span>
                            )}
                            {enviandoFoto && (
                                <span className="absolute inset-0 flex items-center justify-center bg-background/70">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                </span>
                            )}
                        </div>
                        <input ref={inputFoto} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={escolherFoto} />
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => inputFoto.current?.click()} disabled={enviandoFoto || !perfil}>
                                <Camera className="h-4 w-4 mr-2" />{perfil?.foto ? "Trocar foto" : "Anexar foto"}
                            </Button>
                            {perfil?.foto && (
                                <Button variant="outline" onClick={removerFoto} disabled={enviandoFoto} aria-label="Remover foto">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Dados pessoais */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Dados pessoais</CardTitle>
                        <CardDescription>O e-mail é o seu login e só pode ser trocado por um administrador.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <form onSubmit={salvarNome} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="perfil-nome">Nome</Label>
                                <Input id="perfil-nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} disabled={!perfil} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="perfil-email">E-mail</Label>
                                <Input id="perfil-email" value={perfil?.email ?? ""} disabled />
                            </div>
                            <div className="md:col-span-2 flex justify-end">
                                <Button type="submit" disabled={salvandoNome || !perfil || nome.trim() === perfil?.nomeUsuario}>
                                    {salvandoNome ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                    Salvar nome
                                </Button>
                            </div>
                        </form>

                        {funcionario && (
                            <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 md:grid-cols-4">
                                <div>
                                    <p className="text-xs text-muted-foreground">Funcionário</p>
                                    <p className="text-sm font-medium">{funcionario.nome}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Setor</p>
                                    <p className="text-sm font-medium">{funcionario.setor || "—"}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Cargo / matrícula</p>
                                    <p className="text-sm font-medium">{[funcionario.cargo, funcionario.matricula].filter(Boolean).join(" · ") || "—"}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Validade da CNH</p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium">
                                            {funcionario.validadeCNH ? format(new Date(`${funcionario.validadeCNH}T00:00:00`), "dd/MM/yyyy") : "—"}
                                        </p>
                                        {funcionario.cnhPendente && <Badge variant="destructive">Pendente</Badge>}
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Senha */}
                <Card>
                    <CardHeader>
                        <CardTitle>Trocar senha</CardTitle>
                        <CardDescription>Pelo menos 6 caracteres.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={trocarSenha} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="senha-atual">Senha atual</Label>
                                <Input id="senha-atual" type={tipoSenha} autoComplete="current-password" value={senhas.atual}
                                       onChange={(e) => setSenhas({ ...senhas, atual: e.target.value })} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="senha-nova">Nova senha</Label>
                                <Input id="senha-nova" type={tipoSenha} autoComplete="new-password" value={senhas.nova}
                                       onChange={(e) => setSenhas({ ...senhas, nova: e.target.value })} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="senha-confirmar">Confirmar nova senha</Label>
                                <Input id="senha-confirmar" type={tipoSenha} autoComplete="new-password" value={senhas.confirmar}
                                       onChange={(e) => setSenhas({ ...senhas, confirmar: e.target.value })} required />
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <Button type="button" variant="ghost" size="sm" onClick={() => setMostrarSenha((m) => !m)}>
                                    {mostrarSenha ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                                    {mostrarSenha ? "Ocultar" : "Mostrar"}
                                </Button>
                                <Button type="submit" disabled={salvandoSenha}>
                                    {salvandoSenha ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />}
                                    Trocar senha
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Telegram */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Telegram</CardTitle>
                        <CardDescription>Avisos no celular, mesmo com o site fechado.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ConexaoTelegram />
                    </CardContent>
                </Card>

                {/* Notificações */}
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Minhas notificações</CardTitle>
                        <CardDescription>Escolha o que aparece no sino. Vale só para você.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <PreferenciasNotificacao />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default Perfil;
