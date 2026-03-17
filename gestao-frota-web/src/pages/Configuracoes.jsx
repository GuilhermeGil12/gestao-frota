import React, { useState } from "react";
import { toast } from "react-toastify";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Switch } from "../components/ui/switch";
import { Save, Download } from "lucide-react";

function Configuracoes() {
    const [diasCnh, setDiasCnh] = useState(30);
    const [kmRevisao, setKmRevisao] = useState(10000);
    const [bloquearCnhVencida, setBloquearCnhVencida] = useState(true);
    const [bloquearMadrugada, setBloquearMadrugada] = useState(false);
    const [nomeEmpresa, setNomeEmpresa] = useState("Transportes Silva Ltda");

    const handleSalvar = () => {
        console.log("Salvando:", { diasCnh, kmRevisao, bloquearCnhVencida, bloquearMadrugada, nomeEmpresa });
        toast.success("Configuracoes salvas com sucesso!");
    };

    const handleBackup = () => { toast.info("Gerando arquivo de backup (.csv)..."); };

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
                <h1 className="text-xl font-semibold text-foreground">Configuracoes do Sistema</h1>
                <Button onClick={handleSalvar}><Save className="h-4 w-4 mr-2" />Salvar Alteracoes</Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* Card 1: Regras de Seguranca */}
                <Card>
                    <CardHeader>
                        <CardTitle>Regras de Seguranca</CardTitle>
                        <CardDescription>Controle os bloqueios automaticos dos crachas.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">Bloquear CNH Vencida</Label>
                                <p className="text-xs text-muted-foreground max-w-[250px]">Impede o motorista de acessar o veiculo se a CNH expirar.</p>
                            </div>
                            <Switch checked={bloquearCnhVencida} onCheckedChange={setBloquearCnhVencida} />
                        </div>
                        <div className="flex items-center justify-between border-t border-border pt-4">
                            <div className="space-y-0.5">
                                <Label className="text-base">Bloqueio de Madrugada</Label>
                                <p className="text-xs text-muted-foreground max-w-[250px]">Bloqueia acessos fora do horario comercial (22h - 06h).</p>
                            </div>
                            <Switch checked={bloquearMadrugada} onCheckedChange={setBloquearMadrugada} />
                        </div>
                    </CardContent>
                </Card>

                {/* Card 2: Alertas do Sistema */}
                <Card>
                    <CardHeader>
                        <CardTitle>Alertas do Sistema</CardTitle>
                        <CardDescription>Quando o painel deve te avisar dos problemas.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <Label>Aviso previo de CNH (Dias)</Label>
                            <Input type="number" value={diasCnh} onChange={(e) => setDiasCnh(e.target.value)} className="w-24 text-center" />
                        </div>
                        <div className="flex items-center justify-between border-t border-border pt-4">
                            <Label>Aviso de Revisao (A cada X km)</Label>
                            <Input type="number" value={kmRevisao} onChange={(e) => setKmRevisao(e.target.value)} className="w-28 text-center" step="1000" />
                        </div>
                    </CardContent>
                </Card>

                {/* Card 3: Personalizacao e Dados */}
                <Card>
                    <CardHeader>
                        <CardTitle>Personalizacao e Dados</CardTitle>
                        <CardDescription>Ajustes gerais e backup de informacoes.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nome da Empresa (Para relatorios)</Label>
                            <Input type="text" value={nomeEmpresa} onChange={(e) => setNomeEmpresa(e.target.value)} />
                        </div>
                        <div className="border-t border-border pt-4">
                            <Button variant="outline" className="w-full" onClick={handleBackup}>
                                <Download className="h-4 w-4 mr-2" />Exportar Backup (CSV)
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Card 4: Alertas */}
                <Card>
                    <CardHeader>
                        <CardTitle>Alertas</CardTitle>
                        <CardDescription>Visualizar alertas</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        </div>
    );
}

export default Configuracoes;
