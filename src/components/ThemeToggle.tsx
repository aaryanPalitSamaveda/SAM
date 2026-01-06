import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const stored = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const initial = stored || 'dark';
    setTheme(initial);
    document.documentElement.classList.toggle('dark', initial === 'dark');
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={cn(
        "relative h-9 w-9 rounded-full transition-all duration-300",
        "hover:bg-secondary hover:shadow-elegant",
        className
      )}
      aria-label="Toggle theme"
    >
      <Sun 
        className={cn(
          "h-4 w-4 absolute transition-all duration-300",
          theme === 'dark' 
            ? "rotate-90 scale-0 opacity-0" 
            : "rotate-0 scale-100 opacity-100 text-gold-500"
        )} 
      />
      <Moon 
        className={cn(
          "h-4 w-4 absolute transition-all duration-300",
          theme === 'dark' 
            ? "rotate-0 scale-100 opacity-100 text-gold-400" 
            : "-rotate-90 scale-0 opacity-0"
        )} 
      />
    </Button>
  );
}
