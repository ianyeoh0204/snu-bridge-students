import { parseHTML } from 'linkedom';
import { fetchHTML, parseSource } from '../bridge/sources.mjs';
import { canonicalURL, digest, material } from './collector.mjs';
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const clean = value => String(value || '').replace(/\s+/gu,' ').trim();
export function listingDate(text) {
  const numeric = text.match(/(20\d{2})[.-](\d{2})[.-](\d{2})/u);
  if (numeric) return numeric.slice(1).join('-');
  const m = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(20\d{2})/u);
  return m ? `${m[3]}-${String(MONTHS.indexOf(m[1])+1).padStart(2,'0')}-${m[2].padStart(2,'0')}` : null;
}
export function englishRows(html, base) {
  const {document}=parseHTML(html), rows=[];
  for (const tr of document.querySelectorAll('tr')) {
    const a=[...tr.querySelectorAll('a[href]')].find(a=>{
      try {const u=new URL(a.getAttribute('href'),base);return u.pathname==='/en/community/notice'&&u.searchParams.get('md')==='v';} catch {return false;}
    });
    const posted=listingDate(tr.textContent);
    if (a&&posted) rows.push({source_url:canonicalURL(new URL(a.getAttribute('href'),base).href),posted,title:clean(a.textContent)});
  }
  if (!rows.length) throw Error('English listing could not be read; an empty result is not evidence of missing coverage.');
  return rows;
}
export function auditFingerprint(records) {
  return digest(records.map(n=>({url:canonicalURL(n.source_url),posted:n.posted,hash:n.source_hash})).sort((a,b)=>a.url.localeCompare(b.url)));
}
export async function collectEnglishAudit({year=2026,maxPages=8,cases=[],fetcher=fetch,progress=()=>{}}={}) {
  const index=new Map(), pages=[], failures=[];
  let complete=false;
  for(let page=1;page<=maxPages;page++) {
    const url='https://ece.snu.ac.kr/en/community/notice'+(page===1?'':'?page='+page);
    try {
      const rows=englishRows(await fetchHTML(url,fetcher),url); pages.push(url);
      let fresh=0;
      for(const row of rows) if(Number(row.posted.slice(0,4))===year&&!index.has(row.source_url)){index.set(row.source_url,row);fresh++;}
      progress({board:'english',page,target_year_records:index.size});
      if(!fresh&&rows.some(r=>Number(r.posted.slice(0,4))<year)){complete=true;break;}
    } catch(e){failures.push({url,error:e.message});break;}
  }
  const english=[];
  for(const row of index.values()) {
    try {const s=parseSource(await fetchHTML(row.source_url,fetcher),row.source_url);english.push({...row,title:s.title,text:s.text,source_hash:digest(material(s)),attachments:s.attachments,images:s.images,links:s.links});progress({read:'english',url:row.source_url});}
    catch(e){failures.push({url:row.source_url,error:e.message});}
  }
  const korean=[];
  for(const item of cases) {
    try {const s=parseSource(await fetchHTML(item.source_url,fetcher),item.source_url);korean.push({case_key:item.key,source_url:item.source_url,title:s.title,text:s.text,source_hash:digest(material(s)),attachments:s.attachments,images:s.images});progress({read:'korean_case',key:item.key});}
    catch(e){failures.push({url:item.source_url,error:e.message});}
  }
  return {schema_version:1,checked_at:new Date().toISOString(),year,english_pages:pages,listing_boundary_observed:complete,english_count:english.length,status:complete&&!failures.length?'complete_within_stated_scope':'incomplete',failures,english,korean,corpus_hash:auditFingerprint(english),scope:'ECE English-board HTML posts dated '+year+'. Selected Korean academic procedures. Attachments and images are inventoried, not read. No university-wide absence claim.',matching_method:'Compare procedure, academic period, audience, required actions and exceptions. URLs identify evidence; notice IDs and board-count differences never establish a match.'};
}
export function verifiedAudit(audit, review) {
  const validCorpus=audit.status==='complete_within_stated_scope'&&review?.corpus_hash===audit.corpus_hash;
  const cases=(review?.cases||[]).map(c=>{
    const live=audit.korean.find(n=>n.case_key===c.key);
    return {...c,source:live?{title:live.title,source_url:live.source_url,source_hash:live.source_hash,attachments:live.attachments,image_count:live.images.length}:null,assessment_current:Boolean(validCorpus&&live?.source_hash===c.source_hash),status:validCorpus&&live?.source_hash===c.source_hash?c.status:'needs_recheck'};
  });
  return {schema_version:1,checked_at:audit.checked_at,year:audit.year,scope:audit.scope,matching_method:audit.matching_method,english_count:audit.english_count,english_pages:audit.english_pages,complete:audit.status==='complete_within_stated_scope',review_status:'AI-assisted content comparison; no independent Korean-reader sign-off',corpus_current:validCorpus,cases,selection_note:review?.selection_note,english:audit.english.map(n=>({title:n.title,source_url:n.source_url,posted:n.posted,source_hash:n.source_hash,attachment_count:n.attachments.length,image_count:n.images.length,language_review:validCorpus?review.language.find(r=>r.source_url===n.source_url):null})),positive_examples:validCorpus?review.positive_examples:[],failures:audit.failures};
}
