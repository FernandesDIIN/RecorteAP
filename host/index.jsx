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
    // 🛡️ O ESCUDO ANTI-POP-UP: Guarda o estado atual e força o modo silencioso!
    var originalDialogs = app.displayDialogs;
    app.displayDialogs = DialogModes.NO; 
    
    try {
        var originalDoc = app.activeDocument;
        var originalRuler = app.preferences.rulerUnits;
        app.preferences.rulerUnits = Units.PIXELS;
        var cleanPath = imagePath.replace(/\\/g, '/');
        
        var file = new File(cleanPath);
        if (!file.exists) {
            app.preferences.rulerUnits = originalRuler;
            app.displayDialogs = originalDialogs;
            return "Erro|A imagem editada nao foi encontrada na pasta.";
        }

        var tempDoc = app.open(file);

        if (fixProfile === true || fixProfile === "true") {
            tempDoc.colorProfileType = ColorProfile.WORKING; 
        }

        tempDoc.selection.selectAll();
        tempDoc.selection.copy();
        tempDoc.close(SaveOptions.DONOTSAVECHANGES);

        originalDoc.activeLayer = originalDoc.activeLayer; 
        originalDoc.paste();
        var newLayer = originalDoc.activeLayer;
        
        var currentLeft = newLayer.bounds[0].value;
        var currentTop = newLayer.bounds[1].value;
        newLayer.translate(parseFloat(left) - currentLeft, parseFloat(top) - currentTop);

        var currentW = newLayer.bounds[2].value - newLayer.bounds[0].value;
        var currentH = newLayer.bounds[3].value - newLayer.bounds[1].value;
        var scaleX = (parseFloat(width) / currentW) * 100;
        var scaleY = (parseFloat(height) / currentH) * 100;
        newLayer.resize(scaleX, scaleY, AnchorPosition.TOPLEFT);

        app.preferences.rulerUnits = originalRuler;
        app.displayDialogs = originalDialogs; // Devolve as caixas de diálogo ao normal
        return "OK";
    } catch(e) {
        app.preferences.rulerUnits = Units.PIXELS;
        app.displayDialogs = originalDialogs; // Devolve ao normal até se der erro
        return "Erro|" + e.toString();
    }
}