// Runs only against a new in-memory PostgreSQL instance on loopback, never a hosted project.
import {readFile,readdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {createHmac,randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
const {MEDHELP_PGLITE_MODULE,MEDHELP_PGLITE_SOCKET_MODULE,MEDHELP_POSTGREST_BINARY}=process.env;
if(!MEDHELP_PGLITE_MODULE||!MEDHELP_PGLITE_SOCKET_MODULE||!MEDHELP_POSTGREST_BINARY)throw Error('Provide local PGlite, socket module and PostgREST binary paths.');
const {PGlite}=await import(pathToFileURL(MEDHELP_PGLITE_MODULE).href);
const {PGLiteSocketServer}=await import(pathToFileURL(MEDHELP_PGLITE_SOCKET_MODULE).href);
const db=await PGlite.create();
const socket=new PGLiteSocketServer({db,host:'127.0.0.1',port:54668});
let api;let log='';
const secret=randomBytes(32).toString('hex');
const a='10000000-0000-0000-0000-000000000001',b='10000000-0000-0000-0000-000000000002';
const v='30000000-0000-0000-0000-000000000001',event='40000000-0000-0000-0000-000000000001';
const jwt=sub=>{const h=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');const p=Buffer.from(JSON.stringify({role:'authenticated',sub,exp:Math.floor(Date.now()/1000)+600})).toString('base64url');return `${h}.${p}.${createHmac('sha256',secret).update(`${h}.${p}`).digest('base64url')}`;};
async function request(path,sub,body,extra={}){
 const headers={...extra};if(sub)headers.Authorization=`Bearer ${jwt(sub)}`;
 if(body)headers['Content-Type']='application/json';
 const r=await fetch('http://127.0.0.1:54669/'+path,{headers,method:body?'POST':'GET',body:body?JSON.stringify(body):undefined});
 return {status:r.status,data:await r.json()};
}
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
 for(const name of (await readdir('supabase/migrations')).sort())await db.exec(await readFile('supabase/migrations/'+name,'utf8'));
 const sql=await readFile('supabase/tests/question_bank_test.sql','utf8');await db.exec(sql.slice(0,sql.indexOf('set local role anon;'))+'commit;');
 await socket.start();
 api=spawn(MEDHELP_POSTGREST_BINARY,[],{env:{...process.env,PGRST_DB_URI:'postgresql://postgres:postgres@127.0.0.1:54668/postgres',PGRST_DB_SCHEMAS:'public',PGRST_DB_ANON_ROLE:'anon',PGRST_JWT_SECRET:secret,PGRST_SERVER_HOST:'127.0.0.1',PGRST_SERVER_PORT:'54669',PGRST_DB_POOL:'1',PGRST_DB_CHANNEL_ENABLED:'false',PGRST_DB_PREPARED_STATEMENTS:'false'},stdio:['ignore','pipe','pipe']});
 api.stdout.on('data',d=>{log+=d;});api.stderr.on('data',d=>{log+=d;});
 let ready=false;for(let i=0;i<50;i++){try{const r=await request('question_versions?select=id',b);if(r.status===200){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,100));}
 assert(ready,'Local PostgREST did not start: '+log.slice(-2000));
 assert((await request('question_versions?select=id')).status>=400,'anonymous table allowed');
 assert.deepEqual((await request('question_versions?select=id,stem',b)).data,[]);
 const publicPayload=await request('question_versions?select=id,stem,lead_in,question_options(option_id,text),questions!inner(editorial_id)&order=questions(editorial_id).asc,id.asc',a);
 assert.equal(publicPayload.status,200);assert.equal(publicPayload.data.length,1);
 for(const key of ['answer','rationale','option_rationales','references_json'])assert(!JSON.stringify(publicPayload.data).includes(`"${key}"`),`leaked ${key}`);
 assert((await request('question_keys',a)).status>=400,'keys endpoint exposed');
 assert((await request('question_keys',a,undefined,{'Accept-Profile':'private'})).status>=400,'private schema exposed');
 const submit=option=>({p_version_id:v,p_option:option,p_event_id:event});
 assert((await request('rpc/submit_question',undefined,submit('A'))).status>=400);
 assert.equal((await request('rpc/submit_question',b,submit('A'))).status,403);
 assert.equal((await request('rpc/submit_question',a,submit('E'))).status,400);
 const first=await request('rpc/submit_question',a,submit('B'));assert.equal(first.status,200);assert.equal(first.data.outcome,'incorrect');assert.equal(first.data.answer,'A');
 const retry=await request('rpc/submit_question',a,submit('B'));assert.equal(retry.status,200);assert.equal(retry.data.replayed,true);assert.equal(retry.data.attemptId,first.data.attemptId);
 assert.equal((await request('rpc/submit_question',a,submit('A'))).status,409);
 assert.deepEqual((await request('question_attempts?select=id',b)).data,[]);
 assert((await request('question_attempts',a,{user_id:a,version_id:v,outcome:'correct'})).status>=400,'forged score accepted');
 await db.exec(`update public.subscriptions set access_until=now()-interval '1 minute' where user_id='${a}'`);
 assert.equal((await request('rpc/submit_question',a,submit('B'))).status,403);
 assert.deepEqual((await request('question_versions?select=stem',a)).data,[]);
 assert.equal((await request('question_attempts?select=id,outcome',a)).data.length,1);
 console.log('PASS local REST: anonymous/nonpremium/key denial, safe public payload and ordering, correction/retry/conflict, owner isolation, forged score denial and expired access.');
}catch(e){console.error(e.stack);console.error('API diagnostics:',log.slice(-2500));process.exitCode=1;}
finally{if(api){api.kill('SIGTERM');await new Promise(resolve=>api.once('exit',resolve));}await socket.stop();await db.close();}
