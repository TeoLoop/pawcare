import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PawCare — Salud & Medicación de Mascotas',
    short_name: 'PawCare',
    description: 'Gestión de salud, medicación y recordatorios de tus mascotas.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FAF8F5',
    theme_color: '#3E5A4D',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
