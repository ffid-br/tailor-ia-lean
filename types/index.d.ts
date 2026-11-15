export type Delegacao = {
  id: string
  tipo: string
  descricao: string
  modelo?: string
  status: 'rodando' | 'feito' | 'erro' | 'fundo'
  tokens?: number
  ferramentas?: number
  /** Duração em ms. */
  ms?: number
  agentId?: string
  /** Epoch em ms, de $.clock.now(). */
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

/** Os estados do AgentStatus do engine, que o roster de $.agent.list() devolve. */
export type MateStatus = 'pending' | 'running' | 'waiting' | 'idle' | 'completed' | 'failed' | 'killed'
export type Mate = {
  id: string
  name: string
  role: string
  desc: string
  model: string
  status: MateStatus
  tools: number
  lastTool: string
  /** Tokens dos turnos do colega somados (entrada + cache lido + cache escrito + saída). */
  tokens: number
}
/** `memLivre`: % de memória livre do sistema (kern.memorystatus_level). `load`: load de 1 min. `swapGB`: swap em uso. */
export type Maquina = { load: number; ncpu: number; memLivre: number; ramGB: number; swapGB: number }
export type TaskStatus = 'pending' | 'in_progress' | 'completed'
/** `owner`: nome ou id do colega; '' quando a tarefa não tem dono. */
export type Task = { id: string; subject: string; status: TaskStatus; owner: string }
/** `at`: epoch em ms, de $.clock.now(). */
export type LogLine = { at: number; who: string; text: string }
export type Board = {
  mates: Mate[]
  tasks: Task[]
  log: LogLine[]
  leadBusy: boolean
  leadModel: string
  /** Epoch em ms do session.start. */
  startedAt: number
  /** Tokens dos turnos do líder somados, mesma conta do Mate.tokens. */
  leadTokens: number
  /** Tokens da sessão toda (líder + todo colega, inclusive os que saíram dos 6 guardados). */
  tokens: number
  /** Prompt novo do usuário: a próxima delegação começa rodada nova e tira os colegas que já entregaram. */
  fresh: boolean
  /** Maior número de colegas rodando ao mesmo tempo na sessão. */
  peak: number
  /** Última leitura da máquina; ausente fora do macOS. */
  maq?: Maquina
  /** Agentes em paralelo permitidos pela trava; 0 = desligada. */
  limite?: number
  /** Como o limite foi calculado: "6 da máquina ÷ 4 sessões do Claude Code". */
  conta?: string
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
