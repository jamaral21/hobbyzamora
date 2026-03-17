import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@hobbyzamora.com' },
    update: {},
    create: {
      email: 'admin@hobbyzamora.com',
      password: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Create staff user
  const staffPassword = await bcrypt.hash('staff123', 10);
  const staff = await prisma.user.upsert({
    where: { email: 'staff@hobbyzamora.com' },
    update: {},
    create: {
      email: 'staff@hobbyzamora.com',
      password: staffPassword,
      name: 'Staff User',
      role: 'STAFF',
    },
  });
  console.log('✅ Staff user created:', staff.email);

  // Create test customer
  const customerPassword = await bcrypt.hash('customer123', 10);
  const customer = await prisma.user.upsert({
    where: { email: 'customer@test.com' },
    update: {},
    create: {
      email: 'customer@test.com',
      password: customerPassword,
      name: 'Sarah Johnson',
      phone: '+1 (555) 123-4567',
      role: 'CUSTOMER',
    },
  });
  console.log('✅ Customer user created:', customer.email);

  // Create products (images stored as JSON string)
  const products = [
    {
      sku: 'HBZ-001',
      name: 'Booster Box Scarlet & Violet 151',
      category: 'Booster Boxes',
      price: 144.99,
      cost: 90.00,
      images: JSON.stringify(['https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800']),
      description: 'Caja sellada de 36 sobres de la expansión Scarlet & Violet 151. Incluye cartas de los 151 Pokémon originales de Kanto.',
      status: 'ACTIVE',
    },
    {
      sku: 'HBZ-002',
      name: 'Elite Trainer Box Obsidian Flames',
      category: 'Elite Trainer Boxes',
      price: 54.99,
      cost: 32.00,
      images: JSON.stringify(['https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800']),
      description: 'ETB con 9 sobres, 65 protectores de cartas, 45 cartas de energía, dados, marcadores y más.',
      status: 'ACTIVE',
    },
    {
      sku: 'HBZ-003',
      name: 'Ultra Premium Collection Charizard',
      category: 'Colecciones Premium',
      price: 149.99,
      cost: 85.00,
      images: JSON.stringify(['https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800']),
      description: 'Colección ultra premium con Charizard en metal, 16 sobres, carta promo exclusiva y accesorios de lujo.',
      status: 'ACTIVE',
    },
    {
      sku: 'HBZ-004',
      name: 'Booster Box Prismatic Evolutions',
      category: 'Booster Boxes',
      price: 179.99,
      cost: 110.00,
      images: JSON.stringify(['https://images.unsplash.com/photo-1452509133926-2b180c6d6245?w=800']),
      description: 'Caja sellada de 36 sobres de Prismatic Evolutions. ¡Incluye las Eeveeluciones en arte especial!',
      status: 'ACTIVE',
      isPresale: true,
      presaleMaxQty: 2,
      presaleAvailQty: 15,
      presaleEndDate: new Date('2026-04-15'),
    },
    {
      sku: 'HBZ-005',
      name: 'Sobre Suelto Paldea Evolved',
      category: 'Sobres Sueltos',
      price: 5.99,
      cost: 3.00,
      images: JSON.stringify(['https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800']),
      description: 'Sobre individual de 10 cartas de la expansión Paldea Evolved. Posibilidad de cartas holo, V y VMAX.',
      status: 'ACTIVE',
    },
    {
      sku: 'HBZ-006',
      name: 'Tin Metálica Pikachu ex',
      category: 'Tins y Latas',
      price: 29.99,
      cost: 16.00,
      images: JSON.stringify(['https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800']),
      description: 'Lata coleccionable con Pikachu ex promo, 4 sobres de expansiones recientes y carta de código online.',
      status: 'ACTIVE',
    },
  ];

  for (const productData of products) {
    const initialStock = productData.sku === 'HBZ-004' ? 3 : 
                         productData.sku === 'HBZ-002' ? 8 : 
                         productData.sku === 'HBZ-003' ? 12 :
                         productData.sku === 'HBZ-005' ? 67 :
                         productData.sku === 'HBZ-006' ? 28 : 45;

    const product = await prisma.product.upsert({
      where: { sku: productData.sku },
      update: {},
      create: {
        ...productData,
        stock: initialStock,
      },
    });

    console.log(`✅ Product created: ${product.name} (Stock: ${initialStock})`);
  }

  // Add variants to Booster Box
  const boosterBox = await prisma.product.findUnique({
    where: { sku: 'HBZ-001' },
  });

  if (boosterBox) {
    await prisma.productVariant.createMany({
      data: [
        { productId: boosterBox.id, name: 'Idioma', options: JSON.stringify(['Español']), stock: 15, price: 144.99 },
        { productId: boosterBox.id, name: 'Idioma', options: JSON.stringify(['Inglés']), stock: 20, price: 154.99 },
        { productId: boosterBox.id, name: 'Idioma', options: JSON.stringify(['Japonés']), stock: 10, price: 89.99 },
      ],
      
    });
    console.log('✅ Variants added to Booster Box Scarlet & Violet 151');
  }

  // Create sample Instagram conversations
  const conversations = [
    {
      instagramUserId: 'ig_jessmart',
      customerName: 'Jessica Martinez',
      profilePicUrl: 'https://randomuser.me/api/portraits/women/1.jpg',
      status: 'ACTIVE',
      isBot: true,
    },
    {
      instagramUserId: 'ig_davidlee',
      customerName: 'David Lee',
      profilePicUrl: 'https://randomuser.me/api/portraits/men/2.jpg',
      status: 'RESOLVED',
      isBot: false,
    },
    {
      instagramUserId: 'ig_sophiepaints',
      customerName: 'Sophie Turner',
      profilePicUrl: 'https://randomuser.me/api/portraits/women/3.jpg',
      status: 'PENDING',
      isBot: true,
    },
  ];

  for (const convData of conversations) {
    const conv = await prisma.instagramConversation.upsert({
      where: { instagramUserId: convData.instagramUserId },
      update: {},
      create: convData,
    });

    // Add sample messages
    await prisma.instagramMessage.createMany({
      data: [
        {
          conversationId: conv.id,
          sender: 'CUSTOMER',
          content: 'Hi! I am interested in your products',
        },
        {
          conversationId: conv.id,
          sender: 'BOT',
          content: '¡Hola! Bienvenido a HobbyZamora. ¿En qué te puedo ayudar?',
        },
      ],
    });
    console.log(`✅ Conversation created: ${convData.customerName}`);
  }

  // Create sample orders
  const booster = await prisma.product.findUnique({ where: { sku: 'HBZ-001' } });
  const etb = await prisma.product.findUnique({ where: { sku: 'HBZ-002' } });

  if (booster && etb) {
    const order = await prisma.order.create({
      data: {
        orderNumber: 'HBZ-2026-0001',
        userId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        shippingStreet: '123 Main St',
        shippingCity: 'New York',
        shippingState: 'NY',
        shippingZip: '10001',
        shippingCountry: 'United States',
        subtotal: 199.98,
        tax: 17.50,
        shipping: 5.99,
        total: 223.47,
        status: 'DELIVERED',
        source: 'ONLINE',
        items: {
          create: [
            {
              productId: booster.id,
              name: booster.name,
              sku: booster.sku,
              price: 144.99,
              cost: 90.00,
              quantity: 1,
            },
            {
              productId: etb.id,
              name: etb.name,
              sku: etb.sku,
              price: 54.99,
              cost: 32.00,
              quantity: 1,
            },
          ],
        },
        payments: {
          create: {
            method: 'CARD',
            status: 'APPROVED',
            amount: 223.47,
            cardLast4: '4242',
            cardBrand: 'Visa',
            paidAt: new Date(),
          },
        },
      },
    });
    console.log(`✅ Sample order created: ${order.orderNumber}`);
  }

  // Create daily stats for the last 10 days
  const today = new Date();
  for (let i = 9; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    await prisma.dailyStat.upsert({
      where: { date },
      update: {},
      create: {
        date,
        orders: Math.floor(Math.random() * 20) + 5,
        revenue: Math.random() * 2000 + 500,
        profit: Math.random() * 800 + 200,
        customers: Math.floor(Math.random() * 15) + 3,
        avgOrderValue: Math.random() * 100 + 50,
      },
    });
  }
  console.log('✅ Daily stats created for last 10 days');

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
