const {
    ipcRenderer
} = require('electron');

let fonteSelecionada = null;

const containerTelas =
    document.getElementById('telas');

const containerJanelas =
    document.getElementById('janelas');

const btnConfirmar =
    document.getElementById('confirmar');

const btnCancelar =
    document.getElementById('cancelar');

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

        fontes.forEach(
            (fonte) => {

                const elemento =
                    criarFonte(fonte);

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

        if (
            containerTelas.children.length === 0
        ) {

            mostrarVazio(
                containerTelas,
                'Nenhuma tela encontrada.'
            );

        }

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

function criarFonte(fonte) {

    const elemento =
        document.createElement('div');


    elemento.className =
        'fonte';

    const imagem =
        document.createElement('img');


    imagem.className =
        'preview';


    imagem.src =
        fonte.thumbnail;


    imagem.alt =
        fonte.name;

    const nome =
        document.createElement('div');


    nome.className =
        'nome';


    nome.innerText =
        fonte.name;


    elemento.appendChild(
        imagem
    );


    elemento.appendChild(
        nome
    );

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

function selecionarFonte(
    fonte,
    elemento
) {

    document
        .querySelectorAll('.fonte')
        .forEach(
            (item) => {

                item.classList.remove(
                    'selecionada'
                );

            }
        );


    elemento.classList.add(
        'selecionada'
    );

    fonteSelecionada =
        fonte;

    btnConfirmar.disabled =
        false;


    console.log(
        'Fonte selecionada:',
        fonteSelecionada
    );

}

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

carregarFontes();