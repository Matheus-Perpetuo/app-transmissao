// ============================================================
// REFERÊNCIAS DO HTML
// ============================================================

const telaLobby =
    document.getElementById('tela-lobby');

const telaSala =
    document.getElementById('tela-sala');

const inputNome =
    document.getElementById('input-nome');

const inputIdSala =
    document.getElementById('input-id-sala');

const btnEntrarSala =
    document.getElementById('btn-entrar-sala');

const displayIdSala =
    document.getElementById('display-id-sala');

const btnCopiarId =
    document.getElementById('btn-copiar-id');

const listaParticipantes =
    document.getElementById('lista-participantes');

const contadorUsers =
    document.getElementById('contador-users');

const btnTransmitir =
    document.getElementById('btn-transmitir');

const playerVideo =
    document.getElementById('player-video');

const statusTransmissao =
    document.getElementById('status-transmissao');

const selectQualidade =
    document.getElementById('select-qualidade');

const boxQualidade =
    document.getElementById('box-qualidade');


// ============================================================
// URL DO BACKEND
// ============================================================

const VERCEL_URL =
    'https://app-transmissao.vercel.app';


// ============================================================
// AUTENTICAÇÃO
// ============================================================

const telaAutenticacao =
    document.getElementById('tela-autenticacao');

const inputCodigo =
    document.getElementById('input-codigo');

const btnAutenticar =
    document.getElementById('btn-autenticar');

const statusAutenticacao =
    document.getElementById('status-autenticacao');

let usuarioAutenticado = false;


// ============================================================
// ELECTRON
// ============================================================

let ipcRenderer = null;

if (typeof require === 'function') {

    try {

        const electron =
            require('electron');

        ipcRenderer =
            electron.ipcRenderer;

        console.log(
            'Modo Electron detectado.'
        );

    } catch (erro) {

        console.log(
            'Modo navegador detectado.'
        );
    }

} else {

    console.log(
        'Modo navegador detectado.'
    );
}


// ============================================================
// VERSÃO DO APP
// ============================================================

async function carregarVersaoApp() {

    const elementoVersao =
        document.getElementById('versao-app');

    if (!elementoVersao) {
        return;
    }


    // --------------------------------------------------------
    // ELECTRON
    // --------------------------------------------------------

    if (ipcRenderer) {

        try {

            const versao =
                await ipcRenderer.invoke(
                    'obter-versao'
                );

            elementoVersao.innerText =
                `v${versao}`;

            return;

        } catch (erro) {

            console.error(
                'Erro ao obter versão do Electron:',
                erro
            );
        }
    }


    // --------------------------------------------------------
    // NAVEGADOR / VERCEL
    // --------------------------------------------------------

    elementoVersao.innerText =
        'Web';
}


carregarVersaoApp();


// ============================================================
// AUTENTICAÇÃO
// ============================================================

async function autenticarUsuario() {

    const codigo =
        inputCodigo.value.trim();


    if (!codigo) {

        mostrarStatusAutenticacao(
            'Digite seu código de acesso.',
            true
        );

        return;
    }


    btnAutenticar.disabled =
        true;


    btnAutenticar.innerText =
        'Verificando...';


    mostrarStatusAutenticacao(
        'Verificando código...',
        false
    );


    try {

        const response =
            await fetch(
                `${VERCEL_URL}/api/auth`,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body: JSON.stringify({
                        code: codigo
                    })
                }
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.authorized
        ) {

            throw new Error(
                data.error ||
                'Código de acesso inválido.'
            );
        }


        // ====================================================
        // AUTORIZADO
        // ====================================================

        usuarioAutenticado =
            true;


        sessionStorage.setItem(
            'app_autenticado',
            'true'
        );


        console.log(
            'Usuário autenticado com sucesso.'
        );


        telaAutenticacao.classList.add(
            'esconde'
        );


        telaLobby.classList.remove(
            'esconde'
        );


        limparStatusAutenticacao();


    } catch (erro) {

        console.error(
            'Erro na autenticação:',
            erro
        );


        mostrarStatusAutenticacao(
            erro.message ||
            'Não foi possível validar o código.',
            true
        );


        inputCodigo.select();


    } finally {

        btnAutenticar.disabled =
            false;


        btnAutenticar.innerText =
            '🔓 Acessar';
    }
}


// ============================================================
// STATUS DA AUTENTICAÇÃO
// ============================================================

