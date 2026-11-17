'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Check, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

const inputClass =
  'h-11 rounded-lg border-[var(--paper-ink)]/20 bg-white text-[15px] shadow-none placeholder:text-[var(--muted-ink)]/60 focus-visible:border-[var(--brand)] focus-visible:ring-[3px] focus-visible:ring-[var(--brand)]/20';

// Los requisitos de la contraseña aparecen 2 segundos después de empezar a escribirla.
const REQUIREMENTS_DELAY_MS = 2000;

export default function RegisterPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    name: '',
    email: '',
    password: '',
    acceptTerms: false,
  });

  const hasPassword = formData.password.length > 0;

  useEffect(() => {
    if (!hasPassword) {
      setShowRequirements(false);
      return;
    }
    const id = setTimeout(() => setShowRequirements(true), REQUIREMENTS_DELAY_MS);
    return () => clearTimeout(id);
  }, [hasPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate registration
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Redirect to tenant dashboard
    router.push('/mi-tienda/dashboard');
  };

  const passwordRequirements = [
    { label: 'Mínimo 8 caracteres', met: formData.password.length >= 8 },
    { label: 'Al menos una mayúscula', met: /[A-Z]/.test(formData.password) },
    { label: 'Al menos un número', met: /[0-9]/.test(formData.password) },
  ];

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-7"
    >
      {/* Logo (solo móvil; en escritorio está en el panel izquierdo) */}
      <Link href="/" className="flex items-center gap-3 lg:hidden">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--brand)] font-mono text-base font-bold text-white">
          G
        </span>
        <span className="text-lg font-semibold tracking-tight">GestiónPro</span>
      </Link>

      <div className="space-y-1.5">
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.02em]">Crear cuenta</h1>
        <p className="text-[15px] text-[var(--muted-ink)]">
          Comienza tu prueba gratuita de 14 días
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="companyName" className="text-sm font-medium">
            Nombre de tu empresa
          </Label>
          <Input
            id="companyName"
            autoComplete="organization"
            placeholder="Mi Empresa S.A."
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            required
            disabled={isLoading}
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-sm font-medium">
            Tu nombre completo
          </Label>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Nombre y apellido"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            disabled={isLoading}
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium">
            Correo electrónico
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="tu@empresa.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            disabled={isLoading}
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm font-medium">
            Contraseña
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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

          <AnimatePresence initial={false}>
            {showRequirements && (
              <motion.ul
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-1.5 overflow-hidden pt-2"
              >
                {passwordRequirements.map((req, i) => (
                  <motion.li
                    key={req.label}
                    initial={reduceMotion ? false : { opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.08 }}
                    className={`flex items-center gap-2 text-xs transition-colors ${
                      req.met ? 'text-emerald-600' : 'text-[var(--muted-ink)]'
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded-full transition-colors ${
                        req.met ? 'bg-emerald-100 text-emerald-600' : 'bg-[var(--paper-2)]'
                      }`}
                    >
                      {req.met && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                    {req.label}
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-start gap-2.5">
          <Checkbox
            id="terms"
            className="mt-0.5"
            checked={formData.acceptTerms}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, acceptTerms: checked as boolean })
            }
          />
          <Label
            htmlFor="terms"
            className="cursor-pointer text-sm font-normal leading-relaxed text-[var(--muted-ink)]"
          >
            Acepto los{' '}
            <Link href="/terms" className="font-medium text-[var(--brand-deep)] hover:underline">
              términos de servicio
            </Link>{' '}
            y la{' '}
            <Link href="/privacy" className="font-medium text-[var(--brand-deep)] hover:underline">
              política de privacidad
            </Link>
          </Label>
        </div>

        <button
          type="submit"
          disabled={isLoading || !formData.acceptTerms}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand)] text-[15px] font-semibold text-white transition-colors hover:bg-[var(--brand-deep)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--brand)]/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isLoading ? 'Creando cuenta…' : 'Crear cuenta gratis'}
        </button>
      </form>

      <p className="text-center text-sm text-[var(--muted-ink)]">
        ¿Ya tienes una cuenta?{' '}
        <Link href="/login" className="font-semibold text-[var(--brand-deep)] hover:underline">
          Iniciar sesión
        </Link>
      </p>
    </motion.div>
  );
}
