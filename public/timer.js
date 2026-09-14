export const MAX_SECONDS=600;
export function validSeconds(n){return Number.isInteger(n)&&n>=1&&n<=MAX_SECONDS}
export function format(ms){const s=Math.ceil(Math.max(0,ms)/1000);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
export class Timer{
  constructor(){this.total=60;this.remaining=60000;this.deadline=0;this.state='idle'}
  start(seconds,now=Date.now()){if(!validSeconds(seconds))throw new RangeError('Tempo inválido');this.total=seconds;this.remaining=seconds*1000;this.deadline=now+this.remaining;this.state='running'}
  tick(now=Date.now()){if(this.state==='running'){this.remaining=Math.max(0,this.deadline-now);if(this.remaining===0)this.state='done'}return this.remaining}
  pause(now=Date.now()){this.tick(now);if(this.state==='running')this.state='paused'}
  resume(now=Date.now()){if(this.state==='paused'){this.deadline=now+this.remaining;this.state='running'}}
  snapshot(){return {total:this.total,remaining:this.remaining,deadline:this.deadline,state:this.state}}
  restore(s,now=Date.now()){if(!s||!validSeconds(s.total)||!Number.isFinite(s.remaining)||s.remaining<0||s.remaining>s.total*1000||!Number.isFinite(s.deadline)||!['idle','running','paused','done'].includes(s.state)||(s.state==='running'&&s.deadline>now+s.total*1000))return false;this.total=s.total;this.remaining=s.remaining;this.deadline=s.deadline;this.state=s.state;if(this.state==='running')this.tick(now);return true}
}
