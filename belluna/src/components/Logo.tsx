import { useState } from 'react';
import BellunaLogo from './BellunaLogo';

/**
 * Logo – thin wrapper used across Layout (header/footer) and Landing.
 * Accepts a Tailwind height className (e.g. "h-9", "h-14") for backward‑compat.
 * Falls back to text if asset is missing.
 */
export default function Logo({ className = 'h-10' }: { className?: string }) {
  const [missing, setMissing] = useState(false);
  if (missing)
    return (
      <span className="font-head font-semibold text-primary" title="Add public/assets/belluna-logo.png">
        Belluna
      </span>
    );
  return (
    <img
      src="/assets/belluna-logo.png"
      alt="Belluna – Your Health, Your Voice, Our Support"
      className={`${className} w-auto object-contain`}
      onError={() => setMissing(true)}
    />
  );
}

export { BellunaLogo };
