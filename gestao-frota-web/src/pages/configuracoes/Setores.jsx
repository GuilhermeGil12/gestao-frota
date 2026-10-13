import { useEffect, useState } from "react";
import { toast } from 'sonner';
import api from "@/services/api";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import Paginacao from "../../components/Paginacao";
import { usePaginacao } from "../../utils/usePaginacao";


function Setores() {


    const [setor, setSetor] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState (false);
    const [setorSelecionado, setSetorSelecionado] = useState(null); 
    //define os dados do form como initialState que começa com os dados null

    const initialState ={
        id: null, nome: "", Descricao: ""
    };

    const [formData, setFormData] = useState(initialState)

    
    const carregarSetor = async () => {
        try {
            const res = await api.get('/setores');
            setSetor(res.data);

        }
        catch (e) {
            toast.error("Erro ao carregar setores");
            console.log(e);
        }
    };
    

    const handleSalvar = async (e) => {
        e.preventDefault();
        if(!formData.nome.trim()) return toast.error("Nome é obrigatório.");

        try{
            await api.post('/setores', formData);
            toast.success("Setor salvo com sucesso!");
            setIsModalOpen(false);
            carregarSetor();
        }catch(e){
            toast.error("Erro ao cadastrar setor!");
        }
    }
    //define s padrão como null
    //quando chamamos abrirModal o s será o setor clicado
    // f || initialState = se f for null usa o initialState 
    const abrirModal = (s = null) => { setFormData (s || initialState); setIsModalOpen(true)};

    useEffect(() => { carregarSetor(); }, []);

    const paginacao = usePaginacao(setor, 20);

    return (
        <div className="w-full ">
            <div className="flex items-center justify-between mb-6 border-b border-border pb-4 gap-4">
                <h1 className="text-xl font-semibold text-foreground">Setores</h1>

                
                    <Input type="text" className="max-w-xs" placeholder="Digite aqui"></Input>
                    <Button onClick={() => abrirModal()}>Adicionar</Button>
                
            </div>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-[850px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{formData.id ? "Editar Setor" : "Cadastrar Setor"}</DialogTitle>
                        <DialogDescription>Preencha os dados do setor abaixo.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSalvar}>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2 space-y-2"><Label>Nome</Label><Input value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} required/></div>
                            <div className=" space-y-2"><Label>Descrição</Label><Input></Input></div>

                            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                            <Button type="submit">Cadastrar</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[30%]">ID</TableHead>
                        <TableHead className="w-[30%]">Nome</TableHead>
                        <TableHead className="w-[20%]">Qntd Funcionários</TableHead>
                        <TableHead className="w-[20%]">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {(setor.length === 0) ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum funcionário encontrado.</TableCell></TableRow>
                    ) : (
                        paginacao.visiveis.map(s => (
                            <TableRow>
                                <TableCell>#{s.id}</TableCell>
                                <TableCell>{s.nome}</TableCell>
                                <TableCell>{s.quantiade}</TableCell>
                                <TableCell><Button variant="outline" onClick={() => abrirModal(s)}>Editar</Button></TableCell>
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




    );
}

export default Setores;