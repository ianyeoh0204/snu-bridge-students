import fs from 'node:fs';
import {esc} from './render-evidence.mjs';

const EXAMPLE_HASH='9a869763a0623a09aef522a934b452440a267ac7eb5251264125523fa00a5e5a';
const date=value=>value?new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',day:'numeric',month:'short',year:'numeric'}).format(new Date(value)):'Not available';
const quote={who:'대학원 논문연구(430.960) 수강신청한 모든 대학원생 제출 필수',date:'2026. 9. 3.(목) ~ 2026. 9. 17.(목)',steps:'아래 1번. 2번. 모두 하셔야 신청 완료됩니다.'};

export function renderProject({notices,briefs,coverage,status}){
 const source=notices.find(n=>n.id==='58022');
 const brief=briefs.find(b=>b.notice_id==='58022');
 const text=source?.original?.filter(b=>b.t==='p').map(b=>b.text).join('\n')||'';
 const exampleCurrent=Boolean(source?.source_hash===EXAMPLE_HASH&&brief?.source_hash===source.source_hash&&!brief.source_changed&&Object.values(quote).every(q=>text.includes(q)));
 const freshBriefs=briefs.filter(b=>!b.source_changed&&notices.some(n=>n.id===b.notice_id&&n.source_hash===b.source_hash));
 const auditCurrent=Boolean(coverage?.complete&&coverage?.corpus_current);
 const external=(url,label)=>`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} <span aria-hidden="true">↗</span></a>`;
 const official=source?.source_url||'https://ece.snu.ac.kr/community/academics';
 const example=exampleCurrent?`
 <section class="story" id="walkthrough" aria-labelledby="story-title">
  <div class="story-stage">
   <div class="story-heading"><div><p class="eyebrow">02 / One notice, understood</p><h2 id="story-title">The details make<br>the difference.</h2></div><div class="story-context"><span>Historical example · Fall 2026</span><p>Thesis Research 430.960<br>AI explanation · not independently reviewed</p><a href="#the-details">Skip the animation ↓</a></div></div>
   <div class="story-scene">
    <article class="notice-paper original-paper" aria-label="Excerpts from the Korean notice">
     <div class="paper-label"><span>Official ECE notice</span><span lang="ko">학사공지</span></div>
     <h3 lang="ko">대학원 논문연구<br>과목수강 확인서 제출 안내</h3>
     <p class="ko-line" lang="ko"><span class="mini-label">제출대상</span><mark data-highlight="who">${esc(quote.who)}</mark></p>
     <p class="ko-line" lang="ko"><span class="mini-label">제출기한</span><mark data-highlight="date">${esc(quote.date)}</mark></p>
     <p class="ko-line" lang="ko"><span class="mini-label">제출방법</span><mark data-highlight="steps">${esc(quote.steps)}</mark></p>
     <p class="source-foot">Selected excerpts · ${external(official,'Original notice')}</p>
    </article>
    <article class="notice-paper english-paper" aria-label="English action brief excerpt">
     <div class="paper-label"><span>SNU Bridge</span><span>Action brief</span></div><h3>Complete both<br>submission steps.</h3>
     <div class="story-field" data-field="who"><span class="mini-label">Applies if</span><p>You registered for Graduate Thesis Research, 430.960.</p></div>
     <div class="story-field" data-field="date"><span class="mini-label">Submission window</span><p class="date-display">3–17 Sep 2026</p></div>
     <div class="story-field" data-field="steps"><span class="mini-label">What to do</span><ol><li>Complete the Google Form.</li><li>Submit the signed confirmation to the ECE office.</li></ol></div>
     <p class="source-foot">An excerpt. Important exceptions are explained below.</p>
    </article>
   </div>
   <div class="story-progress"><span class="chapter-number" aria-hidden="true">01 / 03</span><p class="chapter-caption" aria-live="polite">Start with the requirement in the original notice.</p><div class="chapter-track" aria-hidden="true"><span></span></div><span class="scroll-hint" aria-hidden="true">Scroll to unfold ↓</span></div>
  </div>
 </section>
 <section class="details-section reveal" id="the-details" aria-labelledby="details-title">
  <div class="section-lead"><p class="eyebrow">The exception matters, too</p><h2 id="details-title">Whose signature<br>do you actually need?</h2><p>If your course professor is different from your advisor, write both names and get the course professor’s signature. Students taking two thesis-research sections need the professors’ prior permission and a confirmation for each professor.</p><a class="text-link" href="../#notice/58022">Read the complete English brief <span aria-hidden="true">↗</span></a></div>
  <aside class="consequence"><span class="mini-label">Why a missed step matters</span><p class="large-letter">U</p><p>The notice states that failing to submit results in a U grade.</p><blockquote lang="ko">미제출 시 성적은 U로 부여됩니다</blockquote><small>This September 2026 submission window has passed. Use a current notice for current requirements.</small></aside>
 </section>`:`<section class="source-changed" id="walkthrough"><p class="eyebrow">Example needs rechecking</p><h2>The source for this walkthrough has changed.</h2><p>Its previously illustrated dates and instructions are withheld until the example is checked against the new version.</p>${external(official,'Read the current official notice')}</section>`;
 return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#19345a"><meta name="description" content="See how SNU Bridge turns ECE academic notices into source-linked English next steps for international students."><title>SNU Bridge · From notice to next step</title><link rel="stylesheet" href="./project.css"><script src="./project.js" defer></script></head>
<body><a class="skip-link" href="#main">Skip to the story</a>
<header class="project-header"><a class="wordmark" href="../" aria-label="SNU Bridge student website"><span class="bridge-mark" aria-hidden="true"><i></i><i></i><i></i></span>SNU Bridge</a><nav aria-label="Presentation navigation"><a href="#why">The problem</a><a href="#walkthrough">The walkthrough</a><a href="#evidence">The evidence</a></nav><a class="header-cta" href="../#briefing">Open SNU Bridge <span aria-hidden="true">↗</span></a></header>
<main id="main">
 <section class="hero"><div class="hero-main"><p class="eyebrow">For international students at SNU ECE</p><h1>Know what<br>to do <em>next.</em></h1><p class="hero-copy">Academic notices, explained in English.<br>The conditions, the deadlines, the next steps.</p><div class="hero-actions"><a class="button-primary" href="../#briefing">Find what applies to you <span aria-hidden="true">↗</span></a><a class="text-link" href="#walkthrough">See one notice unfold ↓</a></div></div><aside class="hero-aside"><span class="aside-index">서울 → 이해 → 행동</span><p>Less time<br><em>deciphering.</em><br>More clarity<br>about your next step.</p><div class="hero-rule"></div><span class="small-label">An independent student project.<br>Starting with ECE academic notices.</span></aside><div class="hero-bottom"><span>From notice to next step</span><span>Explore the story ↓</span></div></section>
 <section class="problem-section reveal" id="why"><div class="section-lead"><p class="eyebrow">01 / The information gap</p><h2>Finding the notice<br>is only the beginning.</h2></div><div class="problem-copy"><p>The English board does not always explain the same academic procedures as the Korean board. Even after translating a notice, a student may still need to work out the conditions and exceptions.</p><div class="student-questions"><p><span>01</span> Does this apply to me?</p><p><span>02</span> Which date is my deadline?</p><p><span>03</span> What exactly must I submit?</p></div><a class="text-link" href="../evidence/">Inspect the source comparisons ↗</a></div></section>
 ${example}
 <section class="service-section reveal" id="service"><div class="service-heading"><p class="eyebrow">03 / Useful before the first question</p><h2>Start with your degree.<br>Ask when you need to.</h2><p>The public homepage brings selected academic notices and starting guidance together. ChatGPT is there for a follow-up that depends on your situation.</p></div><div class="service-path"><div><span class="path-number">01</span><h3>Find your next action.</h3><p>Choose your degree. See conditional actions, stated dates, and what still needs checking.</p></div><div><span class="path-number">02</span><h3>Understand the requirement.</h3><p>Read the English brief alongside its Korean evidence and official source.</p></div><div><span class="path-number">03</span><h3>Take the context with you.</h3><p>Copy a source-linked question into ChatGPT for a personal follow-up.</p></div></div><a class="button-primary" href="../#briefing">Try the student website <span aria-hidden="true">↗</span></a></section>
 <section class="operation-section" id="updates"><div class="operation-title reveal"><p class="eyebrow">04 / A repeatable update process</p><h2>A new notice.<br>A shared explanation.</h2><p>The cloud workflow checks ECE’s academic board on a daily schedule. Successfully read changes can trigger a fresh English draft, followed by automated source checks and publication.</p></div><ol class="pipeline" aria-label="Daily update process"><li class="reveal"><span class="pipeline-dot" aria-hidden="true"></span><span class="mini-label">Collect</span><h3>Read the official source</h3><p>Keep the notice, its version, and the time it was checked.</p></li><li class="reveal"><span class="pipeline-dot" aria-hidden="true"></span><span class="mini-label">Explain</span><h3>Preserve the conditions</h3><p>Draft actions and dates. Leave missing evidence unknown.</p></li><li class="reveal"><span class="pipeline-dot" aria-hidden="true"></span><span class="mini-label">Check</span><h3>Hold rejected drafts</h3><p>Source and date checks run before a draft can become public.</p></li><li class="reveal"><span class="pipeline-dot" aria-hidden="true"></span><span class="mini-label">Publish</span><h3>Share the English brief</h3><p>One explanation can help many students. Its AI status stays visible.</p></li></ol><div class="operation-status"><p><strong>${freshBriefs.length}</strong> source-current English AI drafts <span>from ${notices.length} collected notices</span></p><p>Source collection checked <strong>${esc(date(status.checked_at))}</strong><span>${status.status==='succeeded'?'Latest collection completed within its scan window.':'Latest collection was incomplete; inspect the student site for details.'}</span></p></div><p class="operation-limit">Edit detection covers successfully fetched pages. Image and attachment contents are not automatically read in this version. Automated checks do not establish translation accuracy.</p></section>
 <section class="evidence-section reveal" id="evidence"><div class="section-lead"><p class="eyebrow">05 / Evidence you can inspect</p><h2>Compare the information.<br>Keep the limits visible.</h2><p>We compare procedures, academic periods, audiences and required actions. An English filename or a similar title is not enough to establish a match.</p><a class="text-link" href="../evidence/">Read the evidence and its sources ↗</a></div><div class="audit-panel"><div class="audit-number"><strong>${coverage?.cases?.length||0}</strong><span>Selected academic procedures<br>compared by content</span></div><div class="audit-number"><strong>${coverage?.english_count||0}</strong><span>English-board posts checked<br>dated ${esc(coverage?.year||'2026')}</span></div><p class="audit-note">${auditCurrent?'A purposeful ECE sample, not a university-wide coverage rate.':'The comparison needs rechecking against changed or incomplete source data.'} Independent Korean-reader review and student-trial results remain pending.</p></div></section>
 <section class="closing reveal"><p class="eyebrow">Your next step</p><h2>Start with what<br><em>applies to you.</em></h2><a class="button-primary" href="../#briefing">Open SNU Bridge <span aria-hidden="true">↗</span></a><p>Public website. No account needed to read the briefs.<br>Optional ChatGPT follow-up.</p></section>
</main><footer class="project-footer"><a class="wordmark" href="../">SNU Bridge</a><p>Independent student project · ECE academic pilot<br>AI explanations may contain errors. Current official notices control.</p><div><a href="../evidence/">Sources & evidence</a><a href="https://github.com/ianyeoh0204/snu-bridge-students" target="_blank" rel="noopener noreferrer">Project source ↗</a></div></footer></body></html>`;
}
export function buildProject(){
 const read=name=>JSON.parse(fs.readFileSync('data/'+name+'.json'));
 fs.mkdirSync('public/project',{recursive:true});
 fs.writeFileSync('public/project/index.html',renderProject({notices:read('notices'),briefs:read('briefs'),coverage:read('english-coverage'),status:read('collection-status')}));
}
if(process.argv[1]?.endsWith('render-project.mjs'))buildProject();
