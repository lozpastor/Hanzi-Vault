let loading;
const norm=s=>String(s||'').toLowerCase().replace(/u:|ü/g,'v').normalize('NFD').replace(/[\u0300-\u036f1-5\s'’-]/g,'');
const english=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
async function entries(){
  if(!loading)loading=fetch('cedict-index.json',{signal:AbortSignal.timeout(30000)}).then(r=>{if(!r.ok)throw new Error('Diccionario no disponible');return r.json();}).then(index=>Object.entries(index).flatMap(([key,items])=>items.map(item=>({item,key,meaning:english(item.translation)})))).catch(error=>{loading=null;throw error;});
  return loading;
}
onmessage=async({data:{id,query}})=>{
  try{
    const all=await entries(),q=norm(query),en=english(query),hits=[];
    if(['football','soccer','play football','play soccer'].includes(en)||q==='tizuqiu') {
      hits.push({item:{zh:'踢足球',pinyin:'tī zú qiú',translation:'play football; play soccer (jugar al fútbol)',source:'Expresión de uso'},score:q==='tizuqiu'||en.startsWith('play ')?0:.5,meaning:'play football'});
    }
    for(const row of all){
      let score=Infinity;
      if(row.key===q||row.item.zh===query.trim())score=0;
      else if(row.key.startsWith(q))score=4;
    if(en&&row.item.translation.split(';').some(s=>english(s)===en))score=Math.min(score,0);
      else if(en&&(' '+row.meaning+' ').includes(' '+en+' '))score=Math.min(score,1);
      if(Number.isFinite(score))hits.push({...row,score});
    }
    hits.sort((a,b)=>a.score-b.score||a.item.zh.length-b.item.zh.length||a.meaning.length-b.meaning.length);
    const exact=hits.filter(r=>r.score===0),rest=hits.filter(r=>r.score!==0).slice(0,180);
    postMessage({id,exactCount:exact.length,results:[...exact,...rest].map(r=>r.item)});
  }catch(error){postMessage({id,error:error.message});}
};
