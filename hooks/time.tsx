import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ToolCallInput, ToolCallResult } from 'claude-code'

import type { Board, Mate, Task } from '../types'

// Visão de time (estilo agent teams): líder, colegas por papel do lean, tarefas e log.
// Complementa o /lean-painel, que mostra a árvore e o custo em tokens.

const PANE = 'lean-time'
const LEAD = '#ff9e64' // laranja: líder
const MATE = '#7aa2f7' // azul: colegas
const TASK = '#9ece6a' // verde: tarefas
const REVIEW = '#bb9af7' // roxo: revisão

const EMPTY: Board = { mates: [], tasks: [], log: [], leadBusy: false, leadModel: '', startedAt: 0, peak: 0 }
// Troque a tag quando os campos mudarem: ela recusa o que uma versão antiga gravou.
const board = atom({ plugin: 'tailor-ia-lean', key: 'time' } as const, EMPTY, { shape: 'time-2' })

const RUNNING = ['pending', 'running']
const isRunning = (m: Mate) => RUNNING.includes(m.status)
/** Guarda o pico de colegas rodando juntos: o "rodando" do momento zera quando todos entregam. */
export const withPeak = (b: Board): Board => ({ ...b, peak: Math.max(b.peak, b.mates.filter(isRunning).length) })
const isStuck = (m: Mate) => m.status === 'waiting' || m.status === 'failed'

/** "claude-sonnet-5-5" → "Sonnet 5.5"; o que não casa volta como veio. */
export const modelLabel = (id: string): string => {
  const m = /(opus|sonnet|haiku|fable)-(\d+)(?:-(\d+))?/i.exec(id)
  if (!m) return id || '—'
  const fam = m[1] ?? ''
  return fam.charAt(0).toUpperCase() + fam.slice(1).toLowerCase() + ' ' + (m[2] ?? '') + (m[3] ? '.' + m[3] : '')
}

export const bar = (done: number, total: number, width: number): string => {
  const f = total > 0 ? Math.round((Math.min(done, total) / total) * width) : 0
  return '█'.repeat(f) + '░'.repeat(width - f)
}

export type Phase = 'idle' | 'plan' | 'lead' | 'blocked' | 'review'
export const phaseOf = (b: Board): Phase => {
  if (b.mates.some(isStuck)) return 'blocked'
  if (b.mates.some(isRunning)) return 'lead'
  if (!b.leadBusy) return 'idle'
  return b.mates.length > 0 ? 'review' : 'plan'
}

