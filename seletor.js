const {
    ipcRenderer
} = require('electron');


// ============================================================
// ESTADO
// ============================================================

let fonteSelecionada = null;


// ============================================================
// ELEMENTOS
// ============================================================

const containerTelas =
    document.getElementById('telas');

const containerJanelas =
    document.getElementById('janelas');

const btnConfirmar =
    document.getElementById('confirmar');

const btnCancelar =
    document.getElementById('cancelar');


// ============================================================
// CARREGAR FONTES
// ============================================================

async function carregarFontes() {

    try {

        console.log(
            'Solicitando fontes ao Electron...'
        );


        const fontes =
            await ipcRenderer.invoke(
                'obter-fontes'
            );


        console.log(
            'Fontes recebidas:',
            fontes
        );


        if (
            !fontes ||
            fontes.length === 0
        ) {

            mostrarVazio(
                containerTelas,
                'Nenhuma tela encontrada.'
            );

            mostrarVazio(
                containerJanelas,
                'Nenhuma janela encontrada.'
            );

            return;
        }


        // ====================================================
        // SEPARAR TELAS E JANELAS
        // ====================================================

        fontes.forEach(
            (fonte) => {

                const elemento =
                    criarFonte(fonte);


                /*
                 * O Electron retorna IDs de tela
                 * começando normalmente por "screen:".
                 */

                if (
                    fonte.id.startsWith(
                        'screen:'
                    )
                ) {

                    containerTelas.appendChild(
                        elemento
                    );

                } else {

                    containerJanelas.appendChild(
                        elemento
                    );

                }

            }
        );


        // ====================================================
        // CASO NÃO EXISTAM TELAS
        // ====================================================

        if (
            containerTelas.children.length === 0
        ) {

            mostrarVazio(
                containerTelas,
                'Nenhuma tela encontrada.'
            );

        }


        // ====================================================
        // CASO NÃO EXISTAM JANELAS
        // ====================================================

        if (
            containerJanelas.children.length === 0
        ) {

            mostrarVazio(
                containerJanelas,
                'Nenhuma janela disponível.'
            );

        }


    } catch (erro) {

        console.error(
            'Erro ao carregar fontes:',
            erro
        );


        mostrarVazio(
            containerTelas,
            'Erro ao carregar as telas.'
        );


        mostrarVazio(
            containerJanelas,
            'Erro ao carregar as janelas.'
        );

    }

}


// ============================================================
// CRIAR ITEM DE FONTE
// ============================================================

function criarFonte(fonte) {

    const elemento =
        document.createElement('div');


    elemento.className =
        'fonte';


    // ========================================================
    // PREVIEW
    // ========================================================

    const imagem =
        document.createElement('img');


    imagem.className =
        'preview';


    imagem.src =
        fonte.thumbnail;


    imagem.alt =
        fonte.name;


    // ========================================================
    // NOME
    // ========================================================

    const nome =
        document.createElement('div');


    nome.className =
        'nome';


    nome.innerText =
        fonte.name;


    // ========================================================
    // MONTAR ELEMENTO
    // ========================================================

    elemento.appendChild(
        imagem
    );


    elemento.appendChild(
        nome
    );


    // ========================================================
    // CLIQUE
    // ========================================================

    elemento.addEventListener(
        'click',
        () => {

            selecionarFonte(
                fonte,
                elemento
            );

        }
    );


    return elemento;
}


// ============================================================
// SELECIONAR FONTE
// ============================================================

function selecionarFonte(
    fonte,
    elemento
) {

    // ========================================================
    // REMOVER SELEÇÃO ANTERIOR
    // ========================================================

    document
        .querySelectorAll('.fonte')
        .forEach(
            (item) => {

                item.classList.remove(
                    'selecionada'
                );

            }
        );


    // ========================================================
    // MARCAR NOVA SELEÇÃO
    // ========================================================

    elemento.classList.add(
        'selecionada'
    );


    // ========================================================
    // GUARDAR FONTE
    // ========================================================

    fonteSelecionada =
        fonte;


    // ========================================================
    // HABILITAR BOTÃO
    // ========================================================

    btnConfirmar.disabled =
        false;


    console.log(
        'Fonte selecionada:',
        fonteSelecionada
    );

}


// ============================================================
// CONFIRMAR
// ============================================================

btnConfirmar.addEventListener(
    'click',
    () => {

        if (!fonteSelecionada) {

            return;

        }


        console.log(
            'Confirmando fonte:',
            fonteSelecionada
        );


        // ====================================================
        // ENVIAR APENAS OS DADOS NECESSÁRIOS
        // ====================================================

        ipcRenderer.send(
            'fonte-selecionada',
            {
                id:
                    fonteSelecionada.id,

                name:
                    fonteSelecionada.name
            }
        );

    }
);


// ============================================================
// CANCELAR
// ============================================================

btnCancelar.addEventListener(
    'click',
    () => {

        console.log(
            'Seleção cancelada.'
        );


        ipcRenderer.send(
            'selecao-cancelada'
        );

    }
);


// ============================================================
// ESC PARA CANCELAR
// ============================================================

document.addEventListener(
    'keydown',
    (event) => {

        if (
            event.key === 'Escape'
        ) {

            ipcRenderer.send(
                'selecao-cancelada'
            );

        }

    }
);


// ============================================================
// INICIAR
// ============================================================

carregarFontes();