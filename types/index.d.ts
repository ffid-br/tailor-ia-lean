export type Delegacao = {
  id: string
  tipo: string
  descricao: string
  modelo?: string
  status: 'rodando' | 'feito' | 'erro' | 'fundo'
  tokens?: number
  ferramentas?: number
  ms?: number
  agentId?: string
  inicio?: number
  rodada?: number
  pai?: string
}

export type Totais = {
  turnos: number
  relido: number
  escrito: number
  saida: number
  modelo?: string
  ferramentasPrincipal: number
  ferramentasAgentes: number
}

export type Mate = {
  id: string
  name: string
  role: string
  desc: string
  model: string
  status: string
  tools: number
  lastTool: string
}
export type Task = { id: string; subject: string; status: string; owner: string }
export type LogLine = { at: number; who: string; text: string }
export type Board = {
  mates: Mate[]
  tasks: Task[]
  log: LogLine[]
  leadBusy: boolean
  leadModel: string
  startedAt: number
  /** Maior número de colegas rodando ao mesmo tempo na sessão. */
  peak: number
}

declare module 'claude-code' {
  interface PluginState {
    'tailor-ia-lean': {
      delegacoes: Shaped<Delegacao[]>
      totais: Shaped<Totais>
      agora: Shaped<number>
      time: Shaped<Board>
    }
  }
}
