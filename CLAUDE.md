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
- **Telegram:** `application.properties` ganhou `app.telegram.token=${TELEGRAM_TOKEN:}` — token do bot (avisos no Telegram). Vazio = integração desligada. Nunca commitar o token: em dev, pôr no perfil local fora do git; na VM, variável de ambiente `TELEGRAM_TOKEN`
- **Segurança:** ver `SEGURANCA.md` (estado atual e pendências). `application.properties` ganhou:
  - `app.cors.origens=${CORS_ORIGENS:https://frotasystem.com,https://*.frotasystem.com,http://localhost:5173,http://*.localhost:5173}` — sites que podem chamar a API pelo navegador. **O domínio de produção precisa estar na lista**: atrás do Cloudflare/Nginx o Spring vê a requisição como `localhost:8080`, então até o próprio site conta como "outro endereço" (sem ele, 403 em todos os arquivos do site). Para testar CORS, mandar o cabeçalho `Origin` (`curl -H "Origin: https://frotasystem.com" ...`)
  - `app.login.max-tentativas=5` e `app.login.bloqueio-minutos=15` — limite de senhas erradas por e-mail
  - `app.mqtt.acesso-por-controladora=${MQTT_ACESSO_POR_CONTROLADORA:false}` — liga o login próprio de cada controladora no broker (plugin dynamic-security do Mosquitto; o backend cria/atualiza/remove o usuário junto com o cadastro). Só ligar depois de configurar o broker (passo a passo no `SEGURANCA.md`, seção 3)
  - No perfil `prod`, o sistema **não sobe** sem `JWT_SECRET`, `ADMIN_SENHA`, `MQTT_BROKER` e `MQTT_USER` (`VerificacaoSegurancaProducao`)
- **REST:** respostas em JSON; login com JWT; permissões com `@PreAuthorize` em todo controller. A controladora fala **só por MQTT** — não criar rotas HTTP abertas para o ESP
- **Controladora:** identidade = IMEI do modem; ela se apresenta em `provisionamento/<imei>` e o gestor aprova no site (não existe mais cadastro manual). Tópicos `frota/<codigo>/...` com `codigo = Controladora.getCodigoMqtt()` (IMEI; o número só para firmware antigo). Plano das etapas e o que falta: `PLANO_CONTROLADORA.md`
- **Nomenclatura:** entidades e campos em português (ex: `Veiculo`, `placa`, `funcionario`)

### Frontend
- **Linguagem:** JavaScript/JSX — sem TypeScript
- **Framework:** React 19 com hooks funcionais — sem componentes de classe
- **Build:** Vite 7
- **Estilos:** Tailwind CSS 4 + shadcn/ui (Radix UI) — usar tokens CSS do design system, nunca cores hardcoded
- **HTTP:** Axios via instância em `services/api.js` (baseURL `http://localhost:8080/api`) — nunca usar `fetch` diretamente
- **Roteamento:** React Router DOM 7 — rotas definidas em `App.jsx`
- **Ícones:** lucide-react exclusivamente
- **Máscaras:** centralizadas em `utils/mascaras.js` — CPF, RG, placa, telefone, CEP, MAC, IP, UID do cartão, só-números (CNH/RENAVAM)
- **Validações:** centralizadas em `utils/validacoes.js` (cada função devolve `null` ou a mensagem de erro). Nos formulários: `useErros()` (`utils/useErros.js`) + componente `Campo` (rótulo, borda vermelha e erro embaixo; id do campo = `campo-<nome>`). As mesmas regras existem no backend em `util/Validacoes.java`, chamadas nos Services — ao criar um campo novo, validar nos dois lados

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
