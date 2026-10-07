'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate sending reset email
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsLoading(false);
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="space-y-6">
        <div className="lg:hidden flex items-center gap-3 justify-center mb-8">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">G</span>
          </div>
          <span className="text-xl font-bold">GestionPro</span>
        </div>

        <div className="flex flex-col items-center text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Revisa tu correo</h1>
            <p className="text-muted-foreground">
              Hemos enviado instrucciones para restablecer tu contrasena a{' '}
              <span className="font-medium text-foreground">{email}</span>
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setIsSubmitted(false)}
          >
            Enviar de nuevo
          </Button>
          
          <Link href="/login">
            <Button variant="ghost" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al inicio de sesion
            </Button>
          </Link>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          No recibiste el correo? Revisa tu carpeta de spam o{' '}
          <button 
            onClick={() => setIsSubmitted(false)}
            className="text-primary hover:underline font-medium"
          >
            intenta con otro correo
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="lg:hidden flex items-center gap-3 justify-center mb-8">
        <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-lg">G</span>
        </div>
        <span className="text-xl font-bold">GestionPro</span>
      </div>

      <Link 
        href="/login"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver al inicio de sesion
      </Link>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Recuperar contrasena</h1>
        <p className="text-muted-foreground">
          Ingresa tu correo electronico y te enviaremos instrucciones para restablecer tu contrasena
        </p>
      </div>

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

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enviar instrucciones
        </Button>
      </form>
    </div>
  );
}
