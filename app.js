// Elementos do DOM
const itemSelect = document.getElementById('item-select');
const quantityInput = document.getElementById('quantity');
const calculateBtn = document.getElementById('calculate-btn');
const addToListBtn = document.getElementById('add-to-list-btn');
const clearBtn = document.getElementById('clear-btn');
const resultsDiv = document.getElementById('results');
const resourcesList = document.getElementById('resources-list');
const craftTree = document.getElementById('craft-tree');

// Elementos da lista de crafting
const craftListSection = document.getElementById('craft-list-section');
const craftListDiv = document.getElementById('craft-list');
const calculateTotalBtn = document.getElementById('calculate-total-btn');
const clearListBtn = document.getElementById('clear-list-btn');

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

// Elemento de status de sincronização
const syncStatus = document.getElementById('sync-status');

// Elementos NPC Sales
const npcSelect = document.getElementById('npc-select');
const npcItemsSection = document.getElementById('npc-items-section');
const npcTitle = document.getElementById('npc-title');
const npcItemsList = document.getElementById('npc-items-list');
const npcTotalValue = document.getElementById('npc-total-value');
const clearNpcBtn = document.getElementById('clear-npc-btn');

// Elementos Third Party Purchase
const thirdPartyItemsSection = document.getElementById('third-party-items-section');
const thirdPartyItemsList = document.getElementById('third-party-items-list');
const thirdPartyBaseValue = document.getElementById('third-party-base-value');
const thirdPartyTaxPercent = document.getElementById('third-party-tax-percent');
const thirdPartyTaxValue = document.getElementById('third-party-tax-value');
const thirdPartyTotalValue = document.getElementById('third-party-total-value');
const clearThirdPartyBtn = document.getElementById('clear-third-party-btn');
const taxBtns = document.querySelectorAll('.tax-btn');

// Usar Firebase já inicializado
const database = firebase.database();
const recipesRef = database.ref('crafting/customRecipes');
const imagesRef = database.ref('crafting/recipeImages');

// Gerenciar receitas customizadas
let customRecipes = {};
let recipeImages = {};
let editingRecipe = null;
let lastSyncTime = null;

// Lista de crafting acumulada
let craftingList = [];

// Dados dos NPCs
const npcData = {
    galpao: {
        name: '🏚️ NPC Galpão',
        items: [
            { name: 'Celular Quebrado', price: 750, limit: 20 },
            { name: 'Carteira Vazia', price: 750, limit: 20 },
            { name: 'Isqueiro', price: 750, limit: 20 },
            { name: 'Carteira de Cigarro', price: 750, limit: 20 },
            { name: 'Chave Reserva', price: 750, limit: 20 },
            { name: 'Chave de Galpão', price: 900, limit: 20 },
            { name: 'Placa Veicular', price: 1600, limit: 20 },
            { name: 'Documento Rasgado', price: 1500, limit: 20 },
            { name: 'Óculos de Sol', price: 1500, limit: 20 },
            { name: 'Carteira com Documentos', price: 1500, limit: 20 },
            { name: 'Cartão Bancário', price: 1500, limit: 20 },
            { name: 'Cartão com Número Anotado', price: 1500, limit: 20 },
            { name: 'Documento Corporativo', price: 1200, limit: 20 },
            { name: 'Mapa Marcado', price: 1350, limit: 20 },
            { name: 'Chave Sem Identificação', price: 1400, limit: 20 },
            { name: 'Pendrive', price: 1200, limit: 20 },
            { name: 'Documento Policial', price: 1600, limit: 20 },
            { name: 'Diário', price: 1400, limit: 20 },
            { name: 'Carta Manchada de Sangue', price: 1800, limit: 20 }
        ]
    },
    'garagem-sul': {
        name: '🚗 NPC Garagem Sul',
        items: [
            { name: 'Moeda Antiga', price: 2000, limit: 20 },
            { name: 'Pendrive Criptografado', price: 2000, limit: 20 },
            { name: 'Celular Queimado', price: 3000, limit: 20 },
            { name: 'Máscara', price: 2400, limit: 20 },
            { name: 'Spray de Pimenta', price: 2500, limit: 20 },
            { name: 'Cartão de Acesso', price: 2000, limit: 20 },
            { name: 'Chave Codificada', price: 2000, limit: 20 },
            { name: 'Bilhete de Ameaça', price: 2300, limit: 20 },
            { name: 'Contrato Rasgado', price: 2100, limit: 20 },
            { name: 'Bolsa Pequena', price: 5000, limit: 20 },
            { name: 'Colar', price: 4500, limit: 20 },
            { name: 'GPS', price: 4000, limit: 20 },
            { name: 'Fone de Ouvido', price: 4000, limit: 20 },
            { name: 'Rastreador Desligado', price: 6000, limit: 20 },
            { name: 'Luvas Táticas', price: 6000, limit: 20 },
            { name: 'Tablet Descarregado', price: 6000, limit: 20 }
        ]
    }
};

