// ==================== SISTEMA DE AUTENTICAÇÃO ====================
const ADMIN_IDS = ['4717', '4878', '4642', '4972', '4566', '5256', '5100', '4952', '4343'];
let usuarioAutenticado = false;
let currentUserId = null;
let isAdmin = false;
let approvedIdsRef;
let logsRef;
let authDatabase;

// Inicializar Firebase para autenticação
function inicializarAuthFirebase() {
    if (typeof firebase === 'undefined' || !firebase.apps || firebase.apps.length === 0) {
        setTimeout(inicializarAuthFirebase, 100);
        return;
    }
    
    // Usa o Firebase já inicializado
    authDatabase = firebase.database();
    approvedIdsRef = authDatabase.ref('approvedIds');
    logsRef = authDatabase.ref('logs');
}

inicializarAuthFirebase();

// Verificar auto-login ao carregar
window.addEventListener('DOMContentLoaded', function() {
    const savedId = localStorage.getItem('sinnersMC_userId');
    if (savedId) {
        // Simular login automático
        document.getElementById('idInput').value = savedId;
        setTimeout(() => {
            verificarID();
        }, 500);
    }
});

// Registrar log de ação
function registrarLog(acao, detalhes = {}) {
    if (!logsRef || !currentUserId) return;
    
    const timestamp = Date.now();
    const logData = {
        userId: currentUserId,
        acao: acao,
        detalhes: detalhes,
        timestamp: timestamp,
        data: new Date(timestamp).toLocaleString('pt-BR')
    };
    
    logsRef.push(logData);
}

// Verificar ID no login
function verificarID() {
    const idInput = document.getElementById('idInput');
    const statusMsg = document.getElementById('statusMsg');
    const id = idInput.value.trim();
    
    // Validar se é apenas números
    if (!/^\d+$/.test(id)) {
        statusMsg.textContent = '❌ Digite apenas números';
        statusMsg.style.color = '#ff6b6b';
        return;
    }
    
    statusMsg.textContent = '⏳ Verificando...';
    statusMsg.style.color = '#ffc107';
    
    // Verificar se é admin
    if (ADMIN_IDS.includes(id)) {
        autenticarUsuario(id, true);
        return;
    }
    
    // Verificar se ID está aprovado
    approvedIdsRef.once('value', (snapshot) => {
        const approvedIds = snapshot.val() || {};
        
        if (approvedIds[id]) {
            autenticarUsuario(id, false);
        } else {
            statusMsg.textContent = '❌ ID não autorizado. Contate um administrador.';
            statusMsg.style.color = '#ff6b6b';
        }
    });
}

// Autenticar usuário
function autenticarUsuario(id, admin) {
    usuarioAutenticado = true;
    currentUserId = id;
    isAdmin = admin;
    
    // Salvar ID no localStorage
    localStorage.setItem('sinnersMC_userId', id);
    
    // Registrar login
    registrarLog('LOGIN', { tipo: admin ? 'ADMIN' : 'USER' });
    
    // Ocultar modal de login
    document.getElementById('loginModal').classList.add('hidden');
    
    // Mostrar container principal
    document.getElementById('mainContainer').classList.remove('hidden');
    
    // Mostrar info do usuário
    const currentUserIdSpan = document.getElementById('currentUserId');
    const adminBtn = document.getElementById('adminBtn');
    
    currentUserIdSpan.textContent = id;
    
    if (admin) {
        adminBtn.classList.remove('hidden');
    }
}

// Aprovar novo ID (apenas admin)
function aprovarID() {
    if (!isAdmin) {
        alert('❌ Apenas administradores podem aprovar IDs');
        return;
    }
    
    const newIdInput = document.getElementById('newIdInput');
    const newId = newIdInput.value.trim();
    
    if (!/^\d+$/.test(newId)) {
        alert('❌ Digite apenas números');
        return;
    }
    
    if (ADMIN_IDS.includes(newId)) {
        alert('ℹ️ Este ID já é admin');
        newIdInput.value = '';
        return;
    }
    
    approvedIdsRef.child(newId).set({
        aprovadoPor: currentUserId,
        dataAprovacao: Date.now(),
        data: new Date().toLocaleString('pt-BR')
    }).then(() => {
        registrarLog('APROVAR_ID', { idAprovado: newId });
        alert('✅ ID ' + newId + ' aprovado com sucesso!');
        newIdInput.value = '';
    }).catch((error) => {
        alert('❌ Erro ao aprovar ID: ' + error.message);
    });
}

