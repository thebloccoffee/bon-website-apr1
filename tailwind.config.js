/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
      fontFamily: {
        serif: ['var(--font-serif)'],
        sans: ['var(--font-sans)'],
      },
      /* ── DESIGN.md tokens, namespaced `tk-` ──
         Additive only. Existing utilities (text-xs, p-4, rounded-lg…)
         keep their stock values so other pages are untouched. */
      fontSize: {
        'tk-xs': ['var(--font-size-xs)', { lineHeight: '1.4' }],
        'tk-sm': ['var(--font-size-sm)', { lineHeight: '1.4' }],
        'tk-md': ['var(--font-size-md)', { lineHeight: '1.5' }],
        'tk-lg': ['var(--font-size-lg)', { lineHeight: '1.5' }],
        'tk-xl': ['var(--font-size-xl)', { lineHeight: '1.35' }],
        'tk-2xl': ['var(--font-size-2xl)', { lineHeight: 'var(--font-lineHeight-base)' }],
        'tk-3xl': ['var(--font-size-3xl)', { lineHeight: '1.3' }],
        'tk-4xl': ['var(--font-size-4xl)', { lineHeight: '1.2' }],
        'tk-display': ['var(--font-size-display)', { lineHeight: '1.1' }],
      },
      spacing: {
        'tk-1': 'var(--space-1)',
        'tk-2': 'var(--space-2)',
        'tk-3': 'var(--space-3)',
        'tk-4': 'var(--space-4)',
        'tk-5': 'var(--space-5)',
        'tk-6': 'var(--space-6)',
        'tk-7': 'var(--space-7)',
        'tk-8': 'var(--space-8)',
      },
      transitionDuration: {
        instant: 'var(--motion-duration-instant)',
        fast: 'var(--motion-duration-fast)',
        normal: 'var(--motion-duration-normal)',
      },
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
  			'tk-xs': 'var(--radius-xs)',
  			'tk-pill': 'var(--radius-pill)'
  		},
  		colors: {
  			tk: {
  				text: {
  					primary: 'var(--color-text-primary)',
  					secondary: 'var(--color-text-secondary)',
  					tertiary: 'var(--color-text-tertiary)',
  					inverse: 'var(--color-text-inverse)'
  				},
  				surface: {
  					base: 'var(--color-surface-base)',
  					muted: 'var(--color-surface-muted)',
  					raised: 'var(--color-surface-raised)'
  				},
  				border: 'var(--color-border-default)'
  			},
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		keyframes: {
  			'accordion-down': {
  				from: { height: '0' },
  				to: { height: 'var(--radix-accordion-content-height)' }
  			},
  			'accordion-up': {
  				from: { height: 'var(--radix-accordion-content-height)' },
  				to: { height: '0' }
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}