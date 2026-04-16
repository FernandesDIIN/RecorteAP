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
    // 🛡️ MODO SILENCIOSO ATIVADO
    var originalDialogs = app.displayDialogs;
    app.displayDialogs = DialogModes.NO; 
    
    try {
        var originalDoc = app.activeDocument;
        var originalRuler = app.preferences.rulerUnits;
        app.preferences.rulerUnits = Units.PIXELS;
        var cleanPath = imagePath.replace(/\\/g, '/');
        
        var file = new File(cleanPath);
        if (!file.exists) {
            app.displayDialogs = originalDialogs;
            return "Erro|Arquivo não encontrado.";
        }

        var tempDoc = app.open(file);
        if (fixProfile === true || fixProfile === "true") {
            tempDoc.colorProfileType = ColorProfile.WORKING; 
        }

        tempDoc.selection.selectAll();
        tempDoc.selection.copy();
        tempDoc.close(SaveOptions.DONOTSAVECHANGES);

        originalDoc.paste();
        var newLayer = originalDoc.activeLayer;
        
        var currentLeft = newLayer.bounds[0].value;
        var currentTop = newLayer.bounds[1].value;
        newLayer.translate(parseFloat(left) - currentLeft, parseFloat(top) - currentTop);

        var currentW = newLayer.bounds[2].value - newLayer.bounds[0].value;
        var currentH = newLayer.bounds[3].value - newLayer.bounds[1].value;
        newLayer.resize((parseFloat(width) / currentW) * 100, (parseFloat(height) / currentH) * 100, AnchorPosition.TOPLEFT);

        app.preferences.rulerUnits = originalRuler;
        app.displayDialogs = originalDialogs; // Devolve ao normal
        return "OK";
    } catch(e) {
        app.displayDialogs = originalDialogs;
        return "Erro|" + e.toString();
    }
}

function applyBatchToDocument(docName, batchStr, fixProfile) {
    var originalDialogs = app.displayDialogs;
    app.displayDialogs = DialogModes.NO;
    var originalRuler = app.preferences.rulerUnits;

    try {
        app.preferences.rulerUnits = Units.PIXELS;

        // 1. PROCURA A ABA CORRETA NO PHOTOSHOP
        var targetDoc = null;
        for (var i = 0; i < app.documents.length; i++) {
            var dName = app.documents[i].name.replace(/\.[^\.]+$/, ""); // Remove o ".psd" se houver
            var safeDName = dName.replace(/[^a-zA-Z0-9_-]/g, ''); // Limpa igual no ID
            
            if (dName === docName || safeDName === docName) {
                targetDoc = app.documents[i];
                break;
            }
        }

        if (!targetDoc) {
            app.preferences.rulerUnits = originalRuler;
            app.displayDialogs = originalDialogs;
            return "Erro|A aba base (" + docName + ") nao esta aberta no Photoshop.";
        }

        app.activeDocument = targetDoc;

        // 2. PREPARA A ÚLTIMA CAMADA (A IMAGEM BASE)
        var bottomLayer = targetDoc.layers[targetDoc.layers.length - 1];
        if (bottomLayer.isBackgroundLayer) {
            bottomLayer.isBackgroundLayer = false; // Destranca para podermos colar coisas nela
        }

        // 3. ATIRA OS RECORTES UM POR UM
        var items = batchStr.split(";;;");
        for (var j = 0; j < items.length; j++) {
            var parts = items[j].split("|");
            var cleanPath = parts[0];
            var left = parseFloat(parts[1]);
            var top = parseFloat(parts[2]);
            var width = parseFloat(parts[3]);
            var height = parseFloat(parts[4]);

            var file = new File(cleanPath);
            if (!file.exists) continue;

            // Abre, Copia e Fecha
            var tempDoc = app.open(file);
            if (fixProfile === true || fixProfile === "true") tempDoc.colorProfileType = ColorProfile.WORKING;
            tempDoc.selection.selectAll();
            tempDoc.selection.copy();
            tempDoc.close(SaveOptions.DONOTSAVECHANGES);

            // Cola a imagem exatamente ACIMA da camada de fundo
            app.activeDocument = targetDoc;
            targetDoc.activeLayer = bottomLayer; 
            targetDoc.paste();

            var newLayer = targetDoc.activeLayer;

            // Posiciona e Redimensiona
            var currentLeft = newLayer.bounds[0].value;
            var currentTop = newLayer.bounds[1].value;
            newLayer.translate(left - currentLeft, top - currentTop);

            var currentW = newLayer.bounds[2].value - newLayer.bounds[0].value;
            var currentH = newLayer.bounds[3].value - newLayer.bounds[1].value;
            newLayer.resize((width / currentW) * 100, (height / currentH) * 100, AnchorPosition.TOPLEFT);

            // 4. A FUSÃO (Merge)
            newLayer.merge(); // Achata o recorte com a camada de baixo!
            
            // Atualiza a referência: a camada achatada é o novo 'fundo'
            bottomLayer = targetDoc.activeLayer; 
        }

        app.preferences.rulerUnits = originalRuler;
        app.displayDialogs = originalDialogs;
        return "OK";
    } catch(e) {
        app.preferences.rulerUnits = originalRuler || Units.PIXELS;
        app.displayDialogs = originalDialogs;
        return "Erro|" + e.toString();
    }
}