// Elementos do DOM
const itemSelect = document.getElementById('item-select');
const quantityInput = document.getElementById('quantity');
const calculateBtn = document.getElementById('calculate-btn');
const clearBtn = document.getElementById('clear-btn');
const resultsDiv = document.getElementById('results');
const resourcesList = document.getElementById('resources-list');
const craftTree = document.getElementById('craft-tree');

// Elementos do modal
const manageRecipesBtn = document.getElementById('manage-recipes-btn');
const recipeModal = document.getElementById('recipe-modal');
const closeModalBtn = document.getElementById('close-modal');
const newItemName = document.getElementById('new-item-name');
const newItemOutput = document.getElementById('new-item-output');
const newItemImage = document.getElementById('new-item-image');
const imagePreview = document.getElementById('image-preview');
const addMaterialBtn = document.getElementById('add-material-btn');
const materialsList = document.getElementById('materials-list');
const saveRecipeBtn = document.getElementById('save-recipe-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const existingRecipes = document.getElementById('existing-recipes');
const filterRecipes = document.getElementById('filter-recipes');

// Elementos do modal de armazenamento
const storageInfoBtn = document.getElementById('storage-info-btn');
const storageModal = document.getElementById('storage-modal');
const closeStorageModalBtn = document.getElementById('close-storage-modal');
const exportDataBtn = document.getElementById('export-data-btn');
const importDataBtn = document.getElementById('import-data-btn');
const clearStorageBtn = document.getElementById('clear-storage-btn');
const importFileInput = document.getElementById('import-file-input');

// Elemento de status de sincronização
const syncStatus = document.getElementById('sync-status');

// Gerenciar receitas customizadas
let customRecipes = {};
let recipeImages = {};Firebase
function loadCustomRecipes() {
    updateSyncStatus('syncing', '🔄 Carregando...');
    
    // Carregar receitas customizadas
    recipesRef.once('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            customRecipes = data;
            // Mesclar com as receitas padrão
            Object.assign(recipes, customRecipes);
        }
        
        // Carregar imagens
        imagesRef.once('value', (snapshot) => {
            const imageData = snapshot.val();
            if (imageData) {
                recipeImages = imageData;
            }
            
            lastSyncTime = new Date();
            updateSyncStatus('connected', '✅ Conectado');
            populateItemSelect();
        });
    }).catch((error) => {
        console.error('Erro ao carregar receitas:', error);
        updateSyncStatus('error', '❌ Erro ao carregar');
    });
}

// Salvar receitas no Firebase
function saveCustomRecipes() {
    updateSyncStatus('syncing', '🔄 Salvando...');
    
    const updates = {};
    updates['/crafting/customRecipes'] = customRecipes;
    updates['/crafting/recipeImages'] = recipeImages;
    
    database.ref().update(updates)
        .then(() => {
            lastSyncTime = new Date();
            updateSyncStatus('connected', '✅ Salvo no Firebase');
            setTimeout(() => {
                updateSyncStatus('connected', '✅ Conectado');
            }, 2000);
        })
        .catch((error) => {
            console.error('Erro ao salvar:', error);
            updateSyncStatus('error', '❌ Erro ao salvar');
            alert('❌ Erro ao salvar no Firebase: ' + error.message);
        });
}

// Listener em tempo real para mudanças no Firebase
recipesRef.on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
        customRecipes = data;
        Object.assign(recipes, customRecipes);
        populateItemSelect();
    }
});

imagesRef.on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
        recipeImages = data;
    }
});

// Monitorar conexão do Firebase
database.ref('.info/connected').on('value', (snapshot) => {
    if (snapshot.val() === true) {
        updateSyncStatus('connected', '✅ Conectado ao Firebase');
    } else {
        updateSyncStatus('error', '❌ Sem conexão');
    }
});

// Carregar receitas do localStorage
function loadCustomRecipes() {
    const saved = localStorage.getItem('customRecipes');
    if (saved) {
        customRecipes = JSON.parse(saved);
        // Mesclar com as receitas padrão
        Object.assign(recipes, customRecipes);
    }
    
    const savedImages = localStorage.getItem('recipeImages');
    if (savedImages) {
        recipeImages = JSON.parse(savedImages);
    }
}

// Salvar receitas no localStorage
function saveCustomRecipes() {
    localStorage.setItem('customRecipes', JSON.stringify(customRecipes));
    localStorage.setItem('recipeImages', JSON.stringify(recipeImages));
}

