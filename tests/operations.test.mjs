import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {revisedRecord} from '../lib/pipeline/collector.mjs';
import {validateDraft} from '../lib/pipeline/generation.mjs';
import {classify,calendarFile} from '../lib/bridge/student.mjs';
import {prepareGeneration,activeCloudRun,accountedMicros} from '../lib/pipeline/queue.mjs';
import {generationParts,opusRequest,requestOpus} from '../lib/pipeline/anthropic.mjs';
import {englishRows,verifiedAudit,auditFingerprint} from '../lib/pipeline/english-audit.mjs';
import {renderEvidence} from '../scripts/render-evidence.mjs';
const source={title:'[대학원] 논문 심사 일정',source_url:'https://ece.snu.ac.kr/community/academics?md=v&bbsidx=1',blocks:[{kind:'text',text:'석사, 박사 대상. 2026.11.20. 15:00 시작. 제출 2026.11.21. 17:00까지.'}],attachments:[],images:[],links:[],reading_status:{html:'read'}};
const n={...revisedRecord(null,source),posting_date:'2026.11.10'};
const raw={title:'Thesis procedure',degrees:['masters'],period:'Fall 2026',topic:'Thesis',summary:'Check the thesis steps.',steps:['Submit.'],notes:['Check the original.'],evidence_quote:'석사, 박사 대상.',actions:[{title:'Attend',kind:'event',degrees:['masters'],start:'2026-11-20T15:00:00+09:00',end:null,date_label:'20 November, 15:00; end not stated',date_quote:'2026.11.20. 15:00 시작.',evidence_quote:'석사, 박사 대상.',precision:'minute',conditions_note:'For covered master’s students.',steps:['Attend.']}]};
test('point events preserve an unknown end instead of inventing a duration',()=>{const a=validateDraft(raw,n).actions[0];assert.equal(classify(a,Date.parse('2026-11-19T00:00Z')),'event');assert.equal(classify(a,Date.parse('2026-11-21T00:00Z')),'past');const ics=calendarFile(a);assert.match(ics,/DTSTART:20261120T060000Z/);assert.doesNotMatch(ics,/DTEND:/);});
test('mixed precision stays explicit and uses a labelled date-only calendar interval',()=>{const v=structuredClone(raw);Object.assign(v.actions[0],{start:'2026-11-20',end:'2026-11-21T17:00:00+09:00',date_quote:'2026.11.20. 15:00 시작. 제출 2026.11.21. 17:00까지.'});const a=validateDraft(v,n).actions[0];assert.equal(a.start_precision,'day');assert.equal(a.end_precision,'minute');assert.match(calendarFile(a),/mixed precision/);});
function state(){const policy={budget_id:'test',model:'gpt-6.1-sol',provider:'baze',input_usd_per_million:2,output_usd_per_million:10,max_output_tokens:16000,enabled:true,cap_micros:10000000,starts_at:'2026-11-10T00:00Z',expires_at:'2026-12-10T00:00Z',initial_since:'2026-09-01',priority_ids:[],notices_per_run:5,max_requests_per_run:6,per_run_cap_micros:1500000};return {notices:[n],briefs:[],queue:[],policy,ledger:{budget_id:'test',cap_micros:policy.cap_micros,expires_at:policy.expires_at,runs:[]},runID:'1',keyAvailable:true,now:Date.parse('2026-11-11T00:00Z')};}
test('missing key, expired approval and exhausted budget produce no paid plan',()=>{let s=state();s.keyAvailable=false;assert.equal(prepareGeneration(s).status,'needs_configuration');assert.equal(s.ledger.runs.length,0);s=state();s.now=Date.parse('2026-12-11T00:00Z');assert.equal(prepareGeneration(s).status,'budget_expired_or_not_started');s=state();s.policy.cap_micros=1;s.ledger.cap_micros=1;assert.equal(prepareGeneration(s).tasks.length,0);});
test('reserve all long-notice parts before calls and prevent duplicate attempts',()=>{const s=state();const p=prepareGeneration(s);assert.equal(p.tasks[0].parts.length,2);assert.equal(s.ledger.runs[0].reserved_micros,p.reserved_micros);assert.equal(prepareGeneration(s).status,'already_reserved');s.runID='2';assert.equal(prepareGeneration(s).tasks.length,0);});
test('failed versions wait for review; changed versions can be queued',()=>{const s=state();s.queue=[{notice_id:n.id,source_hash:n.source_hash,status:'needs_review'}];assert.equal(prepareGeneration(s).tasks.length,0);s.notices=[{...n,source_hash:'new-version'}];assert.equal(prepareGeneration(s).tasks.length,1);});
test('an unresolved notice does not suppress an unrelated eligible notice',()=>{const s=state();s.notices.push({...n,id:'2'});s.queue=[{notice_id:n.id,source_hash:n.source_hash,status:'needs_review'}];assert.deepEqual(prepareGeneration(s).tasks.map(t=>t.notice_id),['2']);});
test('reuse a current English brief without another request',()=>{const s=state();s.briefs=[{notice_id:n.id,source_hash:n.source_hash,source_changed:false}];assert.equal(prepareGeneration(s).tasks.length,0);});
test('paid execution rejects reruns and other branches',()=>{const env={GITHUB_REPOSITORY:'ianyeoh0204/snu-bridge-students',GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'schedule',GITHUB_RUN_ATTEMPT:'1',GITHUB_RUN_ID:'9'};assert.equal(activeCloudRun(env),'9');assert.throws(()=>activeCloudRun({...env,GITHUB_RUN_ATTEMPT:'2'}));assert.throws(()=>activeCloudRun({...env,GITHUB_REF:'refs/heads/test'}));});
test('each long-notice part gets the full source and uses Opus',()=>{const parts=generationParts(n);assert.equal(parts.length,2);const r=opusRequest(n,parts[1]);assert.equal(r.body.model,'claude-opus-5-5');assert.match(r.body.messages[0].content,/2026.11.21/);assert.match(r.body.system,/FULL source/);assert.ok(r.reserve_micros>130000);});
test('incomplete provider output retains usage and cannot be published',async()=>{const r=opusRequest(n,generationParts(n)[0]);await assert.rejects(requestOpus(r,'test-only',async()=>new Response(JSON.stringify({stop_reason:'max_tokens',usage:{input_tokens:100,output_tokens:6500},content:[{type:'text',text:'unfinished'}]}))),e=>e.message==='INCOMPLETE_RESPONSE'&&e.usage.output_tokens===6500&&e.partial==='unfinished');});
test('English list dates are read independently of notice identifiers',()=>{const rows=englishRows('<table><tr><td><a href="?md=v&bbsidx=99">A different procedure</a></td><td>Nov 9, 2026</td></tr></table>','https://ece.snu.ac.kr/en/community/notice');assert.equal(rows[0].posted,'2026-11-09');assert.equal(rows[0].title,'A different procedure');});
test('changed English content invalidates absence judgments',()=>{const audit={status:'complete_within_stated_scope',checked_at:'2026-11-10T00:00Z',year:2026,english_count:1,english_pages:[],failures:[],english:[{source_url:'https://ece.snu.ac.kr/en/community/notice?md=v&bbsidx=2',posted:'2026-11-10',source_hash:'a',text:'new',attachments:[],images:[]}],korean:[{case_key:'case',source_hash:'k',images:[],attachments:[]}]};audit.corpus_hash=auditFingerprint(audit.english);const review={corpus_hash:audit.corpus_hash,language:[],positive_examples:[],cases:[{key:'case',source_hash:'k',status:'no_procedure_match_in_checked_html'}]};assert.equal(verifiedAudit(audit,review).cases[0].assessment_current,true);audit.corpus_hash='changed';assert.equal(verifiedAudit(audit,review).cases[0].status,'needs_recheck');audit.status='incomplete';assert.equal(verifiedAudit(audit,review).corpus_current,false);});
test('public audit retains counterexamples and avoids false delay or percentage claims',()=>{const d=JSON.parse(fs.readFileSync('data/english-coverage.json'));assert.equal(d.cases.length,14);if(d.corpus_current)assert.ok(d.positive_examples.length>=3);else assert.ok(d.cases.every(c=>!c.assessment_current));assert.ok(d.cases.every(c=>c.translation_delay_days===null));assert.ok(d.cases.some(c=>c.english_labelled_files.length));assert.match(renderEvidence(d),/do not measure how late/);assert.match(renderEvidence(d),/Not a random sample/);assert.doesNotMatch(JSON.stringify(d),/"text":/);});

