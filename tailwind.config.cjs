const path = require('path');

/** Tailwind config for CDM web PoC.
 * Preflight disabled to avoid impacting existing global styles during spike.
 */
module.exports = {
  content: [
    path.join(__dirname, 'apps/web/index.html'),
    path.join(__dirname, 'apps/web/src/**/*.{ts,tsx}'),
    path.join(__dirname, 'packages/ui/**/*.{ts,tsx}'),
  ],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        primary: '#2F80ED',
        'primary-foreground': '#F7FBFF',
        surface: '#FFFFFF',
        'surface-muted': '#F8FAFC',
        border: '#E5E7EB',
        neutral: {
          900: '#111827',
          700: '#374151',
          100: '#F3F4F6',
        },
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#0EA5E9',
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
      },
      boxShadow: {
        sm: '0 4px 10px -2px rgba(15,23,42,0.15)',
        lg: '0 20px 60px -24px rgba(15,23,42,0.25)',
      },
      spacing: {
        18: '4.5rem',
        30: '7.5rem',
      },
      fontSize: {
        display: ['2.75rem', { lineHeight: '1.1' }],
      },
    },
  },
  plugins: [],
};
