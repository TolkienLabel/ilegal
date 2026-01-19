// ============ CONFIGURAÇÃO FIREBASE ============
let database;
let pontosRef;
let offsetTempoServidor = 0; // Diferença entre o servidor Firebase e o cliente

// Inicializa Firebase quando estiver pronto
function inicializarFirebase() {
	if (typeof firebase === 'undefined') {
		setTimeout(inicializarFirebase, 100);
		return;
	}
	
	const firebaseConfig = {
		databaseURL: "https://mapasinners-default-rtdb.firebaseio.com/"
	};
	
	try {
		firebase.initializeApp(firebaseConfig);
		database = firebase.database();
		pontosRef = database.ref('pontos');
		
		// Sincroniza o relógio com o servidor Firebase
		const offsetRef = database.ref('.info/serverTimeOffset');
		offsetRef.on('value', (snap) => {
			offsetTempoServidor = snap.val() || 0;
			console.log('Sincronizado com servidor Firebase. Offset:', offsetTempoServidor, 'ms');
		});
		
		console.log('Firebase inicializado com sucesso');
	} catch (error) {
		console.log('Firebase já foi inicializado ou erro:', error);
		database = firebase.database();
		pontosRef = database.ref('pontos');
	}
}

// Função para obter timestamp do servidor Firebase (sempre UTC)
function obterTimestampServidor() {
	return Date.now() + offsetTempoServidor;
}

inicializarFirebase();

// ============ FIM CONFIGURAÇÃO FIREBASE ============

// ============ SISTEMA DE SOM ============
// Cria um beep usando Web Audio API
function tocarSomNotificacao() {
	try {
		const audioContext = new (window.AudioContext || window.webkitAudioContext)();
		
		// Primeiro beep
		const oscillator1 = audioContext.createOscillator();
		const gainNode1 = audioContext.createGain();
		
		oscillator1.connect(gainNode1);
		gainNode1.connect(audioContext.destination);
		
		oscillator1.frequency.value = 800;
		oscillator1.type = 'sine';
		
		gainNode1.gain.setValueAtTime(0.3, audioContext.currentTime);
		gainNode1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
		
		oscillator1.start(audioContext.currentTime);
		oscillator1.stop(audioContext.currentTime + 0.3);
		
		// Segundo beep
		const oscillator2 = audioContext.createOscillator();
		const gainNode2 = audioContext.createGain();
		
		oscillator2.connect(gainNode2);
		gainNode2.connect(audioContext.destination);
		
		oscillator2.frequency.value = 1000;
		oscillator2.type = 'sine';
		
		gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime + 0.15);
		gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
		
		oscillator2.start(audioContext.currentTime + 0.15);
		oscillator2.stop(audioContext.currentTime + 0.5);
	} catch (error) {
		console.log('Erro ao tocar som:', error);
	}
}
// ============ FIM SISTEMA DE SOM ============

// ============ SISTEMA DE LOGS (SEM AUTENTICAÇÃO) ============
const ADMIN_IDS = ['4717', '4878', '4642', '4972', '4566', '5256', '5100', '4952', '4343'];
let usuarioAutenticado = true; // Sempre autenticado pois a autenticação é na página principal
let currentUserId = 'Sistema'; // ID padrão
let isAdmin = false;
let approvedIdsRef;
let logsRef;

// Inicializar referências do Firebase para logs
function inicializarAuth() {
	if (!database) {
		setTimeout(inicializarAuth, 100);
		return;
	}
	logsRef = database.ref('logs');
	
	// Iniciar mapa automaticamente
	if (typeof iniciarMapa === 'function') {
		iniciarMapa();
	}
}

inicializarAuth();

// Registrar log de ação
function registrarLog(acao, detalhes = {}) {
	if (!logsRef) return;
	
	const timestamp = obterTimestampServidor();
	const logData = {
		userId: currentUserId,
		acao: acao,
		detalhes: detalhes,
		timestamp: timestamp,
		data: new Date(timestamp).toLocaleString('pt-BR')
	};
	
	logsRef.push(logData);
}

// Funções removidas - autenticação feita na página principal
// verificarID(), autenticarUsuario(), aprovarID(), logout() foram removidas

