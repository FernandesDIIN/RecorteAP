// O Cérebro da Ponte
let csInterface;
let fs;
let path;
let destinationFolder = "";
let history = [];

// Inicialização
window.onload = function() {
    try {
        csInterface = new CSInterface();
        // Carregar módulos Node.js
        fs = require('fs');
        path = require('path');
        
        // Carregar dados salvos
        loadSettings();
        renderHistory();
        
        // Event Listeners
        document.getElementById('btnChooseFolder').addEventListener('click', chooseFolder);
        document.getElementById('btnFullWidth').addEventListener('click', createFullWidthSelection);
        document.getElementById('btnSync').addEventListener('click', syncFromPhotoshop);
        document.getElementById('btnRefresh').addEventListener('click', checkFilesReady);
        
    } catch (e) {
        console.error("Erro ao inicializar (verifique se está rodando no CEP):", e);
        // Fallback para teste no browser
        document.getElementById('folderPathDisplay').innerText = "Modo de teste (Fora do Photoshop)";
    }
};

function loadSettings() {
    destinationFolder = localStorage.getItem('recorteap_folder') || "";
    if (destinationFolder) {
        document.getElementById('folderPathDisplay').innerText = destinationFolder;
    }
    
    const savedHistory = localStorage.getItem('recorteap_history');
    if (savedHistory) {
        history = JSON.parse(savedHistory);
    }
}

function saveSettings() {
    localStorage.setItem('recorteap_folder', destinationFolder);
    localStorage.setItem('recorteap_history', JSON.stringify(history));
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
    csInterface.evalScript('createFullWidthSelection()', function(result) {
        if (result.startsWith("Erro")) {
            alert(result);
        }
    });
}

function syncFromPhotoshop() {
    if (!csInterface) return;
    
    if (!destinationFolder) {
        alert("Por favor, selecione uma pasta de destino primeiro.");
        return;
    }
    
    // Gerar ID único
    const date = new Date();
    const timestamp = date.getFullYear().toString() + 
                     (date.getMonth()+1).toString().padStart(2, '0') + 
                     date.getDate().toString().padStart(2, '0') + "_" + 
                     date.getHours().toString().padStart(2, '0') + 
                     date.getMinutes().toString().padStart(2, '0') + 
                     date.getSeconds().toString().padStart(2, '0');
                     
    const id = "Img_" + timestamp;
    
    // Escapar barras para o ExtendScript
    const safePath = destinationFolder.replace(/\\/g, '/');
    
    csInterface.evalScript(`syncFromPhotoshop("${safePath}", "${id}")`, function(result) {
        if (result.startsWith("Erro")) {
            alert(result);
            return;
        }
        
        try {
            const coords = JSON.parse(result);
            
            // Adicionar ao histórico
            history.unshift({
                id: id,
                filename: id + ".jpg",
                coords: coords,
                status: 'waiting', // waiting, ready, done
                saturation: document.getElementById('globalSaturation').value || "1"
            });
            
            saveSettings();
            renderHistory();
            checkFilesReady();
            
        } catch (e) {
            alert("Erro ao processar coordenadas: " + e);
        }
    });
}

function checkFilesReady() {
    if (!fs || !destinationFolder) return;
    
    let changed = false;
    
    history.forEach(item => {
        if (item.status === 'done') return;
        
        const filePath = path.join(destinationFolder, item.filename);
        if (fs.existsSync(filePath)) {
            // Se o arquivo existe, verificamos se ele foi modificado recentemente
            // Para simplificar, apenas marcamos como ready se ele existe
            if (item.status !== 'ready') {
                item.status = 'ready';
                changed = true;
            }
        } else {
            if (item.status !== 'waiting') {
                item.status = 'waiting';
                changed = true;
            }
        }
    });
    
    if (changed) {
        saveSettings();
        renderHistory();
    }
}

function applyToLayer(id) {
    if (!csInterface) return;
    
    const itemIndex = history.findIndex(h => h.id === id);
    if (itemIndex === -1) return;
    
    const item = history[itemIndex];
    const filePath = path.join(destinationFolder, item.filename);
    const safePath = filePath.replace(/\\/g, '/');
    
    // Pegar saturação do input específico deste item
    const satInput = document.getElementById(`sat_${id}`);
    const saturation = satInput ? satInput.value : item.saturation;
    
    const script = `applyToLayer("${safePath}", ${item.coords.left}, ${item.coords.top}, ${item.coords.width}, ${item.coords.height}, ${saturation})`;
    
    csInterface.evalScript(script, function(result) {
        if (result.startsWith("Erro")) {
            alert(result);
            return;
        }
        
        // Marcar como concluído
        history[itemIndex].status = 'done';
        history[itemIndex].saturation = saturation; // Salvar a saturação usada
        saveSettings();
        renderHistory();
    });
}

function renderHistory() {
    const container = document.getElementById('historyList');
    container.innerHTML = '';
    
    if (history.length === 0) {
        container.innerHTML = '<div style="color: #aaa; text-align: center; padding: 10px;">Nenhum recorte no histórico</div>';
        return;
    }
    
    history.forEach(item => {
        const div = document.createElement('div');
        div.className = `history-item ${item.status}`;
        
        let statusText = "Aguardando";
        if (item.status === 'ready') statusText = "Pronto";
        if (item.status === 'done') statusText = "Concluído";
        
        div.innerHTML = `
            <div class="history-header">
                <span class="history-id">${item.id}</span>
                <div style="display: flex; align-items: center; gap: 5px;">
                    <span style="font-size: 10px; color: #aaa;">${statusText}</span>
                    <div class="status-indicator"></div>
                </div>
            </div>
            <div style="font-size: 10px; color: #aaa;">
                Pos: [${Math.round(item.coords.left)}, ${Math.round(item.coords.top)}] | Tam: ${Math.round(item.coords.width)}x${Math.round(item.coords.height)}
            </div>
            <div class="history-actions">
                <label style="font-size: 10px;">Sat:</label>
                <input type="number" id="sat_${item.id}" class="sat-input" value="${item.saturation}">
                <button class="apply-btn ${item.status === 'ready' ? 'primary' : ''}" 
                        onclick="applyToLayer('${item.id}')" 
                        ${item.status === 'waiting' ? 'disabled' : ''}>
                    Apply to Layer
                </button>
            </div>
        `;
        
        container.appendChild(div);
    });
}

// Expor função para o HTML
window.applyToLayer = applyToLayer;
