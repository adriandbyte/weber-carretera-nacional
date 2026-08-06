'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const OPTIONS = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
  { value: 'system', label: 'El del sistema', icon: Monitor },
] as const;

/// Selector de tema. Tres opciones y no un interruptor de dos, porque "el del
/// sistema" es lo que hace que el panel se ponga oscuro solo al anochecer en
/// quien ya lo tiene configurado asi.
export function ModeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  // El servidor no sabe que tema tiene guardado el navegador. Pintar un icono
  // antes de saberlo produce un desajuste de hidratacion y, peor, un cambio de
  // icono visible al cargar cada pagina.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const Icon = mounted && resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Cambiar tema">
          <Icon className={mounted ? undefined : 'opacity-0'} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {OPTIONS.map((option) => (
          <DropdownMenuItem key={option.value} onClick={() => setTheme(option.value)}>
            <option.icon />
            {option.label}
            {mounted && theme === option.value && <Check className="ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