const clock = (at: number, start: number) => {
  const s = Math.max(0, Math.round((at - start) / 1000))
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`
}

// `at` vem de $.clock.now(): Date.now() no módulo do mod não anda (log ficava 00:00:00).
const say = (b: Board, who: string, text: string, at: number): Board => ({
  ...b,
  log: [...b.log, { at, who, text: text.replace(/\s+/g, ' ').slice(0, 90) }].slice(-40),
})

const setStatus = (b: Board, id: string, status: string): Board => ({
  ...b,
  mates: b.mates.map(m => (m.id === id ? { ...m, status } : m)),
})

const mateName = (b: Board, agentId?: string) => {
  const m = agentId ? b.mates.find(x => x.id === agentId) : undefined
  return m ? m.name : agentId ? 'subagente' : 'líder'
}

const ownedBy = (b: Board, m: Mate): Task[] => b.tasks.filter(t => t.owner && (t.owner === m.name || t.owner === m.id))

async function footer($: EngineInterface) {
  const b = await read($, board)
  if (!b.mates.length && !b.tasks.length) return $.ui.status(undefined)
  const run = b.mates.filter(isRunning).length
  const done = b.tasks.filter(t => t.status === 'completed').length
  const phase = { idle: 'parado', plan: 'planejando', lead: 'liderando', blocked: 'destravando', review: 'revisando' }[phaseOf(b)]
  const models = [...new Set(b.mates.map(m => (modelLabel(m.model).split(' ')[0] ?? '').toLowerCase()))].join('+') || 'time'
  $.ui.status(`${models} [${run ? 'running' : 'idle'}]  colegas [${run}/${b.mates.length}]  líder [${phase}]  tarefas [${done}/${b.tasks.length}]`)
}


// Chamado pelo register do painel.tsx: o plugin só pode ter um hooks module.
let stopPoll: (() => void) | undefined

// session.start do painel chama isto (um hook sem matcher por evento no plugin).
export async function timeStart($: EngineInterface) {
  await $.command.register({ name: 'lean-time', description: 'Abre o painel do time de agentes (líder, colegas por papel, tarefas, log)' })
  const now = await $.clock.now()
  await update($, board, b => (b.startedAt ? b : { ...b, startedAt: now }))
  // travado/falhou só o roster do engine conta, então lê a cada 1,5 s;
  // o fim e a retomada chegam por turn.complete / agent.spawn (o roster pode manter "running").
  stopPoll?.()
  const t = $.clock.every(1500, () => {
    void (async () => {
      const list = await $.agent.list()
      const at = await $.clock.now()
      await update($, board, b => {
        let changed = false
        const mates = b.mates.map(m => {
          const live = list.find(a => a.id === m.id)
          const status = live ? live.status : isRunning(m) ? 'completed' : m.status
          if (status === m.status || (RUNNING.includes(status) && !isRunning(m))) return m
          changed = true
          return { ...m, status }
        })
        if (!changed) return b
        let nb: Board = { ...b, mates }
        for (const m of mates) {
          const old = b.mates.find(x => x.id === m.id)
          if (old && old.status !== m.status) nb = say(nb, m.name, `${old.status} → ${m.status}`, at)
        }
        return nb
      })
      await footer($)
    })().catch(() => undefined) // o poll nunca derruba o painel
  })
  stopPoll = () => t.cancel()
}

// turn.complete do painel chama isto.
export async function timeTurnDone($: EngineInterface, agentId?: string) {
  const at = await $.clock.now()
  await update($, board, b => {
    if (!agentId) return { ...b, leadBusy: false }
    const m = b.mates.find(x => x.id === agentId)
    // turno do subagente acabou (relatório entregue): fim, até uma mensagem retomá-lo
    return m && isRunning(m) ? say(setStatus(b, agentId, 'completed'), m.name, 'entregou', at) : b
  })
  await footer($)
}

// tool.call do painel chama isto depois do next(e).
export async function timeToolCall($: EngineInterface, e: ToolCallInput, ran: ToolCallResult) {
  try {
    const who = await read($, board).then(b => mateName(b, e.agentId))
    const at = await $.clock.now()
    await update($, board, b => {
      // turn.start do líder não chega a este módulo: tool.call do principal também marca o líder ocupado
      let nb = e.agentId ? b : { ...b, leadBusy: true }
      if (e.agentId) {
        nb = { ...nb, mates: nb.mates.map(m => (m.id === e.agentId ? { ...m, tools: m.tools + 1, lastTool: e.tool } : m)) }
      }
      if (e.tool === 'SendMessage') {
        const i = { to: typeof e.to === 'string' ? e.to : undefined, summary: e.summary, message: e.message as unknown }
        const txt = i.summary || (typeof i.message === 'string' ? i.message : '')
        nb = say(nb, who, `mensagem → ${i.to ?? '?'}: ${txt}`, at)
      } else if (e.tool === 'TaskCreate' && 'result' in ran && ran.result) {
        const task = (ran.result as { task?: { id: string; subject: string } }).task
        if (task) nb = say({ ...nb, tasks: [...nb.tasks, { id: task.id, subject: task.subject, status: 'pending', owner: '' }] }, who, `tarefa nova: ${task.subject}`, at)
      } else if (e.tool === 'TaskUpdate') {
        const i = { taskId: e.taskId, status: e.status as string | undefined, owner: e.owner }
        const t = nb.tasks.find(x => x.id === i.taskId)
        nb = {
          ...nb,
          tasks: nb.tasks
            .map(x => (x.id === i.taskId ? { ...x, status: i.status ?? x.status, owner: i.owner ?? x.owner } : x))
            .filter(x => x.status !== 'deleted'),
        }
        if (t && i.status && i.status !== t.status) nb = say(nb, who, `${t.subject}: ${i.status}`, at)
        if (t && i.owner && i.owner !== t.owner) nb = say(nb, who, `${t.subject} → ${i.owner}`, at)
      } else if (e.tool === 'TodoWrite' && !e.agentId) {
        const todos = e.todos ?? []
        nb = { ...nb, tasks: todos.map((t, i) => ({ id: 'todo-' + i, subject: t.content, status: t.status, owner: '' })) }
      } else if (!e.agentId && e.tool !== 'Agent') {
        nb = say(nb, who, e.tool, at) // Agent já loga "delega" no agent.spawn
      }
      return nb
    })
    await footer($)
  } catch (err) { void err }
}

export const registerTime = (on: Parameters<Register>[0]) => {
  on('command.run', { command: 'lean-time' }, async ($, e) => {
    // `/lean-time 30`: altura pedida no modo inline (acima do prompt); no dock lateral o engine ignora
    const rows = Number.parseInt(e.args ?? '', 10)
    const { isPlaced } = await $.ui.open({ id: PANE, title: 'Time de agentes', ...(rows > 0 ? { rows } : {}) })
    return { text: isPlaced ? 'Painel do time aberto.' : 'Painel pedido; aparece quando o terminal tiver largura.' }
  })

  on('turn.start', async ($, e, next) => {
    const id = e.agentId
    await update($, board, b => (id ? setStatus(b, id, 'running') : { ...b, leadBusy: true }))
    return next(e)
  })

  on('agent.spawn', async ($, e, next) => {
    const r = await next(e)
    // painel nunca derruba o spawn
    if (r.agentId) try {
      const id = r.agentId
      const name = (r.teammateId ?? '').split('@')[0] || e.description || e.subagentType
      const at = await $.clock.now()
      await update($, board, b => {
        // SendMessage a um colega já terminado: mesmo id, mesmo card; só volta a rodar
        if (e.resume && b.mates.some(m => m.id === id)) return withPeak(say(setStatus(b, id, 'running'), 'líder', `retoma → ${mateName(b, id)}`, at))
        const mate: Mate = { id, name, role: e.subagentType.replace(/^tailor-ia-lean:/, ''), desc: e.description, model: r.model, status: 'running', tools: 0, lastTool: '' }
        return withPeak(say({ ...b, mates: [...b.mates.filter(m => m.id !== id), mate].slice(-6) }, 'líder', `delega → ${name} (${modelLabel(r.model)})`, at))
      })
      await footer($)
    } catch (err) { void err }
    return r
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const b = await read($, board)
    const cols = e.viewport?.columns ?? 100
    const phase = phaseOf(b)
    const done = b.tasks.filter(t => t.status === 'completed').length
    const models = [...new Set(b.mates.map(m => modelLabel(m.model)))]
    const W = Math.max(8, Math.min(16, Math.floor(cols / 10)))
    const rows = e.viewport?.rows ?? 40
    const logRoom = Math.max(3, rows - 30)

    const check = (label: string, lit: boolean) => (
      <Text color={lit ? REVIEW : undefined} bold={lit} dimColor={!lit}>
        {lit ? '◆' : '◇'} {label}
      </Text>
    )

    return (
      <Box flexDirection="column">
        <Text bold>
          TIME DE AGENTES · <Text color={LEAD}>LÍDER COORDENA</Text> · <Text color={MATE}>{models.join(' + ') || 'colegas'} CONSTROEM</Text>
        </Text>
        <Text>
          <Text color={LEAD}>■ líder</Text>  <Text color={MATE}>■ colegas</Text>  <Text color={TASK}>■ tarefas</Text>  <Text color={REVIEW}>■ revisão</Text>
        </Text>

        <Box flexDirection="row">
          <Box flexDirection="column" borderStyle="round" borderColor={REVIEW} paddingX={1} width={26}>
            <Text color={LEAD} bold>LÍDER · checkpoints</Text>
            {check('antes do plano', phase === 'plan')}
            <Text dimColor>planeja, define contrato, coordena</Text>
            {check('colega travado', phase === 'blocked')}
            <Text dimColor>colegas falam direto entre si</Text>
            {check('antes de concluir', phase === 'review')}
            <Text> </Text>
            <Text>time <Text bold>{b.mates.length}</Text> · rodando <Text bold>{b.mates.filter(isRunning).length}</Text></Text>
            <Text>pico em paralelo <Text bold color={MATE}>{b.peak ?? 0}</Text></Text>
          </Box>

          <Box flexDirection="column" flexGrow={1}>
            <Box flexDirection="column" borderStyle="round" borderColor={LEAD} paddingX={1} alignItems="center">
              <Text color={LEAD} bold>líder · sessão principal</Text>
              <Text>{b.leadBusy ? 'planeja + coordena' : 'aguardando'}</Text>
            </Box>

            <Box flexDirection="column" borderStyle="round" borderColor={TASK} paddingX={1}>
              <Text color={TASK} bold>
                tarefas compartilhadas · {done}/{b.tasks.length} feitas
              </Text>
              {b.tasks.length === 0 && <Text dimColor>nenhuma tarefa ainda</Text>}
              {b.tasks.slice(-6).map(t => (
                <Text wrap="truncate-end">
                  <Text color={t.status === 'completed' ? TASK : t.status === 'in_progress' ? LEAD : undefined}>
                    {t.status === 'completed' ? '✔' : t.status === 'in_progress' ? '▶' : '·'}
                  </Text>{' '}
                  {t.subject}
                  {t.owner ? <Text dimColor> ({t.owner})</Text> : null}
                </Text>
              ))}
            </Box>

            {b.mates.length === 0 && <Text dimColor>  nenhum colega ainda: delegue com Agent</Text>}
            {/* linhas de 3: os 6 colegas guardados aparecem todos, com largura para o nome */}
            {[0, 3].filter(i => i < b.mates.length).map(i => (
            <Box flexDirection="row">
              {b.mates.slice(i, i + 3).map(m => {
                const mine = ownedBy(b, m)
                const fin = mine.filter(t => t.status === 'completed').length
                const color = isStuck(m) ? 'error' : isRunning(m) ? MATE : 'inactive'
                return (
                  <Box flexDirection="column" borderStyle="round" borderColor={color} paddingX={1} flexGrow={1} alignItems="center">
                    <Text bold wrap="truncate-end">{m.name}</Text>
                    <Text color={MATE}>{m.role && m.role !== 'general-purpose' ? m.role + ' · ' : ''}{modelLabel(m.model)}</Text>
                    {mine.length > 0 ? (
                      <Text>
                        <Text color={MATE}>{bar(fin, mine.length, W)}</Text> {fin}/{mine.length}
                      </Text>
                    ) : (
                      <Text dimColor>{m.tools} ferramentas</Text>
                    )}
                    <Text dimColor wrap="truncate-end">{m.lastTool ? 'última: ' + m.lastTool : m.desc}</Text>
                    <Text color={color}>{isRunning(m) ? '○ rodando' : m.status}</Text>
                  </Box>
                )
              })}
            </Box>
            ))}

            <Box borderStyle="round" borderColor={phase === 'review' ? REVIEW : 'inactive'} paddingX={1} alignItems="center" flexDirection="column">
              <Text color={phase === 'review' ? REVIEW : undefined} bold={phase === 'review'}>
                volta ao líder · revisar + verificar
              </Text>
            </Box>
          </Box>
        </Box>

        <Box flexDirection="column" borderStyle="round" borderColor="inactive" paddingX={1}>
          <Text dimColor>log da sessão</Text>
          {b.log.length === 0 && <Text dimColor>vazio</Text>}
          {b.log.slice(-logRoom).map(l => (
            <Text wrap="truncate-end">
              <Text dimColor>{clock(l.at, b.startedAt || l.at)}</Text>{'  '}
              <Text color={l.who === 'líder' ? LEAD : MATE}>{l.who.padEnd(12)}</Text>{'  '}
              {l.text}
            </Text>
          ))}
        </Box>
      </Box>
    )
  })

  on('session.end', async (_$, e, next) => {
    stopPoll?.()
    return next(e)
  })
}
