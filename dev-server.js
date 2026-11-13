const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const RAIZ = __dirname;

function carregarEnv() {

    const arquivo =
        path.join(RAIZ, '.env');


    if (!fs.existsSync(arquivo)) {

        return;
    }


    const linhas =
        fs.readFileSync(arquivo, 'utf8')
            .split(/\r?\n/);


    for (const linha of linhas) {

        const texto =
            linha.trim();


        if (
            !texto ||
            texto.startsWith('#')
        ) {

            continue;
        }


        const separador =
            texto.indexOf('=');


        if (separador < 0) {

            continue;
        }


        const chave =
            texto.slice(0, separador).trim();


        let valor =
            texto.slice(separador + 1).trim();


        if (
            (valor.startsWith('"') && valor.endsWith('"')) ||
            (valor.startsWith("'") && valor.endsWith("'"))
        ) {

            valor = valor.slice(1, -1);
        }


        if (!(chave in process.env)) {

            process.env[chave] = valor;
        }
    }
}


carregarEnv();


const API_LOCAL =
    Boolean(
        process.env.LIVEKIT_API_KEY &&
        process.env.LIVEKIT_API_SECRET
    );


const PORTA = Number(process.env.PORT) || 3000;

const BACKEND = 'app-transmissao.vercel.app';

const TIPOS = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
};


function encaminharApi(req, res) {

    const opcoes = {
        hostname: BACKEND,
        port: 443,
        path: req.url,
        method: req.method,
        headers: {
            ...req.headers,
            host: BACKEND
        }
    };


    const requisicao =
        https.request(
            opcoes,
            respostaBackend => {

                res.writeHead(
                    respostaBackend.statusCode || 502,
                    respostaBackend.headers
                );

                respostaBackend.pipe(res);
            }
        );


    requisicao.on(
        'error',
        erro => {

            console.error(
                'Erro no proxy /api:',
                erro.message
            );

            res.writeHead(502, {
                'Content-Type': 'application/json; charset=utf-8'
            });

            res.end(JSON.stringify({
                error: 'Falha ao contatar o backend.'
            }));
        }
    );


    req.pipe(requisicao);
}


function tratarApiLocal(req, res) {

    const caminho =
        (req.url || '').split('?')[0];


    const handlers = {
        '/api/auth': './api/auth.js',
        '/api/token': './api/token.js'
    };


    const modulo =
        handlers[caminho];


    if (!modulo) {

        res.writeHead(404, {
            'Content-Type': 'application/json; charset=utf-8'
        });

        res.end(JSON.stringify({
            error: 'Rota de API não encontrada.'
        }));

        return;
    }


    res.status = codigo => {

        res.statusCode = codigo;

        return res;
    };


    res.json = objeto => {

        if (!res.getHeader('Content-Type')) {

            res.setHeader(
                'Content-Type',
                'application/json; charset=utf-8'
            );
        }

        res.end(JSON.stringify(objeto));

        return res;
    };


    const url =
        new URL(
            req.url,
            'http://localhost'
        );


    req.query =
        Object.fromEntries(
            url.searchParams.entries()
        );


    const executar = () => {

        Promise
            .resolve(
                require(modulo)(req, res)
            )
            .catch(erro => {

                console.error(
                    'Erro na API local:',
                    erro
                );

                if (!res.headersSent) {

                    res.writeHead(500, {
                        'Content-Type': 'application/json; charset=utf-8'
                    });
                }

                res.end(JSON.stringify({
                    error: 'Erro interno no servidor local.'
                }));
            });
    };


    if (req.method === 'POST') {

        let corpo = '';

        req.on(
            'data',
            parte => {

                corpo += parte;

                if (corpo.length > 1000000) {

                    req.destroy();
                }
            }
        );


        req.on(
            'end',
            () => {

                try {

                    req.body =
                        corpo
                            ? JSON.parse(corpo)
                            : {};

                } catch (erro) {

                    req.body = {};
                }

                executar();
            }
        );

        return;
    }


    req.body = {};

    executar();
}


function servirArquivo(req, res) {

    const url =
        decodeURIComponent(
            (req.url || '/').split('?')[0]
        );


    let caminho =
        path.normalize(
            path.join(
                RAIZ,
                url === '/' ? 'index.html' : url
            )
        );

    if (!caminho.startsWith(RAIZ)) {

        res.writeHead(403);
        res.end('Acesso negado.');

        return;
    }


    fs.stat(
        caminho,
        (erro, info) => {

            if (erro || !info.isFile()) {

                res.writeHead(404, {
                    'Content-Type': 'text/html; charset=utf-8'
                });

                res.end('<h1>404 - Arquivo não encontrado</h1>');

                return;
            }


            const tipo =
                TIPOS[path.extname(caminho).toLowerCase()] ||
                'application/octet-stream';


            res.writeHead(200, {
                'Content-Type': tipo,
                'Cache-Control': 'no-store'
            });


            fs.createReadStream(caminho).pipe(res);
        }
    );
}


const servidor =
    http.createServer((req, res) => {

        if (req.url.startsWith('/api/')) {

            if (API_LOCAL) {

                tratarApiLocal(req, res);

            } else {

                encaminharApi(req, res);
            }

            return;
        }

        servirArquivo(req, res);
    });


servidor.listen(
    PORTA,
    () => {

        console.log('');
        console.log('========================================');
        console.log('APP TRANSMITIR - MODO NAVEGADOR');
        console.log('========================================');
        console.log('');
        console.log(`Acesse: http://localhost:${PORTA}`);
        console.log(
            API_LOCAL
                ? 'API:    local (LiveKit configurado no .env)'
                : `API:    https://${BACKEND}/api (proxy)`
        );
        console.log('');
        console.log('Ctrl+C para encerrar.');
        console.log('');
    }
);
