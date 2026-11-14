import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
    MapPin, Send, ShieldCheck, Home, CalendarClock, BarChart3, WifiOff, CheckCircle2, Minus, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import BotaoTema from "@/components/BotaoTema";
import MapaAnimado from "@/components/MapaAnimado";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import logoLight from "@/assets/logocompleta-light.svg";
import logoDark from "@/assets/logocompleta-dark.svg";

const PRECO_APARELHO = 1050;

const PASSOS = [
    { titulo: "O motorista passa o cartão", texto: "O leitor fica no painel. Cada funcionário tem o seu cartão." },
    { titulo: "O carro libera", texto: "Só um cartão cadastrado e com a CNH em dia libera a ignição." },
    { titulo: "A viagem é registrada", texto: "Posição, velocidade e motorista vão pelo 4G para o sistema." },
    { titulo: "Você acompanha de onde estiver", texto: "Pelo navegador ou pelos avisos que chegam no Telegram." },
];

const RECURSOS = [
    { icone: MapPin, titulo: "Mapa ao vivo", texto: "Cada veículo no mapa, com motorista e velocidade, atualizado a cada 5 segundos." },
    { icone: ShieldCheck, titulo: "CNH vencida bloqueia o cartão", texto: "Quando a CNH vence, o cartão do motorista para de funcionar até ela ser validada." },
    { icone: Home, titulo: "Cerca na casa do funcionário", texto: "Criada sozinha no cadastro. Se o carro for para casa sem autorização, você recebe um alerta." },
    { icone: Send, titulo: "Avisos no Telegram", texto: "Excesso de velocidade, comandos executados e CNH vencendo chegam no celular." },
    { icone: CheckCircle2, titulo: "Bloqueio com confirmação", texto: "Você bloqueia pelo site e vê a hora em que a caixa realmente executou." },
    { icone: CalendarClock, titulo: "Relatório semanal", texto: "Toda segunda, cada líder recebe como a sua equipe dirigiu na semana." },
    { icone: BarChart3, titulo: "Relatórios por motorista", texto: "Distância, excessos, freadas e viradas bruscas, em PDF com o nome da empresa." },
    { icone: WifiOff, titulo: "Funciona sem sinal", texto: "Os cartões ficam gravados na caixa e a viagem é enviada quando o sinal volta." },
];

const PLANOS = [
    {
        nome: "Essencial",
        preco: 69,
        resumo: "Para saber onde cada carro está.",
        itens: ["Mapa ao vivo e rotas", "Relatórios em PDF", "Avisos no Telegram"],
    },
    {
        nome: "Gestão",
        preco: 89,
        resumo: "Para controlar quem dirige.",
        itens: ["Tudo do Essencial", "Carro só liga com cartão", "Bloqueio por CNH vencida", "Perfil do motorista e relatório semanal"],
        destaque: true,
    },
    {
        nome: "Completo",
        preco: 119,
        resumo: "Para agir à distância.",
        itens: ["Tudo do Gestão", "Bloqueio remoto e cercas", "Setores, líderes e permissões", "Suporte prioritário"],
    },
];