let npcItemsQuantity = {};
let thirdPartyItemsQuantity = {};
let thirdPartySelectedItems = {};
let currentTaxRate = 30; // Taxa padrão 30%

// Criar lista consolidada de todos os itens
let allItems = [];
Object.keys(npcData).forEach(npcKey => {
    npcData[npcKey].items.forEach(item => {
        if (!allItems.find(i => i.name === item.name)) {
            allItems.push({
                name: item.name,
                price: item.price,
                npc: npcData[npcKey].name
            });
        }
    });
});

// Atualizar status de sincronização
function updateSyncStatus(status, message) {
    syncStatus.textContent = message;
    syncStatus.className = 'sync-status sync-' + status;
}

// Carregar receitas do Firebase
function loadCustomRecipes() {
    updateSyncStatus('syncing', '🔄 Carregando...');
    
    recipesRef.once('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            customRecipes = data;
            Object.assign(recipes, customRecipes);
        }
        
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

// Preencher o select com os itens disponíveis
function populateItemSelect() {
    itemSelect.innerHTML = '<option value="">-- Selecione um item --</option>';
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
            addResource(name, qty);
            tree.push({ name, quantity: qty, level: lvl, isBase: true });
            return;
        }
        
        const craftsNeeded = Math.ceil(qty / recipe.output);
        tree.push({ name, quantity: qty, level: lvl, craftsNeeded, output: recipe.output });
        
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
    
    const moneyItems = [];
    const otherItems = [];
    
    Object.entries(resources).forEach(([name, quantity]) => {
        if (name.includes('Dinheiro')) {
            moneyItems.push({ name, quantity });
        } else {
            otherItems.push({ name, quantity });
        }
    });
    
    otherItems.sort((a, b) => a.name.localeCompare(b.name));
    moneyItems.sort((a, b) => a.name.localeCompare(b.name));
    
    if (otherItems.length > 0) {
        const title = document.createElement('h4');
        title.textContent = 'Materiais:';
        title.style.marginBottom = '10px';
        title.style.color = '#555';
        resourcesList.appendChild(title);
        
        otherItems.forEach(({ name, quantity }) => {
            const div = document.createElement('div');
            div.className = 'resource-item';
            div.innerHTML = '<span class="resource-name">' + name + '</span><span class="resource-quantity">' + formatNumber(quantity) + '</span>';
            resourcesList.appendChild(div);
        });
    }
    
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
            div.innerHTML = '<span class="resource-name">' + name + '</span><span class="resource-quantity">$' + formatNumber(quantity) + '</span>';
            resourcesList.appendChild(div);
        });
    }
}

