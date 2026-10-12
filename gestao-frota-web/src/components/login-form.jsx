import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff, Truck, MapPin, ShieldCheck } from "lucide-react"
import { useState } from "react"
import { useTheme } from "../context/ThemeContext"
import logoLight from "../assets/logocompleta-light.svg"
import logoDark from "../assets/logocompleta-dark.svg"

export function LoginForm({
  className, email, senha, setEmail, setSenha, handleLogin, carregando = false,
  ...props
}) {
  const { tema } = useTheme()
  const [verSenha, setVerSenha] = useState(false)

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-10" onSubmit={handleLogin}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-4 text-center">
                <img
                  src={tema === "dark" ? logoDark : logoLight}
                  alt="FrotaSystem"
                  className="w-[180px]"
                />
                <div className="space-y-1">
                  <h1 className="text-2xl font-bold text-foreground">Bem-vindo de volta</h1>
                  <p className="text-sm text-muted-foreground">
                    Entre com suas credenciais para acessar o sistema
                  </p>
                </div>
              </div>

              <Field>
                <FieldLabel htmlFor="email">E-mail</FieldLabel>
                <Input
                  value={email}
                  id="email"
                  type="email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  required
                />
              </Field>

              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="senha">Senha</FieldLabel>
                  <a
                    href="#"
                    className="ml-auto text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Esqueceu a senha?
                  </a>
                </div>
                <div className="relative">
                  <Input
                    value={senha}
                    id="senha"
                    type={verSenha ? "text" : "password"}
                    className="pr-10"
                    onChange={(e) => setSenha(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setVerSenha(!verSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
                    aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {verSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </Field>

              <Field>
                <Button type="submit" disabled={carregando}>
                  {carregando ? "Entrando..." : "Entrar"}
                </Button>
              </Field>

              <p className="text-center text-xs text-muted-foreground">
                Problemas para acessar? Procure o administrador do sistema.
              </p>
            </FieldGroup>
          </form>

          <div className="relative hidden flex-col justify-center gap-8 bg-sidebar p-10 md:flex">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-sidebar-foreground">
                Sua frota sob controle
              </h2>
              <p className="text-sm text-muted-foreground">
                Acompanhe veículos, motoristas e acessos em um só lugar.
              </p>
            </div>

            <ul className="space-y-5">
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-sidebar-foreground">Rastreamento em tempo real</p>
                  <p className="text-xs text-muted-foreground">Localização e rotas percorridas por veículo.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-sidebar-foreground">Controle de acesso</p>
                  <p className="text-xs text-muted-foreground">Liberação por cartão RFID vinculado ao motorista.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Truck className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-sidebar-foreground">Gestão centralizada</p>
                  <p className="text-xs text-muted-foreground">Veículos, funcionários e dispositivos integrados.</p>
                </div>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
