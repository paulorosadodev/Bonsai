# Decisões técnicas

## Status deste documento

Este registro separa decisões confirmadas das premissas que ainda exigem definição. Ele descreve a arquitetura proposta e seus limites, sem acrescentar funcionalidades ao escopo acordado.

## Decisões confirmadas

### Stack e arquitetura

- A aplicação será construída com as versões estáveis mais recentes e compatíveis de **Next.js** e **React** no momento da implementação, usando **TypeScript** e o **App Router**.
- **Bun** será o único gerenciador de pacotes e executor de scripts; seu lockfile será versionado.
- O frontend e o backend coexistirão no mesmo projeto Next.js. A interface apresenta e coleta dados; operações que envolvem banco, autenticação e regras de negócio ocorrerão no lado servidor.
- O App Router será o único responsável pelo roteamento. **TanStack Router não será usado**, pois manter dois roteadores no mesmo aplicativo cria rotas e ciclos de navegação concorrentes sem benefício neste projeto.
- O banco de dados e a autenticação serão fornecidos pelo **Supabase**, usando **Postgres** e **Supabase Auth**.
- A sessão será tratada com **SSR e cookies**, para que o servidor consiga identificar o usuário autenticado nas requisições renderizadas no servidor e nas operações protegidas.
- A proteção de dados no Postgres usará **Row Level Security (RLS)**. As políticas devem restringir cada registro ao usuário autenticado a que ele pertence.
- O aplicativo oferece somente login e logout. Não há recuperação ou redefinição de senha no aplicativo; uma eventual alteração será feita administrativamente no painel do Supabase.
- Cálculo de ciclo, competência, parcelas, divisão de centavos e compatibilidade de tags pertence ao TypeScript. O banco recebe a transação e os lançamentos já calculados.
- Criação e edição de transações usam uma única função de persistência atômica no Postgres. Ela deriva o proprietário de `auth.uid()`, valida apenas autenticação e consistência estrutural e grava a transação e seus lançamentos no mesmo commit.

### Arquitetura de recorrência

- Recorrência será uma entidade própria, separada de `transactions`, com propriedade por `user_id` e RLS.
- A série guarda sua vigência e seu dia mensal. Seus dados financeiros serão versionados por uma data civil `effective_from`, permitindo reconstruir qualquer ocorrência histórica sem sobrescrever versões anteriores.
- Os dias globais de fechamento e vencimento também precisarão de histórico de vigência. A projeção usa a configuração vigente na data de cada ocorrência, de modo que uma mudança atual não desloque faturas recorrentes passadas.
- Ocorrências recorrentes serão **projeções determinísticas sob demanda**, identificadas pelo par série + data da ocorrência. Não será criado um lote arbitrário de transações futuras.
- Uma função TypeScript central será responsável por:
    - calcular datas mensais, usando o último dia disponível em meses curtos;
    - selecionar a versão vigente em cada ocorrência;
    - aplicar as regras de competência de PIX e cartão;
    - limitar a projeção ao intervalo consultado;
    - distinguir ocorrências realizadas de previstas pela data civil atual em `America/Sao_Paulo`.
- Resumo, Fatura e Lista combinarão transações avulsas persistidas com ocorrências recorrentes projetadas pela mesma função de domínio, evitando regras divergentes entre telas.
- A exportação usará a mesma projeção, limitada a ocorrências com data menor ou igual à data civil atual.
- Uma edição de recorrência não atualiza versões antigas. Ela cria uma nova versão com `effective_from` igual à próxima ocorrência ainda não realizada.
- Encerrar uma série registra seu limite de vigência. Manter a ocorrência atual como avulsa exige persistir essa transação e encerrar a série no mesmo commit.
- Converter uma transação avulsa em recorrente, versionar uma série, encerrá-la ou desanexar sua ocorrência atual serão operações atômicas autenticadas.
- Alterações do ciclo do cartão afetam o cálculo apenas das ocorrências ainda não realizadas; ocorrências históricas continuam sendo reconstruídas com sua competência preservada.
- O schema deve impedir recorrência com cartão parcelado: apenas PIX e cartão com uma parcela são válidos.

### Frontend

- O estilo será implementado com **Tailwind CSS v4**.
- Os gráficos do Dashboard serão criados com **Recharts**.
- Feedbacks transitórios de sucesso e erro serão exibidos com **Sonner**.
- **Motion para React** será usado pontualmente para transições que esclareçam mudança de estado, respeitando a preferência de redução de movimento; não será usado como decoração genérica.
- Dados necessários para a primeira renderização serão lidos diretamente em **Server Components**, com o cliente Supabase apropriado ao servidor.
- Mutações serão feitas por **Server Actions**, com validação no servidor e revalidação das páginas/dados afetados.
- **React Hook Form** e **Zod** serão usados no formulário de transação para estado, campos condicionais e validação compartilhada entre cliente e servidor.
- **TanStack Query** não será instalado inicialmente. Server Components, Server Actions e revalidação cobrem os fluxos atuais; a dependência só será reconsiderada se surgir uma necessidade real de cache no cliente.
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
- Datas de negócio serão tratadas como datas civis em `America/Sao_Paulo`, evitando deslocamentos de competência por conversão UTC.

### Verificação de domínio

- As regras críticas de fechamento, vencimento e divisão de centavos terão um único self-check assertivo executável com Bun, sem framework ou suíte de testes nesta fase.

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
- Calcular ciclo, competência, parcelas e tags no TypeScript antes da persistência.
- Projetar séries recorrentes por intervalo, preservar versões históricas e separar previsões de ocorrências realizadas.
- Executar operações de leitura, criação, edição, exclusão e exportação conforme as regras de domínio.

### Fora do escopo explícito

As decisões de negócio excluem, por enquanto:

- múltiplos usuários;
- múltiplos cartões;
- registro ou pagamento de fatura;
- transferências.

Essas exclusões não devem ser antecipadas na arquitetura ou na interface sem uma nova decisão.

## Premissas pendentes

Não foram definidos neste momento os nomes finais das tabelas e funções de recorrência, formato/colunas do CSV, estratégia de testes das fases posteriores, monitoramento, backup, domínio ou requisitos de disponibilidade. Esses pontos devem ser decididos quando necessários, sem presumir requisitos além dos registrados aqui.