// Exibir árvore de crafting
function displayCraftTree(tree) {
    craftTree.innerHTML = '';
    
    tree.forEach(item => {
        const div = document.createElement('div');
        div.className = 'tree-item tree-level-' + Math.min(item.level, 3);
        
        const indent = '  '.repeat(item.level);
        const arrow = item.level > 0 ? '└─ ' : '';
        
        if (item.isBase) {
            div.textContent = indent + arrow + item.name + ' x' + formatNumber(item.quantity);
        } else {
            div.textContent = indent + arrow + item.name + ' x' + formatNumber(item.quantity) + ' (craftar ' + item.craftsNeeded + 'x, rende ' + item.output + ' cada)';
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

// ==== LISTA DE CRAFTING ACUMULADA ====

// Adicionar item à lista
addToListBtn.addEventListener('click', () => {
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
    
    craftingList.push({ item: selectedItem, quantity: quantity });
    
    displayCraftingList();
    craftListSection.classList.remove('hidden');
    
    itemSelect.value = '';
    quantityInput.value = 1;
});

// Exibir lista de crafting
function displayCraftingList() {
    craftListDiv.innerHTML = '';
    
    if (craftingList.length === 0) {
        craftListSection.classList.add('hidden');
        return;
    }
    
    craftingList.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'craft-list-item';
        div.innerHTML = '<span class="list-item-name">' + item.item + '</span><span class="list-item-quantity">x' + formatNumber(item.quantity) + '</span><button class="remove-list-item" onclick="removeFromList(' + index + ')">🗑️</button>';
        craftListDiv.appendChild(div);
    });
}

// Remover item da lista
window.removeFromList = function(index) {
    craftingList.splice(index, 1);
    displayCraftingList();
};

// Calcular total de todos os itens da lista
calculateTotalBtn.addEventListener('click', () => {
    if (craftingList.length === 0) {
        alert('A lista está vazia!');
        return;
    }
    
    const totalResources = {};
    const allTrees = [];
    
    craftingList.forEach(({ item, quantity }) => {
        const { resources, tree } = calculateResources(item, quantity);
        
        Object.entries(resources).forEach(([name, qty]) => {
            if (totalResources[name]) {
                totalResources[name] += qty;
            } else {
                totalResources[name] = qty;
            }
        });
        
        allTrees.push({ item, quantity, tree });
    });
    
    displayResources(totalResources);
    
    craftTree.innerHTML = '<h4>📋 Detalhamento por Item:</h4>';
    allTrees.forEach(({ item, quantity, tree }) => {
        const header = document.createElement('div');
        header.className = 'tree-header';
        header.textContent = '▶ ' + item + ' x' + formatNumber(quantity);
        header.style.fontWeight = 'bold';
        header.style.marginTop = '15px';
        header.style.color = '#2196F3';
        craftTree.appendChild(header);
        
        tree.forEach(treeItem => {
            const div = document.createElement('div');
            div.className = 'tree-item tree-level-' + Math.min(treeItem.level, 3);
            
            const indent = '  '.repeat(treeItem.level);
            const arrow = treeItem.level > 0 ? '└─ ' : '';
            
            if (treeItem.isBase) {
                div.textContent = indent + arrow + treeItem.name + ' x' + formatNumber(treeItem.quantity);
            } else {
                div.textContent = indent + arrow + treeItem.name + ' x' + formatNumber(treeItem.quantity) + ' (craftar ' + treeItem.craftsNeeded + 'x, rende ' + treeItem.output + ' cada)';
            }
            
            craftTree.appendChild(div);
        });
    });
    
    resultsDiv.classList.remove('hidden');
    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

// Limpar lista de crafting
clearListBtn.addEventListener('click', () => {
    if (confirm('Tem certeza que deseja limpar toda a lista?')) {
        craftingList = [];
        displayCraftingList();
        resultsDiv.classList.add('hidden');
    }
});

// Inicializar
loadCustomRecipes();

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
        imagePreview.innerHTML = '<img src="' + url + '" alt="Preview" onerror="this.parentElement.innerHTML=\'❌ Imagem inválida\'">';
    } else {
        imagePreview.innerHTML = '';
    }
});

// Adicionar linha de material
addMaterialBtn.addEventListener('click', () => {
    const materialRow = document.createElement('div');
    materialRow.className = 'material-row';
    materialRow.innerHTML = '<input type="text" class="material-name" placeholder="Nome do material"><input type="number" class="material-quantity" placeholder="Quantidade" min="1" value="1"><button class="remove-material-btn" onclick="removeMaterial(this)">🗑️</button>';
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
    
    const materials = [];
    const materialRows = materialsList.querySelectorAll('.material-row');
    
    for (const row of materialRows) {
        const name = row.querySelector('.material-name').value.trim();
        const quantity = parseInt(row.querySelector('.material-quantity').value);
        
        if (name && quantity > 0) {
            materials.push({ name, quantity });
        }
    }
    
    const recipe = {
        materials: materials,
        output: output
    };
    
    if (editingRecipe && editingRecipe !== itemName) {
        delete recipes[editingRecipe];
        delete customRecipes[editingRecipe];
        delete recipeImages[editingRecipe];
    }
    
    recipes[itemName] = recipe;
    customRecipes[itemName] = recipe;
    
    if (imageUrl) {
        recipeImages[itemName] = imageUrl;
    } else if (recipeImages[itemName]) {
        delete recipeImages[itemName];
    }
    
    saveCustomRecipes();
    populateItemSelect();
    displayExistingRecipes();
    clearForm();
    
    const action = editingRecipe ? 'atualizada' : 'adicionada';
    alert('Receita "' + itemName + '" ' + action + ' com sucesso!');
    
    editingRecipe = null;
});

// Limpar formulário
function clearForm() {
    newItemName.value = '';
    newItemOutput.value = 1;
    newItemImage.value = '';
    imagePreview.innerHTML = '';
    materialsList.innerHTML = '<div class="material-row"><input type="text" class="material-name" placeholder="Nome do material"><input type="number" class="material-quantity" placeholder="Quantidade" min="1" value="1"><button class="remove-material-btn" onclick="removeMaterial(this)">🗑️</button></div>';
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
    
    newItemName.value = name;
    newItemOutput.value = recipe.output;
    newItemImage.value = recipeImages[name] || '';
    
    if (recipeImages[name]) {
        imagePreview.innerHTML = '<img src="' + recipeImages[name] + '" alt="Preview">';
    }
    
    materialsList.innerHTML = '';
    if (recipe.materials.length > 0) {
        recipe.materials.forEach(material => {
            const row = document.createElement('div');
            row.className = 'material-row';
            row.innerHTML = '<input type="text" class="material-name" placeholder="Nome do material" value="' + material.name + '"><input type="number" class="material-quantity" placeholder="Quantidade" min="1" value="' + material.quantity + '"><button class="remove-material-btn" onclick="removeMaterial(this)">🗑️</button>';
            materialsList.appendChild(row);
        });
    } else {
        materialsList.innerHTML = '<div class="material-row"><input type="text" class="material-name" placeholder="Nome do material"><input type="number" class="material-quantity" placeholder="Quantidade" min="1" value="1"><button class="remove-material-btn" onclick="removeMaterial(this)">🗑️</button></div>';
    }
    
    editingRecipe = name;
    saveRecipeBtn.textContent = '✏️ Atualizar Receita';
    cancelEditBtn.classList.remove('hidden');
    newItemName.disabled = !customRecipes.hasOwnProperty(name);
    
    document.querySelector('.modal-content').scrollTop = 0;
};

// Deletar receita
window.deleteRecipe = function(name) {
    if (!customRecipes.hasOwnProperty(name)) {
        alert('Só é possível deletar receitas customizadas!');
        return;
    }
    
    if (confirm('Tem certeza que deseja excluir a receita "' + name + '"?')) {
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
            ? recipe.materials.map(m => m.name + ' (' + m.quantity + ')').join(', ')
            : 'Nenhum material';
        
        const isCustom = customRecipes.hasOwnProperty(name);
        const imageUrl = recipeImages[name];
        
        const imageHtml = imageUrl 
            ? '<div class="recipe-card-image"><img src="' + imageUrl + '" alt="' + name + '"></div>'
            : '<div class="recipe-card-image no-image">📦</div>';
        
        const editBtn = '<button class="edit-recipe-btn" onclick="editRecipe(\'' + name.replace(/'/g, "\\'") + '\')">✏️ Editar</button>';
        const deleteBtn = isCustom ? '<button class="delete-recipe-btn" onclick="deleteRecipe(\'' + name.replace(/'/g, "\\'") + '\')">🗑️ Excluir</button>' : '';
        
        card.innerHTML = imageHtml + '<div class="recipe-card-content"><h4>' + name + (isCustom ? ' ⭐' : '') + '</h4><div class="recipe-info">Rende: ' + recipe.output + ' unidade(s)</div><div class="recipe-materials">Materiais: ' + materialsText + '</div><div class="recipe-actions">' + editBtn + deleteBtn + '</div></div>';
        
        existingRecipes.appendChild(card);
    });
}

// Filtro de receitas
filterRecipes.addEventListener('input', (e) => {
    displayExistingRecipes(e.target.value);
});

// ==================== SISTEMA DE TABS ====================
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        
        // Remove active de todas as tabs
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        // Adiciona active na tab selecionada
        btn.classList.add('active');
        document.getElementById(tabName + '-tab').classList.add('active');
    });
});

