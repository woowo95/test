#!/bin/bash
# mat.sh <commit> [byar=8] [dygn=35]: kör byarna seedAv(0..n-1) med koden i commit, skriver en rad per by och summan
c=$1; n=${2:-8}; d=${3:-35}
cd /home/user/test
[ -d ${W:-/home/user/wt/b} ] || git worktree add -q --detach ${W:-/home/user/wt/b} $c
cd ${W:-/home/user/wt/b} && git checkout -q --detach $c && [ -e node_modules ] || ln -s /home/user/test/node_modules node_modules
ut=/home/user/wt/mat/$c-$n-$d; mkdir -p $ut
seq 0 $((n-1)) | xargs -P${P:-4} -I{} sh -c "s=\$((1001 + {} * 7919)); [ -s $ut/\$s.json ] || npx tsx src/test/en.ts \$s $d > $ut/\$s.json 2>$ut/\$s.err"
node -e '
const fs=require("fs"),d=process.argv[1];let ut=0,kyla=0,doda=0,v=0,rad=[];
for(const f of fs.readdirSync(d).filter(f=>f.endsWith(".json"))){const t=fs.readFileSync(d+"/"+f,"utf8").trim().split("\n").pop();let r;try{r=JSON.parse(t)}catch{rad.push(f+" KRASCH");continue}
 if(r.n.atergrundad>0)ut++;kyla+=r.n.kyla;doda+=r.n.doda;v+=r.vakter.length;rad.push(`${r.seed}: pop ${r.n.pop} åter ${r.n.atergrundad} kyla ${r.n.kyla} svält ${r.n.svalt} döda ${r.n.doda} vakter ${r.vakter.length}`)}
console.log(rad.join("\n"));console.log(`SUMMA ${process.argv[2]}: utdöda ${ut}, kyla ${kyla}, döda ${doda}, vaktlarm ${v}`)' $ut $c
