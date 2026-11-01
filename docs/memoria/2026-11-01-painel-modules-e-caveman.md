# Plugin pode ter hooks de comando e `modules` no mesmo hooks.json, e o caveman 4 injeta regras nos agentes do lean

**Contexto:** a versão 0.5 trouxe o painel `/lean-painel` como hooks module (`hooks/painel.tsx`) ao lado do hook de comando `SessionStart`. Na 0.5.1, o caveman 4.0.1 passou a injetar o ruleset dele em todo subagente (`SubagentStart`).
**Causa / decisão:**
- `hooks/hooks.json` aceita `"hooks"` e `"modules"` juntos. O `claude plugin validate` passa, e o Codex continua só com as skills.
- O painel usa `tool.call`. Agente lançado em segundo plano devolve o resultado sem `totalTokens`, então o fim dele chega no `turn.complete` com `agentId`.
- Com o caveman ligado, batedor, operario e revisor podiam largar a tabela por causa da regra "no decorative tables". A solução foi uma cláusula nos três `.md` dizendo que o formato de saída é contrato e vale mais que o modo de estilo.
**Por quê:** a alternativa era desligar o caveman nos subagentes. Isso não se controla do lado do lean, e o caveman roda em todo agente, exceto `cavecrew-*`.
**Toca:** `hooks/painel.tsx`, `hooks/hooks.json`, `agents/*.md`, `scripts/lean-rules`
**Status:** vigente