// ==================== SISTEMA DE VENDAS NPC ====================

// Event listener para seleção de NPC
npcSelect.addEventListener('change', () => {
    const selectedNpc = npcSelect.value;
    
    if (!selectedNpc) {
        npcItemsSection.classList.add('hidden');
        return;
    }
    
    const npc = npcData[selectedNpc];
    npcTitle.textContent = npc.name;
    npcItemsQuantity = {};
    
    displayNpcItems(npc.items);
    npcItemsSection.classList.remove('hidden');
});

// Exibir itens do NPC
function displayNpcItems(items) {
    npcItemsList.innerHTML = '';
    
    items.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'npc-item';
        itemDiv.innerHTML = `
            <div class="npc-item-info">
                <span class="npc-item-name">${item.name}</span>
                <span class="npc-item-price">$${formatNumber(item.price)}</span>
                <span class="npc-item-limit">Limite: ${item.limit}/reset</span>
            </div>
            <div class="npc-item-controls">
                <button class="npc-qty-btn" onclick="changeNpcQty(${index}, -1)">-</button>
                <input type="number" 
                       id="npc-qty-${index}" 
                       class="npc-qty-input" 
                       value="0" 
                       min="0" 
                       max="${item.limit}"
                       onchange="updateNpcQty(${index}, this.value)">
                <button class="npc-qty-btn" onclick="changeNpcQty(${index}, 1)">+</button>
                <span class="npc-item-total">$<span id="npc-item-total-${index}">0</span></span>
            </div>
        `;
        npcItemsList.appendChild(itemDiv);
        
        npcItemsQuantity[index] = 0;
    });
    
    updateNpcTotal();
}

