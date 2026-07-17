import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { StoreLayout } from '../../components/layout/StoreLayout';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSection {
  title: string;
  items: FAQItem[];
}

const FAQ_DATA: FAQSection[] = [
  {
    title: 'Sobre los envíos',
    items: [
      {
        question: '¿Qué días realizan envíos?',
        answer: 'Los envíos se realizan los días lunes/martes y viernes/sábado (uno de los dos días, según corresponda). Si algún envío se realiza en otra fecha, se avisará a través de las historias de Instagram.',
      },
    ],
  },
  {
    title: 'Sobre los productos',
    items: [
      {
        question: '¿Los productos son originales?',
        answer: 'Sí, todos nuestros productos son 100% originales, en su mayoría importados directamente de Japón, aunque también trabajamos con otros países.',
      },
      {
        question: '¿Todo lo publicado está disponible?',
        answer: 'Sí, todo lo que se publica en el catálogo está en stock.',
      },
      {
        question: '¿Aceptan pedidos especiales de productos que no están en el catálogo?',
        answer: 'Sí, aceptamos pedidos especiales bajo ciertas condiciones (como un monto mínimo de compra). Contáctanos para coordinar los detalles de tu pedido.',
      },
    ],
  },
  {
    title: 'Preventas',
    items: [
      {
        question: '¿Cómo puedo acceder a las preventas?',
        answer: '1. Debes crear una cuenta en hobbyzamora.cl con tu cuenta de Google.\n2. Ingresa a la sección "Preventas" y selecciona los productos que quieras reservar.',
      },
      {
        question: '¿Cuáles son las condiciones de las preventas?',
        answer: '1. Se permite reservar un producto por cuenta.\n2. Los productos se pagan cuando llegan a Chile. En caso de requerir un abono, se avisará en la descripción de cada producto.\n3. Cuando el producto llegue a Chile, se enviará un correo con el link para realizar el pago (la compra se debe hacer en la web). Ese link tiene una vigencia de 24 horas.\n4. Si no se realiza la compra dentro de las 24 horas, el link caducará y la preventa quedará cancelada.',
      },
      {
        question: '¿Puedo cancelar una preventa?',
        answer: 'Sí, puedes cancelar una preventa enviando un mensaje por Instagram a @hobbyzamora, indicando el nombre de tu cuenta y la preventa a cancelar. Esta cancelación se puede realizar antes de que se envíe el correo de pago.',
      },
      {
        question: '¿Qué pasa si no hago efectiva una preventa?',
        answer: 'Si no concretas una preventa realizada y tampoco la cancelaste a tiempo, hobbyzamora se reserva el derecho de bloquear tu cuenta para acceder a nuevas preventas.',
      },
    ],
  },
  {
    title: 'Envíos y tiempos',
    items: [
      {
        question: '¿Cuánto demora en llegar mi pedido?',
        answer: 'En caso de ser un encargo, el tiempo estimado desde la confirmación del pedido hasta la llegada a Chile es de 2 a 4 semanas.',
      },
      {
        question: '¿Hacen envíos fuera de Chile?',
        answer: 'Por el momento solo realizamos envíos dentro de Chile.',
      },
      {
        question: '¿Puedo hacer seguimiento de mi pedido?',
        answer: 'Sí, todos los pedidos incluyen número de seguimiento.',
      },
    ],
  },
  {
    title: 'Pagos',
    items: [
      {
        question: '¿Qué métodos de pago aceptan?',
        answer: 'Aceptamos transferencia bancaria, Webpay/tarjetas, y pago en efectivo para entregas presenciales.',
      },
      {
        question: '¿El precio incluye el envío?',
        answer: 'El precio publicado es el precio final del producto. El envío se realiza por Starken y se paga al momento de recibirlo en tu domicilio o sucursal. Al hacer tu compra, recuerda indicar claramente el destino de tu pedido :D',
      },
    ],
  },
  {
    title: 'Devoluciones y garantías',
    items: [
      {
        question: '¿Puedo cambiar o devolver un producto?',
        answer: 'Las devoluciones o cambios solo aplican si el producto llega defectuoso o dañado.',
      },
      {
        question: '¿Qué pasa si mi producto llega dañado o con defecto de fábrica?',
        answer: 'Cada caso se evalúa de forma individual para encontrar la mejor solución (reposición, reembolso u otra alternativa según corresponda).',
      },
    ],
  },
  {
    title: 'Sobre hobbyzamora',
    items: [
      {
        question: '¿Cómo puedo comprar?',
        answer: 'Operamos de forma online a través de nuestras redes/web, y también coordinamos entregas presenciales según disponibilidad y ubicación.',
      },
      {
        question: '¿Hacen entregas presenciales?',
        answer: 'Sí, realizamos entregas presenciales en Santiago (días de semana) y en Valparaíso/Viña del Mar (fines de semana):\n\n• Santiago: se puede coordinar retiro en Metro Santa Isabel, los días martes en los torneos de Beyblade en Metro El Llano (Comunidad Tío Mechanic), o dejar el pedido en conserjería para su retiro.\n• Valparaíso/Viña del Mar: se coordina entrega de viernes a domingo, o se puede retirar en los torneos de la comunidad KND de Beyblade.',
      },
    ],
  },
];

function AccordionItem({ item }: { item: FAQItem }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4 text-left group"
      >
        <span className="text-foreground font-medium pr-4">{item.question}</span>
        <ChevronDown
          className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="pb-4 text-muted-foreground text-sm whitespace-pre-line leading-relaxed">
          {item.answer}
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <StoreLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-primary mb-3">PREGUNTAS FRECUENTES</h1>
          <p className="text-muted-foreground">
            Todo lo que necesitas saber sobre HobbyZamora
          </p>
        </div>

        <div className="space-y-8">
          {FAQ_DATA.map((section) => (
            <div key={section.title}>
              <h2 className="text-lg font-semibold text-foreground mb-4">{section.title}</h2>
              <div className="bg-card rounded-xl border border-border divide-y divide-border px-6">
                {section.items.map((item) => (
                  <AccordionItem key={item.question} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground text-sm mb-3">¿Tienes otra pregunta?</p>
          <a
            href="https://www.instagram.com/hobbyzamora"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline text-sm font-medium"
          >
            Escríbenos por Instagram →
          </a>
        </div>
      </div>
    </StoreLayout>
  );
}
