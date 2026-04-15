// Localização: host/index.jsx

function createFullWidthSelection() {
    try {
        var doc = app.activeDocument;
        var originalRuler = app.preferences.rulerUnits;
        app.preferences.rulerUnits = Units.PIXELS;
        
        var w = doc.width.value;
        var h = doc.height.value;
        var top = (h / 2) - 300;
        var bottom = (h / 2) + 300;
        doc.selection.select([[0, top], [w, top], [w, bottom], [0, bottom]]);
        app.currentTool = "marqueeRectTool";
        app.preferences.rulerUnits = originalRuler;
        return "OK";
    } catch(e) { return "Erro|" + e.toString(); }
}

function syncFromPhotoshop(folderPath, id) {
    try {
        var doc = app.activeDocument;
        var originalRuler = app.preferences.rulerUnits;
        app.preferences.rulerUnits = Units.PIXELS;

        var bounds = doc.selection.bounds;
        var left = Math.round(bounds[0].value);
        var top = Math.round(bounds[1].value);
        var right = Math.round(bounds[2].value);
        var bottom = Math.round(bounds[3].value);
        
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
        // TENTA EMBUTIR O PERFIL NA SAÍDA PARA AJUDAR O CELULAR
        saveOptions.embedColorProfile = true; 
        
        tempDoc.saveAs(file, saveOptions, true, Extension.LOWERCASE);
        tempDoc.close(SaveOptions.DONOTSAVECHANGES);
        
        app.preferences.rulerUnits = originalRuler;
        return '{"left":' + left + ', "top":' + top + ', "width":' + width + ', "height":' + height + '}';
    } catch(e) {
        app.preferences.rulerUnits = originalRuler || Units.PIXELS;
        return "Erro|" + e.toString();
    }
}

function applyToLayer(imagePath, left, top, width, height, fixProfile) {
    try {
        var originalDoc = app.activeDocument;
        var originalRuler = app.preferences.rulerUnits;
        app.preferences.rulerUnits = Units.PIXELS;
        var cleanPath = imagePath.replace(/\\/g, '/');
        
        var file = new File(cleanPath);
        if (!file.exists) {
            app.preferences.rulerUnits = originalRuler;
            return "Erro|A imagem editada nao foi encontrada na pasta.";
        }

        // 1. O TRUQUE DO "EDITOR DE FOTOS": Abre a imagem isolada
        var tempDoc = app.open(file);

        // 2. FORÇA O PERFIL DE COR (Se a opção estiver marcada no painel)
        if (fixProfile === true || fixProfile === "true") {
            // Isto diz para o Photoshop parar de ler como cinza e forçar a leitura do documento principal
            tempDoc.colorProfileType = ColorProfile.WORKING; 
        }

        // 3. Copia a imagem corrigida
        tempDoc.selection.selectAll();
        tempDoc.selection.copy();
        tempDoc.close(SaveOptions.DONOTSAVECHANGES); // Fecha sem salvar o temporário

        // 4. Cola de volta no documento original
        originalDoc.activeLayer = originalDoc.activeLayer; // Garante o foco no documento
        originalDoc.paste();
        var newLayer = originalDoc.activeLayer;
        
        // 5. Mover para a Coordenada Exata
        var currentLeft = newLayer.bounds[0].value;
        var currentTop = newLayer.bounds[1].value;
        newLayer.translate(parseFloat(left) - currentLeft, parseFloat(top) - currentTop);

        // 6. Esmagar/Ajustar Escala Original
        var currentW = newLayer.bounds[2].value - newLayer.bounds[0].value;
        var currentH = newLayer.bounds[3].value - newLayer.bounds[1].value;
        var scaleX = (parseFloat(width) / currentW) * 100;
        var scaleY = (parseFloat(height) / currentH) * 100;
        newLayer.resize(scaleX, scaleY, AnchorPosition.TOPLEFT);

        app.preferences.rulerUnits = originalRuler;
        return "OK";
    } catch(e) {
        app.preferences.rulerUnits = Units.PIXELS;
        return "Erro|" + e.toString();
    }
}