// Alterar quantidade do item
window.changeNpcQty = function(index, change) {
    const selectedNpc = npcSelect.value;
    const npc = npcData[selectedNpc];
    const item = npc.items[index];
    const input = document.getElementById(`npc-qty-${index}`);
    
    let currentQty = parseInt(input.value) || 0;
    let newQty = currentQty + change;
    
    // Validar limites
    if (newQty < 0) newQty = 0;
    if (newQty > item.limit) newQty = item.limit;
    
    input.value = newQty;
    updateNpcQty(index, newQty);
};

// Atualizar quantidade do item
window.updateNpcQty = function(index, value) {
    const selectedNpc = npcSelect.value;
    const npc = npcData[selectedNpc];
    const item = npc.items[index];
    
    let qty = parseInt(value) || 0;
    
    // Validar limites
    if (qty < 0) qty = 0;
    if (qty > item.limit) qty = item.limit;
    
    npcItemsQuantity[index] = qty;
    
    // Atualizar total do item
    const itemTotal = qty * item.price;
    document.getElementById(`npc-item-total-${index}`).textContent = formatNumber(itemTotal);
    
    // Atualizar input se o valor foi corrigido
    const input = document.getElementById(`npc-qty-${index}`);
    if (input.value != qty) {
        input.value = qty;
    }
    
    updateNpcTotal();
};

