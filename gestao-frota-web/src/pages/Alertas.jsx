import React, { useState, useEffect } from 'react';
import { toast } from "react-toastify";
import axios from 'axios';
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Search } from "lucide-react";

function Alertas() {
    const [dataInicio, setDataInicio] = useState("");
    const [dataFinal, setDataFinal] = useState("");
    const [veiculoSelecionado, setVeiculoSelecionado] = useState("");
    const [veiculosReais, setVeiculosReais] = useState([]);
    const [historicoAlertas, setHistoricoAlertas] = useState([]);

    const carregarDados = async (inicio, fim, veiculoId) => {
        try {
            const response = await axios.get("http://localhost:8080/api/localizacao/alerta", {
                params: { dataInicio: inicio, dataFinal: fim, idVeiculo: veiculoId || null }
            });
            setHistoricoAlertas(response.data);
            if (response.data.length === 0) toast.warn("Nenhum alerta encontrado para este periodo.");
            else toast.success(`${response.data.length} alertas carregados.`);
        } catch (error) {
            console.error("Erro ao buscar alertas:", error);
            toast.error("Erro ao conectar com o servidor.");
        }
    };

    useEffect(() => {
        axios.get("http://localhost:8080/api/veiculos")
            .then(res => setVeiculosReais(res.data))
            .catch(() => toast.error("Erro ao carregar veiculos."));

        const hoje = new Date();
        const seteDiasAtras = new Date();
        seteDiasAtras.setDate(hoje.getDate() - 7);
        const strFim = hoje.toISOString().split('T')[0];
        const strInicio = seteDiasAtras.toISOString().split('T')[0];
        setDataInicio(strInicio);
        setDataFinal(strFim);
        carregarDados(strInicio, strFim, null);
    }, []);

    const handleBuscarAlertas = () => {
        if (!dataInicio || !dataFinal) { toast.error("Selecione as datas de inicio e fim."); return; }
        carregarDados(dataInicio, dataFinal, veiculoSelecionado);
    };

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
                <h1 className="text-xl font-semibold text-foreground">Historico de Alertas (Velocidade &gt; 110km/h)</h1>
            </div>

            {/* Filtros */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-4 items-end flex-wrap">
                        <div className="flex-1 min-w-[200px] space-y-2">
                            <Label>Data Inicio</Label>
                            <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
                        </div>
                        <div className="flex-1 min-w-[200px] space-y-2">
                            <Label>Data Final</Label>
                            <Input type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} />
                        </div>
                        <div className="flex-1 min-w-[200px] space-y-2">
                            <Label>Veiculo (Opcional)</Label>
                            <select value={veiculoSelecionado} onChange={(e) => setVeiculoSelecionado(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                                <option value="">Todos os Veiculos</option>
                                {veiculosReais.map((v) => (<option key={v.id_veiculo || v.id} value={v.id_veiculo || v.id}>{v.placa} - {v.modelo}</option>))}
                            </select>
                        </div>
                        <Button onClick={handleBuscarAlertas}><Search className="h-4 w-4 mr-2" />Filtrar</Button>
                    </div>
                </CardContent>
            </Card>

            {/* Tabela */}
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Placa</TableHead><TableHead>Motorista</TableHead>
                        <TableHead>Velocidade</TableHead><TableHead>Data</TableHead><TableHead>Hora</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {historicoAlertas.length > 0 ? (
                        historicoAlertas.map((alerta, index) => {
                            const placa = alerta.controladora?.veiculo?.placa || alerta.veiculo?.placa || "N/A";
                            return (
                                <TableRow key={index}>
                                    <TableCell className="font-bold">{placa}</TableCell>
                                    <TableCell>{alerta.motorista || "Desconhecido"}</TableCell>
                                    <TableCell className="text-red-400 font-bold">{alerta.velocidade} km/h</TableCell>
                                    <TableCell>{alerta.dataHora ? new Date(alerta.dataHora).toLocaleDateString('pt-BR') : "-"}</TableCell>
                                    <TableCell>{alerta.dataHora ? new Date(alerta.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : "-"}</TableCell>
                                </TableRow>
                            );
                        })
                    ) : (
                        <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Nenhum alerta encontrado para o periodo selecionado.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

export default Alertas;
