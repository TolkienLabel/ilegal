# Estrutura de Dados - MapaSinners

## Configuração Firebase
- **Database URL**: `https://mapasinners-default-rtdb.firebaseio.com/`
- **Referência**: `pontos/`

## Estrutura JSON no Firebase

### Formato da Chave
Cada ponto é armazenado com uma chave única gerada a partir das coordenadas e tipo:
```
{latitude_arredondada}_{longitude_arredondada}_{tipo}
```

Exemplo: `12345_67890_Carro`

### Estrutura de um Ponto

```json
{
  "pontos": {
    "12345_67890_Carro": {
      "lat": 123.45,
      "lng": 678.90,
      "tipo": "Carro",
      "descricao": "Mustang GT",
      "tempo": 900,
      "timestamp": 1737154800000
    },
    "-5432_10987_ATM": {
      "lat": -54.32,
      "lng": 109.87,
      "tipo": "ATM",
      "descricao": "Banco Central",
      "tempo": 0,
      "timestamp": null
    },
    "9876_5432_NPC": {
      "lat": 98.76,
      "lng": 54.32,
      "tipo": "NPC",
      "descricao": "Vendedor de armas",
      "tempo": 0,
      "timestamp": null
    }
  }
}
```

## Campos dos Pontos

| Campo | Tipo | Descrição | Obrigatório |
|-------|------|-----------|-------------|
| `lat` | Number | Latitude do ponto no mapa | Sim |
| `lng` | Number | Longitude do ponto no mapa | Sim |
| `tipo` | String | Tipo do ponto: "Carro", "ATM" ou "NPC" | Sim |
| `descricao` | String | Descrição personalizada do ponto | Sim |
| `tempo` | Number | Tempo total em segundos (900 = 15 min) | Sim |
| `timestamp` | Number ou null | Timestamp Unix em milissegundos do servidor Firebase quando foi roubado | Não |

## Tipos de Pontos

### 1. Carro 🚗
- **Tipo**: `"Carro"`
- **Tempo padrão ao roubar**: 900 segundos (15 minutos)
- **Ícone**: Emoji 🚗
- **Estados**:
  - Verde pulsante: Disponível (tempo = 0 ou timestamp = null)
  - Vermelho pulsante: Roubado (tempo > 0 e timestamp válido)

### 2. Minivan 🚐
- **Tipo**: `"Minivan"`
- **Tempo padrão ao roubar**: 900 segundos (15 minutos)
- **Ícone**: Emoji 🚐
- **Estados**:
  - Verde pulsante: Disponível (tempo = 0 ou timestamp = null)
  - Vermelho pulsante: Roubado (tempo > 0 e timestamp válido)

### 3. ATM 🏧
- **Tipo**: `"ATM"`
- **Tempo padrão ao roubar**: 900 segundos (15 minutos)
- **Ícone**: Emoji 🏧
- **Estados**:
  - Verde pulsante: Disponível (tempo = 0 ou timestamp = null)
  - Vermelho pulsante: Roubado (tempo > 0 e timestamp válido)

### 4. NPC 👤
- **Tipo**: `"NPC"`
- **Tempo**: Sempre 0 (sem temporizador)
- **Ícone**: Emoji 👤
- **Estado**: Sempre verde (sem cooldown)

## Cálculo do Tempo Restante

O tempo restante é calculado da seguinte forma:

```javascript
// Se tem timestamp válido
if (timestamp && tempo > 0) {
    const tempoAtualServidor = Date.now() + offsetTempoServidor;
    const tempoDecorrido = Math.floor((tempoAtualServidor - timestamp) / 1000);
    const tempoRestante = Math.max(0, tempo - tempoDecorrido);
}
```

Onde:
- `offsetTempoServidor`: Diferença entre relógio local e servidor Firebase
- `tempo`: Tempo total configurado (segundos)
- `timestamp`: Momento em que foi roubado (milissegundos)
- `tempoDecorrido`: Tempo que passou desde o roubo (segundos)
- `tempoRestante`: Tempo faltando (segundos)

## Exemplos de Uso

### Adicionar um ponto novo
```javascript
pontosRef.child('12345_67890_Carro').set({
    lat: 123.45,
    lng: 678.90,
    tipo: 'Carro',
    descricao: 'Ferrari F40',
    tempo: 0,
    timestamp: null
});
```

### Marcar como roubado
```javascript
const tempoRoubo = 900; // 15 minutos
const timestampServidor = Date.now() + offsetTempoServidor;

pontosRef.child('12345_67890_Carro').set({
    lat: 123.45,
    lng: 678.90,
    tipo: 'Carro',
    descricao: 'Ferrari F40',
    tempo: tempoRoubo,
    timestamp: timestampServidor
});
```

### Remover um ponto
```javascript
pontosRef.child('12345_67890_Carro').remove();
```

### Ler todos os pontos
```javascript
pontosRef.on('value', (snapshot) => {
    const dados = snapshot.val();
    // dados contém todos os pontos
});
```

## API REST do Firebase

Você pode acessar os dados via HTTP:

### GET - Obter todos os pontos
```
GET https://mapasinners-default-rtdb.firebaseio.com/pontos.json
```

### GET - Obter um ponto específico
```
GET https://mapasinners-default-rtdb.firebaseio.com/pontos/{chave}.json
```

### PUT - Criar/Atualizar um ponto
```
PUT https://mapasinners-default-rtdb.firebaseio.com/pontos/{chave}.json
Content-Type: application/json

{
  "lat": 123.45,
  "lng": 678.90,
  "tipo": "Carro",
  "descricao": "Lamborghini",
  "tempo": 900,
  "timestamp": 1737154800000
}
```

### DELETE - Remover um ponto
```
DELETE https://mapasinners-default-rtdb.firebaseio.com/pontos/{chave}.json
```

## Sincronização de Tempo

O sistema usa o offset do servidor Firebase para garantir sincronização global:

```javascript
// Obtém offset do servidor
database.ref('.info/serverTimeOffset').on('value', (snap) => {
    offsetTempoServidor = snap.val() || 0;
});

// Calcula timestamp do servidor
const timestampServidor = Date.now() + offsetTempoServidor;
```

Isso garante que todos os usuários vejam o mesmo tempo independente do fuso horário local.

## Notificações

Quando o timer de um Carro ou ATM termina:
1. O ícone muda de vermelho para verde
2. Um som de notificação é reproduzido
3. O Firebase é atualizado com `tempo: 0` e `timestamp: null`
