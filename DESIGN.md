# DESIGN.md — Gestão de Frota

## Tema

Dark mode fixo. Sem toggle de tema claro. Fonte base: **Inter** (system-ui como fallback).

---

## Cores (Tokens CSS)

Definidos em `src/index.css` via `oklch`. Usar sempre as classes Tailwind correspondentes — nunca hexadecimal direto no JSX.

| Token CSS | Classe Tailwind | Uso |
|---|---|---|
| `--background` `oklch(0.145)` | `bg-background` | Fundo geral da aplicação |
| `--foreground` `oklch(0.985)` | `text-foreground` | Texto principal |
| `--card` `oklch(0.205)` | `bg-card` | Fundo de cards e painéis |
| `--card-foreground` `oklch(0.985)` | `text-card-foreground` | Texto dentro de cards |
| `--muted` `oklch(0.269)` | `bg-muted` | Fundo de campos, seções secundárias |
| `--muted-foreground` `oklch(0.708)` | `text-muted-foreground` | Texto secundário, labels, placeholders |
| `--border` `oklch(0.269)` | `border-border` | Bordas de inputs, cards, divisores |
| `--primary` `oklch(0.985)` | `bg-primary` / `text-primary` | Ações primárias (botão principal) |
| `--destructive` `oklch(0.396)` | `bg-destructive` | Ações destrutivas (deletar, desativar) |
| `--sidebar` `oklch(0.205)` | `bg-sidebar` | Fundo do menu lateral |
| `--sidebar-accent` `oklch(0.269)` | `bg-sidebar-accent` | Item ativo/hover no sidebar |
| `--sidebar-border` `oklch(0.269)` | `border-sidebar-border` | Borda do sidebar |

### Status de Veículo (cores semânticas utilitárias)

Estas cores são Tailwind utilitárias — usadas diretamente para badges de status:

| Status | Classe de fundo | Classe de texto |
|---|---|---|
| Em Movimento | `bg-green-500` | `text-green-400` |
| Parado | `bg-blue-500` | `text-blue-400` |
| Sem Rastreador | `bg-orange-500` | `text-orange-400` |
| Inativo | `bg-red-500` | `text-red-400` |

---

## Tipografia

| Elemento | Classe Tailwind |
|---|---|
| Título de página | `text-xl font-semibold text-foreground` |
| Subtítulo / label forte | `text-sm font-medium text-foreground` |
| Texto de apoio | `text-sm text-muted-foreground` |
| Texto de card | `text-[0.82rem] text-sidebar-foreground/60` |
| Tamanho base | `text-sm` (14px) |

---

## Espaçamento

Base: escala de **4px** (0.25rem). Valores padrão do Tailwind.

| Contexto | Valor |
|---|---|
| Gap entre cards no grid | `gap-4` (16px) |
| Padding interno de card | `CardHeader pb-3` + `CardContent space-y-2` |
| Padding de item de menu | `px-3.5 py-2.5` |
| Margem inferior de cabeçalho de página | `mb-6 pb-4` |
| Espaço entre itens do sidebar | `space-y-0.5` |

---

## Componentes

### Layout Principal
```
┌─────────────────────────────────────────────┐
│  Sidebar (fixo, 240px aberto / 56px fechado) │
│  bg-sidebar | border-r border-sidebar-border │
├─────────────────────────────────────────────┤
│  Conteúdo da página (ml auto, padding geral) │
│  bg-background                               │
└─────────────────────────────────────────────┘
```
- Sidebar colapsa com `transition-all duration-300`
- Logo com filtro `invert` (SVG branco sobre fundo escuro)

### Card
- Fundo: `bg-card`
- Borda: padrão `border-border` (via `@apply border-border` global)
- Border radius: `--radius: 0.625rem` (10px) → classe `rounded-lg`
- Hover: `hover:-translate-y-1 transition-transform duration-200`
- Sem sombra extra — o contraste de cor já separa do fundo

### Botão
Usar sempre o componente `<Button>` de `components/ui/button.jsx`.

| Variant | Uso |
|---|---|
| `default` | Ação primária (fundo branco, texto escuro) |
| `destructive` | Deletar, inativar, alertas críticos |
| `outline` | Ação secundária, cancelar, ver detalhes |
| `ghost` | Ações de ícone (ex: toggle do menu) |
| `link` | Navegação inline |

Tamanhos: `sm` (h-8) para ações dentro de cards, `default` (h-9) para formulários, `icon` (h-9 w-9) para botões de ícone isolado.

### Badge de Status
```jsx
<span className={`h-3 w-3 rounded-full ${status.cor} shadow-[0_0_8px] shadow-current`} />
```
Sempre acompanhado do texto de status na mesma linha com `flex items-center gap-2`.

### Inputs / Selects
- Fundo: `bg-muted` (`oklch(0.269)`)
- Borda: `border-border`
- Texto: `text-foreground`
- Selects nativos: estilizados via `select { background-color: var(--background) }` em `index.css`

### Modal / Dialog
Usar componentes Radix UI (`@radix-ui/react-dialog`). Confirmações destrutivas usam `sweetalert2` com tema dark (z-index `99999` via `.swal2-container`).

### Scrollbar
Scrollbar fina e discreta — width `6px`, thumb `oklch(0.4)`, hover `oklch(0.55)`, track transparente. Já configurado globalmente em `index.css`.

---

## Grid de Página

Padrão responsivo para listas de cards:
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
```

Cabeçalho de página padrão:
```jsx
<div className="flex items-center justify-between mb-6 border-b border-border pb-4">
  <h1 className="text-xl font-semibold text-foreground">Título da Página</h1>
  {/* botão de ação primária opcional */}
</div>
```
