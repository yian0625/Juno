import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['var(--font-geist-sans)', 'ui-serif', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
        sans: ['var(--font-geist-sans)', 'ui-sans-serif', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
      },
      colors: {
        'primary-green': '#575752',
        'bg-paper': '#F2F2F0',
        'card-white': '#FFFFFF',
        'beige-100': '#EBEBE8',
        'stone-50': '#FAFAF9',
      },
    },
  },
  plugins: [],
} satisfies Config;

