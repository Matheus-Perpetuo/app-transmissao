module.exports = async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({
            error: 'Método não permitido.'
        });
    }

    try {
        const { code } = req.body || {};

        if (!code) {
            return res.status(400).json({
                error: 'Código de acesso não informado.'
            });
        }

        const accessCodes = process.env.APP_ACCESS_CODES || '';

        const validCodes = accessCodes
            .split(',')
            .map(item => item.trim())
            .filter(Boolean);

        const normalizedCode = code
            .trim()
            .toUpperCase();

        const authorized = validCodes.includes(normalizedCode);

        if (!authorized) {
            return res.status(403).json({
                error: 'Código de acesso inválido.'
            });
        }

        return res.status(200).json({
            authorized: true
        });

    } catch (error) {
        console.error('Erro na autenticação:', error);

        return res.status(500).json({
            error: 'Erro interno ao verificar o código.'
        });
    }
};