# `claude plugin update` só pega mudança se a `version` subir e o marketplace for atualizado antes

**Contexto:** após push de correção no hook, `claude plugin update tailor-ia-lean@tailor-ia-lean`
respondia "already at the latest version" e o cache local seguia com o script antigo.

**Causa / decisão:** o cache em `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/` é
indexado pela `version` do `plugin.json`. Mesmo commit novo, mesma versão = nada muda. Sequência
que funciona: subir `version` → push → `claude plugin marketplace update tailor-ia-lean` →
`claude plugin update tailor-ia-lean@tailor-ia-lean` → reiniciar a sessão.

**Por quê:** sem o `marketplace update` o clone local do marketplace está atrás e nem vê a versão
nova. Todo commit que muda comportamento (hook, skill, agente) precisa de bump; docs não.

**Toca:** `.claude-plugin/plugin.json`
