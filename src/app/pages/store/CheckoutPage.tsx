import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { StoreLayout } from '../../components/layout/StoreLayout';
import { CheckoutSummary } from '../../components/store/CheckoutSummary';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import { Input, Select } from '../../components/design-system/Input';
import { Button } from '../../components/design-system/Button';
import { CreditCard, Lock, Loader2, MapPin, ShieldCheck, ChevronRight, AlertCircle, Wallet, Landmark, Package, Truck, Users, Check } from 'lucide-react';
import { useCartStore } from '../../lib/store';
import { ordersAPI, paymentsAPI, addressesAPI, type Address } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { RequireAuth } from '../../components/auth/RequireAuth';

type PaymentMethodType = NonNullable<Parameters<typeof paymentsAPI.checkout>[1]>;

type DeliveryMethod =
  | 'starken-domicilio'
  | 'starken-sucursal'
  | 'pickup-santiago'
  | 'pickup-valparaiso';

const DELIVERY_OPTIONS: Array<{
  id: DeliveryMethod;
  label: string;
  description: string;
  detail: string;
  icon: React.ReactNode;
  needsAddress: boolean;
}> = [
  {
    id: 'starken-domicilio',
    label: 'Starken – Envío a domicilio',
    description: 'Despacho a tu dirección vía Starken',
    detail: 'El costo de envío se coordina manualmente. Te contactaremos para confirmar.',
    icon: <Truck className="w-5 h-5" />,
    needsAddress: true,
  },
  {
    id: 'starken-sucursal',
    label: 'Starken – Retiro en sucursal',
    description: 'Retiras en la sucursal Starken de tu ciudad',
    detail: 'Indica tu ciudad y te coordinaremos el despacho a la sucursal más cercana.',
    icon: <Package className="w-5 h-5" />,
    needsAddress: false,
  },
  {
    id: 'pickup-santiago',
    label: 'Retiro presencial – Santiago',
    description: 'Martes 20:00 hrs · Torneos Tío Mechanic',
    detail: 'Llano Subercaseaux 3509, San Miguel, RM (Comic Pepe Antártico)',
    icon: <Users className="w-5 h-5" />,
    needsAddress: false,
  },
  {
    id: 'pickup-valparaiso',
    label: 'Retiro presencial – Valparaíso',
    description: 'Fines de semana · A coordinar',
    detail: 'Te contactaremos para acordar día, hora y punto de encuentro.',
    icon: <Users className="w-5 h-5" />,
    needsAddress: false,
  },
];

type CountryIdentityConfig = {
  country: string;
  isoCode: string;
  dialCode: string;
  documentLabel: string;
  placeholder: string;
};

type PostalCodeConfig = {
  label: string;
  placeholder: string;
};

type RegionConfig = {
  label: string;
  placeholder: string;
};

const DEFAULT_POSTAL_CODE: PostalCodeConfig = {
  label: 'Código postal',
  placeholder: 'Ej: 10001',
};

const POSTAL_CODE_BY_COUNTRY: Record<string, PostalCodeConfig> = {
  Chile: { label: 'Código postal', placeholder: 'Ej: 8320000' },
  'Estados Unidos': { label: 'ZIP Code', placeholder: 'Ej: 10001' },
  Canadá: { label: 'Postal Code', placeholder: 'Ej: K1A 0B1' },
  Brasil: { label: 'CEP', placeholder: 'Ej: 01001-000' },
  Argentina: { label: 'Código postal', placeholder: 'Ej: C1000' },
  México: { label: 'Código postal', placeholder: 'Ej: 03100' },
  Colombia: { label: 'Código postal', placeholder: 'Ej: 110111' },
  Perú: { label: 'Código postal', placeholder: 'Ej: 15001' },
  Uruguay: { label: 'Código postal', placeholder: 'Ej: 11000' },
  Paraguay: { label: 'Código postal', placeholder: 'Ej: 1209' },
  Bolivia: { label: 'Código postal', placeholder: 'Ej: 0000' },
  Ecuador: { label: 'Código postal', placeholder: 'Ej: 170150' },
  Venezuela: { label: 'Código postal', placeholder: 'Ej: 1010' },
  Panamá: { label: 'Código postal', placeholder: 'Ej: 0801' },
  'Costa Rica': { label: 'Código postal', placeholder: 'Ej: 10101' },
  'República Dominicana': { label: 'Código postal', placeholder: 'Ej: 10101' },
  Guatemala: { label: 'Código postal', placeholder: 'Ej: 01001' },
  'El Salvador': { label: 'Código postal', placeholder: 'Ej: 1101' },
  Honduras: { label: 'Código postal', placeholder: 'Ej: 11101' },
  Nicaragua: { label: 'Código postal', placeholder: 'Ej: 11001' },
};

