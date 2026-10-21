cd "$(dirname "$0")/../.."; T=${1:-96}; N=${2:-8}; (for sd in $(seq 3 2 $((1 + 2 * N))); do npx tsx src/test/likhet.ts $sd live $T & npx tsx src/test/likhet.ts $sd snabb $T & done; wait) 2>&1 | grep seed | python3 -c "
import sys,json
a={True:{},False:{}}; n={True:0,False:0}
for l in sys.stdin:
  d=json.loads(l); n[d['live']]+=1
  for k,v in d['ut'].items(): a[d['live']].setdefault(k,[]).append(v)
keys=sorted(set(a[True])|set(a[False]))
print(f\"{'mått':18}{'levande':>10}{'snabb':>10}{'kvot':>7}\")
for k in keys:
  l=sum(a[True].get(k,[]))/max(1,n[True]); s=sum(a[False].get(k,[]))/max(1,n[False])
  if max(l,s)<0.5: continue
  print(f'{k:18}{l:10.1f}{s:10.1f}{(s/l if l else 0):7.2f}')
"
