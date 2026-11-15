# Tailor.ia Lean — menos tokens, mais acerto

<img src=".claude-plugin/icon.png" alt="Tailor.ia" width="96" align="right">

Plugin de [Claude Code](https://claude.com/claude-code) que injeta, no início de cada sessão,
um bloco curto de regras para **gastar menos tokens** e **raciocinar melhor**, e traz dois guias
acionáveis: `/lean` (o porquê de cada regra, com exemplos) e `/fluxo-dev` (ticket → branch →
PR → merge, enxuto). Traz também agentes em Haiku e Sonnet
para orquestração barata e `/fechar` para guardar a memória da sessão e limpar o contexto. Em português.

[Tailor.ia](https://tailor.ia.br) é uma marca da [FFID](https://www.ffid.com.br), empresa de AI Agents para a jornada do
cliente, da captação ao pós-venda.

Destilado de prática real em repositórios de produção. Sem dependência, sem servidor, sem
telemetria: arquivos de texto e dois scripts bash.

## Instalar

```
/plugin marketplace add ffid-br/tailor-ia-lean
/plugin install tailor-ia-lean@tailor-ia-lean
```

Abra uma sessão nova. O bloco "Tailor.ia Lean — ativo nesta sessão" aparece no contexto
(~350 tokens mais o índice da memória, até 15 linhas, uma vez por sessão).

### No Codex

```
codex plugin marketplace add ffid-br/tailor-ia-lean
codex plugin add tailor-ia-lean@tailor-ia-lean
```

Na primeira sessão o Codex pede para confiar no hook do plugin: aceite, é ele que injeta as
regras. No Codex as skills se chamam com `$` (`$lean`, `$fluxo-dev`, `$orquestrar`, `$fechar`)
e o hook lê `AGENTS.md` no lugar de `CLAUDE.md`. Os agentes `batedor`, `operario` e `revisor`
são do Claude Code; no Codex o hook troca a regra de delegação por "planeje os passos e valide
cada um". Atualizar: `codex plugin marketplace upgrade tailor-ia-lean`.

Recomendado junto, mesma lógica de instalação:

| Plugin | Repo | O que faz |
|---|---|---|
| caveman | `JuliusBrussee/caveman` | Comprime a prosa da resposta sem perder termo técnico |
| ponytail | `DietrichGebert/ponytail` | Força a solução mais simples que funciona em toda tarefa de código |



## O que vem

| Item | Quando entra | Custo |
|---|---|---|
| Hook `SessionStart` | toda sessão, resume, `/clear`, `/compact` | ~350 tokens + índice |
| Skill `lean` | `/lean` ou pergunta sobre custo, contexto, qualidade | sob demanda |
| Skill `fluxo-dev` | `/fluxo-dev` ou pedido de "fluxo completo", "abre o PR" | sob demanda |
| Skill `orquestrar` | `/orquestrar`, "usa modelo mais barato", tarefa com 3+ arquivos | sob demanda |
| Skill `fechar` | `/fechar`, "guarda e limpa", fim de sessão | sob demanda |
| Agente `batedor` | localizar código (arquivo:linha, callers) | Haiku |
| Agente `operario` | implementar passo já especificado, até 3 arquivos, roda gates | Sonnet |
| Agente `revisor` | defeitos do diff, uma linha cada | Sonnet |
| Trava de recursos | antes de cada agente novo: recusa acima do limite da máquina ou com ela sob pressão | zero token |
| Painel `/lean-painel` | abre sozinho em terminal largo; `/lean-painel` abre em qualquer largura | zero token |
| Painel `/lean-time` | visão de time: líder, colegas por papel, tarefas e log | zero token |

## Orquestrar com modelos mais baratos

O modelo principal planeja e integra. Localização, edição mecânica e revisão vão para agentes
em Haiku e Sonnet, que custam uma fração e não ocupam o seu contexto. `/orquestrar` descreve o
fluxo: entender → `batedor` localiza → plano em passos → `operario` por passo → `revisor` →
integrar. Tarefa de um arquivo: faça direto, subagente não compensa.

## Painel ao vivo

No Claude Code, um painel ao lado do chat mostra quem está fazendo o trabalho enquanto ele
acontece: cada delegação (`batedor`, `operario`, `revisor` ou outro agente) com modelo, tokens,
ferramentas e duração; o contexto relido e a saída do modelo principal; e quantas ferramentas
rodaram no principal contra nos agentes. Abre sozinho em terminal com 144+ colunas; em qualquer
largura, `/lean-painel`. Não entra no contexto do modelo. No Codex o painel não existe.

`/lean-time` abre a visão de time, no formato dos agent teams: o líder com três checkpoints
(antes do plano, colega travado, antes de concluir), as tarefas compartilhadas com o contador
`feitas/total`, uma caixa por colega com papel (`batedor`, `operario`, `revisor`), modelo e
estado, e o log da sessão com delegações e mensagens entre colegas. A barra de status resume:
`sonnet [running]  colegas [2/3]  líder [liderando]  tarefas [10/18]  tokens [182k]`. Cada caixa
mostra os tokens do colega, a do líder os dele, somados do `usage` de cada turno; a barra soma a
sessão toda, inclusive colegas que já saíram dos 6 guardados.
Sem ferramenta de tarefas na sessão, cada delegação vira uma tarefa (`tarefas (delegações)`), e a
caixa do líder conta `entregues`. Prompt novo seu começa rodada nova: na primeira delegação, sai
quem já entregou. Aviso de subagente não conta como prompt. A barra de um colega só
mostra fração quando ele é dono de tarefas; sem isso, mostra quantas ferramentas usou. Com
`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`, as tarefas e mensagens do time entram sozinhas.
O painel mostra os 6 últimos colegas em linhas de 3 e o pico de colegas rodando em paralelo na
sessão. `/lean-time 30` pede 30 linhas de altura quando o painel abre acima do prompt (modo sem
fullscreen, `CLAUDE_CODE_NO_FLICKER=0`); no fullscreen o engine sempre o encaixa na lateral.
Precisa de Claude Code com hooks module; em versão antiga ou no Codex não aparece.

### O que os hooks do painel fazem

Os dois painéis moram em `hooks/painel.tsx`. Os hooks observam e desenham; nenhum muda ou
reescreve o que passa por eles. O único que bloqueia é a trava de recursos do `agent.spawn`.

- `tool.call`: depois que a ferramenta roda, conta a chamada (principal ou agente) e, no `Agent`,
  guarda modelo, tokens e duração. Não altera entrada nem resultado.
- `agent.spawn`: antes de lançar, aplica a trava de recursos (abaixo); depois registra o colega
  novo (papel, modelo).
- `session.measure`: toast quando uma janela de rate limit (5h, 7d) cruza 80% ou 90%.
- `prompt.submit`: quando é o usuário digitando, marca rodada nova no `/lean-time`. Não muda o
  texto, o contexto nem a origem do prompt.
- `turn.start` / `turn.complete`: marcam líder e colegas ocupados ou livres e somam o `usage` do turno.
- `session.start` / `session.end`: registram `/lean-painel` e `/lean-time` e param o relógio.
- `ui.render`: desenha os dois painéis.

### Trava de recursos

Orquestração com agente demais em paralelo trava o computador. Antes de cada agente novo, o
plugin recusa o lançamento quando:

- o número de agentes rodando nesta sessão chegou ao limite calculado. A conta tem dois passos.
  Primeiro, quanto a máquina aguenta: metade dos núcleos ou 1 agente a cada 4 GB de RAM, o menor
  dos dois, entre 2 e 8 (12 núcleos e 24 GB dão 6; 8 núcleos e 8 GB dão 2). Depois, esse total
  é dividido pelas sessões do Claude Code abertas na máquina (processos `claude`, contados com
  `pgrep -x claude`), arredondado, com mínimo de 1: 6 da máquina com 4 sessões dão 2 por sessão.
  Sessão aberta e parada também conta. O painel e o aviso mostram a conta.
  `LEAN_MAX_AGENTES=6` fixa o limite desta sessão e pula a conta; `LEAN_MAX_AGENTES=0` desliga a trava;
- a memória livre do sistema está abaixo de 10%, ou a carga (load de 1 min) passa de 2x os núcleos,
  ou o swap em uso passa de metade da RAM com a memória livre abaixo de 25%.

O modelo recebe o motivo e a instrução de esperar um colega terminar ou fazer o passo direto.
Você vê um toast e uma linha `trava:` no log do `/lean-time`. O topo do `/lean-time` mostra a
caixa `máquina`: pressão (ok, alta, crítica), agentes rodando sobre o limite com a conta
(`6 da máquina ÷ 4 sessões do Claude Code`) e, na segunda linha, CPU e RAM em uso com barra e
porcentagem e o swap em GB. Atualiza a cada ~15 s. Com memória livre abaixo de 20%,
carga acima do número de núcleos ou swap acima de 1/4 da RAM, sai só o aviso (toast), também a cada ~15 s enquanto há colega
rodando. A leitura da máquina roda `sysctl -n vm.loadavg hw.ncpu kern.memorystatus_level hw.memsize vm.swapusage` a
cada agente novo e só existe no macOS; em Linux e Windows vale um limite fixo de 4 agentes. A trava vale para todo
agente da sessão, inclusive os de um Workflow.

## Memória: guardar, compactar, limpar

`/fechar` ao fim da sessão: grava em `docs/memoria/AAAA-MM-DD-slug.md` o que não está no código
(causa raiz, hipótese descartada, decisão), funde duplicados, apaga registros vencidos e diz se o
próximo passo é `/compact` (mesma tarefa) ou `/clear` (assunto novo). Sem repositório git, grava
em `~/.tailor-ia-lean/memoria/<pasta>/`. O hook de sessão lê o índice dos dois lugares na próxima
abertura. `scripts/memoria-status` lista os registros com idade. `/fechar` também grava um handoff
curto de "onde parei" dentro de `.git/` (nunca commitado), que a próxima sessão mostra uma vez e
descarta. Registros podem ter `**Fixo:** sim` (sempre no índice) e `**Status:** superado por
<arquivo>` (sai do índice, git guarda o histórico).

## As regras, em resumo

**Tokens:** localize antes de ler (`grep` + `sed -n`), filtre saída de comando, delegue
varredura a subagente, agrupe chamadas, não releia o que editou, resposta curta, `/compact`
em marco.

**Raciocínio:** entenda o fluxo inteiro antes de editar, bug é causa raiz (liste os callers),
reaproveite o que existe, nada especulativo, quality gates antes de "pronto", registre em
`docs/memoria/` o que não está no código.

Detalhe e exemplos em [`skills/lean/SKILL.md`](skills/lean/SKILL.md).

## Benchmark

Opus 5.5 no comando, 3 tarefas reais num frontend de ~1.000 arquivos, 5 repetições por célula,
duas rodadas (v3 e v4): **14% a 27% mais barato, 36% a 51% menos turnos do Opus, 36% a 56% menos
contexto relido, 20% a 28% menos tokens de saída.** Retomar tarefa com o handoff do `/fechar`:
5 de 5 acertos, contra 1 de 5 sem. Custo do ganho: execução mais lenta quando o subagente roda.
A primeira rodada, com Sonnet, deu contra o plugin e está publicada também.
Método, limites e dados brutos em [`benchmarks/`](benchmarks/README.md).

## Contribuir

Regra nova precisa dizer o que evita e quanto custa. Abra PR. Regra que só vale para um time
ou repositório específico vai no `CLAUDE.md` daquele repositório, não aqui.

## Licença

MIT.

## Desenvolvimento

`scripts/check` roda typecheck (`tsc` com os tipos do engine), `claude plugin test` e
`claude plugin validate`. Rode antes de todo push.
