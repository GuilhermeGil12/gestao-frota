import { useState, useEffect } from "react";
import api from "../services/api";
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "../components/ui/alert-dialog";

import { Ellipsis } from "lucide-react";

function Dashboard() {
    const [veiculoBloquear, setVeiculoBloquear] = useState(null)
  const [veiculos, setVeiculos] = useState([]);

  const carregarDados = async () => {
    try {
      const resVeiculos = await api.get("/veiculos");

      if (Array.isArray(resVeiculos.data)) {
        const listaVeiculos = resVeiculos.data;

        const veiculosTurbinados = await Promise.all(
          listaVeiculos.map(async (veiculo) => {
            try {
              const resLoc = await api.get(`/localizacao/ultima/${veiculo.id}`);
              return { ...veiculo, ultimaLocalizacao: resLoc.data || null };
            } catch (err) {
              console.error(
                `O carro ${veiculo.placa} ainda nao tem localizacao no banco.`,
              );
              return { ...veiculo, ultimaLocalizacao: null };
            }
          }),
        );

        setVeiculos(veiculosTurbinados);
      } else {
        setVeiculos([]);
      }
    } catch (error) {
      console.error("Erro ao carregar veiculos para o Dashboard:", error);
      setVeiculos([]);
    }
  };

  const confirmarBloqueio = async () => {
    if (!veiculoBloquear) return;

    const idControladora = veiculoBloquear.controladora?.idControladora;
    if (!idControladora) {
      toast.error("Este veículo não tem controladora vinculada.");
      setVeiculoBloquear(null);
      return;
    }

    try {
      const resp = await api.post(`/comandos/${idControladora}`, { tipo: "BLOQUEAR" });
      toast.success(`Comando enviado! O veículo ${veiculoBloquear.placa} será bloqueado em até 10 segundos.`);
    } catch (e) {
      toast.error("Não foi possível bloquear o veículo.");
    } finally {
      setVeiculoBloquear(null);
    }
  };

  // Faz o carro apitar (localizar/alertar) — não precisa de confirmação, é inofensivo
  const apitarVeiculo = async (veiculo) => {
    const idControladora = veiculo.controladora?.idControladora;
    if (!idControladora) {
      toast.error("Este veículo não tem controladora vinculada.");
      return;
    }
    try {
      await api.post(`/comandos/${idControladora}`, { tipo: "APITAR" });
      toast.success(`Comando enviado! ${veiculo.placa} vai apitar em até ~10s.`);
    } catch (e) {
      toast.error("Não foi possível enviar o comando de apito.");
    }
  };



  useEffect(() => {
    carregarDados();
    const intervalo = setInterval(() => {
      carregarDados();
    }, 30000);
    return () => clearInterval(intervalo);
  }, []);

  const formatarData = (dataString) => {
    if (!dataString) return "Sem sinal";
    const data = new Date(dataString);
    return data.toLocaleString("pt-BR");
  };

  const definirStatus = (veiculo) => {
    if (!veiculo.ativo)
      return { texto: "Inativo", cor: "bg-red-500", textCor: "text-red-400" };
    if (!veiculo.controladora)
      return {
        texto: "Sem Rastreador",
        cor: "bg-orange-500",
        textCor: "text-orange-400",
      };
    const loc = veiculo.ultimaLocalizacao;
    if (loc && loc.velocidade > 0)
      return {
        texto: "Em Movimento",
        cor: "bg-green-500",
        textCor: "text-green-400",
      };
    return { texto: "Parado", cor: "bg-blue-500", textCor: "text-blue-400" };
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
        <h1 className="text-xl font-semibold text-foreground">
          Dashboard de Monitoramento
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {!Array.isArray(veiculos) || veiculos.length === 0 ? (
          <p className="text-muted-foreground text-center col-span-full">
            Nenhum veiculo cadastrado no sistema.
          </p>
        ) : (
          veiculos.map((veiculo) => {
            const status = definirStatus(veiculo);
            const loc = veiculo.ultimaLocalizacao;

            return (
              <Card
                key={veiculo.id}
                className="hover:-translate-y-1 transition-transform duration-200"
              >
                <CardHeader className="pb-3">
                  <CardTitle
                    className={`flex items-center gap-2 text-base ${status.textCor}`}
                  >
                    <span
                      className={`h-3 w-3 rounded-full ${status.cor} shadow-[0_0_8px] shadow-current`}
                    ></span>
                    {status.texto}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild className="ml-auto">
                        <Ellipsis className="cursor-pointer text-muted-foreground" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
                        <DropdownMenuItem>Ver no mapa</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => apitarVeiculo(veiculo)}>
                          🔔 Apitar (localizar)
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-500" onClick={() => setVeiculoBloquear(veiculo)}>
                          Bloquear veículo
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <strong className="text-foreground">Placa</strong>
                    <span className="uppercase">{veiculo.placa}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <strong className="text-foreground">Motorista</strong>
                    {loc && loc.motorista ? loc.motorista : "Nenhum"}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <strong className="text-foreground">Velocidade</strong>
                    {loc && loc.velocidade !== null
                      ? `${loc.velocidade} km/h`
                      : "0 km/h"}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <strong className="text-foreground">Data/Hora</strong>
                    {loc && loc.dataHora
                      ? formatarData(loc.dataHora)
                      : "Aguardando sinal..."}
                  </div>

                  <div className="flex gap-2 pt-3">
                    {/* <Button variant="destructive" className="flex-1" size="sm">
                      Ver no Mapa
                    </Button>
                    <Button variant="outline" className="flex-1" size="sm">
                      Historico
                    </Button>
                    <Button variant="destructive" className="flex-1" size="sm">
                      Bloquear
                    </Button> */}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <AlertDialog open={veiculoBloquear !== null} onOpenChange={(open) => !open && setVeiculoBloquear(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                            <span>
                                Deseja BLOQUEAR o veículo <strong className="font-bold text-foreground">{veiculoBloquear?.placa}</strong>? 
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmarBloqueio}>
                            Sim, Bloquear
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
    </div>
  );
}

export default Dashboard;
