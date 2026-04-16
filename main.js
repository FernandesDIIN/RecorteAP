let csInterface;
let fs;
let path;
let destinationFolder = "";
let history = [];
let imageCounter = 1; 

window.onload = function() {
    try {
        csInterface = new CSInterface();
        fs = require('fs');
        path = require('path');
        loadSettings();
        renderHistory();
        
        document.getElementById('btnChooseFolder').addEventListener('click', chooseFolder);
        document.getElementById('btnFullWidth').addEventListener('click', createFullWidthSelection);
        document.getElementById('btnSync').addEventListener('click', syncFromPhotoshop);
        document.getElementById('btnRefresh').addEventListener('click', checkFilesReady);
        document.getElementById('btnClearHistory').addEventListener('click', clearAllHistory);
    } catch (e) {
        document.getElementById('folderPathDisplay').innerText = "Modo de teste";
    }
};

function clearAllHistory() {
    if (confirm("Apagar todo o histórico e arquivos?")) {
        try {
            if (fs && destinationFolder && history.length > 0) {
                history.forEach(item => {
                    const filePath = path.join(destinationFolder, item.filename);
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                });
            }
            history = []; 
            imageCounter = 1; 
            saveSettings();
            renderHistory();
        } catch (e) {}
    }
}

function loadSettings() {
    destinationFolder = localStorage.getItem('recorteap_folder') || "";
    if (destinationFolder) document.getElementById('folderPathDisplay').innerText = destinationFolder;
    const savedHistory = localStorage.getItem('recorteap_history');
    if (savedHistory) history = JSON.parse(savedHistory);
    imageCounter = parseInt(localStorage.getItem('recorteap_counter')) || 1;
}

function saveSettings() {
    localStorage.setItem('recorteap_folder', destinationFolder);
    localStorage.setItem('recorteap_history', JSON.stringify(history));
    localStorage.setItem('recorteap_counter', imageCounter); 
}

function chooseFolder() {
    const result = window.cep.fs.showOpenDialog(false, true, "Selecione a pasta", destinationFolder);
    if (result.data && result.data.length > 0) {
        destinationFolder = result.data[0];
        document.getElementById('folderPathDisplay').innerText = destinationFolder;
        saveSettings();
        checkFilesReady();
    }
}

function createFullWidthSelection() {
    csInterface.evalScript('createFullWidthSelection()');
}

function syncFromPhotoshop() {
    if (!destinationFolder) { alert("Selecione a pasta primeiro."); return; }
    
    // CAPTURA O NOME DA PÁGINA
    csInterface.evalScript('app.activeDocument.name.replace(/\\.[^\\.]+$/, "")', function(docName) {
        if (!docName || docName === "EvalScript error.") docName = "Page";
        
        // Limpa o nome para o ID ficar bonito
        const safeDocName = docName.replace(/[^a-zA-Z0-9_-]/g, '');
        const id = imageCounter + " Img" + safeDocName;
        imageCounter++; 
        
        const safePath = destinationFolder.replace(/\\/g, '/');
        
        csInterface.evalScript(`syncFromPhotoshop("${safePath}", "${id}")`, function(result) {
            if (result.startsWith("Erro")) { alert(result); return; }
            try {
                const coords = JSON.parse(result);
                history.unshift({
                    id: id,
                    filename: id + ".jpg",
                    coords: coords,
                    status: 'waiting'
                });
                saveSettings();
                renderHistory();
                checkFilesReady();
            } catch (e) { alert("Erro: " + e); }
        });
    });
}

function checkFilesReady() {
    if (!fs || !destinationFolder) return;
    let changed = false;
    history.forEach(item => {
        if (item.status === 'done') return;
        const filePath = path.join(destinationFolder, item.filename);
        if (fs.existsSync(filePath)) {
            if (item.status !== 'ready') { item.status = 'ready'; changed = true; }
        }
    });
    if (changed) { saveSettings(); renderHistory(); }
}

function applyToLayer(id) {
    const itemIndex = history.findIndex(h => h.id === id);
    if (itemIndex === -1) return;
    const item = history[itemIndex];
    const safePath = path.join(destinationFolder, item.filename).replace(/\\/g, '/');
    const fixProfile = document.getElementById('chkFixProfile').checked;
    
    const script = `applyToLayer("${safePath}", ${item.coords.left}, ${item.coords.top}, ${item.coords.width}, ${item.coords.height}, ${fixProfile})`;
    
    csInterface.evalScript(script, function(result) {
        if (result.startsWith("Erro")) { alert(result); return; }
        history[itemIndex].status = 'done';
        saveSettings();
        renderHistory();
    });
}

function renderHistory() {
    const container = document.getElementById('historyList');
    container.innerHTML = '';
    
    if (history.length === 0) {
        container.innerHTML = '<div style="color: #aaa; text-align: center; padding: 10px;">Vazio</div>';
        return;
    }
    
    history.forEach(item => {
        const div = document.createElement('div');
        div.className = `history-item ${item.status}`;
        let statusText = item.status === 'ready' ? "Pronto" : (item.status === 'done' ? "Concluído" : "Aguardando");
        
        div.innerHTML = `
            <div class="history-header">
                <span class="history-id">${item.id}</span>
                <div style="display: flex; align-items: center; gap: 5px;">
                    <span style="font-size: 10px; color: #aaa;">${statusText}</span>
                    <div class="status-indicator"></div>
                </div>
            </div>
            <div class="history-actions" style="justify-content: flex-end;">
                <button class="apply-btn ${item.status === 'ready' ? 'primary' : ''}" 
                        onclick="applyToLayer('${item.id}')" 
                        ${item.status === 'waiting' ? 'disabled' : ''}>
                    Aplicar
                </button>
            </div>
        `;
        container.appendChild(div);
    });
}

window.applyToLayer = applyToLayer;