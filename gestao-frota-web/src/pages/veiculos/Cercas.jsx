import { useState, useEffect, Fragment, useRef } from "react";
import api from "../../services/api";
import { toast } from "sonner";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents, useMap } from "react-leaflet";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../../components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../components/ui/alert-dialog";
import L from "leaflet";
import Paginacao from "../../components/Paginacao";
import { usePaginacao } from "../../utils/usePaginacao";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const RAIO_PADRAO = 100;

function CliqueMapaAdicao({ onClick }) {
    useMapEvents({ click(e) { onClick(e.latlng); } });
    return null;
}

function VoarPara({ posicao }) {
    const map = useMap();
    useEffect(() => {
        if (posicao) map.flyTo([posicao.lat, posicao.lng], 16, { duration: 1.2 });
    }, [posicao]);
    return null;
}

function Cercas() {
    const [cercas, setCercas]                     = useState([]);
    const [funcionarios, setFuncionarios]         = useState([]);
    const [modalNova, setModalNova]               = useState(false);
    const [novaPos, setNovaPos]                   = useState(null);
    const [novoNome, setNovoNome]                 = useState("");
    const [novoFuncionario, setNovoFuncionario]   = useState("");
    const [novoRaio, setNovoRaio]                 = useState(RAIO_PADRAO);
    const [confirmarMover, setConfirmarMover]     = useState(null);
    const [confirmarExcluir, setConfirmarExcluir] = useState(null);
    const [modalEditar, setModalEditar]           = useState(false);
    const [cercaEditando, setCercaEditando]       = useState(null);
    const [voarPara, setVoarPara]                 = useState(null);

    const carregar = async () => {
        try {
            const [resCercas, resFuncs] = await Promise.all([
                api.get("/cercas"),
                api.get("/funcionarios"),
            ]);
            setCercas(resCercas.data);
            setFuncionarios(resFuncs.data.filter(f => f.ativo));
        } catch {
            toast.error("Não foi possível carregar os dados.");
        }
    };

    useEffect(() => { carregar(); }, []);

    const abrirModalNova = () => {
        setNovaPos(null);
        setNovoNome("");
        setNovoFuncionario("");
        setNovoRaio(RAIO_PADRAO);
        setModalNova(true);
    };

    const handleSalvarNova = async () => {
        if (!novaPos) return toast.error("Clique no mapa para posicionar a cerca.");
        if (!novoNome.trim()) return toast.error("Nome é obrigatório.");
        try {
            await api.post("/cercas", {
                nome: novoNome,
                latitude: novaPos.lat,
                longitude: novaPos.lng,
                raio: novoRaio || RAIO_PADRAO,
                ativo: true,
                funcionario: novoFuncionario ? { id: parseInt(novoFuncionario) } : null,
            });
            toast.success("Cerca cadastrada!");
            setModalNova(false);
            carregar();
        } catch {
            toast.error("Não foi possível cadastrar a cerca.");
        }
    };

    const handleConfirmarMover = async () => {
        if (!confirmarMover) return;
        try {
            const cerca = cercas.find(c => c.id === confirmarMover.id);
            await api.put(`/cercas/${confirmarMover.id}`, { ...cerca, latitude: confirmarMover.lat, longitude: confirmarMover.lng });
            toast.success("Localização atualizada!");
            carregar();
        } catch {
            toast.error("Não foi possível mover a cerca.");
        } finally {
            setConfirmarMover(null);
        }
    };

    const handleDeletar = async () => {
        if (!confirmarExcluir) return;
        try {
            await api.delete(`/cercas/${confirmarExcluir.id}`);
            toast.success("Cerca removida!");
            carregar();
        } catch {
            toast.error("Não foi possível remover a cerca.");
        } finally {
            setConfirmarExcluir(null);
        }
    };

    const abrirEditar = (c) => {
        setCercaEditando({ ...c, funcionarioId: c.funcionario?.id || "" });
        setModalEditar(true);
    };

    const handleSalvarEditar = async () => {
        if (!cercaEditando.nome?.trim()) return toast.error("Nome é obrigatório.");
        try {
            await api.put(`/cercas/${cercaEditando.id}`, {
                ...cercaEditando,
                funcionario: cercaEditando.funcionarioId ? { id: parseInt(cercaEditando.funcionarioId) } : null,
            });
            toast.success("Cerca atualizada!");
            setModalEditar(false);
            carregar();
        } catch {
            toast.error("Não foi possível atualizar a cerca.");
        }
    };

    const centro = cercas.find(c => c.latitude && c.longitude)
        ? [cercas.find(c => c.latitude).latitude, cercas.find(c => c.longitude).longitude]
        : [-20.5, -49.0];

    const paginacao = usePaginacao(cercas, 20);

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
                <h1 className="text-xl font-semibold text-foreground">Cercas Geográficas</h1>
                <Button onClick={abrirModalNova}>+ Nova Cerca</Button>
            </div>

            {/* MAPA PRINCIPAL */}
            <MapContainer center={centro} zoom={13} style={{ height: "600px", width: "100%", borderRadius: "8px" }}>
                <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <VoarPara posicao={voarPara} />
                {cercas.map(c => c.latitude && c.longitude && (
                    <Fragment key={c.id}>
                        <Circle
                            center={[c.latitude, c.longitude]}
                            radius={c.raio || RAIO_PADRAO}
                            pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.15 }}
                        />
                        <Marker
                            position={[c.latitude, c.longitude]}
                            draggable={true}
                            eventHandlers={{
                                dragend(e) {
                                    const { lat, lng } = e.target.getLatLng();
                                    setConfirmarMover({ id: c.id, lat, lng, nome: c.nome });
                                }
                            }}
                        >
                            <Popup>
                                <strong>{c.nome}</strong>
                                {c.funcionario && <p className="mt-1">{c.funcionario.nome}</p>}
                                <p className="text-xs text-gray-500 mt-1">Raio: {c.raio || RAIO_PADRAO}m</p>
                            </Popup>
                        </Marker>
                    </Fragment>
                ))}
            </MapContainer>

            {/* TABELA */}
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Funcionário</TableHead>
                        <TableHead>Raio (m)</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {cercas.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">Nenhuma cerca cadastrada.</TableCell>
                        </TableRow>
                    ) : (
                        paginacao.visiveis.map(c => (
                            <TableRow key={c.id}>
                                <TableCell>{c.nome}</TableCell>
                                <TableCell>{c.funcionario?.nome || "—"}</TableCell>
                                <TableCell>{c.raio || RAIO_PADRAO}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="secondary" size="sm" onClick={() => setVoarPara({ lat: c.latitude, lng: c.longitude })}>Localizar</Button>
                                    <Button variant="outline" size="sm" onClick={() => abrirEditar(c)}>Editar</Button>
                                    <Button variant="destructive" size="sm" onClick={() => setConfirmarExcluir(c)}>Remover</Button>
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

            {/* MODAL NOVA CERCA — usa portal, fica acima de tudo */}
            <Dialog open={modalNova} onOpenChange={setModalNova}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Nova Cerca</DialogTitle>
                        <DialogDescription>
                            Preencha os dados e clique no mapa para posicionar o pin.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Nome</Label>
                                <Input value={novoNome} onChange={e => setNovoNome(e.target.value)} placeholder="Ex: Casa do João" />
                            </div>
                            <div className="space-y-2">
                                <Label>Funcionário (opcional)</Label>
                                <select value={novoFuncionario} onChange={e => setNovoFuncionario(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                                    <option value="">Nenhum</option>
                                    {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>Raio (metros)</Label>
                                <Input type="number" value={novoRaio} onChange={e => setNovoRaio(Number(e.target.value))} />
                            </div>
                        </div>

                        <p className="text-sm text-muted-foreground">
                            {novaPos ? `📍 Posição: ${novaPos.lat.toFixed(5)}, ${novaPos.lng.toFixed(5)}` : "Clique no mapa para posicionar o pin."}
                        </p>

                        {/* Mini mapa dentro do modal */}
                        <div style={{ height: 320, borderRadius: 8, overflow: "hidden" }}>
                            <MapContainer center={centro} zoom={13} style={{ height: "100%", width: "100%" }}>
                                <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                <CliqueMapaAdicao onClick={pos => setNovaPos(pos)} />
                                {novaPos && (
                                    <Fragment>
                                        <Circle
                                            center={[novaPos.lat, novaPos.lng]}
                                            radius={novoRaio || RAIO_PADRAO}
                                            pathOptions={{ color: "#22c55e", fillColor: "#22c55e", fillOpacity: 0.2 }}
                                        />
                                        <Marker
                                            position={[novaPos.lat, novaPos.lng]}
                                            draggable={true}
                                            eventHandlers={{ dragend(e) { setNovaPos(e.target.getLatLng()); } }}
                                        />
                                    </Fragment>
                                )}
                            </MapContainer>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setModalNova(false)}>Cancelar</Button>
                        <Button onClick={handleSalvarNova} disabled={!novaPos}>Salvar Cerca</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL EDITAR CERCA */}
            <Dialog open={modalEditar} onOpenChange={setModalEditar}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Editar Cerca</DialogTitle>
                        <DialogDescription>Altere os dados da cerca.</DialogDescription>
                    </DialogHeader>
                    {cercaEditando && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Nome</Label>
                                <Input value={cercaEditando.nome} onChange={e => setCercaEditando(prev => ({ ...prev, nome: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                                <Label>Funcionário (opcional)</Label>
                                <select value={cercaEditando.funcionarioId} onChange={e => setCercaEditando(prev => ({ ...prev, funcionarioId: e.target.value }))}
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                                    <option value="">Nenhum</option>
                                    {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>Raio (metros)</Label>
                                <Input type="number" value={cercaEditando.raio} onChange={e => setCercaEditando(prev => ({ ...prev, raio: Number(e.target.value) }))} />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setModalEditar(false)}>Cancelar</Button>
                        <Button onClick={handleSalvarEditar}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* CONFIRMAÇÃO DE MOVER PIN */}
            <AlertDialog open={!!confirmarMover} onOpenChange={() => setConfirmarMover(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Mover cerca?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Deseja salvar a nova posição da cerca <strong>{confirmarMover?.nome}</strong>?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => { setConfirmarMover(null); carregar(); }}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmarMover}>Confirmar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* CONFIRMAÇÃO DE EXCLUSÃO */}
            <AlertDialog open={!!confirmarExcluir} onOpenChange={() => setConfirmarExcluir(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remover cerca?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja remover a cerca <strong>{confirmarExcluir?.nome}</strong>? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeletar} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Remover
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export default Cercas;
