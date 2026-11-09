import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {matchGrade} from '../lib/research/rainLab';

const make=(exact:string,within5:string,within10:string,state='COMPLETE')=>({
 state,radar_result:{exact,within5,within10},
});
test('highest precision match wins',()=>{
 assert.equal(matchGrade(make('MATCH','MATCH','MATCH')),'exact');
 assert.equal(matchGrade(make('MISMATCH','MATCH','MATCH')),'within5');
 assert.equal(matchGrade(make('MISMATCH','MISMATCH','MATCH')),'within10');
});
test('red only when every window is definitively mismatched',()=>{
 assert.equal(matchGrade(make('MISMATCH','MISMATCH','MISMATCH')),'mismatch');
 assert.equal(matchGrade(make('MISMATCH','INDETERMINATE','MISMATCH')),'pending');
 assert.equal(matchGrade(make('INDETERMINATE','MISMATCH','MISMATCH')),'pending');
 assert.equal(matchGrade(make('MISMATCH','INDETERMINATE','MATCH')),'within10');
 assert.equal(matchGrade({state:'PENDING'}),'pending');
});