// Preencher o select com os itens disponíveis
function populateItemSelect() {
    const items = Object.keys(recipes).sort();
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item;
        option.textContent = item;
        itemSelect.appendChild(option);
    });
}

// Calcular recursos necessários recursivamente
function calculateResources(itemName, quantity, level = 0) {
    const resources = {};
    const tree = [];
    
    function addResource(name, qty) {
        if (resources[name]) {
            resources[name] += qty;
        } else {
            resources[name] = qty;
        }
    }
    
    function processItem(name, qty, lvl) {
        const recipe = recipes[name];
        
        if (!recipe) {
            // Item base (não tem receita)
            addResource(name, qty);
            tree.push({ name, quantity: qty, level: lvl, isBase: true });
            return;
        }
        
        // Calcular quantas vezes precisa craftar
        const craftsNeeded = Math.ceil(qty / recipe.output);
        tree.push({ name, quantity: qty, level: lvl, craftsNeeded, output: recipe.output });
        
        // Processar cada material necessário
        recipe.materials.forEach(material => {
            const neededQty = material.quantity * craftsNeeded;
            processItem(material.name, neededQty, lvl + 1);
        });
    }
    
    processItem(itemName, quantity, level);
    
    return { resources, tree };
}

// Formatar número com separadores de milhares
function formatNumber(num) {
    return num.toLocaleString('pt-BR');
}

// Exibir recursos necessários
function displayResources(resources) {
    resourcesList.innerHTML = '';
    
    // Separar dinheiro dos outros recursos
    const moneyItems = [];
    const otherItems = [];
    
    Object.entries(resources).forEach(([name, quantity]) => {
        if (name.includes('Dinheiro')) {
            moneyItems.push({ name, quantity });
        } else {
            otherItems.push({ name, quantity });
        }
    });
    
    // Ordenar alfabeticamente
    otherItems.sort((a, b) => a.name.localeCompare(b.name));
    moneyItems.sort((a, b) => a.name.localeCompare(b.name));
    
    // Exibir recursos normais
    if (otherItems.length > 0) {
        const title = document.createElement('h4');
        title.textContent = 'Materiais:';
        title.style.marginBottom = '10px';
        title.style.color = '#555';
        resourcesList.appendChild(title);
        
        otherItems.forEach(({ name, quantity }) => {
            const div = document.createElement('div');
            div.className = 'resource-item';
            div.innerHTML = `
                <span class="resource-name">${name}</span>
                <span class="resource-quantity">${formatNumber(quantity)}</span>
            `;
            resourcesList.appendChild(div);
        });
    }
    
    // Exibir dinheiro
    if (moneyItems.length > 0) {
        const title = document.createElement('h4');
        title.textContent = 'Dinheiro:';
        title.style.marginTop = '20px';
        title.style.marginBottom = '10px';
        title.style.color = '#555';
        resourcesList.appendChild(title);
        
        moneyItems.forEach(({ name, quantity }) => {
            const div = document.createElement('div');
            div.className = 'resource-item resource-money';
            div.innerHTML = `
                <span class="resource-name">${name}</span>
                <span class="resource-quantity">$${formatNumber(quantity)}</span>
            `;
            resourcesList.appendChild(div);
        });
    }
}

// Exibir árvore de crafting
function displayCraftTree(tree) {
    craftTree.innerHTML = '';
    
    tree.forEach(item => {
        const div = document.createElement('div');
        div.className = `tree-item tree-level-${Math.min(item.level, 3)}`;
        
        const indent = '  '.repeat(item.level);
        const arrow = item.level > 0 ? '└─ ' : '';
        
        if (item.isBase) {
            div.textContent = `${indent}${arrow}${item.name} x${formatNumber(item.quantity)}`;
        } else {
            div.textContent = `${indent}${arrow}${item.name} x${formatNumber(item.quantity)} (craftar ${item.craftsNeeded}x, rende ${item.output} cada)`;
        }
        
        craftTree.appendChild(div);
    });
}

// Evento do botão calcular
calculateBtn.addEventListener('click', () => {
    const selectedItem = itemSelect.value;
    const quantity = parseInt(quantityInput.value);
    
    if (!selectedItem) {
        alert('Por favor, selecione um item!');
        return;
    }
    
    if (quantity < 1) {
        alert('A quantidade deve ser pelo menos 1!');
        return;
    }
    
    const { resources, tree } = calculateResources(selectedItem, quantity);
    
    displayResources(resources);
    displayCraftTree(tree);
    
    resultsDiv.classList.remove('hidden');
    
    // Scroll suave para os resultados
    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

// Evento do botão limpar
clearBtn.addEventListener('click', () => {
    itemSelect.value = '';
    quantityInput.value = 1;
    resultsDiv.classList.add('hidden');
});

// Permitir calcular com Enter
quantityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        calculateBtn.click();
    }
});

