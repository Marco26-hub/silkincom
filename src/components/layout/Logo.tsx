import { Link } from '@/i18n/navigation';
import Image from 'next/image';

type LogoProps = {
  variant?: 'default' | 'light' | 'gold';
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  href?: string | null;
  className?: string;
  withMark?: boolean;
};

const sizeClasses = {
  sm: 'h-8 md:h-10',
  md: 'h-11 md:h-12',
  lg: 'h-12 sm:h-14 md:h-16',
  xl: 'h-20 md:h-24',
  '2xl': 'h-28 md:h-36',
};

// Official logo SVG — extracted from silkincom.com (gold/white variant via filter)
function OfficialLogo({ size = 'md', variant = 'default', className = '' }: {
  size?: keyof typeof sizeClasses;
  variant?: 'default' | 'light' | 'gold';
  className?: string;
}) {
  const filters: string[] = [];
  if (variant === 'light') {
    filters.push('brightness(0) invert(1)');
  } else if (variant === 'gold') {
    filters.push('brightness(1.25) saturate(1.15)');
    filters.push('drop-shadow(0 0 18px rgba(212,175,55,0.45))');
    filters.push('drop-shadow(0 0 4px rgba(212,175,55,0.65))');
  } else {
    filters.push('drop-shadow(0 1px 8px rgba(212,175,55,0.18))');
  }

  return (
    <Image
      src="/logo-gold.png"
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
