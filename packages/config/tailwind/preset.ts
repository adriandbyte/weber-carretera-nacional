import type { Config } from 'tailwindcss';

/// Tokens de la marca. Toman como base la paleta de Weber (negro, rojo de
/// fuego, acero) pero con acentos y tipografia propios para que el sitio se
/// sienta de la casa y no una copia calcada.
export const preset = {
  theme: {
    extend: {
      colors: {
        carbon: {
          50: '#F6F6F5',
          100: '#E7E7E5',
          200: '#C9C9C5',
          300: '#A3A39D',
          400: '#6F6F69',
          500: '#4A4A45',
          600: '#33332F',
          700: '#242421',
          800: '#171715',
          900: '#0D0D0C',
        },
        ember: {
          50: '#FFF3EE',
          100: '#FFE0D4',
          200: '#FFB89E',
          300: '#FF8B62',
          400: '#F4602F',
          500: '#D9400F',
          600: '#B22F09',
          700: '#8A2407',
          800: '#5E1804',
          900: '#3A0F02',
        },
        steel: {
          100: '#F0F2F4',
          300: '#C4CBD2',
          500: '#8892A0',
          700: '#4C5666',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      borderRadius: {
        card: '0.75rem',
      },
    },
  },
} satisfies Omit<Config, 'content'>;

export default preset;
