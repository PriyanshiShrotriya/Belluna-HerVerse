import { useState } from 'react';
// Uses the approved logo asset. If the file is not added yet, shows a neutral placeholder (not a redesign).
export default function Logo({ className = 'h-10' }: { className?: string }) {
  const [missing, setMissing] = useState(false);
  if (missing) return <span className="font-head font-semibold text-primary" title="Add public/assets/belluna-logo.png">Belluna</span>;
  return <img src="/assets/belluna-logo.png" alt="Belluna" className={`${className} w-auto object-contain`} onError={() => setMissing(true)} />;
}
