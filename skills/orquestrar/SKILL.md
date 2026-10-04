---
name: orquestrar
description: >-
  Divide uma tarefa entre modelos de custo diferente: o modelo principal planeja e integra;
  agentes baratos localizam (batedor, Haiku), implementam passos definidos (operario, Sonnet)
  e revisam (revisor, Sonnet). Use quando a tarefa toca vários arquivos, quando alguém pedir
  "orquestra isso", "usa modelo mais barato", "delega", "divide em agentes", "/orquestrar",
  ou quando a conta de tokens do modelo principal estiver alta.
---

# orquestrar — modelo caro pensa, modelo barato executa

O modelo principal (Opus/Fable) custa 5 a 20 vezes um Haiku. Ele deve gastar tokens só no
que exige julgamento: entender o problema, decidir onde mexer, integrar o resultado. Leitura
de arquivo, edição mecânica e revisão de diff saem mais baratas em outro agente, e ainda
ficam fora do seu contexto.

## Papéis

| Agente | Modelo | Faz | Não faz |
|---|---|---|---|
| `batedor` | Haiku | localiza: arquivo:linha, callers, mapa de diretório | propor correção |
| `operario` | Sonnet | implementa passo especificado em até 3 arquivos, roda gates | decidir arquitetura |
| `revisor` | Sonnet | lista defeitos do diff, uma linha cada | elogiar, nit de estilo |
| principal | o da sessão | entende, planeja, decide, integra, fala com o usuário | ler arquivo inteiro |

## Fluxo

1. **Entender** (principal): leia CLAUDE.md e docs/memoria/. Formule a pergunta de
   localização, não a resposta.
2. **Localizar** (batedor, em paralelo quando houver várias perguntas independentes):
   "onde `closePeriod` é chamado", "quais componentes importam `useBilling`".
3. **Planejar** (principal): com as tabelas do batedor, escreva o plano em passos. Cada passo
   diz arquivos, mudança, como validar. Passo que toca mais de 3 arquivos: divida.
4. **Implementar** (operario, um agente por passo; paralelo se os passos não compartilham
   arquivo): passe a especificação do passo, nada mais. Ele devolve diff e gates.
5. **Revisar** (revisor): passe o diff. Achado de severidade alta volta para o operario com
   a linha exata.
6. **Integrar** (principal): leia só os resumos. Confira que o conjunto responde ao pedido
   original. Responda ao usuário.

## Quando não orquestrar

Tarefa de um arquivo e 20 linhas: faça direto. Subagente custa uma rodada de contexto; só
compensa quando a leitura evitada é maior que isso. Regra prática: 3+ arquivos para ler ou
2+ passos independentes.

## Passar a especificação certa

O operario só é barato se não precisar descobrir nada. Ruim: "corrige o filtro de status".
Bom:

```
Arquivo: src/pages/Propostas.tsx, função filtrarPorStatus (linha ~88).
Hoje compara `status === filtro` e falha quando filtro é "todos".
Mudar: `filtro === "todos" || status === filtro`.
Validar: npm test -- Propostas; caso "todos" deve listar 3 itens.
```
