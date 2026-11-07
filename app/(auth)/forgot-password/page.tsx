'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const inputClass =
  'h-11 rounded-lg border-[var(--paper-ink)]/20 bg-white text-[15px] shadow-none placeholder:text-[var(--muted-ink)]/60 focus-visible:border-[var(--brand)] focus-visible:ring-[3px] focus-visible:ring-[var(--brand)]/20';

const primaryButtonClass =
  'flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand)] text-[15px] font-semibold text-white transition-colors hover:bg-[var(--brand-deep)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--brand)]/30 disabled:cursor-not-allowed disabled:opacity-70';

const secondaryButtonClass =
  'flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[var(--paper-ink)]/20 bg-white text-[15px] font-medium transition-colors hover:bg-[var(--paper-2)]';

function MobileLogo() {
  return (
    <Link href="/" className="flex items-center gap-3 lg:hidden">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--brand)] font-mono text-base font-bold text-white">
        G
      </span>
      <span className="text-lg font-semibold tracking-tight">GestiónPro</span>
    </Link>
  );
}

export default function ForgotPasswordPage() {
  const reduceMotion = useReducedMotion();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate sending reset email
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsLoading(false);
    setIsSubmitted(true);
  };

  const motionProps = {
    initial: reduceMotion ? false : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  };

  if (isSubmitted) {
    return (
      <motion.div {...motionProps} className="space-y-7">
        <MobileLogo />

        <div className="space-y-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand)]/10 text-[var(--brand-deep)]">
            <Mail className="h-7 w-7" />
          </span>
          <div className="space-y-1.5">
            <h1 className="text-[1.75rem] font-semibold tracking-[-0.02em]">Revisa tu correo</h1>
            <p className="text-[15px] text-[var(--muted-ink)]">
              Hemos enviado instrucciones para restablecer tu contraseña a{' '}
              <span className="font-medium text-[var(--paper-ink)]">{email}</span>
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <button type="button" className={secondaryButtonClass} onClick={() => setIsSubmitted(false)}>
            Enviar de nuevo
          </button>
          <Link href="/login" className={secondaryButtonClass}>
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio de sesión
          </Link>
        </div>

        <p className="text-center text-sm text-[var(--muted-ink)]">
          ¿No recibiste el correo? Revisa tu carpeta de spam o{' '}
          <button
            type="button"
            onClick={() => setIsSubmitted(false)}
            className="font-semibold text-[var(--brand-deep)] hover:underline"
          >
            intenta con otro correo
          </button>
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div {...motionProps} className="space-y-7">
      <MobileLogo />

      <Link
        href="/login"
        className="inline-flex items-center text-sm text-[var(--muted-ink)] transition-colors hover:text-[var(--paper-ink)]"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver al inicio de sesión
      </Link>

      <div className="space-y-1.5">
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.02em]">Recuperar contraseña</h1>
        <p className="text-[15px] text-[var(--muted-ink)]">
          Ingresa tu correo electrónico y te enviaremos instrucciones para restablecer tu contraseña
        </p>
      </div>

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

        <button type="submit" disabled={isLoading} className={primaryButtonClass}>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isLoading ? 'Enviando…' : 'Enviar instrucciones'}
        </button>
      </form>
    </motion.div>
  );
}
