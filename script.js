// Referências do HTML
const telaLobby = document.getElementById('tela-lobby');
const telaSala = document.getElementById('tela-sala');

const inputNome = document.getElementById('input-nome');
const inputIdSala = document.getElementById('input-id-sala');
const btnCriarSala = document.getElementById('btn-criar-sala');
const btnEntrarSala = document.getElementById('btn-entrar-sala');

const displayIdSala = document.getElementById('display-id-sala');
const btnCopiarId = document.getElementById('btn-copiar-id');
const listaParticipantes = document.getElementById('lista-participantes');
const btnTransmitir = document.getElementById('btn-transmitir');
const playerVideo = document.getElementById('player-video');
const statusTransmissao = document.getElementById('status-transmissao');

let peer = null;
let meuNome = '';
let streamAtual = null;
let conexoesDados = [];
let souHost = false;

// Configuração com servidores STUN públicos do Google para atravessar roteadores/firewalls
const peerConfig = {
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  }
};

// Carrega APENAS o nome salvo ao abrir a página
window.addEventListener('DOMContentLoaded', () => {
  const nomeSalvo = localStorage.getItem('app_meu_nome');
  if (nomeSalvo) {
    inputNome.value = nomeSalvo;
  }
});

// Entra na tela da sala
function entrarNaSala(idSala) {
  displayIdSala.innerText = idSala;
  telaLobby.classList.add('esconde');
  telaSala.classList.remove('esconde');
  adicionarUsuarioNaLista(`${meuNome} (Você)`, meuNome);
}

// Adiciona um usuário à lista de participantes com ID único de busca
function adicionarUsuarioNaLista(nomeExibicao, idUsuario) {
  let li = document.getElementById(`user-${idUsuario}`);
  if (!li) {
    li = document.createElement('li');
    li.id = `user-${idUsuario}`;
    li.innerHTML = `<span class="nome-txt">${nomeExibicao}</span> <span class="status-container"></span>`;
    listaParticipantes.appendChild(li);
  }
}

// Adiciona ou remove o indicador de "AO VIVO" do usuário
function atualizarStatusAoVivo(idUsuario, estaTransmitindo) {
  const li = document.getElementById(`user-${idUsuario}`);
  if (li) {
    const statusContainer = li.querySelector('.status-container');
    if (estaTransmitindo) {
      statusContainer.innerHTML = `<span class="badge-ao-vivo"><span class="ponto-pisca"></span>AO VIVO</span>`;
    } else {
      statusContainer.innerHTML = '';
    }
  }
}

function criarStreamDummy() {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.captureStream(1);
}

// 1. CRIAR SALA (HOST)
btnCriarSala.addEventListener('click', () => {
  meuNome = inputNome.value.trim();
  if (!meuNome) return alert('Por favor, digite seu apelido!');

  localStorage.setItem('app_meu_nome', meuNome);

  souHost = true;
  peer = new Peer(peerConfig);

  peer.on('open', (id) => {
    entrarNaSala(id);
  });

  peer.on('connection', (conn) => {
    conexoesDados.push(conn);

    conn.on('data', (data) => {
      tratarMensagemDados(data, conn);
    });
  });

  configurarRecebimentoDeVideo();
});

// 2. ENTRAR EM SALA (CONVIDADO)
btnEntrarSala.addEventListener('click', () => {
  meuNome = inputNome.value.trim();
  const idSala = inputIdSala.value.trim();

  if (!meuNome) return alert('Por favor, digite seu apelido!');
  if (!idSala) return alert('Por favor, cole o ID da sala!');

  localStorage.setItem('app_meu_nome', meuNome);

  souHost = false;
  peer = new Peer(peerConfig);

  peer.on('open', () => {
    entrarNaSala(idSala);

    const conn = peer.connect(idSala);
    conexoesDados.push(conn);

    conn.on('open', () => {
      conn.send({ tipo: 'ENTROU', nome: meuNome, idUsuario: meuNome });
    });

    conn.on('data', (data) => {
      tratarMensagemDados(data, conn);
    });

    const dummyStream = criarStreamDummy();
    const chamada = peer.call(idSala, dummyStream);

    chamada.on('stream', (streamRemoto) => {
      exibirVideo(streamRemoto, false);
    });
  });

  configurarRecebimentoDeVideo();
});

