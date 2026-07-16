import { Router } from 'express';
import { createHmac } from 'crypto';
import { prisma } from '../index.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import { askProductAI } from '../lib/productAI.js';

const router = Router();

router.get('/feed', async (_req, res) => {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const username = process.env.INSTAGRAM_USERNAME || 'hobbyzamora';

  if (!token) {
    return res.json({ posts: [], username, source: 'placeholder' });
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=6&access_token=${token}`
    );
    const data = await response.json() as any;

    if (!response.ok || data.error) {
      return res.status(502).json({
        error: data?.error?.message || 'Failed to fetch Instagram feed',
      });
    }

    const posts = Array.isArray(data.data)
      ? data.data
          .filter((post: any) => typeof post?.permalink === 'string')
          .map((post: any) => ({
            id: post.id,
            imageUrl: post.media_type === 'VIDEO' ? post.thumbnail_url || post.media_url : post.media_url,
            link: post.permalink,
            caption: typeof post.caption === 'string' ? post.caption : '',
            timestamp: post.timestamp,
          }))
          .filter((post: any) => typeof post.imageUrl === 'string' && post.imageUrl.length > 0)
      : [];

    return res.json({ posts, username, source: 'instagram' });
  } catch (error) {
    console.error('Instagram feed error:', error);
    return res.status(500).json({ error: 'Failed to fetch Instagram feed' });
  }
});

// Health check — verifica conexión real con Meta Graph API
router.get('/health', authenticate, requireRole('ADMIN', 'STAFF'), async (_req, res) => {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const appId = process.env.INSTAGRAM_APP_ID;

  if (!token) {
    return res.json({ connected: false, error: 'INSTAGRAM_ACCESS_TOKEN no configurado' });
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${token}`
    );
    const data = await response.json() as any;

    if (data.error) {
      return res.json({
        connected: false,
        error: data.error.message,
        code: data.error.code,
      });
    }

    // También verificar token debug info
    const debugResponse = await fetch(
      `https://graph.facebook.com/v19.0/debug_token?input_token=${token}&access_token=${appId}|${process.env.INSTAGRAM_APP_SECRET}`
    );
    const debugData = await debugResponse.json() as any;
    const tokenInfo = debugData.data;

    return res.json({
      connected: true,
      pageId: data.id,
      pageName: data.name,
      tokenValid: tokenInfo?.is_valid ?? true,
      tokenExpires: tokenInfo?.expires_at ? new Date(tokenInfo.expires_at * 1000).toISOString() : 'never',
      scopes: tokenInfo?.scopes ?? [],
    });
  } catch (error: any) {
    return res.json({ connected: false, error: error.message });
  }
});

// Get all conversations
router.get('/conversations', authenticate, requireRole('ADMIN', 'STAFF'), async (req, res) => {
  try {
    const { status, search } = req.query;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { customerName: { contains: search as string } },
        { instagramUserId: { contains: search as string } },
      ];
    }

    const conversations = await prisma.instagramConversation.findMany({
      where,
      orderBy: [
        { lastMessageAt: 'desc' },
        { updatedAt: 'desc' },
      ],
    });

    res.json(conversations);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

// Get single conversation with messages
router.get('/conversations/:id', authenticate, requireRole('ADMIN', 'STAFF'), async (req, res) => {
  try {
    const id = req.params.id as string;
    const conversation = await prisma.instagramConversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json(conversation);
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Failed to get conversation' });
  }
});

// Send message (from agent)
router.post('/conversations/:id/messages', authenticate, requireRole('ADMIN', 'STAFF'), async (req: AuthRequest, res) => {
  try {
    const { content, productId } = req.body;
    const conversationId = req.params.id as string;

    const conversation = await prisma.instagramConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Create message
    const message = await prisma.instagramMessage.create({
      data: {
        conversationId,
        sender: 'AGENT',
        content,
        productId,
      },
    });

    // Update conversation timestamp
    await prisma.instagramConversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
      },
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Take over conversation (human agent)
router.post('/conversations/:id/takeover', authenticate, requireRole('ADMIN', 'STAFF'), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const conversation = await prisma.instagramConversation.update({
      where: { id },
      data: { isBot: false },
    });

    res.json(conversation);
  } catch (error) {
    console.error('Takeover error:', error);
    res.status(500).json({ error: 'Failed to take over conversation' });
  }
});

// Return to bot
router.post('/conversations/:id/return-to-bot', authenticate, requireRole('ADMIN', 'STAFF'), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const conversation = await prisma.instagramConversation.update({
      where: { id },
      data: { isBot: true },
    });

    res.json(conversation);
  } catch (error) {
    console.error('Return to bot error:', error);
    res.status(500).json({ error: 'Failed to return to bot' });
  }
});

