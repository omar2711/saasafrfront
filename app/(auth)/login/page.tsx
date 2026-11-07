'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronDown, Eye, EyeOff, Loader2, TriangleAlert } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { authApi } from '@/lib/api/auth';
import { organizationsApi } from '@/lib/api/organizations';
import { setAuth, clearAuth, ApiError } from '@/lib/api-client';

const inputClass =
  'h-11 rounded-lg border-[var(--paper-ink)]/20 bg-white text-[15px] shadow-none placeholder:text-[var(--muted-ink)]/60 focus-visible:border-[var(--brand)] focus-visible:ring-[3px] focus-visible:ring-[var(--brand)]/20';

const demoUsers = [
  { email: 'gerente@tecnologiaandina.bo', label: 'Propietario', hint: 'Acceso total' },
  { email: 'vendedor1@tecnologiaandina.bo', label: 'Vendedor', hint: 'Ventas' },
  { email: 'almacen@tecnologiaandina.bo', label: 'Almacenero', hint: 'Inventario' },
];

export default function LoginPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showDemo, setShowDemo] = useState(false);
  // Fuera de horario se pidió explícitamente un aviso emergente, no una línea
  // roja más en el formulario.
  const [scheduleNotice, setScheduleNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setScheduleNotice(null);

    try {
      const loginResult = await authApi.login(email, password);

      // Store tokens temporarily to call /auth/me
      localStorage.setItem('access_token', loginResult.accessToken);
      localStorage.setItem('refresh_token', loginResult.refreshToken);
      localStorage.setItem('session_id', loginResult.sessionId);

      const me = await authApi.me();

      if (me.isSuperAdmin || me.platformRole === 'accountant') {
        localStorage.setItem('is_super_admin', String(!!me.isSuperAdmin));
        localStorage.setItem('user_email', email);
        router.push(me.platformRole === 'accountant' ? '/admin/finance' : '/admin/dashboard');
        return;
      }

      const orgs = await organizationsApi.list();

      if (!orgs || orgs.length === 0) {
        setError('Tu cuenta no pertenece a ninguna organización.');
        clearAuth();
        setIsLoading(false);
        return;
      }

      const org = orgs[0];
      setAuth(loginResult.accessToken, org.id);
      localStorage.setItem('user_email', email);

      router.push('/mi-tienda/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión';
      // El backend distingue el motivo con `code`; sin eso un 403 por horario
      // sería indistinguible de uno por permisos.
      if (err instanceof ApiError && err.code === 'OUTSIDE_WORK_SCHEDULE') {
        setScheduleNotice(msg);
      } else {
        setError(
          msg.toLowerCase().includes('credenciales') || msg.includes('401')
            ? 'Credenciales incorrectas. Verifica tu email y contraseña.'
            : msg,
        );
      }
      clearAuth();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-7"
    >
      <AlertDialog
        open={scheduleNotice !== null}
        onOpenChange={(open) => !open && setScheduleNotice(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fuera del horario laboral</AlertDialogTitle>
            <AlertDialogDescription>{scheduleNotice}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setScheduleNotice(null)}>Entendido</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Logo (solo móvil; en escritorio está en el panel izquierdo) */}
      <Link href="/" className="flex items-center gap-3 lg:hidden">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--brand)] font-mono text-base font-bold text-white">
          G
        </span>
        <span className="text-lg font-semibold tracking-tight">GestiónPro</span>
      </Link>

      <div className="space-y-1.5">
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.02em]">Iniciar sesión</h1>
        <p className="text-[15px] text-[var(--muted-ink)]">
          Ingresa tus credenciales para acceder a tu cuenta
        </p>
      </div>

      <AnimatePresence initial={false}>
        {error && (
          <motion.div
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium">
            Correo electrónico
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="tu@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium">
              Contraseña
            </Label>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-[var(--brand-deep)] hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className={`${inputClass} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[var(--muted-ink)] transition-colors hover:bg-[var(--paper-2)] hover:text-[var(--paper-ink)]"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span className="sr-only">
                {showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              </span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox id="remember" />
          <Label htmlFor="remember" className="cursor-pointer text-sm font-normal text-[var(--muted-ink)]">
            Recordar mi sesión
          </Label>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand)] text-[15px] font-semibold text-white transition-colors hover:bg-[var(--brand-deep)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--brand)]/30 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isLoading ? 'Ingresando…' : 'Iniciar sesión'}
        </button>
      </form>

      <p className="text-center text-sm text-[var(--muted-ink)]">
        ¿No tienes una cuenta?{' '}
        <Link href="/register" className="font-semibold text-[var(--brand-deep)] hover:underline">
          Regístrate gratis
        </Link>
      </p>

      {/* Usuarios demo (plegable para no ensuciar el formulario) */}
      <div className="border-t border-[var(--paper-ink)]/10 pt-5">
        <button
          type="button"
          onClick={() => setShowDemo(!showDemo)}
          aria-expanded={showDemo}
          className="flex w-full items-center justify-between text-sm text-[var(--muted-ink)] transition-colors hover:text-[var(--paper-ink)]"
        >
          Probar con una cuenta demo
          <ChevronDown className={`h-4 w-4 transition-transform ${showDemo ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence initial={false}>
          {showDemo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="space-y-1.5 pt-3">
                {demoUsers.map(({ email: demoEmail, label, hint }) => (
                  <button
                    key={demoEmail}
                    type="button"
                    onClick={() => {
                      setEmail(demoEmail);
                      setPassword('Password123!');
                    }}
                    className="flex w-full items-center justify-between rounded-lg border border-[var(--paper-ink)]/10 px-3 py-2 text-left text-sm transition-colors hover:border-[var(--brand)]/40 hover:bg-[var(--brand)]/[0.04]"
                  >
                    <span className="font-medium">{label}</span>
                    <span className="text-xs text-[var(--muted-ink)]">{hint}</span>
                  </button>
                ))}
                <p className="pt-1 text-xs text-[var(--muted-ink)]">
                  Contraseña de todas: <code className="font-mono">Password123!</code>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
