# Requisitos visuais — Bonsai

## Direção do produto

**Produto:** Bonsai, um controle pessoal de despesas por PIX e cartão.  
**Público:** uma pessoa que registra e consulta os próprios gastos no celular.  
**Função principal da interface:** permitir conferir a fatura e registrar uma despesa rapidamente, sem parecer uma planilha reduzida.

## Princípios de interface

- A primeira versão será **mobile-first**: todos os fluxos e telas serão projetados primeiro para larguras de celular.
- A navegação, formulários, gráficos e tabelas devem funcionar sem rolagem horizontal em telas estreitas.
- O uso em desktop poderá receber adaptação posterior, mas não deve comprometer a experiência mobile nem introduzir um layout desktop como prioridade.
- Áreas interativas terão pelo menos `44 × 44 px`, foco visível e contraste compatível com tema escuro.
- O produto deve respeitar `prefers-reduced-motion`.

## Identidade

- Nome do aplicativo: **Bonsai**.
- Enquanto não houver logotipo, a marca será apresentada como `⛩️ Bonsai`.
- A fonte é **Inter**, carregada pelo `next/font/google` para que seja otimizada e hospedada pelo próprio build do Next.js, sem uma requisição de fonte no navegador ao Google.
- Tipografia:
  - título e números de maior destaque: Inter 700;
  - textos e controles: Inter 400/500;
  - valores, datas, percentuais e contadores: Inter 600 com `font-variant-numeric: tabular-nums`.

## Paleta dark roxa

| Token | Cor | Uso |
| --- | --- | --- |
| `ink` | `#100B1E` | fundo principal |
| `surface` | `#1A1230` | cartões, menus e campos |
| `surface-raised` | `#251943` | elementos elevados e estado selecionado |
| `violet` | `#A78BFA` | ação principal, foco e dados em destaque |
| `orchid` | `#D8B4FE` | realces, textos de apoio e gradiente discreto |
| `mint` | `#5EEAD4` | confirmação, progresso positivo e contraste semântico |

- Texto principal deve usar branco suavizado, e texto secundário lilás dessaturado; não usar roxo claro para textos longos.
- Estados de erro e alerta devem ter cores próprias, acessíveis e semanticamente claras; a cor roxa não pode ser o único indicador de estado.
- Gradientes, quando usados, serão restritos a detalhes de hierarquia, nunca como fundo de tela inteiro.

## Estrutura e navegação mobile

O menu é fixo no rodapé, com área segura para dispositivos com notch/home indicator. O conteúdo da tela deve reservar espaço inferior suficiente para não ficar atrás da navegação.

```text
┌─────────────────────────────────┐
│ ⛩️ Bonsai              Agosto    │
│                                 │
│ conteúdo da tela                 │
│                                 │
│                                 │
├─────────────────────────────────┤
│ Resumo     Fatura    [+]  Lista  │
└─────────────────────────────────┘
```

- A barra inferior é fixa e visualmente elevada sobre a superfície.
- O botão `+` é central, maior e destacado em violeta. Sua ação é sempre **“Adicionar transação”**.
- O botão abre um fluxo de lançamento de transação que prioriza preenchimento rápido no celular.
- Cada item da navegação possui ícone e rótulo; o item atual precisa ter indicação de seleção além de cor.
- Configurações podem ser acessadas a partir da tela de resumo ou lista na primeira versão, sem acrescentar um quinto item fixo prematuramente.

## Assinatura visual

O elemento característico será a **faixa de ciclo da fatura**: uma linha compacta que mostra visualmente o intervalo entre fechamento e vencimento e posiciona o mês corrente. Ela aparece no resumo e na tela de fatura para transformar uma regra financeira abstrata em uma referência rápida, sem decorar a tela.

Esta escolha evita o padrão genérico de “grandes cards com métricas e gradiente”: os números continuam importantes, mas o ciclo do cartão é a informação que organiza o produto.

## Componentes e conteúdo

- Cards devem ter hierarquia por espaçamento e superfície, não por excesso de bordas ou sombras.
- Valores devem ser exibidos em BRL, por exemplo `R$ 1.250,27`, sempre alinhados para leitura rápida.
- Gráficos devem ter legenda clara, alternativa textual para os dados essenciais e cores distinguíveis no tema escuro.
- Formulários devem revelar campos progressivamente: ao selecionar cartão, exibir parcelamento; ao selecionar uma categoria, exibir somente tags específicas compatíveis.
- O formulário exibe o toggle **Recorrente** somente para PIX e cartão à vista. Ao escolher mais de uma parcela, o toggle é desligado e a interface informa que a compra passou a ser avulsa.
- Ao editar uma recorrência, a interface deve explicar a partir de qual ocorrência as mudanças terão efeito, sem sugerir que meses anteriores serão alterados.
- Lista e Fatura exibem selo e ícone **Recorrente** nas ocorrências pertencentes a uma série.
- Resumo, Fatura e Lista exibem o aviso discreto **Inclui recorrências previstas** quando o período contém projeções futuras.
- A tag `Reembolso` deve permanecer reconhecível mesmo quando o toggle que a inclui/exclui do Dashboard estiver ativo.

## Feedback visual responsivo

Cada interação deve comunicar estado imediatamente:

- carregamento inicial: skeleton compatível com o conteúdo, sem troca brusca de layout;
- envio de formulário: botão mostra progresso e evita submissão duplicada;
- sucesso: toast breve com Sonner e atualização visível do dado afetado;
- erro de validação: mensagem próxima ao campo e instrução objetiva para corrigir;
- erro de servidor: mensagem clara com ação de tentar novamente, sem expor detalhes técnicos;
- lista vazia: explicar o que ainda não existe e oferecer “Adicionar transação”;
- exclusão avulsa: pedir confirmação explícita antes de remover uma transação;
- exclusão recorrente: explicitar a ação **Excluir esta e as próximas recorrências** e informar que o histórico anterior será preservado.

Animações devem ser curtas e funcionais: abertura do formulário, confirmação de inclusão e atualização de um valor. Elas não podem atrasar a tarefa nem ocultar o estado real do salvamento.

## Critério de revisão visual

Antes de considerar uma tela pronta, verificar em viewport mobile:

- [ ] Navegação inferior não cobre conteúdo nem controles.
- [ ] O botão `+` central é acessível e descreve “Adicionar transação”.
- [ ] Inter, contraste e hierarquia numérica estão consistentes.
- [ ] Todos os estados de carregamento, sucesso, erro e vazio têm feedback.
- [ ] A tela é utilizável por toque, teclado e leitor de tela.
- [ ] Com redução de movimento ativada, nenhuma informação depende de animação.
