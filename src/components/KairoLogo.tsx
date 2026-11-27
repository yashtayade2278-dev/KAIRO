export function KairoLogo({ size = 44, className = '' }: { size?: number; className?: string }) {
  return <img alt="" src="/icon.svg" width={size} height={size} className={`shrink-0 ${className}`} />;
}
