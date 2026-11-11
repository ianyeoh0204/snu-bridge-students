import test from 'node:test';
import assert from 'node:assert/strict';
import {renderProject} from '../scripts/render-project.mjs';
const hash='9a869763a0623a09aef522a934b452440a267ac7eb5251264125523fa00a5e5a';
function fixture(){return {
 notices:[{id:'58022',source_hash:hash,source_url:'https://ece.snu.ac.kr/community/academics?bbsidx=58022&md=v',original:[
  {t:'p',text:'대학원 논문연구(430.960) 수강신청한 모든 대학원생 제출 필수'},
  {t:'p',text:'2026. 9. 3.(목) ~ 2026. 9. 17.(목)'},
  {t:'p',text:'아래 1번. 2번. 모두 하셔야 신청 완료됩니다.'}
 ]}],briefs:[{notice_id:'58022',source_hash:hash,source_changed:false}],coverage:{complete:true,corpus_current:true,year:2026,cases:[{}],english_count:22},status:{checked_at:'2026-11-11T01:56:37Z',status:'succeeded'}
}}
test('the walkthrough retains its historical and unreviewed labels, and excludes stale briefs from the current total',()=>{
 const data=fixture();data.briefs.push({notice_id:'other',source_hash:'old'});
 const html=renderProject(data);
 assert.match(html,/Historical example · Fall 2026/);
 assert.match(html,/AI explanation · not independently reviewed/);
 assert.match(html,/This September 2026 submission window has passed/);
 assert.match(html,/<strong>1<\/strong> source-current English AI drafts/);
 assert.match(html,/Independent Korean-reader review and student-trial results remain pending/);
});
test('a changed source or stale brief removes the illustrated instructions; changed audit evidence stays uncertain',()=>{
 for(const change of [data=>data.notices[0].source_hash='changed',data=>data.briefs[0].source_changed=true,data=>data.notices[0].original=[]]){
  const data=fixture();change(data);data.coverage.corpus_current=false;
  const html=renderProject(data);assert.match(html,/previously illustrated dates and instructions are withheld/);
  assert.doesNotMatch(html,/class="story"|3–17 Sep 2026|results in a U grade/);
  assert.match(html,/comparison needs rechecking/);
 }
});
