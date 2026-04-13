// O Cérebro da Ponte
let csInterface;
let fs;
let path;
let destinationFolder = "";
let history = [];
let imageCounter = 1; // NOVA VARIÁVEL

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
        document.getElementById('btnClearHistory').addEventListener('click', clearAllHistory);
        
    } catch (e) {
        console.error("Erro ao inicializar (verifique se está rodando no CEP):", e);
        // Fallback para teste no browser
        document.getElementById('folderPathDisplay').innerText = "Modo de teste (Fora do Photoshop)";
    }
};

function clearAllHistory() {
    // 1. Pedir confirmação (Segurança)
    const confirmacao = confirm("Deseja apagar TODO o histórico e DELETAR permanentemente as imagens da pasta de destino?");
    
    if (confirmacao) {
        try {
            // 2. Deletar arquivos físicos do HD
            if (fs && destinationFolder && history.length > 0) {
                history.forEach(item => {
                    // Monta o caminho completo: Pasta + Nome do arquivo (ex: 1 Img.jpg)
                    const filePath = path.join(destinationFolder, item.filename);
                    
                    try {
                        // Verifica se o arquivo ainda existe antes de tentar apagar
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath); // Comando Node.js para deletar arquivo
                            console.log("Deletado:", item.filename);
                        }
                    } catch (err) {
                        console.error("Não foi possível deletar:", item.filename, err);
                    }
                });
            }

            // 3. Limpar a memória do Plugin
            history = []; // Esvazia a lista
            imageCounter = 1; // Reseta o contador para "1 Img"
            
            // 4. Salvar estado e atualizar interface
            saveSettings();
            renderHistory();
            
            alert("Sistema e pasta limpos com sucesso!");
            
        } catch (e) {
            alert("Erro durante a limpeza: " + e.toString());
        }
    }
}

function loadSettings() {
    destinationFolder = localStorage.getItem('recorteap_folder') || "";
    if (destinationFolder) document.getElementById('folderPathDisplay').innerText = destinationFolder;
    
    const savedHistory = localStorage.getItem('recorteap_history');
    if (savedHistory) history = JSON.parse(savedHistory);

    // Carrega o número atual
    imageCounter = parseInt(localStorage.getItem('recorteap_counter')) || 1;
}

function saveSettings() {
    localStorage.setItem('recorteap_folder', destinationFolder);
    localStorage.setItem('recorteap_history', JSON.stringify(history));
    localStorage.setItem('recorteap_counter', imageCounter); // Salva o número
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
        if (result && result.startsWith("Erro")) {
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
    const id = imageCounter + " Img";
    imageCounter++; // Prepara para a próxima imagem
    
    // Escapar barras para o ExtendScript
    const safePath = destinationFolder.replace(/\\/g, '/');
    
    csInterface.evalScript(`syncFromPhotoshop("${safePath}", "${id}")`, function(result) {
        if (result && result.startsWith("Erro")) {
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
        if (result && result.startsWith("Erro")) {
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