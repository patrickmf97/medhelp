import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

export function parseArgs(args) {
  const options = { apply: false };
  for (let i=0; i<args.length; i++) {
    const key=args[i];
    if (key==='--apply' && !options.apply) options.apply=true;
    else if (['--bundle','--expected-state'].includes(key)) {
      const name=key==='--bundle' ? 'bundle' : 'expectedState';
      if (options[name] || !args[i+1] || args[i+1].startsWith('--')) throw new Error(`Missing or repeated ${key}`);
      options[name]=args[++i];
    } else throw new Error(`Unknown or repeated option: ${key}`);
  }
  if (!options.bundle) throw new Error('--bundle is required');
  if (options.expectedState && !/^[a-f0-9]{64}$/.test(options.expectedState)) throw new Error('Invalid preview fingerprint');
  if (options.apply && !options.expectedState) throw new Error('--apply requires --expected-state from a fresh preview');
  return options;
}

export async function importBundle(client, bundle, options) {
  const { data, error }=await client.auth.getUser();
  if (error || !data?.user) throw new Error('A valid administrative session is required');
  if (options.apply && !/^[a-f0-9]{64}$/.test(options.expectedState ?? '')) throw new Error('Valid preview fingerprint required');
  const result=await client.rpc(options.apply ? 'apply_content_import' : 'preview_content_import',
    options.apply ? {bundle,expected_state:options.expectedState} : {bundle});
  if (result.error) throw new Error(`Import rejected (${String(result.error.code ?? 'unknown').replace(/[^A-Za-z0-9_]/g,'')}); reconcile permissions or preview conflicts`);
  return result.data;
}

if (process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const options=parseArgs(process.argv.slice(2));
    const endpoint=process.env.SUPABASE_URL;
    const key=process.env.SUPABASE_PUBLISHABLE_KEY;
    const accessToken=process.env.MEDHELP_ADMIN_ACCESS_TOKEN;
    if (!endpoint || !key || !accessToken) throw new Error('Configure SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and MEDHELP_ADMIN_ACCESS_TOKEN securely in the environment');
    const url=new URL(endpoint);
    const local=['127.0.0.1','localhost'].includes(url.hostname);
    if (url.username || url.password || url.search || url.hash || (!local && (url.protocol!=='https:' || !url.hostname.endsWith('.supabase.co')))) throw new Error('Invalid Supabase endpoint');
    const bundle=JSON.parse(await readFile(options.bundle,'utf8'));
    const require=createRequire(new URL('../../apps/web/package.json',import.meta.url));
    const { createClient }=require('@supabase/supabase-js');
    // No service-role key, no password sign-in, no persisted or refreshed session.
    const client=createClient(endpoint,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{headers:{Authorization:`Bearer ${accessToken}`}}});
    const authenticated={...client,auth:{getUser:()=>client.auth.getUser(accessToken)},rpc:client.rpc.bind(client)};
    console.log(JSON.stringify(await importBundle(authenticated,bundle,options),null,2));
  } catch (error) {
    // Network/JSON errors can contain user input. Only our safe errors are emitted.
    const message=error instanceof Error ? error.message : '';
    console.error(/^(Configure |Invalid |Missing |Unknown |--|A valid |Valid preview |Import rejected)/.test(message) ? message : 'Import failed; check the bundle, endpoint and session locally');
    process.exitCode=1;
  }
}
