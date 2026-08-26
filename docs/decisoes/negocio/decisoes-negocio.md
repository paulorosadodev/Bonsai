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
    - **Saúde**: Remédio, Médico, Academia;
    - **Alimentação**: Restaurante, Padaria/Supermercado, Lanche;
    - **Transporte**: Uber, Viagem;
    - **Lazer**: Assinatura, Ingressos, Outro.
- Higiene, Vestuário, Pessoal e Presente não têm tags específicas no escopo atual.

### Reembolso

- Reembolso integral será indicado por uma **tag** na transação.
- O dashboard oferecerá um **toggle** para incluir ou excluir das métricas as transações marcadas com `Reembolso`.
- Transações com a tag `Reembolso` serão excluídas das métricas por padrão.
- Esta regra cobre reembolso integral; não foi acordada uma regra para reembolso parcial.

### Transações e parcelas

- Uma transação registra nome, valor, data da compra, forma de pagamento, categoria, tags e descrição opcional.
- O valor é exibido em padrão brasileiro, por exemplo `R$ 1.250,27`, sempre com duas casas decimais.
- Transações de cartão podem ter parcelas.
- Uma transação pode ser recorrente somente quando for paga por PIX ou por cartão à vista, com uma única parcela.
- Depois da edição ou exclusão de uma transação, os valores derivados devem ser **recomputados** para refletir o estado atual dos dados, inclusive quando houver parcelas.
- A edição de uma compra parcelada recalculará todo o histórico de parcelas dessa compra.

### Compras recorrentes

- Uma compra marcada como **Recorrente** repete-se mensalmente, no mesmo dia e com os mesmos dados da definição vigente.
- As ocorrências futuras são projetadas sob demanda; não serão pré-criadas transações para um horizonte arbitrário.
- A primeira ocorrência usa a data informada no formulário:
    - PIX pertence ao mês civil dessa data;
    - cartão à vista segue normalmente o ciclo da fatura. Por exemplo, com fechamento no dia 14, uma recorrência criada em `15/08` aparece na fatura de setembro, com vencimento em `20/09`.
- Uma nova recorrência não aceita data anterior à data civil atual. A conversão de uma compra avulsa passada segue a regra específica de conversão e inicia a série na próxima data mensal ainda não realizada.
- Quando o dia original não existe em um mês, a ocorrência usa o último dia disponível desse mês.
- O valor e os demais dados de uma série podem mudar apenas a partir da próxima ocorrência ainda não realizada:
    - uma edição antes do dia mensal da compra afeta a ocorrência do mês atual;
    - uma edição no dia da compra ou depois preserva essa ocorrência e passa a valer no mês seguinte;
    - meses anteriores e ocorrências já realizadas no mês atual são históricos imutáveis.
- Editar uma ocorrência passada não altera o passado; a mudança passa a valer na próxima ocorrência ainda não realizada.
- Alterações de nome, valor, forma de pagamento, categoria, tags, descrição ou dia mensal preservam o histórico e afetam somente ocorrências futuras.
- Uma compra avulsa elegível pode ser convertida em recorrente:
    - se a compra ainda não ocorreu, ela pode ser a primeira ocorrência;
    - se a compra é passada, ela permanece avulsa e a série começa na próxima data mensal ainda não realizada.
- A recorrência pode ser encerrada de duas formas:
    - excluir uma ocorrência recorrente remove essa ocorrência e encerra as seguintes, após confirmação explícita;
    - desligar o toggle **Recorrente** mantém a ocorrência sendo editada como compra avulsa e encerra as posteriores.
- Ao transformar uma recorrência de cartão em compra parcelada, o toggle **Recorrente** é desligado automaticamente e a compra passa a ser avulsa, com aviso na interface.
- Mudanças nos dias de fechamento ou vencimento recalculam a competência apenas das ocorrências recorrentes ainda não realizadas; o histórico permanece preservado.
- Lista e Fatura identificam ocorrências recorrentes com selo e ícone **Recorrente**.
- Resumo, Fatura e Lista incluem ocorrências recorrentes previstas para o período consultado. Quando um total contém previsões, a interface informa **Inclui recorrências previstas**.
- A exportação CSV contém somente ocorrências realizadas até a data atual; previsões futuras não são exportadas.

### Fechamento e vencimento do cartão

- A configuração global padrão é: **fechamento no dia 14** e **vencimento no dia 20**.
- Fechamento e vencimento aceitam somente dias de **1 a 28**, eliminando datas inexistentes nos meses curtos.
- Alterações no fechamento ou vencimento recalculam apenas competências do mês atual e futuras; competências anteriores são preservadas.
- A regra de competência da fatura é:
    - compras feitas no dia **14 ou depois** pertencem à **fatura seguinte**;
    - compras antes do fechamento pertencem à fatura com o próximo vencimento correspondente.

Exemplos confirmados:

- `13/08` → vencimento em `20/08`;
- `14/08` → vencimento em `20/09`;
- `15/08` → vencimento em `20/09`.

### Competência do Dashboard

- Despesas pagas por PIX são agrupadas pelo mês da data da compra.
- Despesas de cartão são agrupadas pelo mês de vencimento da respectiva fatura.

### Exportação

- Há necessidade de exportar os dados em **CSV**.
- Ocorrências recorrentes previstas para datas futuras não entram no CSV.

## Premissas pendentes

- Não foi definido o conteúdo, filtros ou ordenação do arquivo CSV.
- Não foram definidas regras de limite de cartão, conciliação, reembolso parcial ou pagamentos de fatura; estas capacidades não devem ser inferidas.
