import { expect, test } from 'claude-code/testing'

import { bar, modelLabel, phaseOf, withPeak } from '../hooks/time'
import type { Board, Mate } from '../types'

const mate = (status: string): Mate => ({ id: 'a', name: 'front', role: 'operario', desc: '', model: 'claude-sonnet-5-5', status, tools: 0, lastTool: '' })
const board = (mates: Mate[], leadBusy: boolean): Board => ({ mates, tasks: [], log: [], leadBusy, leadModel: '', startedAt: 0, peak: 0 })

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
  const cinco = withPeak(board(['running', 'running', 'running', 'running', 'pending'].map(mate), true))
  expect(cinco.peak).toBe(5)
  expect(withPeak({ ...cinco, mates: cinco.mates.map(m => ({ ...m, status: 'completed' })) }).peak).toBe(5)
})
