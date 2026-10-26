import { useEffect, useState } from 'react';
import { buildProductImageVariantUrl, type ProductImageVariant } from '../../lib/productImageVariants';

const CATEGORY_FALLBACKS: Record<string, string> = {
  'pokemon tcg': '/images/product-fallbacks/trading-cards.svg',
  'tcg varios': '/images/product-fallbacks/trading-cards.svg',
  'pokemon tcg - china': '/images/product-fallbacks/trading-cards.svg',
  'pokemon tcg - espanol': '/images/product-fallbacks/trading-cards.svg',
  'pokemon tcg - ingles': '/images/product-fallbacks/trading-cards.svg',
  'pokemon tcg - japon': '/images/product-fallbacks/trading-cards.svg',
  'pokemon - psa': '/images/product-fallbacks/trading-cards.svg',
  'pokemon - singles': '/images/product-fallbacks/trading-cards.svg',
  'dragon ball ccg - japon': '/images/product-fallbacks/trading-cards.svg',
  'one piece ccg - japon': '/images/product-fallbacks/trading-cards.svg',
  'booster boxes': '/images/product-fallbacks/trading-cards.svg',
  'elite trainer boxes': '/images/product-fallbacks/trading-cards.svg',
  'colecciones premium': '/images/product-fallbacks/trading-cards.svg',
  'sobres sueltos': '/images/product-fallbacks/trading-cards.svg',
  'tins y latas': '/images/product-fallbacks/trading-cards.svg',
  blisters: '/images/product-fallbacks/trading-cards.svg',
  acrilicos: '/images/product-fallbacks/trading-cards.svg',
  playmats: '/images/product-fallbacks/trading-cards.svg',
  protectores: '/images/product-fallbacks/trading-cards.svg',
  'gashapon pkm': '/images/product-fallbacks/figures.svg',
  'beyblade x': '/images/product-fallbacks/spinning-top.svg',
  'linea bx': '/images/product-fallbacks/spinning-top.svg',
  'linea cx': '/images/product-fallbacks/spinning-top.svg',
  'linea ux': '/images/product-fallbacks/spinning-top.svg',
  hasbro: '/images/product-fallbacks/spinning-top.svg',
  exclusivos: '/images/product-fallbacks/spinning-top.svg',
  accesorios: '/images/product-fallbacks/spinning-top.svg',
  'pokemon merch': '/images/product-fallbacks/figures.svg',
  'figuras rement': '/images/product-fallbacks/figures.svg',
  peluches: '/images/product-fallbacks/figures.svg',
  'pokemon center': '/images/product-fallbacks/figures.svg',
  'pokemon scale world': '/images/product-fallbacks/figures.svg',
  'pokemon tomy': '/images/product-fallbacks/figures.svg',
  'autos tomy tomica': '/images/product-fallbacks/toy-cars.svg',
  tomica: '/images/product-fallbacks/toy-cars.svg',
  'tomica disney': '/images/product-fallbacks/toy-cars.svg',
  'tomica dreams': '/images/product-fallbacks/toy-cars.svg',
  'tomica premium': '/images/product-fallbacks/toy-cars.svg',
  'tomica premium - first edition': '/images/product-fallbacks/toy-cars.svg',
  figuras: '/images/product-fallbacks/figures.svg',
  figuarts: '/images/product-fallbacks/figures.svg',
  'bandai figuarts': '/images/product-fallbacks/figures.svg',
  'figuras articuladas': '/images/product-fallbacks/figures.svg',
  'ichiban kuji': '/images/product-fallbacks/figures.svg',
  'myth cloth ex': '/images/product-fallbacks/figures.svg',
  'action figures': '/images/product-fallbacks/figures.svg',
  'vinyl figures': '/images/product-fallbacks/figures.svg',
  'model kits': '/images/product-fallbacks/model-kits.svg',
  nintendo: '/images/product-fallbacks/gaming.svg',
  'juegos nintendo': '/images/product-fallbacks/gaming.svg',
  'juegos playstation': '/images/product-fallbacks/gaming.svg',
  'nintendo store japan': '/images/product-fallbacks/gaming.svg',
  'universal - super nintendo world': '/images/product-fallbacks/gaming.svg',
  'coleccionables varios': '/images/product-fallbacks/collectibles.svg',
  digimon: '/images/product-fallbacks/collectibles.svg',
  'disney japan': '/images/product-fallbacks/collectibles.svg',
  'one piece': '/images/product-fallbacks/collectibles.svg',
  snoopy: '/images/product-fallbacks/collectibles.svg',
  tamagotchi: '/images/product-fallbacks/gaming.svg',
  'accesorios varios': '/images/product-fallbacks/collectibles.svg',
  'board games': '/images/product-fallbacks/collectibles.svg',
  'display cases': '/images/product-fallbacks/collectibles.svg',
};

function getCategoryFallback(category?: string | null) {
  const normalized = String(category || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

  const exactMatch = CATEGORY_FALLBACKS[normalized];
  if (exactMatch) return exactMatch;

  if (normalized.includes('pokemon tcg') || normalized.includes('pokemon -') || normalized.includes('ccg')) {
    return CATEGORY_FALLBACKS['pokemon tcg'];
  }
  if (normalized.includes('tomica')) return CATEGORY_FALLBACKS.tomica;
  if (normalized.includes('beyblade') || normalized.startsWith('linea ')) return CATEGORY_FALLBACKS['beyblade x'];
  if (normalized.includes('figura') || normalized.includes('figuart')) return CATEGORY_FALLBACKS.figuras;
  if (normalized.includes('nintendo') || normalized.includes('playstation')) return CATEGORY_FALLBACKS.nintendo;

  return '/images/product-fallbacks/collectibles.svg';
}

interface ProductImageProps {
  src?: string | null;
  alt: string;
  category?: string | null;
  variant?: ProductImageVariant;
  className?: string;
  loading?: 'eager' | 'lazy';
}

export function ProductImage({
  src,
  alt,
  category,
  variant,
  className,
  loading,
}: ProductImageProps) {
  const originalSrc = String(src || '').trim();
  const variantSrc = originalSrc && variant
    ? buildProductImageVariantUrl(originalSrc, variant)
    : originalSrc;
  const fallbackSrc = getCategoryFallback(category);
  const [imageSrc, setImageSrc] = useState(variantSrc || fallbackSrc);

  useEffect(() => {
    setImageSrc(variantSrc || fallbackSrc);
  }, [variantSrc, fallbackSrc]);

  const handleError = () => {
    if (variantSrc && variantSrc !== originalSrc && imageSrc === variantSrc) {
      setImageSrc(originalSrc);
    } else if (imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
    }
  };

  const categoryLabel = String(category || '').trim();
  const showLabel = imageSrc === fallbackSrc && variant !== 'thumb' && categoryLabel.length > 0;

  const image = (
    <img
      src={imageSrc}
      alt={alt}
      loading={loading}
      decoding="async"
      className={className}
      onError={handleError}
    />
  );

  if (!showLabel) return image;

  return (
    <div className="relative w-full h-full overflow-hidden">
      {image}
      <span className="absolute inset-x-0 bottom-[7%] px-4 text-center text-[#F5E9C0] font-semibold uppercase tracking-[0.2em] text-[10px] sm:text-xs leading-snug line-clamp-2 pointer-events-none">
        {categoryLabel}
      </span>
    </div>
  );
}
