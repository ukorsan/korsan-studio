'use strict';
// Local, streaming, non-destructive waveform extraction. FFmpeg decodes to 4 kHz mono PCM.
// No source media is modified. Bounded memory even for long videos.
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const RATE=4000, MAX_BINS=1800;
const pending=new Map();
const ensureDir=p=>fs.mkdirSync(p,{recursive:true});
function extractWaveform({id,file,duration,ffmpeg='ffmpeg',cacheDir}){
 const jobKey=id+':'+String(fs.statSync(file).size);
 if(pending.has(jobKey))return pending.get(jobKey);
 const task=(async()=>{
  ensureDir(cacheDir);
  const stat=fs.statSync(file);
  const cache=path.join(cacheDir,id+'.json');
  const token='wf1:'+stat.size+':'+stat.mtimeMs+':'+RATE+':'+MAX_BINS;
  try{
   const stored=JSON.parse(fs.readFileSync(cache,'utf8'));
   if(stored.token===token)return {duration:stored.duration,peaks:stored.peaks,rms:stored.rms,rate:RATE,cached:true};
  }catch{}
  const maxDuration=Math.min(4*3600,Math.max(.1,Number(duration)||.1));
  const samplesPerBin=Math.max(1,Math.ceil(maxDuration*RATE/MAX_BINS));
  const peaks=[],rms=[];
  let buffered=Buffer.alloc(0),peak=0,sum=0,count=0,samples=0;
  await new Promise((resolve,reject)=>{
   const proc=spawn(ffmpeg,['-hide_banner','-loglevel','error','-nostdin','-i',file,'-vn','-ac','1','-ar',String(RATE),'-t',String(maxDuration),'-f','f32le','pipe:1'],{windowsHide:true,stdio:['ignore','pipe','pipe']});
   let error='',settled=false;
   const flush=()=>{
    if(count){peaks.push(Math.round(peak*1000)/1000);rms.push(Math.round(Math.sqrt(sum/count)*1000)/1000)}
    peak=0;sum=0;count=0;
   };
   proc.stdout.on('data',chunk=>{
    const data=buffered.length?Buffer.concat([buffered,chunk]):chunk;
    const usable=data.length-data.length%4;
    for(let i=0;i<usable;i+=4){
     const f=data.readFloatLE(i);
     const a=Number.isFinite(f)?Math.min(1,Math.abs(f)):0;
     peak=Math.max(peak,a);sum+=a*a;count++;samples++;
     if(count>=samplesPerBin)flush();
    }
    buffered=usable===data.length?Buffer.alloc(0):Buffer.from(data.subarray(usable));
   });
   proc.stderr.on('data',x=>{error=(error+String(x)).slice(-2000)});
   proc.once('error',e=>{if(!settled){settled=true;reject(e)}});
   proc.once('close',code=>{
    if(settled)return;settled=true;
    if(code!==0){reject(Error('Não foi possível extrair a forma de onda: '+error));return}
    flush();resolve();
   });
  });
  const result={duration:samples/RATE,peaks,rms,rate:RATE};
  const temp=cache+'.'+process.pid+'.tmp';
  fs.writeFileSync(temp,JSON.stringify({...result,token}),'utf8');
  fs.renameSync(temp,cache);
  return {...result,cached:false};
 })().finally(()=>pending.delete(jobKey));
 pending.set(jobKey,task);
 return task;
}
module.exports={extractWaveform};
