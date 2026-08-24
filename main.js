const {
    app,
    BrowserWindow,
    ipcMain,
    desktopCapturer,
    session
} = require('electron');

const path = require('path');

let mainWindow;

// ============================================================
// GPU / ACELERAÇÃO
// ============================================================

app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');

// ============================================================
// CRIAR JANELA PRINCIPAL
// ============================================================

function createWindow() {

    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        title: 'Transmissão - style Discord',
        autoHideMenuBar: true,

        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // DevTools precisa ser aberto DEPOIS de criar a janela
    mainWindow.webContents.openDevTools();

    mainWindow.loadFile('index.html');
}

// ============================================================
// ELECTRON READY
// ============================================================

app.whenReady().then(async () => {

    console.log('========================================');
    console.log('DIAGNÓSTICO DO ELECTRON');
    console.log('========================================');

    console.log('Electron:', process.versions.electron);
    console.log('Chrome:', process.versions.chrome);
    console.log('Node:', process.versions.node);
    console.log('Plataforma:', process.platform);
    console.log('Arquitetura:', process.arch);

    // ========================================================
    // GPU STATUS
    // ========================================================

    console.log('');
    console.log('========================================');
    console.log('GPU STATUS');
    console.log('========================================');

    console.log(
        app.getGPUFeatureStatus()
    );

    // ========================================================
    // GPU INFO COMPLETA
    // ========================================================

    try {

        const info = await app.getGPUInfo('complete');

        console.log('');
        console.log('========================================');
        console.log('GPU INFO COMPLETA');
        console.log('========================================');

        console.log(info);

    } catch (error) {

        console.error(
            'Erro ao obter informações da GPU:',
            error
        );

    }

    // ========================================================
    // CRIAR JANELA
    // ========================================================

    createWindow();

    // ========================================================
    // JANELA chrome://gpu
    // ========================================================

    const gpuWindow = new BrowserWindow({
        width: 1200,
        height: 900,

        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    gpuWindow.loadURL('chrome://gpu');

    // ========================================================
    // CAPTURA DE TELA
    // ========================================================

    session.defaultSession.setDisplayMediaRequestHandler(

        async (request, callback) => {

            try {

                console.log('');
                console.log('========================================');
                console.log('SOLICITAÇÃO DE CAPTURA DE TELA');
                console.log('========================================');

                const sources =
                    await desktopCapturer.getSources({
                        types: ['screen']
                    });

                if (!sources || sources.length === 0) {

                    console.error(
                        'Nenhuma tela encontrada.'
                    );

                    callback({});

                    return;
                }

                console.log(
                    'Tela selecionada:',
                    sources[0].name
                );

                callback({
                    video: sources[0],

                    // Captura áudio do sistema
                    audio: 'loopback'
                });

            } catch (error) {

                console.error(
                    'Erro ao capturar tela:',
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
    // WINDOWS / DISPLAY MEDIA
    // ========================================================

    console.log('');
    console.log('========================================');
    console.log('CAPTURA CONFIGURADA');
    console.log('========================================');

});

// ============================================================
// REABRIR APLICATIVO NO MAC
// ============================================================

app.on('activate', () => {

    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }

});

// ============================================================
// FECHAR APLICATIVO
// ============================================================

app.on('window-all-closed', () => {

    if (process.platform !== 'darwin') {
        app.quit();
    }

});