const DEFAULT_REGION: RegionConfig = {
  label: 'Región',
  placeholder: 'Ej: Región Metropolitana',
};

const REGION_BY_COUNTRY: Record<string, RegionConfig> = {
  Chile: { label: 'Región', placeholder: 'Ej: Región Metropolitana' },
  'Estados Unidos': { label: 'Estado', placeholder: 'Ej: California' },
  México: { label: 'Estado', placeholder: 'Ej: Jalisco' },
  Argentina: { label: 'Provincia', placeholder: 'Ej: Buenos Aires' },
  Canadá: { label: 'Provincia/Territorio', placeholder: 'Ej: Ontario' },
  Brasil: { label: 'Estado', placeholder: 'Ej: São Paulo' },
  Colombia: { label: 'Departamento', placeholder: 'Ej: Antioquia' },
  Perú: { label: 'Departamento', placeholder: 'Ej: Lima' },
  Bolivia: { label: 'Departamento', placeholder: 'Ej: La Paz' },
  Ecuador: { label: 'Provincia', placeholder: 'Ej: Pichincha' },
  Venezuela: { label: 'Estado', placeholder: 'Ej: Miranda' },
  Uruguay: { label: 'Departamento', placeholder: 'Ej: Montevideo' },
  Paraguay: { label: 'Departamento', placeholder: 'Ej: Central' },
  Panamá: { label: 'Provincia', placeholder: 'Ej: Panamá' },
  'Costa Rica': { label: 'Provincia', placeholder: 'Ej: San José' },
  'República Dominicana': { label: 'Provincia', placeholder: 'Ej: Santo Domingo' },
  Guatemala: { label: 'Departamento', placeholder: 'Ej: Guatemala' },
  'El Salvador': { label: 'Departamento', placeholder: 'Ej: San Salvador' },
  Honduras: { label: 'Departamento', placeholder: 'Ej: Cortés' },
  Nicaragua: { label: 'Departamento', placeholder: 'Ej: Managua' },
};

