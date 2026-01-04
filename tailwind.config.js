/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                'marker': ['"Permanent Marker"', 'cursive'],
                'luckiest': ['"Luckiest Guy"', 'cursive'],
                'sans': ['"Manrope"', 'sans-serif'],
            },
            colors: {
                'nsp-teal': '#0f3c3a',
                'nsp-dark-teal': '#052120',
                'nsp-orange': '#f08920',
                'nsp-red': '#d93a26',
                'nsp-yellow': '#fccb56',
            }
        },
    },
    plugins: [],
}
