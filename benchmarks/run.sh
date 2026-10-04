#!/usr/bin/env bash
# Benchmark: 3 tarefas somente leitura no repo REPO, baseline vs lean, MODEL (padrão opus), 2 repetições.
set -uo pipefail
cd "${REPO:?defina REPO=caminho do repositório alvo}"
OUT="$(dirname "$0")/results.jsonl"; : > "$OUT"
T1='Onde está a lógica de autenticação/login deste frontend e quem a chama? Responda com arquivo:linha e uma frase por item. Não edite nada.'
T2='Como este frontend fala com o backend? Liste as bases de URL, onde são configuradas e qual repositório atende cada uma. Não edite nada.'
T3='Suspeita de bug: a listagem de chamados não respeita o filtro de status. Localize onde o filtro é aplicado, liste os callers e proponha a menor correção em texto. Não edite nenhum arquivo.'
set_plugins() { # $1 = lista de plugins a ligar; os outros desligam
  for p in caveman@caveman ponytail@ponytail tailor-ia-lean@tailor-ia-lean; do
    if [[ " $1 " == *" $p "* ]]; then claude plugin enable "$p" >/dev/null 2>&1; else claude plugin disable "$p" >/dev/null 2>&1; fi
  done
}
run() { # cond task_id prompt
  local j; j=$(claude -p "$3" --model "${MODEL:-opus}" --output-format json --max-turns 30 \
      --disallowedTools "Edit,Write,NotebookEdit" 2>/dev/null)
  echo "$j" | jq -c --arg c "$1" --arg t "$2" '{cond:$c,task:$t,cost:.total_cost_usd,turns:.num_turns,ms:.duration_ms,in:.usage.input_tokens,out:.usage.output_tokens,cr:.usage.cache_read_input_tokens,cw:.usage.cache_creation_input_tokens,models:(.modelUsage|keys),answer_chars:(.result|length)}' >> "$OUT" \
    || echo "{\"cond\":\"$1\",\"task\":\"$2\",\"error\":true}" >> "$OUT"
}
for rep in 1 2; do for cond in baseline lean; do
  case $cond in
    baseline) set_plugins "" ;;
    lean)     set_plugins "tailor-ia-lean@tailor-ia-lean" ;;
    stack)    set_plugins "tailor-ia-lean@tailor-ia-lean caveman@caveman ponytail@ponytail" ;;
  esac
  run $cond T1 "$T1"; run $cond T2 "$T2"; run $cond T3 "$T3"
done; done
set_plugins "tailor-ia-lean@tailor-ia-lean caveman@caveman ponytail@ponytail"
echo DONE >> "$OUT"
