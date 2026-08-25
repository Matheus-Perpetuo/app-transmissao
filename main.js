const {
    app,
    BrowserWindow,
    ipcMain,
    desktopCapturer,
    session
} = require('electron');

const path = require('path');

let mainWindow = null;
let seletorWindow = null;
let fonteSelecionada = null;


// ============================================================
// GPU / ACELERAÇÃO
// ============================================================

app.commandLine.appendSwitch(
    'ignore-gpu-blocklist'
);

app.commandLine.appendSwitch(
    'enable-gpu-rasterization'
);

app.commandLine.appendSwitch(
    'enable-zero-copy'
);


// ============================================================
// CRIAR JANELA PRINCIPAL
// ============================================================

function createWindow() {

    mainWindow = new BrowserWindow({

        width: 1280,

        height: 720,

        title: 'AppTransmitir',

        autoHideMenuBar: true,

        webPreferences: {

            nodeIntegration: true,

            contextIsolation: false

        }

    });


    mainWindow.loadFile('index.html');
}


// ============================================================
// ABRIR SELETOR DE FONTE
// ============================================================

function abrirSeletor() {

    // --------------------------------------------------------
    // EVITAR DUAS JANELAS
    // --------------------------------------------------------

    if (seletorWindow) {

        seletorWindow.focus();

        return;
    }


    // --------------------------------------------------------
    // LIMPAR SELEÇÃO ANTERIOR
    // --------------------------------------------------------

    fonteSelecionada = null;


    // --------------------------------------------------------
    // CRIAR JANELA DO SELETOR
    // --------------------------------------------------------

    seletorWindow = new BrowserWindow({

        width: 1000,

        height: 750,

        minWidth: 800,

        minHeight: 600,

        title: 'Selecionar transmissão',

        autoHideMenuBar: true,

        parent: mainWindow,

        modal: true,

        webPreferences: {

            nodeIntegration: true,

            contextIsolation: false

        }

    });


    seletorWindow.loadFile(
        'seletor.html'
    );


    // --------------------------------------------------------
    // JANELA FECHADA
    // --------------------------------------------------------

    seletorWindow.on(
        'closed',
        () => {

            seletorWindow = null;

        }
    );
}


// ============================================================
// ELECTRON READY
// ============================================================

