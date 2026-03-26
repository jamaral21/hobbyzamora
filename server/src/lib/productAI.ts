/**
 * productAI.ts
 * Módulo compartido para responder consultas sobre productos usando OpenAI.
 * Usado tanto por el chat del sitio como por el bot de Instagram.
 */

import OpenAI from 'openai';
import { prisma } from '../index.js';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY no está configurada');
    }
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

/**
 * Carga los productos activos desde la BD y los serializa para el system prompt.
 * Solo incluye campos relevantes para minimizar tokens.
 */
async function buildProductContext(): Promise<string> {
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      category: true,
      description: true,
      price: true,
      stock: true,
      isPresale: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 200, // límite de seguridad para evitar contextos enormes
  });

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  return products
    .map((p) => {
      const url = `${frontendUrl}/store/product/${p.id}`;
      const stock = p.stock > 0 ? `${p.stock} en stock` : 'sin stock';
      const presale = p.isPresale ? ' [PREVENTA]' : '';
      const desc = p.description ? ` - ${p.description.substring(0, 120)}` : '';
      return `• ${p.name}${presale} | Categoría: ${p.category} | Precio: $${parseFloat(p.price.toString()).toFixed(2)} | ${stock}${desc} | URL: ${url}`;
    })
    .join('\n');
}

function buildSystemPrompt(productList: string): string {
  return `Eres el asistente virtual de HobbyZamora, una tienda especializada en artículos para hobbies y manualidades. Tu única función es ayudar a los clientes a encontrar productos en el catálogo y motivarlos a comprar.

REGLAS ESTRICTAS:
1. SOLO responde preguntas relacionadas con los productos de HobbyZamora (precios, disponibilidad, descripción, recomendaciones de compra).
2. Si alguien pregunta algo que NO esté relacionado con los productos (política, chistes, código, temas personales, etc.), responde amablemente: "Solo puedo ayudarte con preguntas sobre nuestros productos. ¿Te interesa conocer alguno?"
3. Cuando menciones un producto, SIEMPRE incluye su URL para que el cliente pueda verlo y comprarlo.
4. Incentiva la compra con entusiasmo, pero sin presionar.
5. Si un producto no tiene stock, menciónalo y sugiere alternativas similares del catálogo.
6. Responde siempre en el idioma en que te escriban (español por defecto).
7. Sé conciso y amigable. Máximo 3-4 oraciones por respuesta.

CATÁLOGO ACTUAL DE PRODUCTOS:
${productList}

Si el cliente pregunta por algo que no está en el catálogo, díselo con honestidad y ofrece las opciones más cercanas.`;
}

/**
 * Genera una respuesta de IA basada en el catálogo de productos.
 * @param userMessage Mensaje del usuario
 * @param history Historial de conversación (opcional, para mantener contexto)
 */
export async function askProductAI(
  userMessage: string,
  history: ChatMessage[] = []
): Promise<string> {
  const openai = getOpenAI();
  const productList = await buildProductContext();
  const systemPrompt = buildSystemPrompt(productList);

  // Limitar historial a últimos 10 turnos para controlar tokens
  const recentHistory = history.slice(-10);

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...recentHistory.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: userMessage },
  ];

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    max_tokens: 400,
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content ?? 'Lo siento, no pude procesar tu consulta. Intenta de nuevo.';
}
