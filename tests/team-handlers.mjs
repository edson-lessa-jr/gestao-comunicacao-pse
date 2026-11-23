// Run the endpoint scenarios without a listening server or external credentials.
import { build } from "esbuild";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
const db = new DatabaseSync(":memory:");
for (const file of readdirSync("drizzle").filter(f=>f.endsWith(".sql")).sort()) {
  db.exec(readFileSync("drizzle/"+file,"utf8"));
}
function statement(sql,args=[]) {
  const q=db.prepare(sql);
  return {
    bind:(...xs)=>statement(sql,xs),
    first:()=>q.get(...args), all:()=>({results:q.all(...args)}),
    run:()=>{if(q.columns().length)return {results:q.all(...args)};
      const x=q.run(...args); return {meta:{changes:x.changes,last_row_id:x.lastInsertRowid}};}
  };
}
process.env.PSE_ADMIN_PASSWORD=randomUUID();process.env.PSE_ADMIN_USER="local-test";
globalThis.testContext={env:{
  PSE_ADMIN_PASSWORD:process.env.PSE_ADMIN_PASSWORD,PSE_ADMIN_USER:process.env.PSE_ADMIN_USER,
  PSE_SESSION_SECRET:randomUUID(),
  DB:{prepare:statement,batch:xs=>{db.exec("BEGIN");try{const out=xs.map(x=>x.run());db.exec("COMMIT");return out;}catch(err){db.exec("ROLLBACK");throw err;}}}
}};
const handlers={};
for(const path of ["auth/login","members","users","teams","templates","communications"]){
  const bundle=await build({entryPoints:["app/api/"+path+"/route.ts"],platform:"node",format:"esm",bundle:true,write:false,plugins:[{
    name:"test-binding",setup(b){b.onResolve({filter:/^@opennextjs\/cloudflare$/},()=>({path:"binding",namespace:"unit"}));
      b.onLoad({filter:/.*/,namespace:"unit"},()=>({contents:"export const getCloudflareContext=()=>globalThis.testContext"}));}
  }]});
  handlers[path]=await import("data:text/javascript;base64,"+Buffer.from(bundle.outputFiles[0].contents).toString("base64"));
}
globalThis.fetch=async(url,opts)=>{const req=new Request(url,opts);return handlers[new URL(url).pathname.slice(5)][req.method](req)};
await import("./team-flows.mjs");
