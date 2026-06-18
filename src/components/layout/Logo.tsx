import { Link } from '@/i18n/navigation';
import Image from 'next/image';

type LogoVariant = 'default' | 'light' | 'gold' | 'solid';

type LogoProps = {
  variant?: LogoVariant;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  href?: string | null;
  className?: string;
  withMark?: boolean;
};

const sizeClasses = {
  sm: 'h-10 md:h-12',
  md: 'h-14 md:h-16',
  lg: 'h-16 sm:h-20 md:h-24',
  xl: 'h-24 md:h-32',
  '2xl': 'h-32 md:h-44',
};

// Official logo SVG — extracted from silkincom.com (gold/white variant via filter)
function OfficialLogo({ size = 'md', variant = 'default', className = '' }: {
  size?: keyof typeof sizeClasses;
  variant?: LogoVariant;
  className?: string;
}) {
  const filters: string[] = [];
  if (variant === 'light') {
    filters.push('brightness(0) invert(1)');
  } else if (variant === 'gold') {
    filters.push('brightness(1.25) saturate(1.15)');
    filters.push('drop-shadow(0 0 18px rgba(212,175,55,0.45))');
    filters.push('drop-shadow(0 0 4px rgba(212,175,55,0.65))');
  } else if (variant === 'solid') {
    // Header over a light (cream) background. A pale gold PNG washes out on
    // cream, so the gold is deepened and given a crisp, two-layer embossed
    // shadow — a foil-stamped, premium finish that stays clearly legible.
    filters.push('saturate(1.4)');
    filters.push('contrast(1.22)');
    filters.push('brightness(0.9)');
    filters.push('drop-shadow(0 1px 1px rgba(58,42,12,0.55))');
    filters.push('drop-shadow(0 5px 14px rgba(120,88,28,0.28))');
  } else {
    // Default variant — used on the header over the hero. The logo is a gold
    // PNG that previously washed out against light photo subjects. Two
    // stacked drop-shadows: a tight dark one for crisp edge contrast, plus a
    // wider gold halo that keeps the brand feel premium.
    filters.push('drop-shadow(0 1px 2px rgba(30,30,30,0.35))');
    filters.push('drop-shadow(0 0 14px rgba(212,175,55,0.35))');
    filters.push('contrast(1.05)');
    filters.push('saturate(1.1)');
  }

  return (
    <Image
      src="/logo-gold.webp"
      alt="SILKinCOM"
      width={1500}
      height={1499}
      quality={95}
      className={`${sizeClasses[size]} w-auto object-contain transition-all duration-500 ease-[cubic-bezier(0.21,0.47,0.32,0.98)] ${className}`}
      style={{ filter: filters.join(' ') }}
      priority
    />
  );
}

export function Logo({ variant = 'default', size = 'md', href = '/', className = '' }: LogoProps) {
  const content = (
    <OfficialLogo size={size} variant={variant} className={className} />
  );

  if (href === null) return content;

  return (
    <Link
      href={href}
      className="inline-block transition-opacity hover:opacity-80"
      aria-label="SILKinCOM — Home"
    >
      {content}
    </Link>
  );
}