const reais = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function Apresentacao() {
    const { tema } = useTheme();
    const { autenticado } = useAuth();
    const [veiculos, setVeiculos] = useState(5);
    const raiz = useRef(null);

    // Cada elemento com a classe "revelar" aparece quando entra na tela (uma vez só).
    useEffect(() => {
        const observador = new IntersectionObserver((entradas) => {
            entradas.forEach((e) => {
                if (e.isIntersecting) {
                    e.target.classList.add("visivel");
                    observador.unobserve(e.target);
                }
            });
        }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

        raiz.current?.querySelectorAll(".revelar").forEach((el) => observador.observe(el));
        return () => observador.disconnect();
    }, []);

    const mudarVeiculos = (n) => setVeiculos(Math.min(500, Math.max(1, Number.isFinite(n) ? n : 1)));

    const acesso = autenticado
        ? { para: "/dashboard", rotulo: "Abrir o painel" }
        : { para: "/login", rotulo: "Entrar" };

    return (
        <div ref={raiz} className="min-h-svh bg-background text-foreground">
            {/* Topo */}
            <header className="entrada sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
                    <a href="#inicio" className="shrink-0 rounded-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
                        <img src={tema === "dark" ? logoDark : logoLight} alt="Frota System" className="w-[120px]" />
                    </a>
                    <nav className="hidden items-center gap-1 md:flex" aria-label="Seções">
                        <Button variant="ghost" size="sm" asChild><a href="#ideia">Como funciona</a></Button>
                        <Button variant="ghost" size="sm" asChild><a href="#recursos">Recursos</a></Button>
                        <Button variant="ghost" size="sm" asChild><a href="#planos">Planos</a></Button>
                    </nav>
                    <div className="flex items-center gap-1">
                        <BotaoTema />
                        <Button asChild size="sm"><Link to={acesso.para}>{acesso.rotulo}</Link></Button>
                    </div>
                </div>
            </header>

            <main>
                {/* Abertura */}
                <section id="inicio" className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-12 pb-20 sm:px-6 md:grid-cols-[1fr_1.05fr] md:pt-20 md:pb-28">
                    <div className="max-w-xl">
                        <h1 className="entrada text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl" style={{ "--ordem": 0 }}>
                            Saiba quem está dirigindo cada carro da sua empresa.
                        </h1>
                        <p className="entrada mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg" style={{ "--ordem": 1 }}>
                            O Frota System libera o veículo só com o cartão do motorista, mostra onde cada um está e avisa você no celular quando algo foge do combinado.
                        </p>
                        <div className="entrada mt-8 flex flex-wrap gap-3" style={{ "--ordem": 2 }}>
                            <Button asChild size="lg"><a href="#ideia">Conhecer a ideia</a></Button>
                            <Button asChild size="lg" variant="outline"><Link to={acesso.para}>{autenticado ? "Abrir o painel" : "Entrar no sistema"}</Link></Button>
                        </div>
                    </div>
                    <div className="entrada" style={{ "--ordem": 3 }}>
                        <MapaAnimado />
                    </div>
                </section>

                {/* A ideia */}
                <section id="ideia" className="scroll-mt-16 border-t bg-card">
                    <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 md:grid-cols-[0.9fr_1.1fr] md:py-28">
                        <div className="max-w-md">
                            <h2 className="revelar text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
                                Quando ninguém sabe quem estava ao volante, a empresa paga a conta.
                            </h2>
                            <div className="mt-6 space-y-4 text-muted-foreground">
                                <p className="revelar de-lado" style={{ "--ordem": 1 }}>Se a empresa não indica quem dirigia, recebe uma segunda multa e o valor dobra.</p>
                                <p className="revelar de-lado" style={{ "--ordem": 2 }}>Entregar o carro a quem está com a CNH vencida há mais de 30 dias é infração gravíssima para o dono do veículo.</p>
                                <p className="revelar de-lado" style={{ "--ordem": 3 }}>E na empresa pequena quase nunca há alguém só para cuidar da frota.</p>
                            </div>
                        </div>

                        <ol className="space-y-0">
                            {PASSOS.map((p, i) => (
                                <li key={p.titulo} className="revelar grid grid-cols-[3rem_1fr] gap-4 border-b py-6 first:pt-0 last:border-b-0" style={{ "--ordem": i }}>
                                    <span className="numero-passo flex size-10 items-center justify-center rounded-full border text-sm font-semibold tabular-nums">{i + 1}</span>
                                    <span>
                                        <span className="block text-lg font-medium">{p.titulo}</span>
                                        <span className="mt-1 block text-muted-foreground">{p.texto}</span>
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>

                {/* Recursos */}
                <section id="recursos" className="scroll-mt-16 border-t">
                    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
                        <h2 className="revelar max-w-2xl text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
                            O sistema trabalha sozinho e só chama você quando precisa.
                        </h2>
                        <dl className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2">
                            {RECURSOS.map(({ icone, titulo, texto }, i) => {
                                const Icone = icone;
                                return (
                                <div key={titulo} className="revelar item-recurso grid grid-cols-[2.5rem_1fr] gap-4" style={{ "--ordem": i % 2 }}>
                                    <span className="icone-recurso flex size-10 items-center justify-center rounded-lg bg-muted">
                                        <Icone className="size-5" aria-hidden="true" />
                                    </span>
                                    <span>
                                        <dt className="font-medium">{titulo}</dt>
                                        <dd className="mt-1 text-muted-foreground">{texto}</dd>
                                    </span>
                                </div>
                                );
                            })}
                        </dl>
                    </div>
                </section>

                {/* Planos */}
                <section id="planos" className="scroll-mt-16 border-t bg-card">
                    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
                        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
                            <div className="revelar max-w-xl">
                                <h2 className="text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">Planos</h2>
                                <p className="mt-4 text-muted-foreground">
                                    O aparelho custa {reais(PRECO_APARELHO)} por veículo, pago uma vez. Depois, uma mensalidade por veículo. Sem fidelidade.
                                </p>
                            </div>

                            <div className="revelar flex items-center gap-3" style={{ "--ordem": 1 }}>
                                <label htmlFor="qtd-veiculos" className="text-sm text-muted-foreground">Quantos veículos?</label>
                                <div className="flex items-center rounded-lg border bg-background">
                                    <Button variant="ghost" size="icon" onClick={() => mudarVeiculos(veiculos - 1)} aria-label="Menos um veículo"><Minus /></Button>
                                    <input
                                        id="qtd-veiculos"
                                        type="number"
                                        inputMode="numeric"
                                        min="1"
                                        max="500"
                                        value={veiculos}
                                        onChange={(e) => mudarVeiculos(parseInt(e.target.value, 10))}
                                        className="w-14 bg-transparent text-center text-base font-semibold tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    <Button variant="ghost" size="icon" onClick={() => mudarVeiculos(veiculos + 1)} aria-label="Mais um veículo"><Plus /></Button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-10 grid gap-4 lg:grid-cols-3">
                            {PLANOS.map((p, i) => (
                                <div key={p.nome} className="revelar crescer flex" style={{ "--ordem": i }}>
                                <article
                                    className={cn(
                                        "flutuar flex w-full flex-col rounded-2xl border bg-background p-6",
                                        p.destaque && "border-foreground ring-1 ring-foreground"
                                    )}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <h3 className="text-lg font-semibold">{p.nome}</h3>
                                        {p.destaque && <span className="selo-pulsar rounded-full bg-foreground px-2.5 py-0.5 text-xs font-medium text-background">Recomendado</span>}
                                    </div>
                                    <p className="mt-1 text-sm text-muted-foreground">{p.resumo}</p>
                                    <p className="mt-6 text-4xl font-semibold tracking-tight tabular-nums">
                                        {reais(p.preco)}<span className="text-base font-normal text-muted-foreground"> por veículo/mês</span>
                                    </p>

                                    <ul className="mt-6 flex-1 space-y-2.5">
                                        {p.itens.map((item) => (
                                            <li key={item} className="flex gap-2.5 text-sm">
                                                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>

                                    <div className="mt-6 space-y-1.5 border-t pt-5 text-sm" aria-live="polite">
                                        <p className="flex justify-between gap-2">
                                            <span className="text-muted-foreground">{veiculos} {veiculos === 1 ? "aparelho" : "aparelhos"}, uma vez</span>
                                            <span key={veiculos} className="valor-mudou inline-block font-medium tabular-nums">{reais(veiculos * PRECO_APARELHO)}</span>
                                        </p>
                                        <p className="flex justify-between gap-2">
                                            <span className="text-muted-foreground">Mensalidade</span>
                                            <span key={veiculos} className="valor-mudou inline-block font-medium tabular-nums">{reais(veiculos * p.preco)}/mês</span>
                                        </p>
                                    </div>
                                </article>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Fechamento */}
                <section className="border-t">
                    <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-20 sm:px-6 md:flex-row md:items-center md:justify-between">
                        <h2 className="revelar de-lado max-w-xl text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl">
                            Já usa o Frota System? Entre e veja a sua frota agora.
                        </h2>
                        <Button asChild size="lg" className="revelar crescer" style={{ "--ordem": 2 }}><Link to={acesso.para}>{autenticado ? "Abrir o painel" : "Entrar no sistema"}</Link></Button>
                    </div>
                </section>
            </main>

            <footer className="border-t">
                <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:justify-between sm:px-6">
                    <span>© 2026 Frota System</span>
                    <span>Projeto de TCC de Engenharia da Computação, UNIFEV</span>
                </div>
            </footer>
        </div>
    );
}

export default Apresentacao;
