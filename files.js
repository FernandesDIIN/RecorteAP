/* File operations kept separate from the CEP interface for validation. */
'use strict';
var fs=require('fs'),path=require('path');
exports.reference=function(folder,filename){return path.join(folder,'.recorteap-originals',filename);};
exports.hasICC=function(file){
 var fd=fs.openSync(file,'r');
 try{
  var b=Buffer.alloc(1048576),n=fs.readSync(fd,b,0,b.length,0),p=2;
  if(n<2||b[0]!==255||b[1]!==216)throw Error('O recorte não é um JPG válido. Exporte novamente como JPG.');
  while(p<n){
   if(b[p++]!==255)return null;
   while(p<n&&b[p]===255)p++;
   if(p>=n)return null;
   var marker=b[p++];if(marker===218||marker===217)return false;
   if(marker===1||(marker>=208&&marker<=215))continue;
   if(p+2>n)return null;
   var len=b.readUInt16BE(p);if(len<2||p+len>n)return null;
   if(marker===226&&len>=16&&b.toString('ascii',p+2,p+14)==='ICC_PROFILE\u0000')return true;
   p+=len;
  }return null;
 }finally{fs.closeSync(fd);}
};
exports.keepOriginal=function(folder,filename){
 var dir=path.join(folder,'.recorteap-originals');if(!fs.existsSync(dir))fs.mkdirSync(dir);
 var target=exports.reference(folder,filename);
 fs.copyFileSync(path.join(folder,filename),target,fs.constants.COPYFILE_EXCL);
};
exports.removeApplied=function(item){
 if(item.status!=='done')throw Error('Use a exclusão geral para remover um recorte pendente.');
 return exports.removeItem(item);
};
exports.removeItem=function(item){
 var name=item.filename;
 if(typeof name!=='string'||name!==path.basename(name)||!/^\d+ Img.*\.jpe?g$/i.test(name))throw Error('Nome de recorte inválido.');
 var files=[path.join(item.folder,name),exports.reference(item.folder,name),path.join(item.folder,name.replace(/\.jpe?g$/i,'.json'))];
 // Validate all targets before removing any; never follow a symbolic link.
 var refDir=path.dirname(files[1]);if(fs.existsSync(refDir)&&fs.lstatSync(refDir).isSymbolicLink())throw Error('A pasta de referências é um link; exclusão recusada.');
 files.forEach(function(file){if(fs.existsSync(file)){var stat=fs.lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink())throw Error('Arquivo irregular: '+file);}});
 files.forEach(function(file){if(fs.existsSync(file))fs.unlinkSync(file);});
};

// Internal recovery cache, separate from the user-exported coordinate sidecars.
exports.validCoords=function(c){
 return !!(c&&['left','top','width','height'].every(function(k){return typeof c[k]==='number'&&isFinite(c[k]);})&&c.left>=0&&c.top>=0&&c.width>0&&c.height>0&&
 ((typeof c.documentName==='string'&&c.documentName.length)||(typeof c.legacyName==='string'&&c.legacyName.length)));
};
function sessionPath(){return path.join(process.env.APPDATA||path.join(require('os').homedir(),'Library','Application Support'),'RecorteAP','history.json');}
function readSession(file){try{var x=JSON.parse(fs.readFileSync(file,'utf8'));return x&&Array.isArray(x.items)&&typeof x.folder==='string'?x:null;}catch(e){return null;}}
exports.loadSession=function(){var file=sessionPath();return readSession(file)||readSession(file+'.bak');};
exports.saveSession=function(state){
 var file=sessionPath(),dir=path.dirname(file),temp=file+'.tmp';
 if(!fs.existsSync(dir))fs.mkdirSync(dir);
 var text=JSON.stringify(state),fd=fs.openSync(temp,'w');
 try{fs.writeFileSync(fd,text,'utf8');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
 // Never replace the recovery backup with a corrupt previous file.
 if(readSession(file))fs.copyFileSync(file,file+'.bak');
 fs.renameSync(temp,file);
};
