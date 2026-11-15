import { expect, test } from 'claude-code/testing'

import { avisoLimite, bar, k, contaTxt, cota, lerMaquina, limiteDe, modelLabel, phaseOf, pressao, taskStatus, trava, withPeak } from '../hooks/painel'
import type { Board, Mate, MateStatus } from '../types'

const mate = (status: MateStatus): Mate => ({ id: 'a', name: 'front', role: 'operario', desc: '', model: 'claude-sonnet-5-5', status, tools: 0, lastTool: '', tokens: 0 })
const board = (mates: Mate[], leadBusy: boolean): Board => ({ mates, tasks: [], log: [], leadBusy, leadModel: '', startedAt: 0, peak: 0, leadTokens: 0, tokens: 0, fresh: false })

test('nome do modelo, barra e fase do líder', async () => {
  expect(modelLabel('claude-sonnet-5-5')).toBe('Sonnet 5.5')
  expect(modelLabel('claude-opus-5-5[1m]')).toBe('Opus 5.5')
  expect(modelLabel('')).toBe('—')
  expect(bar(1, 2, 4)).toBe('██░░')
  expect(bar(0, 0, 3)).toBe('░░░')
  expect(phaseOf(board([], true))).toBe('plan')
  expect(phaseOf(board([mate('running')], true))).toBe('lead')
  expect(phaseOf(board([mate('waiting'), mate('running')], true))).toBe('blocked')
  expect(phaseOf(board([mate('completed')], true))).toBe('review')
  expect(phaseOf(board([mate('completed')], false))).toBe('idle')
})

test('pico em paralelo sobe com os colegas rodando e não cai quando entregam', async () => {
  const cinco = withPeak(board((['running', 'running', 'running', 'running', 'pending'] as const).map(mate), true))
  expect(cinco.peak).toBe(5)
  expect(withPeak({ ...cinco, mates: cinco.mates.map(m => ({ ...m, status: 'completed' })) }).peak).toBe(5)
})

test('status de tarefa desconhecido é recusado e tokens formatam', async () => {
  expect(taskStatus('completed')).toBe('completed')
  expect(taskStatus('deleted')).toBe(undefined)
  expect(taskStatus(42)).toBe(undefined)
  expect(k(1234)).toBe('1.2k')
})

test('trava de recursos: limite de agentes, máquina crítica e leitura do sysctl', () => {
  const ok = { load: 3, ncpu: 12, memLivre: 78, ramGB: 16, swapGB: 1 }
  expect(lerMaquina('{ 3,39 6,27 14,83 }\n12\n78\n17179869184\ntotal = 2048,00M  used = 1050,62M  free = 997,38M  (encrypted)\n')).toEqual({ load: 3.39, ncpu: 12, memLivre: 78, ramGB: 16, swapGB: 1 })
  expect(limiteDe(ok)).toBe(4) // 12 núcleos, 16 GB: a RAM limita
  expect(limiteDe({ ...ok, ncpu: 8, ramGB: 8 })).toBe(2)
  expect(limiteDe({ ...ok, ncpu: 16, ramGB: 64 })).toBe(8)
  expect(limiteDe(undefined)).toBe(4)
  expect([cota(6, 1), cota(6, 2), cota(6, 4), cota(6, 9), cota(4, 0)]).toEqual([6, 3, 2, 1, 4])
  expect(contaTxt(6, 4)).toBe('6 da máquina ÷ 4 sessões do Claude Code')
  expect(trava(2, 2, ok, contaTxt(6, 4))).toMatch(/limite calculado 2: 6 da máquina ÷ 4 sessões/)
  expect(lerMaquina('sysctl: unknown oid')).toBeUndefined()
  expect(trava(1, 4, ok)).toBeUndefined()
  expect(trava(4, 4, ok)).toMatch(/4 agentes já rodando/)
  expect(trava(0, 4, { ...ok, memLivre: 6 })).toMatch(/memória livre 6%/)
  expect(trava(0, 4, { ...ok, load: 30 })).toMatch(/carga 30.0 em 12/)
  expect(trava(9, 0, { ...ok, memLivre: 1 })).toBeUndefined() // 0 desliga
  expect(trava(3, 4, undefined)).toBeUndefined() // sem leitura (Linux): só o limite de agentes
  expect(pressao({ ...ok, memLivre: 15 })).toBe('alta')
  expect(pressao({ ...ok, swapGB: 5 })).toBe('alta') // swap acima de 1/4 da RAM avisa
  expect(pressao({ ...ok, swapGB: 9 })).toBe('alta') // swap velho com memória folgada não recusa
  expect(trava(0, 4, { ...ok, swapGB: 9, memLivre: 22 })).toMatch(/swap 9 GB/)
  expect(avisoLimite('five_hour', 50)).toBeUndefined()
  expect(avisoLimite('five_hour', 83)).toMatch(/five_hour em 83%/)
  expect(avisoLimite('five_hour', 85)).toBeUndefined() // mesma faixa não repete
  expect(avisoLimite('five_hour', 91)).toMatch(/91%/)
})
