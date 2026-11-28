import json,glob,sys,statistics as S,collections,math,re
D=sys.argv[1]
def med(l): return round(S.median(l),3) if l else None
for f in sorted(glob.glob(D+'/*.json')):
  d=json.load(open(f)); fr=d['frames']; sl=d['slag']; nm={int(k):v for k,v in d['namn'].items()}
  rid=set(p['id'] for x in fr for p in x['p'] if p.get('r'))
  print('=====',f.split('/')[-1], 'rövare',len(rid),'slutT',d['slutT'])
  sedd=next((x['f']['sedd'] for x in fr if x.get('f') and x['f'].get('sedd') is not None),None)
  lj=next((x['ljus'] for x in fr if sedd is not None and x['t']>=sedd),None)
  vant=next((x['t'] for x in fr if x.get('f') and x['f']['gor']=='vantar'),None)
  anf=next((x['t'] for x in fr if x.get('f') and x['f'].get('anf')),None)
  att=[s for s in sl if s['h'] in('traff','miss','parera','duck','knuff','skyddar','tog')]
  first=att[0]['t'] if att else None; last=att[-1]['t'] if att else None
  borta=next((x['t'] for x in fr if not x.get('f') and x['t']>10),None)
  ta=[x['t'] for x in fr if any(p.get('r') and p.get('a')=='ta' for p in x['p'])]
  # längsta 'ta' per rövare
  run=collections.defaultdict(float); best=collections.defaultdict(float); prev={}
  for x in fr:
    for p in x['p']:
      if p.get('r'):
        if p.get('a')=='ta':
          if prev.get(p['id']) is not None: run[p['id']]+=x['t']-prev[p['id']]
          prev[p['id']]=x['t']; best[p['id']]=max(best[p['id']],run[p['id']])
        else: run[p['id']]=0; prev[p['id']]=None
  ljus0=fr[0]['ljus']
  print(' ljus %.2f sedd %s (ljus %s) rast %s anfall %s första slag %s sista %s strid %s s; plundring %s–%s (%s s), längst ta per rövare %s; borta %s'%(ljus0,sedd,lj,vant,anf,first,last,(last-first) if att else None,ta[0] if ta else None,ta[-1] if ta else None,(ta[-1]-ta[0]) if ta else 0,sorted([round(v) for v in best.values()],reverse=True)[:4],borta))
  print(' tagit',d.get('tagit'))
  side=lambda i: 'R' if i in rid else 'B'
  for sd in 'RB':
    fs=[s for s in sl if s['h'] in('traff','miss','tog') and side(s.get('a'))==sd]+[s for s in sl if s['h'] in('parera','duck') and side(s.get('b'))==sd]
    tr=[s for s in sl if s['h']=='traff' and side(s.get('a'))==sd]
    g=[s['g'] for s in tr if s.get('g') is not None]
    if fs: print(' sida %s: försök %d träff %d (%.0f%%) skada/träff median %s, >=0.2: %d (%.1f%%), max %s; kast %d'%(sd,len(fs),len(tr),100*len(tr)/len(fs),med(g),sum(1 for x in g if x>=0.2),100*sum(1 for x in g if x>=0.2)/max(1,len(g)),max(g) if g else None,sum(1 for s in tr if s.get('kast'))))
  kl=collections.defaultdict(list)
  for s in sl:
    if s['h']=='traff' and s.get('g') is not None: kl[str(s.get('kl'))].append(s['g'])
  print(' per skydd (kl):',{k:(len(v),round(100*sum(1 for x in v if x>=0.2)/len(v),1)) for k,v in kl.items()})
  vap=collections.Counter((side(s.get('a')),s.get('v')) for s in sl if s['h'] in('traff','miss'))
  print(' vapen i slagen',dict(vap))
  hc=collections.Counter(s['h'] for s in sl); print(' händelser',dict(hc.most_common(25)))
  # fall
  fall={}
  for s in sl:
    if s['h'] in('nere','dod','ger','flykt','kryper') and s.get('a') is not None and s['a'] not in fall: fall[s['a']]=(s['h'],s['t'])
  recv=collections.defaultdict(list)
  for s in sl:
    if s['h']=='traff' and s.get('b') is not None: recv[s['b']].append((s['t'],s.get('g') or 0))
  bl=collections.defaultdict(list)
  for x in fr:
    for p in x['p']:
      if p.get('k'): bl[p['id']].append((x['t'],p['k'].get('bl'),p['k'].get('l'),p['k'].get('hj')))
  rows=[]
  for i,(h,t) in sorted(fall.items(),key=lambda z:z[1][1]):
    r=[g for tt,g in recv.get(i,[]) if tt<=t]
    b=next((bb for tt,bb,l,hj in reversed(bl.get(i,[])) if tt<=t+0.5),None)
    hj=any(hh for _,_,_,hh in bl.get(i,[]))
    rows.append((side(i),nm.get(i,i),h,t,len(r),round(max(r or [0]),2),b,hj))
    print('  %s %-12s %-6s t=%s träffar före %d max %.2f blod %s %s'%(side(i),str(nm.get(i,i))[:12],h,t,len(r),max(r or [0]),b,'hjälpare' if hj else ''))
  fl=[r for r in rows if r[2]=='flykt']
  print(' flydde %d, med sår>=0.2 eller blod<0.85: %d'%(len(fl),sum(1 for r in fl if r[5]>=0.2 or (r[6] is not None and r[6]<0.85))))
  ner=[r for r in rows if r[2] in('nere','dod')]
  print(' föll/dog %d, blod vid fall %s'%(len(ner),sorted(r[6] for r in ner if r[6] is not None)))
  for l in d['byLogg']:
    if re.search('svårt|dog|döda|dödade|vann|förblödde|ihjäl|stupade',l['text']): print('  LOGG',l['t'],l['text'][:220])
  # rörelse: kämpar i strid, inte hjälpare
  pos=collections.defaultdict(list)
  for x in fr:
    for p in x['p']:
      k=p.get('k')
      pos[p['id']].append((x['t'],p['x'],p['y'],bool(k and k.get('l')=='strid' and not k.get('hj'))))
  stil=0;tot=0;longest=0;rev=0
  for i,L in pos.items():
    cur=0
    for j in range(1,len(L)):
      t0,x0,y0,k0=L[j-1]; t1,x1,y1,k1=L[j]
      if not(k0 and k1) or t1-t0>0.51: cur=0; continue
      tot+=1; dd=math.hypot(x1-x0,y1-y0)
      if dd<0.02: stil+=1; cur+=t1-t0; longest=max(longest,cur)
      else: cur=0
      if j+1<len(L):
        t2,x2,y2,k2=L[j+1]
        if k2 and t2-t1<=0.51:
          d1=dd; d2=math.hypot(x2-x1,y2-y1); d02=math.hypot(x2-x0,y2-y0)
          if d1>0.3 and d2>0.3 and d02<0.3*min(d1,d2): rev+=1
  ext=[]
  for x in fr:
    ps=[p for p in x['p'] if p.get('k') and p['k'].get('l')=='strid']
    if len(ps)>=2: ext.append(max(max(p['x'] for p in ps)-min(p['x'] for p in ps),max(p['y'] for p in ps)-min(p['y'] for p in ps)))
  if tot: print(' rörelse: stilla %.0f%% av %d halvsekunder, längst stilla %.0f s, vändningar %d, stridens största sida median %s'%(100*stil/tot,tot,longest,rev,med(ext)))
