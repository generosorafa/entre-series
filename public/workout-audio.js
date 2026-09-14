import {phases,duration} from './workout.js';
export const RATE=8000;
// One finite audio file carries every cue, including speech and the final bell.
// It does not depend on a JavaScript callback at each phase boundary.
export function cues(config,voice){
 const events=[];
 for(const phase of phases(config)){
  events.push({at:phase.start,kind:phase.kind});
  if(voice)for(let number=Math.min(5,phase.seconds);number>=1;number--)events.push({at:phase.end-number,kind:'voice',number});
 }
 events.push({at:duration(config),kind:'done'});return events;
}
export function workoutTrack(config,{voice=false,pocket=false,bells=true}={},samples={}){
 const events=cues(config,voice),seconds=duration(config),length=Math.ceil((seconds+1.6)*RATE),buffer=new ArrayBuffer(44+length*2),v=new DataView(buffer);
 const text=(at,s)=>{for(let i=0;i<s.length;i++)v.setUint8(at+i,s.charCodeAt(i))};
 text(0,'RIFF');v.setUint32(4,36+length*2,true);text(8,'WAVE');text(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,RATE,true);v.setUint32(28,RATE*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);text(36,'data');v.setUint32(40,length*2,true);
 function mix(at,sample){if(at<0||at>=length)return;const offset=44+at*2;v.setInt16(offset,Math.max(-32768,Math.min(32767,v.getInt16(offset,true)+sample)),true)}
 function tone(at,hz,gain=.3,dur=.22){for(let j=0;j<dur*RATE;j++){const t=j/RATE,env=Math.min(1,t/.008)*Math.exp(-t*9)*Math.min(1,(dur-t)/.025);mix(Math.round(at*RATE)+j,Math.sin(2*Math.PI*hz*t)*env*gain*32767)}}
 const spoken=new Set(events.filter(e=>e.kind==='voice').map(e=>e.at));
 if(pocket)for(let s=0;s<seconds;s++)if(!spoken.has(s))tone(s,660,.08,.08);
 for(const event of events){
  if(event.kind==='voice'){
   const pcm=samples[event.number];if(!pcm)throw new Error('Contagem de voz indisponível. Desative a voz e tente novamente.');
   const offset=bells&&events.some(e=>e.at===event.at&&(e.kind==='work'||e.kind==='rest')) ? .08 : 0;
   for(let i=0;i<pcm.length;i++)mix(Math.round((event.at+offset)*RATE)+i,pcm[i]);
  }else if(bells){
   if(event.kind==='done')for(const offset of [0,.45,.9])tone(event.at+offset,880,.4,.4);
   else if(spoken.has(event.at))tone(event.at,event.kind==='rest'?520:1100,.25,.06);
   else if(event.kind==='rest')tone(event.at,520,.32,.35);
   else{tone(event.at,880);tone(event.at+.18,1100)}
  }
 }
 return new Blob([buffer],{type:'audio/wav'});
}
