const LexicalSearch = (() => {
  let worker, sequence=0;
  const pending=new Map();
  const normalize=value=>String(value||'').toLowerCase().replace(/u:|ü/g,'v').normalize('NFD').replace(/[\u0300-\u036f1-5\s'’-]/g,'');
  function init(){
    if(worker)return;
    worker=new Worker('lexical-worker.js');
    worker.onmessage=({data})=>{const task=pending.get(data.id);if(task){pending.delete(data.id);data.error?task.reject(new Error(data.error)):task.resolve(data);}};
    worker.onerror=()=>{for(const task of pending.values())task.reject(new Error('No se pudo cargar el diccionario.'));pending.clear();worker.terminate();worker=null;};
  }
  async function search(query){
    const q=normalize(query);
    if(!q)return {matches:[],exactCount:0,source:'local'};
    const locals=[...PINYIN_LEXICON,...DB.words].filter(i=>normalize(i.pinyin).includes(q)||normalize(i.zh).includes(q)||normalize(i.translation).includes(q));
    try{
      init();const id=++sequence;
      const data=await new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});worker.postMessage({id,query});});
      const seen=new Set();
      const matches=[...locals.filter(i=>normalize(i.pinyin)===q),...data.results,...locals].filter(i=>{const key=[i.zh,normalize(i.pinyin),i.translation].join('|');if(seen.has(key))return false;seen.add(key);return true;});
      return {matches,exactCount:data.exactCount,source:'CC-CEDICT'};
    }catch(error){return {matches:locals,exactCount:0,source:'local',error:error.message};}
  }
  return {search};
})();
