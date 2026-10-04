import 'server-only';
import {requireUser} from '@/lib/auth/require-role';
import type {OptionId,PublicQuestion,QuestionPage,StudyResult} from './types';
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const QUESTION_SELECT='id,question_id,stem,lead_in,area,topic,estimated_difficulty,question_options(option_id,text)';
export function pageRange(page:number):[number,number]{
 if(!Number.isSafeInteger(page)||page<1||page>10000)throw new Error('Página inválida.');
 return [(page-1)*20,page*20-1];
}
export function questionError(code?:string):Error{
 if(code==='42501')return new Error('É necessário acesso Premium vigente.');
 if(code==='23505')return new Error('Resposta já registrada com outro conteúdo. Atualize a página.');
 return new Error('Não foi possível concluir. A questão pode estar indisponível; tente novamente.');
}
export function mapQuestion(row:Record<string,unknown>):PublicQuestion{
 const options=Array.isArray(row.question_options)?row.question_options as {option_id:OptionId;text:string}[]:[];
 return {id:String(row.question_id),versionId:String(row.id),stem:String(row.stem),leadIn:String(row.lead_in),area:String(row.area),topic:String(row.topic),estimatedDifficulty:String(row.estimated_difficulty),options:options.map(o=>({id:o.option_id,text:o.text})).sort((a,b)=>a.id.localeCompare(b.id))};
}
export async function submitStudyAnswer(versionId:string,optionId:OptionId,eventId:string):Promise<StudyResult>{
 if(!UUID.test(versionId)||!UUID.test(eventId)||!['A','B','C','D'].includes(optionId))throw new Error('Resposta inválida.');
 const {supabase}=await requireUser('/aluno/questoes');
 const {data,error}=await supabase.rpc('submit_question',{p_version_id:versionId,p_option:optionId,p_event_id:eventId});
 if(error||!data)throw questionError(error?.code);
 return data as StudyResult;
}
export async function getPublishedQuestions(filters:{area?:string;topic?:string;difficulty?:string;page:number}):Promise<QuestionPage>{
 const range=pageRange(filters.page);
 if(filters.area&&!['clinica','cirurgia','pediatria','go','mfc_sc'].includes(filters.area))throw new Error('Área inválida.');
 if(filters.difficulty&&!['easy','medium','hard'].includes(filters.difficulty))throw new Error('Dificuldade inválida.');
 if(filters.topic&&filters.topic.length>200)throw new Error('Tema inválido.');
 const {supabase}=await requireUser('/aluno/questoes');
 let query=supabase.from('question_versions').select(QUESTION_SELECT,{count:'exact'}).eq('status','published').lte('published_at',new Date().toISOString()).is('annulled_at',null);
 if(filters.area)query=query.eq('area',filters.area);
 if(filters.topic)query=query.eq('topic',filters.topic);
 if(filters.difficulty)query=query.eq('estimated_difficulty',filters.difficulty);
 const {data,count,error}=await query.order('question_id').order('version').range(...range);
 if(error)throw questionError(error.code);
 return {items:(data??[]).map(row=>mapQuestion(row)),total:count??0};
}
export async function getPublishedQuestion(versionId:string):Promise<PublicQuestion|null>{
 if(!UUID.test(versionId))return null;
 const {supabase}=await requireUser('/aluno/questoes');
 const {data,error}=await supabase.from('question_versions').select(QUESTION_SELECT).eq('id',versionId).eq('status','published').lte('published_at',new Date().toISOString()).is('annulled_at',null).maybeSingle();
 if(error)throw questionError(error.code);
 return data?mapQuestion(data):null;
}
