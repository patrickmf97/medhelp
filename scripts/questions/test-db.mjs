// Optional isolated PostgreSQL engine; never connects to a hosted database.
import { readFile, readdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const modulePath=process.env.MEDHELP_PGLITE_MODULE;
if(!modulePath)throw Error('Set MEDHELP_PGLITE_MODULE to an installed @electric-sql/pglite ESM module.');
const {PGlite}=await import(pathToFileURL(modulePath).href);
const db=new PGlite();
try {
 await db.exec(`create role anon; create role authenticated; create role service_role;
 create schema auth; create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`);
 const names=(await readdir('supabase/migrations')).sort();
 for(const name of names) await db.exec(await readFile('supabase/migrations/'+name,'utf8'));
 const tests=process.argv.slice(2);
 for(const file of tests){await db.exec(await readFile(file,'utf8'));console.log('PASS '+file);}
} catch(error) { console.error(error.code, error.message); process.exitCode=1; } finally{await db.close();}
