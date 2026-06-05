/**
 * Dashboard Configuration
 * Edit this file on your computer to set your preferences.
 * These values serve as the defaults. Overrides can be set in the on-screen Settings panel.
 */
window.DASHBOARD_CONFIG = {
  // Global Settings
  refreshInterval: 60,       // Time in seconds before cycling to the next plugin page (0 to disable auto-cycle)
  flashRefresh: true,        // Toggle the signature black e-paper refresh flash during page changes
  theme: 'paper',            // 'paper' (warm monochrome), 'coal' (dark mode), 'stark' (high contrast black & white)

  // Personal Settings
  birthdate: '1995-04-12',   // Used to calculate "Your Life in Weeks" (YYYY-MM-DD)

  // Weather Coordinates (Default: Helsinki, FI)
  latitude: 60.1699,
  longitude: 24.9384,
  locationName: 'Helsinki',
  tempUnit: 'celsius',       // 'celsius' or 'fahrenheit'
  windSpeedUnit: 'kmh',      // 'kmh', 'mph', or 'ms'

};
