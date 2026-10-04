# Benchmarks

Mesmas tarefas, mesmo repositório, com e sem o plugin. Medido pelo JSON do `claude -p`
(`total_cost_usd`, `num_turns`, `usage`). Repositório alvo: um frontend React de ~1.000 arquivos
em produção. Três tarefas somente leitura:

- **T1** localizar a lógica de autenticação e seus callers (arquivo:linha);
- **T2** mapear como o frontend fala com o backend (bases de URL, onde são configuradas, qual repo atende);
- **T3** investigar um bug de filtro de status: localizar, listar callers, propor a menor correção em texto.

Reproduzir: `REPO=/caminho/do/repo MODEL=opus benchmarks/run.sh`. Liga e desliga os plugins via
`claude plugin enable|disable` entre condições; restaura tudo ao fim.

## v3 · Opus 5.5 como modelo principal · plugin 0.3.0 · 5 repetições · 2026-10-04

Mediana de 5 execuções por célula (30 no total). Dados brutos em `2026-10-04-opus-v3.jsonl`.

| Tarefa | Custo | Turnos do Opus | Contexto relido (cache) | Tokens de saída | Tempo |
|---|---|---|---|---|---|
| T1 localizar auth | $0,44 → **$0,38** (−14%) | 9 → **4** | 314k → **137k** | 3,7k → 2,8k | 39s → 95s |
| T2 mapear backend | $0,41 → **$0,26** (−37%) | 14 → **9** | 351k → **273k** | 4,5k → 3,4k | 48s → 37s |
| T3 investigar bug | $0,73 → **$0,57** (−22%) | 22 → **9** | 1.114k → **378k** | 6,8k → 4,2k | 83s → 159s |
| **Total 15 execuções** | **$7,57 → $6,53 (−14%)** | **224 → 110 (−51%)** | **9,2M → 4,1M (−56%)** | **76k → 55k (−28%)** | 861s → 1.435s (+67%) |

Formato: sem plugin → com Tailor.ia Lean.

O que mudou da v2 para a v3: a regra de delegação virou primeira ação em investigação de 3+
arquivos. O `batedor` (Haiku) rodou em 9 das 15 execuções com plugin (todas de T1, 4 de 5 de T3,
nenhuma de T2, que o Opus resolveu direto). Efeito: o Opus faz metade dos turnos e relê menos da
metade do contexto. O custo cai menos que o contexto (−14% contra −56%) porque o Haiku entra na
conta e cada subagente paga a própria escrita de cache.

Custo do ganho: **tempo**. Subagente roda em série e a execução fica mais lenta em T1 e T3. Para
quem paga por token, é troca boa; para quem paga por minuto, não.

Ganho mais consistente: **T2, mapeamento**. Em todas as 5 repetições o Lean ficou abaixo da mediana
do baseline. Em T1 e T3 o pior caso do Lean encosta no melhor do baseline; a dispersão continua alta.

## v2 · Opus 5.5 como modelo principal · 2 repetições · 2026-10-04

Mediana por tarefa. Dados brutos em `2026-10-04-opus-v2.jsonl`.

| Tarefa | Custo sem plugin | Custo com Lean | Turnos sem | Turnos com | Cache lido sem | Cache lido com |
|---|---|---|---|---|---|---|
| T1 | $0,36 | $0,45 | 8 | 8,5 | 330k | 300k |
| T2 | $0,74 | **$0,38** | 17,5 | **9,5** | 571k | **317k** |
| T3 | $0,90 | $0,89 | 25 | 26,5 | 1.308k | 1.312k |
| **Total das 6 execuções** | **$3,98** | **$3,44** | 101 | 89 | 4.416k | 3.859k |

Leitura: **14% mais barato no total, 12% menos turnos**. O ganho vem de T2, onde as regras
cortaram turnos pela metade. T1 e T3 empatam dentro da variância (repetições da mesma condição
diferem até 45% entre si; n=2 não separa isso de ruído).

Achado importante: **nenhuma execução usou os agentes Haiku/Sonnet** (`modelUsage` só tem Opus).
Todo o ganho veio das regras de leitura. A alavanca de orquestração ainda não entrou na conta;
a 0.3.0 torna a delegação a primeira ação em investigação de 3+ arquivos, a ser medida na v3.

Onde o custo mora: cache lido (contexto relido a cada turno) é ~65% do custo. Saída é ~20%.
Reduzir turnos vale mais que encurtar resposta.

## v1 · Sonnet 5.5 como modelo principal · 1 repetição · 2026-10-04

Dados brutos em `2026-10-04-sonnet-v1.jsonl`. Três condições.

| Condição | Custo total | Turnos | Saída |
|---|---|---|---|
| sem plugin | $0,71 | 20 | 7,5k |
| só Tailor.ia Lean (0.2.0) | $0,77 | 21 | 8,9k |
| Lean + caveman + ponytail | $0,86 | 33 | 9,4k |

Resultado contra o plugin, publicado mesmo assim. Causa: a regra da 0.2.0 mandava delegar
localização sem condição; em tarefa de um arquivo isso virou overhead. Com Sonnet no comando,
delegar para Sonnet não barateia nada. A 0.2.1 condicionou a delegação a 3+ arquivos.

## Limites

- n pequeno (1, 2 e 5 repetições). Tendência, não prova; repetições iguais variam até 2x.
- Tarefas somente leitura. Tarefas de edição e o `/fechar` não estão medidos.
- Um repositório. Resultado depende do tamanho dos arquivos e da qualidade do CLAUDE.md.
- Os três plugins medidos na v1 têm hooks próprios; a interação entre eles não foi isolada.
