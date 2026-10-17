import React, { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Search, Download, Grid } from "lucide-react";
import api from '../services/api';
import { toast } from "sonner";
import  {  jsPDF  }  from  'jspdf' 
import  {  autoTable  }  from  'jspdf-autotable'
import Paginacao from "../components/Paginacao";
import { usePaginacao } from "../utils/usePaginacao";



function Relatorios() {

    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');

    const dataAtualFormatada = `${ano}-${mes}-${dia}`;

    const [dataInicio, setDataInicio] = useState(dataAtualFormatada);
    const [dataFim, setDataFim] = useState(dataAtualFormatada);
    const [veiculosReais, setVeiculosReais] = useState([]);
    const [veiculoSelecionado, setVeiculoSelecionado] = useState("TODOS");

    

    

    // Modifique estes dois para iniciarem vazios/dinâmicos:
    const [dadosRelatorio, setDadosRelatorio] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api.get("/veiculos")
            .then(response => setVeiculosReais(response.data))
            .catch(error => { console.error("Erro ao carregar veiculos:", error); toast.error("Não foi possível carregar a lista de veículos."); });
        handleGerarRelatorio();
    }, []);





    const handleGerarRelatorio = async () => {
        if (!dataInicio || !dataFim) {
            toast.error("Por favor, selecione as datas de início e fim!");
            return;
        }

        setLoading(true);
        
            
            try {
                const inicioFormatado = `${dataInicio}T00:00:00`;
                const fimFormatado = `${dataFim}T23:59:59`;

                const params = {inicio: inicioFormatado, fim: fimFormatado};
                        
                if (veiculoSelecionado !== "TODOS") {
                    
                    params.idVeiculo = veiculoSelecionado;
                    
                };

                const response = await api.get("/localizacao/relatorio-km",
                    {params}
                );



                if(response.data.length == 0){
                    toast.error("Nenhum relatório encontrado no período selecionado")
                    
                }
                else{
                    setDadosRelatorio(response.data);
                    toast.success("Relatório carregado com sucesso!")
                }

                

                
            
        
             } catch (error) {
                console.error("Erro ao carregar relatório", error);

            }finally{
                setLoading(false);
            

        
            }
    };

    const handleBaixarPDF = async () => {
        if(dadosRelatorio.length == 0){
            toast.error("É necessário gerar o relatório para fazer o download")
            return;
        };

        const  doc  =  new  jsPDF ( )

        autoTable ( doc,  {theme: 'grid',  html : '#tabela-relatorio'  } )
        doc.save('relatorio.pdf')
        
            
    };

    const paginacao = usePaginacao(dadosRelatorio, 20);

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
                <h1 className="text-xl font-semibold text-foreground">Relatórios de Telemetria</h1>
                <Button variant= "outline" onClick={handleBaixarPDF}><Download className="h-4 w-4 mr-2" />Baixar</Button>
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
                            <Label>Veículo</Label>
                            <select value={veiculoSelecionado} onChange={(e) => setVeiculoSelecionado(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                                <option value="TODOS">Todos os Veículos</option>
                                {veiculosReais.map((v) => (<option key={v.id_veiculo || v.id} value={v.id_veiculo || v.id}>{v.placa} - {v.modelo}</option>))}

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
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Distância Percorrida</p>
                        <p className="text-3xl font-bold text-foreground">{dadosRelatorio.reduce((acc, curr) => acc + curr.kmRodados, 0).toFixed(2)} <span className="text-base text-muted-foreground">km</span></p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500">
                    <CardContent className="pt-6">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Velocidade Máxima</p>
                        <p className="text-3xl font-bold text-foreground">
                            {dadosRelatorio.length > 0
                                ? Math.max(...dadosRelatorio.map(item => item.velocidadeMaxima || 0)).toFixed(0)
                                : "0"
                            }
                            <span className="text-base text-muted-foreground"> km/h</span>
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500">
                    <CardContent className="pt-6">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Tempo em Movimento</p>
                        <p className="text-3xl font-bold text-foreground">{ }</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabela de Detalhes */}
            <Card>
                <CardHeader><CardTitle>Detalhamento das Viagens</CardTitle></CardHeader>
                <CardContent>
                    <Table id="tabela-relatorio">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data/Hora</TableHead><TableHead>Veículo</TableHead>
                                <TableHead>Motorista</TableHead><TableHead>Vel. Máxima</TableHead><TableHead>Distância</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginacao.visiveis.map((item) => (
                                <TableRow key={item.idVeiculo}>
                                    <TableCell>{dataInicio} até {dataFim}</TableCell> {/* Período */}
                                    <TableCell className="font-bold">{item.placa}</TableCell>
                                    <TableCell className="text-muted-foreground">{item.motorista}</TableCell>
                                    <TableCell className="text-blue-400 font-bold">{item.velocidadeMaxima} km/h</TableCell>
                                    <TableCell className="text-green-400">{item.kmRodados.toFixed(2)} km</TableCell>
                                    <TableCell className="">
                                        <div className="flex gap-2">
                                        <Button onClick={handleGerarRelatorio} variant= "outline"><Search className="h-4 w-4" />Ver detalhes</Button>
                                        <Button variant= "outline"><Download className="h-4 w-4" /></Button>
                                        </div>
                                    </TableCell>
                                    
                                </TableRow>
                            ))}
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
                </CardContent>
            </Card>
        </div>
    );
}

export default Relatorios;
