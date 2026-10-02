// Disposable integration fixture only. Never accepts a remote URL or credentials.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { compileCatalog } from './compile.mjs';
import { importBundle } from './import.mjs';

export async function seedLocalJourney(local) {
  assert.equal(local.API_URL,'http://127.0.0.1:54321');
  const require=createRequire(new URL('../../apps/web/package.json',import.meta.url));
  const {createClient}=require('@supabase/supabase-js');
  const opts={auth:{persistSession:false,autoRefreshToken:false}};
  const admin=createClient(local.API_URL,local.SERVICE_ROLE_KEY,opts);
  const email=`import-${randomUUID()}@medhelp.test`;
  const password=`Local-${randomUUID()}!`;
  const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true});
  assert.equal(error,null);
  const role=await admin.from('user_roles').insert({user_id:data.user.id,role:'editor',assigned_by:data.user.id});
  assert.equal(role.error,null);
  const editor=createClient(local.API_URL,local.ANON_KEY,opts);
  assert.equal((await editor.auth.signInWithPassword({email,password})).error,null);
  const bundle=await compileCatalog(process.cwd());
  const preview=await importBundle(editor,bundle,{apply:false});
  assert.deepEqual([preview.create,preview.update,preview.unchanged,preview.conflicts.length],[83,0,0,0]);
  // Two real concurrent HTTP requests with one state token: exactly one may apply.
  const attempts=await Promise.all([
    editor.rpc('apply_content_import',{bundle,expected_state:preview.expectedState}),
    editor.rpc('apply_content_import',{bundle,expected_state:preview.expectedState}),
  ]);
  const success=attempts.filter(x=>!x.error);
  assert.equal(success.length,1);
  assert.equal(attempts.find(x=>x.error).error.code,'40001');
  assert.equal(success[0].data.create,83);
  const repeat=await importBundle(editor,bundle,{apply:false});
  assert.deepEqual([repeat.create,repeat.update,repeat.unchanged,repeat.conflicts.length],[0,0,83,0]);
  const publish={batch_id:success[0].data.batchId,expected_state:repeat.expectedState};
  assert.equal((await editor.rpc('publish_content_import',publish)).error,null);
  assert.equal((await editor.rpc('publish_content_import',publish)).error,null);
  const result=await importBundle(editor,bundle,{apply:false});
  assert.equal(result.unchanged,83);
  console.log('Real catalog integration: 83 lessons, concurrent stale request rejected, reimport unchanged, atomic publication and retry passed.');
}
