export const DEFAULT_WORKOUT={rounds:5,work:90,rest:15};
export function validWorkout(c){return !!c&&Number.isInteger(c.rounds)&&c.rounds>=1&&c.rounds<=30&&Number.isInteger(c.work)&&c.work>=1&&c.work<=600&&Number.isInteger(c.rest)&&c.rest>=0&&c.rest<=600&&duration(c)<=1800}
export function duration(c){return c.rounds*c.work+(c.rounds-1)*c.rest}
export function phases(c){
 if(!validWorkout(c))throw new RangeError('Use 1 a 30 séries, exercício de 1 a 600 s e descanso de 0 a 600 s. O treino pode ter até 30 minutos.');
 const result=[];let start=0;
 for(let round=1;round<=c.rounds;round++){
  result.push({kind:'work',round,start,end:start+c.work,seconds:c.work});start+=c.work;
  if(round<c.rounds&&c.rest){result.push({kind:'rest',round,start,end:start+c.rest,seconds:c.rest});start+=c.rest}
 }
 return result;
}
export class Workout{
 constructor(config=DEFAULT_WORKOUT){this.configure(config)}
 configure(config){this.phases=phases(config);this.config={...config};this.total=duration(config);this.elapsed=0;this.state='idle';this.anchor=0}
 start(now=Date.now()){this.elapsed=0;this.anchor=now;this.state='running'}
 tick(now=Date.now()){if(this.state==='running')this.seek((now-this.anchor)/1000);return this.current()}
 seek(seconds){if(!Number.isFinite(seconds))return;this.elapsed=Math.min(this.total,Math.max(0,seconds));if(this.elapsed>=this.total)this.state='done'}
 pause(now=Date.now()){this.tick(now);if(this.state==='running')this.state='paused'}
 resume(now=Date.now()){if(this.state==='paused'){this.anchor=now-this.elapsed*1000;this.state='running'}}
 current(){const phase=this.phases.find(p=>this.elapsed<p.end)||this.phases.at(-1);return {...phase,remaining:this.state==='done'?0:Math.max(0,phase.end-this.elapsed),totalRemaining:Math.max(0,this.total-this.elapsed)}}
 snapshot(){return {config:this.config,elapsed:this.elapsed,state:this.state,anchor:this.anchor}}
 restore(s,audible,now=Date.now()){
  if(!s||!validWorkout(s.config)||!['idle','running','paused','done'].includes(s.state)||!Number.isFinite(s.elapsed)||s.elapsed<0||s.elapsed>duration(s.config)||!Number.isFinite(s.anchor)||s.anchor>now)return false;
  this.configure(s.config);this.elapsed=s.elapsed;this.anchor=s.anchor;this.state=s.state;
  if(this.state==='running'){if(audible)this.state='paused';else this.tick(now)}
  return true;
 }
}
