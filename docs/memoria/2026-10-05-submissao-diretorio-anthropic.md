# Submeter ao diretório da Anthropic: slug kebab-case, autor sem nome de conector, nada de ler ~/.claude

**Contexto:** primeira submissão do plugin em claude.ai/directory/manage (2026-10-04). Validador
do portal devolveu 4 policy holds e 1 aviso antes de aceitar.

**Causa / decisão:**
- Nome do plugin com ponto (`tailor.ia-lean`) passa no Claude Code mas não no sync da loja.
  Slug ficou `tailor-ia-lean`; rótulo visível via `displayName` em `plugin.json`.
- `author.name: "Tailor"` colidiu com o conector `tailor` já listado e com `teamtailor`.
  Virou `FFID`. Só o dono do nome publica sob ele.
- Hook que lia `~/.claude/settings.json` (para avisar se caveman/ponytail faltavam) foi
  marcado como "uses a credential from the user's machine". Removido. Voltou na 0.5.2 (checagem do
  caveman em `lean-rules`) e travou toda versão até a 0.7.8; tirado de novo na 0.8.0. Não ler nada em `~/.claude`.
- Ícone `.claude-plugin/icon.png` (512 a 2048 px, PNG) vira o ícone da listagem só na
  primeira gravação; trocar depois não muda.
- `documentationUrl` e `supportUrl` são pedidos na tela de Detalhes mas o validador avisa
  "unrecognized field". Inofensivo; mantidos.

- Desde 2026-11-03 o diretório só aceita hook de comando e mod (`modules` em `hooks/hooks.json`) de organização Verified, e a FFID não é. Texto do portal: "Hooks of type command accepted only from Verified organizations" e "Mods accepted only from Verified organizations". Trocar o tipo do hook não resolve. Toda versão da 0.7.0 à 0.9.0 é recusada por isso, não pela leitura de `~/.claude`; a 0.8.0 não passou. A v0.3.1 segue no ar, marcada como fora da política.
- O portal diz: "Anthropic chooses who is a Verified organization, and there's no way to ask to become one yet". Não há como pedir.
- Decisão (2026-11-15): duas edições. O `main` segue completo e é o que o marketplace do GitHub (`ffid-br/tailor-ia-lean`) instala. O diretório rastreia o branch `diretorio` (Configurações → Origem → "Tracked branch or tag"), gerado por `scripts/gerar-diretorio`: só skills e agentes, sem `hooks/`, `scripts/`, testes e `docs/`. Rodar o script e `git push -f origin diretorio` a cada versão nova.
**Por quê:** dois holds ficaram sem solução e foram para revisor humano: "scripts the
validator couldn't follow" (bash com loops e heredoc) e leitura de `$HOME/.tailor-ia-lean/`.
Portal diz que pode submeter assim. Não vale reescrever o script para agradar o validador.

**Toca:** `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `scripts/lean-rules`, `scripts/gerar-diretorio`
