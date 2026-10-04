import { AREAS,canonicalQuestionHash,findDuplicateCandidates } from './contracts.mjs';
export function buildPilotReport(bundle) {
  const countsByArea=Object.fromEntries(AREAS.map(a=>[a,0]));
  const countsByDifficulty={easy:0,medium:0,hard:0},states={draft:0,checked:0};
  const perAreaDifficulty=Object.fromEntries(AREAS.map(a=>[a,{easy:0,medium:0,hard:0}]));
  const hashes=new Map();let mentalHealthCount=0;
  for(const q of bundle.items){countsByArea[q.area]=(countsByArea[q.area]??0)+1;countsByDifficulty[q.estimatedDifficulty]++;states[q.status]=(states[q.status]??0)+1;if(perAreaDifficulty[q.area])perAreaDifficulty[q.area][q.estimatedDifficulty]++;if(q.tags.includes('saude_mental'))mentalHealthCount++;const h=canonicalQuestionHash(q);hashes.set(h,[...(hashes.get(h)??[]),q.editorialId]);}
  const distributionErrors=[];
  if(bundle.items.length!==100)distributionErrors.push('total: expected 100');
  for(const area of AREAS){if(countsByArea[area]!==20)distributionErrors.push(`${area}: expected 20`);for(const [d,n]of Object.entries({easy:5,medium:10,hard:5}))if(perAreaDifficulty[area][d]!==n)distributionErrors.push(`${area} difficulty ${d}: expected ${n}`);}
  if(mentalHealthCount<10)distributionErrors.push('saude_mental: expected at least 10');
  return {total:bundle.items.length,countsByArea,countsByDifficulty,perAreaDifficulty,mentalHealthCount,states,exactDuplicates:[...hashes.values()].filter(ids=>ids.length>1),duplicateCandidates:findDuplicateCandidates(bundle.items),distributionErrors};
}
