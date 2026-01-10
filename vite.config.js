import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	base: '/lectionaryclock/',

	build: {
	    // Tell Vite to put the final website in /dist at the project root
	    // Since 'root' is 'app', we go up one level to find the root's /dist
	    outDir: 'dist',
	    emptyOutDir: true,
	  },

	  plugins: [
	    VitePWA({ 
	      registerType: 'autoUpdate',
	      // Optional: helps the PWA find the icons if they are in app/images
	      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
	      manifest: {
	        name: 'Lectionary Clock',
	        short_name: 'Lectionary',
	        description: 'A liturgical calendar for the year',
	        theme_color: '#ffffff',
	      }
	    })
  ]});