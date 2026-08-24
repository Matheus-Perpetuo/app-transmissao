import { AccessToken } from 'livekit-server-sdk';

export default async function handler(req, res) {
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

    // Lê as variáveis salvas no painel da Vercel
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret) {
      return res.status(500).json({ error: 'LIVEKIT_API_KEY ou LIVEKIT_API_SECRET não foram encontradas na Vercel.' });
    }

    // Cria o token de permissão com duração de 8h
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
    return res.status(500).json({ error: 'Erro interno na API: ' + err.message });
  }
}