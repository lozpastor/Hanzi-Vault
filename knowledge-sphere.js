const KnowledgeSphere = (() => {
  let canvas,ctx,observer,frame,nodes=[],links=[],projected=[],selected=null,language='zh';
  let yaw=0,pitch=-0.12,scale=1,auto=!matchMedia('(prefers-reduced-motion: reduce)').matches,filter='',last=0;
  const pointers=new Map();let moved=false,pinch=0;
  const colors=['#80b8cb','#cea77a','#96b591','#b1a5d8','#d79099','#8eafbd','#b6b975'];
  const normalize=v=>{const m=Math.hypot(...v)||1;return v.map(n=>n/m);};
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  function spherePoint(i,n){const y=1-2*(i+.5)/n,a=i*Math.PI*(3-Math.sqrt(5)),r=Math.sqrt(1-y*y);return [Math.cos(a)*r,y,Math.sin(a)*r];}
  function build(){
    const groups=new Map();
    for(const word of DB.words){if(filter&&word.category!==filter)continue;const key=word.category||'none';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(word);}
    nodes=[];links=[];
    const groupArray=[...groups.entries()].sort(([a],[b])=>a.localeCompare(b));
    groupArray.forEach(([category,words],groupIndex)=>{
      const center=spherePoint(groupIndex,groupArray.length),tangent=normalize(cross(center,[0,1,0])),bitangent=cross(center,tangent);
      const radius=groupArray.length===1?0:Math.min(.6,1.25/Math.sqrt(groupArray.length));
      words.forEach((word,i)=>{
        const angle=i*2.399963,r=Math.sqrt((i+.5)/words.length)*radius;
        const vector=groupArray.length===1?spherePoint(i,words.length):normalize(center.map((v,j)=>v+r*(Math.cos(angle)*tangent[j]+Math.sin(angle)*bitangent[j])));
        nodes.push({...word,vector,color:colors[groupIndex%colors.length]});
      });
    });
    const byId=new Map(nodes.map(n=>[n.id,n])),edgeKeys=new Set();
    const edge=(a,b,reason)=>{if(a===b||!byId.has(a)||!byId.has(b))return;const key=[a,b].sort().join('|');if(edgeKeys.has(key))return;edgeKeys.add(key);links.push({a,b,reason});};
    for(const r of DB.relations||[])edge(r.from,r.to,({synonym:'Sinónimos',antonym:'Antónimos',family:'Familia léxica',theme:'Relación temática'}[r.type])||'Relación guardada');
    for(const [cat,words] of groups){for(let i=1;i<words.length;i++)edge(words[i-1].id,words[i].id,'Misma categoría');}
    const characters=new Map();
    for(const n of nodes){for(const char of new Set(n.zh)){if(!/[\u3400-\u9fff]/.test(char))continue;const prior=characters.get(char)||[];for(const id of prior.slice(-2))edge(n.id,id,`Comparten «${char}»`);prior.push(n.id);characters.set(char,prior);}}
    document.getElementById('sphere-count').textContent=`${nodes.length} palabras · ${links.length} conexiones`;
    if(selected&&!byId.has(selected))selected=null;
  }
  function init(){
    if(canvas)return;
    const host=document.getElementById('graph-container');
    host.innerHTML=`<div class="sphere-top"><div><span class="sphere-eyebrow">TU BIBLIOTECA, CONECTADA</span><h2>Mapa de conocimiento</h2><p id="sphere-count"></p></div><div class="sphere-tools"><div class="sphere-search"><label class="sr-only" for="graph-search">Buscar en el mapa</label><input id="graph-search" placeholder="Chino, pinyin o significado" autocomplete="off"><div id="graph-search-results" class="graph-search-results"></div></div><label class="sr-only" for="sphere-category">Categoría</label><select id="sphere-category"></select></div></div><canvas id="sphere-canvas" tabindex="0" role="img" aria-label="Red tridimensional de palabras. Arrastra o usa las flechas para girar. Usa el buscador para seleccionar palabras."></canvas><div class="sphere-controls"><button id="sphere-rotate" type="button"></button><button id="sphere-reset" type="button">Centrar</button><button id="sphere-zh" type="button" aria-pressed="true">汉字</button><button id="sphere-pinyin" type="button" aria-pressed="false">Pinyin</button><button id="sphere-zoom-in" type="button" aria-label="Acercar">+</button><button id="sphere-zoom-out" type="button" aria-label="Alejar">−</button></div><aside id="sphere-detail" class="sphere-detail" aria-live="polite"><span class="sphere-eyebrow">EXPLORA LAS CONEXIONES</span><h3>Una palabra lleva a otra.</h3><p>Selecciona una palabra para ver su significado y por qué está conectada con otras.</p><div class="sphere-key"><span>— Misma categoría</span><span>— Caracteres compartidos</span><span>— Relaciones guardadas</span></div></aside><p class="sphere-help">Arrastra para girar · Rueda o pellizco para acercar</p>`;
    canvas=document.getElementById('sphere-canvas');ctx=canvas.getContext('2d');
    observer=new ResizeObserver(()=>{const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);canvas.width=rect.width*dpr;canvas.height=rect.height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);draw();});observer.observe(canvas);
    canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);moved=false;};
    canvas.onpointermove=e=>{
      if(!pointers.has(e.pointerId))return;
      const prior=pointers.get(e.pointerId),dx=e.clientX-prior[0],dy=e.clientY-prior[1];pointers.set(e.pointerId,[e.clientX,e.clientY]);
      if(Math.abs(dx)+Math.abs(dy)>2)moved=true;
      if(pointers.size===2){const [a,b]=[...pointers.values()],distance=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pinch)scale=Math.max(.55,Math.min(2.5,scale*distance/pinch));pinch=distance;}
      else{yaw+=dx*.006;pitch=Math.max(-1.5,Math.min(1.5,pitch+dy*.006));}
      draw();
    };
    canvas.onpointerup=e=>{pointers.delete(e.pointerId);pinch=0;if(!moved){const rect=canvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;const hit=[...projected].reverse().find(n=>Math.hypot(n.x-x,n.y-y)<16&&n.z>-.4);if(hit)focus(hit.id);}};
    canvas.onpointercancel=e=>{pointers.delete(e.pointerId);pinch=0;};
    canvas.addEventListener('wheel',e=>{e.preventDefault();scale=Math.max(.55,Math.min(2.5,scale*Math.exp(-e.deltaY*.001)));draw();},{passive:false});
    canvas.onkeydown=e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','Escape'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')yaw-=.12;if(e.key==='ArrowRight')yaw+=.12;if(e.key==='ArrowUp')pitch-=.12;if(e.key==='ArrowDown')pitch+=.12;if(e.key==='+')scale=Math.min(2.5,scale+.1);if(e.key==='-')scale=Math.max(.55,scale-.1);if(e.key==='Escape')reset();draw();}};
    document.getElementById('graph-search').oninput=e=>search(e.target.value);
    document.getElementById('graph-search').onkeydown=e=>{if(e.key==='Escape')document.getElementById('graph-search-results').classList.remove('open');if(e.key==='ArrowDown'){e.preventDefault();document.querySelector('#graph-search-results button')?.focus();}};
    document.getElementById('sphere-category').onchange=e=>{filter=e.target.value;selected=null;build();draw();};
    document.getElementById('sphere-rotate').onclick=()=>{auto=!auto;rotationLabel();};
    document.getElementById('sphere-reset').onclick=reset;
    document.getElementById('sphere-zh').onclick=()=>setLanguage('zh');document.getElementById('sphere-pinyin').onclick=()=>setLanguage('pinyin');
    document.getElementById('sphere-zoom-in').onclick=()=>{scale=Math.min(2.5,scale+.15);draw();};document.getElementById('sphere-zoom-out').onclick=()=>{scale=Math.max(.55,scale-.15);draw();};
    rotationLabel();
  }
  function rotationLabel(){const button=document.getElementById('sphere-rotate');button.textContent=auto?'Pausar giro':'Activar giro';button.setAttribute('aria-pressed',String(auto));}
  function project(v,width,height){const x=v[0]*Math.cos(yaw)+v[2]*Math.sin(yaw),z0=-v[0]*Math.sin(yaw)+v[2]*Math.cos(yaw),y=v[1]*Math.cos(pitch)-z0*Math.sin(pitch),z=v[1]*Math.sin(pitch)+z0*Math.cos(pitch),perspective=3.8/(3.8-z),radius=Math.min(width*(width>850?.30:.43),height*.37)*scale;return{x:width*(width>850?.43:.5)+x*radius*perspective,y:height*.53+y*radius*perspective,z,depth:perspective};}
  function draw(){
    if(!ctx)return;
    const {width,height}=canvas.getBoundingClientRect();if(!width||!height)return;
    ctx.clearRect(0,0,width,height);
    // Fine meridians and parallels make depth legible without obscuring the words.
    ctx.lineWidth=.7;ctx.strokeStyle='#172127';
    for(let axis=0;axis<3;axis++){ctx.beginPath();for(let t=0;t<=100;t++){const a=t/100*Math.PI*2,v=axis===0?[Math.cos(a),Math.sin(a),0]:axis===1?[Math.cos(a),0,Math.sin(a)]:[0,Math.cos(a),Math.sin(a)],p=project(v,width,height);if(t===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}ctx.stroke();}
    projected=nodes.map(n=>({...n,...project(n.vector,width,height)})).sort((a,b)=>a.z-b.z);
    const byId=new Map(projected.map(n=>[n.id,n])),neighbors=new Set();
    for(const link of links){const a=byId.get(link.a),b=byId.get(link.b);if(!a||!b)continue;const active=selected&&(a.id===selected||b.id===selected);if(active){neighbors.add(a.id);neighbors.add(b.id);}ctx.strokeStyle=active?'#b8dedf':a.color;ctx.globalAlpha=active?.7:selected?.035:.08+Math.max(0,(a.z+b.z)/2)*.16;ctx.lineWidth=active?1.1:.6;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
    const occupied=[];let labels=0;
    for(const n of projected){const active=n.id===selected,near=neighbors.has(n.id),opacity=selected&&!near?.12:.24+(n.z+1)*.36;ctx.globalAlpha=opacity;ctx.fillStyle=active?'#ffffff':n.color;const r=(active?4:2)*n.depth;ctx.beginPath();ctx.moveTo(n.x,n.y-r);ctx.lineTo(n.x+r,n.y);ctx.lineTo(n.x,n.y+r);ctx.lineTo(n.x-r,n.y);ctx.closePath();ctx.fill();}
    for(const n of [...projected].reverse().sort((a,b)=>(b.id===selected)-(a.id===selected))){
      const active=n.id===selected,near=neighbors.has(n.id);if(!active&&(n.z<.02||(selected&&!near)))continue;
      const text=language==='pinyin'?n.pinyin:n.zh,font=(active?18:12)*Math.min(n.depth,1.25);ctx.font=`${active?600:400} ${font}px "DM Sans", "Noto Sans SC", sans-serif`;
      const textWidth=ctx.measureText(text).width,x=Math.min(n.x+8,width-textWidth-12),y=n.y+4,box={x:x-4,y:y-font-4,w:textWidth+12,h:font+12};
      if(!active&&(occupied.some(b=>box.x<b.x+b.w&&box.x+box.w>b.x&&box.y<b.y+b.h&&box.y+box.h>b.y)||labels>65))continue;occupied.push(box);labels++;
      ctx.globalAlpha=active?1:.55+n.z*.45;ctx.fillStyle=active?'#fff':'#c4d3d7';ctx.fillText(text,x,y);
    }
    ctx.globalAlpha=1;
  }
  function tick(now){frame=null;if(!document.getElementById('page-graph').classList.contains('active'))return;if(!document.hidden&&auto&&!pointers.size){yaw+=Math.min(now-last,40)*.00007;draw();}last=now;frame=requestAnimationFrame(tick);}
  function render(){init();document.getElementById('sphere-category').innerHTML='<option value="">Todas las categorías</option>'+DB.categories.filter(c=>DB.words.some(w=>w.category===c.id)).map(c=>`<option value="${progressEscape(c.id)}">${progressEscape(c.name)}</option>`).join('');document.getElementById('sphere-category').value=filter;build();draw();stop();last=performance.now();frame=requestAnimationFrame(tick);}
  function stop(){if(frame)cancelAnimationFrame(frame);frame=null;}
  function reset(){yaw=0;pitch=-.12;scale=1;selected=null;draw();}
  function setLanguage(value){language=value;document.getElementById('sphere-zh').setAttribute('aria-pressed',String(value==='zh'));document.getElementById('sphere-pinyin').setAttribute('aria-pressed',String(value==='pinyin'));draw();}
  function search(query){const box=document.getElementById('graph-search-results'),q=normalizeText(query);if(!q){box.classList.remove('open');return;}const matches=DB.words.filter(w=>normalizeText(`${w.zh} ${w.pinyin} ${w.translation}`).includes(q)).slice(0,18);box.replaceChildren();for(const w of matches){const b=document.createElement('button');b.type='button';b.className='graph-search-item';b.textContent=`${w.zh} · ${w.pinyin} · ${w.translation}`;b.onclick=()=>{focus(w.id);box.classList.remove('open');};box.appendChild(b);}if(!matches.length)box.textContent='No hay coincidencias en tu biblioteca.';box.classList.add('open');}
  function focus(id){
    if(!nodes.some(n=>n.id===id)){filter='';document.getElementById('sphere-category').value='';build();}
    const n=nodes.find(n=>n.id===id);if(!n)return;selected=id;auto=false;rotationLabel();yaw=-Math.atan2(n.vector[0],n.vector[2]);pitch=Math.atan2(n.vector[1],Math.hypot(n.vector[0],n.vector[2]));
    const cat=DB.categories.find(c=>c.id===n.category),connections=links.filter(l=>l.a===id||l.b===id);
    const detail=document.getElementById('sphere-detail');detail.innerHTML=`<span class="sphere-eyebrow">${progressEscape(cat?.name||'Sin categoría')}</span><h3 lang="zh">${progressEscape(n.zh)}</h3><div class="sphere-pinyin">${progressEscape(n.pinyin)}</div><p>${progressEscape(n.translation)}</p><span class="sphere-eyebrow">${connections.length} CONEXIONES</span><div id="sphere-neighbors"></div><button class="sphere-edit" type="button">Abrir ficha</button>`;
    detail.querySelector('.sphere-edit').onclick=()=>openAddWord(id);
    for(const link of connections.slice(0,12)){const other=nodes.find(w=>w.id===(link.a===id?link.b:link.a));const b=document.createElement('button');b.textContent=`${other.zh} · ${link.reason}`;b.onclick=()=>focus(other.id);document.getElementById('sphere-neighbors').appendChild(b);}
    draw();
  }
  return {render,stop,reset,setLanguage,search,focus};
})();