// ============ FUNÇÕES AUXILIARES (SEM AUTENTICAÇÃO) ============

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
	modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 3000;';
	
	modal.innerHTML = `
		<div style="background: rgba(20, 20, 20, 0.98); border: 3px solid #dc143c; border-radius: 15px; padding: 30px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 0 30px rgba(220, 20, 60, 0.5);">
			<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
				<h3 style="color: #dc143c; margin: 0;">${titulo}</h3>
				<button onclick="this.closest('[style*=fixed]').remove()" style="background: #dc3545; color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; font-size: 18px; font-weight: bold;">×</button>
			</div>
			${conteudo}
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
	panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function fecharAdminPanel() {
	document.getElementById('adminPanel').style.display = 'none';
}

// Logout
function logout() {
	if (confirm('🚪 Deseja sair?')) {
		registrarLog('LOGOUT');
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
	}
});

// ============ FIM SISTEMA DE AUTENTICAÇÃO ============

const center_x = 117.3;
const center_y = 172.8;
const scale_x = 0.02072;
const scale_y = 0.0205;

CUSTOM_CRS = L.extend({}, L.CRS.Simple, {
    projection: L.Projection.LonLat,
    scale: function(zoom) {

        return Math.pow(2, zoom);
    },
    zoom: function(sc) {

        return Math.log(sc) / 0.6931471805599453;
    },
	distance: function(pos1, pos2) {
        var x_difference = pos2.lng - pos1.lng;
        var y_difference = pos2.lat - pos1.lat;
        return Math.sqrt(x_difference * x_difference + y_difference * y_difference);
    },
	transformation: new L.Transformation(scale_x, center_x, -scale_y, center_y),
    infinite: true
});

var SateliteStyle = L.tileLayer('mapStyles/styleSatelite/{z}/{x}/{y}.jpg', {minZoom: 0,maxZoom: 8,noWrap: true,continuousWorld: false,attribution: 'Online map GTA V',id: 'SateliteStyle map',}),
	AtlasStyle	= L.tileLayer('mapStyles/styleAtlas/{z}/{x}/{y}.jpg', {minZoom: 0,maxZoom: 5,noWrap: true,continuousWorld: false,attribution: 'Online map GTA V',id: 'styleAtlas map',}),
	GridStyle	= L.tileLayer('mapStyles/styleGrid/{z}/{x}/{y}.png', {minZoom: 0,maxZoom: 5,noWrap: true,continuousWorld: false,attribution: 'Online map GTA V',id: 'styleGrid map',});

var ExampleGroup = L.layerGroup();
var CarrosGroup = L.layerGroup();
var MinivanGroup = L.layerGroup();
var ATMGroup = L.layerGroup();
var NPCGroup = L.layerGroup();

var Icons = {
	"Example": ExampleGroup,
	"Carro": CarrosGroup,
	"Minivan": MinivanGroup,
	"ATM": ATMGroup,
	"NPC": NPCGroup,
};

var mymap = L.map('map', {
    crs: CUSTOM_CRS,
    minZoom: 1,
    maxZoom: 5,
    Zoom: 5,
    maxNativeZoom: 5,
    preferCanvas: true,
    layers: [AtlasStyle, ExampleGroup, CarrosGroup, MinivanGroup, ATMGroup, NPCGroup],
    center: [0, 0],
    zoom: 3,
});

var layersControl = L.control.layers({ "Satelite": SateliteStyle,"Atlas": AtlasStyle,"Grid":GridStyle}, Icons).addTo(mymap);

// Função para inicializar mapa após autenticação
function iniciarMapa() {
	setTimeout(() => {
		mymap.invalidateSize();
		carregarPontosSalvos();
	}, 100);
}


function customIcon(icon){
	return L.icon({
		iconUrl: `blips/${icon}.png`,
		iconSize:     [20, 20],
		iconAnchor:   [20, 20], 
		popupAnchor:  [-10, -27]
	});
}

// Cria ícone customizado com HTML e CSS
function criarIconeCustomizado(tipo, tempoDisponivel = true) {
	let emoji;
	let classe;
	let htmlContent;
	
	switch(tipo) {
		case 'Carro':
			emoji = '🚗';
			break;
		case 'Minivan':
			emoji = '🚐';
			break;
		case 'ATM':
			emoji = '🏧';
			break;
		case 'NPC':
			emoji = '👤';
			break;
		default:
			emoji = '📍';
	}
	
	// Se é NPC, sempre verde
	if (tipo === 'NPC') {
		classe = 'marker-green';
		htmlContent = `
			<div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
				<div style="position: absolute; width: 100%; height: 100%; background: radial-gradient(circle, #00FF00, #00AA00); border-radius: 50%; opacity: 0.2;"></div>
				<div style="font-size: 32px; z-index: 10; ${classe}">${emoji}</div>
			</div>
		`;
	} else {
		// Verde (disponível) ou Vermelho (timeout)
		if (tempoDisponivel) {
			classe = 'marker-green';
			htmlContent = `
				<div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
					<div style="position: absolute; width: 100%; height: 100%; background: radial-gradient(circle, #00FF00, #00AA00); border-radius: 50%; opacity: 0.3;"></div>
					<div style="position: absolute; width: 85%; height: 85%; background: radial-gradient(circle, rgba(0,255,0,0.1), transparent); border-radius: 50%; border: 2px solid #00FF00; opacity: 0.6;"></div>
					<div style="font-size: 32px; z-index: 10; ${classe}">${emoji}</div>
				</div>
			`;
		} else {
			classe = 'marker-red';
			htmlContent = `
				<div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
					<div style="position: absolute; width: 100%; height: 100%; background: radial-gradient(circle, #FF6666, #FF0000); border-radius: 50%; opacity: 0.3;"></div>
					<div style="position: absolute; width: 85%; height: 85%; background: radial-gradient(circle, rgba(255,0,0,0.1), transparent); border-radius: 50%; border: 2px solid #FF4444; opacity: 0.6;"></div>
					<div style="font-size: 32px; z-index: 10; ${classe}">${emoji}</div>
				</div>
			`;
		}
	}
	
	return L.divIcon({
		html: htmlContent,
		iconSize: [40, 40],
		iconAnchor: [20, 40],
		popupAnchor: [0, -40],
		className: ''
	});
}

// ============ SISTEMA DE CADASTRO DE PONTOS ============

// Mapa de ícones para cada tipo
const tiposIcones = {
	"Carro": 2,      // Usa a imagem blips/2.png (assumindo que existe)
	"ATM": 3,        // Usa a imagem blips/3.png
	"NPC": 4         // Usa a imagem blips/4.png
};

// Função para formatar tempo em MM:SS
function formatarTempo(segundos) {
	const minutos = Math.floor(segundos / 60);
	const secs = segundos % 60;
	return `${minutos},${secs.toString().padStart(2, '0')}`;
}

// Array global para rastrear temporizadores
let temporizadores = {};

// Carrega pontos do Firebase
function carregarPontosSalvos() {
	if (!pontosRef) {
		setTimeout(carregarPontosSalvos, 500);
		return;
	}
	
	pontosRef.on('value', (snapshot) => {
		const dados = snapshot.val();
		if (dados) {
			// Limpa markers antigos
			if (window.pontosGlobais) {
				Object.keys(window.pontosGlobais).forEach(key => {
					const ponto = window.pontosGlobais[key];
					if (ponto.marker && mymap.hasLayer(ponto.marker)) {
						mymap.removeLayer(ponto.marker);
					}
					if (temporizadores[key]) {
						clearInterval(temporizadores[key]);
					}
				});
			}
			window.pontosGlobais = {};
			temporizadores = {};
			
			// Carrega novos pontos
			Object.keys(dados).forEach(chave => {
				const ponto = dados[chave];
				
				// Passa o tempo original e o timestamp - a função adicionarPontoAoMapa fará o cálculo
				adicionarPontoAoMapa(ponto.lat, ponto.lng, ponto.tipo, ponto.descricao, ponto.tempo || 0, ponto.timestamp);
			});
		}
	});
}

// Salva um ponto no Firebase
function salvarPonto(lat, lng, tipo, descricao, tempo = 0) {
	if (!pontosRef) {
		console.log('Firebase ainda não inicializado');
		return;
	}
	
	// Cria chave válida para Firebase (sem pontos)
	const chave = `${Math.round(lat*100)}_${Math.round(lng*100)}_${tipo}`;
	
	// Se tem tempo, salva o timestamp do servidor para sincronização global
	const timestamp = tempo > 0 ? obterTimestampServidor() : null;
	
	pontosRef.child(chave).set({
		lat,
		lng,
		tipo,
		descricao,
		tempo,
		timestamp // Timestamp do servidor Firebase (UTC) para sincronização global
	}).then(() => {
		// Registrar log
		registrarLog('ADICIONAR_PONTO', {
			tipo: tipo,
			descricao: descricao,
			coordenadas: `${lng.toFixed(2)}, ${lat.toFixed(2)}`
		});
	}).catch(error => {
		console.log('Erro ao salvar ponto:', error);
	});
}

// Remove um ponto do Firebase
function removerPontoSalvo(lat, lng, tipo) {
	if (!pontosRef) {
		console.log('Firebase ainda não inicializado');
		return;
	}
	
	// Cria chave válida para Firebase (sem pontos)
	const chave = `${Math.round(lat*100)}_${Math.round(lng*100)}_${tipo}`;
	pontosRef.child(chave).remove().then(() => {
		// Registrar log
		registrarLog('DELETAR_PONTO', {
			tipo: tipo,
			coordenadas: `${lng.toFixed(2)}, ${lat.toFixed(2)}`
		});
	}).catch(error => {
		console.log('Erro ao remover ponto:', error);
	});
}

// Função para roubar carro/ATM (15 minutos = 900 segundos)
function roubarVeiculo(markerKey) {
	const ponto = window.pontosGlobais?.[markerKey];
	if (!ponto) return;
	
	const tempoRoubo = 900; // 15 minutos em segundos
	ponto.setTempo(tempoRoubo);
	
	// Registrar log
	registrarLog('ROUBAR_VEICULO', {
		tipo: ponto.tipo,
		descricao: ponto.descricao,
		coordenadas: `${ponto.lng.toFixed(2)}, ${ponto.lat.toFixed(2)}`
	});
	
	// Salva no Firebase
	salvarPonto(ponto.lat, ponto.lng, ponto.tipo, ponto.descricao, tempoRoubo);
	
	alert(`${ponto.tipo} roubado! ⏱️ ${formatarTempo(tempoRoubo)}`);
}

// Adiciona um ponto ao mapa
function adicionarPontoAoMapa(lat, lng, tipo, descricao = '', tempoInicial = 0, timestampInicial = null) {
	const markerKey = `${lat}-${lng}-${tipo}`;
	let tempoRestante = tempoInicial;
	let marker;
	
	// Se tem timestamp, recalcula o tempo restante usando tempo do servidor
	if (timestampInicial && tempoInicial > 0) {
		const tempoAtualServidor = obterTimestampServidor();
		const tempoDecorrido = Math.floor((tempoAtualServidor - timestampInicial) / 1000);
		tempoRestante = Math.max(0, tempoInicial - tempoDecorrido);
		
		console.log(`[${tipo}] Calculando tempo restante:`, {
			tempoInicial,
			timestampInicial,
			tempoAtualServidor,
			tempoDecorrido,
			tempoRestante
		});
	}
	
	// Dados do ponto
	const dadosPonto = {
		lat, lng, tipo, descricao, tempoRestante, markerKey
	};
	
	// Função para atualizar o popup
	function atualizarPopup() {
		let popupContent = `
			<div style="font-family: Arial; min-width: 200px;">
				<b style="font-size: 16px;">${tipo}</b><br>
				<small>${descricao}</small><br><br>
				<strong>Coordenadas:</strong><br>
				<small>X: ${lng.toFixed(2)}, Y: ${lat.toFixed(2)}</small><br><br>
		`;
		
		if (tipo !== 'NPC') {
			const corTempo = tempoRestante === 0 ? '#00AA00' : '#FF4444';
			const tempoFormatado = formatarTempo(tempoRestante);
			popupContent += `
				<strong style="color: ${corTempo};">⏱️ Tempo: ${tempoFormatado}</strong><br>
				<button onclick="roubarVeiculo('${markerKey}')" style="padding: 5px 10px; background: #FF9800; color: white; border: none; border-radius: 3px; cursor: pointer; margin: 5px 2px 0 0;">🚗 Roubar</button>
				<button onclick="editarTempo('${markerKey}')" style="padding: 5px 10px; background: #2196F3; color: white; border: none; border-radius: 3px; cursor: pointer; margin: 5px 2px 0 0;">✏️ Editar</button>
			`;
		}
		
		popupContent += `<button onclick="removerPonto('${markerKey}')" style="padding: 5px 10px; background: #f44336; color: white; border: none; border-radius: 3px; cursor: pointer; margin: 5px 2px;">🗑️ Deletar</button>
			</div>
		`;
		
		if (marker) {
			marker.setPopupContent(popupContent);
		}
		return popupContent;
	}
	
	// Cria o marcador
	const tempoDisponivel = tempoRestante === 0;
	marker = L.marker([lat, lng], { icon: criarIconeCustomizado(tipo, tempoDisponivel) })
		.addTo(Icons[tipo])
		.bindPopup(atualizarPopup());
	
	// Inicia o temporizador se for Carro ou ATM com tempo restante
	if ((tipo === 'Carro' || tipo === 'Minivan' || tipo === 'ATM') && tempoRestante > 0) {
		const timerInterval = setInterval(() => {
			tempoRestante--;
			
			// Atualiza o popup
			atualizarPopup();
			
			// Atualiza a cor do marcador
			const novoIcone = criarIconeCustomizado(tipo, tempoRestante === 0);
			marker.setIcon(novoIcone);
			
			if (tempoRestante <= 0) {
				clearInterval(timerInterval);
				delete temporizadores[markerKey];
				
				// Toca som de notificação
				tocarSomNotificacao();
				
				// Atualiza no Firebase que o tempo zerou
				salvarPonto(lat, lng, tipo, descricao, 0);
			}
		}, 1000);
		
		temporizadores[markerKey] = timerInterval;
	}
	
	// Armazena os dados do ponto globalmente para edição
	if (!window.pontosGlobais) {
		window.pontosGlobais = {};
	}
	window.pontosGlobais[markerKey] = {
		marker,
		tipo,
		lat,
		lng,
		descricao,
		timestamp: timestampInicial,
		tempoRestante: () => tempoRestante,
		setTempo: (novoTempo) => {
			// Cancela temporizador anterior
			if (temporizadores[markerKey]) {
				clearInterval(temporizadores[markerKey]);
				delete temporizadores[markerKey];
			}
			
			tempoRestante = novoTempo;
			atualizarPopup();
			const novoIcone = criarIconeCustomizado(tipo, tempoRestante === 0);
			marker.setIcon(novoIcone);
			
			// Inicia novo temporizador se necessário
			if ((tipo === 'Carro' || tipo === 'Minivan' || tipo === 'ATM') && novoTempo > 0) {
				const timerInterval = setInterval(() => {
					tempoRestante--;
					atualizarPopup();
					const iconAtualizado = criarIconeCustomizado(tipo, tempoRestante === 0);
					marker.setIcon(iconAtualizado);
					
					if (tempoRestante <= 0) {
						clearInterval(timerInterval);
						delete temporizadores[markerKey];
					}
				}, 1000);
				
				temporizadores[markerKey] = timerInterval;
			}
		}
	};
	
	return marker;
}

// Deleta um ponto do mapa
function removerPonto(markerKey) {
	// Cancela temporizador se existir
	if (temporizadores[markerKey]) {
		clearInterval(temporizadores[markerKey]);
		delete temporizadores[markerKey];
	}
	
	// Obtém dados do ponto antes de remover
	const ponto = window.pontosGlobais?.[markerKey];
	
	// Remove dados globais
	if (window.pontosGlobais && window.pontosGlobais[markerKey]) {
		delete window.pontosGlobais[markerKey];
	}
	
	// Remove do localStorage
	if (ponto) {
		removerPontoSalvo(ponto.lat, ponto.lng, ponto.tipo);
	}
	
	// Recarrega a página para atualizar
	alert('Ponto deletado!');
	location.reload();
}

// Edita o tempo de um ponto
function editarTempo(markerKey) {
	const ponto = window.pontosGlobais?.[markerKey];
	if (!ponto) return;
	
	const tempoAtual = formatarTempo(ponto.tempoRestante());
	const novoTempo = prompt(`Editar tempo para ${ponto.tipo}:\n(Digite em segundos)\nTempo atual: ${tempoAtual}`, ponto.tempoRestante());
	
	if (novoTempo !== null) {
		const tempo = parseInt(novoTempo);
		if (isNaN(tempo) || tempo < 0) {
			alert('Tempo inválido! Digite um número positivo.');
			return;
		}
		
		ponto.setTempo(tempo);
		
		// Salva no Firebase
		salvarPonto(ponto.lat, ponto.lng, ponto.tipo, ponto.descricao, tempo);
	}
}

// Cria um modal para entrada de dados
function criarModalCadastro(lat, lng) {
	const modal = document.createElement('div');
	modal.id = 'modalCadastro';
	modal.style.cssText = `
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: white;
		border: 2px solid #333;
		border-radius: 8px;
		padding: 20px;
		z-index: 1000;
		box-shadow: 0 4px 6px rgba(0,0,0,0.3);
		font-family: Arial, sans-serif;
		min-width: 300px;
	`;
	
	modal.innerHTML = `
		<h2 style="margin-top: 0; text-align: center;">Cadastrar Ponto</h2>
		<label style="display: block; margin: 10px 0;">
			<strong>Tipo:</strong><br>
			<select id="tipoPonto" style="width: 100%; padding: 8px; margin-top: 5px;" onchange="mostrarTempoInput()">
				<option value="Carro">🚗 Carro</option>
				<option value="Minivan">🚐 Minivan</option>
				<option value="ATM">🏧 ATM</option>
				<option value="NPC">👤 NPC</option>
			</select>
		</label>
		<label style="display: block; margin: 10px 0;">
			<strong>Descrição:</strong><br>
			<input type="text" id="descricaoPonto" placeholder="Digite uma descrição..." style="width: 100%; padding: 8px; margin-top: 5px; box-sizing: border-box;">
		</label>
		<label id="labelTempo" style="display: block; margin: 10px 0;">
			<strong>⏱️ Tempo (segundos):</strong><br>
			<input type="number" id="tempoPonto" min="0" placeholder="0 = sem temporizador" style="width: 100%; padding: 8px; margin-top: 5px; box-sizing: border-box;">
		</label>
		<label style="display: block; margin: 10px 0;">
			<strong>Coordenadas:</strong><br>
			<small>X: ${lng.toFixed(2)}, Y: ${lat.toFixed(2)}</small>
		</label>
		<div style="display: flex; gap: 10px; margin-top: 15px;">
			<button onclick="confirmarCadastro(${lat}, ${lng})" style="flex: 1; padding: 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">Confirmar</button>
			<button onclick="fecharModal()" style="flex: 1; padding: 10px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancelar</button>
		</div>
	`;
	
	document.body.appendChild(modal);
	document.getElementById('tipoPonto').focus();
	mostrarTempoInput();
}

// Mostra/esconde o input de tempo conforme o tipo selecionado
function mostrarTempoInput() {
	const tipo = document.getElementById('tipoPonto')?.value;
	const labelTempo = document.getElementById('labelTempo');
	if (labelTempo) {
		if (tipo === 'Carro' || tipo === 'Minivan' || tipo === 'ATM') {
			labelTempo.style.display = 'block';
		} else {
			labelTempo.style.display = 'none';
		}
	}
}

// Modal para adicionar coordenada manualmente
function abrirModalAdicionar() {
	const modal = document.createElement('div');
	modal.id = 'modalAdicionar';
	modal.style.cssText = `
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: white;
		border: 2px solid #333;
		border-radius: 8px;
		padding: 20px;
		z-index: 1000;
		box-shadow: 0 4px 6px rgba(0,0,0,0.3);
		font-family: Arial, sans-serif;
		min-width: 350px;
		max-height: 80vh;
		overflow-y: auto;
	`;
	
	modal.innerHTML = `
		<h2 style="margin-top: 0; text-align: center;">Adicionar Coordenada</h2>
		<label style="display: block; margin: 10px 0;">
			<strong>X (Longitude):</strong><br>
			<input type="number" id="coordX" step="0.01" placeholder="Ex: 100.5" style="width: 100%; padding: 8px; margin-top: 5px; box-sizing: border-box;">
		</label>
		<label style="display: block; margin: 10px 0;">
			<strong>Y (Latitude):</strong><br>
			<input type="number" id="coordY" step="0.01" placeholder="Ex: 150.3" style="width: 100%; padding: 8px; margin-top: 5px; box-sizing: border-box;">
		</label>
		<label style="display: block; margin: 10px 0;">
			<strong>Tipo:</strong><br>
			<select id="tipoAdicionarPonto" style="width: 100%; padding: 8px; margin-top: 5px;" onchange="mostrarTempoInputAdicionar()">
				<option value="Carro">🚗 Carro</option>
				<option value="Minivan">🚐 Minivan</option>
				<option value="ATM">🏧 ATM</option>
				<option value="NPC">👤 NPC</option>
			</select>
		</label>
		<label id="labelTempoAdicionar" style="display: block; margin: 10px 0;">
			<strong>⏱️ Tempo (segundos):</strong><br>
			<input type="number" id="tempoAdicionarPonto" min="0" placeholder="0 = sem temporizador" style="width: 100%; padding: 8px; margin-top: 5px; box-sizing: border-box;">
		</label>
		<label style="display: block; margin: 10px 0;">
			<strong>Descrição:</strong><br>
			<input type="text" id="descricaoAdicionar" placeholder="Digite uma descrição..." style="width: 100%; padding: 8px; margin-top: 5px; box-sizing: border-box;">
		</label>
		<div style="display: flex; gap: 10px; margin-top: 15px;">
			<button onclick="confirmarAdicionar()" style="flex: 1; padding: 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">Confirmar</button>
			<button onclick="fecharModalAdicionar()" style="flex: 1; padding: 10px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancelar</button>
		</div>
	`;
	
	document.body.appendChild(modal);
	document.getElementById('coordX').focus();
	mostrarTempoInputAdicionar();
}

// Mostra/esconde o input de tempo no modal de adicionar
function mostrarTempoInputAdicionar() {
	const tipo = document.getElementById('tipoAdicionarPonto')?.value;
	const labelTempo = document.getElementById('labelTempoAdicionar');
	if (labelTempo) {
		if (tipo === 'Carro' || tipo === 'Minivan' || tipo === 'ATM') {
			labelTempo.style.display = 'block';
		} else {
			labelTempo.style.display = 'none';
		}
	}
}

// Confirma adição manual de coordenada
function confirmarAdicionar() {
	const x = parseFloat(document.getElementById('coordX').value);
	const y = parseFloat(document.getElementById('coordY').value);
	const tipo = document.getElementById('tipoAdicionarPonto').value;
	const descricao = document.getElementById('descricaoAdicionar').value || 'Sem descrição';
	let tempo = 0;
	
	if (tipo === 'Carro' || tipo === 'Minivan' || tipo === 'ATM') {
		const tempoInput = document.getElementById('tempoAdicionarPonto').value;
		tempo = tempoInput ? parseInt(tempoInput) : 0;
	}
	
	if (isNaN(x) || isNaN(y)) {
		alert('Por favor, insira coordenadas válidas!');
		return;
	}
	
	adicionarPontoAoMapa(y, x, tipo, descricao, tempo);
	salvarPonto(y, x, tipo, descricao, tempo);
	fecharModalAdicionar();
}

// Fecha o modal de adicionar
function fecharModalAdicionar() {
	const modal = document.getElementById('modalAdicionar');
	if (modal) {
		modal.remove();
	}
}

// Confirma o cadastro
function confirmarCadastro(lat, lng) {
	const tipo = document.getElementById('tipoPonto').value;
	const descricao = document.getElementById('descricaoPonto').value || 'Sem descrição';
	let tempo = 0;
	
	if (tipo === 'Carro' || tipo === 'Minivan' || tipo === 'ATM') {
		const tempoInput = document.getElementById('tempoPonto').value;
		tempo = tempoInput ? parseInt(tempoInput) : 0;
	}
	
	adicionarPontoAoMapa(lat, lng, tipo, descricao, tempo);
	salvarPonto(lat, lng, tipo, descricao, tempo);
	fecharModal();
}

// Fecha o modal
function fecharModal() {
	const modal = document.getElementById('modalCadastro');
	if (modal) {
		modal.remove();
	}
}

// Evento de clique direito no mapa
mymap.on('contextmenu', function(e) {
	e.originalEvent.preventDefault();
	const lat = e.latlng.lat;
	const lng = e.latlng.lng;
	criarModalCadastro(lat, lng);
});

// Carrega pontos salvos após autenticação (não executar automaticamente)
// carregarPontosSalvos() é chamado dentro de verificarSenha()