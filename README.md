# Tailor.ia Lean — menos tokens, mais acerto

Plugin de [Claude Code](https://claude.com/claude-code) que injeta, no início de cada sessão,
um bloco curto de regras para **gastar menos tokens** e **raciocinar melhor**, e traz dois guias
acionáveis: `/lean` (o porquê de cada regra, com exemplos) e `/fluxo-dev` (ticket → branch →
PR → merge, enxuto). Traz também agentes em Haiku e Sonnet
para orquestração barata e `/fechar` para guardar a memória da sessão e limpar o contexto. Em português.

Destilado de prática real em repositórios de produção. Sem dependência, sem servidor, sem
telemetria: arquivos de texto e dois scripts bash.

## Instalar

```
/plugin marketplace add ffid-br/tailor-ia-lean
/plugin install tailor-ia-lean
```

Abra uma sessão nova. O bloco "Tailor.ia Lean — ativo nesta sessão" aparece no contexto
(~350 tokens, uma vez por sessão).

Recomendado junto, mesma lógica de instalação:

| Plugin | Repo | O que faz |
|---|---|---|
| caveman | `JuliusBrussee/caveman` | Comprime a prosa da resposta sem perder termo técnico |
| ponytail | `DietrichGebert/ponytail` | Força a solução mais simples que funciona em toda tarefa de código |



## O que vem

| Item | Quando entra | Custo |
|---|---|---|
| Hook `SessionStart` | toda sessão, resume, `/clear`, `/compact` | ~350 tokens |
| Skill `lean` | `/lean` ou pergunta sobre custo, contexto, qualidade | sob demanda |
| Skill `fluxo-dev` | `/fluxo-dev` ou pedido de "fluxo completo", "abre o PR" | sob demanda |
| Skill `orquestrar` | `/orquestrar`, "usa modelo mais barato", tarefa com 3+ arquivos | sob demanda |
| Skill `fechar` | `/fechar`, "guarda e limpa", fim de sessão | sob demanda |
| Agente `batedor` | localizar código (arquivo:linha, callers) | Haiku |
| Agente `operario` | implementar passo já especificado, até 3 arquivos, roda gates | Sonnet |
| Agente `revisor` | defeitos do diff, uma linha cada | Sonnet |

## Orquestrar com modelos mais baratos

O modelo principal planeja e integra. Localização, edição mecânica e revisão vão para agentes
em Haiku e Sonnet, que custam uma fração e não ocupam o seu contexto. `/orquestrar` descreve o
fluxo: entender → `batedor` localiza → plano em passos → `operario` por passo → `revisor` →
integrar. Tarefa de um arquivo: faça direto, subagente não compensa.

## Memória: guardar, compactar, limpar

`/fechar` ao fim da sessão: grava em `docs/memoria/AAAA-MM-DD-slug.md` o que não está no código
(causa raiz, hipótese descartada, decisão), funde duplicados, apaga registros vencidos e diz se o
próximo passo é `/compact` (mesma tarefa) ou `/clear` (assunto novo). Sem repositório git, grava
em `~/.tailor-ia-lean/memoria/<pasta>/`. O hook de sessão lê o índice dos dois lugares na próxima
abertura. `scripts/memoria-status` lista os registros com idade.

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
