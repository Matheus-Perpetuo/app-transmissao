import { AccessToken } from 'livekit-server-sdk';

export default async function handler(req, res) {
  // Libera CORS para o frontend acessar a API
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { room, username } = req.query;

  if (!room || !username) {
    return res.status(400).json({ error: 'Parâmetros "room" e "username" são obrigatórios' });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return res.status(500).json({ error: 'Chaves de API não configuradas no ambiente' });
  }

  // Cria o token de permissão no LiveKit
  const at = new AccessToken(apiKey, apiSecret, {
    identity: username,
    ttl: '8h', // O token dura 8 horas
  });

  at.addGrant({
    roomJoin: true,
    room: room,
    canPublish: true,
    canSubscribe: true,
  });

  const token = await at.toJwt();
  return res.status(200).json({ token });
}