# tailor-lean — menos tokens, mais acerto

Plugin de [Claude Code](https://claude.com/claude-code) que injeta, no início de cada sessão,
um bloco curto de regras para **gastar menos tokens** e **raciocinar melhor**, e traz dois guias
acionáveis: `/lean` (o porquê de cada regra, com exemplos) e `/fluxo-dev` (ticket → branch →
PR → merge, enxuto). Em português.

Destilado de prática real em repositórios de produção. Sem dependência, sem servidor, sem
telemetria: três arquivos de texto e um script de 30 linhas.

## Instalar

```
/plugin marketplace add ffid-br/tailor-lean
/plugin install tailor-lean
```

Abra uma sessão nova. O bloco "Tailor lean — ativo nesta sessão" aparece no contexto
(~350 tokens, uma vez por sessão).

Recomendado junto, mesma lógica de instalação:

| Plugin | Repo | O que faz |
|---|---|---|
| caveman | `JuliusBrussee/caveman` | Comprime a prosa da resposta sem perder termo técnico |
| ponytail | `DietrichGebert/ponytail` | Força a solução mais simples que funciona em toda tarefa de código |

O hook avisa uma linha se algum dos dois não estiver instalado.

## O que vem

| Item | Quando entra | Custo |
|---|---|---|
| Hook `SessionStart` | toda sessão, resume, `/clear`, `/compact` | ~350 tokens |
| Skill `lean` | `/lean` ou pergunta sobre custo, contexto, qualidade | sob demanda |
| Skill `fluxo-dev` | `/fluxo-dev` ou pedido de "fluxo completo", "abre o PR" | sob demanda |

## As regras, em resumo

**Tokens:** localize antes de ler (`grep` + `sed -n`), filtre saída de comando, delegue
varredura a subagente, agrupe chamadas, não releia o que editou, resposta curta, `/compact`
em marco.

**Raciocínio:** entenda o fluxo inteiro antes de editar, bug é causa raiz (liste os callers),
reaproveite o que existe, nada especulativo, quality gates antes de "pronto", registre em
`docs/memoria/` o que não está no código.

Detalhe e exemplos em [`skills/lean/SKILL.md`](skills/lean/SKILL.md).

## Contribuir

Regra nova precisa dizer o que evita e quanto custa. Abra PR. Regra que só vale para um time
ou repositório específico vai no `CLAUDE.md` daquele repositório, não aqui.

## Licença

MIT.
