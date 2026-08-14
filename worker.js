const JSON_HEADERS={'content-type':'application/json;charset=UTF-8'};
const cors={
  'access-control-allow-origin':'*',
  'access-control-allow-methods':'GET,POST,OPTIONS',
  'access-control-allow-headers':'content-type,x-teacher-key'
};
const ok=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...JSON_HEADERS,...cors}});
const bad=(message,status=400)=>ok({ok:false,error:message},status);
const now=()=>new Date().toISOString();
const body=async req=>{try{return await req.json()}catch{return {}}};
const teacherOK=(req,env)=>!!env.TEACHER_KEY&&req.headers.get('x-teacher-key')===env.TEACHER_KEY;

function weakness(rows){
  const map={};
  for(const r of rows){
    const key=(r.chapter||'Unclassified')+'||'+(r.subtopic||'General');
    if(!map[key])map[key]={chapter:r.chapter||'Unclassified',subtopic:r.subtopic||'General',total:0,correct:0,wrong:0};
    map[key].total++; if(Number(r.is_correct))map[key].correct++; else map[key].wrong++;
  }
  return Object.values(map).map(x=>{
    x.accuracy=x.total?Math.round(x.correct/x.total*100):0;
    if(x.accuracy<50){x.level='Weak';x.remedy=`Relearn ${x.subtopic}; review key concepts and redo at least 3 similar questions.`}
    else if(x.accuracy<75){x.level='Developing';x.remedy=`Review mistakes in ${x.subtopic} and complete 2 targeted practice questions.`}
    else{x.level='Secure';x.remedy=`Maintain ${x.subtopic} with spaced revision.`}
    return x;
  }).sort((a,b)=>a.accuracy-b.accuracy||b.total-a.total);
}

