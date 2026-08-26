# Decisões de negócio

## Status deste documento

Este documento registra as regras de domínio já acordadas. Decisões confirmadas são requisitos do escopo atual; premissas pendentes indicam apenas lacunas a definir, sem criar requisitos novos.

## Decisões confirmadas

### Usuário e formas de despesa

- O produto atenderá **1 usuário**.
- Serão registradas despesas pagas por **PIX** e por **cartão**.
- Não haverá suporte a múltiplos cartões.
- Não haverá registro ou pagamento de fatura.
- Não haverá transferências.

### Categorias e tags

- Cada transação possui exatamente uma categoria: **Contas Fixas**, **Higiene**, **Saúde**, **Alimentação**, **Transporte**, **Lazer**, **Vestuário**, **Pessoal** ou **Presente**.
- As tags que podem ser aplicadas a qualquer categoria são: **Reembolso**, **Família** e **Amigos**.
- A transação pode receber múltiplas tags gerais e, no máximo, uma tag específica compatível com a sua categoria:
  - **Contas Fixas**: Celular, Energia, Casa;
  - **Saúde**: Remédio, Médico;
  - **Alimentação**: Restaurante, Padaria/Supermercado, Lanche;
  - **Transporte**: Uber, Viagem;
  - **Lazer**: Assinatura, Ingressos, Outro.
- Higiene, Vestuário, Pessoal e Presente não têm tags específicas no escopo atual.

### Reembolso

- Reembolso integral será indicado por uma **tag** na transação.
- O dashboard oferecerá um **toggle** para incluir ou excluir das métricas as transações marcadas com `Reembolso`.
- Esta regra cobre reembolso integral; não foi acordada uma regra para reembolso parcial.

### Transações e parcelas

- Uma transação registra nome, valor, data da compra, forma de pagamento, categoria, tags e descrição opcional.
- O valor é exibido em padrão brasileiro, por exemplo `R$ 1.250,27`, sempre com duas casas decimais.
- Transações de cartão podem ter parcelas.
- Depois da edição ou exclusão de uma transação, os valores derivados devem ser **recomputados** para refletir o estado atual dos dados, inclusive quando houver parcelas.

### Fechamento e vencimento do cartão

- A configuração global padrão é: **fechamento no dia 14** e **vencimento no dia 20**.
- A regra de competência da fatura é:
  - compras feitas no dia **14 ou depois** pertencem à **fatura seguinte**;
  - compras entre os dias **15 e 13** pertencem à fatura cujo vencimento ocorre no próximo dia **20 correspondente**.

Exemplos confirmados:

- `13/08` → vencimento em `20/08`;
- `14/08` → vencimento em `20/09`;
- `15/08` → vencimento em `20/09`.

### Exportação

- Há necessidade de exportar os dados em **CSV**.

## Premissas pendentes

- Não foi definido o comportamento de datas inexistentes em meses curtos para fechamento ou vencimento.
- Não foi definido o conteúdo, filtros ou ordenação do arquivo CSV.
- Não foram definidas regras de recorrência, limite de cartão, conciliação, reembolso parcial ou pagamentos de fatura; estas capacidades não devem ser inferidas.
