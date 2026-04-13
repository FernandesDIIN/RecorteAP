// Localização: host/index.jsx

function createFullWidthSelection() {
    try {
        var doc = app.activeDocument;
        var originalRuler = app.preferences.rulerUnits;
        app.preferences.rulerUnits = Units.PIXELS;
        
        var w = doc.width.value;
        var h = doc.height.value;
        
        // Cria seleção de largura total com altura de 600px no centro
        var top = (h / 2) - 300;
        var bottom = (h / 2) + 300;
        doc.selection.select([[0, top], [w, top], [w, bottom], [0, bottom]]);
        
        // APENAS ATIVA A FERRAMENTA (Sem erro de comando desconhecido)
        app.currentTool = "marqueeRectTool";
        
        app.preferences.rulerUnits = originalRuler;
        return "OK";
    } catch(e) {
        return "Erro|" + e.toString();
    }
}

function syncFromPhotoshop(folderPath, id) {
    try {
        var doc = app.activeDocument;
        var originalRuler = app.preferences.rulerUnits;
        app.preferences.rulerUnits = Units.PIXELS;

        // Arredondamento matemático para evitar o erro de 0.5px
        var bounds = doc.selection.bounds;
        var left = Math.round(bounds[0].value);
        var top = Math.round(bounds[1].value);
        var right = Math.round(bounds[2].value);
        var bottom = Math.round(bounds[3].value);
        
        // Garante que o recorte seja baseado em pixels inteiros
        doc.selection.select([[left, top], [right, top], [right, bottom], [left, bottom]]);
        
        var width = right - left;
        var height = bottom - top;

        var tempDoc = doc.duplicate("Temp_RecorteAP");
        tempDoc.flatten();
        tempDoc.crop([UnitValue(left, "px"), UnitValue(top, "px"), UnitValue(right, "px"), UnitValue(bottom, "px")]);
        
        if (tempDoc.mode != DocumentMode.RGB) { tempDoc.changeMode(ChangeMode.RGB); }
        tempDoc.bitsPerChannel = BitsPerChannelType.EIGHT;
        
        var cleanPath = folderPath.replace(/\\/g, '/');
        var filePath = cleanPath + "/" + id + ".jpg";
        var file = new File(filePath);
        
        var saveOptions = new JPEGSaveOptions();
        saveOptions.quality = 12;
        tempDoc.saveAs(file, saveOptions, true, Extension.LOWERCASE);
        tempDoc.close(SaveOptions.DONOTSAVECHANGES);
        
        app.preferences.rulerUnits = originalRuler;
        // Retorna as coordenadas arredondadas
        return '{"left":' + left + ', "top":' + top + ', "width":' + width + ', "height":' + height + '}';
    } catch(e) {
        app.preferences.rulerUnits = originalRuler || Units.PIXELS;
        return "Erro|" + e.toString();
    }
}

function applyToLayer(imagePath, left, top, width, height, saturation) {
    try {
        var doc = app.activeDocument;
        var originalRuler = app.preferences.rulerUnits;
        app.preferences.rulerUnits = Units.PIXELS;

        var cleanPath = imagePath.replace(/\\/g, '/');
        
        // --- NOVA TRAVA DE SEGURANÇA ---
        var file = new File(cleanPath);
        if (!file.exists) {
            app.preferences.rulerUnits = originalRuler;
            return "Erro|A imagem editada nao foi encontrada na pasta.";
        }
        // -------------------------------

        // 1. Inserir a imagem (Place Embedded)
        var idPlc = charIDToTypeID( "Plc " );
        var desc = new ActionDescriptor();
        var idnull = charIDToTypeID( "null" );
        desc.putPath( idnull, file );
        var idFTcs = charIDToTypeID( "FTcs" );
        var idQCSt = charIDToTypeID( "QCSt" );
        var idQcsa = charIDToTypeID( "Qcsa" );
        desc.putEnumerated( idFTcs, idQCSt, idQcsa );
        executeAction( idPlc, desc, DialogModes.NO );

        var newLayer = doc.activeLayer;
        
        // 2. Mover para a Coordenada Exata
        var currentLeft = newLayer.bounds[0].value;
        var currentTop = newLayer.bounds[1].value;
        newLayer.translate(parseFloat(left) - currentLeft, parseFloat(top) - currentTop);

        // 3. Esmagar/Ajustar para o Tamanho Original do Recorte (Força a Escala Absoluta)
        var currentW = newLayer.bounds[2].value - newLayer.bounds[0].value;
        var currentH = newLayer.bounds[3].value - newLayer.bounds[1].value;
        var scaleX = (parseFloat(width) / currentW) * 100;
        var scaleY = (parseFloat(height) / currentH) * 100;
        newLayer.resize(scaleX, scaleY, AnchorPosition.TOPLEFT);
        
        newLayer.rasterize(RasterizeType.ENTIRELAYER);

        // 4. Aplicar Saturação Automática (Seu bloco original intacto)
        var satVal = parseInt(saturation);
        if (satVal !== 0 && !isNaN(satVal)) {
            var idHStr = charIDToTypeID( "HStr" );
            var descSatMaster = new ActionDescriptor();
            var idpresetKind = stringIDToTypeID( "presetKind" );
            var idpresetKindType = stringIDToTypeID( "presetKindType" );
            var idpresetKindCustom = stringIDToTypeID( "presetKindCustom" );
            descSatMaster.putEnumerated( idpresetKind, idpresetKindType, idpresetKindCustom );
            descSatMaster.putBoolean( charIDToTypeID( "Clrz" ), false );
            
            var listAdjs = new ActionList();
            var descSatProps = new ActionDescriptor();
            descSatProps.putInteger( charIDToTypeID( "H   " ), 0 ); // Matiz
            descSatProps.putInteger( charIDToTypeID( "Strt" ), satVal ); // SATURAÇÃO
            descSatProps.putInteger( charIDToTypeID( "Lght" ), 0 ); // Luminosidade
            
            listAdjs.putObject( stringIDToTypeID( "hueSatAdjustmentV2" ), descSatProps );
            descSatMaster.putList( charIDToTypeID( "Adjs" ), listAdjs );
            executeAction( idHStr, descSatMaster, DialogModes.NO );
        }

        app.preferences.rulerUnits = originalRuler;
        return "OK";
    } catch(e) {
        app.preferences.rulerUnits = Units.PIXELS;
        return "Erro|" + e.toString();
    }
}