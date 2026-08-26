# Decisões técnicas

## Status deste documento

Este registro separa decisões confirmadas das premissas que ainda exigem definição. Ele descreve a arquitetura proposta e seus limites, sem acrescentar funcionalidades ao escopo acordado.

## Decisões confirmadas

### Stack e arquitetura

- A aplicação será construída com as versões estáveis mais recentes e compatíveis de **Next.js** e **React** no momento da implementação, usando **TypeScript** e o **App Router**.
- O frontend e o backend coexistirão no mesmo projeto Next.js. A interface apresenta e coleta dados; operações que envolvem banco, autenticação e regras de negócio ocorrerão no lado servidor.
- O App Router será o único responsável pelo roteamento. **TanStack Router não será usado**, pois manter dois roteadores no mesmo aplicativo cria rotas e ciclos de navegação concorrentes sem benefício neste projeto.
- O banco de dados e a autenticação serão fornecidos pelo **Supabase**, usando **Postgres** e **Supabase Auth**.
- A sessão será tratada com **SSR e cookies**, para que o servidor consiga identificar o usuário autenticado nas requisições renderizadas no servidor e nas operações protegidas.
- A proteção de dados no Postgres usará **Row Level Security (RLS)**. As políticas devem restringir cada registro ao usuário autenticado a que ele pertence.

### Frontend

- O estilo será implementado com **Tailwind CSS v4**.
- Os gráficos do Dashboard serão criados com **Recharts**.
- Feedbacks transitórios de sucesso e erro serão exibidos com **Sonner**.
- **Motion para React** será usado pontualmente para transições que esclareçam mudança de estado, respeitando a preferência de redução de movimento; não será usado como decoração genérica.
- Dados necessários para a primeira renderização serão lidos diretamente em **Server Components**, com o cliente Supabase apropriado ao servidor.
- Mutações serão feitas por **Server Actions**, com validação no servidor e revalidação das páginas/dados afetados.
- **TanStack Query** será usado apenas em componentes de cliente que precisem sincronizar cache após uma interação sem recarregar a página. Toda mutação deverá invalidar as query keys relacionadas; ele não substituirá a leitura inicial no servidor.
- **Axios não será usado**. `fetch` nativo atende chamadas HTTP e o cliente oficial do Supabase atende banco e Auth, evitando uma dependência redundante.

### Versões e dependências

- “Mais recente” significa a última versão **estável e compatível** declarada pela matriz de pares do Next.js/React e pelas bibliotecas escolhidas no momento da instalação; versões `canary`, `beta` ou `rc` não entram em produção.
- Novas dependências só serão adicionadas quando cobrirem um caso real do produto; não serão instaladas bibliotecas apenas por estarem em uma lista de tecnologias populares.

### Hospedagem

- O deployment previsto é pessoal na **Vercel**, no plano **Hobby**.
- O plano Hobby possui limites e condições definidos pela Vercel, que podem mudar. Esta escolha não constitui promessa de disponibilidade, capacidade ou gratuidade vitalícias.

### Valores monetários

- Valores financeiros serão persistidos em **centavos**, como inteiros, para evitar imprecisão de ponto flutuante.
- A interface exibirá os valores formatados em **BRL**.

### Exportação

- A aplicação deverá disponibilizar exportação dos dados em **CSV**.

### Responsabilidades

**Frontend**

- Exibir dados e valores em BRL.
- Coletar entradas do usuário.
- Permitir a interação com os fluxos definidos para transações, categorias e exportação.

**Backend**

- Autenticar e identificar o usuário por SSR/cookies.
- Aplicar regras de acesso por usuário em conjunto com RLS.
- Persistir valores em centavos.
- Executar operações de leitura, criação, edição, exclusão e exportação conforme as regras de domínio.

### Fora do escopo explícito

As decisões de negócio excluem, por enquanto:

- múltiplos usuários;
- múltiplos cartões;
- registro ou pagamento de fatura;
- transferências.

Essas exclusões não devem ser antecipadas na arquitetura ou na interface sem uma nova decisão.

## Premissas pendentes

Não foram definidos neste momento detalhes como modelo físico das tabelas, desenho das telas, formato/colunas do CSV, políticas específicas de RLS, estratégia de testes, monitoramento, backup, domínio ou requisitos de disponibilidade. Esses pontos devem ser decididos quando necessários, sem presumir requisitos além dos registrados aqui.
