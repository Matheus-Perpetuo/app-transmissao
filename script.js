// ============================================================
// REFERÊNCIAS DO HTML
// ============================================================

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


// ============================================================
// ESTADO DA APLICAÇÃO
// ============================================================

let currentRoom = null;
let meuNome = '';
let estaTransmitindo = false;


// ============================================================
// CONTROLE DA CAPTURA DESKTOP
// ============================================================

let localVideoTrack = null;
let localAudioTrack = null;

let currentVideoPublication = null;
let currentAudioPublication = null;


// ============================================================
// URL DO BACKEND
// ============================================================

const VERCEL_URL = 'https://app-transmissao.vercel.app';


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

        maxBitrate: 4_000_000
    },

    '1080p30': {
        resolution: {
            width: 1920,
            height: 1080,
            frameRate: 30
        },

        maxBitrate: 7_000_000
    },

    '1080p60': {
        resolution: {
            width: 1920,
            height: 1080,
            frameRate: 60
        },

        maxBitrate: 10_000_000
    }

};


// ============================================================
// DOM READY
// ============================================================

window.addEventListener('DOMContentLoaded', () => {

    const nomeSalvo =
        localStorage.getItem('app_meu_nome');

    if (nomeSalvo) {
        inputNome.value = nomeSalvo;
    }

});


// ============================================================
// ENTRAR NA SALA
// ============================================================

