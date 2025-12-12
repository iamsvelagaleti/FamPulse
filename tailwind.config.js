export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                glass: {
                    light: 'rgba(255, 255, 255, 0.1)',
                    medium: 'rgba(255, 255, 255, 0.15)',
                    dark: 'rgba(0, 0, 0, 0.1)',
                },
                primary: {
                    50: '#f5f7ff',
                    100: '#ebf0ff',
                    200: '#d6e0ff',
                    300: '#b3c7ff',
                    400: '#7a9dff',
                    500: '#667eea',
                    600: '#5568d3',
                    700: '#4451b8',
                    800: '#374191',
                    900: '#2d356e',
                },
                secondary: {
                    500: '#764ba2',
                    600: '#5f3c82',
                },
            },
            backdropBlur: {
                xs: '4px',
                '3xl': '32px',
            },
            boxShadow: {
                'glass': '0 8px 32px rgba(0, 0, 0, 0.1)',
                'glass-lg': '0 16px 48px rgba(0, 0, 0, 0.15)',
                'inner-glow': 'inset 0 0 20px rgba(255, 255, 255, 0.1)',
            },
            borderRadius: {
                'ios': '20px',
                'ios-lg': '24px',
                'ios-xl': '28px',
            },
            animation: {
                'slide-up': 'slide-in-up 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                'slide-right': 'slide-in-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                'fade-in': 'fade-in 0.3s ease-out',
                'scale-in': 'scale-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                'shimmer': 'shimmer 2s infinite',
                'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
            },
            fontFamily: {
                'ios': ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'Roboto', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