// Update conversation status
router.patch('/conversations/:id/status', authenticate, requireRole('ADMIN', 'STAFF'), async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;
    const id = req.params.id as string;

    const conversation = await prisma.instagramConversation.update({
      where: { id },
      data: { status },
    });

    res.json(conversation);
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Webhook verification (GET) — Meta envía esto al configurar el webhook
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.INSTAGRAM_VERIFY_TOKEN) {
    console.log('Webhook verified by Meta');
    return res.status(200).send(challenge);
  }
  return res.status(403).json({ error: 'Invalid verify token' });
});

// Webhook for receiving Instagram messages (from Meta Graph API)
router.post('/webhook', async (req, res) => {
  try {
    // Verificar firma X-Hub-Signature-256 enviada por Meta
    const appSecret = process.env.INSTAGRAM_APP_SECRET;
    if (appSecret) {
      const signature = req.headers['x-hub-signature-256'] as string | undefined;
      if (!signature) {
        return res.status(403).json({ error: 'Missing signature' });
      }
      const expected = 'sha256=' + createHmac('sha256', appSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');
      if (signature !== expected) {
        return res.status(403).json({ error: 'Invalid signature' });
      }
    }

    const { entry } = req.body;

    // Process incoming messages
    for (const e of entry || []) {
      const messaging = e.messaging || [];
      
      for (const message of messaging) {
        const senderId = message.sender.id;
        const text = message.message?.text;

        if (!text) continue;

        // Find or create conversation
        let conversation = await prisma.instagramConversation.findFirst({
          where: { instagramUserId: senderId },
        });

        if (!conversation) {
          conversation = await prisma.instagramConversation.create({
            data: {
              instagramUserId: senderId,
              customerName: `Instagram User ${senderId.substring(0, 8)}`,
              status: 'ACTIVE',
              lastMessageAt: new Date(),
            },
          });
        } else {
          await prisma.instagramConversation.update({
            where: { id: conversation.id },
            data: {
              lastMessageAt: new Date(),
            },
          });
        }

        // Save message
        await prisma.instagramMessage.create({
          data: {
            conversationId: conversation.id,
            sender: 'CUSTOMER',
            content: text,
          },
        });

        // If bot is active, generate bot response
        if (conversation.isBot) {
          const botResponse = await generateBotResponse(text, conversation.id);
          
          // Save bot response
          await prisma.instagramMessage.create({
            data: {
              conversationId: conversation.id,
              sender: 'BOT',
              content: botResponse,
            },
          });
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

// Bot response generator usando OpenAI a través del módulo compartido
async function generateBotResponse(message: string, conversationId: string): Promise<string> {
  // Recuperar historial reciente de la conversación para dar contexto a la IA
  const recentMessages = await prisma.instagramMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: 10,
    select: { sender: true, content: true },
  });

  const history = recentMessages
    .filter((m) => m.sender !== 'BOT' || recentMessages.indexOf(m) > 0)
    .map((m) => ({
      role: (m.sender === 'CUSTOMER' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content,
    }));

  try {
    return await askProductAI(message, history);
  } catch (error) {
    console.error('Instagram bot AI error:', error);
    return '¡Hola! Recibí tu mensaje. Un momento mientras reviso tu consulta sobre nuestros productos. 🎨';
  }
}

// Get agent stats
router.get('/stats', authenticate, requireRole('ADMIN', 'STAFF'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [activeConversations, pendingConversations, todayConversations, totalMessages] = await Promise.all([
      prisma.instagramConversation.count({
        where: { status: 'ACTIVE' },
      }),
      prisma.instagramConversation.count({
        where: { status: 'PENDING' },
      }),
      prisma.instagramConversation.count({
        where: { createdAt: { gte: today } },
      }),
      prisma.instagramMessage.count({
        where: { createdAt: { gte: today } },
      }),
    ]);

    // Calculate conversion rate (conversations that led to orders)
    const conversationsWithOrders = await prisma.order.count({
      where: {
        source: 'INSTAGRAM',
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
      },
    });

    const totalConversations30Days = await prisma.instagramConversation.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });

    const conversionRate = totalConversations30Days > 0 
      ? Math.round((conversationsWithOrders / totalConversations30Days) * 100)
      : 0;

    res.json({
      activeConversations,
      pendingConversations,
      todayConversations,
      todayMessages: totalMessages,
      conversionRate,
      avgResponseTime: '~2s', // Placeholder - would need actual timing tracking
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Create order from Instagram conversation
router.post('/conversations/:id/create-order', authenticate, requireRole('ADMIN', 'STAFF'), async (req: AuthRequest, res) => {
  try {
    const { items, shippingAddress } = req.body;
    const conversationId = req.params.id as string;

    const conversation = await prisma.instagramConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // This would typically redirect to the order creation flow
    // For now, return the data needed to create the order
    res.json({
      customerName: conversation.customerName,
      source: 'INSTAGRAM',
      items,
      shippingAddress,
      message: 'Order data prepared. Use /api/orders to complete the order.',
    });
  } catch (error) {
    console.error('Create order from conversation error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

export default router;
