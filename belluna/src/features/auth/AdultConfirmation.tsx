import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Loading } from '../../components/States';
import Logo from '../../components/Logo';
import { LangSwitch } from '../../components/Layout';
import { useAuth } from '../../app/stubs/auth';
import { getProfileAccessState } from '../../app/profileAccess';
import { useT } from '../../i18n/t';
import type { Profile } from '../../lib/db/profile';

export function ProfileLoadError({ onRetry, message }: { onRetry: () => void; message: string }) {
  const { t } = useT();
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState('');
  async function retry() {
    setRetrying(true);
    setRetryError('');
    try {
      await onRetry();
    } catch (retryFailure) {
      setRetryError(retryFailure instanceof Error ? retryFailure.message : t('age.profileError'));
    } finally {
      setRetrying(false);
    }
  }
  return (
    <section className="mx-auto max-w-lg px-4 py-12" aria-labelledby="profile-load-error-title">
      <div className="card space-y-4">
        <h1 id="profile-load-error-title" className="text-xl font-semibold">{t('age.profileErrorTitle')}</h1>
        <p role="alert" className="text-sm text-red-700">{message || t('age.profileError')}</p>
        {retryError && <p role="alert" className="text-sm text-red-700">{retryError}</p>}
        <button type="button" className="btn-primary" disabled={retrying} onClick={() => void retry()}>
          {retrying ? t('common.loading') : t('common.retry')}
        </button>
      </div>
    </section>
  );
}

export function AdultDeclaration(props: {
  checked: boolean;
  submitting: boolean;
  error: string;
  declaration: string;
  continueLabel: string;
  submittingLabel: string;
  onCheckedChange: (checked: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={props.onSubmit} className="space-y-4">
      <label htmlFor="adult-confirmation" className="flex cursor-pointer items-start gap-3 rounded-xl border border-soft p-4 text-sm font-medium">
        <input
          id="adult-confirmation"
          type="checkbox"
          disabled={props.submitting}
          checked={props.checked}
          onChange={(event) => props.onCheckedChange(event.target.checked)}
          className="mt-0.5 h-4 w-4 accent-primary"
        />
        <span>{props.declaration}</span>
      </label>
      {props.error && <p role="alert" className="text-sm text-red-700">{props.error}</p>}
      <button type="submit" className="btn-primary w-full" disabled={!props.checked || props.submitting}>
        {props.submitting ? props.submittingLabel : props.continueLabel}
      </button>
    </form>
  );
}

export function AdultConfirmationRoute() {
  const {
    session, loading: authLoading, profile, profileLoading, profileError,
    refreshProfile, confirmAdultStatus,
  } = useAuth();
  const { t } = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState('');
  const access = getProfileAccessState({
    authLoading,
    userId: session?.userId ?? null,
    profile,
    profileLoading,
    profileError,
  });

  useEffect(() => {
    if (!completed || !profile?.adultConfirmed) return;
    const requestedPath = (location.state as { from?: string } | null)?.from;
    const destination = requestedPath?.startsWith('/') && requestedPath !== '/confirm-age'
      ? requestedPath
      : '/';
    const timer = window.setTimeout(() => navigate(destination, { replace: true }), 900);
    return () => window.clearTimeout(timer);
  }, [completed, location.state, navigate, profile?.adultConfirmed]);

  if (access === 'loading-auth' || access === 'loading-profile') return <Loading />;
  if (access === 'signed-out') {
    return <Navigate to="/login" replace state={{ from: '/confirm-age' }} />;
  }
  if (access === 'profile-error') {
    return (
      <ProfileLoadError
        message={profileError}
        onRetry={async () => { await refreshProfile(); }}
      />
    );
  }
  if (access === 'allowed' && !completed && !submitting) return <Navigate to="/" replace />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!checked || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const confirmedProfile: Profile = await confirmAdultStatus();
      if (!confirmedProfile.adultConfirmed) {
        throw new Error(t('age.confirmError'));
      }
      setCompleted(true);
    } catch (confirmationError) {
      setError(confirmationError instanceof Error
        ? confirmationError.message
        : t('age.confirmError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-lg px-4 py-12" aria-labelledby="age-confirmation-title">
      <div className="card space-y-5">
        <div className="flex items-center justify-between">
          <Logo className="h-9" />
          <LangSwitch />
        </div>
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-soft text-primary">
            <ShieldCheck size={22} aria-hidden="true" />
          </span>
          <div>
            <h1 id="age-confirmation-title" className="text-2xl font-semibold">{t('age.title')}</h1>
            <p className="mt-2 text-sm leading-6 text-ink/70">{t('age.description')}</p>
          </div>
        </div>
        {completed ? (
          <p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-800">
            {t('age.success')}
          </p>
        ) : (
          <AdultDeclaration
            checked={checked}
            submitting={submitting}
            error={error}
            declaration={t('age.declaration')}
            continueLabel={t('age.continue')}
            submittingLabel={t('age.submitting')}
            onCheckedChange={setChecked}
            onSubmit={(event) => void submit(event)}
          />
        )}
        <p className="text-xs leading-5 text-ink/55">{t('age.privacyNote')}</p>
      </div>
    </section>
  );
}
