import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import tailwindcssPlugin from "tailwindcss/plugin";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      screens: {
        // Telefon obrócony do landscape (np. 844×390) nadal używa mobilnej
        // powłoki. Sidebar dopiero gdy jest też sensowna wysokość robocza.
        'desktop-shell': { raw: '(min-width: 768px) and (min-height: 600px)' },
      },
      fontFamily: {
        heading: ['Space Grotesk Variable', 'Inter Variable', 'sans-serif'],
        body: ['Inter Variable', 'sans-serif'],
        sans: ['Inter Variable', 'sans-serif'],
      },
      fontSize: {
        // Kinetic Precision editorial scale (DESIGN.md §3)
        'display-lg': ['3.5rem', { lineHeight: '1', letterSpacing: '-0.02em' }],
        'display-md': ['2.75rem', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'headline-lg': ['2rem', { lineHeight: '1.1', letterSpacing: '-0.01em' }],
        'label-md': ['0.75rem', { lineHeight: '1', letterSpacing: '0.08em' }],
      },
      colors: {
        surface: {
          DEFAULT: "hsl(var(--surface))",
          lowest: "hsl(var(--surface-lowest))",
          low: "hsl(var(--surface-low))",
          container: "hsl(var(--surface-container))",
          high: "hsl(var(--surface-high))",
          highest: "hsl(var(--surface-highest))",
        },
        "outline-variant": "hsl(var(--outline-variant))",
        "primary-light": "hsl(var(--primary-light))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        fitness: {
          cyan: "hsl(var(--fitness-cyan))",
          navy: "hsl(var(--fitness-navy))",
          success: "hsl(var(--fitness-success))",
          warning: "hsl(var(--fitness-warning))",
        },
        // A4 (X70): kolory wspierające palety dostają realne role w UI.
        // support-a = drugi akcent DANYCH (ikony kafli statystyk, druga seria
        // wykresów), support-b = akcent DEKORACYJNY (tinty banerów, poświata
        // hero, ikona księżyca). Fallback tokenów w index.css = --primary,
        // więc bez aktywnej palety wygląd pozostaje dotychczasowy.
        "support-a": {
          DEFAULT: "hsl(var(--palette-support-a))",
          foreground: "hsl(var(--palette-support-a-foreground))",
        },
        "support-b": {
          DEFAULT: "hsl(var(--palette-support-b))",
          foreground: "hsl(var(--palette-support-b-foreground))",
        },
      },
      textColor: {
        // Naprawa r1 (2026-08-21, sędzia "jeden akcent"): akcent jako TEKST idzie
        // przez --primary-text (fallback var(--primary) w index.css) — przy
        // ciemnych akcentach applyAccent podbija jasność do >= 4.5:1 na ciemnych
        // powierzchniach i tintach /15. Wypełnienia bg-primary bez zmian.
        primary: {
          DEFAULT: "hsl(var(--primary-text))",
          foreground: "hsl(var(--primary-foreground))",
        },
      },
      borderRadius: {
        xl: "1.5rem",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "typing-bounce": {
          "0%, 60%, 100%": {
            transform: "translateY(0)",
          },
          "30%": {
            transform: "translateY(-4px)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "typing-bounce": "typing-bounce 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [
    tailwindcssAnimate,
    // Z199: sticky hover w WKWebView — na dotyku :hover przykleja się po tapie
    // (przyciski zostawały "podświetlone"). Wariant globalny: WSZYSTKIE `hover:`
    // w apce działają wyłącznie przy realnym kursorze, bez ruszania 100+ komponentów.
    tailwindcssPlugin(({ addVariant }) => {
      addVariant("hover", "@media (hover: hover) and (pointer: fine) { &:hover }");
    }),
  ],
} satisfies Config;
