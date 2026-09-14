// A finite, audible track contains the final bell itself. No silent keep-alive loop.
export function createTrack(seconds,pocket=false){
  const rate=8000,duration=seconds+2.2,length=Math.ceil(duration*rate),buffer=new ArrayBuffer(44+length*2),v=new DataView(buffer);
  function text(at,s){for(let i=0;i<s.length;i++)v.setUint8(at+i,s.charCodeAt(i))}
  text(0,'RIFF');v.setUint32(4,36+length*2,true);text(8,'WAVE');text(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);text(36,'data');v.setUint32(40,length*2,true);
  function tone(start,dur,hz,gain){const from=Math.floor(start*rate),count=Math.floor(dur*rate);for(let j=0;j<count&&from+j<length;j++){const t=j/rate,env=Math.min(1,t/.008)*Math.exp(-t*9)*Math.min(1,(dur-t)/.025);const offset=44+(from+j)*2;const sample=v.getInt16(offset,true)+Math.sin(2*Math.PI*hz*t)*env*gain*32767;v.setInt16(offset,Math.max(-32768,Math.min(32767,sample)),true)}}
  if(pocket)for(let second=0;second<seconds;second++)tone(second,.1,660,.12);
  for(const offset of [0,.5,1]){tone(seconds+offset,.5,880,.45);tone(seconds+offset,.5,1320,.15)}
  return new Blob([buffer],{type:'audio/wav'});
}
