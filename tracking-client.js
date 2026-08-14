(()=>{
'use strict';
const API='https://spm-science-2026-api.darkgeneration77.workers.dev';
const ID_KEY='science2026_student_id',NAME_KEY='science2026_student_name',CLASS_KEY='science2026_student_class';
const getId=()=>{let id=localStorage.getItem(ID_KEY);if(!id){id=crypto.randomUUID?crypto.randomUUID():'stu-'+Date.now()+'-'+Math.random().toString(36).slice(2);localStorage.setItem(ID_KEY,id)}return id};
async function send(path,data){try{const r=await fetch(API+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data),keepalive:true});return await r.json()}catch(e){return {ok:false,error:e.message}}}
async function profile(name,className=''){localStorage.setItem(NAME_KEY,name);localStorage.setItem(CLASS_KEY,className);return send('/api/student',{student_id:getId(),name,class_name:className})}
function identity(){return {id:getId(),name:localStorage.getItem(NAME_KEY)||'',class_name:localStorage.getItem(CLASS_KEY)||''}}
async function progress(data){const s=identity();if(s.name)await profile(s.name,s.class_name);return send('/api/progress',{student_id:s.id,...data})}
async function attempt(data){const s=identity();if(s.name)await profile(s.name,s.class_name);return send('/api/attempt',{student_id:s.id,...data})}
window.ScienceTracker={API,getId,identity,profile,progress,attempt};
})();
