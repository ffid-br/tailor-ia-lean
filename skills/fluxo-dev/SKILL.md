---
name: fluxo-dev
description: >-
  Fluxo de entrega enxuto com Claude Code, do ticket ao deploy: ler o ticket, criar branch,
  implementar o mínimo, rodar quality gates, abrir PR com referência ao ticket, registrar
  aprendizado em docs/memoria/ e só considerar concluído após merge. Use quando alguém pedir
  "faz o fluxo completo", "abre o PR", "qual o processo pra entregar isso", "como organizar
  branch e PR", "/fluxo-dev", ou quando uma tarefa de código precisa chegar até produção.
---

# fluxo-dev — do ticket ao merge, sem passo supérfluo

## 1. Ticket

Leia o ticket na ferramenta do time (board, issue, MCP). Extraia: sintoma ou pedido,
critério de aceite, telas ou endpoints citados. Não invente título; copie.

Sem ticket? Peça a chave ou crie um. PR sem rastro de ticket é o que ninguém entende em seis meses.

## 2. Branch

```bash
git checkout -b <tipo>/<chave>-<slug-curto>   # feat/QD-123-filtro-por-status
```

Nunca na branch padrão. Uma branch, um assunto.

## 3. Entender, depois implementar

Antes de editar: `CLAUDE.md`, `docs/memoria/`, fluxo de ponta a ponta. Depois a menor
mudança no lugar certo (regras em `/lean`). Teste junto, mínimo que falha se a lógica quebrar.

Tela ou comportamento visível mudou? Deixe aviso curto no próprio lugar, ou no PR, de "o que
mudou e por quê". Usuário final não lê changelog.

## 4. Quality gates

Os do repositório. Normalmente:

```bash
npm run lint && npm run typecheck && npm test
```

Falhou: corrige ou reporta com a linha do erro. Não abre PR vermelho.

## 5. Commit

Mensagem descreve a entrega funcional e o efeito, não a atividade:

```
feat(propostas): filtro por status na listagem, remove scroll manual em 200+ itens
```

Nada de `wip`, `ajustes`, `chore: update`.

## 6. PR

Título igual ao commit principal. Corpo:

```
**Ticket:** [CHAVE — título](link direto para o ticket)

O que muda · por quê · como testar (3 linhas no máximo cada)
```

Revisor definido pelo time. Abra com `gh pr create`.

## 7. Memória

Sessão descobriu algo que não está no código (causa raiz, hipótese descartada, restrição
externa)? `docs/memoria/AAAA-MM-DD-slug.md`, no mesmo PR. Formato:

```markdown
# <conclusão em uma linha>

**Contexto:** 2–3 linhas.
**Causa / decisão:** direto.
**Por quê:** o que foi descartado e o motivo.
**Toca:** `caminho/arquivo.ts`
```

## 8. Concluído

Só após merge (e deploy, se o repo tem pipeline). "Abri o PR" não é "pronto". Até lá o
ticket fica em revisão, não em concluído.
