#!/bin/bash
# stat.sh <mapp> <regex>: statistiken per by som matchar
for f in $1/*.json; do node -e '
const t=require("fs").readFileSync(process.argv[1],"utf8").trim().split("\n").pop();if(!t)process.exit();const r=JSON.parse(t);
console.log(r.seed,"kyla",r.n.kyla,Object.entries(r.stat).filter(([k])=>new RegExp(process.argv[2],"i").test(k)).map(([k,v])=>k+"="+Math.round(v)).join(" "))' $f "$2"; done
