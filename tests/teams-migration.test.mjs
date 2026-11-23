import {test} from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {readFileSync} from "node:fs";
const sql=name=>readFileSync(new URL("../drizzle/"+name,import.meta.url),"utf8");
test("histórico intacto, contador máximo e sequência independente por time/tipo/ano",()=>{
  const d=new DatabaseSync(":memory:");
  d.exec(sql("0000_cultured_vivisector.sql"));d.exec(sql("0001_users_and_atomic_numbering.sql"));
  d.exec("INSERT INTO users(login,email,password_hash,full_name,role,status,created_at,updated_at,created_by) VALUES('ana','a@example.test','hash','Ana','COMUNICADOR','INATIVO','a','b','adm')");
  d.exec("INSERT INTO communications(type,year,number,title,fields_json,rendered_message,created_by,created_at,updated_at) VALUES ('BOLETIM_PERIODICO',2026,7,'Boletim','{}','Texto nº 07/26','ana','data1','data2')");
  d.exec("INSERT INTO communication_counters VALUES('BOLETIM_PERIODICO',2026,9)");
  const history={...d.prepare("SELECT * FROM communications").get()};
  d.exec(sql("0002_team_workspaces.sql"));
  const migrated={...d.prepare("SELECT * FROM communications").get()};assert.equal(migrated.team_id,1);delete migrated.team_id;assert.deepEqual(migrated,history);
  assert.equal(d.prepare("SELECT role FROM team_members").get().role,"COMUNICADOR");assert.equal(d.prepare("SELECT status FROM users").get().status,"INATIVO");
  const defaults=JSON.parse(readFileSync(new URL("../app/lib/base-templates.json",import.meta.url)));
  assert.deepEqual(Object.fromEntries(d.prepare("SELECT type,body FROM team_templates").all().map(x=>[x.type,x.body])),defaults);
  d.exec("INSERT INTO teams(name,acronym) VALUES('Outro','OUT')");
  function publish(team,type,year){const id=d.prepare("INSERT INTO communications(team_id,type,year,number,title,fields_json,rendered_message,created_by,created_at,updated_at) VALUES(?,?,?,0,'B','{}','Nº [NN]','ana','t','t')").run(team,type,year).lastInsertRowid;return d.prepare("SELECT number,rendered_message FROM communications WHERE id=?").get(id)}
  assert.equal(publish(1,'BOLETIM_PERIODICO',2026).number,10);assert.equal(publish(2,'BOLETIM_PERIODICO',2026).rendered_message,'Nº 01');
  assert.equal(publish(1,'BOLETIM_PERIODICO',2027).number,1);assert.equal(publish(1,'EXTRAORDINARIA',2026).number,1);
  assert.throws(()=>d.exec("UPDATE communications SET title='x' WHERE id=1"),/imutavel/);assert.throws(()=>d.exec("DELETE FROM communications WHERE id=1"),/imutavel/);
  d.close();
});
