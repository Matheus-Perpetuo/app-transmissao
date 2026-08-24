const { AccessToken } = require('livekit-server-sdk');

module.exports = async function handler(req, res) {
  // Configuração de cabeçalhos CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { room, username } = req.query;

    if (!room || !username) {
      return res.status(400).json({ error: 'Parâmetros "room" e "username" são obrigatórios' });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    let wsUrl = process.env.LIVEKIT_URL || '';

    // Validação das chaves na Vercel
    if (!apiKey || !apiSecret) {
      return res.status(500).json({ 
        error: 'Chaves de API não encontradas nas variáveis de ambiente da Vercel.' 
      });
    }

    // Garante que a URL comece com wss://
    if (wsUrl.startsWith('https://')) {
      wsUrl = wsUrl.replace('https://', 'wss://');
    }

    // Gera o token de acesso
    const at = new AccessToken(apiKey, apiSecret, {
      identity: username,
      ttl: '8h',
    });

    at.addGrant({
      roomJoin: true,
      room: room,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();
    return res.status(200).json({ token, wsUrl });

  } catch (err) {
    console.error('Erro interno na API Token:', err);
    return res.status(500).json({ error: 'Erro interno ao gerar token: ' + err.message });
  }
};