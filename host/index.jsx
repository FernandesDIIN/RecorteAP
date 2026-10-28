/* RecorteAP 1.2.6 - Photoshop 2019+ / ExtendScript ES3 */
$.global.RecorteAP = (function () {
    var cleanupWarnings=[];
    function quote(s){return '"'+String(s).replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\r/g,'\\r').replace(/\n/g,'\\n').replace(/\t/g,'\\t').replace(/[\x00-\x1f]/g,' ')+'"';}
    function json(o){if(o===null)return 'null';if(typeof o==='string')return quote(o);if(typeof o==='number')return isFinite(o)?String(o):'null';if(typeof o==='boolean')return String(o);var a=[],k;if(o instanceof Array){for(k=0;k<o.length;k++)a.push(json(o[k]));return '['+a.join(',')+']';}for(k in o)if(o.hasOwnProperty(k))a.push(quote(k)+':'+json(o[k]));return '{'+a.join(',')+'}';}
    function live(d){try{for(var i=0;i<app.documents.length;i++)if(app.documents[i]===d)return true;}catch(e){}return false;}
    function fullPath(d){try{return d.fullName.fsName;}catch(e){return '';}}
    function identity(d){return {documentId:d.id,documentName:d.name,documentPath:fullPath(d),pageWidth:d.width.as('px'),pageHeight:d.height.as('px')};}
    function state(){return {doc:app.documents.length?app.activeDocument:null,dialogs:app.displayDialogs,tool:app.currentTool};}
    function restore(s){try{if(live(s.doc))app.activeDocument=s.doc;}catch(e){}try{if(app.currentTool!==s.tool)app.currentTool=s.tool;}catch(e){}try{app.displayDialogs=s.dialogs;}catch(e){}}
    function closeTemp(d){try{if(live(d)){app.activeDocument=d;d.close(SaveOptions.DONOTSAVECHANGES);}}catch(e){cleanupWarnings.push('Não foi possível fechar uma cópia temporária: '+e.message);}}
    function valid(c){return c&&typeof c.left==='number'&&typeof c.top==='number'&&typeof c.width==='number'&&typeof c.height==='number'&&isFinite(c.left)&&isFinite(c.top)&&isFinite(c.width)&&isFinite(c.height)&&c.left>=0&&c.top>=0&&c.width>0&&c.height>0;}
    function nameKey(value){
        var n=String(value||'');
        return /windows/i.test($.os||'')?n.toLowerCase():n;
    }
    function resolve(c){
        var exact=[],stem=[],legacy=[],names=[],i,d,n;
        var wanted=nameKey(c.documentName),base=wanted.replace(/\.[^.]+$/,'');
        // Match the tab name. Saved paths and document IDs do not choose a page.
        for(i=0;i<app.documents.length;i++){
            d=app.documents[i];names.push(d.name);n=nameKey(d.name);
            if(wanted&&n===wanted)exact.push(d);
            if(wanted&&n.replace(/\.[^.]+$/,'')===base)stem.push(d);
            if(!wanted&&c.legacyName){
                n=d.name.replace(/\.[^.]+$/,'');
                if(nameKey(n)===nameKey(c.legacyName)||nameKey(n.replace(/[^a-zA-Z0-9_-]/g,''))===nameKey(c.legacyName))legacy.push(d);
            }
        }
        var matches=exact.length?exact:(wanted?stem:legacy);
        if(matches.length>1)throw Error('Há mais de uma aba com o nome '+(c.documentName||c.legacyName)+'. Deixe aberta apenas a página correspondente a este recorte.');
        if(!matches.length)throw Error('Abra a página '+(c.documentName||c.legacyName||'de origem')+'. Abas encontradas: '+(names.join(', ')||'nenhuma')+'. A pasta do arquivo não interfere na busca.');
        d=matches[0];app.activeDocument=d;
        if(c.pageWidth&&c.pageHeight&&(Math.abs(d.width.as('px')-c.pageWidth)>0.5||Math.abs(d.height.as('px')-c.pageHeight)>0.5))throw Error('A aba '+d.name+' foi encontrada, mas as dimensões mudaram desde o recorte.');
        return d;
    }
    function baseLayer(d){
        for(var i=d.layers.length-1;i>=0;i--){var l=d.layers[i];if(l.typename==='ArtLayer'&&l.kind===LayerKind.NORMAL&&!l.isBackgroundLayer&&l.visible&&!l.allLocked&&!l.pixelsLocked&&!l.positionLocked&&!l.transparentPixelsLocked&&!l.grouped)return l;}
        throw Error('Nenhuma camada de imagem visível e desbloqueada na raiz. Duplique a camada de fundo protegida antes de aplicar.');
    }
    var SRGB='sRGB IEC61966-2.1';
    function assignProfile(profile){
        var desc=new ActionDescriptor(),ref=new ActionReference();
        ref.putEnumerated(stringIDToTypeID('document'),stringIDToTypeID('ordinal'),stringIDToTypeID('targetEnum'));
        desc.putReference(stringIDToTypeID('null'),ref);
        desc.putString(stringIDToTypeID('profile'),profile);
        executeAction(stringIDToTypeID('assignProfile'),desc,DialogModes.NO);
    }
    function rgb(d){app.activeDocument=d;if(d.mode!==DocumentMode.RGB)d.changeMode(ChangeMode.RGB);d.bitsPerChannel=BitsPerChannelType.EIGHT;}
    function matchTone(target,source,amount){
        app.activeDocument=target;target.selection.deselect();
        var desc=new ActionDescriptor(),ref=new ActionReference();
        desc.putInteger(stringIDToTypeID('lightness'),100);
        desc.putInteger(stringIDToTypeID('colorRange'),100);
        desc.putInteger(stringIDToTypeID('fade'),100-amount);
        desc.putBoolean(stringIDToTypeID('selection'),false);
        ref.putProperty(stringIDToTypeID('layer'),stringIDToTypeID('background'));
        ref.putIdentifier(stringIDToTypeID('document'),source.id);
        desc.putReference(stringIDToTypeID('source'),ref);
        executeAction(stringIDToTypeID('matchColor'),desc,DialogModes.NO);
    }
    function capture(args){
        if(!app.documents.length)throw Error('Abra uma página e selecione a área com o letreiro.');
        var d=app.activeDocument,tmp=null,origin=d.rulerOrigin,c=identity(d),file=new File(args.file);
        if(args.documentId!==undefined&&d.id!==args.documentId)throw Error('A página ativa mudou durante a captura. Tente novamente.');
        if(file.exists)throw Error('O arquivo de recorte já existe. Verifique a pasta e tente novamente.');
        if(!file.parent.exists)throw Error('A pasta de destino não existe.');
        try{
            d.rulerOrigin=[0,0];
            var b;try{b=d.selection.bounds;}catch(e){throw Error('Faça uma seleção e confirme qualquer recorte/transformação em andamento antes de capturar.');}
            c.left=Math.max(0,Math.floor(b[0].as('px')));c.top=Math.max(0,Math.floor(b[1].as('px')));
            var r=Math.min(c.pageWidth,Math.ceil(b[2].as('px'))),bt=Math.min(c.pageHeight,Math.ceil(b[3].as('px')));
            c.width=r-c.left;c.height=bt-c.top;if(!valid(c))throw Error('A seleção não ocupa uma área válida da página.');
            tmp=d.duplicate('RecorteAP_temporario');app.activeDocument=tmp;
            tmp.flatten();tmp.crop([UnitValue(c.left,'px'),UnitValue(c.top,'px'),UnitValue(r,'px'),UnitValue(bt,'px')]);
            if(tmp.mode!==DocumentMode.RGB)tmp.changeMode(ChangeMode.RGB);
            tmp.bitsPerChannel=BitsPerChannelType.EIGHT;
            tmp.convertProfile(SRGB,Intent.RELATIVECOLORIMETRIC,true,false);c.exportProfile=SRGB;
            var opt=new JPEGSaveOptions();opt.quality=12;opt.embedColorProfile=true;
            tmp.saveAs(file,opt,true,Extension.LOWERCASE);
            return c;
        }finally{try{closeTemp(tmp);}finally{if(live(d)){app.activeDocument=d;try{d.rulerOrigin=origin;}catch(originError){cleanupWarnings.push('Não foi possível restaurar a origem da régua: '+originError.message);}}}}
    }
    function apply(args){
        var c=args.coords;if(!valid(c))throw Error('Recorte sem coordenadas válidas. Recapture a área; não será colada em uma posição presumida.');
        var d=resolve(c),base=baseLayer(d),snapshot=d.activeHistoryState,origin=d.rulerOrigin,tmp=null,opened=null,owned=false,reference=null,referenceOpened=null,referenceOwned=false;
        try{
            if(c.left+c.width>d.width.as('px')+0.5||c.top+c.height>d.height.as('px')+0.5)throw Error('As coordenadas ultrapassam a página de origem. Capture novamente.');
            d.rulerOrigin=[0,0];
            var file=new File(args.file);if(!file.exists)throw Error('Recorte não encontrado: '+file.name);
            if(fullPath(d)===file.fsName)throw Error('O recorte e a página de origem não podem ser o mesmo arquivo.');
            for(var i=0;i<app.documents.length;i++)if(fullPath(app.documents[i])===file.fsName){opened=app.documents[i];break;}
            if(opened&&opened.saved===false)throw Error('Salve ou feche o JPG aberto no Photoshop antes de aplicar.');
            if(!opened){opened=app.open(file);owned=true;}
            app.activeDocument=opened;tmp=opened.duplicate('RecorteAP_aplicacao');app.activeDocument=tmp;tmp.flatten();
            var strength=Math.max(0,Math.min(100,Math.round(Number(args.matchStrength)||0))),profile='',warning='';
            app.activeDocument=d;
            if(d.colorProfileType!==ColorProfile.NONE)profile=d.colorProfileName;
            app.activeDocument=tmp;
            if(args.fixProfile||strength){
                rgb(tmp);
                // An external editor can strip the ICC tag. New captures have known sRGB pixels.
                if(args.inputHasICC===false){assignProfile(c.exportProfile||SRGB);if(!c.exportProfile)warning='Recorte antigo sem ICC: interpretado como sRGB. Se a cor divergir, capture novamente.';}
                tmp.convertProfile(SRGB,Intent.RELATIVECOLORIMETRIC,true,false);
            }
            if(strength){
                var referenceFile=args.referenceFile?new File(args.referenceFile):null;
                if(!referenceFile||!referenceFile.exists)throw Error('Referência original ausente. Recapture a área ou defina Aproximar cores em 0%.');
                for(i=0;i<app.documents.length;i++)if(fullPath(app.documents[i])===referenceFile.fsName){referenceOpened=app.documents[i];break;}
                if(!referenceOpened){referenceOpened=app.open(referenceFile);referenceOwned=true;}
                app.activeDocument=referenceOpened;reference=referenceOpened.duplicate('RecorteAP_referencia');app.activeDocument=reference;reference.flatten();reference.selection.deselect();rgb(reference);
                reference.convertProfile(SRGB,Intent.RELATIVECOLORIMETRIC,true,false);
                matchTone(tmp,reference,strength);
            }
            app.activeDocument=tmp;
            if((args.fixProfile||strength)&&profile)tmp.convertProfile(profile,Intent.RELATIVECOLORIMETRIC,true,false);
            if(args.fixProfile&&!profile)warning='Página sem perfil ICC: não é possível garantir a correspondência de cor. Atribua o perfil correto à página.';
            // Duplicate pixels directly; clipboard and destination selection remain untouched.
            app.activeDocument=tmp;var layer=tmp.activeLayer.duplicate(d,ElementPlacement.PLACEATBEGINNING);
            app.activeDocument=d;d.activeLayer=layer;layer.move(base,ElementPlacement.PLACEBEFORE);layer.grouped=false;layer.visible=true;layer.opacity=100;layer.blendMode=BlendMode.NORMAL;
            var b=layer.bounds,w=b[2].as('px')-b[0].as('px'),h=b[3].as('px')-b[1].as('px');
            if(w<=0||h<=0)throw Error('A imagem do recorte está vazia.');
            var sx=c.width/w*100,sy=c.height/h*100;if(sx<0.01||sy<0.01||sx>10000||sy>10000)throw Error('Redimensionamento extremo. Confira as dimensões do recorte.');
            layer.resize(sx,sy,AnchorPosition.TOPLEFT);b=layer.bounds;layer.translate(UnitValue(c.left-b[0].as('px'),'px'),UnitValue(c.top-b[1].as('px'),'px'));layer.grouped=false;
            layer.merge();return {message:'Recorte aplicado em '+d.name,warning:warning,source:identity(d)};
        }catch(e){try{app.activeDocument=d;d.activeHistoryState=snapshot;}catch(rollback){throw Error(e.message+' | Não foi possível desfazer automaticamente: '+rollback.message);}throw e;}
        finally{try{closeTemp(reference);}finally{try{if(referenceOwned)closeTemp(referenceOpened);}finally{try{closeTemp(tmp);}finally{try{if(owned)closeTemp(opened);}finally{if(live(d)){app.activeDocument=d;try{d.rulerOrigin=origin;}catch(originError){cleanupWarnings.push('Não foi possível restaurar a origem da régua: '+originError.message);}}}}}}}
    }
    function run(action,args){
        var s;
        try{
            cleanupWarnings=[];s=state();app.displayDialogs=DialogModes.NO;
            var data;
            if(action==='info'){if(!app.documents.length)throw Error('Nenhuma página aberta.');data=identity(app.activeDocument);}
            else if(action==='capture')data=capture(args);
            else if(action==='check'){if(!valid(args.coords))throw Error('Coordenadas inválidas.');var checked=resolve(args.coords);baseLayer(checked);if(args.coords.left+args.coords.width>checked.width.as('px')+0.5||args.coords.top+args.coords.height>checked.height.as('px')+0.5)throw Error('Recorte fora dos limites da página.');data={};}
            else if(action==='apply')data=apply(args);
            else if(action==='marquee'){app.currentTool='marqueeRectTool';s.tool=app.currentTool;data={};}
            else throw Error('Comando desconhecido.');
            if(cleanupWarnings.length)data.warning=(data.warning?data.warning+' | ':'')+cleanupWarnings.join(' | ');
            return json({ok:true,data:data});
        }catch(e){return json({ok:false,error:e.message||String(e),line:e.line||0});}
        finally{if(s)restore(s);}
    }
    return {run:run,version:'1.2.6'};
}());
