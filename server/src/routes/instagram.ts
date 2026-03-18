import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

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

// Webhook for receiving Instagram messages (from Meta Graph API)
router.post('/webhook', async (req, res) => {
  try {
    const { entry } = req.body;

    // Verify webhook (for initial setup)
    if (req.query['hub.mode'] === 'subscribe') {
      if (req.query['hub.verify_token'] === process.env.INSTAGRAM_VERIFY_TOKEN) {
        return res.send(req.query['hub.challenge']);
      }
      return res.status(403).json({ error: 'Invalid verify token' });
    }

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

// Simple bot response generator
async function generateBotResponse(message: string, conversationId: string): Promise<string> {
  const lowerMessage = message.toLowerCase();

  // Check for product queries
  if (lowerMessage.includes('precio') || lowerMessage.includes('price') || lowerMessage.includes('cuanto') || lowerMessage.includes('how much')) {
    const products = await prisma.product.findMany({
      where: { status: 'ACTIVE' },
      take: 5,
    });

    if (products.length > 0) {
      const productList = products.map(p => 
        `• ${p.name}: $${parseFloat(p.price.toString()).toFixed(2)}`
      ).join('\n');

      return `¡Hola! Aquí están algunos de nuestros productos:\n\n${productList}\n\n¿Te interesa alguno en particular?`;
    }
  }

  // Check for stock queries
  if (lowerMessage.includes('stock') || lowerMessage.includes('disponible') || lowerMessage.includes('available')) {
    return '¡Claro! Permíteme verificar la disponibilidad. ¿Qué producto te interesa?';
  }

  // Check for order/buy intent
  if (lowerMessage.includes('comprar') || lowerMessage.includes('ordenar') || lowerMessage.includes('buy') || lowerMessage.includes('order')) {
    return '¡Excelente! Para realizar tu pedido, puedes visitar nuestra tienda en línea o te puedo ayudar a crear tu pedido aquí. ¿Qué producto te gustaría ordenar?';
  }

  // Check for greeting
  if (lowerMessage.includes('hola') || lowerMessage.includes('hi') || lowerMessage.includes('hello') || lowerMessage.includes('buenos')) {
    return '¡Hola! Bienvenido a HobbyZamora. 🎨 ¿En qué puedo ayudarte hoy? Tenemos una gran variedad de artículos para hobbies y manualidades.';
  }

  // Check for thanks
  if (lowerMessage.includes('gracias') || lowerMessage.includes('thanks') || lowerMessage.includes('thank you')) {
    return '¡De nada! Estoy aquí para ayudarte. Si tienes alguna otra pregunta, no dudes en escribirme. 😊';
  }

  // Default response
  return '¡Gracias por tu mensaje! Un momento mientras reviso tu consulta. Si prefieres hablar con alguien del equipo, solo dime "quiero hablar con un humano".';
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
