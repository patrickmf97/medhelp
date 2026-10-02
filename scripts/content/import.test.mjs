import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs, importBundle } from './import.mjs';

test('dry run is default; apply requires exact preview fingerprint', () => {
  assert.deepEqual(parseArgs(['--bundle','a.json']), { bundle: 'a.json', apply: false });
  assert.throws(() => parseArgs(['--bundle','a.json','--apply']), /expected-state/);
  assert.throws(() => parseArgs(['--bundle','a.json','--unknown']), /Unknown/);
  assert.throws(() => parseArgs(['--bundle','a.json','--expected-state','secret']), /fingerprint/);
});

test('preview only calls read RPC with validated user', async () => {
  const calls=[];
  const client={ auth:{ getUser:async()=>({data:{user:{id:'editor'}},error:null}) },
    rpc:async(name,args)=>{calls.push([name,args]); return {data:{create:83},error:null};} };
  assert.deepEqual(await importBundle(client,{version:'0.3'},{apply:false}),{create:83});
  assert.deepEqual(calls,[['preview_content_import',{bundle:{version:'0.3'}}]]);
});

test('expired session cannot invoke import', async () => {
  const client={ auth:{ getUser:async()=>({data:{user:null},error:{message:'expired'}}) },
    rpc:()=>assert.fail('must not run') };
  await assert.rejects(importBundle(client,{},{}), /session/i);
});

test('apply carries expected state and never publishes', async () => {
  const calls=[];
  const client={auth:{getUser:async()=>({data:{user:{id:'editor'}},error:null})},
    rpc:async(name,args)=>{calls.push([name,args]);return {data:{batchId:'batch'},error:null};}};
  const expectedState='a'.repeat(64);
  await importBundle(client,{version:'0.3'},{apply:true,expectedState});
  assert.deepEqual(calls,[['apply_content_import',{bundle:{version:'0.3'},expected_state:expectedState}]]);
});

test('RPC errors do not leak server error details or credentials', async () => {
  const client={auth:{getUser:async()=>({data:{user:{id:'editor'}},error:null})},
    rpc:async()=>({data:null,error:{code:'40001',message:'secret-token'}})};
  await assert.rejects(importBundle(client,{},{}), error => error.message.includes('40001') && !error.message.includes('secret-token'));
});
