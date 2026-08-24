// Referências do HTML
const telaLobby = document.getElementById('tela-lobby');
const telaSala = document.getElementById('tela-sala');

const inputNome = document.getElementById('input-nome');
const inputIdSala = document.getElementById('input-id-sala');
const btnEntrarSala = document.getElementById('btn-entrar-sala');

const displayIdSala = document.getElementById('display-id-sala');
const btnCopiarId = document.getElementById('btn-copiar-id');
const listaParticipantes = document.getElementById('lista-participantes');
const contadorUsers = document.getElementById('contador-users');
const btnTransmitir = document.getElementById('btn-transmitir');
const playerVideo = document.getElementById('player-video');
const statusTransmissao = document.getElementById('status-transmissao');

let currentRoom = null;
let meuNome = '';
let estaTransmitindo = false;

// Carrega o apelido salvo no navegador
window.addEventListener('DOMContentLoaded', () => {
  const nomeSalvo = localStorage.getItem('app_meu_nome');
  if (nomeSalvo) inputNome.value = nomeSalvo;
});

// ENTRAR OU CRIAR A SALA VIA LIVEKIT
btnEntrarSala.addEventListener('click', async () => {
  meuNome = inputNome.value.trim();
  const nomeSala = inputIdSala.value.trim().toLowerCase().replace(/\s+/g, '-');

  if (!meuNome) return alert('Por favor, digite seu apelido!');
  if (!nomeSala) return alert('Por favor, digite o nome da sala!');

  localStorage.setItem('app_meu_nome', meuNome);

  btnEntrarSala.innerText = 'Conectando...';
  btnEntrarSala.disabled = true;

  try {
    // 1. Busca o token de autorização gerado pela nossa API na Vercel
    const response = await fetch(`/api/token?room=${nomeSala}&username=${encodeURIComponent(meuNome)}`);
    const data = await response.json();

    if (!response.ok || !data.token) {
      throw new Error(data.error || 'Erro ao gerar o token de acesso.');
    }

    // 2. Conecta à sala do LiveKit Cloud
    // A URL será pega automaticamente pelas configurações
    const livekitUrl = window.LIVEKIT_URL || data.url; 
    currentRoom = new LivekitClient.Room({
      adaptiveStream: true,
      dynacast: true,
    });

    // 3. Registra os ouvintes de eventos da sala (Aparecer tela, Participantes entrando)
    configurarEventosDaSala(currentRoom);

    // Conecta na sala utilizando a URL e o Token retornados pela API
    await currentRoom.connect(data.wsUrl, data.token);

    // Transiciona para a tela da sala
    displayIdSala.innerText = nomeSala;
    telaLobby.classList.add('esconde');
    telaSala.classList.remove('esconde');

    atualizarListaParticipantes();

  } catch (erro) {
    console.error('Erro ao conectar na sala:', erro);
    alert('Não foi possível entrar na sala: ' + erro.message);
  } finally {
    btnEntrarSala.innerText = 'Entrar / Criar Sala';
    btnEntrarSala.disabled = false;
  }
});

// EVENTOS DE VÍDEO E ENTRADA/SAÍDA DE AMIGOS
function configurarEventosDaSala(room) {
  // Quando alguém (incluindo você) começa a compartilhar tela
  room.on(LivekitClient.RoomEvent.TrackSubscribed, (track, publication, participant) => {
    if (track.kind === 'video' || track.kind === 'audio') {
      exibirVideoEAudio(track, participant);
    }
  });

  // Quando alguém para de transmitir
  room.on(LivekitClient.RoomEvent.TrackUnsubscribed, (track) => {
    track.detach(playerVideo);
    if (room.remoteParticipants.size === 0 && !estaTransmitindo) {
      limparPlayer();
    }
  });

  // Atualiza a lista de usuários quando alguém entra ou sai
  room.on(LivekitClient.RoomEvent.ParticipantConnected, () => atualizarListaParticipantes());
  room.on(LivekitClient.RoomEvent.ParticipantDisconnected, () => atualizarListaParticipantes());
}

// ATUALIZA A LISTA LATERAL DE PARTICIPANTES
function atualizarListaParticipantes() {
  if (!currentRoom) return;

  listaParticipantes.innerHTML = '';
  
  // Adiciona a você
  adicionarUsuarioNaLista(`${meuNome} (Você)`, currentRoom.localParticipant.identity, estaTransmitindo);

  // Adiciona os amigos
  currentRoom.remoteParticipants.forEach((p) => {
    const estaAoVivo = p.isScreenShareEnabled;
    adicionarUsuarioNaLista(p.identity, p.identity, estaAoVivo);
  });

  contadorUsers.innerText = currentRoom.remoteParticipants.size + 1;
}

