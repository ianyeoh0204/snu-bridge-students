(() => {
  const html=document.documentElement;
  const story=document.querySelector('.story');
  const source=document.querySelector('.original-paper');
  const english=document.querySelector('.english-paper');
  const phase=document.querySelector('.chapter-number');
  const caption=document.querySelector('.chapter-caption');
  const line=document.querySelector('.chapter-track span');
  const motion=matchMedia('(min-width:960px) and (min-height:700px) and (prefers-reduced-motion:no-preference)');
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  const clamp=x=>Math.max(0,Math.min(1,x));
  const smooth=x=>{const n=clamp(x);return n*n*(3-2*n)};
  const stages=[
    'Start with the requirement in the original notice.',
    'Keep the audience and original dates attached to the explanation.',
    'Show both submission steps. Preserve the important exceptions.'
  ];
  let scheduled=false,lastPhase=-1;
  function updateStory(){
    scheduled=false;
    if(!story||!source||!english)return;
    const animated=motion.matches;
    const box=story.getBoundingClientRect();
    const progress=animated?clamp((95-box.top)/Math.max(1,box.height-innerHeight+115)):1;
    const reveal=smooth((progress-.12)/.38);
    source.style.transform=animated?`translateX(${(1-reveal)*53}%) rotate(${(1-reveal)*-1.5}deg)`:'none';
    english.style.opacity=String(animated?reveal:1);
    english.style.transform=animated?`translateY(${(1-reveal)*24}px)`:'none';
    english.setAttribute('aria-hidden',String(animated&&reveal<.05));
    for(const [key,start] of [['who',.22],['date',.38],['steps',.59]]){
      const value=animated?smooth((progress-start)/.23):1;
      const field=story.querySelector(`[data-field="${key}"]`);
      field.style.opacity=String(value);
      field.style.transform=animated?`translateY(${(1-value)*12}px)`:'none';
      field.setAttribute('aria-hidden',String(animated&&value<.05));
      story.querySelector(`[data-highlight="${key}"]`).style.setProperty('--mark-fill',`${value*100}%`);
    }
    const index=progress<.34?0:progress<.68?1:2;
    if(lastPhase!==index){phase.textContent=`0${index+1} / 03`;caption.textContent=stages[index];lastPhase=index}
    line.style.width=`${progress*100}%`;
  }
  function requestUpdate(){if(!scheduled){scheduled=true;requestAnimationFrame(updateStory)}}
  function configure(){html.classList.toggle('motion-story',Boolean(story&&motion.matches));updateStory()}
  configure();
  addEventListener('scroll',requestUpdate,{passive:true});
  addEventListener('resize',requestUpdate,{passive:true});
  motion.addEventListener('change',configure);
  // Normal document flow is the fallback. Mobile and reduced-motion views expose
  // the complete example, without requiring a scroll-controlled animation.
  const reveals=[...document.querySelectorAll('.reveal')];
  if('IntersectionObserver' in window&&!reduced.matches){
    reveals.forEach(el=>{if(el.getBoundingClientRect().top<innerHeight)el.classList.add('visible')});
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{threshold:.08});
    reveals.forEach(el=>observer.observe(el));html.classList.add('can-reveal');
    reduced.addEventListener('change',()=>{if(reduced.matches){html.classList.remove('can-reveal');observer.disconnect()}});
  }
})();
