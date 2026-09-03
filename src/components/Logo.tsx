import { Stethoscope } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const sizes = {
    sm: { icon: 'w-7 h-7', text: 'text-lg' },
    md: { icon: 'w-9 h-9', text: 'text-xl' },
    lg: { icon: 'w-12 h-12', text: 'text-3xl' },
  };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className={`${sizes[size].icon} rounded-xl bg-primary-600 flex items-center justify-center shrink-0`}>
        <Stethoscope className="w-2/3 h-2/3 text-white" />
      </div>
      {showText && (
        <span className={`${sizes[size].text} font-bold text-neutral-900 tracking-tight`}>
          Medi<span className="text-primary-600">Kiosk</span>
        </span>
      )}
    </div>
  );
}
