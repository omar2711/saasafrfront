'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
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
    <div className="space-y-6">
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

      {/* Mobile logo */}
      <div className="lg:hidden flex items-center gap-3 justify-center mb-8">
        <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-lg">G</span>
        </div>
        <span className="text-xl font-bold">GestionPro</span>
      </div>

      <div className="space-y-2 text-center lg:text-left">
        <h1 className="text-2xl font-bold">Iniciar Sesion</h1>
        <p className="text-muted-foreground">
          Ingresa tus credenciales para acceder a tu cuenta
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Correo electronico</Label>
          <Input
            id="email"
            type="email"
            placeholder="tu@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Contrasena</Label>
            <Link
              href="/forgot-password"
              className="text-sm text-primary hover:underline"
            >
              Olvidaste tu contrasena?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="sr-only">
                {showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
              </span>
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox id="remember" />
          <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
            Recordar mi sesion
          </Label>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Iniciar Sesion
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        No tienes una cuenta?{' '}
        <Link href="/register" className="text-primary hover:underline font-medium">
          Registrate gratis
        </Link>
      </p>

      {/* Demo credentials */}
      <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-dashed space-y-1">
        <p className="text-xs font-semibold text-muted-foreground text-center mb-2">
          Usuarios demo (contraseña: Password123!)
        </p>
        {[
          { email: 'gerente@tecnologiaandina.bo', label: 'Gerente (acceso total)' },
          { email: 'vendedor1@tecnologiaandina.bo', label: 'Vendedor' },
          { email: 'almacen@tecnologiaandina.bo', label: 'Almacenero' },
        ].map(({ email: demoEmail, label }) => (
          <button
            key={demoEmail}
            type="button"
            className="w-full text-left text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
            onClick={() => { setEmail(demoEmail); setPassword('Password123!'); }}
          >
            <code className="bg-muted px-1 rounded">{demoEmail}</code>
            <span className="ml-2 text-muted-foreground/70">— {label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