function mostrarStatusAutenticacao(
    mensagem,
    erro = false
) {

    statusAutenticacao.innerText =
        mensagem;


    statusAutenticacao.classList.remove(
        'esconde'
    );


    if (erro) {

        statusAutenticacao.classList.add(
            'erro-autenticacao'
        );

    } else {

        statusAutenticacao.classList.remove(
            'erro-autenticacao'
        );
    }
}


function limparStatusAutenticacao() {

    statusAutenticacao.innerText =
        '';


    statusAutenticacao.classList.add(
        'esconde'
    );
}


// ============================================================
// VERIFICAR AUTENTICAÇÃO SALVA
// ============================================================

function verificarAutenticacaoSalva() {

    const autenticado =
        sessionStorage.getItem(
            'app_autenticado'
        );


    if (autenticado === 'true') {

        usuarioAutenticado =
            true;


        telaAutenticacao.classList.add(
            'esconde'
        );


        telaLobby.classList.remove(
            'esconde'
        );


        console.log(
            'Sessão já autenticada.'
        );


        return true;
    }


    telaAutenticacao.classList.remove(
        'esconde'
    );


    telaLobby.classList.add(
        'esconde'
    );


    return false;
}


// ============================================================
// EVENTOS DA AUTENTICAÇÃO
// ============================================================

verificarAutenticacaoSalva();


btnAutenticar.addEventListener(
    'click',
    autenticarUsuario
);


inputCodigo.addEventListener(
    'keydown',
    event => {

        if (event.key === 'Enter') {

            autenticarUsuario();
        }
    }
);


// ============================================================
// ESTADO DA APLICAÇÃO
// ============================================================

let currentRoom = null;

let meuNome = '';

let estaTransmitindo = false;


// ============================================================
// CONTROLE DA CAPTURA
// ============================================================

let localVideoTrack = null;

let localAudioTrack = null;

let currentVideoPublication = null;

let currentAudioPublication = null;


// ============================================================
// FONTE SELECIONADA
// ============================================================

let fonteSelecionada = null;


// ============================================================
// PERFIS DE QUALIDADE
// ============================================================

const perfisQualidade = {

    '720p30': {

        resolution: {

            width: 1280,

            height: 720,

            frameRate: 30
        },

        maxBitrate:
            4000000
    },


    '1080p30': {

        resolution: {

            width: 1920,

            height: 1080,

            frameRate: 30
        },

        maxBitrate:
            7000000
    },


    '1080p60': {

        resolution: {

            width: 1920,

            height: 1080,

            frameRate: 60
        },

        maxBitrate:
            10000000
    }
};


// ============================================================
// DOM READY
// ============================================================

window.addEventListener(
    'DOMContentLoaded',
    () => {

        const nomeSalvo =
            localStorage.getItem(
                'app_meu_nome'
            );


        if (nomeSalvo) {

            inputNome.value =
                nomeSalvo;
        }
    }
);


// ============================================================
// FONTE SELECIONADA PELO SELETOR DO ELECTRON
// ============================================================

if (ipcRenderer) {

    ipcRenderer.on(
        'fonte-selecionada-confirmada',

        async (event, fonte) => {

            console.log('');

            console.log(
                '=========================================='
            );

            console.log(
                'FONTE CONFIRMADA PELO SELETOR'
            );

            console.log(
                '=========================================='
            );


            console.log(
                'Nome:',
                fonte.name
            );


            console.log(
                'ID:',
                fonte.id
            );


            console.log(
                '=========================================='
            );


            fonteSelecionada = {

                id:
                    fonte.id,

                name:
                    fonte.name
            };


            try {

                await iniciarTransmissao();

            } catch (erro) {

                console.error(
                    'Erro ao iniciar transmissão:',
                    erro
                );


                alert(
                    'Não foi possível iniciar a transmissão: ' +
                    erro.message
                );


                fonteSelecionada =
                    null;
            }
        }
    );
}


// ============================================================
// ENTRAR NA SALA
// ============================================================

