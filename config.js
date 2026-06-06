/**
 * Dashboard Configuration
 * Edit this file on your computer to set your preferences.
 * These values serve as the defaults. Overrides can be set in the on-screen Settings panel.
 */
window.DASHBOARD_CONFIG = {
  // Global Settings
  refreshInterval: 60,       // Time in seconds before cycling to the next plugin page (0 to disable auto-cycle)
  flashRefresh: true,        // Toggle the signature black e-paper refresh flash during page changes
  theme: 'paper',            // 'paper' (warm monochrome), 'coal' (dark mode), 'stark' (high contrast B&W), 'ft' (Financial Times yellowish), 'auto' (adopts dark mode at night)

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
};
