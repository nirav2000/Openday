'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const code = fs.readFileSync('primary-performance.js','utf8');
const html = fs.readFileSync('primary-performance.html','utf8');
assert.match(html,/id="clearSearch"/);
assert.doesNotMatch(code,/function history\(/);
assert.match(code,/window\.history\.replaceState/);
const catalog=[{id:'primary-131577',name:'Pinner Wood School',urn:'131577',area:'Pinner'},{id:'primary-101509',name:'Park Lane Primary School',urn:'101509',area:'Harrow'}];
const data={
'data/primary-schools.json':{schools:catalog},
'data/primary-performance.json':{schools:{'131577':{years:{'2024/25':{combinedExpected:86,combinedHigher:6},'2023/24':{combinedExpected:74}}},'101509':{years:{'2024/25':{combinedExpected:81,combinedHigher:7}}}}},
'data/primary-cohort-context.json':{schools:{'131577':{years:{'2024/25':{eligibleYear6:88}}}}}
};
const nodes={};const historyChanges=[];
function node(key){
 if(nodes[key])return nodes[key];
 const n={value:'',_html:'',textContent:'',listeners:{},buttons:[],scrollIntoView(){},focus(){this.listeners.focus?.()},addEventListener(type,handler){this.listeners[type]=handler},querySelectorAll(selector){return selector==='button'?this.buttons:[]}};
 Object.defineProperty(n,'innerHTML',{get(){return this._html},set(v){this._html=v;if(key==='#rows'){this.buttons=[...v.matchAll(/data-id="([^"]+)"/g)].map(x=>({dataset:{id:x[1]},onclick:null}))}}});
 nodes[key]=n;return n;
}
const sandbox={document:{querySelector(selector){return selector==='#year-picker'&&!node('#detail').innerHTML.includes('id="year-picker"')?null:node(selector)}},window:{history:{replaceState(...args){historyChanges.push(args)}}},location:{search:'?school=Pinner%20Wood%20School'},URLSearchParams,encodeURIComponent,console,fetch:async u=>({ok:true,json:async()=>data[u]})};
vm.runInNewContext(code,sandbox,{filename:'primary-performance.js'});
async function test(){
 await new Promise(resolve=>setImmediate(resolve));
 await new Promise(resolve=>setImmediate(resolve));
 const input=node('#search'),rows=node('#rows'),details=node('#detail');
 assert.equal(input.value,'Pinner Wood School');
 assert.match(details.innerHTML,/Pinner Wood School/);
 input.focus();
 assert.equal(input.value,'','focusing populated search clears it');
 input.value='park';
 input.listeners.input();
 assert.match(rows.innerHTML,/Park Lane Primary School/);
 assert.doesNotMatch(rows.innerHTML,/Pinner Wood School/);
 const pick=rows.buttons[0];assert.equal(typeof pick.onclick,'function','school row has live click handler');
 pick.onclick();
 assert.match(details.innerHTML,/Park Lane Primary School/,'click opens selected school');
 assert.equal(historyChanges.length,1,'click updates browser history');
 input.value='PINNER';input.listeners.input();
 assert.match(rows.innerHTML,/Pinner Wood School/,'case insensitive matching');
 node('#clearSearch').listeners.click();
 assert.equal(input.value,'','clear button works');
 assert.equal(rows.buttons.length,2,'clear restores all school rows');
 assert.match(node('#status').textContent,/2 of 2/);
 rows.buttons.find(b=>b.dataset.id==='primary-131577').onclick();
 node('#year-picker').value='2023/24';
 node('#year-picker').onchange({target:{value:'2023/24'}});
 assert.match(details.innerHTML,/2023\/24/,'year switching shows selected year');
 console.log('Primary school search, click, deep link and year regression passed');
}
test().catch(e=>{console.error(e);process.exitCode=1});
