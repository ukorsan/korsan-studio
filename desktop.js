'use strict';
const {app,BrowserWindow,dialog,shell}=require('electron');
const {spawn}=require('node:child_process');
const {join}=require('node:path');
const {setTimeout:delay}=require('node:timers/promises');
let win=null,server=null;
const PORT=4197;
if(!app.requestSingleInstanceLock()){app.quit();process.exit(0)}
app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.focus()}});
async function ready(){
 const dataDir=app.getPath('userData');
 const serverFile=join(__dirname,'server.js');
 const environment={...process.env,ELECTRON_RUN_AS_NODE:'1',KORSAN_DATA_ROOT:dataDir,PORT:String(PORT)};
 server=spawn(process.execPath,[serverFile],{
  cwd:process.resourcesPath||__dirname,
  env:environment,windowsHide:true,stdio:'ignore'
 });
 server.on('error',e=>dialog.showErrorBox('Erro no motor local',e.message));
 let online=false;
 for(let i=0;i<100;i++){
  try{const response=await fetch('http://127.0.0.1:'+PORT+'/api/health',{signal:AbortSignal.timeout(900)});if(response.ok){online=true;break}}catch{}
  await delay(150);
 }
 if(!online){dialog.showErrorBox('KORSAN Video Editor','Não foi possível iniciar o motor local na porta '+PORT+'.');app.quit();return}
 win=new BrowserWindow({
  width:1520,height:950,minWidth:1050,minHeight:720,
  backgroundColor:'#111117',title:'KORSAN Studio',
  autoHideMenuBar:true,
  show:false,
  webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}
 });
 win.once('ready-to-show',()=>win.show());
 win.webContents.setWindowOpenHandler(({url})=>{
   try{
     const u=new URL(url);
     if(u.protocol==='https:'&&['giphy.com','www.giphy.com'].includes(u.hostname)){
       shell.openExternal(u.href).catch(()=>{});
     }
   }catch{}
   return {action:'deny'};
 });
 win.loadURL('http://127.0.0.1:'+PORT+'/');
 win.on('closed',()=>{win=null});
}
app.whenReady().then(ready).catch(e=>{dialog.showErrorBox('KORSAN Video Editor',String(e));app.quit()});
app.on('window-all-closed',()=>app.quit());
app.on('before-quit',()=>{if(server&&!server.killed){try{server.kill()}catch{}}});
