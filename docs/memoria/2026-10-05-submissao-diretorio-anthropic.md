# Submeter ao diretório da Anthropic: slug kebab-case, autor sem nome de conector, nada de ler ~/.claude

**Contexto:** primeira submissão do plugin em claude.ai/directory/manage (2026-10-04). Validador
do portal devolveu 4 policy holds e 1 aviso antes de aceitar.

**Causa / decisão:**
- Nome do plugin com ponto (`tailor.ia-lean`) passa no Claude Code mas não no sync da loja.
  Slug ficou `tailor-ia-lean`; rótulo visível via `displayName` em `plugin.json`.
- `author.name: "Tailor"` colidiu com o conector `tailor` já listado e com `teamtailor`.
  Virou `FFID`. Só o dono do nome publica sob ele.
- Hook que lia `~/.claude/settings.json` (para avisar se caveman/ponytail faltavam) foi
  marcado como "uses a credential from the user's machine". Removido.
- Ícone `.claude-plugin/icon.png` (512 a 2048 px, PNG) vira o ícone da listagem só na
  primeira gravação; trocar depois não muda.
- `documentationUrl` e `supportUrl` são pedidos na tela de Detalhes mas o validador avisa
  "unrecognized field". Inofensivo; mantidos.

**Por quê:** dois holds ficaram sem solução e foram para revisor humano: "scripts the
validator couldn't follow" (bash com loops e heredoc) e leitura de `$HOME/.tailor-ia-lean/`.
Portal diz que pode submeter assim. Não vale reescrever o script para agradar o validador.

**Toca:** `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `scripts/lean-rules`
