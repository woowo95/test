cd "$(dirname "$0")/../.."; T=${1:-96}; N=${2:-4}; (for sd in $(seq 3 2 $((1 + 2 * N))); do npx tsx src/test/likhet.ts $sd $T & done; wait) 2>&1 | python3 -c "
import sys,json
ok=0; n=0
for l in sys.stdin:
  if not l.startswith('{'): print(l.rstrip()); continue
  d=json.loads(l); n+=1
  if d['olik']<0: ok+=1; print(f\"by {d['seed']:>3}: exakt lika i $T timmar ({d['spel']['folk']} invånare)\")
  else: print(f\"by {d['seed']:>3}: OLIKA efter {d['olik']} timmar · spelet {d['spel']} · ikapp {d['ikapp']}\")
print(f'{ok} av {n} byar exakt lika i spelet och ikappräkningen')
"
