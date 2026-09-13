![Bonsai Banner](./src/assets/banner.png)

## 📌 Sobre o Projeto

O **Bonsai** nasceu como um **projeto estritamente pessoal**. Desenvolvi essa aplicação para resolver minhas próprias dores no dia a dia: acompanhar despesas de forma imediata pelo celular, saber com precisão cirúrgica em qual fatura do cartão uma compra vai cair, controlar assinaturas recorrentes sem poluir a base de dados com previsões artificiais e visualizar a evolução do orçamento mensal e anual — tudo isso **sem abrir planilhas lentas** e **sem a burocracia, anúncios ou conexões bancárias instáveis** de aplicativos comerciais tradicionais.

Por ser um projeto feito sob medida para o meu uso, o Bonsai **não possui tela de cadastro público aberta para a internet**. Se você quiser utilizá-lo, o caminho é **subir a sua própria instância privada (self-host)**, mantendo controle total e privacidade absoluta sobre seus dados e credenciais.

Se você gostou da proposta e quer ter o seu próprio Bonsai rodando de graça na nuvem (usando os planos gratuitos do **Supabase** e da **Vercel**), preparei um **[Guia Passo a Passo Completo](#-guia-passo-a-passo-subindo-sua-própria-instância)** detalhado logo abaixo.

---

## ✨ Funcionalidades do Sistema


### 📊 Dashboard Dinâmico (Mensal & Anual)

- **Agrupamento por Competência Real:**
    - Despesas no **PIX** caem no mês civil em que foram pagas.
    - Despesas no **Cartão** caem no mês de vencimento da respectiva fatura.
- **Resumo & Comparativo Temporal:** Total gasto no período com cálculo automático de variação percentual em relação ao mês ou ano anterior.
- **Teto de Gastos / Orçamento (Budget Bar):** Defina sua meta mensal nos Ajustes; o dashboard calcula o consumo proporcional e exibe alertas visuais claros caso o orçamento seja ultrapassado.
- **Gráficos Visuais com Recharts:**
    - Distribuição percentual e por valor de despesas por categoria.
    - Evolução cronológica histórica de gastos.
    - Gráfico de linha de tendência na visão anual.
- **KPIs Rápidos:** Métricas instantâneas em destaque (ex: alimentação, Uber/transporte, academia, mercado).
- **Filtros Dinâmicos na URL:** Filtre por categoria, tag geral, sub-tag específica, forma de pagamento ou status de reembolso sem perder o estado ao navegar.

### 💳 Ciclo de Fatura & Cartão Inteligente

- **Faixa de Ciclo (Cycle Strip):** Régua visual interativa que exibe as datas de fechamento e vencimento, indicando com clareza em qual fatura uma compra efetuada se posiciona.
- **Lógica Financeira Rigorosa:**
    - Compras efetuadas a partir do dia de fechamento entram na fatura seguinte.
    - Exemplo: Com fechamento no dia 14 e vencimento no dia 20, uma compra em `14/08` entra na fatura de setembro (`20/09`).
- **Parcelamento em até 60x:** Distribuição determinística de centavos (o resto da divisão é aplicado na primeira parcela, garantindo exatidão contábil total).
- **Configuração Flexível:** Modifique os dias de fechamento e vencimento (dias 1 a 28); o sistema recalcula apenas as faturas vigentes e futuras, preservando o histórico das faturas passadas.

### 🔄 Transações Recorrentes sob Demanda

- **Projeção Determinística sem Poluição:** Séries recorrentes (ex: assinaturas, mensalidades) não criam dezenas de registros vazios no banco de dados. Elas são projetadas sob demanda para o período consultado.
- **Versionamento Histórico Imutável (`effective_from`):** Editar o valor ou o dia de uma assinatura a partir do mês que vem não adultera os lançamentos de meses anteriores.
- **Selo & Identificação:** As telas de Resumo, Fatura e Lista indicam de forma clara quando um total **"Inclui recorrências previstas"** e diferenciam o que já foi liquidado do que é projeção.
- **Encerramento Flexível:** Opção de excluir uma série inteira, excluir a partir de uma data ou desanexar uma ocorrência transformando-a em compra avulsa.

### 🏷️ Categorias, Tags & Locais Customizáveis (CRUD Completo)

- **Gerenciador de Categorias:** Edição completa de nome, cor, ícone do Lucide e ordem de exibição.
- **Tags Gerais:** Tags que podem ser associadas a qualquer despesa (ex: `Reembolso`, `Família`, `Amigos`).
- **Sub-tags Específicas:** Tags vinculadas a categorias pontuais (ex: `Uber` e `Viagem` em Transporte; `Remédio` e `Academia` em Saúde; `Supermercado` em Alimentação).
- **Gerenciador de Locais Frequentes:** Cadastre origens e destinos comuns de corridas para facilitar o lançamento de transportes.
- **Sugestão Inteligente:** Autocomplete com histórico recente para preenchimento ágil de nomes de transações.

### 💰 Sistema de Reembolso

- **Reembolso Total ou Parcial:** Sinalize despesas que serão ressarcidas por terceiros ou empresas.
- **Toggle nas Métricas:** O dashboard permite incluir ou excluir transações com reembolso dos totais e gráficos com apenas um clique.

### 📥 Exportação de Dados em CSV

- **Dois formatos completos disponíveis para download imediato:**
    1. **Transações:** Compras consolidadas com metadados, forma de pagamento, parcelas e tags.
    2. **Lançamentos (Entries):** Parcelas e ocorrências individualizadas por competência e fatura.
- **Protegido contra CSV Injection** e formatado no padrão monetário brasileiro.

---

## 🛠️ Stack Tecnológica

| Camada                        | Tecnologia                                                                | Descrição                                                                                        |
| :---------------------------- | :------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------- |
| **Runtime & Package Manager** | [Bun](https://bun.sh/) (>= 1.2)                                           | Executor JavaScript e gerenciador de pacotes ultrarrápido (não utiliza npm/yarn/pnpm).           |
| **Framework Fullstack**       | [Next.js](https://nextjs.org/) (v16 App Router)                           | React Server Components, Server Actions e rotas otimizadas.                                      |
| **Biblioteca de UI**          | [React](https://react.dev/) 19 & TypeScript                               | Interface moderna, componentes fortemente tipados e tipagem estrita.                             |
| **Estilização**               | [Tailwind CSS](https://tailwindcss.com/) v4                               | Sistema de utilitários CSS de última geração com tema dark customizado.                          |
| **Banco de Dados & Auth**     | [Supabase](https://supabase.com/)                                         | PostgreSQL com Row Level Security (RLS) e autenticação segura via cookies SSR (`@supabase/ssr`). |
| **Validação & Formulários**   | [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) | Schemas compartilhados entre cliente e servidor com validação progressiva.                       |
| **Gráficos**                  | [Recharts](https://recharts.org/)                                         | Gráficos responsivos de barras, pizza/donuts e linhas.                                           |
| **Ícones & Animações**        | [Lucide React](https://lucide.dev/) & [Motion](https://motion.dev/)       | Ícones consistentes e microinterações elegantes.                                                 |
| **Feedbacks / Toasts**        | [Sonner](https://sonner.emilkowal.ski/)                                   | Notificações visuais elegantes e acessíveis.                                                     |
| **Hospedagem**                | [Vercel](https://vercel.com/)                                             | Deploy automatizado no plano gratuito (Hobby).                                                   |

---

## 🚀 Guia Passo a Passo: Subindo sua Própria Instância

Como este é um software para controle individual, o fluxo recomendado é criar sua própria infraestrutura gratuita utilizando **Supabase** (para banco de dados e autenticação) e **Vercel** (para hospedar a aplicação web).

### 📋 Pré-requisitos

1. **[Bun](https://bun.sh/)** instalado no seu computador:
    ```bash
    curl -fsSL https://bun.sh/install | bash
    ```
2. Uma conta gratuita no **[GitHub](https://github.com)**.
3. Uma conta gratuita no **[Supabase](https://supabase.com)**.
4. Uma conta gratuita na **[Vercel](https://vercel.com)**.

---

### Passo 1: Clonar o Repositório e Instalar Dependências

Faça um fork deste repositório para o seu GitHub pessoal ou clone-o diretamente:

```bash
git clone https://github.com/SEU_USUARIO/Bonsai.git bonsai
cd bonsai
bun install
```

---

### Passo 2: Configurar o Projeto no Supabase

1. Acesse o **[painel do Supabase](https://supabase.com/dashboard)** e clique em **"New Project"**.
2. Preencha os dados:
    - **Name:** `bonsai` (ou o nome que preferir).
    - **Database Password:** Escolha uma senha forte (anote-a em local seguro).
    - **Region:** Selecione a mais próxima de você (ex: `São Paulo (sa-east-1)`).
    - **Pricing Plan:** Free plan.
3. Aguarde cerca de 1 a 2 minutos até que o projeto seja provisionado.

#### 2.1 Coletar as Chaves de Conexão (API Keys)

No menu lateral esquerdo do Supabase:

1. Vá em **Project Settings** (ícone de engrenagem) > **API** (ou **Data API**).
2. Localize e copie os seguintes valores:
    - **Project URL:** algo como `https://abcdefghijklmnop.supabase.co`
    - **Project API Keys (`anon` / `public`):** chave pública iniciando com `ey...`

#### 2.2 Aplicar as Migrations do Banco de Dados

O Bonsai possui scripts SQL versionados em `supabase/migrations/` que criam tabelas, índices, triggers automáticos e políticas de segurança RLS.

**Método Recomendado — Via Supabase CLI (Terminal com Bun):**
No terminal da sua máquina, execute:

```bash
# 1. Faça login na sua conta Supabase
bunx supabase login

# 2. Conecte o projeto local ao projeto remoto da nuvem
# (O Project Ref é o código que aparece na URL do projeto, ex: abcdefghijklmnop)
bunx supabase link --project-ref SEU_PROJECT_REF

# 3. Envie todas as migrations para o banco remoto
bunx supabase db push
```

> **Método Alternativo — Manualmente via Painel Web:**  
> Se preferir não usar o terminal, acesse o **SQL Editor** no painel do Supabase e execute o conteúdo dos arquivos da pasta `supabase/migrations/` em ordem cronológica (pelo prefixo numérico da data).

#### 2.3 Criar o seu Usuário Pessoal

Como o Bonsai é de uso individual, você deve criar a sua conta diretamente pelo painel administrativo do Supabase:

1. No menu lateral do Supabase, vá em **Authentication** > **Users**.
2. Clique no botão **"Add user"** e selecione **"Create user"**.
3. Digite o seu **E-mail pessoal** e a **Senha** de sua escolha.
4. **IMPORTANTE:** Marque a opção **"Auto Confirm User?"** como **Yes** (assim você não precisará configurar servidores de envio de e-mail).
5. Clique em **"Create user"**.

> 💡 **Nota de Domínio:** O banco de dados do Bonsai possui uma trigger automática (`handle_new_user`) que, no instante em que seu usuário for criado no Supabase Auth, irá popular automaticamente a base com as categorias iniciais (Alimentação, Lazer, Saúde...), tags padrão e configurações do ciclo de fatura!

#### 2.4 Bloquear Cadastros Públicos (Segurança Essencial)

Para garantir que nenhuma outra pessoa na internet consiga criar uma conta na sua instância do Bonsai:

1. No painel do Supabase, acesse **Authentication** > **Providers** > **Email**.
2. Desmarque a opção **"Enable Signups"** (ou "Allow new users to sign up").
3. Clique em **Save**.
4. Agora somente o usuário que você criou manualmente no passo 2.3 poderá fazer login.

---

### Passo 3: Testar Localmente

1. Crie o arquivo `.env.local` na raiz do projeto com base no `.env.example`:
    ```bash
    cp .env.example .env.local
    ```
2. Abra o arquivo `.env.local` e preencha com as credenciais do seu Supabase:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sua-chave-anon-publica
    ```
3. Rode a validação de regras de domínio financeiro:
    ```bash
    bun run domain:self-check
    ```
4. Inicie o servidor de desenvolvimento:
    ```bash
    bun run dev
    ```
5. Acesse `http://localhost:3000`, informe seu e-mail e senha configurados e verifique se o Dashboard abre normalmente.

---

### Passo 4: Fazer o Deploy na Vercel

1. Suba o seu código para o seu repositório no **GitHub**.
2. Acesse o painel da **[Vercel](https://vercel.com)** e clique em **"Add New..."** > **"Project"**.
3. Conecte sua conta do GitHub e selecione o repositório do **Bonsai**.
4. Na tela de configuração do projeto:
    - **Framework Preset:** O Next.js será detectado automaticamente.
    - **Root Directory:** `./`
    - **Build and Output Settings:** O Vercel detectará o `bun.lock` automaticamente e utilizará o Bun para instalar dependências e rodar o build.
5. Em **Environment Variables**, adicione as duas variáveis obrigatórias:
    - `NEXT_PUBLIC_SUPABASE_URL`: sua URL do Supabase.
    - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: sua chave pública (`anon`).
6. Clique no botão **"Deploy"**.

Em cerca de 1 minuto, a Vercel finalizará a compilação e fornecerá uma URL pública segura (ex: `https://seu-bonsai.vercel.app`).

---

### Passo 5: Adicionar como Aplicativo no Celular (PWA)

O Bonsai foi desenhado para ser usado como aplicativo móvel no dia a dia:

- **No iPhone (iOS / Safari):**
    1. Abra a URL do seu Bonsai na Vercel pelo navegador **Safari**.
    2. Toque no botão de **Compartilhar** (ícone do quadrado com a seta para cima).
    3. Role a lista e toque em **"Adicionar à Tela de Início"** (_Add to Home Screen_).
    4. Nomeie como **Bonsai** e toque em **Adicionar**.
- **No Android (Chrome):**
    1. Abra a URL no **Google Chrome**.
    2. Toque no menu de três pontos no canto superior direito.
    3. Selecione **"Adicionar à tela inicial"** ou **"Instalar aplicativo"**.

Pronto! Agora o Bonsai abrirá em tela cheia, sem a barra de navegação do browser, funcionando exatamente como um app nativo.

---

## 💻 Scripts Disponíveis

Todos os comandos devem ser executados com o **Bun**:

```bash
# Executa a aplicação em modo de desenvolvimento (porta 3000)
bun run dev

# Gera a build de produção
bun run build

# Inicia a build de produção localmente
bun run start

# Executa o linter do ESLint
bun run lint

# Executa a checagem estática de tipos do TypeScript
bun run typecheck

# Formata o código com Prettier
bun run format

# Executa os testes e asserções das regras de negócio de domínio
bun run domain:self-check
```

---

## 🏛️ Arquitetura & Decisões de Engenharia

- **Valores em Centavos Inteiros:** Nenhuma quantia financeira é armazenada ou processada com pontos flutuantes (`float`). Toda a aritmética utiliza centavos inteiros (`amount_cents`), prevenindo erros de arredondamento inerentes à especificação IEEE 754.
- **Fuso Horário Civil:** Todas as regras de negócio de datas e competências utilizam o fuso de referência `America/Sao_Paulo`, evitando desvios de competência causados por conversão UTC em viradas de mês.
- **Isolamento via Row Level Security (RLS):** Toda e qualquer consulta ao banco de dados é filtrada a nível de engine pelo PostgreSQL através do `auth.uid()`, impedindo vazamento de dados entre credenciais distintas.
- **Transações Atômicas:** Criação, edição e exclusão de transações e suas respectivas parcelas (`entries`) ocorrem dentro de procedimentos armazenados (RPCs) transacionais, garantindo que o banco nunca fique em estado inconsistente.

---

## 📄 Licença

Este é um projeto pessoal de código aberto distribuído sob a licença [MIT](LICENSE). Sinta-se à vontade para clonar, estudar, adaptar ou hospedar sua própria versão privada do Bonsai!