// Atualizar total geral
function updateNpcTotal() {
    const selectedNpc = npcSelect.value;
    if (!selectedNpc) return;
    
    const npc = npcData[selectedNpc];
    let total = 0;
    
    Object.keys(npcItemsQuantity).forEach(index => {
        const qty = npcItemsQuantity[index];
        const item = npc.items[index];
        total += qty * item.price;
    });
    
    npcTotalValue.textContent = formatNumber(total);
}

// Limpar seleção NPC
clearNpcBtn.addEventListener('click', () => {
    const selectedNpc = npcSelect.value;
    if (!selectedNpc) return;
    
    const npc = npcData[selectedNpc];
    
    if (confirm('🗑️ Limpar todas as quantidades selecionadas?')) {
        npcItemsQuantity = {};
        displayNpcItems(npc.items);
    }
});
// ==================== SISTEMA DE COMPRA DE TERCEIROS ====================

// Event listeners para seleção de taxa
taxBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        taxBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTaxRate = parseInt(btn.dataset.tax);
        thirdPartyTaxPercent.textContent = currentTaxRate;
        updateThirdPartyTotal();
    });
});

// Sistema de busca de itens
const itemSearchInput = document.getElementById('item-search-input');
const itemSuggestions = document.getElementById('item-suggestions');

itemSearchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    // Fecha o dropdown se apagar tudo ou se tiver menos de 2 caracteres
    if (searchTerm.length === 0 || searchTerm.length < 2) {
        itemSuggestions.classList.add('hidden');
        itemSuggestions.innerHTML = '';
        return;
    }
    
    const matches = allItems.filter(item => 
        item.name.toLowerCase().includes(searchTerm)
    );
    
    if (matches.length === 0) {
        itemSuggestions.classList.add('hidden');
        return;
    }
    
    displaySuggestions(matches);
});

function displaySuggestions(items) {
    itemSuggestions.innerHTML = '';
    
    items.forEach(item => {
        const suggestionDiv = document.createElement('div');
        suggestionDiv.className = 'suggestion-item';
        suggestionDiv.innerHTML = `
            <span class="suggestion-name">${item.name}</span>
            <span class="suggestion-price">$${formatNumber(item.price)}</span>
        `;
        suggestionDiv.addEventListener('click', () => addItemToList(item));
        itemSuggestions.appendChild(suggestionDiv);
    });
    
    itemSuggestions.classList.remove('hidden');
}

function addItemToList(item) {
    if (!thirdPartySelectedItems[item.name]) {
        thirdPartySelectedItems[item.name] = {
            ...item,
            quantity: 1
        };
    } else {
        thirdPartySelectedItems[item.name].quantity++;
    }
    
    itemSearchInput.value = '';
    itemSuggestions.innerHTML = '';
    itemSuggestions.classList.add('hidden');
    displayThirdPartyItemsGrid();
    updateThirdPartyTotal();
}

// Fechar sugestões ao clicar fora
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-input-wrapper')) {
        itemSuggestions.classList.add('hidden');
    }
});

// Exibir itens em grid
function displayThirdPartyItemsGrid() {
    thirdPartyItemsList.innerHTML = '';
    
    Object.keys(thirdPartySelectedItems).forEach(itemName => {
        const item = thirdPartySelectedItems[itemName];
        const itemDiv = document.createElement('div');
        itemDiv.className = 'third-party-item-card';
        itemDiv.innerHTML = `
            <button class="remove-item-btn" onclick="removeThirdPartyItem('${itemName}')">×</button>
            <div class="item-card-name">${item.name}</div>
            <div class="item-card-price">$${formatNumber(item.price)}</div>
            <div class="item-card-controls">
                <button class="qty-btn-small" onclick="changeThirdPartyItemQty('${itemName}', -1)">-</button>
                <input type="number" 
                       class="qty-input-small" 
                       value="${item.quantity}" 
                       min="1"
                       onchange="setThirdPartyItemQty('${itemName}', this.value)">
                <button class="qty-btn-small" onclick="changeThirdPartyItemQty('${itemName}', 1)">+</button>
            </div>
            <div class="item-card-total">$${formatNumber(item.price * item.quantity)}</div>
        `;
        thirdPartyItemsList.appendChild(itemDiv);
    });
}

