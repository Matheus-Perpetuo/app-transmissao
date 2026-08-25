const crypto = require('crypto');

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
        'POST, OPTIONS'
    );

    res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type'
    );


    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }


    if (req.method !== 'POST') {
        return res.status(405).json({
            error: 'Método não permitido.'
        });
    }


    try {

        // ========================================================
        // RECEBER CÓDIGO
        // ========================================================

        const { code } =
            req.body || {};


        if (!code) {

            return res.status(400).json({
                error: 'Código de acesso não informado.'
            });
        }


        // ========================================================
        // CÓDIGOS AUTORIZADOS
        // ========================================================

        const accessCodes =
            process.env.APP_ACCESS_CODES || '';


        const validCodes =
            accessCodes
                .split(',')
                .map(item => item.trim())
                .filter(Boolean);


        const normalizedCode =
            code
                .trim()
                .toUpperCase();


        const authorized =
            validCodes.includes(
                normalizedCode
            );


        // ========================================================
        // CÓDIGO INVÁLIDO
        // ========================================================

        if (!authorized) {

            return res.status(403).json({
                error: 'Código de acesso inválido.'
            });
        }


        // ========================================================
        // SECRET DA AUTENTICAÇÃO
        // ========================================================

        const authSecret =
            process.env.APP_AUTH_SECRET;


        if (!authSecret) {

            console.error(
                'APP_AUTH_SECRET não configurado.'
            );

            return res.status(500).json({
                error: 'Sistema de autenticação não configurado.'
            });
        }


        // ========================================================
        // CRIAR SESSÃO
        // ========================================================

        const timestamp =
            Date.now().toString();


        const sessionData =
            `${normalizedCode}.${timestamp}`;


        const signature =
            crypto
                .createHmac(
                    'sha256',
                    authSecret
                )
                .update(sessionData)
                .digest('hex');


        const sessionToken =
            Buffer
                .from(
                    `${sessionData}.${signature}`
                )
                .toString('base64');


        // ========================================================
        // RESPOSTA
        // ========================================================

        return res.status(200).json({

            authorized: true,

            sessionToken

        });


    } catch (error) {

        console.error(
            'Erro na autenticação:',
            error
        );


        return res.status(500).json({
            error:
                'Erro interno ao verificar o código.'
        });
    }
};