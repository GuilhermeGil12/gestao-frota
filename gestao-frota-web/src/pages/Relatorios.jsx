import React, { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Search } from "lucide-react";

function Relatorios() {
    const [dataInicio, setDataInicio] = useState("");
    const [dataFim, setDataFim] = useState("");
    const [veiculoSelecionado, setVeiculoSelecionado] = useState("TODOS");

    const [resumo] = useState({
        distanciaTotal: "1.245",
        velocidadeMax: "112",
        tempoMovimento: "18h 30m"
    });

    const [historicoRotas] = useState([
        { id: 1, data: "10/03/2026 08:30", veiculo: "ABC-1234", motorista: "Guilherme Gil", velMax: "85 km/h", distancia: "45 km" },
        { id: 2, data: "11/03/2026 09:15", veiculo: "XYZ-9876", motorista: "Carlos Silva", velMax: "112 km/h", distancia: "120 km" }
    ]);

    const handleGerarRelatorio = () => {
        if (!dataInicio || !dataFim) { alert("Por favor, selecione as datas de inicio e fim!"); return; }
        console.log(`Buscando dados de ${dataInicio} ate ${dataFim} para o veiculo: ${veiculoSelecionado}`);
        alert("Simulando busca no banco de dados...");
    };

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
                <h1 className="text-xl font-semibold text-foreground">Relatorios de Telemetria</h1>
            </div>

            {/* Filtros */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-4 items-end flex-wrap">
                        <div className="flex-1 min-w-[200px] space-y-2">
                            <Label>Data Inicial</Label>
                            <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
                        </div>
                        <div className="flex-1 min-w-[200px] space-y-2">
                            <Label>Data Final</Label>
                            <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
                        </div>
                        <div className="flex-1 min-w-[200px] space-y-2">
                            <Label>Veiculo</Label>
                            <select value={veiculoSelecionado} onChange={(e) => setVeiculoSelecionado(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                                <option value="TODOS">Todos os Veiculos</option>
                                <option value="ABC-1234">ABC-1234 (Fiat Uno)</option>
                                <option value="XYZ-9876">XYZ-9876 (VW Gol)</option>
                            </select>
                        </div>
                        <Button onClick={handleGerarRelatorio}><Search className="h-4 w-4 mr-2" />Gerar</Button>
                    </div>
                </CardContent>
            </Card>

            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-6">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Distancia Percorrida</p>
                        <p className="text-3xl font-bold text-foreground">{resumo.distanciaTotal} <span className="text-base text-muted-foreground">km</span></p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500">
                    <CardContent className="pt-6">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Velocidade Maxima</p>
                        <p className="text-3xl font-bold text-foreground">{resumo.velocidadeMax} <span className="text-base text-muted-foreground">km/h</span></p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500">
                    <CardContent className="pt-6">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Tempo em Movimento</p>
                        <p className="text-3xl font-bold text-foreground">{resumo.tempoMovimento}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabela de Detalhes */}
            <Card>
                <CardHeader><CardTitle>Detalhamento das Viagens</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data/Hora</TableHead><TableHead>Veiculo</TableHead>
                                <TableHead>Motorista</TableHead><TableHead>Vel. Maxima</TableHead><TableHead>Distancia</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {historicoRotas.map((rota) => (
                                <TableRow key={rota.id}>
                                    <TableCell>{rota.data}</TableCell>
                                    <TableCell className="font-bold">{rota.veiculo}</TableCell>
                                    <TableCell className="text-muted-foreground">{rota.motorista}</TableCell>
                                    <TableCell className="text-red-400 font-bold">{rota.velMax}</TableCell>
                                    <TableCell className="text-green-400">{rota.distancia}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

export default Relatorios;
