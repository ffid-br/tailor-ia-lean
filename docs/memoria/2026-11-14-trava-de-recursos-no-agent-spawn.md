# Trava de recursos: `agent.spawn` recusa agente novo acima do limite da máquina ou com ela sob pressão

**Contexto:** orquestração com muitos agentes em paralelo travava o computador (0.9.0, 2026-11-14).
**Causa / decisão:**
- O hook `agent.spawn` devolve `{ deny: motivo }` sem chamar `next(e)`; o modelo recebe o motivo como erro da ferramenta Agent. Num Workflow, o `agent()` do script lança o erro.
- Conta os colegas rodando pelo board do `/lean-time`, não por `$.agent.list()`: o roster do engine pode manter "running" depois do fim, e a trava ficaria presa.
- Máquina: `$.process.run(['sysctl','-n','vm.loadavg','hw.ncpu','kern.memorystatus_level','hw.memsize','vm.swapusage'])`, a mesma fonte do `claude-usage` do ffid-ops. `kern.memorystatus_level` é a % de memória livre do sistema. Só macOS; fora dele a leitura falha e vale só o limite de agentes.
- `sysctl` imprime vírgula decimal em locale pt_BR; `lerMaquina` troca por ponto.
- No `claude plugin test`, `$.env.get` e `$.process.run` sem mock lançam erro: cada um tem `.catch` próprio, senão a trava inteira cai no catch e libera tudo.
- Limite de agentes sai do hardware: min(núcleos/2, RAM em GB/4), entre 2 e 8; 4 fixo sem leitura (`LEAN_MAX_AGENTES` sobrepõe, 0 desliga). Os divisores são estimativa, não medição de consumo por agente.
- Pressão: recusa com memória livre < 10% ou load > 2x núcleos; toast com < 20% ou load > núcleos.
- A leitura fica no board (`maq`, `limite`; shape `time-6`) e o `/lean-time` desenha a linha `máquina`. O poll de 1,5 s mede na abertura e a cada 10 ticks (~15 s).
- O limite da máquina é dividido pelas sessões abertas: `pgrep -x claude` conta os processos `claude` (agentes rodam dentro do processo da sessão, não viram processo). `cota = max(1, round(total / sessões))`. Sessão parada também conta; por isso arredonda em vez de truncar. `LEAN_MAX_AGENTES` fixa o limite da sessão e pula a divisão.
- Swap (`vm.swapusage`, campo `used`): acima de 1/4 da RAM só avisa; recusa acima de 1/2 da RAM com memória livre < 25%. Sozinho não recusa porque o macOS mantém swap usado depois que a pressão passa, e a trava ficaria presa.
**Por quê:** o `claude-usage` é um TUI em loop de outro plugin, sem saída de uma leitura só; depender dele quebraria quem não tem o ffid-ops.
**Pendente:** o README dizia "nenhum hook bloqueia", frase escrita para o diretório da Anthropic. A 0.9.0 bloqueia e roda `sysctl`; não foi submetida ao portal ainda.
**Toca:** `hooks/painel.tsx`, `skills/orquestrar/SKILL.md`, `README.md`, `tests/time.test.ts`, `tests/time-fluxo.test.tsx`
**Status:** vigente
