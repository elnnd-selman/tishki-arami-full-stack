export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return <span className={size === 'lg' ? 'spinner spinner-lg' : 'spinner'} aria-label="Loading" />;
}
