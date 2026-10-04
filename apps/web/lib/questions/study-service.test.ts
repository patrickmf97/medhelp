import {beforeEach,expect,it,vi} from 'vitest';
import {requireUser} from '@/lib/auth/require-role';
import {getPublishedQuestions,submitStudyAnswer} from './study-service';
vi.mock('server-only',()=>({}));
vi.mock('@/lib/auth/require-role',()=>({requireUser:vi.fn()}));
const versionId='30000000-0000-0000-0000-000000000001';
const eventId='40000000-0000-0000-0000-000000000001';
beforeEach(()=>vi.clearAllMocks());
it('rejects invalid options and identifiers before connecting',async()=>{
 await expect(submitStudyAnswer(versionId,'E' as never,eventId)).rejects.toThrow('Resposta inválida');
 await expect(submitStudyAnswer('bad','A',eventId)).rejects.toThrow('Resposta inválida');
 expect(requireUser).not.toHaveBeenCalled();
});
it('passes only version, option and stable event to server correction',async()=>{
 const result={attemptId:'attempt',answer:'A',outcome:'correct'};
 const rpc=vi.fn(async()=>({data:result,error:null}));
 vi.mocked(requireUser).mockResolvedValue({supabase:{rpc}} as never);
 expect(await submitStudyAnswer(versionId,'A',eventId)).toEqual(result);
 expect(rpc).toHaveBeenCalledWith('submit_question',{p_version_id:versionId,p_option:'A',p_event_id:eventId});
});
it('maps access expiry to an explicit failure without returning a result',async()=>{
 vi.mocked(requireUser).mockResolvedValue({supabase:{rpc:async()=>({data:null,error:{code:'42501'}})}} as never);
 await expect(submitStudyAnswer(versionId,'A',eventId)).rejects.toThrow('Premium');
});
it('paginates beyond the first thousand without selecting private fields',async()=>{
 const range=vi.fn(async()=>({data:[],count:5000,error:null}));
 const query={select:vi.fn((columns:string)=>{expect(columns).not.toMatch(/answer|rationale|question_keys/);return query;}),eq:()=>query,lte:()=>query,is:()=>query,order:()=>query,range};
 const from=vi.fn(()=>query);
 vi.mocked(requireUser).mockResolvedValue({supabase:{from}} as never);
 expect(await getPublishedQuestions({page:51,area:'clinica'})).toEqual({items:[],total:5000});
 expect(range).toHaveBeenCalledWith(1000,1019);
 expect(from).toHaveBeenCalledWith('question_versions');
 expect(query.select.mock.calls[0]?.[0]).not.toMatch(/answer|rationale|question_keys/);
});
