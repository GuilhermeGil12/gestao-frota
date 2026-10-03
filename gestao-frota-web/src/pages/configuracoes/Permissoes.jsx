import api from "@/services/api";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"

import { Button } from "@/components/ui/button";

import {
    Field,
    FieldContent,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldTitle,
} from "@/components/ui/field"
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label"
import menuItems from "@/utils/menuConfig";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";


import { MoreHorizontalIcon } from "lucide-react"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { toast } from "sonner";
import Funcionarios from "../Funcionarios";


function Permissoes() {

    const [tipoPermissao, setTipoPermissao] = useState("setor");
    const [funcionarios, setFuncionarios] = useState([]);
    const [setor, setSetor] = useState([]);

    const carregarFuncionarios = async () => {
        try {
            const res = await api.get('/funcionarios');
            setFuncionarios(res.data);
        }
        catch (e) {
            toast.error("Erro ao carregar!")
            console.log(e);
        }
    }

    const carregarSetor = async () => {
        try {
            const res = await api.get('/setores');
            setSetor(res.data);
        }
        catch (e) {
            toast.error("Erro ao carregar setor!")
            console.log(e);
        }
    }

    useEffect(() => { carregarSetor(); }, []);

    return (
        <div className="w-full ">
            <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
                <h1 className="text-xl font-semibold text-foreground">Permissões</h1>
            </div>

            <section className="flex flex-col gap-4">
                <div className="flex mb-8 justify-between">
                    <Tabs defaultValue="setor" className="" onValueChange={(value) => {
                        setTipoPermissao(value);
                        if (value === "colaborador") {
                            carregarFuncionarios();
                        }
                        else {
                            carregarSetor();
                        }
                    }}>
                        <TabsList>
                            <TabsTrigger value="setor">
                                Setor
                            </TabsTrigger>
                            <TabsTrigger value="colaborador">
                                Colaborador
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>


                    <Input className="max-w-xs mx-auto justify-between" placeholder={tipoPermissao == "setor" ? "Digite o setor" : "Digite o nome do colaborador"} />
                </div>
                <Table>
                    <TableHeader>
                        {(tipoPermissao === "setor") ? (
                            <TableRow>
                                <TableHead className="w-[20%]">ID</TableHead>
                                <TableHead className="w-[30%]">Setor</TableHead>
                                <TableHead className="w-[30%]">Qntd Colaborador</TableHead>
                                <TableHead className="w-[20%]">Permissões</TableHead>
                            </TableRow>
                        ) : (
                            <TableRow>
                                <TableHead className="w-[40%]">Nome</TableHead>
                                <TableHead className="w-[40%]">Setor</TableHead>
                                <TableHead className="w-[20%]">Permissões</TableHead>
                            </TableRow>
                        )}
                    </TableHeader>
                    <TableBody>


                        {(tipoPermissao === "colaborador") ? (
                            (funcionarios.length === 0) ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum funcionário encontrado.</TableCell></TableRow>
                            ) : (
                                funcionarios.map(f => (
                                    <TableRow>

                                        <TableCell>{f.nome}</TableCell>
                                        <TableCell>{f.setor?.nome}</TableCell>
                                        <TableCell>
                                            <Button variant="outline">Editar</Button>
                                        </TableCell>
                                    </TableRow>

                                ))
                            )
                        ) : (
                            (setor.length === 0) ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum setor encontrado.</TableCell></TableRow>
                            ) : (
                                setor.map(s => (
                                    <TableRow>
                                        <TableCell>#{s.id}</TableCell>
                                        <TableCell>{s.nome}</TableCell>
                                        <TableCell>{s.id}</TableCell>
                                        <TableCell>
                                            <Button variant="outline">Editar</Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )
                        )}


                    </TableBody>
                </Table>







                {/* {menuItems.map(item => (
                <Accordion defaultValue={["item-1"]}>
                    <AccordionItem value={item.to}>
                        <AccordionTrigger>{item.label}</AccordionTrigger>
                        <AccordionContent>
                            <FieldGroup>
                                <Field orientation="horizontal">
                                    <Checkbox id="terms-checkbox" name="terms-checkbox" />
                                    <Label htmlFor="terms-checkbox">{item.label}</Label>
                                </Field>
                            </FieldGroup>

                        </AccordionContent>

                    </AccordionItem>
                </Accordion>
            ))} */}
            </section>
        </div>
    );
}

export default Permissoes;