// Inicializar
loadCustomRecipes();
populateItemSelect();

// Eventos do modal
manageRecipesBtn.addEventListener('click', () => {
    recipeModal.classList.remove('hidden');
    displayExistingRecipes();
});

closeModalBtn.addEventListener('click', () => {
    recipeModal.classList.add('hidden');
    clearForm();
});

recipeModal.addEventListener('click', (e) => {
    if (e.target === recipeModal) {
        recipeModal.classList.add('hidden');
        clearForm();
    }
});

// Preview da imagem
newItemImage.addEventListener('input', (e) => {
    const url = e.target.value.trim();
    if (url) {
        imagePreview.innerHTML = `<img src="${url}" alt="Preview" onerror="this.parentElement.innerHTML='❌ Imagem inválida'">`;
    } else {
        imagePreview.innerHTML = '';
    }
});

// Adicionar linha de material
addMaterialBtn.addEventListener('click', () => {
    const materialRow = document.createElement('div');
    materialRow.className = 'material-row';
    materialRow.innerHTML = `
        <input type="text" class="material-name" placeholder="Nome do material">
        <input type="number" class="material-quantity" placeholder="Quantidade" min="1" value="1">
        <button class="remove-material-btn" onclick="removeMaterial(this)">🗑️</button>
    `;
    materialsList.appendChild(materialRow);
});

// Remover material
window.removeMaterial = function(btn) {
    const row = btn.parentElement;
    if (materialsList.children.length > 1) {
        row.remove();
    } else {
        alert('Precisa ter pelo menos um material!');
    }
};

// Salvar nova receita
saveRecipeBtn.addEventListener('click', () => {
    const itemName = newItemName.value.trim();
    const output = parseInt(newItemOutput.value);
    const imageUrl = newItemImage.value.trim();
    
    if (!itemName) {
        alert('Digite o nome do item!');
        return;
    }
    
    if (output < 1) {
        alert('A quantidade deve ser pelo menos 1!');
        return;
    }
    
    // Coletar materiais
    const materials = [];
    const materialRows = materialsList.querySelectorAll('.material-row');
    
    for (const row of materialRows) {
        const name = row.querySelector('.material-name').value.trim();
        const quantity = parseInt(row.querySelector('.material-quantity').value);
        
        if (name && quantity > 0) {
            materials.push({ name, quantity });
        }
    }
    
    // Criar receita
    const recipe = {
        materials: materials,
        output: output
    };
    
    // Se estiver editando uma receita existente, remover a antiga
    if (editingRecipe && editingRecipe !== itemName) {
        delete recipes[editingRecipe];
        delete customRecipes[editingRecipe];
        delete recipeImages[editingRecipe];
    }
    
    // Salvar
    recipes[itemName] = recipe;
    customRecipes[itemName] = recipe;
    
    if (imageUrl) {
        recipeImages[itemName] = imageUrl;
    } else if (recipeImages[itemName]) {
        delete recipeImages[itemName];
    }
    
    saveCustomRecipes();
    
    // Atualizar interface
    populateItemSelect();
    displayExistingRecipes();
    
    // Limpar formulário
    clearForm();
    
    const action = editingRecipe ? 'atualizada' : 'adicionada';
    alert(`Receita "${itemName}" ${action} com sucesso!`);
    
    editingRecipe = null;
});

// Limpar formulário
function clearForm() {
    newItemName.value = '';
    newItemOutput.value = 1;
    newItemImage.value = '';
    imagePreview.innerHTML = '';
    materialsList.innerHTML = `
        <div class="material-row">
            <input type="text" class="material-name" placeholder="Nome do material">
            <input type="number" class="material-quantity" placeholder="Quantidade" min="1" value="1">
            <button class="remove-material-btn" onclick="removeMaterial(this)">🗑️</button>
        </div>
    `;
    editingRecipe = null;
    saveRecipeBtn.textContent = '💾 Salvar Receita';
    cancelEditBtn.classList.add('hidden');
    newItemName.disabled = false;
}

// Cancelar edição
cancelEditBtn.addEventListener('click', () => {
    clearForm();
});