// Distinct boundary cases: an interrupted run, a rejected input, and a reader subscription.
import {updateItems,atomFeed} from '../scripts/export-updates.mjs';
test('interrupted reservations surface a review item without spending twice',()=>{const s=state();prepareGeneration(s);s.runID='next';const p=prepareGeneration(s);assert.equal(p.tasks.length,0);assert.equal(s.queue[0].error,'PRIOR_RESERVED_VERSION_NOT_COMPLETED');assert.equal(s.ledger.runs.length,1);});
test('an oversized source is visible in the queue without a reservation',()=>{const s=state();s.notices=[{...n,original:[{t:'p',text:'가'.repeat(80000)}]}];const p=prepareGeneration(s);assert.equal(p.status,'review_required');assert.equal(p.tasks.length,0);assert.equal(s.ledger.runs.length,0);assert.equal(s.queue[0].error,'INPUT_TOO_LARGE');});
test('degree feeds exclude other degrees and replace stale advice with a change alert',()=>{const data={notices:[{...n,source_hash:'changed',source_checked_at:'2026-11-10T00:00:00Z',posting_date:'2026.11.09'}],briefs:[{notice_id:n.id,source_hash:n.source_hash,degrees:['masters'],title:'A & B',summary:'Do the old action.',generated_at:'2026-11-09T00:00:00Z'}]};const items=updateItems(data);assert.equal(items.length,1);assert.doesNotMatch(items[0].summary,/Do the old action/);assert.match(items[0].summary,/changed/);assert.doesNotMatch(atomFeed(items,'undergraduate'),/<entry>/);assert.match(atomFeed(items,'masters'),/A &amp; B/);assert.match(atomFeed(items,'masters'),/Original posted: 2026.11.09/);});

