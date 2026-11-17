(()=>{'use strict';
const A=window.BARAEM_AUDIO_MAP||{};
const letters=[
 ['أ','أسد','🦁'],['ب','بطة','🦆'],['ت','تفاحة','🍎'],['ث','ثعلب','🦊'],['ج','جمل','🐪'],['ح','حصان','🐎'],['خ','خروف','🐑'],['د','دب','🐻'],['ذ','ذرة','🌽'],['ر','رمان','🍎'],['ز','زهرة','🌷'],['س','سمكة','🐟'],['ش','شمس','☀️'],['ص','صقر','🦅'],['ض','ضفدع','🐸'],['ط','طائرة','✈️'],['ظ','ظرف','✉️'],['ع','عصفور','🐦'],['غ','غزال','🦌'],['ف','فيل','🐘'],['ق','قمر','🌙'],['ك','كتاب','📚'],['ل','ليمون','🍋'],['م','موز','🍌'],['ن','نحلة','🐝'],['هـ','هلال','🌙'],['و','وردة','🌹'],['ي','يد','✋']
];
const shapes=[['دائرة','◯','🟢'],['مربع','□','🟨'],['مثلث','△','🔺'],['مستطيل','▭','▰'],['نجمة','★','⭐'],['قلب','♥','❤️'],['بيضاوي','⬭','🥚'],['معين','◇','💠']];
const animals=[['أسد','🦁'],['قطة','🐱'],['كلب','🐶'],['فيل','🐘'],['حصان','🐴'],['زرافة','🦒'],['أرنب','🐰'],['خروف','🐑'],['بقرة','🐮'],['عصفور','🐦'],['سمكة','🐟'],['دجاجة','🐔']];
const lessonInfo={letters:{title:'الحروف العربية',emoji:'🔤',desc:'الحرف ثم الكلمة'},numbers:{title:'الأعداد ٠ إلى ٢٠',emoji:'🔢',desc:'نتعلم العد'},shapes:{title:'الأشكال',emoji:'🟡',desc:'نتعرف على الأشكال'},animals:{title:'الحيوانات',emoji:'🦁',desc:'نتعرف على الحيوانات'}};
const quizInfo={qletters:{title:'أسئلة الحروف',ref:'letters'},qnumbers:{title:'أسئلة الأعداد',ref:'numbers'},qcount:{title:'أسئلة العد',ref:'numbers'},qshapes:{title:'أسئلة الأشكال',ref:'shapes'},qanimals:{title:'أسئلة الحيوانات',ref:'animals'}};
const lessonTypes=Object.keys(lessonInfo),quizTypes=Object.keys(quizInfo);
const audio=document.getElementById('narration'),screen=document.getElementById('screen'),modal=document.getElementById('modalLayer'),toast=document.getElementById('toast');
const key='baraem-albidaya-v2-data';
function safeLoad(){try{return JSON.parse(localStorage.getItem(key))||{}}catch{return {}}}
const store=safeLoad();
store.profiles=store.profiles||{};store.settings=store.settings||{auto:true};
if(!Array.isArray(store.profileNames)||!store.profileNames.length)store.profileNames=['ترف','محمد','نجد'];
for(const name of store.profileNames){store.profiles[name] ||= {correct:0,wrong:0,lessons:{},quiz:{},sessionEnds:0,endsAt:0};}
store.settings.durations ||= Object.fromEntries(store.profileNames.map(n=>[n,15]));
if(store.settings.auto===undefined)store.settings.auto=true;
const session={active:null,page:'profiles',lessonType:null,index:0,quizType:null,quizIndex:0,choices:[],answered:false,locked:false,runId:0,lastStatus:''};
let currentCancel=null,toastTimer=null,tickId=null;
const AudioCtor=window.AudioContext||window.webkitAudioContext;let soundContext=null;const audioBuffers={};
function unlockSound(){if(!AudioCtor)return null;try{soundContext ||= new AudioCtor();if(soundContext.state==='suspended')soundContext.resume().catch(()=>{});return soundContext}catch{return null}}
async function getAudioBuffer(file){const ctx=unlockSound();if(!ctx)throw new Error('Web Audio unavailable');if(!audioBuffers[file])audioBuffers[file]=fetch('assets/audio/'+file+'.mp3').then(r=>{if(!r.ok)throw new Error('No audio '+file);return r.arrayBuffer()}).then(b=>ctx.decodeAudioData(b)).catch(err=>{delete audioBuffers[file];throw err});return audioBuffers[file]}
async function playViaAudioContext(file,clip,token,allowLocked=false){const ctx=unlockSound();if(!ctx)throw new Error('AudioContext unavailable');const buffer=await getAudioBuffer(file);if(token!==session.runId||(session.locked&&!allowLocked))return false;const start=Math.max(0,clip[0]-.02),end=Math.min(buffer.duration,Math.max(start+.1,clip[1]+.025));return new Promise(resolve=>{const node=ctx.createBufferSource();node.buffer=buffer;node.connect(ctx.destination);let done=false;const finish=result=>{if(done)return;done=true;node.onended=null;if(currentCancel===cancel)currentCancel=null;try{node.disconnect()}catch{}resolve(result)};const cancel=()=>{try{node.stop()}catch{}finish(false)};currentCancel=cancel;node.onended=()=>finish(true);node.start(0,start,end-start)})}

function save(){try{localStorage.setItem(key,JSON.stringify(store))}catch(e){console.warn('تعذر حفظ التقدم',e)}}
function escapeHTML(v){return String(v).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]))}
function arabicNumber(n){return String(n).replace(/\d/g,c=>'٠١٢٣٤٥٦٧٨٩'[Number(c)])}
function stamp(ms){const s=Math.max(0,Math.ceil(ms/1000));return arabicNumber(String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0'))}
function profile(n=session.active){return store.profiles[n]}
function showToast(s){toast.textContent=s;toast.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.hidden=true,2700)}
function showModal(html){modal.innerHTML='<div class="modal">'+html+'</div>';modal.hidden=false}
function hideModal(){modal.hidden=true;modal.innerHTML=''}
function playCancel(){session.runId++;if(currentCancel){const fn=currentCancel;currentCancel=null;fn()}audio.pause();if('speechSynthesis' in window)window.speechSynthesis.cancel()}
function setHeader(){const person=document.getElementById('personTag'),timer=document.getElementById('timerTag');person.hidden=!session.active;timer.hidden=!session.active;if(session.active){person.textContent='🌼 '+session.active;const end=profile()?.endsAt||0;timer.textContent='⏳ '+stamp(end-Date.now());}}
function checkLocked(){if(!session.active)return false;const p=profile();if(!p||!p.endsAt)return false;if(Date.now()>=p.endsAt){lockSession();return true}return false}
function startClock(){clearInterval(tickId);tickId=setInterval(()=>{setHeader();if(session.active&&!session.locked)checkLocked()},1000);setHeader()}
function lockSession(){if(session.locked)return;session.locked=true;playCancel();if(profile()) {profile().sessionEnds=(profile().sessionEnds||0)+1;save()};session.page='locked';renderLocked();playWhole('end');}
function playWhole(file){const token=session.runId;if(unlockSound()){getAudioBuffer(file).then(b=>{if(token!==session.runId)return;return playViaAudioContext(file,[0,b.duration],token,file==='end')}).catch(()=>playWholeFallback(file,token))}else playWholeFallback(file,token)}
function playWholeFallback(file,token){if(token!==session.runId)return;audio.pause();audio.src='assets/audio/'+file+'.mp3';audio.load();audio.currentTime=0;audio.play().catch(()=>{showSoundFallback()})}
function showSoundFallback(){let el=document.getElementById('soundFallback');if(!el){el=document.createElement('div');el.id='soundFallback';el.className='sound-fail visible';el.innerHTML='<div>🔇 منع المتصفح الصوت مؤقتًا.</div><button class="btn secondary" id="unlockSound">تشغيل الصوت مرة واحدة</button>';screen.prepend(el)}document.getElementById('unlockSound').onclick=()=>{audio.play().then(()=>el.remove()).catch(()=>showToast('تحقق من مستوى الصوت وإعدادات المتصفح'))}}
function sleep(ms,token){return new Promise(resolve=>{if(token!==session.runId||checkLocked())return resolve(false);setTimeout(()=>resolve(token===session.runId&&!session.locked),ms)})}
function asFull(file){return [0,0, file]}
async function playSlice(file,clip,token){
 if(!store.settings.auto||token!==session.runId||session.locked)return false;
 if(!Array.isArray(clip)||clip.length<2)return false;
 if(unlockSound()){try{return await playViaAudioContext(file,clip,token)}catch(err){console.warn('AudioContext fallback',err)}}
 const url='assets/audio/'+file+'.mp3',start=Math.max(0,clip[0]-0.02),end=Math.max(start+.1,clip[1]+0.025);
 try{
   if(!audio.src.endsWith('/'+file+'.mp3')){audio.src=url;audio.load()}
   if(audio.readyState<1)await new Promise((res,rej)=>{const ok=()=>{clean();res()},bad=()=>{clean();rej(new Error('لا يمكن تحميل الصوت'))};function clean(){audio.removeEventListener('loadedmetadata',ok);audio.removeEventListener('error',bad)}audio.addEventListener('loadedmetadata',ok,{once:true});audio.addEventListener('error',bad,{once:true});});
   if(token!==session.runId||session.locked)return false;
   audio.pause();audio.currentTime=start;
   return await new Promise(resolve=>{
     let done=false;
     const clean=result=>{if(done)return;done=true;audio.removeEventListener('timeupdate',check);audio.removeEventListener('ended',onEnd);if(currentCancel===cancel)currentCancel=null;resolve(result)};
     const check=()=>{if(token!==session.runId||session.locked){audio.pause();clean(false)}else if(audio.currentTime>=end-.02){audio.pause();clean(true)}};
     const onEnd=()=>clean(true),cancel=()=>{audio.pause();clean(false)};currentCancel=cancel;
     audio.addEventListener('timeupdate',check);audio.addEventListener('ended',onEnd);
     audio.play().then(check).catch(err=>{console.warn('audio blocked',err);clean(false);showSoundFallback()});
   });
 }catch(err){console.warn('audio issue',file,err);return false}
}
function voice(text){if(!store.settings.auto||!('speechSynthesis' in window))return;try{window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='ar-SA';u.rate=.85;window.speechSynthesis.speak(u)}catch{}}
function goHome(){playCancel();hideModal();if(!session.active){renderProfiles();return}if(session.locked){renderLocked();return}if(checkLocked())return;session.page='home';renderHome()}
function renderProfiles(){playCancel();session.page='profiles';session.active=null;session.locked=false;setHeader();screen.innerHTML=`<section class="hero"><div class="flower">🌼 🐣 🌼</div><h1>أهلًا في براعم البداية!</h1><p>من سيبدأ الحصة اليوم؟ اختر الطفل، فيبدأ الصوت تلقائيًا وتُحفظ نتائجه باسمه.</p></section><h2 class="small-title">اختر الطفل</h2><div class="profile-grid">${store.profileNames.map((n,i)=>`<button class="kid-card" data-child="${escapeHTML(n)}"><span class="face">${['👧','👦','👧','🌻'][i%4]}</span>${escapeHTML(n)}</button>`).join('')}</div><div class="box-panel"><div class="muted">🔒 ولي الأمر يمكنه ضبط مدة الحصة وإضافة طفل من الإعدادات.</div></div>`;
 screen.querySelectorAll('[data-child]').forEach(b=>b.onclick=()=>beginChild(b.dataset.child));}
function beginChild(name){
 if(!store.profileNames.includes(name))return;playCancel();session.active=name;session.locked=false;const p=profile(name);
 if(p.endsAt&&p.endsAt<=Date.now()){session.locked=true;session.page='locked';renderLocked();return;}
 if(!p.endsAt)p.endsAt=Date.now()+((Number(store.settings.durations[name])||15)*60*1000);
 save();session.page='home';renderHome();
 // أول لمسة على اسم الطفل هي تصريح تشغيل الصوت على الآيفون، دون زر استماع منفصل.
 if(store.settings.auto){unlockSound();playWhole('intro');}
}
function renderHome(){if(checkLocked())return;setHeader();screen.innerHTML=`<section class="hero"><div class="flower">🌿 ✨ 🌿</div><h1>يلا نتعلم يا ${escapeHTML(session.active)}!</h1><p>اختر النشاط، وسيبدأ الكلام بنفسه دون البحث عن زر استماع.</p></section><h2 class="small-title">📚 نتعلم معًا</h2><div class="activities">
 <button class="activity yellow" data-lesson="letters"><span class="emoji">🅰️</span><span class="act-name">الحروف</span><span class="act-desc">الحرف ثم الكلمة</span></button>
 <button class="activity blue" data-lesson="numbers"><span class="emoji">🔢</span><span class="act-name">الأعداد</span><span class="act-desc">من ٠ إلى ٢٠</span></button>
 <button class="activity pink" data-lesson="shapes"><span class="emoji">🔺</span><span class="act-name">الأشكال</span><span class="act-desc">ثمانية أشكال</span></button>
 <button class="activity mint" data-lesson="animals"><span class="emoji">🐘</span><span class="act-name">الحيوانات</span><span class="act-desc">حيوانات ممتعة</span></button></div>
 <h2 class="small-title">🎯 الأسئلة والنجوم</h2><div class="activities">
 <button class="activity white" data-quiz="qletters"><span class="emoji">🔤</span><span class="act-name">أسئلة الحروف</span></button>
 <button class="activity white" data-quiz="qnumbers"><span class="emoji">🔢</span><span class="act-name">أسئلة الأعداد</span></button>
 <button class="activity white" data-quiz="qcount"><span class="emoji">🍎</span><span class="act-name">أسئلة العد</span></button>
 <button class="activity white" data-quiz="qshapes"><span class="emoji">🔷</span><span class="act-name">أسئلة الأشكال</span></button>
 <button class="activity white" data-quiz="qanimals"><span class="emoji">🐶</span><span class="act-name">أسئلة الحيوانات</span></button>
 <button class="activity purple" id="resultsBtn"><span class="emoji">🏆</span><span class="act-name">تقدمي</span><span class="act-desc">النجوم والمحاولات</span></button></div>
 <div class="btnrow"><button id="switchChild" class="btn secondary">👧 تغيير الطفل</button></div>`;
 screen.querySelectorAll('[data-lesson]').forEach(b=>b.onclick=()=>startLesson(b.dataset.lesson));
 screen.querySelectorAll('[data-quiz]').forEach(b=>b.onclick=()=>startQuiz(b.dataset.quiz));
 document.getElementById('resultsBtn').onclick=renderResults;
 document.getElementById('switchChild').onclick=()=>{if(confirm('هل تريد تغيير الطفل؟ ستظل نتائج كل طفل محفوظة.'))renderProfiles()};}
function lessonData(type){if(type==='letters')return letters.map((v,i)=>({label:v[0],word:v[1],emoji:v[2],audio:A.letters?.[i]}));
 if(type==='numbers')return Array.from({length:21},(_,i)=>({label:arabicNumber(i),word:'العدد '+arabicNumber(i),emoji:['🌟','🍎','🍎🍎','🍎🍎🍎'][i<=3?i:0],audio:A.numbers?.[i]}));
 if(type==='shapes')return shapes.map((v,i)=>({label:v[1],word:v[0],emoji:v[2],audio:A.shapes?.[i]}));
 return animals.map((v,i)=>({label:v[1],word:v[0],emoji:v[1],audio:A.animals?.[i]}));}
function startLesson(type){if(checkLocked())return;playCancel();session.lessonType=type;session.index=0;session.page='lesson';renderLesson();runLesson(session.runId)}
function renderLesson(){const items=lessonData(session.lessonType),item=items[session.index],info=lessonInfo[session.lessonType],i=session.index;
 if(!item){finishLesson();return}
 setHeader();screen.innerHTML=`<div class="box-panel"><div class="eyebrow">${info.emoji} ${info.title} | ${arabicNumber(i+1)} من ${arabicNumber(items.length)}</div><div class="learn-card"><div class="learn-glyph">${item.label}</div><div class="learn-emoji">${session.lessonType==='letters'?item.emoji:''}</div><div class="learn-word">${item.word}</div><div class="narration-status"><span class="pulse"></span><span id="audioState">يتحدث تلقائيًا...</span></div><div class="progress-track"><div class="progress-fill" style="width:${Math.floor((i+1)/items.length*100)}%"></div></div><div class="card-footer"><button class="btn secondary" id="previousBtn">السابق</button><button class="btn" id="nextBtn">التالي ⬅</button><button class="btn secondary" id="repeatBtn">🔁 إعادة النطق</button></div></div><div class="btnrow"><button id="backHome" class="btn secondary">⌂ الرئيسية</button></div></div>`;
 document.getElementById('previousBtn').onclick=()=>gotoLesson(Math.max(0,i-1));
 document.getElementById('nextBtn').onclick=()=>gotoLesson(i+1);
 document.getElementById('repeatBtn').onclick=()=>{playCancel();runLesson(session.runId,false)};
 document.getElementById('backHome').onclick=goHome;
}
function gotoLesson(index){playCancel();const len=lessonData(session.lessonType).length;if(index>=len){finishLesson();return}session.index=index;renderLesson();runLesson(session.runId)}
async function runLesson(token,autoAdvance=true){const type=session.lessonType,item=lessonData(type)[session.index];if(!item)return;
 const mark=document.getElementById('audioState');if(mark)mark.textContent='استمع يا '+session.active+'...';
 if(type==='letters'&&item.audio?.length===2){await playSlice('letters',item.audio[0],token);if(token!==session.runId)return;await sleep(1000,token);if(token!==session.runId)return;await playSlice('letters',item.audio[1],token)}
 else if(Array.isArray(item.audio)){await playSlice(type,item.audio,token)}
 else voice(item.word);
 if(token!==session.runId||session.locked)return;
 profile().lessons[type]=Math.max(profile().lessons[type]||0,session.index+1);save();
 const st=document.getElementById('audioState');if(st)st.textContent='أحسنت! 🌸';
 if(autoAdvance && await sleep(2000,token))gotoLesson(session.index+1);
}
function finishLesson(){playCancel();session.page='lessonEnd';const type=session.lessonType;screen.innerHTML=`<section class="hero"><div class="flower">🎉 ⭐ 🎉</div><h1>أبدعت يا ${escapeHTML(session.active)}!</h1><p>أكملت ${escapeHTML(lessonInfo[type].title)}. اختر أسئلة للتجربة، أو ابدأ درسًا آخر.</p><div class="btnrow" style="justify-content:center"><button class="btn" id="lessonQuiz">نبدأ الأسئلة؟</button><button class="btn secondary" id="lessonHome">الرئيسية</button></div></section>`;document.getElementById('lessonQuiz').onclick=()=>startQuiz(({letters:'qletters',numbers:'qnumbers',shapes:'qshapes',animals:'qanimals'})[type]);document.getElementById('lessonHome').onclick=goHome;}
function orderOptions(answer,pool){const rest=pool.filter(x=>x!==answer);for(let i=rest.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[rest[i],rest[j]]=[rest[j],rest[i]];}const options=[answer,...rest.slice(0,3)];for(let i=options.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[options[i],options[j]]=[options[j],options[i]];}return options;}
function quizItems(type){
 if(type==='qletters')return letters.map((v,i)=>({answer:v[0],pool:letters.map(x=>x[0]),spoken:`أين حرف ${v[0]}؟`,audio:A.qletters?.[i],kind:'letter'}));
 if(type==='qnumbers')return Array.from({length:21},(_,i)=>({answer:arabicNumber(i),pool:Array.from({length:21},(_,j)=>arabicNumber(j)),spoken:`أين العدد ${i}؟`}));
 if(type==='qcount')return Array.from({length:11},(_,i)=>({answer:arabicNumber(i),pool:Array.from({length:11},(_,j)=>arabicNumber(j)),spoken:`كم عدد التفاحات؟`,count:i}));
 if(type==='qshapes')return shapes.map((v,i)=>({answer:v[1],pool:shapes.map(x=>x[1]),spoken:`أين شكل ${v[0]}؟`}));
 return animals.slice(0,11).map((v,i)=>({answer:v[1],pool:animals.map(x=>x[1]),spoken:`أين ${v[0]}؟`,audio:A.qanimals?.[i]}));
}
function startQuiz(type){if(checkLocked())return;playCancel();session.page='quiz';session.quizType=type;session.quizIndex=0;session.answered=false;renderQuiz();runQuestion(session.runId)}
function renderQuiz(){const list=quizItems(session.quizType),item=list[session.quizIndex],type=session.quizType;
 if(!item){finishQuiz();return}session.answered=false;session.choices=orderOptions(item.answer,item.pool);setHeader();
 const prefix=type==='qcount'?`<div style="font-size:1.7rem;text-align:center;line-height:2;overflow-wrap:anywhere">${'🍎'.repeat(item.count)||'🧺'}</div>`:'';
 screen.innerHTML=`<div class="box-panel"><div class="quiz-head"><span class="eyebrow">🎯 ${quizInfo[type].title}</span><span class="eyebrow">السؤال ${arabicNumber(session.quizIndex+1)} / ${arabicNumber(list.length)}</span></div><div class="question">${type==='qcount'?'كم تفاحة ترى؟':type==='qnumbers'?'اختر العدد الصحيح':type==='qshapes'?'أين الشكل الصحيح؟':type==='qanimals'?'أين الحيوان؟':'استمع واختر الحرف الصحيح'}</div>${prefix}<div id="questionStatus" class="narration-status"><span class="pulse"></span>السؤال يُقرأ تلقائيًا</div><div class="choices">${session.choices.map((opt,i)=>`<button class="choice" data-opt="${escapeHTML(opt)}">${opt}</button>`).join('')}</div><p id="answerStatus" class="question-note">اضغط على الإجابة التي تراها صحيحة</p><div class="btnrow"><button class="btn secondary" id="repeatQuestion">🔁 إعادة السؤال</button><button class="btn secondary" id="quizBack">⌂ الرئيسية</button></div></div>`;
 screen.querySelectorAll('[data-opt]').forEach(b=>b.onclick=()=>answerQuestion(b));
 document.getElementById('repeatQuestion').onclick=()=>{playCancel();runQuestion(session.runId)};
 document.getElementById('quizBack').onclick=goHome;}
async function runQuestion(token){const item=quizItems(session.quizType)[session.quizIndex];const qtype=session.quizType;
 if(qtype==='qletters'&&item.audio)await playSlice('qletters',item.audio,token);
 else if(qtype==='qanimals'&&item.audio)await playSlice('qanimals',item.audio,token);
 else voice(item.spoken);
 if(token!==session.runId)return;const status=document.getElementById('questionStatus');if(status)status.textContent='اختر الإجابة يا '+session.active+' 🌟';}
function praiseSlice(){const index=store.profileNames.indexOf(session.active);const n=A.cheerNames||[];const group=n.length>=30&&index>=0&&index<3?n.slice(index*10,index*10+10):[];const arr=group.length?group:(A.cheer||[]);return {file:group.length?'cheerNames':'cheer',clip:arr[Math.floor(Math.random()*arr.length)]}}
async function answerQuestion(el){if(session.answered||checkLocked())return;session.answered=true;playCancel();const list=quizItems(session.quizType),item=list[session.quizIndex],correct=el.dataset.opt===item.answer;
 const p=profile();if(correct)p.correct++;else p.wrong++;p.quiz[session.quizType] ||= {correct:0,wrong:0};p.quiz[session.quizType][correct?'correct':'wrong']++;save();
 screen.querySelectorAll('.choice').forEach(b=>{b.disabled=true;if(b.dataset.opt===item.answer)b.classList.add('correct');else if(b===el)b.classList.add('wrong')});
 document.getElementById('answerStatus').textContent=correct?'🎉 أحسنت! إجابة صحيحة':'🌷 نتعلم من المحاولة، الصحيح محدد بالأخضر';
 const token=session.runId;
 if(correct){const pr=praiseSlice();if(pr.clip)await playSlice(pr.file,pr.clip,token);else voice('ممتاز يا '+session.active)}else voice('حاول مرة أخرى');
 if(await sleep(2000,token)){session.quizIndex++;if(session.quizIndex>=list.length)finishQuiz();else{renderQuiz();runQuestion(session.runId)}}
}
function finishQuiz(){playCancel();session.page='quizEnd';screen.innerHTML=`<section class="hero"><div class="flower">🏅 ✨ 🌟</div><h1>انتهت الأسئلة يا ${escapeHTML(session.active)}!</h1><p>كل إجابة تعلّمنا شيئًا جديدًا. يمكنك مشاهدة تقدمك أو تجربة نشاط آخر.</p><div class="btnrow" style="justify-content:center"><button class="btn" id="showResult">🏆 نتائجي</button><button class="btn secondary" id="goHome">الرئيسية</button></div></section>`;document.getElementById('showResult').onclick=renderResults;document.getElementById('goHome').onclick=goHome;}
function renderResults(){if(checkLocked())return;playCancel();session.page='results';const p=profile(),total=(p.correct||0)+(p.wrong||0);
 screen.innerHTML=`<div class="box-panel"><h2>🏆 تقدم ${escapeHTML(session.active)}</h2><p class="muted">هذه النتائج تخص ${escapeHTML(session.active)} وحده، وتُحفظ على هذا الجهاز.</p><div class="results-grid"><div class="stat"><strong>⭐ ${arabicNumber(p.correct||0)}</strong><small>إجابة صحيحة</small></div><div class="stat"><strong>${arabicNumber(p.wrong||0)}</strong><small>إجابة غير صحيحة</small></div><div class="stat"><strong>${arabicNumber(total)}</strong><small>كل المحاولات</small></div></div><h3>نتائج الأسئلة</h3>${quizTypes.map(q=>`<div class="result-row"><b>${quizInfo[q].title}</b><span>✔ ${arabicNumber(p.quiz[q]?.correct||0)} &nbsp; ✕ ${arabicNumber(p.quiz[q]?.wrong||0)}</span></div>`).join('')}<h3>الدروس</h3>${lessonTypes.map(t=>`<div class="result-row"><b>${lessonInfo[t].title}</b><span>${arabicNumber(p.lessons[t]||0)} / ${arabicNumber(lessonData(t).length)}</span></div>`).join('')}<div class="btnrow"><button class="btn secondary" id="homeResult">⌂ الرئيسية</button></div></div>`;
 document.getElementById('homeResult').onclick=goHome;}
function renderLocked(){setHeader();screen.innerHTML=`<section class="hero"><div class="locked-emoji">🔒 ⏰</div><h1>انتهى وقت الحصة يا ${escapeHTML(session.active||'بطلنا')}!</h1><p>أحسنت اليوم. حُفظ تقدمك، والأنشطة مقفلة حتى يسمح ولي الأمر بحصة جديدة.</p><div class="btnrow" style="justify-content:center"><button class="btn" id="parentUnlock">🔑 ولي الأمر</button></div></section>`;document.getElementById('parentUnlock').onclick=()=>authenticate(()=>{profile().endsAt=Date.now()+(Number(store.settings.durations[session.active]||15)*60000);save();session.locked=false;goHome();showToast('بدأت حصة جديدة')});}
function authenticate(next){playCancel();if(!store.pin){showModal(`<h2>🔐 إعداد رمز ولي الأمر</h2><p>رمز من ٤ أرقام يمنع الطفل من فتح الإعدادات أو بدء حصة جديدة.</p><div class="field"><label>الرمز الجديد</label><input id="pinOne" type="password" inputmode="numeric" maxlength="4" placeholder="••••" autocomplete="off"></div><div class="field"><label>أعد الرمز</label><input id="pinTwo" type="password" inputmode="numeric" maxlength="4" placeholder="••••" autocomplete="off"></div><div class="btnrow"><button class="btn" id="savePin">حفظ الرمز</button></div>`);document.getElementById('savePin').onclick=()=>{const a=document.getElementById('pinOne').value,b=document.getElementById('pinTwo').value;if(!/^\d{4}$/.test(a)||a!==b)return showToast('أدخل ٤ أرقام متطابقة');store.pin=a;save();hideModal();if(next)next();};return}
 showModal(`<h2>🔑 مساحة ولي الأمر</h2><p>أدخل رمزك المكوّن من ٤ أرقام.</p><div class="field"><input id="parentCode" type="password" inputmode="numeric" maxlength="4" placeholder="••••" autocomplete="off"></div><div class="btnrow"><button class="btn" id="validatePin">دخول</button><button class="btn secondary" id="closePin">إلغاء</button></div>`);
 document.getElementById('closePin').onclick=hideModal;document.getElementById('validatePin').onclick=()=>{if(document.getElementById('parentCode').value!==store.pin)return showToast('الرمز غير صحيح');hideModal();next?.()};}
function renderSettings(){playCancel();session.page='settings';setHeader();screen.innerHTML=`<div class="box-panel"><h2>⚙️ إعدادات ولي الأمر</h2><p class="muted">الأصوات الأصلية موجودة داخل التطبيق. يبدأ التسجيل تلقائيًا مع الدرس بعد اختيار الطفل.</p><div class="field"><label><input id="autoSpeech" type="checkbox" ${store.settings.auto?'checked':''}> تفعيل الصوت التلقائي</label></div><h3>⏳ مدة الحصة لكل طفل</h3>${store.profileNames.map(n=>`<div class="field"><label>مدة حصة ${escapeHTML(n)} (بالدقائق)</label><input type="number" class="minutes" data-kid="${escapeHTML(n)}" value="${Number(store.settings.durations[n])||15}" min="1" max="180"></div>`).join('')}<div class="btnrow"><button class="btn" id="saveSettings">حفظ الإعدادات</button></div><h3>🌼 إضافة طفل</h3><div class="field"><input id="addKid" maxlength="20" placeholder="اسم الطفل الجديد" autocomplete="off"></div><button class="btn secondary" id="addKidBtn">إضافة طفل</button><div class="warning" style="margin-top:20px">تأكد من حفظ رمز ولي الأمر. هذا قفل داخل التطبيق وليس قفلًا لنظام الآيفون. فعّل «الوصول الموجّه» من إعدادات الآيفون إذا كنت تريد إبقاء الطفل داخل التطبيق.</div><div class="btnrow"><button class="btn secondary" id="backFromSettings">الرئيسية</button></div></div>`;
 document.getElementById('saveSettings').onclick=()=>{const durations={};for(const el of screen.querySelectorAll('.minutes')){const n=Number(el.value);if(!Number.isInteger(n)||n<1||n>180)return showToast('أدخل مدة صحيحة من ١ إلى ١٨٠ دقيقة');durations[el.dataset.kid]=n;}store.settings.durations=durations;store.settings.auto=document.getElementById('autoSpeech').checked;save();showToast('حُفظت الإعدادات. المدة الجديدة تسري على الحصة التالية.')};
 document.getElementById('addKidBtn').onclick=()=>{const n=document.getElementById('addKid').value.trim();if(n.length<2)return showToast('اكتب اسمًا لا يقل عن حرفين');if(store.profileNames.includes(n))return showToast('الاسم موجود');store.profileNames.push(n);store.profiles[n]={correct:0,wrong:0,lessons:{},quiz:{},sessionEnds:0,endsAt:0};store.settings.durations[n]=15;save();renderSettings();showToast('أُضيف الطفل')};
 document.getElementById('backFromSettings').onclick=goHome;}
function start(){document.getElementById('homeBtn').onclick=goHome;document.getElementById('parentBtn').onclick=()=>authenticate(renderSettings);renderProfiles();startClock();if(!store.pin)authenticate(()=>{hideModal();renderProfiles()});}
start();
})();
