// portfolio_ui/tailwind.config.ts

import type { Config } from 'tailwindcss'

const config: Config = {
	darkMode: 'class',
	content: [
		'./src/pages/**/*.{js,ts,jsx,tsx,mdx}',
		'./src/components/**/*.{js,ts,jsx,tsx,mdx}',
		'./src/app/**/*.{js,ts,jsx,tsx,mdx}',
	],
	theme: {
		extend: {
			backgroundColor: {
				dark: '#1a1a1a',
			},
			colors: {
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					light: '#3b82f6',
					dark: '#60a5fa',
				},
				secondary: 'hsl(var(--secondary))',
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				foreground: 'hsl(var(--foreground))',
			},
			typography: {
				DEFAULT: {
					css: {
						'code::before': {
							content: '""',
						},
						'code::after': {
							content: '""',
						},
					},
				},
			},
		},
	},
	plugins: [require('@tailwindcss/typography')],
}

export default config
