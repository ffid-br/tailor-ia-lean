#!/usr/bin/env bash
# Benchmark v4: protocolo da v3 (T1-T3, baseline vs lean 0.4.0, 5 reps) + T4 handoff (lean com e sem handoff, 5 reps).
set -uo pipefail
REPO="${REPO:?defina REPO=caminho do repositório alvo}"
OUT="$(dirname "$0")/v4-results.jsonl"; : > "$OUT"
cd "$REPO"
HF="$(git rev-parse --git-dir)/tailor-handoff.md"
T1='Onde está a lógica de autenticação/login deste frontend e quem a chama? Responda com arquivo:linha e uma frase por item. Não edite nada.'
T2='Como este frontend fala com o backend? Liste as bases de URL, onde são configuradas e qual repositório atende cada uma. Não edite nada.'
T3='Suspeita de bug: a listagem de chamados não respeita o filtro de status. Localize onde o filtro é aplicado, liste os callers e proponha a menor correção em texto. Não edite nenhum arquivo.'
T4='Continua de onde parei na sessão anterior. Não edite nenhum arquivo.'
set_plugins() {
  for p in caveman@caveman ponytail@ponytail tailor-ia-lean@tailor-ia-lean; do
    if [[ " $1 " == *" $p "* ]]; then claude plugin enable "$p" >/dev/null 2>&1; else claude plugin disable "$p" >/dev/null 2>&1; fi
  done
}
run() { # cond task prompt
  local j; j=$(claude -p "$3" --model opus --output-format json --max-turns 30 \
      --disallowedTools "Edit,Write,NotebookEdit" 2>/dev/null)
  echo "$j" | jq -c --arg c "$1" --arg t "$2" '{cond:$c,task:$t,cost:.total_cost_usd,turns:.num_turns,ms:.duration_ms,in:.usage.input_tokens,out:.usage.output_tokens,cr:.usage.cache_read_input_tokens,cw:.usage.cache_creation_input_tokens,models:(.modelUsage|keys),answer_chars:(.result|length),resumed:(.result|test("filtro";"i") and test("status";"i")),answer:(.result|.[0:400])}' >> "$OUT" \
    || echo "{\"cond\":\"$1\",\"task\":\"$2\",\"error\":true}" >> "$OUT"
}
handoff() { cat > "$HF" <<'TXT'
Tarefa: bug "listagem de chamados não respeita o filtro de status" (investigação, sem editar).
Feito: só entendi o sintoma; ainda não localizei o código.
Próximo passo: achar onde o filtro de status é aplicado na listagem de chamados, listar os callers e propor a menor correção em texto.
Dúvida aberta: o filtro é aplicado no front ou na query da API?
TXT
}
trap 'rm -f "$HF" "$HF.consumido"; set_plugins "tailor-ia-lean@tailor-ia-lean caveman@caveman ponytail@ponytail"' EXIT
rm -f "$HF" "$HF.consumido"
for rep in 1 2 3 4 5; do
  set_plugins ""
  run baseline T1 "$T1"; run baseline T2 "$T2"; run baseline T3 "$T3"
  set_plugins "tailor-ia-lean@tailor-ia-lean"
  run lean T1 "$T1"; run lean T2 "$T2"; run lean T3 "$T3"
  rm -f "$HF" "$HF.consumido"; run lean-sem-handoff T4 "$T4"
  handoff;                      run lean-com-handoff T4 "$T4"
  rm -f "$HF.consumido"
done
echo DONE >> "$OUT"