// Alterar quantidade do item
window.changeThirdPartyItemQty = function(itemName, change) {
    if (thirdPartySelectedItems[itemName]) {
        thirdPartySelectedItems[itemName].quantity += change;
        
        if (thirdPartySelectedItems[itemName].quantity < 1) {
            thirdPartySelectedItems[itemName].quantity = 1;
        }
        
        displayThirdPartyItemsGrid();
        updateThirdPartyTotal();
    }
};

// Definir quantidade do item
window.setThirdPartyItemQty = function(itemName, value) {
    let qty = parseInt(value) || 1;
    if (qty < 1) qty = 1;
    
    if (thirdPartySelectedItems[itemName]) {
        thirdPartySelectedItems[itemName].quantity = qty;
        displayThirdPartyItemsGrid();
        updateThirdPartyTotal();
    }
};

// Remover item
window.removeThirdPartyItem = function(itemName) {
    delete thirdPartySelectedItems[itemName];
    displayThirdPartyItemsGrid();
    updateThirdPartyTotal();
};

// Atualizar total com taxa
function updateThirdPartyTotal() {
    let baseTotal = 0;
    
    Object.keys(thirdPartySelectedItems).forEach(itemName => {
        const item = thirdPartySelectedItems[itemName];
        baseTotal += item.price * item.quantity;
    });
    
    const taxAmount = Math.round(baseTotal * (currentTaxRate / 100));
    const finalTotal = baseTotal - taxAmount;
    
    thirdPartyBaseValue.textContent = formatNumber(baseTotal);
    thirdPartyTaxValue.textContent = formatNumber(taxAmount);
    thirdPartyTotalValue.textContent = formatNumber(finalTotal);
}

// Limpar seleção de compra de terceiros
clearThirdPartyBtn.addEventListener('click', () => {
    if (Object.keys(thirdPartySelectedItems).length === 0) return;
    
    if (confirm('🗑️ Limpar todos os itens selecionados?')) {
        thirdPartySelectedItems = {};
        displayThirdPartyItemsGrid();
        updateThirdPartyTotal();
    }
});

// ==================== SISTEMA DE LAVAGEM ====================

let currentLavagemRate = 20; // 20% padrão (aliados)

// Função para definir taxa de lavagem
window.setLavagemRate = function(rate) {
    currentLavagemRate = rate;
    const lossPercent = 100 - rate;
    
    document.getElementById('lavagem-keep-label').textContent = rate + '%';
    document.getElementById('lavagem-loss-label').textContent = lossPercent + '%';
    
    // Atualizar botões ativos
    document.querySelectorAll('#lavagem-tab .tax-btn').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.dataset.rate) === rate) {
            btn.classList.add('active');
        }
    });
    
    calculateLavagem();
};

// Calcular lavagem
window.calculateLavagem = function() {
    const valueInput = document.getElementById('lavagem-value');
    const baseTotal = parseInt(valueInput.value) || 0;
    
    // Sua taxa de serviço (você fica com 20% ou 30%)
    const yourFee = Math.round(baseTotal * (currentLavagemRate / 100));
    // Dinheiro limpo para devolver ao cliente (70% ou 80%)
    const returnClean = baseTotal - yourFee;
    
    document.getElementById('lavagem-base-total').textContent = formatNumber(baseTotal);
    document.getElementById('lavagem-final-total').textContent = formatNumber(yourFee);
    document.getElementById('lavagem-tax-amount').textContent = formatNumber(returnClean);
};