// Editar receita
window.editRecipe = function(name) {
    const recipe = recipes[name];
    if (!recipe) return;
    
    // Preencher formulário
    newItemName.value = name;
    newItemOutput.value = recipe.output;
    newItemImage.value = recipeImages[name] || '';
    
    if (recipeImages[name]) {
        imagePreview.innerHTML = `<img src="${recipeImages[name]}" alt="Preview">`;
    }
    
    // Preencher materiais
    materialsList.innerHTML = '';
    if (recipe.materials.length > 0) {
        recipe.materials.forEach(material => {
            const row = document.createElement('div');
            row.className = 'material-row';
            row.innerHTML = `
                <input type="text" class="material-name" placeholder="Nome do material" value="${material.name}">
                <input type="number" class="material-quantity" placeholder="Quantidade" min="1" value="${material.quantity}">
                <button class="remove-material-btn" onclick="removeMaterial(this)">🗑️</button>
            `;
            materialsList.appendChild(row);
        });
    } else {
        materialsList.innerHTML = `
            <div class="material-row">
                <input type="text" class="material-name" placeholder="Nome do material">
                <input type="number" class="material-quantity" placeholder="Quantidade" min="1" value="1">
                <button class="remove-material-btn" onclick="removeMaterial(this)">🗑️</button>
            </div>
        `;
    }
    
    editingRecipe = name;
    saveRecipeBtn.textContent = '✏️ Atualizar Receita';
    cancelEditBtn.classList.remove('hidden');
    newItemName.disabled = !customRecipes.hasOwnProperty(name);
    
    // Scroll para o topo do modal
    document.querySelector('.modal-content').scrollTop = 0;
};

