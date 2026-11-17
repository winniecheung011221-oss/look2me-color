(() => {
  const cover=document.querySelector('.cover');
  if(!cover)return;
  const tones={
    apricot:['#f3dcc3','#ffc498','#d5bfc7','#b5c2a7'],
    petal:['#f0ccd8','#efa297','#c8b2d6','#edce9f'],
    fig:['#d1a5b9','#d8868a','#9b7b9b','#ebbc93'],
    iris:['#d0c7f2','#a9acf0','#c0acd6','#e5bfbb']
  };
  const controls=[...cover.querySelectorAll('[data-tone]')];
  const apply=name=>tones[name].forEach((color,i)=>cover.style.setProperty('--tone-'+i,color));
  let active='apricot';
  controls.forEach(btn=>{
    const show=()=>apply(btn.dataset.tone);
    btn.addEventListener('pointerenter',show);
    btn.addEventListener('pointerleave',()=>apply(active));
    btn.addEventListener('focus',show);
    btn.addEventListener('blur',()=>apply(active));
    btn.addEventListener('click',()=>{
      active=btn.dataset.tone;
      controls.forEach(c=>c.setAttribute('aria-pressed',String(c===btn)));
      apply(active);
    });
  });
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  let frame=0;
  cover.addEventListener('pointermove',event=>{
    if(event.pointerType==='touch')return;
    if(frame)cancelAnimationFrame(frame);
    frame=requestAnimationFrame(()=>{
      const rect=cover.getBoundingClientRect();
      cover.style.setProperty('--dx',((event.clientX-rect.left)/rect.width-.5)*75+'px');
      cover.style.setProperty('--dy',((event.clientY-rect.top)/rect.height-.5)*56+'px');
    });
  });
  cover.addEventListener('pointerleave',()=>{
    if(frame)cancelAnimationFrame(frame);
    cover.style.setProperty('--dx','0px');cover.style.setProperty('--dy','0px');
  });
})();
