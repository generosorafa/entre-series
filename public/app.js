import {Timer,format,validSeconds} from './timer.js';
import {createTrack} from './audio.js';
import {remoteAvailable,remoteEnabled,enableRemote,scheduleRemote,cancelRemote,disableRemote} from './push.js';
const $=s=>document.querySelector(s),timer=new Timer(),audio=$('#audio'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
let frame=0,wake=null,blobURL=null,activeMode='screen',generation=0,completed=false,registration=null,installPrompt=null,unlock=null,lastSecond=-1,lastSave=0;
const settingsKey='xamai-settings-v1',timerKey='xamai-timer-v1';
function read(key){try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}}
function save(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
const preferences=read(settingsKey)||{};
$('#seconds').value=validSeconds(preferences.custom)?preferences.custom:45;
$('#mode').value=preferences.mode==='pocket'?'pocket':'screen';$('#sound').checked=preferences.sound!==false;
function savePreferences(){save(settingsKey,{mode:$('#mode').value,sound:$('#sound').checked,custom:Number($('#seconds').value)})}
function modeHelp(){const pocket=$('#mode').value==='pocket';$('#sound').disabled=pocket;$('#test-sound').disabled=pocket;$('#mode-help').textContent=pocket?'Reproduz tiques suaves e um sinal final. Pode aparecer nos controles de mídia e interromper sua música. Teste 10 segundos com a tela bloqueada; o resultado depende do aparelho.':'Mantemos a tela acesa quando o aparelho permite. Com a tela bloqueada, o som pode não tocar.'}
modeHelp();
const previous=read(timerKey);
if(previous?.mode==='pocket'&&previous.timer?.state==='running'){previous.timer.state='paused'}
if(previous&&timer.restore(previous.timer)){activeMode=previous.mode==='pocket'?'pocket':'screen';if(timer.state==='paused')$('#state').textContent='Pausado. Toque em continuar.';else if(timer.state==='done'){$('#state').textContent='O último descanso terminou.';completed=true}else if(timer.state==='running')$('#state').textContent='Descanso em andamento.'}
function persist(){save(timerKey,{timer:timer.snapshot(),mode:activeMode})}
function paint(){
 const seconds=Math.ceil(timer.remaining/1000);$('#time').textContent=format(timer.remaining);document.title=timer.state==='running'?format(timer.remaining)+' · ENTRE SÉRIES':'ENTRE SÉRIES — Seu descanso';
 $('#duration').textContent='de '+(timer.total===60?'1 minuto':timer.total===1?'1 segundo':timer.total+' segundos');const fraction=reduced.matches?seconds/timer.total:timer.remaining/(timer.total*1000);
 $('.progress').style.strokeDashoffset=String(100*(1-Math.min(1,Math.max(0,fraction))));$('.progress').style.opacity=timer.remaining===0?'0':'1';
 $('#main-action').textContent=timer.state==='running'?'Pausar':timer.state==='paused'?'Continuar':timer.state==='done'?'Recomeçar':'Iniciar';
 document.querySelectorAll('[data-seconds]').forEach(button=>button.classList.toggle('selected',Number(button.dataset.seconds)===timer.total));
 if(seconds!==lastSecond){lastSecond=seconds;updateMedia()}
}
function stopAudio(){audio.pause();audio.removeAttribute('src');audio.load();if(blobURL){URL.revokeObjectURL(blobURL);blobURL=null}if('mediaSession'in navigator){navigator.mediaSession.playbackState='none';navigator.mediaSession.metadata=null}}
function track(seconds,pocket){if(blobURL)URL.revokeObjectURL(blobURL);blobURL=URL.createObjectURL(createTrack(seconds,pocket));audio.src=blobURL;audio.load()}
function unlockSound(){try{const Context=window.AudioContext||window.webkitAudioContext;if(Context){unlock??=new Context();void unlock.resume().catch(()=>{})}}catch{}}
function bell(){if(!$('#sound').checked)return;try{if(!unlock||unlock.state!=='running')return;for(const delay of [0,.45,.9]){const oscillator=unlock.createOscillator(),gain=unlock.createGain(),at=unlock.currentTime+delay;oscillator.frequency.value=880;gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.2,at+.01);gain.gain.exponentialRampToValueAtTime(.001,at+.4);oscillator.connect(gain);gain.connect(unlock.destination);oscillator.start(at);oscillator.stop(at+.42);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect()}}}catch{}}
async function acquireWake(){if(!('wakeLock'in navigator)||document.hidden||timer.state!=='running'||wake)return;try{const lock=await navigator.wakeLock.request('screen');if(timer.state!=='running'){await lock.release();return}wake=lock;lock.addEventListener('release',()=>{if(wake===lock)wake=null},{once:true})}catch{}}
function releaseWake(){if(wake){void wake.release().catch(()=>{});wake=null}}
function setupMedia(){if(!('mediaSession'in navigator)||activeMode!=='pocket')return;try{navigator.mediaSession.metadata=new MediaMetadata({title:'Descanso · '+format(timer.total*1000),artist:'ENTRE SÉRIES',album:'Entre séries',artwork:[{src:new URL('./icons/icon-512.png',location.href).href,sizes:'512x512',type:'image/png'}]});for(const [action,handler]of Object.entries({play:()=>resume(),pause:()=>pause(),stop:()=>pause(),seekbackward:null,seekforward:null,seekto:null,previoustrack:null,nexttrack:null})){try{navigator.mediaSession.setActionHandler(action,handler)}catch{}}updateMedia()}catch{}}
function updateMedia(){if(!('mediaSession'in navigator)||activeMode!=='pocket'||!audio.src)return;try{navigator.mediaSession.playbackState=audio.paused?'paused':'playing';if(Number.isFinite(audio.duration)&&audio.duration>0)navigator.mediaSession.setPositionState({duration:audio.duration,playbackRate:1,position:Math.min(audio.duration,Math.max(0,audio.currentTime))})}catch{}}
function notify(){if(!registration||!('Notification'in window)||Notification.permission!=='granted'||remoteEnabled())return;void registration.showNotification('ENTRE SÉRIES',{body:'Descanso concluído. Hora da próxima série.',icon:'./icons/icon-192.png',tag:'xamai-rest',data:{url:new URL('./',location.href).href}}).catch(()=>{})}
function finish(){if(completed)return;completed=true;timer.state='done';timer.remaining=0;$('#state').textContent='Descanso concluído.';releaseWake();if(activeMode==='screen')bell();if('vibrate'in navigator)navigator.vibrate([180,100,180]);notify();paint();persist()}
function sync(){if(timer.state!=='running')return;if(activeMode==='pocket'&&audio.src){timer.remaining=Math.max(0,(timer.total-audio.currentTime)*1000);timer.deadline=Date.now()+timer.remaining;if(timer.remaining===0)finish()}else{timer.tick();if(timer.state==='done')finish()}}
function tick(){cancelAnimationFrame(frame);sync();if(!reduced.matches||Math.ceil(timer.remaining/1000)!==lastSecond)paint();if(Date.now()-lastSave>1000){persist();lastSave=Date.now()}if(timer.state==='running'&&!document.hidden)frame=requestAnimationFrame(tick)}
function delivery(text){$('#delivery').textContent=text}
function sendSchedule(){if(!remoteEnabled())return;const id=generation;delivery('Agendando aviso…');scheduleRemote(timer.deadline,timer.total).then(()=>{if(id===generation&&timer.state==='running')delivery('Aviso agendado. Requer internet para chegar.')}).catch(()=>{if(id===generation)delivery('Aviso remoto não confirmado. Mantenha a tela aberta.')})}
function sendCancel(){if(!remoteEnabled())return;const id=generation;cancelRemote().then(()=>{if(id===generation)delivery('Aviso anterior cancelado.')}).catch(()=>{if(id===generation)delivery('Sem confirmação do cancelamento. O aviso anterior ainda pode chegar.')})}
async function start(seconds){
 if(!validSeconds(seconds))return;generation++;const id=generation;cancelAnimationFrame(frame);timer.state='idle';stopAudio();activeMode=$('#mode').value;completed=false;lastSecond=-1;delivery('');
 if(activeMode==='pocket'){
   $('#state').textContent='Preparando áudio…';track(seconds,true);timer.start(seconds);setupMedia();
   try{await audio.play();if(id!==generation)return;timer.start(seconds,Date.now()-audio.currentTime*1000);setupMedia()}
   catch{if(id!==generation)return;timer.pause();$('#state').textContent='O áudio não iniciou. Toque em continuar.';paint();persist();sendCancel();return}
 }else{unlockSound();timer.start(seconds)}
 $('#state').textContent='Descanso em andamento.';paint();persist();void acquireWake();sendSchedule();tick();
}
function pause(){if(timer.state!=='running')return;generation++;sync();if(timer.state!=='running')return;if(activeMode==='pocket'){timer.state='paused';audio.pause()}else timer.pause();cancelAnimationFrame(frame);$('#state').textContent='Pausado.';releaseWake();paint();persist();sendCancel()}
async function resume(){
 if(timer.state!=='paused'){if(timer.state!=='running')await start(timer.total);return}
 generation++;const id=generation;completed=false;
 if(activeMode==='pocket'){
   if(!audio.src){track(timer.total,true);audio.currentTime=(timer.total*1000-timer.remaining)/1000}
   try{await audio.play();if(id!==generation)return}catch{$('#state').textContent='Não foi possível tocar. Use a tela aberta ou tente novamente.';return}
   timer.resume();setupMedia();
 }else{unlockSound();timer.resume()}
 $('#state').textContent='Descanso em andamento.';paint();persist();sendSchedule();void acquireWake();tick();
}
document.querySelectorAll('[data-seconds]').forEach(button=>button.addEventListener('click',()=>{void start(Number(button.dataset.seconds))}));
$('#main-action').addEventListener('click',()=>{if(timer.state==='running')pause();else if(timer.state==='paused')void resume();else void start(timer.total)});
$('#repeat').addEventListener('click',()=>{void start(timer.total)});
$('.custom-toggle').addEventListener('click',()=>{const form=$('#custom');form.hidden=!form.hidden;$('.custom-toggle').setAttribute('aria-expanded',String(!form.hidden));if(!form.hidden)$('#seconds').focus()});
$('#custom').addEventListener('submit',event=>{event.preventDefault();const seconds=Number($('#seconds').value);if(!validSeconds(seconds))return;savePreferences();$('#custom').hidden=true;$('.custom-toggle').setAttribute('aria-expanded','false');void start(seconds);$('#main-action').focus()});
$('#mode').addEventListener('change',()=>{modeHelp();savePreferences();if(timer.state==='running')delivery('A mudança de modo vale no próximo descanso.')});
$('#sound').addEventListener('change',()=>{savePreferences();if($('#sound').checked)unlockSound()});
$('#test-sound').addEventListener('click',async()=>{if(timer.state==='running'||timer.state==='paused'){delivery('Pause ou termine o descanso antes de testar o som.');return}stopAudio();track(0,false);try{await audio.play();delivery('Som de teste. Ajuste o volume do aparelho.')}catch{delivery('O som não iniciou. Confira o volume e tente novamente.')}});
audio.addEventListener('timeupdate',()=>{if(activeMode==='pocket'&&timer.state==='running'){sync();paint()}});
audio.addEventListener('pause',()=>{if(activeMode==='pocket'&&timer.state==='running'&&audio.paused&&!audio.ended&&audio.currentTime<timer.total){pause();$('#state').textContent='Áudio pausado. Toque em continuar.'}});
audio.addEventListener('ended',()=>{if(activeMode==='pocket'&&timer.state==='running')finish();stopAudio()});
audio.addEventListener('error',()=>{if(activeMode==='pocket'&&timer.state==='running'){pause();$('#state').textContent='Áudio interrompido. Toque em continuar.'}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){sync();persist();cancelAnimationFrame(frame)}else{tick();void acquireWake()}});
window.addEventListener('pagehide',()=>{sync();persist();releaseWake()});
window.addEventListener('online',()=>{if(timer.state==='running'&&remoteEnabled())sendSchedule()});
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event});
function standalone(){return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true}
if(standalone()){$('#install').hidden=true;$('#install-help').textContent='O ENTRE SÉRIES já está aberto como aplicativo.'}
window.addEventListener('appinstalled',()=>{$('#install').hidden=true;installPrompt=null});
$('#install').addEventListener('click',async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null}else{$('#settings').open=true;$('#install-help').scrollIntoView({block:'center',behavior:reduced.matches?'instant':'smooth'})}});
function notificationUI(){if(remoteAvailable){$('#notification-help').textContent='Ative para agendar o aviso mesmo com o aplicativo fechado. Exige internet, pode atrasar e respeita o modo Foco do celular.';$('#notifications').textContent=remoteEnabled()?'Reconectar avisos remotos':'Ativar avisos no bolso';$('#disable-push').hidden=!remoteEnabled()}if(!('Notification'in window)){$('#notifications').textContent='Como ativar no iPhone'}}
notificationUI();
$('#notifications').addEventListener('click',async()=>{
 if(!('Notification'in window)||(/iPhone|iPad|iPod/.test(navigator.userAgent)&&!standalone())){$('#notification-help').textContent='No iPhone, adicione à Tela de Início pelo Safari e abra pelo ícone. As notificações exigem iOS 16.4 ou mais recente.';return}
 if(!registration){$('#notification-help').textContent='O aplicativo ainda está preparando os avisos. Tente novamente em instantes.';return}
 if(Notification.permission==='denied'){$('#notification-help').textContent='A permissão está bloqueada. Libere notificações nas configurações do navegador ou do aplicativo.';return}
 try{const permission=await Notification.requestPermission();if(permission!=='granted'){$('#notification-help').textContent='Avisos não ativados. Você pode continuar usando o timer.';return}
 if(remoteAvailable){await enableRemote(registration);notificationUI();$('#notification-help').textContent='Avisos remotos ativados. Teste um descanso de 10 segundos com o celular bloqueado.';if(timer.state==='running')sendSchedule()}
 else{await registration.showNotification('ENTRE SÉRIES',{body:'Aviso visual ativado. Nesta versão, depende do site em execução.',icon:'./icons/icon-192.png',tag:'xamai-test'});$('#notification-help').textContent='Aviso visual ativado. O agendamento com o site fechado aguarda a configuração do serviço gratuito.'}
 }catch(error){$('#notification-help').textContent=error.message||'Não foi possível ativar os avisos.'}
});
$('#disable-push').addEventListener('click',async()=>{try{await disableRemote(registration);notificationUI();$('#notification-help').textContent='Inscrição removida. Os avisos remotos foram desativados.'}catch{$('#notification-help').textContent='Não foi possível remover a inscrição. Conecte à internet e tente novamente.'}});
if('serviceWorker'in navigator){navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready).then(reg=>{registration=reg;$('#offline').textContent='Pronto para abrir e usar sem internet. Avisos remotos precisam de conexão.';if(reg.waiting)$('#offline').textContent='Há uma atualização. Feche todas as janelas do ENTRE SÉRIES e abra novamente.'}).catch(()=>{$('#offline').textContent='Não foi possível preparar o uso offline. Abra novamente com internet.'})}else $('#offline').textContent='Este navegador não oferece instalação offline.';
paint();if(timer.state==='running')tick();