// Exibir receitas existentes
function displayExistingRecipes(filter = '') {
    existingRecipes.innerHTML = '';
    
    const allRecipes = Object.entries(recipes)
        .filter(([name]) => name.toLowerCase().includes(filter.toLowerCase()))
        .sort((a, b) => a[0].localeCompare(b[0]));
    
    if (allRecipes.length === 0) {
        existingRecipes.innerHTML = '<p style="color: #999; text-align: center;">Nenhuma receita encontrada.</p>';
        return;
    }
    
    allRecipes.forEach(([name, recipe]) => {
        const card = document.createElement('div');
        card.className = 'recipe-card';
        
        const materialsText = recipe.materials.length > 0
            ? recipe.materials.map(m => `${m.name} (${m.quantity})`).join(', ')
            : 'Nenhum material';
        
        const isCustom = customRecipes.hasOwnProperty(name);
        const imageUrl = recipeImages[name];
        
        const imageHtml = imageUrl 
            ? `<div class="recipe-card-image"><img src="${imageUrl}" alt="${name}"></div>`
            : `<div class="recipe-card-image no-image">📦</div>`;
        
        const editBtn = `<button class="edit-recipe-btn" onclick="editRecipe('${name.replace(/'/g, "\\'")}')">✏️ Editar</button>`;
        const deleteBtn = isCustom ? `<button class="delete-recipe-btn" onclick="deleteRecipe('${name.replace(/'/g, "\\'")}')">🗑️ Excluir</button>` : '';
        
        card.innerHTML = `
            ${imageHtml}
            <div class="recipe-card-content">
                <h4>${name} ${isCustom ? '⭐' : ''}</h4>
                <div class="recipe-info">Rende: ${recipe.output} unidade(s)</div>
                <div class="recipe-materials">Materiais: ${materialsText}</div>
                <div class="recipe-actions">
                    ${editBtn}
                    ${deleteBtn}
                </div>
       Status do Firebase
    database.ref('.info/connected').once('value', (snapshot) => {
        const connected = snapshot.val();
        document.getElementById('firebase-status').textContent = connected ? '🟢 Conectado' : '🔴 Desconectado';
    });
    
    // Última sincronização
    const lastSync = lastSyncTime ? lastSyncTime.toLocaleString('pt-BR') : 'Nunca';
    document.getElementById('last-sync').textContent = lastSync{
        delete recipes[name];
        delete customRecipes[name];
        delete recipeImages[name];
        saveCustomRecipes();
        populateItemSelect();
        displayExistingRecipes(filterRecipes.value);
        
        if (editingRecipe === name) {
            clearForm();
        }
    }
};

// Filtro de receitas
filterRecipes.addEventListener('input', (e) => {
    displayExistingRecipes(e.target.value);
});

// ==== MODAL DE ARMAZENAMENTO ====

// Abrir modal de armazenamento
storageInfoBtn.addEventListener('click', () => {
    updateStorageInfo();
    storageModal.classList.remove('hidden');
});

// Fechar modal de armazenamento
closeStorageModalBtn.addEventListener('click', () => {
    storageModal.classList.add('hidden');
});

storageModal.addEventListener('click', (e) => {
    if (e.target === storageModal) {
        storageModal.classList.add('hidden');
    }
});

// Atualizar informações de armazenamento
function updateStorageInfo() {
    // Informações do navegador
    const browserInfo = navigator.userAgent.split(/[()]/)[1] || 'Desconhecido';
    document.getElementById('browser-info').textContent = browserInfo;
    
    // Calcular tamanho
    const customRecipesStr = localStorage.getItem('customRecipes') || '{}';
    const recipeImagesStr = localStorage.getItem('recipeImages') || '{}';
    const totalSize = new Blob([customRecipesStr + recipeImagesStr]).size;
    const sizeKB = (totalSize / 1024).toFixed(2);
    document.getElementById('storage-size').textContent = `${sizeKB} KB`;
    
    // Contadores
    const customCount = Object.keys(customRecipes).length;
    const imagesCount = Object.keys(recipeImages).length;
    document.getElementById('custom-count').textContent = customCount;
    document.getElementById('images-count').textContent = imagesCount;
    
    // Exibir dados
    document.getElementById('custom-recipes-display').textContent = 
        JSON.stringify(customRecipes, null, 2);
    document.getElementById('images-display').textContent = 
        JSON.stringify(recipeImages, null, 2);
}

// Exportar dados
exportDataBtn.addEventListener('click', () => {
    const data = {
        customRecipes: customRecipes,
        recipeImages: recipeImages,
        exportDate: new Date().toISOString(),
        version: '1.0'
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'crafting-recipes-' + Date.now() + '.json';
    link.click();
    
    URL.revokeObjectURL(url);
    alert('✅ Dados exportados com sucesso!');
});

// Importar dados
importDataBtn.addEventListener('click', () => {
    importFileInput.click();
});

importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            
            if (data.customRecipes) {
                Object.assign(customRecipes, data.customRecipes);
                Object.assign(recipes, data.customRecipes);
            }
            
            if (data.recipeImages) {
                Object.assign(recipeImages, data.recipeImages);
            }
            
            saveCustomRecipes();
            populateItemSelect();
            updateStorageInfo();
            
            alert('✅ Dados importados com sucesso!\n' + Object.keys(data.customRecipes || {}).length + ' receitas adicionadas.');
        } catch (error) {
            alert('❌ Erro ao importar dados. Verifique se o arquivo é válido.');
            console.error(error);
        }
    };
    reader.readAsText(file);
    
    // Limpar input para permitir reimportar o mesmo arquivo
    e.target.value = '';
});

// Limpar armazenamento
clearStorageBtn.addEventListener('click', () => {
    const count = Object.keys(customRecipes).length;
    
    if (!count) {
        alert('ℹ️ Não há dados customizados para limpar.');
        return;
    }
    
    if (confirm('⚠️ ATENÇÃO!\n\nIsso vai apagar TODAS as ' + count + ' receita(s) customizada(s) e imagens do Firebase.\n\nDeseja continuar?')) {
        if (confirm('🚨 Tem CERTEZA ABSOLUTA? Esta ação não pode ser desfeita!')) {
            updateSyncStatus('syncing', '🔄 Limpando...');
            
            // Limpar no Firebase
            const updates = {};
            updates['/crafting/customRecipes'] = null;
            updates['/crafting/recipeImages'] = null;
            
            database.ref().update(updates)
                .then(() => {
                    // Limpar localmente
                    customRecipes = {};
                    recipeImages = {};
                    
                    // Recarregar receitas padrão
                    Object.keys(recipes).forEach(key => {
                        if (!recipes[key].materials) {
                            delete recipes[key];
                        }
                    });
                    
                    populateItemSelect();
                    updateStorageInfo();
                    displayExistingRecipes();
                    
                    updateSyncStatus('connected', '✅ Conectado');
                    alert('✅ Todos os dados customizados foram removidos do Firebase!');
                })
                .catch((error) => {
                    console.error('Erro ao limpar:', error);
                    updateSyncStatus('error', '❌ Erro ao limpar');
                    alert('❌ Erro ao limpar dados: ' + error.message);
                });
        }
    }
});

