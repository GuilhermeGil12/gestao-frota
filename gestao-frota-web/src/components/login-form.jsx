import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff, ArrowLeft, Loader2 } from "lucide-react"
import { Link } from "react-router-dom"
import MapaAnimado from "@/components/MapaAnimado"
import { useState } from "react"
import { useTheme } from "../context/ThemeContext"
import logoLight from "../assets/logocompleta-light.svg"
import logoDark from "../assets/logocompleta-dark.svg"

export function LoginForm({
  className, email, senha, setEmail, setSenha, handleLogin, carregando = false, erro = false, aoFimDoErro,
  ...props
}) {
  const { tema } = useTheme()
  const [verSenha, setVerSenha] = useState(false)

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className={cn("entrada overflow-hidden p-0", erro && "balancar")} onAnimationEnd={(e) => { if (e.animationName === "balancar") aoFimDoErro?.() }}>
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-10" onSubmit={handleLogin}>
            <Link
              to="/"
              className="mb-6 inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <ArrowLeft className="size-4" /> Voltar ao início
            </Link>
            <FieldGroup>
              <div className="entrada flex flex-col items-center gap-4 text-center" style={{ "--ordem": 1 }}>
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

              <Field className="entrada" style={{ "--ordem": 2 }}>
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

              <Field className="entrada" style={{ "--ordem": 3 }}>
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

              <Field className="entrada" style={{ "--ordem": 4 }}>
                <Button type="submit" disabled={carregando}>
                  {carregando && <Loader2 className="animate-spin" />}
                  {carregando ? "Entrando..." : "Entrar"}
                </Button>
              </Field>

              <p className="text-center text-xs text-muted-foreground">
                Problemas para acessar? Procure o administrador do sistema.
              </p>
            </FieldGroup>
          </form>

          <div className="relative hidden flex-col justify-center gap-6 bg-sidebar p-8 md:flex">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-sidebar-foreground">
                Sua frota sob controle
              </h2>
              <p className="text-sm text-muted-foreground">
                Quem está dirigindo, onde cada carro está e o que aconteceu na viagem.
              </p>
            </div>
            <MapaAnimado compacto />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
