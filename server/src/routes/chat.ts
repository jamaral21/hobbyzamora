import { Router } from 'express';
import { askProductAI, ChatMessage } from '../lib/productAI.js';

const router = Router();

/**
 * POST /api/chat/message
 * Endpoint público para el chat del sitio.
 * Acepta el mensaje del usuario y un historial de conversación opcional.
 * Solo responde preguntas relacionadas con productos.
 */
router.post('/message', async (req, res) => {
  try {
    const { message, history } = req.body as {
      message: string;
      history?: ChatMessage[];
    };

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'El campo message es requerido' });
    }

    if (message.trim().length > 500) {
      return res.status(400).json({ error: 'El mensaje no puede superar los 500 caracteres' });
    }

    const sanitizedHistory = Array.isArray(history)
      ? history
          .filter(
            (m) =>
              m &&
              (m.role === 'user' || m.role === 'assistant') &&
              typeof m.content === 'string'
          )
          .slice(-10) // máximo 10 mensajes de historial
      : [];

    const reply = await askProductAI(message.trim(), sanitizedHistory);

    res.json({ reply });
  } catch (error: any) {
    console.error('Chat error:', error?.message || error);

    if (error?.message?.includes('OPENAI_API_KEY')) {
      return res.status(503).json({ error: 'El servicio de chat no está configurado' });
    }

    res.status(500).json({ error: 'Error al procesar tu consulta. Intenta de nuevo.' });
  }
});

export default router;
