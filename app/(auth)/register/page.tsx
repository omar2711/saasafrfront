'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    name: '',
    email: '',
    password: '',
    acceptTerms: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate registration
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Redirect to tenant dashboard
    router.push('/mi-tienda/dashboard');
  };

  const passwordRequirements = [
    { label: 'Minimo 8 caracteres', met: formData.password.length >= 8 },
    { label: 'Al menos una mayuscula', met: /[A-Z]/.test(formData.password) },
    { label: 'Al menos un numero', met: /[0-9]/.test(formData.password) },
  ];

  return (
    <div className="space-y-6">
      {/* Mobile logo */}
      <div className="lg:hidden flex items-center gap-3 justify-center mb-8">
        <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-lg">G</span>
        </div>
        <span className="text-xl font-bold">GestionPro</span>
      </div>

      <div className="space-y-2 text-center lg:text-left">
        <h1 className="text-2xl font-bold">Crear cuenta</h1>
        <p className="text-muted-foreground">
          Comienza tu prueba gratuita de 14 dias
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="companyName">Nombre de tu empresa</Label>
          <Input
            id="companyName"
            placeholder="Mi Empresa S.A."
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Tu nombre completo</Label>
          <Input
            id="name"
            placeholder="Juan Perez"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Correo electronico</Label>
          <Input
            id="email"
            type="email"
            placeholder="tu@empresa.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Contrasena</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="********"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
            </Button>
          </div>
          {formData.password && (
            <div className="space-y-1.5 mt-2">
              {passwordRequirements.map((req) => (
                <div key={req.label} className="flex items-center gap-2 text-xs">
                  <div className={`h-4 w-4 rounded-full flex items-center justify-center ${
                    req.met ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'
                  }`}>
                    {req.met && <Check className="h-3 w-3" />}
                  </div>
                  <span className={req.met ? 'text-green-600' : 'text-muted-foreground'}>
                    {req.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-start space-x-2">
          <Checkbox
            id="terms"
            checked={formData.acceptTerms}
            onCheckedChange={(checked) => 
              setFormData({ ...formData, acceptTerms: checked as boolean })
            }
          />
          <Label htmlFor="terms" className="text-sm font-normal cursor-pointer leading-relaxed">
            Acepto los{' '}
            <Link href="/terms" className="text-primary hover:underline">
              terminos de servicio
            </Link>{' '}
            y la{' '}
            <Link href="/privacy" className="text-primary hover:underline">
              politica de privacidad
            </Link>
          </Label>
        </div>

        <Button 
          type="submit" 
          className="w-full" 
          disabled={isLoading || !formData.acceptTerms}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Crear cuenta gratis
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Ya tienes una cuenta?{' '}
        <Link href="/login" className="text-primary hover:underline font-medium">
          Iniciar sesion
        </Link>
      </p>
    </div>
  );
}
