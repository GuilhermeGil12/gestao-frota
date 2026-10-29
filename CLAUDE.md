# CLAUDE.md — Gestão de Frota

## Contexto do Projeto

Sistema de gestão de frotas veiculares — TCC (Trabalho de Conclusão de Curso). Público-alvo: gestores de frota e operadores que monitoram veículos, funcionários e dispositivos IoT (ESP32 com GPS e RFID). Objetivo: rastrear localização em tempo real, controlar acesso por cartão RFID e centralizar dados de veículos e funcionários.

O projeto é dividido em dois módulos independentes:
- **Backend**: Spring Boot (porta 8080)
- **Frontend**: React + Vite (porta 5173)

## Padrões Técnicos

### Backend
- **Linguagem:** Java 17
- **Framework:** Spring Boot 3.4.2
- **Build:** Maven — usar `./mvnw`, nunca `mvn` direto
- **ORM:** Spring Data JPA + Hibernate — queries via repository interfaces; evitar `@Query` nativo salvo quando necessário
- **Banco:** PostgreSQL na porta **5433** (não 5432)
- **Perfis locais:** `application-casa.properties` e `application-flash.properties` ficam fora do git (têm a senha do banco local) — cada máquina mantém o seu; `application-prod.properties` lê tudo de variáveis de ambiente
- **REST:** Controllers com `@CrossOrigin`; respostas em JSON; sem autenticação implementada ainda
- **Nomenclatura:** entidades e campos em português (ex: `Veiculo`, `placa`, `funcionario`)

### Frontend
- **Linguagem:** JavaScript/JSX — sem TypeScript
- **Framework:** React 19 com hooks funcionais — sem componentes de classe
- **Build:** Vite 7
- **Estilos:** Tailwind CSS 4 + shadcn/ui (Radix UI) — usar tokens CSS do design system, nunca cores hardcoded
- **HTTP:** Axios via instância em `services/api.js` (baseURL `http://localhost:8080/api`) — nunca usar `fetch` diretamente
- **Roteamento:** React Router DOM 7 — rotas definidas em `App.jsx`
- **Ícones:** lucide-react exclusivamente
- **Máscaras:** centralizadas em `utils/mascaras.js` — CPF, placa, CNH, telefone

## Regras de Código (Workflow)

Antes de qualquer commit no frontend:
```bash
cd gestao-frota-web
npm run lint
npm run build   # garante que não há erros de compilação
```

Antes de qualquer commit no backend:
```bash
./mvnw test
./mvnw package -DskipTests=false
```

## Restrições

- **Não instalar dependências** sem aprovação — frontend usa `npm install <pkg>`, backend edita `pom.xml`
- **Não usar cores CSS hardcoded** no frontend — usar sempre tokens Tailwind/CSS variables (`bg-card`, `text-foreground`, `border-border`)
- **Não usar `fetch`** — toda requisição HTTP passa pelo `api.js` (Axios)
- **Não criar novos arquivos de componente** fora de `components/ui/` (shadcn) ou `components/` (componentes customizados)
- **Não misturar lógica de negócio nos Controllers** — Services são obrigatórios como camada intermediária
- **Não alterar `application.properties`** sem documentar a mudança aqui
- **Não usar `@Query` nativo** sem justificativa — preferir métodos derivados do Spring Data

## Tom de Voz

Interface em **português brasileiro**. Labels, mensagens de erro, toasts e placeholders todos em pt-BR. Datas no formato `DD/MM/YYYY`. Notificações de sucesso via `sonner`; confirmações destrutivas via `sweetalert2`.
