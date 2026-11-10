import fs from 'node:fs';
import {collectEnglishAudit,verifiedAudit} from '../lib/pipeline/english-audit.mjs';
const read=p=>JSON.parse(fs.readFileSync(p));
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const cases=read('data/english-audit-cases.json');
const audit=await collectEnglishAudit({year:2026,cases,progress:x=>console.log(JSON.stringify(x))});
fs.mkdirSync('audit-runs',{recursive:true});write('audit-runs/latest.json',audit);
const review=fs.existsSync('data/english-audit-review.json')?read('data/english-audit-review.json'):null;
write('data/english-coverage.json',verifiedAudit(audit,review));
console.log(JSON.stringify({english_posts:audit.english_count,korean_cases:audit.korean.length,status:audit.status,checked_at:audit.checked_at}));
// An audit failure does not erase prior assessments or stop unrelated student briefs.
