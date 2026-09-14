import test from 'node:test';import assert from 'node:assert/strict';
import {Timer,format,validSeconds} from '../public/timer.js';import {createTrack} from '../public/audio.js';
test('o prazo corrige a contagem após suspensão da aba',()=>{const t=new Timer();t.start(90,1000);assert.equal(t.tick(31000),60000);assert.equal(t.tick(95000),0);assert.equal(t.state,'done')});
test('pausar e continuar preserva os milissegundos restantes',()=>{const t=new Timer();t.start(10,0);t.pause(2300);assert.equal(t.remaining,7700);t.resume(60000);assert.equal(t.tick(62000),5700);assert.equal(t.tick(67700),0)});
test('trocar rapidamente o tempo substitui o prazo anterior',()=>{const t=new Timer();t.start(90,0);t.start(10,100);assert.equal(t.tick(200),9900);assert.equal(t.total,10)});
test('restaura timer vencido sem reiniciar',()=>{const t=new Timer();t.start(30,100);const restored=new Timer();assert.equal(restored.restore(t.snapshot(),40000),true);assert.equal(restored.state,'done')});
test('tempos inválidos não iniciam',()=>{for(const n of [0,-1,601,1.5,NaN,Infinity,'30']){assert.equal(validSeconds(n),false);assert.throws(()=>new Timer().start(n),RangeError)}});
test('formatação não chega a zero antes do prazo',()=>{assert.equal(format(1),'00:01');assert.equal(format(90000),'01:30');assert.equal(format(-1),'00:00')});
test('faixa de bolso inclui sinal final no próprio áudio',async()=>{const v=new DataView(await createTrack(10,true).arrayBuffer());assert.equal(v.getUint32(24,true),8000);const audible=(start,end)=>{for(let i=44+start*8000*2;i<44+end*8000*2;i+=2)if(v.getInt16(i,true)!==0)return true;return false};assert.ok(audible(0,1));assert.ok(audible(10,11));assert.ok(v.byteLength>44+12*8000*2)});
