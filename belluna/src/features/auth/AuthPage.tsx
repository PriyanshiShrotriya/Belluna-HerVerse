import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import Logo from '../../components/Logo';
import { LangSwitch } from '../../components/Layout';
import { useT } from '../../i18n/t';
import { useAuth } from '../../app/stubs/auth';
import { ErrorBox } from '../../components/States';

const schema = z.object({ email: z.string().email(), password: z.string().min(8) });
type Form = z.infer<typeof schema>;

export default function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const { t } = useT();
  const { signIn, signUp } = useAuth();
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const [show, setShow] = useState(false);
  const [err, setErr] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });
  const onSubmit = async (v: Form) => {
    setErr(false);
    try { await (mode === 'login' ? signIn : signUp)(v.email, v.password); nav(loc.state?.from ?? '/', { replace: true }); }
    catch { setErr(true); }
  };
  return (
    <div className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4 py-10">
      <div className="card w-full">
        <div className="flex items-center justify-between"><Logo className="h-10" /><LangSwitch /></div>
        <h1 className="mt-6 text-2xl font-semibold">{t(mode === 'login' ? 'auth.login' : 'auth.signup')}</h1>
        <p className="mt-1 text-sm text-ink/70">{t('auth.stub')}</p>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">{t('auth.email')}</label>
            <input id="email" type="email" autoComplete="email" className="input" aria-invalid={!!errors.email} {...register('email')} />
            {errors.email && <p role="alert" className="mt-1 text-sm text-[#B42318]">{t('auth.err.email')}</p>}
          </div>
          <div>
            <label htmlFor="pw" className="mb-1 block text-sm font-medium">{t('auth.password')}</label>
            <div className="relative">
              <input id="pw" type={show ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="input pr-12" aria-invalid={!!errors.password} {...register('password')} />
              <button type="button" onClick={() => setShow(!show)} aria-label={t(show ? 'auth.hide' : 'auth.show')} className="absolute right-1 top-0 grid h-[44px] w-[44px] place-items-center text-ink/70">{show ? <EyeOff size={20} /> : <Eye size={20} />}</button>
            </div>
            {errors.password && <p role="alert" className="mt-1 text-sm text-[#B42318]">{t('auth.err.password')}</p>}
          </div>
          {err && <ErrorBox />}
          <button className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? t('auth.working') : t(mode === 'login' ? 'auth.submit.login' : 'auth.submit.signup')}</button>
        </form>
        <p className="mt-4 text-sm">{t(mode === 'login' ? 'auth.noaccount' : 'auth.haveaccount')}{' '}
          <Link className="font-medium text-primary underline" to={mode === 'login' ? '/signup' : '/login'}>{t(mode === 'login' ? 'nav.signup' : 'nav.login')}</Link></p>
      </div>
    </div>
  );
}