btnEntrarSala.addEventListener('click', async () => {

    meuNome = inputNome.value.trim();

    const nomeSala = inputIdSala.value
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

    btnEntrarSala.disabled = true;


    try {

        const baseUrl =
            location.protocol.startsWith('http')
                ? ''
                : VERCEL_URL;


        const response = await fetch(
            `${baseUrl}/api/token?room=${nomeSala}&username=${encodeURIComponent(meuNome)}`
        );


        const data =
            await response.json();


        if (!response.ok || !data.token) {

            throw new Error(
                data.error ||
                'Erro ao gerar o token de acesso.'
            );

        }


        // ====================================================
        // LIVEKIT ROOM
        // ====================================================

        currentRoom =
            new LivekitClient.Room({

                adaptiveStream: false,

                dynacast: false

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


        console.log(
            'GPU / Chromium:',
            {
                userAgent:
                    navigator.userAgent,

                platform:
                    navigator.platform
            }
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

        btnEntrarSala.disabled = false;

    }

});


// ============================================================
// EVENTOS DA SALA
// ============================================================

function configurarEventosDaSala(room) {


    // --------------------------------------------------------
    // TRACK RECEBIDA
    // --------------------------------------------------------

    room.on(
        LivekitClient.RoomEvent.TrackSubscribed,

        (track, publication, participant) => {

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


    // --------------------------------------------------------
    // TRACK REMOVIDA
    // --------------------------------------------------------

    room.on(
        LivekitClient.RoomEvent.TrackUnsubscribed,

        (track) => {

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


    // --------------------------------------------------------
    // TRACK PUBLICADA
    // --------------------------------------------------------

    room.on(
        LivekitClient.RoomEvent.TrackPublished,

        () => {

            atualizarListaParticipantes();

        }
    );


    // --------------------------------------------------------
    // TRACK DESPUBLICADA
    // --------------------------------------------------------

    room.on(
        LivekitClient.RoomEvent.TrackUnpublished,

        () => {

            atualizarListaParticipantes();

        }
    );


    // --------------------------------------------------------
    // PARTICIPANTE ENTROU
    // --------------------------------------------------------

    room.on(
        LivekitClient.RoomEvent.ParticipantConnected,

        () => {

            atualizarListaParticipantes();

        }
    );


    // --------------------------------------------------------
    // PARTICIPANTE SAIU
    // --------------------------------------------------------

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


    listaParticipantes.innerHTML = '';


    // --------------------------------------------------------
    // EU
    // --------------------------------------------------------

    adicionarUsuarioNaLista(
        `${meuNome} (Você)`,
        currentRoom.localParticipant.identity,
        estaTransmitindo
    );


    // --------------------------------------------------------
    // OUTROS PARTICIPANTES
    // --------------------------------------------------------

    currentRoom.remoteParticipants.forEach(
        (p) => {

            let amigoEstaAoVivo =
                p.isScreenShareEnabled;


            p.trackPublications.forEach(
                (pub) => {

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

                            amigoEstaAoVivo = true;

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
// ADICIONAR USUÁRIO NA LISTA
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


    const badgeHtml = aoVivo

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


        // ----------------------------------------------------
        // DESPUBLICAR VÍDEO
        // ----------------------------------------------------

        if (
            currentVideoPublication &&
            currentVideoPublication.track
        ) {

            await currentRoom.localParticipant
                .unpublishTrack(
                    currentVideoPublication.track
                );

        }


        // ----------------------------------------------------
        // DESPUBLICAR ÁUDIO
        // ----------------------------------------------------

        if (
            currentAudioPublication &&
            currentAudioPublication.track
        ) {

            await currentRoom.localParticipant
                .unpublishTrack(
                    currentAudioPublication.track
                );

        }


        // ----------------------------------------------------
        // PARAR TRACK DE VÍDEO
        // ----------------------------------------------------

        if (localVideoTrack) {

            localVideoTrack.stop();

            localVideoTrack = null;

        }


        // ----------------------------------------------------
        // PARAR TRACK DE ÁUDIO
        // ----------------------------------------------------

        if (localAudioTrack) {

            localAudioTrack.stop();

            localAudioTrack = null;

        }


    } catch (err) {

        console.error(
            'Erro ao parar transmissão:',
            err
        );

    }


    estaTransmitindo = false;


    currentVideoPublication = null;

    currentAudioPublication = null;


    // --------------------------------------------------------
    // REATIVAR CONTROLES
    // --------------------------------------------------------

    if (boxQualidade) {

        boxQualidade.classList.remove(
            'esconde'
        );

    }


    if (selectQualidade) {

        selectQualidade.disabled = false;

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


    // --------------------------------------------------------
    // PERFIL SELECIONADO
    // --------------------------------------------------------

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
        '         INICIANDO TRANSMISSÃO'
    );

    console.log(
        '=========================================='
    );


    console.log(
        'Perfil:',
        opcao
    );


    console.log(
        'Resolução desejada:',
        `${perfil.resolution.width}x${perfil.resolution.height}`
    );


    console.log(
        'FPS desejado:',
        perfil.resolution.frameRate
    );


    console.log(
        'Bitrate máximo:',
        `${perfil.maxBitrate / 1_000_000} Mbps`
    );


    console.log(
        '=========================================='
    );


    // ========================================================
    // CAPTURA DA TELA
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

            audio: true

        });


    // ========================================================
    // TRACK DE VÍDEO
    // ========================================================

    localVideoTrack =
        stream.getVideoTracks()[0];


    if (!localVideoTrack) {

        throw new Error(
            'Não foi possível capturar a tela.'
        );

    }


    // ========================================================
    // OTIMIZAÇÃO PARA JOGOS
    // ========================================================

    localVideoTrack.contentHint =
        'motion';


    // ========================================================
    // DIAGNÓSTICO DA CAPTURA
    // ========================================================

    console.log('');

    console.log(
        '=========================================='
    );

    console.log(
        '           CAPTURA REAL'
    );

    console.log(
        '=========================================='
    );


    const settings =
        localVideoTrack.getSettings();


    console.log(
        'Resolução:',
        `${settings.width}x${settings.height}`
    );


    console.log(
        'FPS:',
        settings.frameRate
    );


    console.log(
        'Aspect Ratio:',
        settings.aspectRatio
    );


    console.log(
        'Display Surface:',
        settings.displaySurface
    );


    console.log(
        'Cursor:',
        settings.cursor
    );


    console.log(
        'Configuração completa:',
        settings
    );


    console.log('');


    console.log(
        'Capacidades:',
        localVideoTrack.getCapabilities()
    );


    console.log(
        '=========================================='
    );


    // ========================================================
    // PUBLICAR SCREEN SHARE
    // ========================================================

    currentVideoPublication =
        await currentRoom.localParticipant.publishTrack(

            localVideoTrack,

            {

                name:
                    'screen_share',


                source:
                    LivekitClient.Track.Source.ScreenShare,


                // ------------------------------------------------
                // SEM SIMULCAST
                // ------------------------------------------------

                simulcast:
                    false,


                // ------------------------------------------------
                // H.264
                // ------------------------------------------------

                videoCodec:
                    'h264',


                // ------------------------------------------------
                // CONFIGURAÇÃO ESPECÍFICA PARA SCREEN SHARE
                // ------------------------------------------------

                screenShareEncoding: {

                    maxBitrate:
                        perfil.maxBitrate,

                    maxFramerate:
                        perfil.resolution.frameRate

                }

            }

        );


    // ========================================================
    // PUBLICAÇÃO CONFIRMADA
    // ========================================================

    console.log('');

    console.log(
        '=========================================='
    );

    console.log(
        '        PUBLICAÇÃO LIVEKIT'
    );

    console.log(
        '=========================================='
    );


    console.log(
        'Publication:',
        currentVideoPublication
    );


    console.log(
        'Track:',
        currentVideoPublication.track
    );


    console.log(
        'Track SID:',
        currentVideoPublication.trackSid
    );


    console.log(
        'Source:',
        currentVideoPublication.source
    );


    console.log(
        'Codec:',
        currentVideoPublication.codec
    );


    console.log(
        '=========================================='
    );


    // ========================================================
    // ÁUDIO DO SISTEMA
    // ========================================================

    localAudioTrack =
        stream.getAudioTracks()[0];


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
            'Áudio da tela publicado.'
        );


    } else {

        console.log(
            'Nenhuma faixa de áudio disponível.'
        );

    }


    // ========================================================
    // ATUALIZAR ESTADO
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
// BOTÃO TRANSMITIR
// ============================================================

btnTransmitir.addEventListener(

    'click',

    async () => {


        // ----------------------------------------------------
        // PROTEÇÃO CONTRA CLIQUE DUPLO
        // ----------------------------------------------------

        if (
            !currentRoom ||
            btnTransmitir.disabled
        ) {

            return;

        }


        btnTransmitir.disabled =
            true;


        try {


            if (estaTransmitindo) {

                await pararTransmissao();

            } else {

                await iniciarTransmissao();

            }


        } catch (err) {


            console.error(
                'Erro ao compartilhar tela:',
                err
            );


            alert(
                'Falha ao iniciar/parar transmissão: ' +
                err.message
            );


        } finally {

            btnTransmitir.disabled =
                false;

        }

    }

);


// ============================================================
// EXIBIR VÍDEO REMOTO
// ============================================================

function exibirVideoEAudio(track) {


    // --------------------------------------------------------
    // ANEXAR TRACK AO PLAYER
    // --------------------------------------------------------

    track.attach(
        playerVideo
    );


    // --------------------------------------------------------
    // INTERFACE
    // --------------------------------------------------------

    statusTransmissao.classList.add(
        'esconde'
    );


    playerVideo.playsInline =
        true;


    playerVideo.autoplay =
        true;


    // --------------------------------------------------------
    // REPRODUÇÃO
    // --------------------------------------------------------

    playerVideo.play().catch(
        (e) => {

            console.log(
                'Autoplay:',
                e
            );

        }
    );


    // --------------------------------------------------------
    // DIAGNÓSTICO DO PLAYER
    // --------------------------------------------------------

    setTimeout(() => {


        console.log('');

        console.log(
            '=========================================='
        );

        console.log(
            '          PLAYER REMOTO'
        );

        console.log(
            '=========================================='
        );


        console.log(
            'videoWidth:',
            playerVideo.videoWidth
        );


        console.log(
            'videoHeight:',
            playerVideo.videoHeight
        );


        console.log(
            'readyState:',
            playerVideo.readyState
        );


        console.log(
            'networkState:',
            playerVideo.networkState
        );


        if (
            typeof playerVideo.getVideoPlaybackQuality ===
            'function'
        ) {

            console.log(
                'Playback Quality:',
                playerVideo.getVideoPlaybackQuality()
            );

        }


        console.log(
            '=========================================='
        );


    }, 2000);

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
// ATUALIZAR BOTÃO TRANSMITIR
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