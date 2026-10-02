// Test-only driver. Credentials come exclusively from the disposable local CLI.
import { execFileSync, spawnSync } from 'node:child_process';

const local=JSON.parse(execFileSync('pnpm',['exec','supabase','status','-o','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
if (local.API_URL!=='http://127.0.0.1:54321' || !local.ANON_KEY || !local.SERVICE_ROLE_KEY) throw new Error('Disposable local Supabase required');
const env={...process.env,NEXT_PUBLIC_SUPABASE_URL:local.API_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:local.ANON_KEY,
  MEDHELP_E2E_LOCAL:'1',MEDHELP_E2E_LOCAL_SERVICE_KEY:local.SERVICE_ROLE_KEY};
const result=spawnSync('pnpm',['test:e2e'],{env,stdio:'inherit'});
process.exitCode=result.status ?? 1;
