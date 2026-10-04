import {describe,it,expect} from 'vitest';
import {scoreQuestion,summarizeAttempt} from './questions';
describe('question scoring',()=>{
 it('scores selection, missing selection and annulment',()=>{
  expect(scoreQuestion('A','A',false)).toBe('correct');
  expect(scoreQuestion('B','A',false)).toBe('incorrect');
  expect(scoreQuestion(null,'A',false)).toBe('unanswered');
  expect(scoreQuestion('A','A',true)).toBe('annulled');
 });
 it('excludes annulled questions and keeps unanswered in the denominator',()=>{
  expect(summarizeAttempt(['correct','incorrect','unanswered','annulled'])).toEqual({correct:1,incorrect:1,unanswered:1,annulled:1,validTotal:3,percentage:100/3});
 });
 it('does not manufacture a percentage without valid questions',()=>{
  expect(summarizeAttempt(['annulled']).percentage).toBeNull();
  expect(summarizeAttempt([]).percentage).toBeNull();
 });
});