btnEntrarSala.addEventListener(
    'click',

    async () => {

        // ----------------------------------------------------
        // SEGURANÇA
        // ----------------------------------------------------

        if (!usuarioAutenticado) {

            return alert(
                'Você precisa informar um código de acesso válido.'
            );
        }


        meuNome =
            inputNome.value.trim();


        const nomeSala =
            inputIdSala.value
                .trim()
                .toLowerCase()
                .replace(/\s+/g, '-');


        if (!meuNome) {

            return alert(
                'Por favor, digite seu apelido!'
            );
        }


        if (!nomeSala) {

            return alert(
                'Por favor, digite o nome da sala!'
            );
        }


        localStorage.setItem(
            'app_meu_nome',
            meuNome
        );


        btnEntrarSala.innerText =
            'Conectando...';


        btnEntrarSala.disabled =
            true;


        try {

            const baseUrl =
                location.protocol.startsWith('http')
                    ? ''
                    : VERCEL_URL;


            const response =
                await fetch(
                    `${baseUrl}/api/token?room=${nomeSala}&username=${encodeURIComponent(meuNome)}`
                );


            const data =
                await response.json();


            if (
                !response.ok ||
                !data.token
            ) {

                throw new Error(
                    data.error ||
                    'Erro ao gerar o token de acesso.'
                );
            }


            // =================================================
            // LIVEKIT
            // =================================================

            currentRoom =
                new LivekitClient.Room({

                    adaptiveStream:
                        false,

                    dynacast:
                        false
                });


            configurarEventosDaSala(
                currentRoom
            );


            await currentRoom.connect(
                data.wsUrl,
                data.token
            );


            console.log(
                'Conectado ao LiveKit.'
            );


            console.log(
                'LiveKit Client:',
                LivekitClient.version
            );


            displayIdSala.innerText =
                nomeSala;


            telaLobby.classList.add(
                'esconde'
            );


            telaSala.classList.remove(
                'esconde'
            );


            atualizarListaParticipantes();


        } catch (erro) {

            console.error(
                'Erro ao conectar na sala:',
                erro
            );


            alert(
                'Não foi possível entrar na sala: ' +
                erro.message
            );


        } finally {

            btnEntrarSala.innerText =
                'Entrar / Criar Sala';


            btnEntrarSala.disabled =
                false;
        }
    }
);


// ============================================================
// EVENTOS DA SALA
// ============================================================

function configurarEventosDaSala(room) {

    room.on(
        LivekitClient.RoomEvent.TrackSubscribed,

        (
            track,
            publication,
            participant
        ) => {

            console.log(
                'Track recebida:',
                track.kind,
                publication.source,
                participant.identity
            );


            if (
                track.kind === 'video' ||
                track.kind === 'audio'
            ) {

                exibirVideoEAudio(
                    track
                );
            }


            atualizarListaParticipantes();
        }
    );


    room.on(
        LivekitClient.RoomEvent.TrackUnsubscribed,

        track => {

            try {

                track.detach(
                    playerVideo
                );

            } catch (err) {

                console.warn(
                    'Erro ao remover track:',
                    err
                );
            }


            if (
                room.remoteParticipants.size === 0 &&
                !estaTransmitindo
            ) {

                limparPlayer();
            }


            atualizarListaParticipantes();
        }
    );


    room.on(
        LivekitClient.RoomEvent.TrackPublished,

        () => {

            atualizarListaParticipantes();
        }
    );


    room.on(
        LivekitClient.RoomEvent.TrackUnpublished,

        () => {

            atualizarListaParticipantes();
        }
    );


    room.on(
        LivekitClient.RoomEvent.ParticipantConnected,

        () => {

            atualizarListaParticipantes();
        }
    );


    room.on(
        LivekitClient.RoomEvent.ParticipantDisconnected,

        () => {

            atualizarListaParticipantes();
        }
    );
}


// ============================================================
// LISTA DE PARTICIPANTES
// ============================================================

function atualizarListaParticipantes() {

    if (!currentRoom) {

        return;
    }


    listaParticipantes.innerHTML =
        '';


    adicionarUsuarioNaLista(

        `${meuNome} (Você)`,

        currentRoom.localParticipant.identity,

        estaTransmitindo
    );


    currentRoom.remoteParticipants.forEach(

        p => {

            let amigoEstaAoVivo =
                p.isScreenShareEnabled;


            p.trackPublications.forEach(

                pub => {

                    if (

                        pub.source ===
                            LivekitClient.Track.Source.ScreenShare ||

                        pub.source ===
                            LivekitClient.Track.Source.ScreenShareAudio

                    ) {

                        if (

                            pub.isSubscribed ||
                            pub.track

                        ) {

                            amigoEstaAoVivo =
                                true;
                        }
                    }
                }
            );


            adicionarUsuarioNaLista(

                p.identity,

                p.identity,

                amigoEstaAoVivo
            );
        }
    );


    contadorUsers.innerText =
        currentRoom.remoteParticipants.size + 1;
}


// ============================================================
// ADICIONAR USUÁRIO
// ============================================================