// Centraliza a leitura das mensagens de dados recebidas
function tratarMensagemDados(data, conn) {
  if (data.tipo === 'ENTROU') {
    adicionarUsuarioNaLista(data.nome, data.idUsuario);
    if (souHost) {
      conn.send({ tipo: 'BOAS_VINDAS', nomeHost: meuNome });
      if (streamAtual) {
        conn.send({ tipo: 'STATUS_AO_VIVO', idUsuario: meuNome, estaTransmitindo: true });
      }
    }
  } else if (data.tipo === 'BOAS_VINDAS') {
    adicionarUsuarioNaLista(data.nomeHost, data.nomeHost);
  } else if (data.tipo === 'STATUS_AO_VIVO') {
    atualizarStatusAoVivo(data.idUsuario, data.estaTransmitindo);
    if (!data.estaTransmitindo) {
      limparPlayer();
    }
  }
}

function configurarRecebimentoDeVideo() {
  peer.on('call', (chamada) => {
    if (streamAtual) {
      chamada.answer(streamAtual);
    } else {
      chamada.answer();
    }

    chamada.on('stream', (streamRemoto) => {
      exibirVideo(streamRemoto, false);
    });
  });

  peer.on('error', (err) => console.error('Erro PeerJS:', err));
}

// 3. TRANSMITIR / PARAR
btnTransmitir.addEventListener('click', async () => {
  if (streamAtual) {
    pararTransmissao();
    return;
  }

  try {
    streamAtual = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true
    });

    exibirVideo(streamAtual, true);
    atualizarBotaoTransmitir(true);
    atualizarStatusAoVivo(meuNome, true);

    conexoesDados.forEach(conn => {
      peer.call(conn.peer, streamAtual);
      conn.send({ tipo: 'STATUS_AO_VIVO', idUsuario: meuNome, estaTransmitindo: true });
    });

    streamAtual.getVideoTracks()[0].onended = () => {
      pararTransmissao();
    };

  } catch (erro) {
    console.error('Erro ao compartilhar tela:', erro);
  }
});

function pararTransmissao() {
  if (streamAtual) {
    streamAtual.getTracks().forEach(track => track.stop());
    streamAtual = null;
  }

  limparPlayer();
  atualizarBotaoTransmitir(false);
  atualizarStatusAoVivo(meuNome, false);

  conexoesDados.forEach(conn => {
    conn.send({ tipo: 'STATUS_AO_VIVO', idUsuario: meuNome, estaTransmitindo: false });
  });
}

function atualizarBotaoTransmitir(estaTransmitindo) {
  if (estaTransmitindo) {
    btnTransmitir.innerText = '⏹ Parar Transmissão';
    btnTransmitir.classList.remove('btn-primary');
    btnTransmitir.classList.add('btn-danger');
  } else {
    btnTransmitir.innerText = '🎥 Transmitir Tela';
    btnTransmitir.classList.remove('btn-danger');
    btnTransmitir.classList.add('btn-primary');
  }
}

function limparPlayer() {
  playerVideo.srcObject = null;
  statusTransmissao.classList.remove('esconde');
}

function exibirVideo(stream, ehProprio) {
  playerVideo.srcObject = stream;
  playerVideo.muted = ehProprio;
  statusTransmissao.classList.add('esconde');
  playerVideo.play().catch(e => console.log('Autoplay:', e));
}

// 4. COPIAR ID
btnCopiarId.addEventListener('click', () => {
  navigator.clipboard.writeText(displayIdSala.innerText);
  alert('ID copiado para a área de transferência!');
});