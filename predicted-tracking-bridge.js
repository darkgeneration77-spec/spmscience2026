(()=>{
'use strict';
function splitUnit(unit){const p=String(unit||'').split('•');return {chapter:(p[0]||'').trim(),subtopic:(p[1]||'').trim()};}
function scoreText(text,keywords,max){const t=String(text||'').toLowerCase();if(!keywords||!keywords.length)return 0;return Math.min(max,Math.round(keywords.filter(k=>t.includes(String(k).toLowerCase())).length/keywords.length*max));}
async function syncProfile(doc){const n=doc.getElementById('name')?.value.trim()||'';const c=doc.getElementById('cls')?.value.trim()||'';if(n&&window.ScienceTracker)await ScienceTracker.profile(n,c);}
function getMeta(win){try{return win.eval('({mcq,st})');}catch(e){console.warn('Tracking metadata unavailable',e);return null;}}
function attach(viewer,setLabel){
 if(!window.ScienceTracker||!viewer||!['Set 2','Set 3','Set 4','Set 5','Set 6'].includes(setLabel))return;
 const win=viewer.contentWindow,doc=viewer.contentDocument;if(!win||!doc||doc.documentElement.dataset.cloudTrack==='1')return;
 const meta=getMeta(win);if(!meta)return;const mcq=meta.mcq||[],st=meta.st||[];doc.documentElement.dataset.cloudTrack='1';
 const saved=ScienceTracker.identity();const name=doc.getElementById('name'),cls=doc.getElementById('cls');
 if(name&&!name.value&&saved.name)name.value=saved.name;if(cls&&!cls.value&&saved.class_name)cls.value=saved.class_name;
 [name,cls].filter(Boolean).forEach(el=>el.addEventListener('blur',()=>syncProfile(doc)));
 const startBtn=[...doc.querySelectorAll('button')].find(b=>b.textContent.trim()==='Start Attempt');if(startBtn)startBtn.addEventListener('click',()=>setTimeout(()=>syncProfile(doc),0));
 doc.querySelectorAll('input[type=radio][name^="m"]').forEach(r=>r.addEventListener('change',async e=>{
   await syncProfile(doc);const m=/m(\d+)/.exec(e.target.name);if(!m)return;const i=+m[1],q=mcq[i];if(!q)return;const v=+e.target.value,u=splitUnit(q.unit);
   ScienceTracker.progress({set_name:setLabel,paper:'Paper 1',question_id:'Q'+(i+1),chapter:u.chapter,subtopic:u.subtopic,skill:'MCQ',student_answer:String.fromCharCode(65+v)+'. '+q.o[v],correct_answer:String.fromCharCode(65+q.a)+'. '+q.o[q.a],is_correct:v===q.a,marks_awarded:v===q.a?1:0,marks_total:1});
 }));
 st.forEach(s=>(s.parts||[]).forEach((p,j)=>{const ta=doc.getElementById(`s${s.num}p${j}`);if(!ta)return;ta.addEventListener('blur',async()=>{
   const text=ta.value.trim();if(!text)return;await syncProfile(doc);const u=splitUnit(s.unit),mark=scoreText(text,p[2],p[1]);
   ScienceTracker.progress({set_name:setLabel,paper:'Paper 2',question_id:`Q${s.num}(${String.fromCharCode(97+j)})`,chapter:u.chapter,subtopic:u.subtopic,skill:'Structured Response',student_answer:text,correct_answer:p[3],is_correct:mark>=p[1],marks_awarded:mark,marks_total:p[1]});
 });}));
 const complete=[...doc.querySelectorAll('button')].find(b=>b.textContent.includes('Complete & Mark'));
 if(complete)complete.addEventListener('click',()=>setTimeout(async()=>{
   const result=doc.getElementById('result');if(!result||getComputedStyle(result).display==='none')return;await syncProfile(doc);
   let p1=0,p2=0;mcq.forEach((q,i)=>{const x=doc.querySelector(`input[name=m${i}]:checked`);if(x&&+x.value===q.a)p1++;});
   st.forEach(s=>(s.parts||[]).forEach((p,j)=>{const ta=doc.getElementById(`s${s.num}p${j}`);if(ta&&ta.value.trim())p2+=scoreText(ta.value,p[2],p[1]);}));
   ScienceTracker.attempt({set_name:setLabel,paper:'Paper 1 + Paper 2',score:p1+p2,total_marks:120,completed:true});
 },400));
 console.info('Cloud tracking attached:',setLabel);
}
window.PredictedTrackingBridge={attach};
})();
