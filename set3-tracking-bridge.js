(()=>{
'use strict';
const API='https://spm-science-2026-api.darkgeneration77.workers.dev';
const SET_NAME='Set 3';
const ID_KEY='science2026_student_id';
const NAME_KEY='science2026_student_name';
const CLASS_KEY='science2026_student_class';
const getId=()=>{let id=localStorage.getItem(ID_KEY);if(!id){id=crypto.randomUUID?crypto.randomUUID():'stu-'+Date.now()+'-'+Math.random().toString(36).slice(2);localStorage.setItem(ID_KEY,id)}return id};
async function post(path,data){try{const r=await fetch(API+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data),keepalive:true});return await r.json()}catch(e){console.warn('Tracking error',e);return {ok:false,error:e.message}}}
function studentName(){return (document.getElementById('name')?.value||localStorage.getItem(NAME_KEY)||'').trim()}
function className(){return (document.getElementById('cls')?.value||localStorage.getItem(CLASS_KEY)||'').trim()}
async function profile(){const n=studentName();if(!n)return;localStorage.setItem(NAME_KEY,n);localStorage.setItem(CLASS_KEY,className());await post('/api/student',{student_id:getId(),name:n,class_name:className()})}
function unitParts(unit=''){const [chapter='',subtopic='']=String(unit).split('•').map(x=>x.trim());return {chapter,subtopic,skill:subtopic}}
async function saveMcq(i){if(typeof mcq==='undefined'||!mcq[i])return;const el=document.querySelector(`input[name="m${i}"]:checked`);if(!el||!studentName())return;await profile();const q=mcq[i],v=Number(el.value),u=unitParts(q.unit);await post('/api/progress',{student_id:getId(),set_name:SET_NAME,paper:'Paper 1',question_id:'Q'+(i+1),chapter:u.chapter,subtopic:u.subtopic,skill:u.skill,student_answer:String.fromCharCode(65+v)+'. '+q.o[v],correct_answer:String.fromCharCode(65+q.a)+'. '+q.o[q.a],is_correct:v===q.a,marks_awarded:v===q.a?1:0,marks_total:1})}
async function saveStructured(s,j){const box=document.getElementById(`s${s.num}p${j}`);if(!box||!box.value.trim()||!studentName())return;await profile();const p=s.parts[j],text=box.value.trim(),mark=typeof scoreText==='function'?scoreText(text,p[2],p[1]):0,u=unitParts(s.unit);await post('/api/progress',{student_id:getId(),set_name:SET_NAME,paper:'Paper 2',question_id:`Q${s.num}(${String.fromCharCode(97+j)})`,chapter:u.chapter,subtopic:u.subtopic,skill:u.skill,student_answer:text,correct_answer:p[3]||'',is_correct:mark>=p[1],marks_awarded:mark,marks_total:p[1]})}
async function syncAll(){if(typeof mcq!=='undefined'){for(let i=0;i<mcq.length;i++){if(document.querySelector(`input[name="m${i}"]:checked`))await saveMcq(i)}}if(typeof st!=='undefined'){for(const s of st){for(let j=0;j<s.parts.length;j++){const box=document.getElementById(`s${s.num}p${j}`);if(box?.value.trim())await saveStructured(s,j)}}}}
async function saveAttempt(completed=false){if(!studentName())return;await profile();let score=0,total=0;if(completed){try{const r=JSON.parse(localStorage.getItem((typeof NS!=='undefined'?NS:'spmSciSet3EnglishMOE_')+'result')||'null');if(r){score=Number(r.total||0);total=120}}catch(e){}}await post('/api/attempt',{student_id:getId(),set_name:SET_NAME,paper:'Paper 1 + Paper 2',score,total_marks:total,completed})}
function install(){const n=document.getElementById('name'),c=document.getElementById('cls');if(n)n.addEventListener('change',profile);if(c)c.addEventListener('change',profile);
 document.querySelectorAll('input[type="radio"][name^="m"]').forEach(el=>el.addEventListener('change',()=>{const i=Number(el.name.slice(1));saveMcq(i)}));
 if(typeof st!=='undefined')st.forEach(s=>s.parts.forEach((_,j)=>{const box=document.getElementById(`s${s.num}p${j}`);if(box)box.addEventListener('change',()=>saveStructured(s,j))}));
 if(typeof window.start==='function'){const oldStart=window.start;window.start=function(){const r=oldStart.apply(this,arguments);profile();saveAttempt(false);return r}}
 if(typeof window.submitAll==='function'){const oldSubmit=window.submitAll;window.submitAll=function(){const r=oldSubmit.apply(this,arguments);setTimeout(()=>{syncAll();saveAttempt(true)},150);return r}}
 if(studentName())profile();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
