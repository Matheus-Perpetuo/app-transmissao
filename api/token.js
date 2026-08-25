const crypto = require('crypto');
const { AccessToken } = require('livekit-server-sdk');

module.exports = async function handler(req, res) {

    // ============================================================
    // CORS
    // ============================================================

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
        'Content-Type'
    );


    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }


    // ============================================================
    // MÉTODO
    // ============================================================

    if (
        req.method !== 'GET' &&
        req.method !== 'POST'
    ) {

        return res.status(405).json({
            error: 'Método não permitido.'
        });
    }


    try {

        // ========================================================
        // RECEBER DADOS
        // ========================================================

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


        // ========================================================
        // RECEBER TOKEN DE SESSÃO
        // ========================================================

        let sessionToken = null;


        // --------------------------------------------------------
        // GET
        // --------------------------------------------------------

        if (req.method === 'GET') {

            sessionToken =
                req.query.sessionToken || null;
        }


        // --------------------------------------------------------
        // POST
        // --------------------------------------------------------

        if (req.method === 'POST') {

            sessionToken =
                req.body?.sessionToken || null;
        }


        if (!sessionToken) {

            return res.status(401).json({
                error:
                    'Autenticação necessária.'
            });
        }


        // ========================================================
        // SECRET
        // ========================================================

        const authSecret =
            process.env.APP_AUTH_SECRET;


        if (!authSecret) {

            console.error(
                'APP_AUTH_SECRET não configurado.'
            );

            return res.status(500).json({
                error:
                    'Sistema de autenticação não configurado.'
            });
        }


        // ========================================================
        // DECODIFICAR SESSÃO
        // ========================================================

        let decodedSession;

        try {

            decodedSession =
                Buffer
                    .from(
                        sessionToken,
                        'base64'
                    )
                    .toString('utf8');

        } catch (error) {

            return res.status(401).json({
                error:
                    'Sessão inválida.'
            });
        }


        const parts =
            decodedSession.split('.');


        if (parts.length !== 3) {

            return res.status(401).json({
                error:
                    'Sessão inválida.'
            });
        }


        const [
            sessionCode,
            timestamp,
            receivedSignature
        ] = parts;


        // ========================================================
        // VALIDAR TIMESTAMP
        // ========================================================

        const sessionTime =
            Number(timestamp);


        if (!Number.isFinite(sessionTime)) {

            return res.status(401).json({
                error:
                    'Sessão inválida.'
            });
        }


        // ========================================================
        // EXPIRAÇÃO
        // ========================================================

        const SESSION_DURATION =
            8 * 60 * 60 * 1000;


        const sessionExpired =
            Date.now() - sessionTime >
            SESSION_DURATION;


        if (sessionExpired) {

            return res.status(401).json({
                error:
                    'Sessão expirada. Digite novamente seu código de acesso.'
            });
        }


        // ========================================================
        // VALIDAR ASSINATURA
        // ========================================================

        const sessionData =
            `${sessionCode}.${timestamp}`;


        const expectedSignature =
            crypto
                .createHmac(
                    'sha256',
                    authSecret
                )
                .update(sessionData)
                .digest('hex');


        const signaturesEqual =

            receivedSignature.length ===
                expectedSignature.length &&

            crypto.timingSafeEqual(
                Buffer.from(
                    receivedSignature
                ),
                Buffer.from(
                    expectedSignature
                )
            );


        if (!signaturesEqual) {

            return res.status(401).json({
                error:
                    'Sessão inválida.'
            });
        }


        // ========================================================
        // VALIDAR CÓDIGO DA SESSÃO
        // ========================================================

        const accessCodes =
            process.env.APP_ACCESS_CODES || '';


        const validCodes =
            accessCodes
                .split(',')
                .map(
                    item =>
                        item.trim().toUpperCase()
                )
                .filter(Boolean);


        if (
            !validCodes.includes(
                sessionCode.toUpperCase()
            )
        ) {

            return res.status(403).json({
                error:
                    'Código de acesso revogado.'
            });
        }


        // ========================================================
        // LIVEKIT
        // ========================================================

        const apiKey =
            process.env.LIVEKIT_API_KEY;


        const apiSecret =
            process.env.LIVEKIT_API_SECRET;


        let wsUrl =
            process.env.LIVEKIT_URL || '';


        if (!apiKey || !apiSecret) {

            return res.status(500).json({
                error:
                    'Chaves de API não encontradas nas variáveis de ambiente da Vercel.'
            });
        }


        // ========================================================
        // NORMALIZAR URL
        // ========================================================

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


        // ========================================================
        // GERAR TOKEN LIVEKIT
        // ========================================================

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


        // ========================================================
        // RESPOSTA
        // ========================================================

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