import { generationParts, bazeRequest, MODEL } from './baze.mjs';
import { digest } from './collector.mjs';
export function prepareGeneration({notices,briefs,queue,ledger,policy,runID,keyAvailable,now=Date.now()}) {
 if(!ledger||ledger.budget_id!==policy.budget_id||ledger.cap_micros!==policy.cap_micros||ledger.expires_at!==policy.expires_at)throw Error('BUDGET_RECORD_MISSING_OR_CHANGED');
 const pending=notices.filter(n=>!briefs.some(b=>b.notice_id===n.id&&b.source_hash===n.source_hash&&!b.source_changed));
 const base={schema_version:1,budget_id:policy.budget_id,run_id:runID,created_at:new Date(now).toISOString(),tasks:[],pending:pending.length};
 if(!policy.enabled)return {...base,status:'disabled'};
 if(policy.model!==MODEL||policy.cap_micros>10000000||!Number.isSafeInteger(policy.cap_micros)||policy.cap_micros<1)throw Error('UNAPPROVED_MODEL_OR_CAP');
 const start=Date.parse(policy.starts_at),end=Date.parse(policy.expires_at);
 if(!Number.isFinite(start)||!Number.isFinite(end)||end-start>30*864e5||end<=start||!Number.isInteger(policy.notices_per_run)||policy.notices_per_run<1||policy.notices_per_run>5||!Number.isInteger(policy.max_requests_per_run)||policy.max_requests_per_run<3||policy.max_requests_per_run>6||!Number.isSafeInteger(policy.per_run_cap_micros)||policy.per_run_cap_micros<1||policy.per_run_cap_micros>1500000)throw Error('INVALID_APPROVAL_WINDOW_OR_RUN_LIMIT');
 if(now<Date.parse(policy.starts_at)||now>=Date.parse(policy.expires_at))return {...base,status:'budget_expired_or_not_started'};
 if(!keyAvailable)return {...base,status:'needs_configuration'};
 if(ledger.runs.some(r=>r.run_id===runID))return {...base,status:'already_reserved'};
 const attempts=new Set(ledger.runs.flatMap(r=>r.tasks.map(t=>t.notice_id+':'+t.source_hash)));
 // An interrupted cloud run may have reserved a source version without saving a result.
 // Keep its cost reserved and expose the missing result for an operator to inspect.
 for(const n of pending){
  if(attempts.has(n.id+':'+n.source_hash)&&!queue.some(q=>q.notice_id===n.id&&q.source_hash===n.source_hash&&q.status!=='complete')){
   queue.push({notice_id:n.id,source_hash:n.source_hash,status:'needs_review',error:'PRIOR_RESERVED_VERSION_NOT_COMPLETED',at:base.created_at,retry:'Inspect the earlier cloud run before authorizing a new attempt. Its reservation remains retained.'});
  }
 }
 const failures=new Set(queue.filter(q=>q.status!=='complete').map(q=>q.notice_id+':'+q.source_hash));
 let reserved=accountedMicros(ledger);
 if(!Number.isSafeInteger(reserved)||reserved<0||reserved>policy.cap_micros)throw Error('INVALID_SPENDING_RECORD');
 // Previously published guidance must be refreshed even when the original post
 // predates the initial backfill window. Changed guidance comes before new drafts.
 const changed=new Set(pending.filter(n=>briefs.some(b=>b.notice_id===n.id&&(b.source_hash!==n.source_hash||b.source_changed))).map(n=>n.id));
 const selected=pending.filter(n=>!attempts.has(n.id+':'+n.source_hash)&&!failures.has(n.id+':'+n.source_hash))
  .filter(n=>changed.has(n.id)||String(n.posting_date||'').replaceAll('.','-')>=policy.initial_since||policy.priority_ids.includes(n.id))
  .sort((a,b)=>Number(changed.has(b.id))-Number(changed.has(a.id))||Number(policy.priority_ids.includes(b.id))-Number(policy.priority_ids.includes(a.id))||String(b.posting_date).localeCompare(String(a.posting_date))||String(a.id).localeCompare(String(b.id)));
 base.eligible_pending=selected.length;
 let requests=0,reservedInBatch=0;
 for(const n of selected){
  if(base.tasks.length>=policy.notices_per_run)break;
  let parts;
  try{parts=generationParts(n).map(part=>({part,...bazeRequest(n,part,policy)}));}catch(e){
   queue.push({notice_id:n.id,source_hash:n.source_hash,status:'needs_review',error:e.message,at:base.created_at,retry:'No paid request was made. Review the input before retrying.'});
   continue;
  }
  const reserve=parts.reduce((s,p)=>s+p.reserve_micros,0);
  // Reserve a whole notice atomically: partial audience extraction is never published.
  // Six four-minute request timeouts fit inside the 35-minute cloud job with collection/build time.
  if(requests+parts.length>policy.max_requests_per_run||reservedInBatch+reserve>policy.per_run_cap_micros||reserved+reserve>policy.cap_micros)continue;
  base.tasks.push({notice_id:n.id,source_hash:n.source_hash,parts:parts.map(p=>({part:p.part,fingerprint:p.fingerprint,reserve_micros:p.reserve_micros})),reserved_micros:reserve});reserved+=reserve;
  requests+=parts.length;reservedInBatch+=reserve;
 }
 const reservedThisRun=base.tasks.reduce((s,t)=>s+t.reserved_micros,0);
 const plan={...base,requests,status:base.tasks.length?'reserved':selected.some(n=>!queue.some(q=>q.notice_id===n.id&&q.source_hash===n.source_hash&&q.status!=='complete'))?'budget_limited':queue.some(q=>q.status!=='complete')?'review_required':'nothing_eligible',reserved_micros:reservedThisRun,remaining_micros:policy.cap_micros-reserved};
 if(base.tasks.length)ledger.runs.push({run_id:runID,created_at:base.created_at,reserved_micros:reservedThisRun,tasks:structuredClone(base.tasks),status:'reserved'});
 plan.plan_hash=digest(plan);return plan;
}
export function activeCloudRun(env=process.env) {
 if(env.GITHUB_REPOSITORY!=='ianyeoh0204/snu-bridge-students'||env.GITHUB_REF!=='refs/heads/main'||!['schedule','workflow_dispatch'].includes(env.GITHUB_EVENT_NAME)||env.GITHUB_RUN_ATTEMPT!=='1')throw Error('Paid generation is restricted to a first-attempt main-branch daily/manual cloud run.');
 return String(env.GITHUB_RUN_ID);
}

// A confirmed completed response can release its unused upper bound. Unknown or
// failed requests keep their entire reservation; cancellation never resets the budget.
export function accountedMicros(ledger){
 return ledger.runs.reduce((sum,run)=>sum+run.tasks.reduce((s,task)=>s+task.parts.reduce((p,part)=>{
  const attempts=(run.attempts||[]).filter(a=>a.notice_id===task.notice_id&&a.part===part.part.key);
  const a=attempts.length===1?attempts[0]:null;
  const used=a?.usage?.estimated_micros;
  return p+(a?.status==='returned'&&Number.isSafeInteger(used)&&used>=0&&used<=part.reserve_micros?used:part.reserve_micros);
 },0),0),0);
}
