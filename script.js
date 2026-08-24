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

const selectQualidade = document.getElementById('select-qualidade');
const boxQualidade = document.getElementById('box-qualidade');

let currentRoom = null;
let meuNome = '';
let estaTransmitindo = false;

// MUDAR PARA TRUE APENAS SE QUISER TESTAR O VISUAL LOCALMENTE
const MODO_DESIGN = false;

// Perfis de Resolução e Bitrate
const perfisQualidade = {
  '720p30': {
    resolution: { width: 1280, height: 720, frameRate: 30 },
    encoding: { maxBitrate: 2000000, maxFramerate: 30 }
  },
  '1080p30': {
    resolution: { width: 1920, height: 1080, frameRate: 30 },
    encoding: { maxBitrate: 4500000, maxFramerate: 30 }
  },
  '1080p60': {
    resolution: { width: 1920, height: 1080, frameRate: 60 },
    encoding: { maxBitrate: 7000000, maxFramerate: 60 }
  }
};

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

  // Teste de design sem backend
  if (MODO_DESIGN) {
    displayIdSala.innerText = nomeSala;
    telaLobby.classList.add('esconde');
    telaSala.classList.remove('esconde');
    listaParticipantes.innerHTML = `
      <li id="user-1"><span class="nome-txt">${meuNome} (Você)</span> <span class="status-container"><span class="badge-ao-vivo"><span class="ponto-pisca"></span>AO VIVO</span></span></li>
      <li id="user-2"><span class="nome-txt">Lucas (Amigo)</span> <span class="status-container"></span></li>
    `;
    contadorUsers.innerText = '2';
    return;
  }

  localStorage.setItem('app_meu_nome', meuNome);

  btnEntrarSala.innerText = 'Conectando...';
  btnEntrarSala.disabled = true;

  try {
    // 1. Busca o token de autorização na Vercel
    const response = await fetch(`/api/token?room=${nomeSala}&username=${encodeURIComponent(meuNome)}`);
    const data = await response.json();

    if (!response.ok || !data.token) {
      throw new Error(data.error || 'Erro ao gerar o token de acesso.');
    }

    // 2. Conecta ao LiveKit
    currentRoom = new LivekitClient.Room({
      adaptiveStream: true,
      dynacast: true,
    });

    // 3. Registra eventos e conecta
    configurarEventosDaSala(currentRoom);
    await currentRoom.connect(data.wsUrl, data.token);

    // Transiciona de tela
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

// EVENTOS DE VÍDEO E AMIGOS
function configurarEventosDaSala(room) {
  room.on(LivekitClient.RoomEvent.TrackSubscribed, (track, publication, participant) => {
    if (track.kind === 'video' || track.kind === 'audio') {
      exibirVideoEAudio(track, participant);
    }
    atualizarListaParticipantes();
  });

  room.on(LivekitClient.RoomEvent.TrackUnsubscribed, (track) => {
    track.detach(playerVideo);
    if (room.remoteParticipants.size === 0 && !estaTransmitindo) {
      limparPlayer();
    }
    atualizarListaParticipantes();
  });

  room.on(LivekitClient.RoomEvent.TrackPublished, () => atualizarListaParticipantes());
  room.on(LivekitClient.RoomEvent.TrackUnpublished, () => atualizarListaParticipantes());

  room.on(LivekitClient.RoomEvent.ParticipantConnected, () => atualizarListaParticipantes());
  room.on(LivekitClient.RoomEvent.ParticipantDisconnected, () => atualizarListaParticipantes());
}

// ATUALIZA A LISTA LATERAL E RECONHECE TRANSMISSÃO DE AMIGOS
function atualizarListaParticipantes() {
  if (!currentRoom) return;

  listaParticipantes.innerHTML = '';
  
  // Você
  adicionarUsuarioNaLista(`${meuNome} (Você)`, currentRoom.localParticipant.identity, estaTransmitindo);

  // Amigos
  currentRoom.remoteParticipants.forEach((p) => {
    let amigoEstaAoVivo = false;
    
    p.trackPublications.forEach((pub) => {
      if (pub.source === LivekitClient.Track.Source.ScreenShare || pub.source === LivekitClient.Track.Source.ScreenShareAudio) {
        if (pub.isSubscribed || pub.track) amigoEstaAoVivo = true;
      }
    });

    if (p.isScreenShareEnabled) amigoEstaAoVivo = true;

    adicionarUsuarioNaLista(p.identity, p.identity, amigoEstaAoVivo);
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

// TRANSMITIR TELA
btnTransmitir.addEventListener('click', async () => {
  if (!currentRoom) return;

  if (estaTransmitindo) {
    await currentRoom.localParticipant.setScreenShareEnabled(false);
    estaTransmitindo = false;
    
    if (boxQualidade) boxQualidade.classList.remove('esconde');
    if (selectQualidade) selectQualidade.disabled = false;
    
    atualizarBotaoTransmitir(false);
    limparPlayer();
    atualizarListaParticipantes();
  } else {
    try {
      const opcao = selectQualidade ? selectQualidade.value : '720p30';
      const perfil = perfisQualidade[opcao] || perfisQualidade['720p30'];

      await currentRoom.localParticipant.setScreenShareEnabled(true, {
        audio: true,
        resolution: perfil.resolution,
        screenShareEncoding: perfil.encoding,
        contentHint: 'motion',
        simulcast: false
      });

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

  playerVideo.playsInline = true;
  if ('fastSeek' in playerVideo) {
    playerVideo.fastSeek(playerVideo.duration || 0);
  }

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