import {bazeRequest,requestBaze,verifyGateway} from '../lib/pipeline/baze.mjs';
test('the SNU request uses GPT Responses, strict output, no storage or tools',()=>{const r=bazeRequest(n,generationParts(n)[0],state().policy);assert.equal(r.body.model,'gpt-6.1-sol');assert.equal(r.body.store,false);assert.deepEqual(r.body.tools,[]);assert.equal(r.body.text.format.strict,true);assert.equal(r.body.max_output_tokens,16000);});
test('a changed gateway price prevents paid planning',async()=>{await assert.rejects(verifyGateway('test-only',async()=>new Response(JSON.stringify({data:[{id:'gpt-6.1-sol',owned_by:'openai',pricing:{currency:'USD',per_tokens:1000000,input:2,output:11}}]}))),/GATEWAY_PRICING_CHANGED/);});
test('an incomplete GPT response is withheld while retaining known usage',async()=>{const r=bazeRequest(n,generationParts(n)[0],state().policy);await assert.rejects(requestBaze(r,'test-only',async()=>new Response(JSON.stringify({status:'incomplete',output:[],usage:{input_tokens:100,output_tokens:16000}}))),e=>e.message==='INCOMPLETE_RESPONSE'&&e.usage.estimated_micros===160200);});
test('only a confirmed returned request releases unused budget; failed requests retain it',()=>{const s=state();const p=prepareGeneration(s),run=s.ledger.runs[0],part=p.tasks[0].parts[0];run.attempts=[{notice_id:n.id,part:part.part.key,status:'returned',usage:{estimated_micros:1234}}];assert.equal(accountedMicros(s.ledger),p.reserved_micros-part.reserve_micros+1234);run.attempts[0].status='failed';assert.equal(accountedMicros(s.ledger),p.reserved_micros);});

