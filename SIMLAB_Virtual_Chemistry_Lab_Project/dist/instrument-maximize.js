// Keep the same live instrument DOM and acquisition timers when expanding it.
(()=>{
  const style=document.createElement('style');
  style.textContent=`body.instrument-maximized .app{grid-template-columns:1fr}body.instrument-maximized .sidebar{display:none}body.instrument-maximized .content{max-width:none;padding:24px}body.instrument-maximized .topbar{padding:0 24px}#instrumentMaximize{white-space:nowrap}body.instrument-maximized .pagehead{flex-wrap:wrap;gap:12px}@media(max-width:600px){body.instrument-maximized .content{padding:14px}body.instrument-maximized .topbar{padding:0 14px}#instrumentMaximize{padding:8px;font-size:11px}}`;
  document.head.append(style);
  const button=document.createElement('button');
  button.id='instrumentMaximize';button.type='button';button.className='btn secondary small';
  document.querySelector('.topright').prepend(button);
  let expanded=false,ownsFullscreen=false;
  function paint(){
    button.textContent=expanded?'↙ Restore window':'⛶ Maximize workbench';
    button.setAttribute('aria-pressed',String(expanded));
    button.title=expanded?'Restore the lab layout (Esc)':'Use the whole screen for instrument operation';
    document.body.classList.toggle('instrument-maximized',expanded);
  }
  function restore(){expanded=false;paint();if(ownsFullscreen&&document.fullscreenElement){document.exitFullscreen().catch(()=>{});}ownsFullscreen=false;}
  button.addEventListener('click',async()=>{
    if(expanded){restore();return;}
    expanded=true;paint();
    // Embedded browsers may deny native fullscreen; the expanded layout still works.
    if(!document.fullscreenElement&&document.documentElement.requestFullscreen){
      try{await document.documentElement.requestFullscreen();ownsFullscreen=true;if(!expanded)restore();}catch{}
    }
  });
  document.addEventListener('fullscreenchange',()=>{if(ownsFullscreen&&!document.fullscreenElement){ownsFullscreen=false;expanded=false;paint();}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&expanded)restore();});
  function sync(){const available=['instrumentation','massspec','uvvis'].includes(page);button.hidden=!available;if(!available&&expanded)restore();}
  new MutationObserver(sync).observe(document.querySelector('#crumb'),{childList:true,subtree:true});
  paint();sync();
})();
