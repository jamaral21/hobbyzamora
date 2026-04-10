import { useReducer, useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { Button } from './Button';

// ─── Interfaces ───────────────────────────────────────────────

export interface HeroSlide {
  id: string;
  image: string;
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaHref?: string;
}

export interface HeroSliderProps {
  slides: HeroSlide[];
  autoplayInterval?: number;
  pauseDuration?: number;
  transitionDuration?: number;
  className?: string;
}

// ─── Reducer ──────────────────────────────────────────────────

interface SliderState {
  currentIndex: number;
  direction: 1 | -1;
  isAutoplayPaused: boolean;
  isTabVisible: boolean;
}

type SliderAction =
  | { type: 'NEXT_SLIDE'; total: number }
  | { type: 'PREV_SLIDE'; total: number }
  | { type: 'GO_TO_SLIDE'; index: number; total: number }
  | { type: 'PAUSE_AUTOPLAY' }
  | { type: 'RESUME_AUTOPLAY' }
  | { type: 'SET_TAB_VISIBLE'; visible: boolean };

export function sliderReducer(state: SliderState, action: SliderAction): SliderState {
  switch (action.type) {
    case 'NEXT_SLIDE':
      return {
        ...state,
        currentIndex: (state.currentIndex + 1) % action.total,
        direction: 1,
      };
    case 'PREV_SLIDE':
      return {
        ...state,
        currentIndex: (state.currentIndex - 1 + action.total) % action.total,
        direction: -1,
      };
    case 'GO_TO_SLIDE': {
      const clamped = Math.max(0, Math.min(action.index, action.total - 1));
      return {
        ...state,
        currentIndex: clamped,
        direction: clamped >= state.currentIndex ? 1 : -1,
      };
    }
    case 'PAUSE_AUTOPLAY':
      return { ...state, isAutoplayPaused: true };
    case 'RESUME_AUTOPLAY':
      return { ...state, isAutoplayPaused: false };
    case 'SET_TAB_VISIBLE':
      return { ...state, isTabVisible: action.visible };
    default:
      return state;
  }
}

// ─── Fallback Gradient ────────────────────────────────────────

function FallbackGradient() {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/20" />
  );
}

// ─── Slide Image ──────────────────────────────────────────────

function SlideImage({ src, alt, loading = 'lazy' }: { src: string; alt: string; loading?: 'eager' | 'lazy' }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return <FallbackGradient />;
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      className="absolute inset-0 h-full w-full object-cover"
      onError={() => setHasError(true)}
    />
  );
}

// ─── Slide Content Overlay ────────────────────────────────────