export default {
async fetch(req,env){
  if(req.method==='OPTIONS')return new Response(null,{headers:cors});
  if(!env.DB)return bad('D1 binding DB is missing',500);
  const u=new URL(req.url), p=u.pathname;
  try{
    if(p==='/api/health')return ok({ok:true,time:now()});

    if(p==='/api/student/upsert'&&req.method==='POST'){
      const d=await body(req); if(!d.id||!d.name)return bad('id and name are required');
      await env.DB.prepare(`INSERT INTO students(id,name,class_name,created_at,updated_at,last_seen_at) VALUES(?,?,?,?,?,?)
        ON CONFLICT(id) DO UPDATE SET name=excluded.name,class_name=excluded.class_name,updated_at=excluded.updated_at,last_seen_at=excluded.last_seen_at`)
        .bind(d.id,String(d.name).trim(),d.class_name||'',now(),now(),now()).run();
      return ok({ok:true,id:d.id});
    }

    if(p==='/api/progress'&&req.method==='POST'){
      const d=await body(req); if(!d.attempt_id||!d.student_id||!d.set_id)return bad('attempt_id, student_id and set_id are required');
      await env.DB.prepare(`INSERT INTO attempts(id,student_id,set_id,set_label,paper,status,current_question,attempted_count,total_questions,score,max_score,percent,started_at,updated_at,completed_at)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET paper=excluded.paper,status=excluded.status,current_question=excluded.current_question,attempted_count=excluded.attempted_count,total_questions=excluded.total_questions,score=excluded.score,max_score=excluded.max_score,percent=excluded.percent,updated_at=excluded.updated_at,completed_at=excluded.completed_at`)
       .bind(d.attempt_id,d.student_id,d.set_id,d.set_label||d.set_id,d.paper||'',d.status||'in_progress',d.current_question||'',Number(d.attempted_count||0),Number(d.total_questions||0),Number(d.score||0),Number(d.max_score||0),Number(d.percent||0),d.started_at||now(),now(),d.status==='completed'?(d.completed_at||now()):null).run();
      await env.DB.prepare(`UPDATE students SET updated_at=?,last_seen_at=? WHERE id=?`).bind(now(),now(),d.student_id).run();
      return ok({ok:true});
    }

    if(p==='/api/answer'&&req.method==='POST'){
      const d=await body(req); if(!d.attempt_id||!d.student_id||!d.set_id||!d.question_id)return bad('missing answer identifiers');
      await env.DB.prepare(`INSERT INTO answers(attempt_id,student_id,set_id,paper,question_id,chapter,subtopic,skill,student_answer,correct_answer,is_correct,marks_awarded,marks_total,explanation,answered_at,updated_at)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(attempt_id,question_id) DO UPDATE SET student_answer=excluded.student_answer,correct_answer=excluded.correct_answer,is_correct=excluded.is_correct,marks_awarded=excluded.marks_awarded,marks_total=excluded.marks_total,explanation=excluded.explanation,updated_at=excluded.updated_at`)
       .bind(d.attempt_id,d.student_id,d.set_id,d.paper||'',d.question_id,d.chapter||'',d.subtopic||'',d.skill||'',String(d.student_answer??''),String(d.correct_answer??''),d.is_correct?1:0,Number(d.marks_awarded||0),Number(d.marks_total||0),d.explanation||'',d.answered_at||now(),now()).run();
      return ok({ok:true});
    }

    const studentMatch=p.match(/^\/api\/student\/([^/]+)\/dashboard$/);
    if(studentMatch&&req.method==='GET'){
      const sid=decodeURIComponent(studentMatch[1]);
      const student=await env.DB.prepare(`SELECT * FROM students WHERE id=?`).bind(sid).first();
      if(!student)return bad('student not found',404);
      const attempts=(await env.DB.prepare(`SELECT * FROM attempts WHERE student_id=? ORDER BY updated_at DESC`).bind(sid).all()).results||[];
      const answers=(await env.DB.prepare(`SELECT * FROM answers WHERE student_id=? ORDER BY answered_at DESC`).bind(sid).all()).results||[];
      const wrong=answers.filter(x=>!Number(x.is_correct));
      return ok({ok:true,student,attempts,wrong_answers:wrong.slice(0,100),weaknesses:weakness(answers)});
    }

    if(p==='/api/teacher/students'&&req.method==='GET'){
      if(!teacherOK(req,env))return bad('unauthorized',401);
      const rows=(await env.DB.prepare(`SELECT s.*,
        COUNT(DISTINCT a.id) attempts,
        SUM(CASE WHEN a.status='completed' THEN 1 ELSE 0 END) completed,
        MAX(a.updated_at) last_activity,
        ROUND(AVG(CASE WHEN a.max_score>0 THEN a.percent END),1) avg_percent
        FROM students s LEFT JOIN attempts a ON a.student_id=s.id
        GROUP BY s.id ORDER BY COALESCE(last_activity,s.last_seen_at,s.created_at) DESC`).all()).results||[];
      return ok({ok:true,students:rows});
    }

    const teacherStudent=p.match(/^\/api\/teacher\/student\/([^/]+)$/);
    if(teacherStudent&&req.method==='GET'){
      if(!teacherOK(req,env))return bad('unauthorized',401);
      const sid=decodeURIComponent(teacherStudent[1]);
      const student=await env.DB.prepare(`SELECT * FROM students WHERE id=?`).bind(sid).first();
      if(!student)return bad('student not found',404);
      const attempts=(await env.DB.prepare(`SELECT * FROM attempts WHERE student_id=? ORDER BY updated_at DESC`).bind(sid).all()).results||[];
      const answers=(await env.DB.prepare(`SELECT * FROM answers WHERE student_id=? ORDER BY answered_at DESC`).bind(sid).all()).results||[];
      return ok({ok:true,student,attempts,answers,wrong_answers:answers.filter(x=>!Number(x.is_correct)),weaknesses:weakness(answers)});
    }

    return bad('not found',404);
  }catch(e){return bad(e.message||'server error',500)}
}
};
