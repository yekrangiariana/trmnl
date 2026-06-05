/**
 * Sunrise & Sunset Plugin for TRMNL Dashboard
 * Fetches solar phase transitions for Today and Tomorrow using Open-Meteo.
 */

(function() {
  'use strict';

  var SunPlugin = {
    id: 'sun',
    name: 'Sunrise & Sunset',
    config: {},
    container: null,

    init: function(pluginConfig) {
      this.config = pluginConfig || {};
    },

    render: function(element) {
      this.container = element;
      this.container.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100%;font-family:var(--font-mono);font-size:16px;">RETRIEVING SUNRISE & SUNSET DATA...</div>';
    },

    update: function() {
      var self = this;
      var activeConfig = window.Dashboard ? window.Dashboard.getActiveConfig() : {};
      var lat = activeConfig.latitude !== undefined ? activeConfig.latitude : 60.1699;
      var lon = activeConfig.longitude !== undefined ? activeConfig.longitude : 24.9384;

      var url = "https://api.open-meteo.com/v1/forecast?" +
                "latitude=" + lat +
                "&longitude=" + lon +
                "&daily=sunrise,sunset" +
                "&timezone=auto";

      fetch(url)
        .then(function(response) {
          if (!response.ok) throw new Error("HTTP error " + response.status);
          return response.json();
        })
        .then(function(data) {
          self.renderSolarTimes(data.daily || {});
        })
        .catch(function(err) {
          console.error("Solar data fetch failed:", err);
          self.renderError();
        });
    },

    formatTimeAMPM: function(isoStr) {
      if (!isoStr) return "--:-- AM";
      var parts = isoStr.split('T')[1];
      if (!parts) return "--:-- AM";
      
      var hm = parts.substring(0, 5).split(':');
      var h = parseInt(hm[0], 10);
      var m = hm[1];
      
      var ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      h = h ? h : 12; // 0 is 12
      
      return h + ':' + m + ' ' + ampm;
    },

    renderSolarTimes: function(daily) {
      var todayRise = daily.sunrise ? this.formatTimeAMPM(daily.sunrise[0]) : '--:-- AM';
      var todaySet = daily.sunset ? this.formatTimeAMPM(daily.sunset[0]) : '--:-- PM';
      var tomorrowRise = daily.sunrise ? this.formatTimeAMPM(daily.sunrise[1]) : '--:-- AM';
      var tomorrowSet = daily.sunset ? this.formatTimeAMPM(daily.sunset[1]) : '--:-- PM';

      var html = '<div style="display:flex; flex-direction:column; height:100%; justify-content:space-between; padding: 12px 0;">';

      // 1. TODAY SECTION
      html += '  <div style="flex:1; display:flex; flex-direction:column; justify-content:center;">';
      html += '    <h3 class="solar-title" style="margin-bottom: 8px;">Today</h3>';
      html += '    <div style="width: 120px; height: 1px; background-color: var(--border-color); opacity:0.3; margin: 0 auto 16px auto;"></div>';
      
      html += '    <div class="solar-flex-row">';
      // Today Sunrise
      html += '      <div class="solar-item">';
      html += '        <svg viewBox="0 0 24 24"><path d="M17 18a5 5 0 0 0-10 0"></path><line x1="12" y1="2" x2="12" y2="9"></line><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"></line><line x1="1" y1="18" x2="3" y2="18"></line><line x1="21" y1="18" x2="23" y2="18"></line><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"></line><line x1="23" y1="22" x2="1" y2="22"></line><polyline points="8 6 12 2 16 6"></polyline></svg>';
      html += '        <div class="solar-item-time">' + todayRise + '</div>';
      html += '        <div class="solar-item-label">sunrise</div>';
      html += '      </div>';
      // Today Sunset
      html += '      <div class="solar-item">';
      html += '        <svg viewBox="0 0 24 24"><path d="M17 18a5 5 0 0 0-10 0"></path><line x1="12" y1="9" x2="12" y2="2"></line><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"></line><line x1="1" y1="18" x2="3" y2="18"></line><line x1="21" y1="18" x2="23" y2="18"></line><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"></line><line x1="23" y1="22" x2="1" y2="22"></line><polyline points="16 5 12 9 8 5"></polyline></svg>';
      html += '        <div class="solar-item-time">' + todaySet + '</div>';
      html += '        <div class="solar-item-label">sunset</div>';
      html += '      </div>';
      html += '    </div>';
      html += '  </div>';

      // DOTTED SEPARATOR
      html += '  <div class="dotted-divider" style="margin: 20px 0;"></div>';

      // 2. TOMORROW SECTION
      html += '  <div style="flex:1; display:flex; flex-direction:column; justify-content:center; margin-bottom: 24px;">';
      html += '    <h3 class="solar-title" style="margin-bottom: 16px;">Tomorrow</h3>';
      
      html += '    <div class="solar-flex-row">';
      // Tomorrow Sunrise
      html += '      <div class="solar-item">';
      html += '        <div class="solar-item-time" style="font-size: 38px;">' + tomorrowRise + '</div>';
      html += '        <div class="solar-item-label">sunrise</div>';
      html += '      </div>';
      // Tomorrow Sunset
      html += '      <div class="solar-item">';
      html += '        <div class="solar-item-time" style="font-size: 38px;">' + tomorrowSet + '</div>';
      html += '        <div class="solar-item-label">sunset</div>';
      html += '      </div>';
      html += '    </div>';
      html += '  </div>';

      // DITHERED FOOTER BAR
      html += '  <div class="trmnl-footer-bar">';
      html += '    <div class="trmnl-footer-badge">';
      // Inline Sun SVG
      html += '      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
      html += '      <span>Sunrise &amp; Sunset</span>';
      html += '    </div>';
      html += '    <div class="trmnl-footer-meta">SOLAR PHASES</div>';
      html += '  </div>';

      html += '</div>';

      this.container.innerHTML = html;
    },

    renderError: function() {
      this.container.innerHTML = 
        '<div class="trmnl-card" style="height:100%; justify-content:center; align-items:center; text-align:center;">' +
        '  <div style="margin-bottom: 16px;"><i class="fas fa-sun" style="font-size: 48px;"></i></div>' +
        '  <div style="font-family: var(--font-mono); font-size: 16px; font-weight:700;">SOLAR DATA OFFLINE</div>' +
        '  <div style="font-family: var(--font-mono); font-size: 12px; margin-top: 8px; opacity: 0.6;">Could not reach weather forecast API.</div>' +
        '</div>';
    }
  };

  // Register plugin
  window.Plugins = window.Plugins || {};
  window.Plugins.sun = SunPlugin;

})();
