import { Loader2, AlertCircle, Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import { useT } from '../i18n/t';

export function Loading({ text }: { text?: string }) {
  const { t } = useT();
  return <div role="status" className="flex items-center gap-2 text-primary py-6"><Loader2 className="animate-spin" size={20} />{text ?? t('common.loading')}</div>;
}
export function ErrorBox({ text, onRetry }: { text?: string; onRetry?: () => void }) {
  const { t } = useT();
  return (
    <div role="alert" className="card border-[#F4C7C3] flex gap-3 items-start">
      <AlertCircle className="text-[#B42318] shrink-0" />
      <div><p>{text ?? t('common.error')}</p>{onRetry && <button className="btn-ghost mt-3" onClick={onRetry}>{t('common.retry')}</button>}</div>
    </div>
  );
}
export function Empty({ text }: { text: ReactNode }) {
  return <div className="card flex gap-3 items-center text-ink/80"><Inbox className="text-lavender" />{text}</div>;
}
export function DemoBadge() {
  const { t } = useT();
  return <span className="rounded-full bg-blush px-3 py-1 text-xs font-medium text-primary">{t('common.demo')}</span>;
}
