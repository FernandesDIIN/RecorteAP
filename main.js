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
        document.getElementById('folderPathDisplay').innerText = "Modo de teste (Fora do Photoshop)";
    }
};

function clearAllHistory() {
    const confirmacao = confirm("Deseja apagar TODO o histórico e DELETAR permanentemente as imagens da pasta de destino?");
    if (confirmacao) {
        try {
            if (fs && destinationFolder && history.length > 0) {
                history.forEach(item => {
                    const filePath = path.join(destinationFolder, item.filename);
                    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (err) {}
                });
            }
            history = []; 
            imageCounter = 1; 
            saveSettings();
            renderHistory();
        } catch (e) { alert("Erro durante a limpeza: " + e.toString()); }
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
    if (!csInterface) return;
    const result = window.cep.fs.showOpenDialog(false, true, "Selecione a pasta de destino", destinationFolder);
    if (result.data && result.data.length > 0) {
        destinationFolder = result.data[0];
        document.getElementById('folderPathDisplay').innerText = destinationFolder;
        saveSettings();
        checkFilesReady();
    }
}

function createFullWidthSelection() {
    if (!csInterface) return;
    csInterface.evalScript('createFullWidthSelection()');
}

function syncFromPhotoshop() {
    if (!csInterface) return;
    if (!destinationFolder) { alert("Selecione uma pasta de destino primeiro."); return; }
    
    // 1. Pega o nome do documento aberto no Photoshop
    csInterface.evalScript('app.activeDocument.name.replace(/\\.[^\\.]+$/, "")', function(rawDocName) {
        if (!rawDocName || rawDocName === "EvalScript error.") rawDocName = "Doc";
        
        // 2. Limpa o nome para evitar caracteres proibidos em arquivos
        const safeDocName = rawDocName.replace(/[^a-zA-Z0-9_-]/g, '').trim();
        
        // 3. Monta o ID (Ex: 1 ImgPage1)
        const id = imageCounter + " Img" + safeDocName;
        imageCounter++; 
        const safePath = destinationFolder.replace(/\\/g, '/');
        
        csInterface.evalScript(`syncFromPhotoshop("${safePath}", "${id}")`, function(result) {
            if (result && result.startsWith("Erro")) { alert(result); return; }
            try {
                const coords = JSON.parse(result);
                history.unshift({
                    id: id,
                    docName: rawDocName, // Salva o nome real para o Grupo
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
        } else {
            if (item.status !== 'waiting') { item.status = 'waiting'; changed = true; }
        }
    });
    if (changed) { saveSettings(); renderHistory(); }
}

function applyToLayer(id, skipRender = false, callback = null) {
    if (!csInterface) return;
    const itemIndex = history.findIndex(h => h.id === id);
    if (itemIndex === -1) {
        if(callback) callback();
        return;
    }
    
    const item = history[itemIndex];
    const filePath = path.join(destinationFolder, item.filename);
    const safePath = filePath.replace(/\\/g, '/');
    const fixProfile = document.getElementById('chkFixProfile').checked;
    
    const script = `applyToLayer("${safePath}", ${item.coords.left}, ${item.coords.top}, ${item.coords.width}, ${item.coords.height}, ${fixProfile})`;
    
    csInterface.evalScript(script, function(result) {
        if (result && result.startsWith("Erro")) { 
            alert(result); 
        } else {
            history[itemIndex].status = 'done';
            saveSettings();
        }
        if (!skipRender) renderHistory();
        if (callback) callback();
    });
}

// NOVA FUNÇÃO: Aplica todos de um grupo em fila (para não travar o PS)
function applyGroup(docName) {
    const itemsToApply = history.filter(i => i.docName === docName && i.status === 'ready');
    if (itemsToApply.length === 0) return;

    let index = 0;
    function processNext() {
        if (index >= itemsToApply.length) {
            renderHistory(); // Atualiza a UI no final
            return;
        }
        const item = itemsToApply[index];
        // Aplica pulando o render individual, chama callback quando terminar
        applyToLayer(item.id, true, () => {
            index++;
            processNext();
        });
    }
    processNext(); // Dispara o gatilho
}

function renderHistory() {
    const container = document.getElementById('historyList');
    container.innerHTML = '';
    
    if (history.length === 0) {
        container.innerHTML = '<div style="color: #aaa; text-align: center; padding: 10px;">Nenhum recorte no histórico</div>';
        return;
    }
    
    // Agrupar itens pelo nome do documento
    const groups = {};
    history.forEach(item => {
        const groupName = item.docName || "Desconhecido";
        if (!groups[groupName]) groups[groupName] = [];
        groups[groupName].push(item);
    });

    // Renderizar Grupos
    for (const [docName, items] of Object.entries(groups)) {
        const groupDiv = document.createElement('div');
        groupDiv.style = "margin-bottom: 12px; border: 1px solid #3f3f46; border-radius: 6px; overflow: hidden;";
        
        const pendingCount = items.filter(i => i.status === 'ready').length;
        
        // Cabeçalho do Grupo com botão Aplicar Tudo
        groupDiv.innerHTML = `
            <div style="background: #27272a; padding: 6px 10px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #3f3f46;">
                <strong style="color: #e4e4e7; font-size: 13px;">📄 ${docName}</strong>
                <button class="btn ${pendingCount > 0 ? 'primary' : ''}" 
                        style="padding: 4px 8px; font-size: 11px; margin: 0; width: auto;"
                        onclick="applyGroup('${docName}')" ${pendingCount === 0 ? 'disabled' : ''}>
                    Aplicar Tudo (${pendingCount})
                </button>
            </div>
            <div class="group-items" style="padding: 5px; display: flex; flex-direction: column; gap: 5px;"></div>
        `;
        
        const itemsContainer = groupDiv.querySelector('.group-items');
        
        // Renderizar Itens Individuais do Grupo
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = `history-item ${item.status}`;
            div.style.marginBottom = "0"; // Remove margem extra dentro do grupo
            
            let statusText = item.status === 'ready' ? "Pronto" : (item.status === 'done' ? "Concluído" : "Aguardando");
            
            div.innerHTML = `
                <div class="history-header">
                    <span class="history-id">${item.id}</span>
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <span style="font-size: 10px; color: #aaa;">${statusText}</span>
                        <div class="status-indicator"></div>
                    </div>
                </div>
                <div style="font-size: 10px; color: #aaa;">
                    Pos: [${Math.round(item.coords.left)}, ${Math.round(item.coords.top)}]
                </div>
                <div class="history-actions" style="justify-content: flex-end;">
                    <button class="apply-btn ${item.status === 'ready' ? 'primary' : ''}" 
                            onclick="applyToLayer('${item.id}')" 
                            ${item.status === 'waiting' ? 'disabled' : ''}>
                        Aplicar
                    </button>
                </div>
            `;
            itemsContainer.appendChild(div);
        });
        
        container.appendChild(groupDiv);
    }
}

window.applyToLayer = applyToLayer;
window.applyGroup = applyGroup;