// Production regression: 58160 placed presentation dates in unprocessed PDFs.
test('an event with no readable date is withheld; schedule-check information stays undated',()=>{
 const v=structuredClone(raw);Object.assign(v.actions[0],{start:null,end:null,precision:'unknown',date_quote:'',date_label:'Exact presentation dates are in an unread attachment.'});
 assert.throws(()=>validateDraft(v,n),/missing its date/);
 v.actions[0].kind='information';const a=validateDraft(v,n).actions[0];
 assert.equal(a.start,null);assert.equal(a.end,null);assert.equal(classify(a),'check');
 assert.throws(()=>calendarFile(a),/date|calendar/i);
});

// Batch regressions exercise the actual planner without a key or network requests.
const shortNotice=id=>({...n,id,source_hash:'source-'+id,korean_title:'[학부] 안내'});
test('a backlog produces five complete notices, not one, with no duplicate versions on the next run',()=>{
 const s=state();s.notices=Array.from({length:8},(_,i)=>shortNotice(String(i+1)));
 const first=prepareGeneration(s);assert.equal(first.tasks.length,5);assert.equal(first.requests,5);
 assert.equal(first.eligible_pending,8);assert.ok(first.reserved_micros<=s.policy.per_run_cap_micros);
 s.runID='second';const second=prepareGeneration(s);assert.equal(second.tasks.length,3);
 assert.ok(second.tasks.every(t=>!first.tasks.some(old=>old.notice_id===t.notice_id)));
 assert.ok(accountedMicros(s.ledger)<=s.policy.cap_micros);
});
test('changed published guidance bypasses the backfill date and is prioritized over new notices',()=>{
 const s=state();s.policy.notices_per_run=1;
 s.notices=[shortNotice('new'),{...shortNotice('changed'),posting_date:'2021.12.20'},{...shortNotice('old-unpublished'),posting_date:'2021.12.20'}];
 s.briefs=[{notice_id:'changed',source_hash:'previous-version',source_changed:true}];
 const p=prepareGeneration(s);assert.equal(p.eligible_pending,2);assert.deepEqual(p.tasks.map(t=>t.notice_id),['changed']);
});
test('long notices are reserved whole and bounded by the total request count',()=>{
 const s=state();s.notices=Array.from({length:5},(_,i)=>({...n,id:String(i+1),source_hash:'long-'+i}));
 const p=prepareGeneration(s);assert.equal(p.tasks.length,3);assert.equal(p.requests,6);
 assert.ok(p.tasks.every(t=>t.parts.length===2));assert.ok(p.reserved_micros<=s.policy.per_run_cap_micros);
});
test('a batch stops at the stricter run or remaining total budget without partial notices',()=>{
 let s=state();s.notices=Array.from({length:8},(_,i)=>shortNotice(String(i+1)));
 const one=bazeRequest(s.notices[0],generationParts(s.notices[0])[0],s.policy).reserve_micros;
 s.policy.per_run_cap_micros=one*2;let p=prepareGeneration(s);assert.equal(p.tasks.length,2);assert.equal(p.reserved_micros,one*2);
 s=state();s.notices=Array.from({length:8},(_,i)=>shortNotice(String(i+1)));
 s.policy.cap_micros=one*2;s.ledger.cap_micros=one*2;p=prepareGeneration(s);
 assert.equal(p.tasks.length,2);assert.equal(accountedMicros(s.ledger),one*2);assert.equal(p.remaining_micros,0);
});
test('unsafe batch limits fail before any budget reservation',()=>{
 for(const patch of [{notices_per_run:6},{max_requests_per_run:7},{max_requests_per_run:2},{per_run_cap_micros:1500001}]){
  const s=state();Object.assign(s.policy,patch);assert.throws(()=>prepareGeneration(s),/RUN_LIMIT/);assert.equal(s.ledger.runs.length,0);
 }
});
