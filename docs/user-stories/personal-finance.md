# Histórias de Usuário — Finanças Pessoais

**Contexto:** aplicativo web pessoal para um único usuário. Valores monetários são em BRL, exibidos com duas casas decimais (por exemplo, `R$ 1.250,27`).

## Regras de negócio decididas

- Categorias permitidas: Contas Fixas, Higiene, Saúde, Alimentação, Transporte, Lazer, Vestuário, Pessoal e Presente.
- Tags aplicáveis a qualquer categoria: Reembolso, Família e Amigos.
- Tags específicas: Contas Fixas (Celular, Energia, Casa); Saúde (Remédio, Médico); Alimentação (Restaurante, Padaria/Supermercado, Lanche); Transporte (Uber, Viagem); Lazer (Assinatura, Ingressos, Outro).
- Cada transação deve ter uma categoria, pode ter várias tags aplicáveis a qualquer categoria e, no máximo, uma tag específica compatível com sua categoria.
- O escopo não inclui múltiplos cartões, pagamentos de fatura ou transferências.

### User Story PF-001:

- **Summary:** Manter o acesso autenticado entre sessões

#### Use Case:
- **As a** pessoa que controla as próprias finanças
- **I want to** permanecer autenticada ao voltar ao aplicativo
- **so that** eu possa consultar e registrar gastos sem entrar novamente a cada sessão

#### Acceptance Criteria:
- **Scenario:** Restaurar sessão autenticada
- **Given:** que já realizei login com credenciais válidas
- **and Given:** que a sessão persistente ainda é válida
- **When:** eu reabro o aplicativo
- **Then:** devo acessar meu Dashboard sem informar as credenciais novamente

- **Scenario:** Bloquear acesso sem sessão válida
- **Given:** que não possuo uma sessão autenticada válida
- **When:** eu tento acessar o Dashboard
- **Then:** devo ser direcionada à tela de login

### User Story PF-002:

- **Summary:** Visualizar o total de gastos no Dashboard

#### Use Case:
- **As a** pessoa que controla as próprias finanças
- **I want to** visualizar o total de gastos no Dashboard
- **so that** eu entenda rapidamente quanto gastei no período exibido

#### Acceptance Criteria:
- **Scenario:** Somar transações elegíveis no período
- **Given:** que possuo transações lançadas no período exibido
- **and Given:** que o filtro de reembolso está desativado
- **When:** eu acesso o Dashboard
- **Then:** devo ver o total correspondente à soma de todas as transações do período, formatado em BRL com duas casas decimais

- **Scenario:** Exibir total sem transações
- **Given:** que não possuo transações no período exibido
- **When:** eu acesso o Dashboard
- **Then:** devo ver o total de gastos como `R$ 0,00`

### User Story PF-003:

- **Summary:** Analisar gastos por categoria

#### Use Case:
- **As a** pessoa que controla as próprias finanças
- **I want to** visualizar meus gastos agrupados por categoria
- **so that** eu identifique onde concentro minhas despesas

#### Acceptance Criteria:
- **Scenario:** Agrupar lançamentos por categoria
- **Given:** que possuo transações em mais de uma categoria no período exibido
- **When:** eu acesso a visão de gastos por categoria no Dashboard
- **Then:** devo ver o total de cada categoria calculado apenas com as transações dessa categoria

### User Story PF-004:

- **Summary:** Consultar histórico mensal de despesas

#### Use Case:
- **As a** pessoa que controla as próprias finanças
- **I want to** visualizar o histórico mensal dos meus gastos
- **so that** eu possa comparar minha evolução de despesas ao longo do tempo

#### Acceptance Criteria:
- **Scenario:** Exibir totais por mês
- **Given:** que possuo lançamentos distribuídos em meses diferentes
- **When:** eu acesso o histórico mensal no Dashboard
- **Then:** devo ver um total de gastos para cada mês que possui lançamentos

### User Story PF-005:

- **Summary:** Registrar uma despesa paga por PIX

#### Use Case:
- **As a** pessoa que controla as próprias finanças
- **I want to** lançar uma despesa paga por PIX
- **so that** meu controle financeiro reflita um gasto realizado à vista

#### Acceptance Criteria:
- **Scenario:** Salvar despesa PIX válida
- **Given:** que estou autenticada
- **and Given:** que informei nome, valor positivo em BRL e uma categoria válida
- **When:** eu salvo uma despesa com forma de pagamento PIX
- **Then:** devo ver a transação criada no histórico e incluída nos cálculos do mês da data informada

