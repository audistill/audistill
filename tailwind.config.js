/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Poppins', 'sans-serif'],
        body: ['-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        DEFAULT: '12px'
      }
    }
  },
  plugins: []
}
