import {SYSTEM_PROMPT} from './generation.mjs';
import {noticeText} from '../bridge/student.mjs';
import {digest} from './collector.mjs';
import {schema,generationParts,combineParts} from './anthropic.mjs';
export {generationParts};
export const BASE='https://api.baze.co/v1/gateway';
export const MODEL='gpt-6.1-sol';
export function bazeRequest(notice,part,policy){
 if(policy.provider!=='baze'||policy.model!==MODEL||policy.input_usd_per_million!==2||policy.output_usd_per_million!==10||policy.max_output_tokens!==16000)throw Error('UNVERIFIED_MODEL_OR_PRICE');
 const focus=part.key==='all'?'Cover every relevant audience.':`Extract only actions applicable or conditionally applicable to ${part.degrees.join(', ')}. The FULL original is supplied so common conditions survive. Keep integrated doctoral-stage applicability conditional where unclear. Do not treat an unstated degree label as an exemption.`;
 const body={model:MODEL,instructions:SYSTEM_PROMPT+'\n'+focus,input:[{role:'user',content:JSON.stringify({title:notice.korean_title,posted:notice.posting_date,url:notice.source_url,body:noticeText(notice),unread_files:(notice.attachments||[]).map(a=>a.name),unread_images:notice.images?.length||0})}],max_output_tokens:16000,reasoning:{effort:'high'},text:{format:{type:'json_schema',name:'snu_bridge_action_brief',strict:true,schema}},store:false,tools:[]};
 const bytes=Buffer.byteLength(JSON.stringify(body));if(bytes>80000)throw Error('INPUT_TOO_LARGE');
 const reserve_micros=(bytes+4096)*2+16000*10;
 return {body,fingerprint:digest(body),reserve_micros};
}
export async function verifyGateway(key,fetcher=fetch){
 const r=await fetcher(BASE+'/models/?type=llm',{redirect:'error',signal:AbortSignal.timeout(30000),headers:{Authorization:'Bearer '+key}});
 if(!r.ok)throw Error('GATEWAY_MODELS_HTTP_'+r.status);
 const p=await r.json(),m=p.data?.find(m=>m.id===MODEL),price=m?.pricing;
 if(!m||m.owned_by!=='openai')throw Error('APPROVED_MODEL_UNAVAILABLE');
 if(price?.currency!=='USD'||price?.per_tokens!==1000000||price.input>2||price.output>10||!(price.input>=0)||!(price.output>=0))throw Error('GATEWAY_PRICING_CHANGED');
 return {model:MODEL,provider:'baze',checked_at:new Date().toISOString(),pricing:price};
}
export async function requestBaze(request,key,fetcher=fetch){
 const r=await fetcher(BASE+'/responses/',{method:'POST',redirect:'error',signal:AbortSignal.timeout(240000),headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(request.body)});
 if(!r.ok)throw Error('PROVIDER_HTTP_'+r.status);
 const text=await r.text();if(Buffer.byteLength(text)>1500000)throw Error('RESPONSE_TOO_LARGE');
 const p=JSON.parse(text),u=p.usage||{};
 const valid=[u.input_tokens,u.output_tokens].every(x=>Number.isSafeInteger(x)&&x>=0);
 const usage=valid?{input_tokens:u.input_tokens,output_tokens:u.output_tokens,estimated_micros:u.input_tokens*2+u.output_tokens*10}:null;
 if(usage&&Number.isFinite(p.billing?.cost_usd))usage.estimated_micros=Math.max(usage.estimated_micros,Math.ceil(p.billing.cost_usd*1e6));
 const output=(p.output||[]).filter(x=>x.type==='message').flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('');
 if(p.status!=='completed'||p.error||(p.output||[]).some(x=>x.status==='incomplete')){const e=Error('INCOMPLETE_RESPONSE');e.usage=usage;e.partial=output;throw e;}
 if(usage&&usage.estimated_micros>request.reserve_micros){const e=Error('USAGE_EXCEEDED_RESERVED_BOUND');e.usage=usage;throw e;}
 let raw;try{raw=JSON.parse(output);}catch{const e=Error('INVALID_JSON');e.usage=usage;throw e;}
 return {raw,usage,returned_model:p.model};
}
export function combineBazeParts(notice,results){
 const output=combineParts(notice,results);
 output.brief.generation.provider='baze';output.brief.generation.model=MODEL;
 return output;
}