- **Scenario:** Impedir lançamento sem categoria
- **Given:** que informei nome e valor positivo para uma despesa PIX
- **and Given:** que não selecionei uma categoria
- **When:** eu tento salvar a despesa
- **Then:** devo receber uma validação informando que a categoria é obrigatória e a transação não deve ser criada

- **Scenario:** Impedir valor não positivo
- **Given:** que informei uma categoria válida para uma despesa PIX
- **and Given:** que o valor informado é zero ou negativo
- **When:** eu tento salvar a despesa
- **Then:** devo receber uma validação de valor inválido e a transação não deve ser criada

### User Story PF-006:

- **Summary:** Classificar despesa com tags compatíveis

#### Use Case:
- **As a** pessoa que controla as próprias finanças
- **I want to** adicionar tags compatíveis a uma despesa
- **so that** eu possa detalhar e filtrar a finalidade do gasto

#### Acceptance Criteria:
- **Scenario:** Associar uma tag geral e uma tag específica válidas
- **Given:** que estou lançando uma despesa na categoria Alimentação
- **and Given:** que escolhi a tag específica Restaurante e a tag Família
- **When:** eu salvo a despesa
- **Then:** devo ver a transação com a categoria e as duas tags selecionadas

- **Scenario:** Restringir tag específica à categoria correspondente
- **Given:** que estou lançando uma despesa na categoria Saúde
- **When:** eu consulto as tags específicas disponíveis
- **Then:** devo poder selecionar somente Remédio ou Médico

- **Scenario:** Salvar despesa sem classificações opcionais
- **Given:** que informei nome, valor positivo e uma categoria válida
- **When:** eu salvo a despesa sem tags ou descrição
- **Then:** devo ver a transação criada sem esses campos opcionais

- **Scenario:** Associar várias tags aplicáveis a qualquer categoria
- **Given:** que já escolhi a tag Família
- **When:** eu tento também selecionar a tag Amigos
- **Then:** devo ver as duas tags selecionadas na transação

### User Story PF-007:

- **Summary:** Registrar compra única no cartão pela fatura correta

#### Use Case:
- **As a** pessoa que controla as próprias finanças
- **I want to** lançar uma compra à vista no cartão de crédito
- **so that** ela seja considerada na fatura mensal correta

#### Acceptance Criteria:
- **Scenario:** Incluir compra anterior ao fechamento na fatura atual
- **Given:** que o fechamento padrão do cartão é no dia 14
- **and Given:** que informei uma compra à vista no cartão com data no dia 13
- **When:** eu salvo a compra
- **Then:** devo ver o lançamento na fatura com vencimento no próximo dia 20 aplicável

- **Scenario:** Incluir compra no dia do fechamento na fatura seguinte
- **Given:** que o fechamento padrão do cartão é no dia 14
- **and Given:** que informei uma compra à vista no cartão com data no dia 14
- **When:** eu salvo a compra
- **Then:** devo ver o lançamento na fatura seguinte

- **Scenario:** Incluir compra após o fechamento na fatura seguinte
- **Given:** que o fechamento padrão do cartão é no dia 14
- **and Given:** que informei uma compra à vista no cartão com data no dia 15
- **When:** eu salvo a compra
- **Then:** devo ver o lançamento na fatura seguinte

### User Story PF-008:

- **Summary:** Registrar compra parcelada no cartão

#### Use Case:
- **As a** pessoa que controla as próprias finanças
- **I want to** parcelar uma compra no cartão de crédito
- **so that** cada parcela componha a fatura mensal correspondente

#### Acceptance Criteria:
- **Scenario:** Distribuir parcelas entre as faturas
- **Given:** que o fechamento padrão do cartão é no dia 14
- **and Given:** que informei uma compra de `R$ 1.200,00` em 3 parcelas com data no dia 13
- **When:** eu salvo a compra parcelada
- **Then:** devo ver três lançamentos mensais de `R$ 400,00`, iniciando na fatura atual e seguindo nas duas faturas subsequentes

- **Scenario:** Iniciar parcelas na fatura seguinte após fechamento
- **Given:** que o fechamento padrão do cartão é no dia 14
- **and Given:** que informei uma compra em 2 parcelas com data no dia 14
- **When:** eu salvo a compra parcelada
- **Then:** devo ver a primeira parcela na fatura seguinte e a segunda na fatura posterior

### User Story PF-009:

- **Summary:** Configurar ciclo global do cartão

