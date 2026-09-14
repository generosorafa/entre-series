import {Workout,DEFAULT_WORKOUT,validWorkout,duration} from './workout.js';
import {format} from './timer.js';
import {workoutTrack} from './workout-audio.js';
import {voiceData} from './voice-en.js';

const $=s=>document.querySelector(s),audio=$('#audio'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
const key='entre-series-hiit-v1',prefsKey='entre-series-hiit-settings-v1';
function read(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch{return null}}
function save(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}
const saved=read(prefsKey),quick=read('xamai-settings-v1');
const workout=new Workout(validWorkout(saved?.config)?saved.config:DEFAULT_WORKOUT);
let options={voice:saved?.voice===true,bells:saved?.bells!==false,pocket:saved?.pocket??(quick?.mode==='pocket')};
const samples=Object.fromEntries(Object.entries(voiceData).map(([n,b64])=>{const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0)),v=new DataView(bytes.buffer);return [n,Int16Array.from({length:bytes.length/2},(_,i)=>v.getInt16(i*2,true))]}));
let frame=0,blobURL=null,generation=0,preparing=false,wake=null,lastSave=0,lastState='',lastSecond=-1,completed=false,registration=null;
const audible=()=>options.voice||options.bells||options.pocket;
const previous=read(key);
if(previous?.options){options={voice:previous.options.voice===true,bells:previous.options.bells===true,pocket:previous.options.pocket===true};if(!workout.restore(previous.workout,audible()))options={voice:saved?.voice===true,bells:saved?.bells!==false,pocket:saved?.pocket===true}}
completed=workout.state==='done';
function setFields(){for(const name of ['rounds','work','rest'])$('#'+name).value=workout.config[name];for(const name of ['voice','bells','pocket'])$('#'+name).checked=options[name]}
setFields();
function persist(){save(key,{workout:workout.snapshot(),options})}
function message(text){$('#workout-message').textContent=text}
function configFromFields(){return {rounds:Number($('#rounds').value),work:Number($('#work').value),rest:Number($('#rest').value)}}
function preferences(){save(prefsKey,{config:workout.config,...options})}
function summary(){const c=configFromFields();$('#workout-summary').textContent=validWorkout(c)?format(duration(c)*1000)+' no total · sem descanso após a última série.':'Use 1–30 séries e até 600 s por etapa. Máximo de 30 minutos no total.';$('#main-action').disabled=preparing||(!validWorkout(c)&&workout.state!=='running'&&workout.state!=='paused')}
function render(){
 const p=workout.current(),busy=workout.state==='running'||workout.state==='paused';
 $('.hiit-app').classList.toggle('rest-phase',p.kind==='rest'&&workout.state!=='done');
 $('#phase-label').textContent=workout.state==='done'?'CONCLUÍDO':p.kind==='work'?'EXERCÍCIO':'DESCANSO';
 $('#round-label').textContent='Série '+p.round+' de '+workout.config.rounds;
 $('#time').textContent=format(p.remaining*1000);
 let fraction=(reduced.matches?Math.ceil(p.remaining):p.remaining)/p.seconds;
 $('.progress').style.strokeDashoffset=String(100*(1-Math.min(1,Math.max(0,fraction))));$('.progress').style.opacity=p.remaining===0?'0':'1';
 $('#duration').textContent=workout.state==='done'?format(workout.total*1000)+' de treino':p.kind==='rest'?'Depois: exercício · série '+(p.round+1):p.round===workout.config.rounds?'Última série':workout.config.rest?'Depois: '+workout.config.rest+' s de descanso':'Depois: série '+(p.round+1);
 const state=preparing?'Preparando áudio…':workout.state==='paused'?'Treino pausado.':workout.state==='done'?'Treino concluído. Bom trabalho!':workout.state==='idle'?'Pronto para a primeira série.':(p.kind==='work'?'Exercício':'Descanso')+' · série '+p.round+' de '+workout.config.rounds;
 if(state!==lastState){$('#state').textContent=state;lastState=state}
 $('#main-action').textContent=preparing?'Preparando…':workout.state==='running'?'Pausar':workout.state==='paused'?'Continuar':workout.state==='done'?'Repetir treino':'Iniciar treino';
 $('#workout-fields').disabled=busy||preparing;$('#sound-fields').disabled=busy||preparing;$('#end-workout').disabled=!busy&&!preparing;
 document.title=workout.state==='running'?format(p.remaining*1000)+' · '+(p.kind==='work'?'Exercício':'Descanso')+' · ENTRE SÉRIES':'ENTRE SÉRIES — HIIT';
 summary();if(Math.ceil(p.remaining)!==lastSecond){lastSecond=Math.ceil(p.remaining);updateMedia()}
}
function releaseWake(){if(wake){void wake.release().catch(()=>{});wake=null}}
async function acquireWake(){if(!navigator.wakeLock||document.hidden||workout.state!=='running'||wake)return;try{const lock=await navigator.wakeLock.request('screen');if(workout.state!=='running'){await lock.release();return}wake=lock;lock.addEventListener('release',()=>{if(wake===lock)wake=null},{once:true})}catch{}}
function stopAudio(){audio.pause();audio.removeAttribute('src');audio.load();if(blobURL){URL.revokeObjectURL(blobURL);blobURL=null}if(navigator.mediaSession){navigator.mediaSession.playbackState='none';navigator.mediaSession.metadata=null}}
function loadTrack(config=workout.config,settings=options){if(blobURL)URL.revokeObjectURL(blobURL);blobURL=URL.createObjectURL(workoutTrack(config,settings,samples));audio.src=blobURL;audio.load()}
function setupMedia(){if(!navigator.mediaSession)return;try{navigator.mediaSession.metadata=new MediaMetadata({title:'HIIT · '+workout.config.rounds+' séries',artist:'ENTRE SÉRIES',album:format(workout.total*1000)+' de treino',artwork:[{src:new URL('./icons/icon-512.png',location.href).href,sizes:'512x512',type:'image/png'}]});for(const [action,handler] of Object.entries({play:()=>resume(),pause:()=>pause(),stop:()=>pause(),seekbackward:null,seekforward:null,seekto:null,nexttrack:null,previoustrack:null})){try{navigator.mediaSession.setActionHandler(action,handler)}catch{}}updateMedia()}catch{}}
function updateMedia(){if(!navigator.mediaSession||!audio.src)return;try{navigator.mediaSession.playbackState=audio.paused?'paused':'playing';if(Number.isFinite(audio.duration)&&audio.duration>0)navigator.mediaSession.setPositionState({duration:audio.duration,playbackRate:1,position:Math.min(audio.duration,Math.max(0,audio.currentTime))})}catch{}}
function finish(){if(completed)return;completed=true;releaseWake();persist();if(registration&&'Notification'in window&&Notification.permission==='granted')void registration.showNotification('ENTRE SÉRIES',{body:'Treino HIIT concluído. '+workout.config.rounds+' séries finalizadas.',icon:'./icons/icon-192.png',tag:'entre-series-hiit',data:{url:new URL('./hiit.html',location.href).href}}).catch(()=>{});render()}
function sync(){if(workout.state!=='running'||preparing)return;if(audible()&&audio.src){workout.seek(audio.currentTime);workout.anchor=Date.now()-workout.elapsed*1000}else workout.tick();if(workout.state==='done')finish()}
function tick(){cancelAnimationFrame(frame);sync();render();if(Date.now()-lastSave>=1000){persist();lastSave=Date.now()}if(workout.state==='running'&&!document.hidden)frame=requestAnimationFrame(tick)}
async function playFromPosition(id){
 preparing=true;render();
 try{
  if(!audio.src){loadTrack();const elapsed=workout.elapsed;if(elapsed){audio.currentTime=elapsed;audio.addEventListener('loadedmetadata',()=>{if(id===generation)audio.currentTime=elapsed},{once:true})}}
  await audio.play();if(id!==generation)return false;preparing=false;workout.anchor=Date.now()-audio.currentTime*1000;setupMedia();return true;
 }catch{if(id!==generation)return false;preparing=false;workout.state='paused';message('O áudio não iniciou. Toque em continuar para tentar novamente.');render();persist();return false}
}
async function start(){
 const c=configFromFields();if(!validWorkout(c)){$('#workout-form').reportValidity();summary();return}
 const id=++generation;cancelAnimationFrame(frame);workout.configure(c);stopAudio();options={voice:$('#voice').checked,bells:$('#bells').checked,pocket:$('#pocket').checked};preferences();completed=false;message('');workout.start();
 if(audible()&&!await playFromPosition(id))return;
 if(id!==generation)return;$('#settings').open=false;persist();void acquireWake();tick();
}
function pause(){if(workout.state!=='running')return;generation++;sync();if(workout.state!=='running')return;preparing=false;if(audible()){workout.state='paused';audio.pause()}else workout.pause();cancelAnimationFrame(frame);releaseWake();render();persist()}
async function resume(){if(workout.state!=='paused'||preparing)return;const id=++generation;message('');if(audible()&&!await playFromPosition(id))return;if(id!==generation)return;workout.resume();persist();void acquireWake();tick()}
function end(){generation++;preparing=false;workout.configure(workout.config);stopAudio();cancelAnimationFrame(frame);releaseWake();completed=false;message('Treino encerrado. Você pode ajustar os tempos.');$('#settings').open=true;render();persist()}
$('#workout-form').addEventListener('submit',event=>{event.preventDefault();if(preparing)return;if(workout.state==='running')pause();else if(workout.state==='paused')void resume();else void start()});
$('#end-workout').addEventListener('click',end);
$('#workout-fields').addEventListener('input',()=>{const c=configFromFields();if(validWorkout(c)){workout.configure(c);completed=false;preferences();persist();render()}else summary()});
$('#sound-fields').addEventListener('change',()=>{options={voice:$('#voice').checked,bells:$('#bells').checked,pocket:$('#pocket').checked};preferences();persist()});
$('#preview-voice').addEventListener('click',async()=>{if(workout.state==='running'||workout.state==='paused')return;const id=++generation;stopAudio();loadTrack({rounds:1,work:5,rest:0},{voice:true,bells:true});try{await audio.play();if(id===generation)message('Contagem em inglês. Ajuste o volume do aparelho.')}catch{if(id===generation)message('Não foi possível tocar. Confira o volume e tente novamente.')}});
audio.addEventListener('timeupdate',()=>{sync();render()});
audio.addEventListener('pause',()=>{if(audible()&&audio.src&&!preparing&&workout.state==='running'&&audio.paused&&!audio.ended){pause();message('Áudio pausado. Toque em continuar.')}});
audio.addEventListener('error',()=>{if(audible()&&audio.src&&!preparing&&workout.state==='running'){pause();stopAudio();message('Áudio interrompido. Toque em continuar para tentar novamente.')}});
audio.addEventListener('ended',()=>{if(workout.state==='running'){workout.seek(workout.total);finish()}stopAudio()});
document.addEventListener('visibilitychange',()=>{if(document.hidden){sync();persist();cancelAnimationFrame(frame)}else{if(audible()&&audio.src&&audio.paused&&workout.state==='running')pause();tick();void acquireWake()}});
window.addEventListener('pagehide',()=>{sync();persist();releaseWake()});
$('#rest-link').addEventListener('click',()=>{pause();stopAudio();persist()});
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready).then(reg=>{registration=reg;$('#offline').textContent=reg.waiting?'Há uma atualização. Feche todas as janelas do ENTRE SÉRIES e abra novamente.':'Treino e voz disponíveis sem internet.'}).catch(()=>{$('#offline').textContent='Abra novamente com internet para preparar o uso offline.'});
render();if(workout.state==='running')tick();
