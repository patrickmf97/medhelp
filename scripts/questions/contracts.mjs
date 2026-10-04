import { createHash } from 'node:crypto';
export const AREAS = ['clinica','cirurgia','pediatria','go','mfc_sc'];
export const OPTIONS = ['A','B','C','D'];
const norm = s => s.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/\s+/g,' ').trim();
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));
  return typeof value === 'string' ? value.replace(/\r\n/g,'\n').trim() : value;
}
export function canonicalQuestionHash(item) {
  const {editorialId,version,status,authorship,checks,...content}=item;
  content.options=[...content.options].sort((a,b)=>a.id.localeCompare(b.id));
  return createHash('sha256').update(JSON.stringify(stable(content))).digest('hex');
}
function contentSignature(item) {
  return createHash('sha256').update(JSON.stringify([norm(item.stem),norm(item.leadIn),[...item.options].sort((a,b)=>a.id.localeCompare(b.id)).map(o=>norm(o.text))])).digest('hex');
}
export function validateQuestionBundle(value) {
  const errors=[];
  const fail=(path,code,message=code)=>errors.push({path,code,message});
  try { if (Buffer.byteLength(JSON.stringify(value),'utf8')>5*1024*1024) return {ok:false,errors:[{path:'$',code:'size',message:'Lote acima de 5 MiB.'}]}; }
  catch { return {ok:false,errors:[{path:'$',code:'json',message:'Documento não serializável.'}]}; }
  function object(v,p,keys) {
    if (!v || typeof v!=='object' || Array.isArray(v)) { fail(p,'object'); return false; }
    for (const key of keys) if (!Object.hasOwn(v,key)) fail(`${p}.${key}`,'required');
    for (const key of Object.keys(v)) if (!keys.includes(key)) fail(`${p}.${key}`,'unknown');
    return true;
  }
  function str(v,p,max=30000) { if(typeof v!=='string'||!v.trim()||v.length>max) fail(p,'text'); }
  function date(v,p,timestamp=false) {
    if(typeof v!=='string'||!(timestamp?/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/:/^\d{4}-\d{2}-\d{2}$/).test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v.slice(0,10)) fail(p,'date');
  }
  function url(v,p) { try { const u=new URL(v); if(!['http:','https:'].includes(u.protocol)||u.username||u.password||typeof v!=='string') fail(p,'url'); } catch {fail(p,'url');} }
  function one(v,p,vs) { if(!vs.includes(v))fail(p,'enum'); }
  if(!object(value,'$',['schemaVersion','batchId','items'])) return {ok:false,errors};
  if(value.schemaVersion!==1)fail('schemaVersion','schema_version');
  if(typeof value.batchId!=='string'||!/^MEDHELP-ENAMED-\d{3}$/.test(value.batchId)||+value.batchId.slice(-3)<1||+value.batchId.slice(-3)>50)fail('batchId','batch_id');
  if(!Array.isArray(value.items)||value.items.length<1||value.items.length>100) return {ok:false,errors:[...errors,{path:'items',code:'item_count',message:'Cada lote contém 1–100 itens.'}]};
  const ids=new Set(), hashes=new Set();
  for (const [i,q] of value.items.entries()) {
    const p=`items[${i}]`, before=errors.length;
    if(!object(q,p,['editorialId','version','area','topic','competency','careContext','tags','stem','leadIn','options','answer','rationale','optionRationales','estimatedDifficulty','learningObjective','references','status','authorship','checks']))continue;
    if(typeof q.editorialId!=='string'||!/^MEDHELP-ENAMED-\d{5}$/.test(q.editorialId)||+q.editorialId.slice(-5)<1||+q.editorialId.slice(-5)>5000)fail(`${p}.editorialId`,'id');
    if(ids.has(q.editorialId))fail(`${p}.editorialId`,'duplicate_id'); ids.add(q.editorialId);
    if(!Number.isSafeInteger(q.version)||q.version<1)fail(`${p}.version`,'version');
    one(q.area,`${p}.area`,AREAS); one(q.answer,`${p}.answer`,OPTIONS); one(q.estimatedDifficulty,`${p}.estimatedDifficulty`,['easy','medium','hard']); one(q.status,`${p}.status`,['draft','checked']);
    for(const k of ['topic','careContext','stem','leadIn','rationale','learningObjective'])str(q[k],`${p}.${k}`);
    if(object(q.competency,`${p}.competency`,['code','label','sourceUrl'])) { str(q.competency.code,`${p}.competency.code`,300); str(q.competency.label,`${p}.competency.label`,3000); url(q.competency.sourceUrl,`${p}.competency.sourceUrl`); }
    if(!Array.isArray(q.tags)||q.tags.length>30||q.tags.some(t=>typeof t!=='string'||!t.trim()||t.length>100)||new Set(q.tags).size!==q.tags.length)fail(`${p}.tags`,'tags');
    if(!Array.isArray(q.options)||q.options.length!==4)fail(`${p}.options`,'four_options');
    else {
      const optionIds=new Set(), texts=new Set();
      for(const [j,o]of q.options.entries())if(object(o,`${p}.options[${j}]`,['id','text'])){
        one(o.id,`${p}.options[${j}].id`,OPTIONS); str(o.text,`${p}.options[${j}].text`,5000);
        if(optionIds.has(o.id))fail(`${p}.options`,'duplicate_option_id'); optionIds.add(o.id);
        if(typeof o.text==='string'){const t=norm(o.text);if(texts.has(t))fail(`${p}.options`,'duplicate_option_text');texts.add(t);}
      }
    }
    if(object(q.optionRationales,`${p}.optionRationales`,OPTIONS))for(const k of OPTIONS)str(q.optionRationales[k],`${p}.optionRationales.${k}`);
    if(!Array.isArray(q.references)||q.references.length<1||q.references.length>10)fail(`${p}.references`,'references');
    else for(const [j,r] of q.references.entries())if(object(r,`${p}.references[${j}]`,['title','organization','editionDate','url','evidenceLocation','consultedAt'])){
      for(const k of ['title','organization','evidenceLocation'])str(r[k],`${p}.references[${j}].${k}`,10000);
      str(r.editionDate,`${p}.references[${j}].editionDate`,100); url(r.url,`${p}.references[${j}].url`); date(r.consultedAt,`${p}.references[${j}].consultedAt`);
    }
    if(object(q.authorship,`${p}.authorship`,['actor','kind','recordedAt'])){str(q.authorship.actor,`${p}.authorship.actor`,500);one(q.authorship.kind,`${p}.authorship.kind`,['assisted','human']);date(q.authorship.recordedAt,`${p}.authorship.recordedAt`,true);}
    if(!Array.isArray(q.checks)||q.checks.length>100)fail(`${p}.checks`,'checks');
    else for(const [j,c]of q.checks.entries())if(object(c,`${p}.checks[${j}]`,['actor','kind','version','recordedAt','outcome','notes'])){
      str(c.actor,`${p}.checks[${j}].actor`,500);str(c.notes,`${p}.checks[${j}].notes`,10000);one(c.kind,`${p}.checks[${j}].kind`,['structural','editorial']);one(c.outcome,`${p}.checks[${j}].outcome`,['pass','pending','reject']);date(c.recordedAt,`${p}.checks[${j}].recordedAt`,true);if(c.version!==q.version)fail(`${p}.checks[${j}].version`,'check_version');
    }
    if(q.status==='checked'&&(!Array.isArray(q.checks)||!q.checks.some(c=>c?.kind==='editorial'&&c?.outcome==='pass'&&c?.version===q.version)))fail(`${p}.status`,'missing_editorial_check');
    if(errors.length===before){const h=contentSignature(q);if(hashes.has(h))fail(p,'duplicate_content');hashes.add(h);}
  }
  return errors.length?{ok:false,errors}:{ok:true,bundle:value};
}
export function findDuplicateCandidates(items) {
  const tokenSets=items.map(q=>new Set(norm(`${q.stem} ${q.leadIn}`).match(/[a-z]+/g)??[]));
  const pairs=[];
  for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
    const a=tokenSets[i],b=tokenSets[j];const union=new Set([...a,...b]).size;const overlap=[...a].filter(t=>b.has(t)).length;const similarity=union?overlap/union:0;
    const sameObjective=norm(items[i].topic)===norm(items[j].topic)&&norm(items[i].learningObjective)===norm(items[j].learningObjective);
    if(similarity>=0.8||(sameObjective&&similarity>=0.6))pairs.push({first:items[i].editorialId,second:items[j].editorialId,similarity,reason:sameObjective?'shared_objective':'similar_text'});
  }
  return pairs;
}
