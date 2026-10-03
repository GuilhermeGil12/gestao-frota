import api from "@/services/api"
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../../components/ui/dialog";




function Usuario() {

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);

    



    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-6 border-b border-border pb-4 gap-4">
                <h1 className="text-xl font-semibold text-foreground">Usuários</h1>
                <Input type="text" placeholder="Pesquise por nome" className="max-w-xs" />
                <Button>+ Novo Usuário</Button>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow>
                        <TableCell>1</TableCell>
                        <TableCell>Guilherme</TableCell>
                        <TableCell>guilhermegil@gmail.com</TableCell>
                        <TableCell classNam>
                            <div className="flex gap-4">
                                <Button>Editar</Button>
                                <Button variant="outline">Inativar</Button>
                            </div>
                        </TableCell>

                    </TableRow>
                </TableBody>
            </Table>


            <Dialog>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Adicionar usuário</DialogTitle>
                        <DialogContent>Preencha os dados do usuário abaixo.</DialogContent>
                    </DialogHeader>

                    <form></form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default Usuario;