#### Use Case:
- **As a** pessoa que controla as próprias finanças
- **I want to** definir os dias de fechamento e vencimento do meu cartão
- **so that** minhas compras sejam atribuídas às faturas conforme meu ciclo real

#### Acceptance Criteria:
- **Scenario:** Exibir configuração padrão
- **Given:** que ainda não alterei a configuração do cartão
- **When:** eu acesso as configurações do cartão
- **Then:** devo ver o fechamento definido como dia 14 e o vencimento definido como dia 20

- **Scenario:** Aplicar configuração alterada a nova compra
- **Given:** que alterei o fechamento para o dia 10 e o vencimento para o dia 18
- **and Given:** que informei uma nova compra à vista no cartão com data no dia 10
- **When:** eu salvo a compra
- **Then:** devo ver o lançamento atribuído à fatura seguinte com vencimento no dia 18

### User Story PF-010:

- **Summary:** Incluir ou excluir reembolsos da visão financeira

#### Use Case:
- **As a** pessoa que controla as próprias finanças
- **I want to** alternar a inclusão de despesas reembolsáveis no Dashboard
- **so that** eu possa analisar tanto o gasto bruto quanto o gasto efetivamente assumido

#### Acceptance Criteria:
- **Scenario:** Excluir reembolso por padrão
- **Given:** que existe uma transação no período com a tag Reembolso
- **and Given:** que o filtro de reembolso está desativado
- **When:** eu acesso o Dashboard
- **Then:** a transação com tag Reembolso não deve compor o total, os gastos por categoria nem o histórico mensal

- **Scenario:** Incluir reembolso ao ativar filtro
- **Given:** que existe uma transação no período com a tag Reembolso
- **and Given:** que o filtro de reembolso está desativado
- **When:** eu ativo o filtro de reembolso
- **Then:** a transação com tag Reembolso deve passar a compor o total, os gastos por categoria e o histórico mensal

### User Story PF-011:

- **Summary:** Corrigir uma transação já lançada

#### Use Case:
- **As a** pessoa que controla as próprias finanças
- **I want to** editar uma transação existente
- **so that** meu Dashboard permaneça fiel às minhas despesas reais

#### Acceptance Criteria:
- **Scenario:** Recalcular visões após editar valor
- **Given:** que possuo uma transação PIX de `R$ 100,00` no período exibido
- **When:** eu altero o valor dessa transação para `R$ 125,50` e salvo
- **Then:** devo ver Dashboard, categoria e histórico mensal recalculados com `R$ 125,50`

### User Story PF-012:

- **Summary:** Remover uma transação indevida

#### Use Case:
- **As a** pessoa que controla as próprias finanças
- **I want to** excluir uma transação lançada por engano
- **so that** ela deixe de distorcer meu controle financeiro

#### Acceptance Criteria:
- **Scenario:** Recalcular visões após excluir transação
- **Given:** que possuo uma transação PIX incluída nos totais do período exibido
- **When:** eu excluo a transação
- **Then:** devo vê-la removida do histórico e dos cálculos de total, categoria e histórico mensal

- **Scenario:** Excluir compra parcelada
- **Given:** que possuo uma compra parcelada com lançamentos em faturas futuras
- **When:** eu excluo a compra parcelada
- **Then:** devo ver removidos todos os lançamentos mensais e parcelas associados a essa compra

### User Story PF-013:

- **Summary:** Exportar dados financeiros em CSV

#### Use Case:
- **As a** pessoa que controla as próprias finanças
- **I want to** exportar minhas transações e lançamentos mensais em CSV
- **so that** eu possa analisar meus dados em outra ferramenta

#### Acceptance Criteria:
- **Scenario:** Exportar transações
- **Given:** que possuo transações registradas
- **When:** eu solicito a exportação CSV de transações
- **Then:** devo receber um arquivo CSV com uma linha para cada transação e seus dados de identificação, valor, data, categoria, subcategoria, tags, descrição e forma de pagamento

- **Scenario:** Exportar lançamentos e parcelas mensais
- **Given:** que possuo compras à vista e parceladas no cartão
- **When:** eu solicito a exportação CSV de lançamentos mensais
- **Then:** devo receber um arquivo CSV com uma linha para cada lançamento ou parcela e a respectiva fatura mensal

- **Scenario:** Exportar sem dados
- **Given:** que não possuo transações registradas
- **When:** eu solicito a exportação CSV de transações
- **Then:** devo receber um arquivo CSV válido contendo somente o cabeçalho
