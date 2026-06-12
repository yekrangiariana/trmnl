/**
 * Dashboard Configuration
 * Edit this file on your computer to set your preferences.
 * These values serve as the defaults. Overrides can be set in the on-screen Settings panel.
 */
window.DASHBOARD_CONFIG = {
  // Global Settings
  refreshInterval: 60,       // Time in seconds before cycling to the next plugin page (0 to disable auto-cycle)
  flashRefresh: true,        // Toggle the signature black e-paper refresh flash during page changes
  theme: 'auto',             // 'eink-white', 'eink-dark', 'warm', 'navy', 'programmer', 'auto' (adopts dark mode at night)
  scalingMode: 'full',       // Display scaling mode: 'full' (stretch to fill screen), 'fit' (scale keeping aspect ratio), 'ipad' (fixed 1024x768 for iPad Mini 2)
  clockPlacement: 'middle-center', // 'top-left', 'top-center', 'top-right', 'middle-left', 'middle-center', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right'
  clockComposition: 'comp-default', // 'comp-default', 'comp-split', 'comp-retro', 'comp-clean-left'

  // Personal Settings
  birthdate: '1995-04-12',   // Used to calculate "Your Life in Weeks" (YYYY-MM-DD)

  // Weather Coordinates (Default: Helsinki, FI)
  latitude: 60.1699,
  longitude: 24.9384,
  locationName: 'Helsinki',
  tempUnit: 'celsius',       // 'celsius' or 'fahrenheit'
  windSpeedUnit: 'kmh',      // 'kmh', 'mph', or 'ms'

  // HSL Transport (Helsinki Region Transport — Digitransit API)
  // Enter a neighbourhood name OR street address — stops within custom radius found automatically.
  // Examples: 'Kallio', 'Suvelantie 14', 'Pasila', 'Töölö', 'Kamppi'
  hslNeighbourhood: 'Kallio',
  hslRadius: 700,

  // Digitransit API key — required for HSL live departures.
  // Get a FREE key at: https://portal-api.digitransit.fi
  // (Register → Products → HSL → Subscribe → copy Primary Key)
  digitransitApiKey: '',

  // Todoist Settings
  todoistApiKey: '',         // Paste your Todoist Personal API Token here
  todoistFilter: 'today | overdue', // Todoist filter query (e.g. 'today | overdue', '#Inbox', 'priority 4')
  todoistMaxTasks: 6,        // Maximum number of tasks to display (1 to 15)

  // Wikipedia History Settings
  historyShowBirthsDeaths: false,     // Toggle to show/hide births and deaths
  historyEventMode: 'mix',       // Event selection mode: 'default' (newest first), 'oldest' (oldest first), 'mix' (mix of oldest, middle, recent)

  // Wallpaper Settings
  // If your static host does not support directory listings, list your wallpaper filenames here:
  availableWallpapers: [
    'scene-1.jpg',
    'scene-2.jpg',
    'scene-3.jpg',
    'scene-4.jpg',
    'scene-5.jpg',
    'scene-6.jpg',
    'scene-7.jpg',
    'scene-8.jpg'
  ],

  // Plugin Settings
  plugins: {
    time: {
      enabled: true,
      showInCarousel: true,
      showInQuickMenu: true
    },
    finnish_idioms: {
      enabled: true
    }
  }
};
