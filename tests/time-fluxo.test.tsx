import { expect, mock, test } from 'claude-code/testing'

const PANE = {
  plugin: 'tailor-ia-lean',
  component: 'Pane',
  requestId: 'lean-time',
  props: { title: 'Time de agentes', isFocused: false, bodyColumns: 120, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} },
} as const

const spawn = {
  tool_use_id: 'tu1', prompt: 'achar login', description: 'achar login', subagentType: 'tailor-ia-lean:batedor',
  provider: { plugin: 'engine', tier: 'core' }, parentModel: 'claude-opus-5-5', background: true, fork: false,
} as const
const turnDone = (agentId: string) => ({ answer: 'ok', durationMs: 1, isAborted: false, turnId: 't-' + agentId, reason: 'answer' as const, agentId, usage })
const usage = { input_tokens: 1000, output_tokens: 200, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, model: 'claude-haiku-5-5' }

test('colega termina no turn.complete dele e SendMessage retoma sem duplicar', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  on('command.register', () => ({ value: { command: 'lean-time' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('agent.spawn', () => ({ model: 'claude-haiku-5-5', agentId: 'ag1' }))
  on('turn.complete', (_, e) => ({ text: e.answer }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.agent.spawn(spawn)
  let ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /rodando/ }))?.text).toMatch(/rodando 1 · pico 1$/)
  expect(await ui.find({ type: 'Text', text: /tarefas \(delegações\) · 0\/1 feitas/ })).toBeTruthy()
  expect(await ui.find({ type: 'Text', text: /0\/1 entregues/ })).toBeTruthy()
  await ui.unmount()

  await $.turn.complete(turnDone('ag1'))
  ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /rodando/ }))?.text).toMatch(/rodando 0 · pico 1$/)
  expect(await ui.find({ type: 'Text', text: /entregou · 1.2k tokens/ })).toBeTruthy()
  expect(await ui.find({ type: 'Text', text: /1\/1 feitas/ })).toBeTruthy()
  expect(await ui.find({ type: 'Text', text: /1\/1 entregues/ })).toBeTruthy()
  expect(await ui.find({ type: 'Text', text: '1.2k tokens' })).toBeTruthy()
  await ui.unmount()

  await $.agent.spawn({ ...spawn, resume: { agentId: 'ag1' } })
  ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /rodando/ }))?.text).toMatch(/time 1 · rodando 1 · pico 1$/)
  expect(await ui.find({ type: 'Text', text: /retoma/ })).toBeTruthy()
  await ui.unmount()
})

test('líder ocupado e logado enquanto roda ferramenta, ocioso no fim do turno', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  on('command.register', () => ({ value: { command: 'lean-time' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('tool.call', () => ({ result: { stdout: '' } }))
  on('turn.complete', (_, e) => ({ text: e.answer }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: 'Bash', command: 'ls' })
  let ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: 'planeja + coordena' })).toBeTruthy()
  expect(await ui.find({ type: 'Text', text: /Bash/ })).toBeTruthy()
  await ui.unmount()

  await $.turn.complete({ answer: 'ok', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' as const, usage })
  ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /aguardando · 1.2k tokens/ })).toBeTruthy()
  await ui.unmount()
})

test('TodoWrite não apaga tarefa do TaskCreate e TaskUpdate com status e dono loga uma linha', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  on('command.register', () => ({ value: { command: 'lean-time' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('tool.call', (_, e) => ({ result: e.tool === 'TaskCreate' ? { task: { id: '1', subject: 'achar login' } } : {} }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: 'TaskCreate', subject: 'achar login', description: '' })
  await $.tool.call({ tool: 'TodoWrite', todos: [{ content: 'revisar', status: 'pending', activeForm: 'revisando' }] })
  await $.tool.call({ tool: 'TaskUpdate', taskId: '1', status: 'in_progress', owner: 'batedor' })
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /0\/2 feitas/ })).toBeTruthy()
  expect(await ui.find({ type: 'Text', text: /achar login: in_progress → batedor/ })).toBeTruthy()
  await ui.unmount()
})

test('colega em primeiro plano soma tokens no turn.complete e o total guarda quem saiu dos 6', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  on('command.register', () => ({ value: { command: 'lean-time' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  let n = 0
  let bar = ''
  on('ui.status', (_, e) => { bar = String((e as { text?: string }).text ?? ''); return { value: undefined } })
  on('agent.spawn', () => ({ model: 'claude-haiku-5-5', agentId: 'ag' + ++n }))
  on('turn.complete', (_, e) => ({ text: e.answer }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  for (let i = 1; i <= 7; i++) {
    await $.agent.spawn({ ...spawn, background: false })
    await $.turn.complete(turnDone('ag' + i))
  }
  await $.turn.complete({ answer: 'ok', durationMs: 1, isAborted: false, turnId: 'lead', reason: 'answer' as const, usage })
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /rodando/ }))?.text).toMatch(/time 6 · rodando 0/)
  expect(await ui.find({ type: 'Text', text: /aguardando · 1.2k tokens/ })).toBeTruthy()
  await ui.unmount()
  // 7 colegas + 1 turno do líder, 1.200 cada: o 1º colega saiu da caixa, não da soma
  expect(bar).toMatch(/tokens \[9.6k\]$/)
})

test('prompt novo: a próxima delegação tira quem já entregou e mantém o total de tokens', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  on('command.register', () => ({ value: { command: 'lean-time' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('prompt.submit', (_, e) => ({ text: e.text }))
  let n = 0
  on('agent.spawn', () => ({ model: 'claude-haiku-5-5', agentId: 'ag' + ++n }))
  on('turn.complete', (_, e) => ({ text: e.answer }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.agent.spawn(spawn)
  await $.agent.spawn(spawn)
  await $.turn.complete(turnDone('ag1'))
  // aviso de subagente não conta como prompt novo
  await $.prompt.submit({ text: 'ag1 terminou', wait: false, origin: { kind: 'task-notification' } })
  await $.agent.spawn(spawn)
  await $.prompt.submit({ text: 'nova lista', wait: false, origin: { kind: 'composer' } })
  await $.agent.spawn(spawn)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  // ag1 entregou e sai; ag2 e ag3 ainda rodam e ficam; ag4 entra
  expect((await ui.find({ type: 'Text', text: /rodando/ }))?.text).toMatch(/time 3 · rodando 3 · pico 3$/)
  expect(await ui.find({ type: 'Text', text: /nova rodada \(1 colegas saem\)/ })).toBeTruthy()
  await ui.unmount()
})
