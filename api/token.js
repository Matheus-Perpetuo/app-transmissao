const { AccessToken } = require('livekit-server-sdk');

module.exports = async function handler(req, res) {


    res.setHeader(
        'Access-Control-Allow-Origin',
        '*'
    );

    res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, OPTIONS'
    );

    res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization'
    );


    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }


    if (
        req.method !== 'GET' &&
        req.method !== 'POST'
    ) {

        return res.status(405).json({
            error: 'Método não permitido.'
        });
    }


    try {

        const room =
            req.query.room;

        const username =
            req.query.username;


        if (!room || !username) {

            return res.status(400).json({
                error:
                    'Parâmetros "room" e "username" são obrigatórios.'
            });
        }


        const SALA_PERMITIDA = 'summit';


        if (
            room
                .trim()
                .toLowerCase() !== SALA_PERMITIDA
        ) {

            return res.status(403).json({
                error:
                    'Sala não encontrada.'
            });
        }


        const apiKey =
            process.env.LIVEKIT_API_KEY;


        const apiSecret =
            process.env.LIVEKIT_API_SECRET;


        let wsUrl =
            process.env.LIVEKIT_URL || '';


        if (!apiKey || !apiSecret) {

            console.error(
                'LIVEKIT_API_KEY ou LIVEKIT_API_SECRET não configurado.'
            );

            return res.status(500).json({
                error:
                    'Chaves de API não encontradas nas variáveis de ambiente da Vercel.'
            });
        }


        if (
            wsUrl.startsWith(
                'https://'
            )
        ) {

            wsUrl =
                wsUrl.replace(
                    'https://',
                    'wss://'
                );
        }


        const at =
            new AccessToken(
                apiKey,
                apiSecret,
                {
                    identity:
                        username,

                    ttl:
                        '8h'
                }
            );


        at.addGrant({

            roomJoin:
                true,

            room:
                room,

            canPublish:
                true,

            canSubscribe:
                true
        });


        const token =
            await at.toJwt();


        return res.status(200).json({

            token,

            wsUrl
        });


    } catch (err) {

        console.error(
            'Erro interno na API Token:',
            err
        );


        return res.status(500).json({

            error:
                'Erro interno ao gerar token: ' +
                err.message
        });
    }
};