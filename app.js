const KEY='todayWorkoutDataV1';
const exercises=['스쿼트','벤치프레스','데드리프트','랫풀다운','시티드 로우','숄더프레스','레그프레스','레그컬','레그익스텐션','힙쓰러스트','덤벨 컬','트라이셉스 푸시다운','푸시업','풀업','플랭크','러닝','사이클'];
const defaults={routines:[{id:'r1',name:'전신 기본',exercises:['스쿼트','벤치프레스','랫풀다운']},{id:'r2',name:'하체 집중',exercises:['스쿼트','레그프레스','레그컬','힙쓰러스트']},{id:'r3',name:'상체 집중',exercises:['벤치프레스','시티드 로우','숄더프레스','덤벨 컬']}],sessions:[],theme:'light'};
let data=load(),active=null,workoutTick=null,restTick=null,restSeconds=90,deferredPrompt=null;
let currentView='homeView',previousView='homeView',calendarDate=new Date();
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];

function load(){try{const saved=JSON.parse(localStorage.getItem(KEY)||'{}');return{...defaults,...saved,routines:Array.isArray(saved.routines)?saved.routines:defaults.routines,sessions:Array.isArray(saved.sessions)?saved.sessions:[]}}catch{return structuredClone(defaults)}}
function save(){localStorage.setItem(KEY,JSON.stringify(data))}
function esc(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function fmt(n){return new Intl.NumberFormat('ko-KR',{maximumFractionDigits:1}).format(n||0)}
function volume(session){return (session.exercises||[]).reduce((a,e)=>a+(e.sets||[]).filter(s=>s.done).reduce((x,s)=>x+(+s.weight||0)*(+s.reps||0),0),0)}
function duration(sec){return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`}
function dayKey(value){const d=new Date(value);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}
function empty(msg){return `<div class="empty">${msg}</div>`}

function go(id,{remember=true}={}){
  if(remember&&id!==currentView)previousView=currentView;
  currentView=id;
  $$('.view').forEach(v=>v.classList.toggle('active',v.id===id));
  $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.go===id));
  $('.bottom-nav').style.display=id==='workoutView'?'none':'grid';
  if(id!=='workoutView')renderAll();
  scrollTo(0,0);
}
function goBack(){
  if(currentView==='workoutView'){closeWorkout();return}
  const target=previousView&&previousView!==currentView?previousView:'homeView';
  previousView='homeView';go(target,{remember:false});
}
function renderAll(){renderHome();renderRoutines();renderHistory();document.body.classList.toggle('dark',data.theme==='dark')}

function renderHome(){
  const now=new Date();
  $('#todayLabel').textContent=new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'long'}).format(now);
  const start=new Date(now);start.setDate(now.getDate()-6);start.setHours(0,0,0,0);
  const week=data.sessions.filter(s=>new Date(s.startedAt)>=start);
  $('#weekCount').textContent=week.length;
  $('#weekVolume').textContent=`총 볼륨 ${fmt(week.reduce((a,s)=>a+volume(s),0))} kg`;
  const days=[...Array(7)].map((_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);const ss=week.filter(s=>dayKey(s.startedAt)===dayKey(d));return{d,vol:ss.reduce((a,s)=>a+volume(s),0),worked:ss.length>0}});
  const max=Math.max(...days.map(d=>d.vol),1);
  $('#weekBars').innerHTML=days.map(x=>`<div class="bar-wrap"><div class="bar ${x.worked?'worked':''}" style="height:${x.worked?Math.max(12,x.vol/max*90):5}%"></div><small>${['일','월','화','수','목','금','토'][x.d.getDay()]}</small></div>`).join('');
  $('#quickRoutines').innerHTML=data.routines.slice(0,3).map(r=>routineCard(r,false)).join('')||empty('루틴을 만들면 빠르게 시작할 수 있어요.');
  $('#recentList').innerHTML=sortedSessions().slice(0,3).map(historyCard).join('')||empty('첫 운동을 기록해 보세요.');
  $('#streakBadge').textContent=`${streak()}일 연속`;
}
function streak(){const keys=new Set(data.sessions.map(s=>dayKey(s.startedAt)));let n=0,d=new Date();if(!keys.has(dayKey(d)))d.setDate(d.getDate()-1);while(keys.has(dayKey(d))){n++;d.setDate(d.getDate()-1)}return n}
function sortedSessions(){return data.sessions.slice().sort((a,b)=>new Date(b.startedAt)-new Date(a.startedAt))}
function routineCard(r,tools){return `<article class="routine-card" data-start="${esc(r.id)}"><div class="routine-icon">${r.exercises.length}</div><div class="routine-copy"><b>${esc(r.name)}</b><p>${esc(r.exercises.join(' · '))}</p></div>${tools?`<div class="routine-tools"><button class="mini-btn" data-delete-routine="${esc(r.id)}" aria-label="루틴 삭제">삭제</button></div>`:'<span class="arrow">›</span>'}</article>`}
function renderRoutines(){$('#routineGrid').innerHTML=data.routines.map(r=>routineCard(r,true)).join('')||empty('아직 저장한 루틴이 없어요.')}

function renderHistory(){
  const sessions=sortedSessions();
  $('#totalSessions').textContent=sessions.length;
  $('#totalSets').textContent=sessions.reduce((a,s)=>a+(s.exercises||[]).reduce((x,e)=>x+(e.sets||[]).filter(z=>z.done).length,0),0);
  $('#totalVolume').textContent=fmt(sessions.reduce((a,s)=>a+volume(s),0))+'kg';
  $('#recordCount').textContent=`${sessions.length}개`;
  $('#historyList').innerHTML=sessions.map(historyCard).join('')||empty('운동을 완료하면 여기에 쌓입니다.');
  renderCalendar();renderLineChart();
}
function historyCard(s){const d=new Date(s.startedAt),sets=(s.exercises||[]).reduce((a,e)=>a+(e.sets||[]).filter(x=>x.done).length,0);return `<article class="history-card"><div class="date-box"><b>${d.getDate()}</b><span>${d.getMonth()+1}월</span></div><div><b>${esc(s.name)}</b><p>${esc((s.exercises||[]).map(e=>e.name).join(' · '))}</p></div><div class="history-meta"><b>${fmt(volume(s))} kg</b>${sets}세트 · ${Math.max(1,Math.round((s.duration||0)/60))}분</div></article>`}

function renderCalendar(){
  const year=calendarDate.getFullYear(),month=calendarDate.getMonth();
  $('#calendarTitle').textContent=`${year}년 ${month+1}월`;
  const firstDay=new Date(year,month,1).getDay(),lastDate=new Date(year,month+1,0).getDate();
  const counts={};data.sessions.forEach(s=>{const key=dayKey(s.startedAt);counts[key]=(counts[key]||0)+1});
  const today=dayKey(new Date()),cells=[];
  for(let i=0;i<firstDay;i++)cells.push('<span class="calendar-day empty"></span>');
  for(let day=1;day<=lastDate;day++){
    const key=`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`,count=counts[key]||0;
    cells.push(`<span class="calendar-day ${key===today?'today':''} ${count?'worked':''} ${count>1?'multi':''}" ${count>1?`data-count="${count}"`:''} aria-label="${month+1}월 ${day}일${count?`, 운동 ${count}회`:''}">${day}</span>`);
  }
  $('#calendarGrid').innerHTML=cells.join('');
}
function renderLineChart(){
  const end=new Date();end.setHours(0,0,0,0);const points=[];
  for(let i=13;i>=0;i--){const d=new Date(end);d.setDate(end.getDate()-i);const sessions=data.sessions.filter(s=>dayKey(s.startedAt)===dayKey(d));points.push({d,value:sessions.reduce((a,s)=>a+volume(s),0)})}
  const total=points.reduce((a,p)=>a+p.value,0);$('#chartSummary').textContent=`${fmt(total)} kg`;
  if(!points.some(p=>p.value>0)){ $('#lineChart').innerHTML='<div class="chart-empty">운동을 저장하면 변화가 선으로 표시됩니다.</div>';return }
  const W=540,H=180,pad={l:10,r:10,t:16,b:28},max=Math.max(...points.map(p=>p.value),1);
  const coords=points.map((p,i)=>({x:pad.l+i*(W-pad.l-pad.r)/(points.length-1),y:pad.t+(1-p.value/max)*(H-pad.t-pad.b),...p}));
  const line=coords.map((p,i)=>`${i?'L':'M'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const area=`M ${coords[0].x} ${H-pad.b} ${line.replace(/^M /,'L ')} L ${coords.at(-1).x} ${H-pad.b} Z`;
  const grids=[0,.5,1].map(r=>`<line class="chart-grid-line" x1="${pad.l}" y1="${pad.t+r*(H-pad.t-pad.b)}" x2="${W-pad.r}" y2="${pad.t+r*(H-pad.t-pad.b)}"/>`).join('');
  const dots=coords.map(p=>p.value?`<circle class="chart-dot" cx="${p.x}" cy="${p.y}" r="4"><title>${p.d.getMonth()+1}/${p.d.getDate()} · ${fmt(p.value)}kg</title></circle>`:'').join('');
  const labels=coords.map((p,i)=>i%3===0||i===coords.length-1?`<text class="chart-label" x="${p.x}" y="${H-8}" text-anchor="middle">${p.d.getMonth()+1}/${p.d.getDate()}</text>`:'').join('');
  $('#lineChart').innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img"><path class="chart-area" d="${area}"/>${grids}<path class="chart-line" d="${line}"/>${dots}${labels}</svg>`;
}

function makeExercise(name){return{id:crypto.randomUUID(),name,sets:[{weight:'',reps:'',done:false},{weight:'',reps:'',done:false},{weight:'',reps:'',done:false}]}}
function startWorkout(routine){active={id:crypto.randomUUID(),name:routine?.name||'오늘의 운동',memo:'',startedAt:new Date().toISOString(),elapsed:0,exercises:(routine?.exercises||[]).map(makeExercise)};$('#workoutName').value=active.name;$('#workoutMemo').value='';renderWorkout();go('workoutView');clearInterval(workoutTick);workoutTick=setInterval(()=>{active.elapsed++;$('#workoutTimer').textContent=duration(active.elapsed)},1000)}
function renderWorkout(){$('#workoutTimer').textContent=duration(active?.elapsed||0);$('#activeExercises').innerHTML=active?.exercises.map((e,ei)=>`<article class="exercise-card"><div class="exercise-title"><h3>${esc(e.name)}</h3><button class="mini-btn" data-remove-ex="${ei}">삭제</button></div><div class="set-head"><span>세트</span><span>kg</span><span>횟수</span><span>완료</span></div>${e.sets.map((s,si)=>`<div class="set-row"><span>${si+1}</span><input inputmode="decimal" aria-label="${esc(e.name)} ${si+1}세트 중량" data-field="weight" data-ei="${ei}" data-si="${si}" value="${esc(s.weight)}" placeholder="0"><input inputmode="numeric" aria-label="${esc(e.name)} ${si+1}세트 반복" data-field="reps" data-ei="${ei}" data-si="${si}" value="${esc(s.reps)}" placeholder="0"><button class="check-set ${s.done?'done':''}" data-check="${ei}:${si}" aria-label="세트 완료">${s.done?'✓':'○'}</button></div>`).join('')}<button class="add-set" data-add-set="${ei}">+ 세트 추가</button></article>`).join('')||empty('운동을 추가한 뒤 세트와 중량을 기록하세요.')}
function showExerciseDialog(){renderExerciseChoices('');$('#exerciseDialog').showModal();setTimeout(()=>$('#exerciseSearch').focus(),50)}
function renderExerciseChoices(q){const list=exercises.filter(x=>x.includes(q.trim())).slice(0,12);$('#exerciseChoices').innerHTML=list.map(x=>`<button type="button" class="choice-btn" data-add-ex="${esc(x)}">${esc(x)}</button>`).join('')||empty('검색 결과가 없어요. 아래에서 직접 추가하세요.')}
function addExercise(name){if(!name.trim())return;active.exercises.push(makeExercise(name.trim()));renderWorkout();$('#exerciseDialog').close();toast(`${name.trim()} 추가`)}
function finishWorkout(){if(!active)return;const doneSets=active.exercises.reduce((a,e)=>a+e.sets.filter(s=>s.done).length,0);if(!doneSets&&!confirm('완료한 세트가 없습니다. 그래도 저장할까요?'))return;active.name=$('#workoutName').value.trim()||'오늘의 운동';active.memo=$('#workoutMemo').value.trim();active.duration=active.elapsed;data.sessions.push(active);save();clearInterval(workoutTick);stopRest();active=null;calendarDate=new Date();go('historyView');toast('운동 기록을 저장하고 누적했어요')}
function closeWorkout(){if(active&&!confirm('진행 중인 기록을 버리고 이전 화면으로 갈까요?'))return;clearInterval(workoutTick);stopRest();active=null;go(previousView==='workoutView'?'homeView':previousView,{remember:false})}
function startRest(){restSeconds=90;$('#restTimer').hidden=false;updateRest();clearInterval(restTick);restTick=setInterval(()=>{restSeconds--;updateRest();if(restSeconds<=0){stopRest();toast('휴식 끝! 다음 세트를 시작하세요.');if(navigator.vibrate)navigator.vibrate([150,80,150])}},1000)}
function updateRest(){$('#restTime').textContent=duration(Math.max(0,restSeconds))}
function stopRest(){clearInterval(restTick);$('#restTimer').hidden=true}
function exportData(){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`오늘운동-${dayKey(new Date())}.json`;a.click();URL.revokeObjectURL(a.href)}

function initEvents(){
  document.addEventListener('click',e=>{
    const back=e.target.closest('[data-back]');if(back){goBack();return}
    const goBtn=e.target.closest('[data-go]');if(goBtn)go(goBtn.dataset.go);
    const start=e.target.closest('[data-start]');if(start&&!e.target.closest('[data-delete-routine]'))startWorkout(data.routines.find(x=>x.id===start.dataset.start));
    const del=e.target.closest('[data-delete-routine]');if(del){e.stopPropagation();if(confirm('이 루틴을 삭제할까요?')){data.routines=data.routines.filter(r=>r.id!==del.dataset.deleteRoutine);save();renderAll()}}
    const add=e.target.closest('[data-add-ex]');if(add)addExercise(add.dataset.addEx);
    const check=e.target.closest('[data-check]');if(check){const [ei,si]=check.dataset.check.split(':').map(Number),s=active.exercises[ei].sets[si];s.done=!s.done;renderWorkout();if(s.done)startRest()}
    const aset=e.target.closest('[data-add-set]');if(aset){const sets=active.exercises[+aset.dataset.addSet].sets,last=sets.at(-1)||{};sets.push({weight:last.weight||'',reps:last.reps||'',done:false});renderWorkout()}
    const rem=e.target.closest('[data-remove-ex]');if(rem){active.exercises.splice(+rem.dataset.removeEx,1);renderWorkout()}
  });
  document.addEventListener('input',e=>{if(e.target.matches('[data-field]'))active.exercises[+e.target.dataset.ei].sets[+e.target.dataset.si][e.target.dataset.field]=e.target.value});
  $('#blankWorkoutBtn').onclick=$('#navStartBtn').onclick=()=>startWorkout();
  $('#addExerciseBtn').onclick=showExerciseDialog;$('#exerciseSearch').oninput=e=>renderExerciseChoices(e.target.value);$('#customAddBtn').onclick=()=>addExercise($('#customExercise').value);
  $('#finishWorkoutBtn').onclick=finishWorkout;$('#closeWorkoutBtn').onclick=closeWorkout;
  $('#workoutName').oninput=e=>{if(active)active.name=e.target.value};$('#workoutMemo').oninput=e=>{if(active)active.memo=e.target.value};
  $('#skipRest').onclick=stopRest;$('#minusRest').onclick=()=>{restSeconds=Math.max(0,restSeconds-15);updateRest()};$('#plusRest').onclick=()=>{restSeconds+=15;updateRest()};
  $('#themeBtn').onclick=()=>{data.theme=data.theme==='dark'?'light':'dark';save();renderAll()};
  $('#prevMonth').onclick=()=>{calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth()-1,1);renderCalendar()};
  $('#nextMonth').onclick=()=>{calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth()+1,1);renderCalendar()};
  $('#addRoutineBtn').onclick=()=>$('#routineDialog').showModal();
  $('#routineForm').addEventListener('submit',e=>{e.preventDefault();const name=$('#routineNameInput').value.trim(),list=$('#routineExercisesInput').value.split('\n').map(x=>x.trim()).filter(Boolean);if(!name||!list.length)return;data.routines.push({id:crypto.randomUUID(),name,exercises:list});save();$('#routineDialog').close();e.target.reset();renderAll();toast('루틴을 저장했어요')});
  $('#exportBtn').onclick=exportData;
  $('#importInput').onchange=async e=>{try{const incoming=JSON.parse(await e.target.files[0].text());if(!Array.isArray(incoming.sessions)||!Array.isArray(incoming.routines))throw 0;data={...defaults,...incoming};save();calendarDate=new Date();renderAll();toast('기록을 가져오고 누적 통계를 갱신했어요')}catch{alert('올바른 오늘운동 백업 파일이 아닙니다.')}};
  $('#resetBtn').onclick=()=>{if(confirm('모든 운동 기록을 삭제할까요? 이 작업은 되돌릴 수 없습니다.')){data.sessions=[];save();renderAll();toast('기록을 삭제했어요')}};
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e});
  $('#installBtn').onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null}else toast('브라우저 메뉴에서 홈 화면에 추가하세요')};
}

initEvents();renderAll();
if('serviceWorker'in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js');