app.whenReady().then(() => {


    // ========================================================
    // IPC - ABRIR SELETOR
    // ========================================================

    ipcMain.on(
        'abrir-seletor',
        () => {

            console.log('');

            console.log(
                '========================================'
            );

            console.log(
                'ABRINDO SELETOR DE TRANSMISSÃO'
            );

            console.log(
                '========================================'
            );


            abrirSeletor();

        }
    );


    // ========================================================
    // IPC - OBTER FONTES
    // ========================================================

    ipcMain.handle(
        'obter-fontes',
        async () => {

            console.log('');

            console.log(
                'Obtendo fontes de captura...'
            );


            try {

                const sources =
                    await desktopCapturer.getSources({

                        types: [
                            'screen',
                            'window'
                        ],

                        thumbnailSize: {

                            width: 640,

                            height: 360

                        },

                        fetchWindowIcons: true

                    });


                console.log(
                    'Fontes encontradas:',
                    sources.length
                );


                return sources.map(
                    fonte => ({

                        id:
                            fonte.id,

                        name:
                            fonte.name,

                        thumbnail:
                            fonte.thumbnail
                                ? fonte.thumbnail.toDataURL()
                                : null,

                        appIcon:
                            fonte.appIcon
                                ? fonte.appIcon.toDataURL()
                                : null

                    })
                );


            } catch (error) {

                console.error(
                    'Erro ao obter fontes:',
                    error
                );

                return [];

            }

        }
    );


    // ========================================================
    // IPC - FONTE SELECIONADA
    // ========================================================

    ipcMain.on(
        'fonte-selecionada',
        (event, fonte) => {

            console.log('');

            console.log(
                '========================================'
            );

            console.log(
                'FONTE SELECIONADA'
            );

            console.log(
                '========================================'
            );


            console.log(
                'ID:',
                fonte.id
            );


            console.log(
                'Nome:',
                fonte.name
            );


            // ------------------------------------------------
            // GUARDAR FONTE
            // ------------------------------------------------

            fonteSelecionada = {

                id:
                    fonte.id,

                name:
                    fonte.name

            };


            // ------------------------------------------------
            // FECHAR SELETOR
            // ------------------------------------------------

            if (seletorWindow) {

                seletorWindow.close();

                seletorWindow = null;

            }


            // ------------------------------------------------
            // AVISAR JANELA PRINCIPAL
            // ------------------------------------------------

            if (
                mainWindow &&
                !mainWindow.isDestroyed()
            ) {

                console.log(
                    'Enviando confirmação para janela principal...'
                );


                mainWindow.webContents.send(

                    'fonte-selecionada-confirmada',

                    fonteSelecionada

                );

            }

        }
    );


    // ========================================================
    // IPC - CANCELAR SELEÇÃO
    // ========================================================

    ipcMain.on(
        'selecao-cancelada',
        () => {

            console.log(
                'Seleção cancelada.'
            );


            fonteSelecionada = null;


            if (seletorWindow) {

                seletorWindow.close();

                seletorWindow = null;

            }

        }
    );


    // ========================================================
    // CAPTURA DE TELA / JANELA
    // ========================================================

    session.defaultSession.setDisplayMediaRequestHandler(

        async (request, callback) => {

            console.log('');

            console.log(
                '========================================'
            );

            console.log(
                'SOLICITAÇÃO DE CAPTURA'
            );

            console.log(
                '========================================'
            );


            // ------------------------------------------------
            // VERIFICAR FONTE SELECIONADA
            // ------------------------------------------------

            if (!fonteSelecionada) {

                console.error(
                    'Nenhuma fonte foi selecionada.'
                );


                callback({});

                return;

            }


            console.log(
                'Capturando EXATAMENTE:',
                fonteSelecionada.name
            );


            console.log(
                'ID:',
                fonteSelecionada.id
            );


            try {

                // --------------------------------------------
                // BUSCAR FONTES ATUAIS
                // --------------------------------------------

                const sources =
                    await desktopCapturer.getSources({

                        types: [
                            'screen',
                            'window'
                        ],

                        thumbnailSize: {

                            width: 640,

                            height: 360

                        },

                        fetchWindowIcons: true

                    });


                // --------------------------------------------
                // ENCONTRAR EXATAMENTE PELO ID
                // --------------------------------------------

                const fonte =
                    sources.find(
                        source =>
                            source.id ===
                            fonteSelecionada.id
                    );


                // --------------------------------------------
                // FONTE NÃO ENCONTRADA
                // --------------------------------------------

                if (!fonte) {

                    console.error(
                        'A fonte selecionada não foi encontrada.'
                    );


                    callback({});

                    return;

                }


                // --------------------------------------------
                // CONFIRMAÇÃO
                // --------------------------------------------

                console.log(
                    'Fonte encontrada:',
                    fonte.name
                );


                console.log(
                    'ID confirmado:',
                    fonte.id
                );


                console.log(
                    'Tipo:',
                    fonte.id.startsWith('window:')
                        ? 'JANELA'
                        : 'TELA'
                );


                console.log(
                    'Capturando exatamente esta fonte.'
                );


                // --------------------------------------------
                // CAPTURA DE VÍDEO + ÁUDIO DO SISTEMA
                // --------------------------------------------

                callback({

                    video: fonte,

                    audio: 'loopback'

                });


            } catch (error) {

                console.error(
                    'Erro ao capturar fonte:',
                    error
                );


                callback({});

            }

        },

        {

            useSystemPicker: false

        }

    );


    // ========================================================
    // CRIAR JANELA
    // ========================================================

    createWindow();


    // ========================================================
    // INFORMAÇÕES
    // ========================================================

    console.log('');

    console.log(
        '========================================'
    );

    console.log(
        'APPTRANSMITIR INICIADO'
    );

    console.log(
        '========================================'
    );


    console.log(
        'Electron:',
        process.versions.electron
    );


    console.log(
        'Chrome:',
        process.versions.chrome
    );


    console.log(
        'Node:',
        process.versions.node
    );


    console.log(
        'Plataforma:',
        process.platform
    );


    console.log(
        'Arquitetura:',
        process.arch
    );


    console.log('');


    // --------------------------------------------------------
    // GPU
    // --------------------------------------------------------

    console.log(
        'GPU:',
        app.getGPUFeatureStatus()
    );


    console.log('');


    console.log(
        '========================================'
    );


    console.log(
        'CAPTURA CONFIGURADA'
    );


    console.log(
        '========================================'
    );


    console.log(
        'Vídeo: FONTE EXATA SELECIONADA'
    );


    console.log(
        'Áudio: LOOPBACK / ÁUDIO DO SISTEMA'
    );


    console.log(
        '========================================'
    );

});


// ============================================================
// REABRIR APLICATIVO NO MAC
// ============================================================

app.on(
    'activate',
    () => {

        if (
            BrowserWindow.getAllWindows().length === 0
        ) {

            createWindow();

        }

    }
);


// ============================================================
// FECHAR APLICATIVO
// ============================================================

app.on(
    'window-all-closed',
    () => {

        if (
            process.platform !== 'darwin'
        ) {

            app.quit();

        }

    }
);