function adicionarUsuarioNaLista(

    nomeExibicao,

    idUsuario,

    aoVivo

) {

    const li =
        document.createElement('li');


    li.id =
        `user-${idUsuario}`;


    const badgeHtml =

        aoVivo

            ? `
                <span class="badge-ao-vivo">
                    <span class="ponto-pisca"></span>
                    AO VIVO
                </span>
            `

            : '';


    li.innerHTML = `

        <span class="nome-txt">
            ${nomeExibicao}
        </span>

        <span class="status-container">
            ${badgeHtml}
        </span>

    `;


    listaParticipantes.appendChild(
        li
    );
}


// ============================================================
// PARAR TRANSMISSÃO
// ============================================================

async function pararTransmissao() {

    try {

        if (

            currentVideoPublication &&

            currentVideoPublication.track

        ) {

            await currentRoom.localParticipant
                .unpublishTrack(

                    currentVideoPublication.track
                );
        }


        if (

            currentAudioPublication &&

            currentAudioPublication.track

        ) {

            await currentRoom.localParticipant
                .unpublishTrack(

                    currentAudioPublication.track
                );
        }


        if (localVideoTrack) {

            localVideoTrack.stop();

            localVideoTrack =
                null;
        }


        if (localAudioTrack) {

            localAudioTrack.stop();

            localAudioTrack =
                null;
        }

    } catch (err) {

        console.error(
            'Erro ao parar transmissão:',
            err
        );
    }


    estaTransmitindo =
        false;


    currentVideoPublication =
        null;


    currentAudioPublication =
        null;


    fonteSelecionada =
        null;


    if (boxQualidade) {

        boxQualidade.classList.remove(
            'esconde'
        );
    }


    if (selectQualidade) {

        selectQualidade.disabled =
            false;
    }


    atualizarBotaoTransmitir(
        false
    );


    limparPlayer();


    atualizarListaParticipantes();
}


// ============================================================
// INICIAR TRANSMISSÃO
// ============================================================

async function iniciarTransmissao() {

    if (!currentRoom) {

        throw new Error(
            'Você precisa estar em uma sala antes de transmitir.'
        );
    }


    const opcao =
        selectQualidade
            ? selectQualidade.value
            : '720p30';


    const perfil =
        perfisQualidade[opcao] ||
        perfisQualidade['720p30'];


    console.log('');

    console.log(
        '=========================================='
    );

    console.log(
        'INICIANDO TRANSMISSÃO'
    );

    console.log(
        '=========================================='
    );


    if (fonteSelecionada) {

        console.log(
            'Fonte escolhida:',
            fonteSelecionada.name
        );


        console.log(
            'ID da fonte:',
            fonteSelecionada.id
        );
    }


    // ========================================================
    // CAPTURA
    // ========================================================

    const stream =
        await navigator.mediaDevices.getDisplayMedia({

            video: {

                width: {

                    ideal:
                        perfil.resolution.width
                },


                height: {

                    ideal:
                        perfil.resolution.height
                },


                frameRate: {

                    ideal:
                        perfil.resolution.frameRate
                }
            },


            audio:
                true
        });


    // ========================================================
    // TRACK DE VÍDEO
    // ========================================================

    localVideoTrack =
        stream.getVideoTracks()[0];


    if (!localVideoTrack) {

        throw new Error(
            'Não foi possível capturar a fonte selecionada.'
        );
    }


    // ========================================================
    // TRACK DE ÁUDIO
    // ========================================================

    localAudioTrack =
        stream.getAudioTracks()[0] ||
        null;


    // ========================================================
    // DIAGNÓSTICO
    // ========================================================

    const settings =
        localVideoTrack.getSettings();


    console.log('');

    console.log(
        '=========================================='
    );

    console.log(
        'CAPTURA REAL'
    );

    console.log(
        '=========================================='
    );


    console.log(
        'Resolução:',
        `${settings.width}x${settings.height}`
    );


    console.log(
        'FPS:',
        settings.frameRate
    );


    console.log(
        'Display Surface:',
        settings.displaySurface
    );


    if (fonteSelecionada) {

        console.log(
            'Fonte selecionada:',
            fonteSelecionada.name
        );
    }


    console.log(
        'Áudio capturado:',
        !!localAudioTrack
    );


    console.log(
        '=========================================='
    );


    // ========================================================
    // OTIMIZAÇÃO PARA JOGOS
    // ========================================================

    localVideoTrack.contentHint =
        'motion';


    // ========================================================
    // PUBLICAR VÍDEO
    // ========================================================

    currentVideoPublication =
        await currentRoom.localParticipant.publishTrack(

            localVideoTrack,

            {

                name:
                    'screen_share',


                source:
                    LivekitClient.Track.Source.ScreenShare,


                simulcast:
                    false,


                videoCodec:
                    'h264',


                screenShareEncoding: {

                    maxBitrate:
                        perfil.maxBitrate,


                    maxFramerate:
                        perfil.resolution.frameRate
                }
            }
        );


    // ========================================================
    // PUBLICAR ÁUDIO
    // ========================================================

    if (localAudioTrack) {

        currentAudioPublication =
            await currentRoom.localParticipant.publishTrack(

                localAudioTrack,

                {

                    name:
                        'screen_share_audio',


                    source:
                        LivekitClient.Track.Source.ScreenShareAudio
                }
            );


        console.log(
            'Áudio publicado.'
        );

    } else {

        console.log(
            'Nenhuma faixa de áudio foi capturada.'
        );
    }


    // ========================================================
    // ESTADO
    // ========================================================

    estaTransmitindo =
        true;


    if (boxQualidade) {

        boxQualidade.classList.add(
            'esconde'
        );
    }


    if (selectQualidade) {

        selectQualidade.disabled =
            true;
    }


    atualizarBotaoTransmitir(
        true
    );


    statusTransmissao.classList.add(
        'esconde'
    );


    atualizarListaParticipantes();
}


