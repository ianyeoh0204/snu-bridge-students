import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {activeCloudRun,accountedMicros} from '../lib/pipeline/queue.mjs';
import {digest} from '../lib/pipeline/collector.mjs';
import {bazeRequest,requestBaze,combineBazeParts,MODEL} from '../lib/pipeline/baze.mjs';
const read=p=>JSON.parse(fs.readFileSync(p));
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const plan=read('data/generation-plan.json'),policy=read('data/generation-policy.json'),ledger=read('data/generation-ledger.json');
const notices=read('data/notices.json');let briefs=read('data/briefs.json'),actions=read('data/actions.json'),queue=read('data/generation-queue.json');
const run=ledger.runs.find(r=>r.run_id===plan.run_id);
let completed=0;
const failures=[];
let stopReason=null;
function save(status) {
 write('data/briefs.json',briefs);write('data/actions.json',actions);write('data/generation-queue.json',queue);write('data/generation-ledger.json',ledger);
 write('data/automation-status.json',{collector:process.env.GITHUB_ACTIONS?'cloud_run':'local_run',translator:status,model:policy.model,pending_briefs:notices.filter(n=>!briefs.some(b=>b.notice_id===n.id&&b.source_hash===n.source_hash&&!b.source_changed)).length,last_attempt_at:new Date().toISOString(),generated:completed,failures,review_queue:queue.filter(q=>q.status!=='complete').length,budget:{cap_usd:policy.cap_micros/1e6,reserved_upper_bounds_usd:ledger.runs.reduce((s,r)=>s+r.reserved_micros,0)/1e6,accounted_usd:accountedMicros(ledger)/1e6,expires_at:policy.expires_at,note:'Confirmed usage releases unused bounds; failures and unknown results retain reservations. US-dollar token costs are separate from gateway credit conversion/taxes. No automatic renewal.'},note:'AI drafts. Quote and date checks are not independent semantic review. A rejected notice does not block unrelated notices.'});
}
if(plan.status!=='reserved'){save(plan.status);console.log('No paid request: '+plan.status);process.exit(0);}
const runID=activeCloudRun();
if(plan.run_id!==runID||run?.status!=='reserved'||!policy.enabled||Date.now()>=Date.parse(policy.expires_at)||!process.env.BAZE_API)throw Error('NO_ACTIVE_RESERVED_RUN');
if(digest(plan.tasks)!==digest(run.tasks)||accountedMicros(ledger)>policy.cap_micros)throw Error('RESERVATION_MISMATCH');
// Budget must have reached the repository before any request, so cancellation cannot erase the charge reservation.
execFileSync('git',['diff','--exit-code','HEAD','--','data/generation-ledger.json','data/generation-plan.json'],{stdio:'pipe'});
run.status='started';save('running');
fs.mkdirSync('generation-runs',{recursive:true});
for(const task of plan.tasks){
 const notice=notices.find(n=>n.id===task.notice_id&&n.source_hash===task.source_hash);
 if(!notice){
  const issue={notice_id:task.notice_id,source_hash:task.source_hash,status:'needs_review',error:'SOURCE_VERSION_CHANGED',at:new Date().toISOString()};
  queue.push(issue);failures.push(issue);save('running');continue;
 }
 const results=[];
 try{
  for(const expected of task.parts){
   if(Date.now()>=Date.parse(policy.expires_at))throw Error('BUDGET_EXPIRED');
   const request=bazeRequest(notice,expected.part,policy);
   if(request.fingerprint!==expected.fingerprint)throw Error('PLAN_CHANGED');
   const attempt={notice_id:notice.id,part:expected.part.key,status:'started',reserved_micros:expected.reserve_micros};
   run.attempts??=[];run.attempts.push(attempt);save('running');
   try {
    const result=await requestBaze(request,process.env.BAZE_API);
    Object.assign(attempt,{status:'returned',usage:result.usage});
    results.push({...result,part:expected.part});
    write(`generation-runs/${notice.id}-${expected.part.key}.json`,{...result,part:expected.part,source_hash:notice.source_hash,human_reviewed:false});
   } catch(e){
    Object.assign(attempt,{status:'failed',error:e.message,usage:e.usage||null});
    if(e.partial)write(`generation-runs/${notice.id}-${expected.part.key}-partial.json`,{partial:e.partial,usage:e.usage||null,source_hash:notice.source_hash,published:false});
    throw e;
   } finally{save('running');}
  }
  const output=combineBazeParts(notice,results);
  briefs=briefs.filter(b=>b.notice_id!==notice.id).concat(output.brief);
  actions=actions.filter(a=>a.notice_id!==notice.id).concat(output.actions);
  queue=queue.filter(q=>q.notice_id!==notice.id).concat({notice_id:notice.id,source_hash:notice.source_hash,status:'complete',at:new Date().toISOString()});completed++;
  console.log('Saved English draft for notice '+notice.id);
 }catch(e){
  const issue={notice_id:notice.id,source_hash:notice.source_hash,status:'needs_review',error:e.message,at:new Date().toISOString(),retry:'No automatic repeat for this source version.'};
  queue=queue.filter(q=>q.notice_id!==notice.id).concat(issue);failures.push(issue);
  console.log('Notice '+notice.id+' retained for review. Continuing other notices.');
  if(/PROVIDER_HTTP_(401|403|429)|BUDGET_EXPIRED|USAGE_EXCEEDED_RESERVED_BOUND/.test(e.message)){stopReason='provider_needs_attention';save(stopReason);break;}
 }
 save('running');
}
for(const task of plan.tasks){
 if(!queue.some(q=>q.notice_id===task.notice_id&&q.source_hash===task.source_hash)){
  queue.push({notice_id:task.notice_id,source_hash:task.source_hash,status:'needs_review',error:'RESERVED_TASK_NOT_ATTEMPTED',at:new Date().toISOString(),retry:'No automatic retry; inspect the stopped run. Reservation retained.'});
 }
}
run.status=stopReason?'stopped':failures.length?'complete_with_review_items':'complete';run.completed_at=new Date().toISOString();
save(stopReason||(failures.length?'enabled_with_review_items':'enabled'));