const AMERICA_COUNTRIES: CountryIdentityConfig[] = [
  { country: 'Antigua y Barbuda', isoCode: 'AG', dialCode: '+1-268', documentLabel: 'NIN', placeholder: 'Número de identificación' },
  { country: 'Argentina', isoCode: 'AR', dialCode: '+54', documentLabel: 'DNI', placeholder: '12.345.678' },
  { country: 'Bahamas', isoCode: 'BS', dialCode: '+1-242', documentLabel: 'NIN', placeholder: 'Número de identificación' },
  { country: 'Barbados', isoCode: 'BB', dialCode: '+1-246', documentLabel: 'NID', placeholder: 'Número de identificación' },
  { country: 'Belice', isoCode: 'BZ', dialCode: '+501', documentLabel: 'TIN', placeholder: 'Número de identificación' },
  { country: 'Bolivia', isoCode: 'BO', dialCode: '+591', documentLabel: 'CI/NIT', placeholder: '1234567' },
  { country: 'Brasil', isoCode: 'BR', dialCode: '+55', documentLabel: 'CPF', placeholder: '123.456.789-00' },
  { country: 'Canadá', isoCode: 'CA', dialCode: '+1', documentLabel: 'SIN', placeholder: '123 456 789' },
  { country: 'Chile', isoCode: 'CL', dialCode: '+56', documentLabel: 'RUT', placeholder: '12.345.678-9' },
  { country: 'Colombia', isoCode: 'CO', dialCode: '+57', documentLabel: 'CC/NIT', placeholder: '1.234.567.890' },
  { country: 'Costa Rica', isoCode: 'CR', dialCode: '+506', documentLabel: 'Cédula', placeholder: '123456789' },
  { country: 'Cuba', isoCode: 'CU', dialCode: '+53', documentLabel: 'CI', placeholder: 'Número de carné' },
  { country: 'Dominica', isoCode: 'DM', dialCode: '+1-767', documentLabel: 'NIN', placeholder: 'Número de identificación' },
  { country: 'Ecuador', isoCode: 'EC', dialCode: '+593', documentLabel: 'Cédula/RUC', placeholder: '0912345678' },
  { country: 'El Salvador', isoCode: 'SV', dialCode: '+503', documentLabel: 'DUI/NIT', placeholder: '01234567-8' },
  { country: 'Estados Unidos', isoCode: 'US', dialCode: '+1', documentLabel: 'SSN/EIN', placeholder: '123-45-6789' },
  { country: 'Granada', isoCode: 'GD', dialCode: '+1-473', documentLabel: 'NID', placeholder: 'Número de identificación' },
  { country: 'Guatemala', isoCode: 'GT', dialCode: '+502', documentLabel: 'DPI/NIT', placeholder: '1234 56789 0101' },
  { country: 'Guyana', isoCode: 'GY', dialCode: '+592', documentLabel: 'TIN', placeholder: 'Número de identificación' },
  { country: 'Haití', isoCode: 'HT', dialCode: '+509', documentLabel: 'NIF', placeholder: 'Número de identificación fiscal' },
  { country: 'Honduras', isoCode: 'HN', dialCode: '+504', documentLabel: 'RTN/Identidad', placeholder: '0801-1990-12345' },
  { country: 'Jamaica', isoCode: 'JM', dialCode: '+1-876', documentLabel: 'TRN', placeholder: '123-456-789' },
  { country: 'México', isoCode: 'MX', dialCode: '+52', documentLabel: 'CURP/RFC', placeholder: 'ABCD901231HDFRRN09' },
  { country: 'Nicaragua', isoCode: 'NI', dialCode: '+505', documentLabel: 'Cédula/RUC', placeholder: '001-010190-0000A' },
  { country: 'Panamá', isoCode: 'PA', dialCode: '+507', documentLabel: 'Cédula/RUC', placeholder: '8-123-456' },
  { country: 'Paraguay', isoCode: 'PY', dialCode: '+595', documentLabel: 'CI/RUC', placeholder: '1234567-8' },
  { country: 'Perú', isoCode: 'PE', dialCode: '+51', documentLabel: 'DNI/RUC', placeholder: '12345678' },
  { country: 'República Dominicana', isoCode: 'DO', dialCode: '+1-809', documentLabel: 'Cédula/RNC', placeholder: '001-1234567-8' },
  { country: 'San Cristóbal y Nieves', isoCode: 'KN', dialCode: '+1-869', documentLabel: 'NID', placeholder: 'Número de identificación' },
  { country: 'San Vicente y las Granadinas', isoCode: 'VC', dialCode: '+1-784', documentLabel: 'NIN', placeholder: 'Número de identificación' },
  { country: 'Santa Lucía', isoCode: 'LC', dialCode: '+1-758', documentLabel: 'NIN', placeholder: 'Número de identificación' },
  { country: 'Surinam', isoCode: 'SR', dialCode: '+597', documentLabel: 'ID', placeholder: 'Número de identificación' },
  { country: 'Trinidad y Tobago', isoCode: 'TT', dialCode: '+1-868', documentLabel: 'NID/BIR', placeholder: 'Número de identificación' },
  { country: 'Uruguay', isoCode: 'UY', dialCode: '+598', documentLabel: 'CI/RUT', placeholder: '1.234.567-8' },
  { country: 'Venezuela', isoCode: 'VE', dialCode: '+58', documentLabel: 'Cédula/RIF', placeholder: 'V-12345678' },
];

export default function CheckoutPage() {
  return (
    <StoreLayout>
      <RequireAuth message="Inicia sesión para hacer checkout">
        <CheckoutForm />
      </RequireAuth>
    </StoreLayout>
  );
}

