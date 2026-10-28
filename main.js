(function(){
'use strict';
var fs,path,files,folder='',items=[],counter=1,busy=false,cancel=false,hostPath='',pending=null,showTips=false;
function el(id){return document.getElementById(id);}
function message(s,error){el('status').textContent=s;el('status').className=error?'error':'';}
function tip(node,text){if(showTips)node.title=text;}
function initTips(){
 var tips={btnChooseFolder:'Escolhe onde guardar os JPGs.',btnFullWidth:'Ativa a seleção retangular.',btnSync:'Captura o JPG e guarda sua posição.',chkFixProfile:'Converte a cor para o perfil da página.',matchStrength:'Aproxima as cores do original; 0 desativa.',btnApplyAll:'Aplica os recortes pendentes nas páginas de origem.',btnCancel:'Para após o recorte atual.',btnRefresh:'Confere arquivos, coordenadas e páginas abertas.',btnImport:'Importa JPGs e recupera coordenadas dos JSONs.',btnSaveCoords:'Exporta coordenadas em JSON ao lado dos JPGs.',btnClearHistory:'Exclui arquivos dos recortes já aplicados.',btnDeleteAll:'Exclui todos os recortes, incluindo pendentes.',btnRecover:'Verifica se o Photoshop voltou a responder.'};
 Object.keys(tips).forEach(function(id){tip(el(id),tips[id]);});
}
function valid(c){return files.validCoords(c);}
function safeName(n){return typeof n==='string'&&n===path.basename(n)&&/\.jpe?g$/i.test(n);}
function normalize(a,dir){return a.filter(function(x){return x&&safeName(x.filename)&&typeof (x.folder||dir)==='string';}).map(function(x){
 x.folder=x.folder||dir;x.coords=x.coords&&typeof x.coords==='object'?x.coords:{};
 if(!x.coords.documentName&&!x.coords.documentPath)x.coords.legacyName=typeof x.id==='string'?x.id.split(' Img').slice(1).join(' Img'):'';
 if(x.status==='applying')x.status='uncertain';return x;
});}
function log(s){try{var os=require('os'),dir=path.join(process.env.APPDATA||os.homedir(),'RecorteAP');if(!fs.existsSync(dir))fs.mkdirSync(dir);fs.appendFileSync(path.join(dir,'erros.txt'),new Date().toISOString()+' '+s+'\n','utf8');}catch(ignore){}}
function save(){
 var state={folder:folder,items:items,tipsSeen:true,fix:el('chkFixProfile').checked,matchStrength:Number(el('matchStrength').value)||0,updatedAt:Date.now()},ok=false,errors=[];
 try{files.saveSession(state);ok=true;}catch(e){errors.push(e.message);}
 try{localStorage.setItem('recorteap_v11',JSON.stringify(state));ok=true;}catch(e){errors.push(e.message);}
 if(errors.length)log('Histórico: '+errors.join('; '));
 if(!ok)message('Não foi possível guardar o histórico: '+errors.join('; ')+'. Use Salvar coordenadas antes de fechar.',true);
 return ok;
}
function lock(v){busy=v;Array.prototype.forEach.call(document.querySelectorAll('button,input'),function(n){n.disabled=v;});el('btnCancel').disabled=!v;el('btnCancel').hidden=!v;el('btnRecover').disabled=!v;if(!v)render();}
function literal(o){return JSON.stringify(o).replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');}
function hostScript(action,args){return '(function(){try{if(!$.global.RecorteAP||$.global.RecorteAP.version!=="1.2.6"){var f=new File('+literal(hostPath)+');if(!f.exists)throw Error("Script do RecorteAP ausente. Reinstale o pacote completo.");$.evalFile(f);}return $.global.RecorteAP.run('+literal(action)+','+literal(args||{})+');}catch(e){return "RECORTE_HOST_ERROR:"+encodeURIComponent(String(e.message||e));}}())';}
function call(action,args,cb){
 var done=false,timer;
 function finish(e,d){if(done)return;done=true;clearTimeout(timer);pending=null;if(e)log(action+': '+e);
  try{cb(e,d);}catch(ex){cancel=true;log('Painel: '+(ex.stack||ex.message));try{lock(false);}catch(ignore){busy=false;}message('Falha no painel: '+ex.message+'. Verifique o histórico antes de repetir.',true);}
 }
 pending={finish:finish};
 timer=setTimeout(function(){if(!done){message('O Photoshop ainda não respondeu. Confirme ou cancele janelas, transformações ou edições abertas nele. Depois clique em Verificar comunicação. Não repita a aplicação.',true);el('btnRecover').disabled=false;}},30000);
 try{window.__adobe_cep__.evalScript(hostScript(action,args),function(raw){
  var r;try{r=JSON.parse(raw);if(!r||typeof r.ok!=='boolean')throw Error('resposta inválida');}catch(e){finish('Comunicação interrompida: '+String(raw)+'. Confira a página antes de reaplicar.',{uncertain:action==='apply'});return;}
  finish(r.ok?null:r.error+(r.line?' (linha '+r.line+')':''),r.data);
 });}catch(e){finish(e.message,{uncertain:action==='apply'});}
}
function recover(){
 if(!pending)return;var request=pending;el('btnRecover').disabled=true;message('Verificando comunicação; aguardando o Photoshop concluir o comando…');
 try{window.__adobe_cep__.evalScript('"RECORTE_IDLE"',function(raw){if(pending!==request)return;if(raw==='RECORTE_IDLE'){cancel=true;request.finish('A resposta da operação anterior não chegou. Confira a página antes de reaplicar.',{uncertain:true});}else{message('O Photoshop ainda não está disponível. Feche suas janelas de diálogo e tente novamente.',true);el('btnRecover').disabled=false;}});}catch(e){message(e.message,true);el('btnRecover').disabled=false;}
}
function fileOf(x){return path.join(x.folder,x.filename);}
function refresh(){items.forEach(function(x){try{x.missing=!fs.existsSync(fileOf(x));}catch(e){x.missing=true;}});render();}
function deleteItems(selected){
 if(busy)return;
 if(!selected.length){message('Nenhum recorte nesta opção. Use Excluir todos para incluir os pendentes.');return;}
 var pendingCount=selected.filter(function(x){return x.status!=='done';}).length;
 if(!confirm('Excluir permanentemente '+selected.length+' recorte(s) do histórico e das respectivas pastas?'+(pendingCount?' Inclui '+pendingCount+' não aplicado(s) ou sem confirmação.':'')+' Serão excluídos os JPGs, JSONs e referências originais. As páginas do Photoshop não serão alteradas.'))return;
 var removed=[],errors=[];
 selected.forEach(function(x){try{files.removeItem(x);removed.push(x);}catch(e){errors.push(x.filename+': '+e.message);}});
 items=items.filter(function(x){return removed.indexOf(x)===-1;});
 var persisted=save();refresh();message(removed.length+' recorte(s) excluído(s).'+(errors.length?' Não foi possível excluir: '+errors.join('; '):'')+(!persisted?' O histórico não pôde ser salvo.':''),errors.length>0||!persisted);
}
function render(){
 var box=el('historyList');box.textContent='';el('folderPathDisplay').textContent=folder||'Nenhuma pasta selecionada';
 if(!items.length){var empty=document.createElement('p');empty.className='hint';empty.textContent='Nenhum recorte.';box.appendChild(empty);}
 items.forEach(function(x){var row=document.createElement('div');row.className='history-item';
 var title=document.createElement('strong');title.textContent=x.filename;row.appendChild(title);
 var label=document.createElement('p');label.className='hint';label.textContent=x.missing?'Arquivo ausente':x.status==='uncertain'?'Resultado não confirmado: confira a página':x.status==='done'?'Aplicado':!valid(x.coords)?'Sem coordenadas':x.error?'Falhou: '+x.error:'Disponível para aplicar';row.appendChild(label);if(x.check){var check=document.createElement('p');check.className='hint';check.textContent=x.check;row.appendChild(check);}
 if(x.status==='uncertain'){var checked=document.createElement('button');checked.textContent='Já conferi: marcar como aplicado';checked.disabled=busy;checked.addEventListener('click',function(){if(confirm('Confirmar que este recorte já está aplicado na página?')){x.status='done';delete x.error;save();render();}});row.appendChild(checked);}
 var b=document.createElement('button');b.textContent=x.status==='done'?'Aplicar novamente':'Aplicar na página de origem';tip(b,'Cola o JPG editado na posição original.');b.disabled=busy||x.missing||!valid(x.coords);b.addEventListener('click',function(){if(x.status==='uncertain'&&!confirm('A aplicação anterior pode ter sido concluída. Confira a página. Deseja realmente reaplicar este recorte?'))return;applyList([x]);});row.appendChild(b);var del=document.createElement('button');del.textContent='Excluir recorte e arquivos';tip(del,'Exclui este recorte e seus arquivos.');del.disabled=busy;del.addEventListener('click',function(){deleteItems([x]);});row.appendChild(del);box.appendChild(row);
 });
}
function capture(){
 if(busy)return;if(!folder){message('Selecione a pasta de destino.',true);return;}lock(true);message('Capturando seleção…');
 call('info',{},function(err,info){if(err){lock(false);message(err,true);return;}
 var filename,target;
 try{var name=info.documentName.replace(/\.[^.]+$/,'').replace(/[^a-zA-Z0-9_-]/g,'')||'Pagina';var suffix=1;do{filename=counter+' Img'+name+(suffix>1?' ('+suffix+')':'')+'.jpg';suffix++;target=path.join(folder,filename);}while(fs.existsSync(target)||fs.existsSync(target.replace(/\.jpg$/i,'.json'))||fs.existsSync(files.reference(folder,filename))||items.some(function(x){return x.folder===folder&&x.filename===filename;}));}catch(e){lock(false);message(e.message,true);return;}
 call('capture',{file:target.replace(/\\/g,'/'),documentId:info.documentId},function(error,coords){
  if(error){lock(false);message(error,true);return;}
  counter++;
  var x={id:filename.replace(/\.jpg$/i,''),filename:filename,folder:folder,coords:coords,status:'ready'};items.unshift(x);
  var note='Recorte capturado.';
  try{files.keepOriginal(folder,filename);}catch(e){note+=' Não foi possível guardar a referência de cor: '+e.message;}
  var saved=save();lock(false);if(saved)message(note);
 });});
}
function applyList(list){
 if(busy)return;if(!list.length){message('Nenhum recorte disponível com coordenadas válidas.',true);return;}
 lock(true);cancel=false;el('progress').value=0;var index=0,ok=0,failed=0,warnings=[];
 function next(){try{step();}catch(e){cancel=true;log('Lote: '+(e.stack||e.message));lock(false);message('Lote interrompido: '+e.message+'. As pendentes foram mantidas.',true);}}
 function step(){
  if(index>=list.length||cancel){lock(false);message((cancel?'Interrompido. ':'Concluído. ')+ok+' aplicados; '+failed+' falharam; '+(list.length-index)+' restantes.'+(warnings.length?' Avisos: '+warnings.join('; '):''),failed>0);return;}
  var x=list[index];message('Aplicando '+(index+1)+' de '+list.length+' — '+x.filename);el('progress').value=index/list.length*100;
  var hasICC;try{hasICC=files.hasICC(fileOf(x));}catch(e){x.error=e.message;failed++;index++;save();render();setTimeout(next,0);return;}
  delete x.check;x.status='applying';if(!save()){x.status='ready';lock(false);message('Histórico indisponível. O lote foi interrompido antes de aplicar.',true);return;}
  call('apply',{file:fileOf(x).replace(/\\/g,'/'),coords:x.coords,fixProfile:el('chkFixProfile').checked,inputHasICC:hasICC,referenceFile:files.reference(x.folder,x.filename).replace(/\\/g,'/'),matchStrength:Number(el('matchStrength').value)||0},function(err,data){
   if(data&&data.warning)warnings.push(x.filename+': '+data.warning);
   if(err){x.status=data&&data.uncertain?'uncertain':'ready';x.error=err;failed++;if(data&&data.uncertain)cancel=true;}else{x.status='done';delete x.error;ok++;if(data&&data.source){['documentId','documentName','documentPath','pageWidth','pageHeight'].forEach(function(k){x.coords[k]=data.source[k];});}}
   index++;if(!save())cancel=true;render();el('progress').value=index/list.length*100;setTimeout(next,0);
  });
 }next();
}
function importCoords(x){
 var sidecar=fileOf(x).replace(/\.jpe?g$/i,'.json');
 if(!fs.existsSync(sidecar))return false;
 var c=JSON.parse(fs.readFileSync(sidecar,'utf8').replace(/^\uFEFF/,''));
 if(c&&typeof c==='object'&&!c.documentName&&!c.legacyName)c.legacyName=x.filename.replace(/\.jpe?g$/i,'').split(' Img').slice(1).join(' Img');
 if(!valid(c))throw Error('JSON com coordenadas ou identificação da página inválidas');
 x.coords=c;delete x.error;return true;
}
function scan(){
 if(busy)return;if(!folder){message('Selecione a pasta de recortes antes de importar.',true);return;}
 try{var found=0,repaired=0,errors=[];
 fs.readdirSync(folder).sort().forEach(function(name){
 if(!/^\d+ Img.*\.jpe?g$/i.test(name)||!safeName(name))return;
 var x=items.filter(function(i){return i.folder===folder&&i.filename===name;})[0];
 if(!x){x=normalize([{id:name.replace(/\.jpe?g$/i,''),filename:name,coords:{},status:'ready'}],folder)[0];items.push(x);found++;}
 if(!valid(x.coords)){try{if(importCoords(x))repaired++;}catch(e){x.error=e.message;errors.push(name+': '+e.message);}}
 });save();refresh();message(found+' novos recortes; '+repaired+' coordenadas recuperadas.'+(errors.length?' '+errors.join('; '):' Clique em Verificar arquivos para conferir as páginas.'),errors.length>0);
 }catch(e){message(e.message,true);}
}
function verify(){
 if(busy)return;if(!items.length){message('Histórico vazio. Use Importar da pasta para localizar recortes e JSONs salvos.');return;}
 lock(true);var index=0,good=0,bad=0,repaired=0;
 function next(){
 if(index>=items.length){save();lock(false);message('Verificação concluída: '+good+' prontos, '+bad+' com problemas, '+repaired+' coordenadas recuperadas. Veja o diagnóstico em cada recorte.',bad>0);return;}
 var x=items[index++];message('Verificando '+index+' de '+items.length+' — '+x.filename);
 try{
 x.missing=!fs.existsSync(fileOf(x));if(x.missing)throw Error('JPG ausente na pasta registrada');
 files.hasICC(fileOf(x));
 if(!valid(x.coords)&&importCoords(x))repaired++;
 if(!valid(x.coords))throw Error('Coordenadas ausentes ou inválidas. Importe o JSON salvo; o JPG sozinho não informa a posição.');
 }catch(e){x.check='Problema: '+e.message;bad++;setTimeout(next,0);return;}
 if(Number(el('matchStrength').value)>0&&!fs.existsSync(files.reference(x.folder,x.filename))){x.check='Problema: referência de cor ausente; use aproximação em 0% para este recorte';bad++;setTimeout(next,0);return;}
 call('check',{coords:x.coords},function(err){
 if(err){x.check='Problema: '+err;bad++;}else{x.check='JPG, coordenadas e página conferidos';delete x.error;good++;}
 setTimeout(next,0);
 });
 }next();
}
window.addEventListener('load',function(){
 try{
 fs=require('fs');path=require('path');var panelPath=decodeURIComponent(window.location.pathname).replace(/^\/([a-zA-Z]:\/)/,'$1');files=require(path.join(path.dirname(panelPath),'files.js'));hostPath=path.join(path.dirname(panelPath),'host','index.jsx').replace(/\\/g,'/');if(!window.__adobe_cep__)throw Error('Ponte CEP indisponível. Abra este painel pelo Photoshop.');
 var stored;try{stored=JSON.parse(localStorage.getItem('recorteap_v11')||'null');}catch(e){}
 var disk=files.loadSession();if(disk&&(!stored||(disk.updatedAt||0)>(stored.updatedAt||0)))stored=disk;
 showTips=!(stored&&stored.tipsSeen);
 if(stored){folder=stored.folder||'';items=normalize(Array.isArray(stored.items)?stored.items:[],folder);el('chkFixProfile').checked=stored.fix!==false;el('matchStrength').value=Math.max(0,Math.min(100,Number(stored.matchStrength)||0));}
 else{folder=localStorage.getItem('recorteap_folder')||'';try{var old=JSON.parse(localStorage.getItem('recorteap_history')||'[]');items=normalize(Array.isArray(old)?old:[],folder);}catch(e){}}
 el('btnChooseFolder').addEventListener('click',function(){try{var r=window.cep.fs.showOpenDialog(false,true,'Pasta de recortes',folder);if(r.err)throw Error('Não foi possível abrir o seletor de pasta (código '+r.err+').');if(r.data&&r.data.length){folder=r.data[0];save();render();}}catch(e){message(e.message,true);}});
 el('btnFullWidth').addEventListener('click',function(){if(busy)return;lock(true);call('marquee',{},function(e){lock(false);message(e||'Marque a área e clique em Capturar recorte.',!!e);});});
 el('btnSync').addEventListener('click',capture);
 el('btnApplyAll').addEventListener('click',function(){if(busy)return;refresh();applyList(items.filter(function(x){return x.status!=='done'&&x.status!=='uncertain'&&!x.missing&&valid(x.coords);}).slice().reverse());});
 el('btnRecover').addEventListener('click',recover);
 el('btnCancel').addEventListener('click',function(){cancel=true;message('Vai parar após o recorte atual.');});
 el('btnRefresh').addEventListener('click',verify);
 el('btnImport').addEventListener('click',scan);
 el('chkFixProfile').addEventListener('change',save);
 el('matchStrength').addEventListener('change',function(){this.value=Math.max(0,Math.min(100,Number(this.value)||0));save();});
 el('btnSaveCoords').addEventListener('click',function(){var n=0,errors=[];items.forEach(function(x){if(!valid(x.coords))return;try{fs.writeFileSync(fileOf(x).replace(/\.jpe?g$/i,'.json'),JSON.stringify(x.coords,null,2),'utf8');n++;}catch(e){errors.push(x.filename+': '+e.message);}});message(n+' coordenadas salvas.'+(errors.length?' '+errors.join('; '):''),errors.length>0);});
 el('btnClearHistory').addEventListener('click',function(){deleteItems(items.filter(function(x){return x.status==='done';}));});
 el('btnDeleteAll').addEventListener('click',function(){deleteItems(items.slice());});
 initTips();save();refresh();message('Pronto.');
 }catch(e){message('Não foi possível iniciar: '+e.message,true);}
});
}());
