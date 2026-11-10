import { SYSTEM_PROMPT, validateDraft } from './generation.mjs';
import { noticeText } from '../bridge/student.mjs';
import { digest } from './collector.mjs';
export const MODEL='claude-opus-5-5';
export const ENDPOINT='https://api.anthropic.com/v1/messages';
const text={type:'string'},list=items=>({type:'array',items});
const object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const degree=list({type:'string',enum:['undergraduate','masters','phd','integrated']});
const nullable={type:['string','null']};
export const schema=object({title:text,degrees:degree,period:text,topic:text,summary:text,steps:list(text),notes:list(text),evidence_quote:text,actions:list(object({title:text,kind:{type:'string',enum:['deadline','event','information','unknown_deadline']},degrees:degree,start:nullable,end:nullable,date_label:text,date_quote:text,evidence_quote:text,precision:{type:'string',enum:['day','minute','unknown']},conditions_note:text,steps:list(text)}))});
export function generationParts(notice) {
 const body=noticeText(notice), long=body.length>4500||/논문\s*심사.*일정/u.test(notice.korean_title);
 if(!long)return [{key:'all',degrees:['undergraduate','masters','phd','integrated']}];
 if(/대학원/u.test(notice.korean_title)&&!/학부&/u.test(notice.korean_title))return [{key:'masters',degrees:['masters']},{key:'doctoral',degrees:['phd','integrated']}];
 return [{key:'undergraduate',degrees:['undergraduate']},{key:'masters',degrees:['masters']},{key:'doctoral',degrees:['phd','integrated']}];
}
export function opusRequest(notice,part) {
 const focus=part.key==='all'?'All relevant audiences in this notice.':`This is one part of a complete extraction. Return only actions relevant or conditionally relevant to ${part.degrees.join(', ')}. Read the FULL source below so common conditions and exceptions are retained. Do not extract other degrees' actions. For integrated students distinguish the doctoral stage and uncertain applicability explicitly. Do not claim an exemption just because a degree label is absent.`;
 const body={model:MODEL,max_tokens:6500,service_tier:'standard_only',thinking:{type:'adaptive'},output_config:{effort:'high',format:{type:'json_schema',schema}},system:SYSTEM_PROMPT+'\n'+focus,messages:[{role:'user',content:JSON.stringify({title:notice.korean_title,posted:notice.posting_date,url:notice.source_url,body:noticeText(notice),unread_files:(notice.attachments||[]).map(a=>a.name),unread_images:notice.images?.length||0})}]};
 const bytes=Buffer.byteLength(JSON.stringify(body));
 if(bytes>80000)throw Error('INPUT_TOO_LARGE');
 // Price verified 10 Nov 2026. Full UTF-8 byte count + framing deliberately over-reserves input tokens.
 const reserve_micros=(bytes+4096)*5+6500*20;
 return {body,fingerprint:digest(body),reserve_micros};
}
export function usageEstimate(payload) {
 const u=payload.usage||{};
 const counts=[u.input_tokens,u.output_tokens,u.cache_creation_input_tokens??0,u.cache_read_input_tokens??0];
 if(counts.some(n=>!Number.isSafeInteger(n)||n<0))return null;
 return {input_tokens:counts[0]+counts[2]+counts[3],output_tokens:counts[1],estimated_micros:(counts[0]+counts[2]+counts[3])*5+counts[1]*20};
}
export async function requestOpus(request,key,fetcher=fetch) {
 const r=await fetcher(ENDPOINT,{method:'POST',redirect:'error',signal:AbortSignal.timeout(120000),headers:{Authorization:'Bearer '+key,'anthropic-version':'2026-10-21','Content-Type':'application/json'},body:JSON.stringify(request.body)});
 if(!r.ok)throw Error('PROVIDER_HTTP_'+r.status);
 const text=await r.text();if(Buffer.byteLength(text)>1000000)throw Error('RESPONSE_TOO_LARGE');
 const payload=JSON.parse(text),usage=usageEstimate(payload);
 const output=(payload.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('');
 if(payload.stop_reason!=='end_turn'){const e=Error('INCOMPLETE_RESPONSE');e.usage=usage;e.partial=output;throw e;}
 let raw;try{raw=JSON.parse(output);}catch{const e=Error('INVALID_JSON');e.usage=usage;throw e;}
 return {raw,usage,returned_model:payload.model};
}
export function combineParts(notice,results) {
 if(!results.length)throw Error('NO_PARTS');
 const validated=results.map(({raw,part})=>{
  const v=validateDraft(raw,notice);
  if(part.key!=='all'&&v.actions.some(a=>a.degrees.some(d=>!part.degrees.includes(d))))throw Error('PART_AUDIENCE_MISMATCH');
  return v;
 });
 const base=validated[0].brief, unique=a=>[...new Set(a)];
 const brief={...base,degrees:unique(validated.flatMap(v=>v.brief.degrees)),summary:validated.map((v,i)=>results.length===1?v.brief.summary:results[i].part.degrees.map(d=>({masters:'Master’s',phd:'PhD',integrated:'Integrated MS–PhD',undergraduate:'Undergraduate'}[d])).join(' / ')+': '+v.brief.summary).join('\n\n'),steps:unique(validated.flatMap(v=>v.brief.steps)),notes:unique(validated.flatMap(v=>v.brief.notes)),generation:{provider:'anthropic',model:MODEL,parts:results.map(r=>r.part.key),usage:results.map(r=>r.usage),method:'Full source supplied to each degree-specific part; automated checks only.'}};
 const actions=validated.flatMap((v,i)=>v.actions.map((a,j)=>({...a,id:notice.id+'-'+results[i].part.key+'-'+j})));
 return {brief,actions};
}
