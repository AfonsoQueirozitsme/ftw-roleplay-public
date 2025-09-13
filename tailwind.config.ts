import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
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
      scale: {
        '102': '1.02', // permite usar hover:scale-102
      },
      fontFamily: {
        display: ["SF Pro Display", "system-ui", "sans-serif"],
        body: ["SF Pro Text", "system-ui", "sans-serif"],
        gaming: ["SF Pro Display", "system-ui", "sans-serif"],
      },
      /**
       * IMPORTANTE: usar " / <alpha-value>" permite classes com /20, /40, etc.
       */
      colors: {
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",

        // Flat para suportar "border-glass-border/20"
        "glass-border": "hsl(var(--glass-border) / <alpha-value>)",

        background: {
          DEFAULT: "hsl(var(--background) / <alpha-value>)",
          secondary: "hsl(var(--background-secondary) / <alpha-value>)",
          tertiary: "hsl(var(--background-tertiary) / <alpha-value>)",
        },
        foreground: "hsl(var(--foreground) / <alpha-value>)",

        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
          glow: "hsl(var(--primary-glow) / <alpha-value>)",
          dark: "hsl(var(--primary-dark) / <alpha-value>)",
          muted: "hsl(var(--primary-muted) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
          muted: "hsl(var(--secondary-muted) / <alpha-value>)",
        },
        glass: {
          DEFAULT: "hsl(var(--glass) / <alpha-value>)",
          border: "hsl(var(--glass-border) / <alpha-value>)",
          foreground: "hsl(var(--glass-foreground) / <alpha-value>)",
          subtle: "hsl(var(--glass-subtle) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
          muted: "hsl(var(--accent-muted) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
          elevated: "hsl(var(--card-elevated) / <alpha-value>)",
          glass: "hsl(var(--card-glass) / <alpha-value>)",
        },
        border: {
          DEFAULT: "hsl(var(--border) / <alpha-value>)",
          muted: "hsl(var(--border-muted) / <alpha-value>)",
          glass: "hsl(var(--border-glass) / <alpha-value>)",
        },
        success: "hsl(var(--success) / <alpha-value>)",
        warning: "hsl(var(--warning) / <alpha-value>)",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-foreground) / <alpha-value>)",
          primary: "hsl(var(--sidebar-primary) / <alpha-value>)",
          "primary-foreground":
            "hsl(var(--sidebar-primary-foreground) / <alpha-value>)",
          accent: "hsl(var(--sidebar-accent) / <alpha-value>)",
          "accent-foreground":
            "hsl(var(--sidebar-accent-foreground) / <alpha-value>)",
          border: "hsl(var(--sidebar-border) / <alpha-value>)",
          ring: "hsl(var(--sidebar-ring) / <alpha-value>)",
        },
      },

      backgroundImage: {
        "gradient-primary": "var(--gradient-primary)",
        "gradient-hero": "var(--gradient-hero)",
        "gradient-glass": "var(--gradient-glass)",
        "gradient-card": "var(--gradient-card)",
      },

      /**
       * Sombra normal + uma versão mais suave (-20) para hover.
       * Podes usar: hover:shadow-glow  ou  hover:shadow-glow-20
       */
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        primary: "var(--shadow-primary)",
        glass: "var(--shadow-glass)",
        glow: "var(--glow-primary)",
        "glow-10": "0 8px 30px rgba(80, 120, 255, 0.10)", // intensidade mais fraca

        // intensidade mais baixa para estados hover/active
        "glow-20": "0 8px 30px rgba(80, 120, 255, 0.20)",
      },

      backdropBlur: {
        glass: "20px",
        subtle: "12px",
      },

      borderRadius: {
        lg: "var(--radius)",
        xl: "var(--radius-lg)",
        "2xl": "var(--radius-xl)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "glow-pulse": {
          "0%, 100%": {
            boxShadow: "0 0 20px hsla(280, 100%, 70%, 0.4)",
            transform: "scale(1)",
          },
          "50%": {
            boxShadow: "0 0 40px hsla(280, 100%, 70%, 0.6)",
            transform: "scale(1.02)",
          },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-8px) rotate(1deg)" },
        },
        "slide-up": {
          "0%": {
            transform: "translateY(60px)",
            opacity: "0",
            filter: "blur(4px)",
          },
          "100%": {
            transform: "translateY(0)",
            opacity: "1",
            filter: "blur(0px)",
          },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "bounce-subtle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.3s cubic-bezier(0.23, 1, 0.32, 1)",
        "accordion-up": "accordion-up 0.3s cubic-bezier(0.23, 1, 0.32, 1)",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        float: "float 4s ease-in-out infinite",
        "slide-up": "slide-up 0.6s cubic-bezier(0.23, 1, 0.32, 1)",
        "fade-in": "fade-in 0.5s cubic-bezier(0.23, 1, 0.32, 1)",
        "scale-in": "scale-in 0.4s cubic-bezier(0.23, 1, 0.32, 1)",
        shimmer: "shimmer 2s linear infinite",
        "bounce-subtle": "bounce-subtle 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