// Mostrar logs (apenas admin)
function mostrarLogs() {
    if (!isAdmin) return;
    
    logsRef.orderByChild('timestamp').limitToLast(50).once('value', (snapshot) => {
        const logs = [];
        snapshot.forEach((child) => {
            logs.unshift(child.val());
        });
        
        let logHtml = '<div class="modal-logs">';
        logHtml += '<h4>📋 Últimos 50 Logs</h4>';
        
        logs.forEach((log) => {
            const cor = log.acao === 'LOGIN' ? '#28a745' : log.acao.includes('DELETAR') || log.acao.includes('REMOVER') ? '#dc3545' : '#dc143c';
            logHtml += `<div class="log-item" style="border-left-color: ${cor};">`;
            logHtml += `<strong>ID ${log.userId}</strong> - <span style="color: ${cor};">${log.acao}</span><br>`;
            logHtml += `<small>${log.data}</small>`;
            if (log.detalhes && Object.keys(log.detalhes).length > 0) {
                logHtml += `<br><small class="log-details">${JSON.stringify(log.detalhes)}</small>`;
            }
            logHtml += '</div>';
        });
        
        logHtml += '</div>';
        
        const modal = criarModal('Logs do Sistema', logHtml);
        document.body.appendChild(modal);
    });
}

// Mostrar IDs aprovados (apenas admin)
function mostrarIDsAprovados() {
    if (!isAdmin) return;
    
    approvedIdsRef.once('value', (snapshot) => {
        const approvedIds = snapshot.val() || {};
        
        let html = '<div class="modal-ids">';
        html += '<h4>👥 IDs Aprovados</h4>';
        
        const ids = Object.keys(approvedIds);
        if (ids.length === 0) {
            html += '<p class="no-data">Nenhum ID aprovado ainda.</p>';
        } else {
            ids.forEach((id) => {
                const info = approvedIds[id];
                html += `<div class="id-item">`;
                html += `<div class="id-info">`;
                html += `<strong>ID: ${id}</strong><br>`;
                html += `<small>Aprovado por: ${info.aprovadoPor} - ${info.data}</small>`;
                html += `</div>`;
                html += `<button onclick="removerID('${id}')" class="remove-id-btn">❌</button>`;
                html += '</div>';
            });
        }
        
        html += '</div>';
        
        const modal = criarModal('IDs Aprovados', html);
        document.body.appendChild(modal);
    });
}

// Remover ID aprovado (apenas admin)
window.removerID = function(id) {
    if (!isAdmin) return;
    
    if (confirm(`❌ Remover ID ${id}?`)) {
        approvedIdsRef.child(id).remove().then(() => {
            registrarLog('REMOVER_ID', { idRemovido: id });
            alert('✅ ID removido com sucesso!');
            mostrarIDsAprovados();
        });
    }
};

// Criar modal genérico
function criarModal(titulo, conteudo) {
    const modal = document.createElement('div');
    modal.className = 'custom-modal';
    
    modal.innerHTML = `
        <div class="custom-modal-content">
            <div class="modal-header-custom">
                <h3>${titulo}</h3>
                <button onclick="this.closest('.custom-modal').remove()" class="modal-close-btn">×</button>
            </div>
            <div class="modal-body-custom">
                ${conteudo}
            </div>
        </div>
    `;
    
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
    
    return modal;
}

// Toggle admin panel
function toggleAdminPanel() {
    const panel = document.getElementById('adminPanel');
    panel.classList.toggle('hidden');
}

function fecharAdminPanel() {
    document.getElementById('adminPanel').classList.add('hidden');
}

// Logout
function logout() {
    if (confirm('🚪 Deseja sair?')) {
        registrarLog('LOGOUT');        
        // Limpar localStorage
        localStorage.removeItem('sinnersMC_userId');
                location.reload();
    }
}

// Enter para enviar
document.addEventListener('DOMContentLoaded', () => {
    const idInput = document.getElementById('idInput');
    if (idInput) {
        idInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') verificarID();
        });
        
        // Permitir apenas números
        idInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
        });
        
        // Verificar auto-login
        const savedId = localStorage.getItem('sinnersMC_userId');
        if (savedId) {
            idInput.value = savedId;
            setTimeout(() => {
                verificarID();
            }, 300);
        }
        
        // Focus automático
        idInput.focus();
    }
    
    // Permitir apenas números no admin input
    const newIdInput = document.getElementById('newIdInput');
    if (newIdInput) {
        newIdInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
        });
    }
});