// ============================================================
// TRANSMISSÃO NO NAVEGADOR
// ============================================================

async function iniciarTransmissaoNavegador() {

    console.log(
        'Modo navegador: abrindo seletor nativo de captura.'
    );


    fonteSelecionada =
        null;


    try {

        await iniciarTransmissao();

    } catch (erro) {

        console.error(
            'Erro ao iniciar transmissão no navegador:',
            erro
        );


        alert(
            'Não foi possível iniciar a transmissão: ' +
            erro.message
        );
    }
}


// ============================================================
// BOTÃO TRANSMITIR
// ============================================================

btnTransmitir.addEventListener(

    'click',

    async () => {

        if (

            !currentRoom ||

            btnTransmitir.disabled

        ) {

            return;
        }


        // ----------------------------------------------------
        // PARAR
        // ----------------------------------------------------

        if (estaTransmitindo) {

            btnTransmitir.disabled =
                true;


            try {

                await pararTransmissao();

            } catch (err) {

                console.error(
                    'Erro ao parar transmissão:',
                    err
                );

            } finally {

                btnTransmitir.disabled =
                    false;
            }


            return;
        }


        // ----------------------------------------------------
        // ELECTRON
        // ----------------------------------------------------

        if (ipcRenderer) {

            console.log(
                'Abrindo seletor personalizado do Electron...'
            );


            ipcRenderer.send(
                'abrir-seletor'
            );


            return;
        }


        // ----------------------------------------------------
        // NAVEGADOR
        // ----------------------------------------------------

        console.log(
            'Abrindo seletor nativo do navegador...'
        );


        await iniciarTransmissaoNavegador();
    }
);


// ============================================================
// EXIBIR VÍDEO REMOTO
// ============================================================

function exibirVideoEAudio(track) {

    track.attach(
        playerVideo
    );


    statusTransmissao.classList.add(
        'esconde'
    );


    playerVideo.playsInline =
        true;


    playerVideo.autoplay =
        true;


    playerVideo.play().catch(

        e => {

            console.log(
                'Autoplay:',
                e
            );
        }
    );
}


// ============================================================
// LIMPAR PLAYER
// ============================================================

function limparPlayer() {

    playerVideo.srcObject =
        null;


    statusTransmissao.classList.remove(
        'esconde'
    );
}


// ============================================================
// ATUALIZAR BOTÃO
// ============================================================

function atualizarBotaoTransmitir(
    transmitindo
) {

    if (transmitindo) {

        btnTransmitir.innerText =
            '⏹ Parar Transmissão';


        btnTransmitir.classList.replace(
            'btn-primary',
            'btn-danger'
        );

    } else {

        btnTransmitir.innerText =
            '🎥 Transmitir Tela';


        btnTransmitir.classList.replace(
            'btn-danger',
            'btn-primary'
        );
    }
}


// ============================================================
// COPIAR ID DA SALA
// ============================================================

btnCopiarId.addEventListener(

    'click',

    () => {

        navigator.clipboard.writeText(
            displayIdSala.innerText
        );


        alert(
            'Nome da sala copiado!'
        );
    }
);