function SlideContent({ slide }: { slide: HeroSlide }) {
  const hasText = !!(slide.title || slide.subtitle);
  const hasCta = !!(slide.ctaText && slide.ctaHref);
  const hasLink = !!slide.ctaHref;

  // Image-only slide with a link — make the whole slide clickeable
  if (!hasText && !hasCta && hasLink) {
    return (
      <Link to={slide.ctaHref!} className="absolute inset-0 z-[1]" aria-label={slide.title || 'Ver categoría'}>
        <span className="sr-only">Ver categoría</span>
      </Link>
    );
  }

  if (!hasText && !hasCta) return null;

  return (
    <>
      {/* Dark overlay gradient — only when text content present */}
      {hasText && (
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/30 to-transparent" />
      )}

      {/* Text content */}
      <div className="absolute inset-0 flex items-end justify-center lg:justify-start">
        <div className="relative z-10 p-6 pb-12 text-center lg:p-12 lg:pb-16 lg:text-left max-w-2xl">
          {slide.title && (
            <h2 className="font-[family-name:var(--font-display)] text-foreground text-sm sm:text-base lg:text-lg leading-relaxed mb-3">
              {slide.title}
            </h2>
          )}
          {slide.subtitle && (
            <p className="font-[family-name:var(--font-body)] text-muted-foreground text-sm sm:text-base lg:text-lg mb-5">
              {slide.subtitle}
            </p>
          )}
          {hasCta && (
            <Link to={slide.ctaHref!}>
              <Button variant="primary" size="lg">
                {slide.ctaText}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </>
  );
}

// ─── HeroSlider Component ─────────────────────────────────────

export function HeroSlider({
  slides,
  autoplayInterval = 5000,
  pauseDuration = 10000,
  transitionDuration = 500,
  className,
}: HeroSliderProps) {
  // Clamp slides: empty → fallback, >6 → truncate
  const clampedSlides = slides.length === 0 ? [] : slides.slice(0, 6);

  const [state, dispatch] = useReducer(sliderReducer, {
    currentIndex: 0,
    direction: 1,
    isAutoplayPaused: false,
    isTabVisible: true,
  });

  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerStartXRef = useRef<number | null>(null);

  const goNext = useCallback(
    () => dispatch({ type: 'NEXT_SLIDE', total: clampedSlides.length }),
    [clampedSlides.length]
  );

  const goPrev = useCallback(
    () => dispatch({ type: 'PREV_SLIDE', total: clampedSlides.length }),
    [clampedSlides.length]
  );

  // Pause autoplay on user interaction, resume after pauseDuration
  const pauseAutoplay = useCallback(() => {
    dispatch({ type: 'PAUSE_AUTOPLAY' });
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = setTimeout(() => {
      dispatch({ type: 'RESUME_AUTOPLAY' });
    }, pauseDuration);
  }, [pauseDuration]);

  // Cleanup pause timer on unmount
  useEffect(() => {
    return () => {
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    };
  }, []);

  const goToSlide = useCallback(
    (index: number) => {
      dispatch({ type: 'GO_TO_SLIDE', index, total: clampedSlides.length });
      pauseAutoplay();
    },
    [clampedSlides.length, pauseAutoplay]
  );

  const handleNext = useCallback(() => {
    goNext();
    pauseAutoplay();
  }, [goNext, pauseAutoplay]);

  const handlePrev = useCallback(() => {
    goPrev();
    pauseAutoplay();
  }, [goPrev, pauseAutoplay]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    },
    [handlePrev, handleNext]
  );

  // ─── Autoplay ─────────────────────────────────────────────
  const showNavigation = clampedSlides.length > 1;

  useEffect(() => {
    if (!showNavigation) return;
    if (state.isAutoplayPaused || !state.isTabVisible) return;

    const id = setInterval(() => {
      dispatch({ type: 'NEXT_SLIDE', total: clampedSlides.length });
    }, autoplayInterval);

    return () => clearInterval(id);
  }, [showNavigation, state.isAutoplayPaused, state.isTabVisible, autoplayInterval, clampedSlides.length]);

  // ─── Visibility change ────────────────────────────────────
  useEffect(() => {
    if (!showNavigation) return;

    const handleVisibility = () => {
      dispatch({ type: 'SET_TAB_VISIBLE', visible: !document.hidden });
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [showNavigation]);

  // ─── Swipe gestures ───────────────────────────────────────
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerStartXRef.current = e.clientX;
  }, []);

  const handlePointerMove = useCallback((_e: React.PointerEvent) => {
    // Intentionally empty — we only need start and end positions
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (pointerStartXRef.current === null) return;
      const deltaX = e.clientX - pointerStartXRef.current;
      pointerStartXRef.current = null;

      if (Math.abs(deltaX) > 50) {
        if (deltaX < 0) {
          // Swipe left → next slide
          goNext();
        } else {
          // Swipe right → prev slide
          goPrev();
        }
        pauseAutoplay();
      }
    },
    [goNext, goPrev, pauseAutoplay]
  );

  // ─── Pause/Play toggle ───────────────────────────────────
  const toggleAutoplay = useCallback(() => {
    if (state.isAutoplayPaused) {
      // Clear any pending resume timer when manually resuming
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
        pauseTimerRef.current = null;
      }
      dispatch({ type: 'RESUME_AUTOPLAY' });
    } else {
      // Clear any pending resume timer when manually pausing
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
        pauseTimerRef.current = null;
      }
      dispatch({ type: 'PAUSE_AUTOPLAY' });
    }
  }, [state.isAutoplayPaused]);

  // ─── Lazy loading helper ──────────────────────────────────
  const getLoadingAttr = useCallback(
    (index: number): 'eager' | 'lazy' => {
      const total = clampedSlides.length;
      if (index === state.currentIndex) return 'eager';
      // Adjacent slides (handles wrapping)
      const prev = (state.currentIndex - 1 + total) % total;
      const next = (state.currentIndex + 1) % total;
      if (index === prev || index === next) return 'eager';
      return 'lazy';
    },
    [state.currentIndex, clampedSlides.length]
  );

  // Empty slides → render fallback
  if (clampedSlides.length === 0) {
    return (
      <div
        className={`relative w-full overflow-hidden aspect-[1920/420] ${className ?? ''}`}
        role="region"
        aria-label="Banner promocional"
      >
        <FallbackGradient />
      </div>
    );
  }

  const activeSlide = clampedSlides[state.currentIndex];
  const transitionSec = transitionDuration / 1000;

  return (
    <div
      className={`relative w-full overflow-hidden aspect-[1920/420] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className ?? ''}`}
      role="region"
      aria-label="Carrusel de banners"
      aria-roledescription="carousel"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <AnimatePresence initial={false} custom={state.direction} mode="popLayout">
        <motion.div
          key={activeSlide.id}
          custom={state.direction}
          initial={(dir: number) => ({ x: dir === 1 ? '100%' : '-100%', opacity: 0 })}
          animate={{ x: 0, opacity: 1 }}
          exit={(dir: number) => ({ x: dir === 1 ? '-100%' : '100%', opacity: 0 })}
          transition={{ duration: transitionSec, ease: 'easeInOut' }}
          className="absolute inset-0"
          aria-roledescription="slide"
          aria-label={`Slide ${state.currentIndex + 1} de ${clampedSlides.length}`}
        >
          <SlideImage
            src={activeSlide.image}
            alt={activeSlide.title ?? `Slide ${state.currentIndex + 1}`}
            loading="eager"
          />
          <SlideContent slide={activeSlide} />
        </motion.div>
      </AnimatePresence>

      {/* Hidden preload images for lazy loading */}
      <div className="hidden" aria-hidden="true">
        {clampedSlides.map((slide, i) =>
          i !== state.currentIndex ? (
            <img
              key={`preload-${slide.id}`}
              src={slide.image}
              alt=""
              loading={getLoadingAttr(i)}
            />
          ) : null
        )}
      </div>

      {/* Navigation arrows — hidden on mobile, hidden when single slide */}
      {showNavigation && (
        <>
          <button
            type="button"
            aria-label="Slide anterior"
            onClick={handlePrev}
            className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-10 h-10 rounded-full bg-background/50 hover:bg-background/70 text-foreground border border-border transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            aria-label="Slide siguiente"
            onClick={handleNext}
            className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-10 h-10 rounded-full bg-background/50 hover:bg-background/70 text-foreground border border-border transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Indicator dots — hidden when single slide */}
      {showNavigation && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {clampedSlides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Ir a slide ${i + 1}`}
              onClick={() => goToSlide(i)}
              className={`rounded-full transition-colors ${
                i === state.currentIndex
                  ? 'w-3 h-3 bg-primary'
                  : 'w-2.5 h-2.5 bg-muted-foreground/50 hover:bg-muted-foreground'
              }`}
            />
          ))}
        </div>
      )}

      {/* Pause/play button — only when multiple slides */}
      {showNavigation && (
        <button
          type="button"
          aria-label={state.isAutoplayPaused ? 'Reanudar carrusel' : 'Pausar carrusel'}
          onClick={toggleAutoplay}
          className="absolute bottom-3 right-3 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-background/50 hover:bg-background/70 text-foreground border border-border transition-colors"
        >
          {state.isAutoplayPaused ? (
            <Play className="w-3.5 h-3.5" />
          ) : (
            <Pause className="w-3.5 h-3.5" />
          )}
        </button>
      )}
    </div>
  );
}
