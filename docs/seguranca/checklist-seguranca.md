# Checklist de segurança — aplicação pessoal de finanças

## Escopo e decisões de base

Este checklist cobre uma aplicação Next.js com App Router hospedada na Vercel e Supabase para Auth e Postgres. Embora exista só uma pessoa usuária, os dados financeiros são sensíveis: mantenha autenticação, autorização por linha (RLS), cópias de segurança e acesso operacional como controles independentes.

### Decisão sobre login

O login será exclusivamente por **e-mail + senha**. Não haverá nome de usuário, nome de exibição nem foto de perfil.

1. Use o e-mail somente como identificador na tela de login.
2. Não crie tabela, campo ou endpoint de perfil para nome de usuário ou foto; esses dados não atendem a uma necessidade do escopo.
3. O aplicativo oferece somente login e logout. Qualquer alteração de senha é uma operação administrativa feita diretamente no painel do Supabase.

Referências: [métodos de login por senha](https://supabase.com/docs/guides/auth/passwords) e [segurança de Auth](https://supabase.com/docs/guides/auth/security).

## 1. Provisionar o Supabase com mínimo privilégio

1. Crie um projeto Supabase de produção separado de qualquer projeto de desenvolvimento/teste. Dados e chaves de produção não devem ir para previews da Vercel.
2. Registre a URL canônica de produção e, se necessário, a URL local no campo **Site URL** e nas listas de URLs de redirecionamento do Auth. Use URLs exatas e HTTPS em produção.
3. Habilite somente os provedores de Auth realmente usados. Neste caso, mantenha e-mail/senha e desabilite OAuth, telefone e cadastro anônimo se não forem necessários.
4. No painel de Auth, desabilite novos cadastros públicos (**Disable new user signups**). Essa configuração é obrigatória: esconder a tela de cadastro não bloqueia chamadas diretas à API.
5. Crie a única conta pelo fluxo administrativo apropriado do painel e guarde o e-mail como credencial. Não deixe uma rota de `signUp` disponível depois do provisionamento.
6. Ative a confirmação de e-mail para a criação inicial e para troca de e-mail. A conta só deve estar utilizável após a confirmação.
7. Configure um provedor SMTP confiável e um remetente/domínio adequados antes de depender dos e-mails de confirmação administrativa. Teste a entrega, inclusive spam e links em dispositivos móveis.
8. Defina política de senha no Auth (comprimento mínimo forte; de preferência verificação contra senhas comprometidas, se disponibilizada no plano/configuração) e use um gerenciador de senhas. Para acesso ao painel Supabase e à Vercel, habilite MFA.
9. Revogue sessões e altere a senha administrativamente ao perder um dispositivo ou suspeitar de comprometimento.
10. Não configure URLs de callback de recuperação no aplicativo.

**Não revelar informação de conta:** a tela de login deve responder de forma genérica, sem confirmar se um e-mail está cadastrado.

Referências: [configuração de senha](https://supabase.com/docs/guides/auth/passwords) e [configuração de SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## 2. Sessão persistente com SSR, cookies e renovação

Objetivo: permanecer conectado com segurança, sem copiar, serializar ou administrar tokens manualmente.

1. Use a integração oficial `@supabase/ssr` para criar clientes de navegador e servidor. Ela integra a sessão a cookies, que podem ser lidos durante a renderização no servidor.
2. Use o fluxo PKCE para SSR; não use o fluxo implícito de uma SPA para páginas que precisam validar sessão no servidor.
3. Implemente o mecanismo de atualização de sessão recomendado pela documentação do Supabase para Next.js. Ele deve executar na borda/proxy para que cookies renovados sejam devolvidos ao navegador.
4. Ao proteger páginas e mutações no servidor, obtenha a identidade com `supabase.auth.getUser()`. Não autorize com dados decodificados do cookie, `getSession()` isoladamente ou um `user_id` vindo do formulário.
5. Preserve os cookies definidos pelo cliente SSR ao gerar uma resposta/redirecionamento. Descartá-los causa dessincronização entre navegador e servidor e logouts intermitentes.
6. No logout, chame o método oficial de logout e invalide a sessão corrente; não se limite a apagar um cookie criado manualmente.
7. Não grave access token, refresh token ou senha em `localStorage`, `sessionStorage`, URL, logs, Analytics, estado global persistido ou banco de dados da aplicação.
8. Mantenha o tempo de expiração de JWT e a política de sessões adequados ao risco. “Permanecer conectado” deve significar renovação segura por cookie, não token sem expiração.

Para este app, os cookies devem ser `Secure` em produção, `HttpOnly` quando controlados pelo servidor e ter `SameSite=Lax` como ponto de partida. Não diminua `SameSite` para `None` sem uma necessidade real de fluxo entre sites e sem adicionar as demais defesas contra CSRF.

Referências: [guia SSR avançado](https://supabase.com/docs/guides/auth/server-side/advanced-guide), [guia Next.js SSR](https://supabase.com/docs/guides/auth/server-side/nextjs) e [sessões](https://supabase.com/docs/guides/auth/sessions).

## 3. Limites cliente/servidor no Next.js App Router

1. Deixe páginas, consultas sensíveis e regras de negócio como **Server Components** por padrão. Use `'use client'` apenas onde houver interação do navegador.
2. Nunca importe módulo que usa `service_role`, segredo, acesso administrativo ou lógica privilegiada para um Client Component. Uma variável `NEXT_PUBLIC_*` é incluída no bundle do navegador.
3. Use Server Actions ou Route Handlers para mutações que precisam de lógica de negócio. Em cada uma: valide o formato da entrada, obtenha o usuário autenticado no servidor e deixe a RLS ser a última barreira de autorização.
4. Trate o proxy/middleware como melhoria de navegação e atualização de cookies, não como única autorização. Todo acesso a dados e toda mutação continuam exigindo validação de usuário e RLS.
5. Não encaminhe todos os headers recebidos para serviços internos; encaminhe somente uma lista explícita de headers seguros. Em particular, não reflita `Authorization`, `Cookie` ou headers `x-*` arbitrários.
6. Não exponha mensagens de erro internas, stack traces, SQL, e-mails, tokens ou valores de variáveis de ambiente na UI ou em respostas JSON.

Referências: [autenticação no App Router](https://nextjs.org/docs/app/guides/authentication), [Server e Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) e [cookies no Next.js](https://nextjs.org/docs/app/api-reference/functions/cookies).

## 4. Banco de dados: RLS e propriedade por `user_id`

Mesmo com apenas uma conta, toda tabela exposta pela Data API que contém dados financeiros deve ter:

- RLS habilitada;
- uma coluna `user_id uuid not null` que referencia `auth.users(id)`;
- `user_id` preenchido no servidor/banco a partir do usuário autenticado, não confiado ao navegador;
- políticas explícitas para cada operação necessária.

Modelo de política conceitual para uma tabela `transacoes`:

```sql
alter table public.transacoes enable row level security;

create policy "Ler apenas transações próprias"
on public.transacoes for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Inserir apenas transações próprias"
on public.transacoes for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Alterar apenas transações próprias"
on public.transacoes for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Excluir apenas transações próprias"
on public.transacoes for delete to authenticated
using ((select auth.uid()) = user_id);
```

Antes de adaptar esse exemplo:

1. Repita o padrão para categorias, contas, lançamentos recorrentes, anexos e qualquer tabela vinculada a dados pessoais.
2. Para inserções, prefira um default/trigger seguro que derive `user_id` de `auth.uid()` quando o desenho permitir. A política `WITH CHECK` ainda é necessária para impedir a gravação em nome de outra pessoa.
3. Lembre que `UPDATE` exige também uma política `SELECT`; sem ela, a atualização pode aparentar sucesso e afetar zero linhas.
4. Não crie política permissiva como `using (true)` em tabelas financeiras e não conceda acesso `anon` por conveniência.
5. Nunca use `raw_user_meta_data` para autorização: esse conteúdo pode ser alterado pela própria pessoa usuária. Se algum dia houver papéis, use dados de aplicação protegidos (`app_metadata`) ou uma tabela de papéis protegida por RLS.
6. Views podem contornar RLS por padrão. Evite-as para dados privados ou use `security_invoker = true` quando suportado; caso contrário, deixe-as fora de schema exposto e revogue privilégios adequadamente.
7. Funções `security definer` são código privilegiado: mantenha-as em schema não exposto, fixe o `search_path`, conceda execução apenas ao papel necessário e evite-as se uma política RLS simples resolve o caso.
8. Execute o **Security Advisor** do Supabase antes de produção e após cada alteração de schema/políticas.
9. Tabelas de séries recorrentes, versões e histórico de configuração do ciclo devem repetir o mesmo isolamento por `user_id`. Relações entre essas tabelas precisam impedir que uma versão ou série seja vinculada a registros de outro usuário.
10. Operações compostas de recorrência — criar versão, encerrar série, converter compra ou manter uma ocorrência como avulsa — devem ser atômicas, derivar o proprietário de `auth.uid()` e não aceitar `user_id` do cliente.

Referências: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [segurança do banco](https://supabase.com/docs/guides/database/database-security) e [checklist de produção](https://supabase.com/docs/guides/deployment/going-into-prod).

## 5. Chaves, variáveis de ambiente e privilégios

Classifique as configurações:

| Dado | Onde pode existir | Regra |
| --- | --- | --- |
| URL do projeto Supabase | cliente e servidor | Pode ser pública. |
| Chave publishable (ou `anon` legada) | cliente e servidor | Pode ser pública; sua segurança depende de RLS. |
| `service_role`/secret key do Supabase | somente servidor confiável | Nunca usar prefixo `NEXT_PUBLIC_`, nunca enviar ao navegador. |
| Senhas SMTP, tokens, chaves de integração | somente Vercel/ambiente local secreto | Nunca commitar, registrar em log ou copiar para preview sem necessidade. |

Passos:

1. No repositório, mantenha apenas `.env.example` com nomes de variáveis e valores vazios. Garanta que `.env.local` e variantes locais estejam no `.gitignore`.
2. Cadastre segredos no painel da Vercel como variáveis sensíveis e com escopo mínimo: Production, Preview e Development têm valores distintos quando necessário.
3. Previews não devem receber `service_role`, credenciais SMTP de produção ou acesso ao banco de produção. Prefira um Supabase de teste, ou não disponibilize a funcionalidade que requer o segredo em preview.
4. O `service_role` ignora RLS. Use-o somente em código de servidor para trabalho administrativo inevitável; crie um cliente separado e não o reutilize em requisições autenticadas de usuário.
5. Se um pedido autenticado usar um token de usuário, ele deve continuar respeitando RLS; não “eleve” esse pedido adicionando `service_role`.
6. Faça rotação imediata de chaves que aparecerem em Git, logs, screenshots, tickets, chats ou bundle do navegador; remova a exposição antes de reimplantar.
7. Revise trimestralmente variáveis, membros com acesso e integrações instaladas.

Referências: [chaves de API do Supabase](https://supabase.com/docs/guides/api/api-keys), [variáveis de ambiente da Vercel](https://vercel.com/docs/environment-variables) e [variáveis do Next.js](https://nextjs.org/docs/app/guides/environment-variables).

## 6. Entradas, CSRF, abuso e cabeçalhos HTTP

### Validar toda entrada

1. No servidor, aceite somente um schema explícito para cada formulário/JSON: tipo, obrigatoriedade, tamanho máximo, enumerações, data, moeda e faixa numérica.
2. Normalize valores monetários em unidade inteira menor (por exemplo, centavos) ou em tipo decimal apropriado; não use `float` para persistir valores financeiros.
3. Rejeite propriedades inesperadas quando elas puderem alterar comportamento; nunca aceite `user_id`, papel, preço calculado ou status administrativo do cliente.
4. Escapar HTML ao exibir observações e não usar HTML arbitrário de usuário. Evite `dangerouslySetInnerHTML`.
5. Defina tamanho máximo de body e de CSV importado/exportado; processe upload em streaming quando ele existir.

### CSRF e taxa de requisições

1. Para mutações feitas via Server Actions/Route Handlers com cookies, verifique `Origin` contra a origem canônica para pedidos cross-site e não aceite métodos mutáveis sem essa validação quando a rota for acessível por navegador.
2. Não permita CORS com `Access-Control-Allow-Origin: *` junto com credenciais. Para uma aplicação pessoal sem API pública, não habilite CORS.
3. Mantenha cookies com `SameSite=Lax` ou mais restritivo; use token anti-CSRF adicional se for necessário `SameSite=None`, domínios cruzados ou integrações embutidas.
4. Aplique limites de taxa por IP/identidade a login e mutações caras. Use os limites de Auth configuráveis no Supabase e, se houver endpoints expostos na Vercel, um controle compatível com ambiente serverless (WAF/rate limiting/serviço externo), não memória do processo.
5. Responda de modo genérico a tentativas de login e registre a contagem sem gravar senha, token ou corpo sensível.

### Cabeçalhos

Configure e teste ao menos:

- `Content-Security-Policy`: comece com fontes mínimas (`'self'`) e adicione apenas domínios exigidos, como o domínio Supabase. Prefira nonce/sem `unsafe-inline` para scripts.
- `Strict-Transport-Security`: somente em produção HTTPS e após confirmar domínio/subdomínios.
- `X-Content-Type-Options: nosniff`.
- `Referrer-Policy: strict-origin-when-cross-origin` (ou mais restritiva se não houver necessidade).
- `Permissions-Policy`: desabilite câmera, microfone, geolocalização e outros recursos não usados.
- Proteção contra framing via `frame-ancestors 'none'` na CSP (e `X-Frame-Options: DENY` quando compatibilidade exigir).

Não copie uma CSP de exemplo sem validar scripts, fontes e imagens reais: uma política incorreta quebra a aplicação e uma política muito permissiva não protege.

Referências: [cabeçalhos de segurança da Vercel](https://vercel.com/docs/security/headers), [CSP no Next.js](https://nextjs.org/docs/app/guides/content-security-policy) e [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).

## 7. Vercel, repositório e acesso operacional

1. Proteja as contas Git e Vercel com MFA, senha exclusiva e dispositivos recuperáveis. Para um projeto pessoal, mantenha somente a pessoa proprietária como membro; remova acessos temporários assim que terminarem.
2. Ative proteção de branch para a branch de produção: PR obrigatório, checks obrigatórios e bloqueio de push direto. Mesmo sendo único usuário, isso reduz deploy acidental e mantém histórico revisável.
3. Faça deploy de produção somente a partir da branch protegida. Use previews para revisão, mas não com dados ou segredos de produção.
4. Ative Vercel Authentication ou outra Deployment Protection para previews que possam revelar UI, URLs de callback ou dados de teste. Links de bypass para automação são segredos: mantenha-os em CI e revogue-os quando não usados.
5. Restrinja DNS/domínio e confirme HTTPS. Não deixe domínios de preview como URL de redirecionamento ampla no Supabase; liste apenas os ambientes realmente necessários.
6. Habilite e revise logs/auditoria disponíveis no plano para mudanças de configuração, deploys, acessos e falhas. Trate URLs de logs como informação operacional sensível.
7. Configure alertas de erro/indisponibilidade e limites de gasto adequados ao plano. Uma mudança inesperada de volume ou de erros de Auth merece investigação.
8. Atualize dependências de segurança e mantenha lockfile. Ative alertas de dependências do provedor Git e revise dependências novas antes de instalá-las.

Referências: [Deployment Protection](https://vercel.com/docs/deployment-protection), [segurança da Vercel](https://vercel.com/docs/security), [variáveis por ambiente](https://vercel.com/docs/environment-variables/manage-across-environments) e [logs](https://vercel.com/docs/logs).

## 8. Backups, exportação CSV e recuperação

1. Configure backups/PITR conforme o plano do Supabase e confirme a retenção contratada. O banco de produção precisa de procedimento de restauração documentado, não só de backup habilitado.
2. Faça exportações periódicas criptografadas dos dados financeiros e mantenha pelo menos uma cópia fora da conta principal, com acesso físico/lógico controlado.
3. Teste restauração em projeto separado: recupere um backup, valide contagens e amostras, e registre data, duração e resultado. Um backup nunca restaurado não é uma garantia.
4. Nunca exporte senha, token, chave, tabela `auth` completa ou secrets para CSV.
5. Para CSV de dados próprios, gere somente após `getUser()` e RLS/consulta vinculada ao usuário. Use `Content-Disposition: attachment`, tipo de conteúdo correto e `Cache-Control: no-store` para downloads sensíveis.
6. Previna **CSV formula injection**: ao exportar valores controlados por usuário que começam com `=`, `+`, `-` ou `@`, neutralize-os conforme a política definida (por exemplo, prefixo de apóstrofo) e documente o efeito.
7. Ao importar CSV, valide encoding, colunas, limite de linhas/tamanho, datas e valores; mostre prévia e erros antes de gravar. Não aceite fórmulas, macros ou arquivos além do formato esperado.
8. Armazene o arquivo temporário pelo menor tempo possível e exclua-o após processamento; não deixe exportações em URL pública ou cache compartilhado.

Referências: [backups do Supabase](https://supabase.com/docs/guides/platform/backups) e [OWASP CSV Injection](https://owasp.org/www-community/attacks/CSV_Injection).

## 9. Monitoramento e resposta a incidentes

1. Monitore erros de aplicação, falhas de login, bloqueios de RLS, erros de banco, taxa de 4xx/5xx e deploys falhos. Redija logs: nunca registre senha, token, cookie, Authorization, dados financeiros completos ou PII desnecessária.
2. Defina alertas para picos de tentativas de login, erros 401/403/429, falhas de backup e alteração de variáveis/integrações.
3. Mantenha uma lista offline ou em cofre de senhas dos passos de incidente: revogar sessões, trocar senha, rotacionar chaves, pausar integrações, restaurar backup e verificar acessos/deploys.
4. Ao suspeitar de vazamento de chave, presuma comprometimento: revogue/rotacione a chave no provedor, atualize o ambiente, reimplante, revise logs e remova o segredo da fonte da exposição. Apagar um commit não revoga uma chave.

Referências: [logs do Supabase](https://supabase.com/docs/guides/telemetry/logs) e [logs da Vercel](https://vercel.com/docs/logs).

## 10. Checklist de testes antes de publicar

Execute e registre estes testes em ambiente de teste e, quando seguro, em preview protegido:

- [ ] Não existe rota/botão de cadastro; uma tentativa direta de criar conta é recusada após desabilitar cadastros públicos.
- [ ] A conta inicial é criada e administrada pelo painel do Supabase; o aplicativo não expõe cadastro, recuperação, callback ou redefinição de senha.
- [ ] Login válido persiste após recarregar e abrir nova aba; logout encerra o acesso.
- [ ] Pedido sem cookie/sessão é redirecionado/recusado; token ou `user_id` alterado no cliente não concede acesso.
- [ ] Cada tabela exposta tem RLS habilitada e políticas `SELECT`, `INSERT`, `UPDATE` e `DELETE` testadas para proprietário, não autenticado e tentativa de outro UUID.
- [ ] Séries recorrentes, versões e configurações históricas não podem ser lidas, vinculadas ou alteradas por outro usuário; suas mutações compostas não deixam estado parcial após falha.
- [ ] Inserção/alteração com `user_id` diferente falha; nenhuma API com chave pública retorna dados financeiros sem autenticação.
- [ ] Nenhum bundle do navegador, log de build ou preview contém `service_role`, senha SMTP ou outro segredo.
- [ ] Tentativas repetidas de login e endpoints mutáveis recebem limitação de taxa.
- [ ] Mutações cross-site sem origem esperada são recusadas; CORS não permite origens/credenciais desnecessárias.
- [ ] Cabeçalhos de segurança e CSP são validados no navegador sem quebrar login, exportação ou carregamento de recursos necessários.
- [ ] Exportação CSV contém somente dados autorizados, não é armazenada em cache e neutraliza células que poderiam ser fórmulas.
- [ ] Backup é restaurado com sucesso em ambiente isolado e os dados conferem.
- [ ] Previews são protegidos, não usam secrets de produção e a produção só recebe deploy da branch protegida.
- [ ] Security Advisor do Supabase não possui alerta crítico ignorado; dependências e alertas do repositório foram revisados.

## Referências oficiais principais

- Supabase: [Product Security](https://supabase.com/docs/guides/security/product-security), [Auth](https://supabase.com/docs/guides/auth), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [SSR para Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs).
- Next.js: [Authentication](https://nextjs.org/docs/app/guides/authentication), [Data Security](https://nextjs.org/docs/app/guides/data-security), [CSP](https://nextjs.org/docs/app/guides/content-security-policy).
- Vercel: [Security](https://vercel.com/docs/security), [Environment Variables](https://vercel.com/docs/environment-variables), [Deployment Protection](https://vercel.com/docs/deployment-protection).