function CheckoutForm() {
  const { user } = useAuth();
  const [step, setStep] = useState<'shipping' | 'payment' | 'review'>('shipping');
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutCompleted, setCheckoutCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cartStale, setCartStale] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('credit');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('starken-domicilio');
  const [starkenCity, setStarkenCity] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [saveNewAddress, setSaveNewAddress] = useState(true);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [shippingErrors, setShippingErrors] = useState<Record<string, string>>({});
  const [shippingData, setShippingData] = useState({
    firstName: '', lastName: '', email: '', phone: '', rut: '',
    address: '', city: '', state: '', zipCode: '', country: 'Chile'
  });
  const selectedCountryConfig = AMERICA_COUNTRIES.find((item) => item.country === shippingData.country) || AMERICA_COUNTRIES.find((item) => item.country === 'Chile')!;
  const selectedPostalCodeConfig = POSTAL_CODE_BY_COUNTRY[shippingData.country] || DEFAULT_POSTAL_CODE;
  const selectedRegionConfig = REGION_BY_COUNTRY[shippingData.country] || DEFAULT_REGION;
  const navigate = useNavigate();
  const { items: cartItems, clearCart, getSubtotal } = useCartStore();

  useEffect(() => {
    if (user) {
      const nameParts = (user.name || '').split(' ');
      setShippingData(prev => ({
        ...prev,
        firstName: prev.firstName || nameParts[0] || '',
        lastName: prev.lastName || nameParts.slice(1).join(' ') || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || '',
      }));
    }
  }, [user]);

  useEffect(() => {
    if (!user?.id) {
      setSavedAddresses([]);
      setSelectedAddressId('');
      return;
    }

    setLoadingAddresses(true);
    addressesAPI.getAll()
      .then((data) => {
        setSavedAddresses(data);
        setSelectedAddressId((current) => current || data.find((item) => item.isDefault)?.id || data[0]?.id || '');
      })
      .catch(() => setSavedAddresses([]))
      .finally(() => setLoadingAddresses(false));
  }, [user?.id]);

  useEffect(() => {
    const selected = savedAddresses.find((item) => item.id === selectedAddressId);
    if (!selected) return;

    setShippingData(prev => ({
      ...prev,
      address: selected.street,
      city: selected.city,
      state: selected.state,
      zipCode: selected.zipCode,
      country: selected.country,
      phone: selected.phone || prev.phone,
    }));
  }, [savedAddresses, selectedAddressId]);

  // Redirect to cart if empty
  useEffect(() => {
    if (cartItems.length === 0 && !isProcessing && !checkoutCompleted) {
      navigate('/store/cart');
    }
  }, [cartItems.length, isProcessing, checkoutCompleted, navigate]);

  const checkoutItems = cartItems.map(item => ({
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    price: item.price,
    variant: item.variant
  }));

  const stepLabels = { shipping: 'Envío', payment: 'Pago', review: 'Revisión' };
  const steps: Array<'shipping' | 'payment' | 'review'> = ['shipping', 'payment', 'review'];

  const validateShipping = (): boolean => {
    const errors: Record<string, string> = {};
    if (!shippingData.firstName.trim()) errors.firstName = 'Nombre requerido';
    if (!shippingData.lastName.trim()) errors.lastName = 'Apellido requerido';
    if (!shippingData.email.trim()) errors.email = 'Email requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shippingData.email)) errors.email = 'Email inválido';
    if (!shippingData.phone.trim()) errors.phone = 'Teléfono requerido';
    if (!shippingData.rut.trim()) errors.rut = 'RUT requerido';

    const selectedOption = DELIVERY_OPTIONS.find(o => o.id === deliveryMethod);
    const selectedSavedAddress = savedAddresses.find((item) => item.id === selectedAddressId);

    if (selectedOption?.needsAddress && !selectedSavedAddress) {
      if (!shippingData.address.trim()) errors.address = 'Dirección requerida';
      if (!shippingData.city.trim()) errors.city = 'Ciudad requerida';
      if (!shippingData.state.trim()) errors.state = `${selectedRegionConfig.label} requerido`;
      if (!shippingData.zipCode.trim()) errors.zipCode = `${selectedPostalCodeConfig.label} requerido`;
    }

    if (deliveryMethod === 'starken-sucursal' && !starkenCity.trim()) {
      errors.starkenCity = 'Indica tu ciudad para coordinar la sucursal';
    }

    setShippingErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const goToPayment = () => {
    if (validateShipping()) {
      setStep('payment');
    }
  };

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) return;
    setIsProcessing(true);
    setError(null);

    const selectedDelivery = DELIVERY_OPTIONS.find(o => o.id === deliveryMethod)!;
    const selectedSavedAddress = savedAddresses.find((item) => item.id === selectedAddressId);
    const deliveryNotes = [
      `Método de entrega: ${selectedDelivery.label}`,
      deliveryMethod === 'starken-sucursal' ? `Ciudad sucursal: ${starkenCity}` : null,
      deliveryMethod === 'pickup-santiago' ? 'Llano Subercaseaux 3509, San Miguel, RM' : null,
      deliveryMethod === 'pickup-valparaiso' ? 'A coordinar fines de semana' : null,
    ].filter(Boolean).join(' | ');

    try {
      let addressId: string | undefined;

      if (selectedSavedAddress) {
        addressId = selectedSavedAddress.id;
      } else if (saveNewAddress && selectedDelivery.needsAddress) {
        const createdAddress = await addressesAPI.create({
          name: `${shippingData.firstName} ${shippingData.lastName}`.trim() || 'Dirección principal',
          street: shippingData.address,
          city: shippingData.city,
          state: shippingData.state,
          zipCode: shippingData.zipCode,
          country: shippingData.country,
          phone: shippingData.phone || undefined,
          isDefault: savedAddresses.length === 0,
        });
        setSavedAddresses((prev) => [createdAddress, ...prev.filter((item) => item.id !== createdAddress.id)]);
        addressId = createdAddress.id;
      }

      const order = await ordersAPI.create({
        items: cartItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          ...(item.variantId ? { variantId: item.variantId } : {}),
        })),
        customerName: `${shippingData.firstName} ${shippingData.lastName}`,
        customerEmail: shippingData.email,
        customerPhone: shippingData.phone,
        ...(addressId ? { addressId } : {}),
        customerRut: shippingData.rut,
        deliveryMethod,
        ...(!addressId && selectedDelivery.needsAddress ? {
          shippingAddress: {
            street: shippingData.address,
            city: shippingData.city,
            state: shippingData.state,
            zipCode: shippingData.zipCode,
            country: shippingData.country,
          },
        } : {}),
        paymentMethod,
        notes: deliveryNotes,
      });
      
      const payment = await paymentsAPI.checkout(order.id, paymentMethod);
      
      if (payment.checkoutUrl) {
        window.location.href = payment.checkoutUrl;
      } else {
        setCheckoutCompleted(true);
        clearCart();
        navigate(`/store/order-confirmation?orderId=${order.id}`);
      }
    } catch (err: any) {
      console.error('Error en checkout:', err);
      const msg: string = err?.message || '';
      if (msg.toLowerCase().includes('not found')) {
        // Try to map UUID to product name from cart
        const uuidMatch = msg.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        const productName = uuidMatch
          ? cartItems.find(i => i.productId === uuidMatch[0])?.name
          : null;
        setCartStale(true);
        setError(
          productName
            ? `"${productName}" ya no está disponible. Elimínalo del carrito e intenta de nuevo.`
            : 'Uno o más productos de tu carrito ya no están disponibles. Revisa el carrito e intenta de nuevo.'
        );
      } else if (msg.toLowerCase().includes('stock') || msg.toLowerCase().includes('insufficient')) {
        setCartStale(true);
        setError(msg || 'Stock insuficiente en uno o más productos. Revisa el carrito e intenta de nuevo.');
      } else {
        setError(msg || 'Error al procesar el pedido. Intenta de nuevo.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setShippingData(prev => ({ ...prev, [field]: value }));
    if (shippingErrors[field]) {
      setShippingErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-primary mb-8">CHECKOUT</h1>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {steps.map((s, idx) => {
            const isCompleted = steps.indexOf(step) > idx;
            const isCurrent = step === s;
            return (
              <div key={s} className="flex items-center">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-[family-name:var(--font-mono)] transition-colors ${
                      isCurrent
                        ? 'bg-primary text-primary-foreground'
                        : isCompleted
                        ? 'bg-[#00e676] text-black'
                        : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? '✓' : idx + 1}
                  </div>
                  <span className={`text-xs hidden sm:inline ${isCurrent ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    {stepLabels[s]}
                  </span>
                </div>
                {idx < 2 && (
                  <div className={`w-12 h-0.5 mx-2 transition-colors ${isCompleted ? 'bg-[#00e676]' : 'bg-border'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-3 p-4 mb-6 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-400">{error}</p>
              {cartStale && (
                <button
                  type="button"
                  onClick={() => { clearCart(); navigate('/store/cart'); }}
                  className="mt-2 text-xs text-red-300 underline hover:text-red-200"
                >
                  Ir al carrito y revisarlo
                </button>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Método de Entrega y Datos de Contacto */}
            {step === 'shipping' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-primary" />
                    <CardTitle>Método de Entrega</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 border-b border-border pb-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        Direcciones guardadas
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAddressId('');
                          setSaveNewAddress(true);
                          setShippingData((prev) => ({
                            ...prev,
                            address: '',
                            city: '',
                            state: '',
                            zipCode: '',
                          }));
                          setShippingErrors({});
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        Usar una nueva
                      </button>
                    </div>

                    {loadingAddresses ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Cargando direcciones...
                      </div>
                    ) : savedAddresses.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No tienes direcciones guardadas. Completa una nueva y podrás guardarla para futuras compras.</p>
                    ) : (
                      <div className="space-y-2">
                        {savedAddresses.map((address) => {
                          const isSelected = selectedAddressId === address.id;
                          return (
                            <button
                              key={address.id}
                              type="button"
                              onClick={() => setSelectedAddressId(address.id)}
                              className={`w-full text-left p-3 rounded-lg border transition-all ${
                                isSelected ? 'border-primary bg-primary/5' : 'border-border bg-secondary hover:border-muted-foreground/40'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-medium text-foreground">{address.name}</span>
                                    {address.isDefault && <Badge variant="success" className="text-[10px]">Predeterminada</Badge>}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">{address.street}</p>
                                  <p className="text-xs text-muted-foreground">{address.city}, {address.state} · {address.zipCode}</p>
                                </div>
                                {isSelected && <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Opciones de entrega */}
                  {DELIVERY_OPTIONS.map(option => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => { setDeliveryMethod(option.id); setShippingErrors({}); }}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        deliveryMethod === option.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-secondary hover:border-muted-foreground/30'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 mt-0.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                          deliveryMethod === option.id ? 'border-primary' : 'border-muted-foreground'
                        }`}>
                          {deliveryMethod === option.id && (
                            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={deliveryMethod === option.id ? 'text-primary' : 'text-muted-foreground'}>
                              {option.icon}
                            </span>
                            <span className="text-foreground font-medium">{option.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                          {deliveryMethod === option.id && (
                            <p className="text-xs text-primary/80 mt-1">{option.detail}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}

                  <div className="border-t border-border pt-4 mt-2">
                    <p className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      Datos de contacto
                    </p>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Input label="Nombre *" placeholder="Juan" value={shippingData.firstName} onChange={(e) => updateField('firstName', e.target.value)} />
                          {shippingErrors.firstName && <p className="text-xs text-red-400 mt-1">{shippingErrors.firstName}</p>}
                        </div>
                        <div>
                          <Input label="Apellido *" placeholder="Pérez" value={shippingData.lastName} onChange={(e) => updateField('lastName', e.target.value)} />
                          {shippingErrors.lastName && <p className="text-xs text-red-400 mt-1">{shippingErrors.lastName}</p>}
                        </div>
                      </div>
                      <div>
                        <Input label="Email *" type="email" placeholder="tu@email.com" value={shippingData.email} onChange={(e) => updateField('email', e.target.value)} />
                        {shippingErrors.email && <p className="text-xs text-red-400 mt-1">{shippingErrors.email}</p>}
                      </div>
                      <div>
                        <Input label="Teléfono *" type="tel" placeholder="+56 9 1234 5678" value={shippingData.phone} onChange={(e) => updateField('phone', e.target.value)} />
                        {shippingErrors.phone && <p className="text-xs text-red-400 mt-1">{shippingErrors.phone}</p>}
                      </div>
                      <div>
                        <Select
                          label="País *"
                          value={shippingData.country}
                          onChange={(e) => updateField('country', e.target.value)}
                        >
                          {AMERICA_COUNTRIES.map((item) => (
                            <option key={item.isoCode} value={item.country}>
                              {item.country}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <Input
                          label={`${selectedCountryConfig.documentLabel} *`}
                          placeholder={selectedCountryConfig.placeholder}
                          value={shippingData.rut}
                          onChange={(e) => updateField('rut', e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Código país: {selectedCountryConfig.dialCode} ({selectedCountryConfig.isoCode})
                        </p>
                        {shippingErrors.rut && <p className="text-xs text-red-400 mt-1">{shippingErrors.rut}</p>}
                      </div>

                      {!selectedAddressId && deliveryMethod === 'starken-domicilio' && (
                        <label className="flex items-center gap-2 text-sm text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={saveNewAddress}
                            onChange={(e) => setSaveNewAddress(e.target.checked)}
                            className="rounded border-border"
                          />
                          Guardar esta dirección para futuras compras
                        </label>
                      )}

                      {/* Ciudad para Starken sucursal */}
                      {deliveryMethod === 'starken-sucursal' && (
                        <div>
                          <Input label="Tu ciudad *" placeholder="Ej: Concepción, Temuco..." value={starkenCity} onChange={(e) => { setStarkenCity(e.target.value); setShippingErrors(prev => { const n = {...prev}; delete n.starkenCity; return n; }); }} />
                          {shippingErrors.starkenCity && <p className="text-xs text-red-400 mt-1">{shippingErrors.starkenCity}</p>}
                          <p className="text-xs text-muted-foreground mt-1">Te indicaremos la sucursal Starken más cercana.</p>
                        </div>
                      )}

                      {/* Dirección completa solo para Starken domicilio */}
                      {deliveryMethod === 'starken-domicilio' && !selectedAddressId && (
                        <>
                          <div>
                            <Input label="Dirección *" placeholder="Calle y número" value={shippingData.address} onChange={(e) => updateField('address', e.target.value)} />
                            {shippingErrors.address && <p className="text-xs text-red-400 mt-1">{shippingErrors.address}</p>}
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Input label="Ciudad *" placeholder="Santiago" value={shippingData.city} onChange={(e) => updateField('city', e.target.value)} />
                              {shippingErrors.city && <p className="text-xs text-red-400 mt-1">{shippingErrors.city}</p>}
                            </div>
                            <div>
                              <Input label={`${selectedRegionConfig.label} *`} placeholder={selectedRegionConfig.placeholder} value={shippingData.state} onChange={(e) => updateField('state', e.target.value)} />
                              {shippingErrors.state && <p className="text-xs text-red-400 mt-1">{shippingErrors.state}</p>}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Input label={`${selectedPostalCodeConfig.label} *`} placeholder={selectedPostalCodeConfig.placeholder} value={shippingData.zipCode} onChange={(e) => updateField('zipCode', e.target.value)} />
                              {shippingErrors.zipCode && <p className="text-xs text-red-400 mt-1">{shippingErrors.zipCode}</p>}
                            </div>
                            <div>
                              <Input label="País" value={shippingData.country} disabled />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <Button onClick={goToPayment} fullWidth size="lg">
                    Continuar al Pago <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Método de Pago */}
            {step === 'payment' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <CardTitle>Método de Pago</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-[#00e676]/10 border border-[#00e676]/20 rounded-lg">
                    <Lock className="w-4 h-4 text-[#00e676]" />
                    <span className="text-sm text-[#00e676]">Tarjetas procesadas de forma segura por Getnet</span>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Selecciona tu método de pago:
                  </p>

                  {/* Tarjeta de Crédito */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('credit')}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      paymentMethod === 'credit'
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-secondary hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          paymentMethod === 'credit' ? 'border-primary' : 'border-muted-foreground'
                        }`}>
                          {paymentMethod === 'credit' && (
                            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                          )}
                        </div>
                        <div>
                          <span className="text-foreground font-medium">Tarjeta de Crédito</span>
                          <p className="text-xs text-muted-foreground mt-0.5">Visa, Mastercard, American Express</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-8 h-5 bg-[#1A1F71] rounded flex items-center justify-center">
                          <span className="text-[8px] font-bold text-white italic">VISA</span>
                        </div>
                        <div className="w-8 h-5 bg-[#EB001B] rounded flex items-center justify-center relative overflow-hidden">
                          <div className="absolute left-1 w-3 h-3 rounded-full bg-[#EB001B] opacity-90" />
                          <div className="absolute right-1 w-3 h-3 rounded-full bg-[#F79E1B] opacity-90" />
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Tarjeta de Débito */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('debit')}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      paymentMethod === 'debit'
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-secondary hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          paymentMethod === 'debit' ? 'border-primary' : 'border-muted-foreground'
                        }`}>
                          {paymentMethod === 'debit' && (
                            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                          )}
                        </div>
                        <div>
                          <span className="text-foreground font-medium">Tarjeta de Débito</span>
                          <p className="text-xs text-muted-foreground mt-0.5">Visa Débito, Mastercard Débito</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-8 h-5 bg-[#1A1F71] rounded flex items-center justify-center">
                          <span className="text-[8px] font-bold text-white italic">VISA</span>
                        </div>
                        <div className="w-8 h-5 bg-[#EB001B] rounded flex items-center justify-center relative overflow-hidden">
                          <div className="absolute left-1 w-3 h-3 rounded-full bg-[#EB001B] opacity-90" />
                          <div className="absolute right-1 w-3 h-3 rounded-full bg-[#F79E1B] opacity-90" />
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Transferencia */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('transfer')}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      paymentMethod === 'transfer'
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-secondary hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          paymentMethod === 'transfer' ? 'border-primary' : 'border-muted-foreground'
                        }`}>
                          {paymentMethod === 'transfer' && (
                            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                          )}
                        </div>
                        <div>
                          <span className="text-foreground font-medium">Transferencia Bancaria</span>
                          <p className="text-xs text-muted-foreground mt-0.5">Un admin confirma manualmente el pago</p>
                        </div>
                      </div>
                      <Landmark className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </button>

                  {/* Efectivo */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      paymentMethod === 'cash'
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-secondary hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          paymentMethod === 'cash' ? 'border-primary' : 'border-muted-foreground'
                        }`}>
                          {paymentMethod === 'cash' && (
                            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                          )}
                        </div>
                        <div>
                          <span className="text-foreground font-medium">Pago en Efectivo</span>
                          <p className="text-xs text-muted-foreground mt-0.5">Tu orden queda pendiente de validación</p>
                        </div>
                      </div>
                      <Wallet className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </button>

                  {/* Datos bancarios para transferencia */}
                  {paymentMethod === 'transfer' && (
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Landmark className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold text-foreground">Datos para la transferencia</span>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Nombre</span>
                          <span className="text-foreground font-medium">Hobbyzamora SPA</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">RUT</span>
                          <span className="text-foreground font-medium font-[family-name:var(--font-mono)]">78.270.143-6</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Banco</span>
                          <span className="text-foreground font-medium">Banco Santander</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tipo de cuenta</span>
                          <span className="text-foreground font-medium">Cuenta Corriente</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">N° de cuenta</span>
                          <span className="text-foreground font-medium font-[family-name:var(--font-mono)]">27844766</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Email</span>
                          <span className="text-foreground font-medium">hobbyzamora@gmail.com</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground pt-1 border-t border-primary/10">
                        Una vez realizada la transferencia, sube tu comprobante y te confirmaremos el pedido a la brevedad.
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 p-3 bg-secondary rounded-lg">
                    <ShieldCheck className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      {paymentMethod === 'credit' || paymentMethod === 'debit'
                        ? 'Al continuar serás redirigido a la pasarela segura de Getnet para ingresar los datos de tu tarjeta. No almacenamos información de tu tarjeta.'
                        : 'Tu orden será recibida y validada manualmente. Te notificaremos cuando el pago quede confirmado y el pedido comience a procesarse.'}
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={() => setStep('shipping')} fullWidth>
                      Volver
                    </Button>
                    <Button onClick={() => setStep('review')} fullWidth size="lg">
                      Revisar Pedido <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Revisar Pedido */}
            {step === 'review' && (
              <Card>
                <CardHeader>
                  <CardTitle>Revisa tu Pedido</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Método de Entrega */}
                  <div className="p-4 bg-secondary rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-foreground flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-primary" />
                        Método de Entrega
                      </h3>
                      <button
                        type="button"
                        onClick={() => setStep('shipping')}
                        className="text-xs text-primary hover:underline"
                      >
                        Editar
                      </button>
                    </div>
                    {(() => {
                      const opt = DELIVERY_OPTIONS.find(o => o.id === deliveryMethod)!;
                      return (
                        <>
                          <p className="text-sm text-foreground">{opt.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                          {deliveryMethod === 'starken-sucursal' && starkenCity && (
                            <p className="text-xs text-muted-foreground mt-0.5">Ciudad: {starkenCity}</p>
                          )}
                          {opt.needsAddress && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {shippingData.address}, {shippingData.city}, {shippingData.state}
                            </p>
                          )}
                          <p className="text-sm text-foreground mt-2">
                            {shippingData.firstName} {shippingData.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">{shippingData.email} · {shippingData.phone}</p>
                          <p className="text-xs text-muted-foreground">{selectedCountryConfig.documentLabel}: {shippingData.rut} ({selectedCountryConfig.isoCode})</p>
                        </>
                      );
                    })()}
                  </div>

                  {/* Método de Pago */}
                  <div className="p-4 bg-secondary rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-foreground flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-primary" />
                        Método de Pago
                      </h3>
                      <button
                        type="button"
                        onClick={() => setStep('payment')}
                        className="text-xs text-primary hover:underline"
                      >
                        Cambiar
                      </button>
                    </div>
                    <p className="text-sm text-foreground">
                      {paymentMethod === 'credit' && 'Tarjeta de Crédito'}
                      {paymentMethod === 'debit' && 'Tarjeta de Débito'}
                      {paymentMethod === 'transfer' && 'Transferencia Bancaria'}
                      {paymentMethod === 'cash' && 'Pago en Efectivo'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {paymentMethod === 'credit' || paymentMethod === 'debit'
                        ? 'Procesado de forma segura por Getnet'
                        : 'Confirmación manual por administración'}
                    </p>
                    {paymentMethod === 'transfer' && (
                      <div className="mt-3 pt-3 border-t border-border space-y-1.5 text-xs">
                        <p className="font-medium text-foreground mb-1">Datos bancarios:</p>
                        <p className="text-muted-foreground">Hobbyzamora SPA · RUT 78.270.143-6</p>
                        <p className="text-muted-foreground">Banco Santander · Cta. Corriente <span className="font-[family-name:var(--font-mono)]">27844766</span></p>
                        <p className="text-muted-foreground">hobbyzamora@gmail.com</p>
                      </div>
                    )}
                  </div>

                  {/* Items del pedido */}
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-3">
                      Artículos ({cartItems.length})
                    </h3>
                    <div className="divide-y divide-border">
                      {cartItems.map(item => (
                        <div key={item.id} className="flex items-center gap-3 py-3">
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-12 h-12 rounded-md object-cover bg-secondary"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground truncate">{item.name}</p>
                            {item.variant && (
                              <p className="text-xs text-muted-foreground">{item.variant}</p>
                            )}
                            <p className="text-xs text-muted-foreground">Cant: {item.quantity}</p>
                          </div>
                          <span className="text-sm text-foreground font-[family-name:var(--font-mono)]">
                            ${(item.price * item.quantity).toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={() => setStep('payment')} fullWidth disabled={isProcessing}>
                      Volver
                    </Button>
                    <Button fullWidth size="lg" onClick={handlePlaceOrder} disabled={isProcessing}>
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Procesando...
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          {paymentMethod === 'credit' || paymentMethod === 'debit'
                            ? 'Pagar con Getnet'
                            : 'Confirmar Pedido'}
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Resumen del Pedido */}
          <div>
            <CheckoutSummary items={checkoutItems} />
          </div>
        </div>
      </div>
  );
}