function adicionarUsuarioNaLista(nomeExibicao, idUsuario, aoVivo) {
  const li = document.createElement('li');
  li.id = `user-${idUsuario}`;
  
  const badgeHtml = aoVivo 
    ? `<span class="badge-ao-vivo"><span class="ponto-pisca"></span>AO VIVO</span>` 
    : '';

  li.innerHTML = `<span class="nome-txt">${nomeExibicao}</span> <span class="status-container">${badgeHtml}</span>`;
  listaParticipantes.appendChild(li);
}

// BOTÃO DE TRANSMITIR TELA DO JOGO (COM ÁUDIO DO SISTEMA)
const selectQualidade = document.getElementById('select-qualidade');

// Perfis de Resolução e Bitrate
const perfisQualidade = {
  '720p30': {
    resolution: { width: 1280, height: 720, frameRate: 30 },
    encoding: { maxBitrate: 2000000, maxFramerate: 30 } // 2 Mbps
  },
  '1080p30': {
    resolution: { width: 1920, height: 1080, frameRate: 30 },
    encoding: { maxBitrate: 4500000, maxFramerate: 30 } // 4.5 Mbps
  },
  '1080p60': {
    resolution: { width: 1920, height: 1080, frameRate: 60 },
    encoding: { maxBitrate: 7000000, maxFramerate: 60 } // 7 Mbps
  }
};
btnTransmitir.addEventListener('click', async () => {
  if (!currentRoom) return;

  if (estaTransmitindo) {
    // Parar Transmissão
    await currentRoom.localParticipant.setScreenShareEnabled(false);
    estaTransmitindo = false;
    atualizarBotaoTransmitir(false);
    limparPlayer();
    atualizarListaParticipantes();
  } else {
    // Iniciar Transmissão
    try {
      await currentRoom.localParticipant.setScreenShareEnabled(true, { audio: true });
      estaTransmitindo = true;
      atualizarBotaoTransmitir(true);
      statusTransmissao.classList.add('esconde');
      atualizarListaParticipantes();
    } catch (err) {
      console.error('Erro ao compartilhar tela:', err);
    }
  }
});

function exibirVideoEAudio(track, participant) {
  track.attach(playerVideo);
  statusTransmissao.classList.add('esconde');
  playerVideo.play().catch(e => console.log('Autoplay:', e));
}

function limparPlayer() {
  playerVideo.srcObject = null;
  statusTransmissao.classList.remove('esconde');
}

function atualizarBotaoTransmitir(transmitindo) {
  if (transmitindo) {
    btnTransmitir.innerText = '⏹ Parar Transmissão';
    btnTransmitir.classList.remove('btn-primary');
    btnTransmitir.classList.add('btn-danger');
  } else {
    btnTransmitir.innerText = '🎥 Transmitir Tela';
    btnTransmitir.classList.remove('btn-danger');
    btnTransmitir.classList.add('btn-primary');
  }
}

btnCopiarId.addEventListener('click', () => {
  navigator.clipboard.writeText(displayIdSala.innerText);
  alert('Nome da sala copiado!');
});

// ATIVE ESTA LINHA PARA TESTAR APENAS O VISUAL (MODO DESIGN)
const MODO_DESIGN = true;

btnEntrarSala.addEventListener('click', async () => {
  meuNome = inputNome.value.trim() || 'Você (Teste)';
  const nomeSala = inputIdSala.value.trim() || 'sala-de-teste';

  // Se o Modo Design estiver ativo, abre a sala sem chamar a API do LiveKit
  if (MODO_DESIGN) {
    displayIdSala.innerText = nomeSala;
    telaLobby.classList.add('esconde');
    telaSala.classList.remove('esconde');

    // Insere dados fictícios para você ajustar o CSS dos participantes
    listaParticipantes.innerHTML = `
      <li id="user-1"><span class="nome-txt">${meuNome} (Você)</span> <span class="status-container"><span class="badge-ao-vivo"><span class="ponto-pisca"></span>AO VIVO</span></span></li>
      <li id="user-2"><span class="nome-txt">Lucas (Amigo)</span> <span class="status-container"></span></li>
      <li id="user-3"><span class="nome-txt">Mateus</span> <span class="status-container"></span></li>
    `;
    contadorUsers.innerText = '3';
    return; // Para a execução aqui e não chama a API que dá erro
  }

  // ... (restante do código normal do LiveKit que já estava aqui)
});