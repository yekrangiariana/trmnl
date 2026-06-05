/**
 * Settings Control Panel Plugin for TRMNL Dashboard
 * Manages configuration overrides in localStorage for our custom plugins
 */

(function() {
  'use strict';

  var SettingsPlugin = {
    id: 'settings',
    name: 'Settings',
    config: {},
    container: null,
    
    // In-memory base64 buffers for file uploads
    wifiQrBase64: null,

    init: function(pluginConfig) {
      this.config = pluginConfig || {};
    },

    render: function(element) {
      this.container = element;
      this.renderPanel();
    },

    update: function() {
      this.renderPanel();
    },

    saveSettings: function() {
      if (!this.container) return;

      var self = this;
      var activeConfig = window.Dashboard ? window.Dashboard.getActiveConfig() : {};
      
      var inputName = this.container.querySelector('#cfg-name').value.trim();
      var currentName = activeConfig.locationName || '';
      
      var latVal = parseFloat(this.container.querySelector('#cfg-lat').value);
      var lonVal = parseFloat(this.container.querySelector('#cfg-lon').value);
      
      var saveBtn = this.container.querySelector('#cfg-save-btn');
      
      function executeSave(finalLat, finalLon, resolvedName) {
        try {
          var newSettings = {
            refreshInterval: parseInt(self.container.querySelector('#cfg-interval').value, 10),
            flashRefresh: self.container.querySelector('#cfg-flash').value === 'true',
            theme: self.container.querySelector('#cfg-theme').value,
            birthdate: self.container.querySelector('#cfg-birthdate').value,
            latitude: finalLat,
            longitude: finalLon,
            locationName: resolvedName || inputName,
            tempUnit: self.container.querySelector('#cfg-unit').value,
            wifiQrBase64: self.wifiQrBase64 || activeConfig.wifiQrBase64 || null,
            hslNeighbourhood: (self.container.querySelector('#cfg-hsl-neighbourhood') ? self.container.querySelector('#cfg-hsl-neighbourhood').value.trim() : activeConfig.hslNeighbourhood) || 'Kallio',
            hslRadius: self.container.querySelector('#cfg-hsl-radius') ? parseInt(self.container.querySelector('#cfg-hsl-radius').value, 10) : (activeConfig.hslRadius || 700),
            digitransitApiKey: (self.container.querySelector('#cfg-digitransit-key') ? self.container.querySelector('#cfg-digitransit-key').value.trim() : activeConfig.digitransitApiKey) || ''
          };

          localStorage.setItem('trmnl_dashboard_settings', JSON.stringify(newSettings));
          alert("Settings saved! Reloading dashboard...");
          
          if (window.Dashboard && typeof window.Dashboard.reloadSettings === 'function') {
            window.Dashboard.reloadSettings();
          }
        } catch (e) {
          console.error("Save settings failed:", e);
          alert("Error saving settings: " + e.message);
        } finally {
          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = "SAVE SETTINGS";
          }
        }
      }

      // Check if location changed
      if (inputName.toLowerCase() !== currentName.toLowerCase() && inputName !== '') {
        if (saveBtn) {
          saveBtn.disabled = true;
          saveBtn.textContent = "RESOLVING LOCATION...";
        }
        
        var geoUrl = "https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(inputName) + "&count=1&language=en";
        
        fetch(geoUrl)
          .then(function(res) {
            if (!res.ok) throw new Error("HTTP error " + res.status);
            return res.json();
          })
          .then(function(data) {
            if (data.results && data.results.length > 0) {
              var match = data.results[0];
              var resLat = match.latitude;
              var resLon = match.longitude;
              var resName = match.name;
              if (match.country) {
                resName += ", " + match.country;
              }
              executeSave(resLat, resLon, resName);
            } else {
              alert("Location not found. Using default/previous coordinates.");
              executeSave(latVal, lonVal, inputName);
            }
          })
          .catch(function(err) {
            console.error("Geocoding failed:", err);
            alert("Could not contact location services. Saving settings with existing coordinates.");
            executeSave(latVal, lonVal, inputName);
          });
      } else {
        executeSave(latVal, lonVal, inputName);
      }
    },

    resetAll: function() {
      try {
        localStorage.removeItem('trmnl_dashboard_settings');
        this.wifiQrBase64 = null;
        alert("Local overrides cleared! Reverted to config.js defaults...");
        
        if (window.Dashboard && typeof window.Dashboard.reloadSettings === 'function') {
          window.Dashboard.reloadSettings();
        }
      } catch (e) {
        console.error("Reset failed:", e);
      }
    },

    renderPanel: function() {
      if (!this.container) return;

      var self = this;
      var activeConfig = window.Dashboard ? window.Dashboard.getActiveConfig() : {};
      var globalInterval = activeConfig.refreshInterval !== undefined ? activeConfig.refreshInterval : 60;
      var globalFlash = activeConfig.flashRefresh !== undefined ? activeConfig.flashRefresh : true;
      var globalTheme = activeConfig.theme || 'paper';

      var birthdate = activeConfig.birthdate || '1995-04-12';
      var weatherLat = activeConfig.latitude !== undefined ? activeConfig.latitude : 60.1699;
      var weatherLon = activeConfig.longitude !== undefined ? activeConfig.longitude : 24.9384;
      var weatherName = activeConfig.locationName || "Helsinki";
      var weatherUnit = activeConfig.tempUnit || "celsius";

      // Keep saved base64 images in memory so they don't get cleared on edits
      this.wifiQrBase64 = activeConfig.wifiQrBase64 || null;

      var hslNeighbourhood = activeConfig.hslNeighbourhood || 'Kallio';
      var hslRadius = activeConfig.hslRadius !== undefined ? activeConfig.hslRadius : 700;
      var digitransitApiKey = activeConfig.digitransitApiKey || '';

      var fieldStyle = 'margin-bottom: 14px;';
      var labelStyle = 'font-family:var(--font-mono); font-size:10px; font-weight:700; display:block; margin-bottom:5px; text-transform:uppercase; letter-spacing:0.04em; opacity:0.75;';

      var html = '<div style="display:flex; flex-direction:column; height:100%; padding: 10px 0;">';
      html += '  <div class="grid-row" style="flex:1; overflow:hidden;">';

      // Left Column
      html += '    <div class="grid-col col-1 trmnl-card" style="justify-content: flex-start; overflow-y: auto; gap: 0; padding: 24px 28px;">';
      html += '      <div class="trmnl-card-header">GLOBAL &amp; PERSONAL CONFIG</div>';

      html += '      <div style="' + fieldStyle + '">';
      html += '        <label style="' + labelStyle + '">THEME</label>';
      html += '        <select id="cfg-theme">';
      html += '          <option value="paper"' + (globalTheme === 'paper' ? ' selected' : '') + '>Paper (Warm E-Paper)</option>';
      html += '          <option value="coal"' + (globalTheme === 'coal' ? ' selected' : '') + '>Coal (Dark E-Paper)</option>';
      html += '          <option value="stark"' + (globalTheme === 'stark' ? ' selected' : '') + '>Stark (High Contrast B&amp;W)</option>';
      html += '        </select>';
      html += '      </div>';

      html += '      <div style="' + fieldStyle + '">';
      html += '        <label style="' + labelStyle + '">CYCLE INTERVAL</label>';
      html += '        <select id="cfg-interval">';
      html += '          <option value="0"' + (globalInterval === 0 ? ' selected' : '') + '>Manual Only</option>';
      html += '          <option value="15"' + (globalInterval === 15 ? ' selected' : '') + '>15 Seconds</option>';
      html += '          <option value="30"' + (globalInterval === 30 ? ' selected' : '') + '>30 Seconds</option>';
      html += '          <option value="60"' + (globalInterval === 60 ? ' selected' : '') + '>60 Seconds</option>';
      html += '          <option value="120"' + (globalInterval === 120 ? ' selected' : '') + '>120 Seconds</option>';
      html += '        </select>';
      html += '      </div>';

      html += '      <div style="' + fieldStyle + '">';
      html += '        <label style="' + labelStyle + '">E-INK REFRESH FLASH</label>';
      html += '        <select id="cfg-flash">';
      html += '          <option value="true"' + (globalFlash ? ' selected' : '') + '>Enabled (Authentic Flash)</option>';
      html += '          <option value="false"' + (!globalFlash ? ' selected' : '') + '>Disabled (No Flash)</option>';
      html += '        </select>';
      html += '      </div>';

      html += '      <div class="dotted-divider" style="margin: 4px 0 14px;"></div>';

      html += '      <div style="' + fieldStyle + '">';
      html += '        <label style="' + labelStyle + '">BIRTHDATE (YYYY-MM-DD)</label>';
      html += '        <input type="text" id="cfg-birthdate" value="' + birthdate + '">';
      html += '      </div>';

      html += '      <div class="dotted-divider" style="margin: 4px 0 14px;"></div>';

      html += '      <div style="' + fieldStyle + '">';
      html += '        <label style="' + labelStyle + '">WIFI QR IMAGE</label>';
      html += '        <input type="file" id="cfg-wifi-qr-img" accept="image/*" style="font-size:11px; padding:5px;">';
      html += '        <div id="cfg-wifi-qr-preview" style="font-family:var(--font-mono); font-size:9px; margin-top:4px; opacity:0.55;">' + (this.wifiQrBase64 ? '✓ Image saved' : 'No file — shows placeholder') + '</div>';
      html += '      </div>';

      html += '    </div>';

      // Right Column
      html += '    <div class="grid-col col-1 trmnl-card" style="justify-content: space-between; overflow-y: auto; gap: 0; padding: 24px 28px;">';
      html += '      <div>';
      html += '        <div class="trmnl-card-header">LOCATION &amp; TRANSPORT CONFIG</div>';

      html += '        <div style="' + fieldStyle + '">';
      html += '          <label style="' + labelStyle + '">LOCATION NAME</label>';
      html += '          <input type="text" id="cfg-name" value="' + weatherName + '">';
      html += '        </div>';

      html += '        <input type="hidden" id="cfg-lat" value="' + weatherLat + '">';
      html += '        <input type="hidden" id="cfg-lon" value="' + weatherLon + '">';

      html += '        <div style="' + fieldStyle + '">';
      html += '          <label style="' + labelStyle + '">TEMPERATURE SCALE</label>';
      html += '          <select id="cfg-unit">';
      html += '            <option value="celsius"' + (weatherUnit === 'celsius' ? ' selected' : '') + '>Celsius (°C)</option>';
      html += '            <option value="fahrenheit"' + (weatherUnit === 'fahrenheit' ? ' selected' : '') + '>Fahrenheit (°F)</option>';
      html += '          </select>';
      html += '        </div>';

      html += '        <div class="dotted-divider" style="margin: 4px 0 14px;"></div>';

      html += '        <div style="' + fieldStyle + '">';
      html += '          <label style="' + labelStyle + '">HSL NEIGHBOURHOOD</label>';
      html += '          <input type="text" id="cfg-hsl-neighbourhood" value="' + hslNeighbourhood + '" placeholder="e.g. Kallio, Pasila, Töölö">';
      html += '          <div style="font-family:var(--font-mono); font-size:9px; margin-top:4px; opacity:0.55;">Neighbourhood name or specific street address</div>';
      html += '        </div>';
      html += '        <div style="' + fieldStyle + '">';
      html += '          <label style="' + labelStyle + '">HSL STOP RADIUS (METERS)</label>';
      html += '          <input type="number" id="cfg-hsl-radius" value="' + hslRadius + '" placeholder="e.g. 700" min="100" max="5000" step="50">';
      html += '          <div style="font-family:var(--font-mono); font-size:9px; margin-top:4px; opacity:0.55;">Search radius for nearby stops (e.g. 500 to 2000m)</div>';
      html += '        </div>';

      html += '        <div style="' + fieldStyle + '">';
      html += '          <label style="' + labelStyle + '">DIGITRANSIT API KEY</label>';
      html += '          <input type="password" id="cfg-digitransit-key" value="' + digitransitApiKey + '" placeholder="Paste key from portal-api.digitransit.fi" autocomplete="off">';
      html += '          <div style="font-family:var(--font-mono); font-size:9px; margin-top:4px; opacity:0.55;">Free key — register at portal-api.digitransit.fi</div>';
      html += '        </div>';

      html += '      </div>';

      // Action Buttons
      html += '      <div style="display:flex; flex-direction:column; gap:10px;">';
      html += '        <button class="trmnl-btn" id="cfg-save-btn" style="width: 100%;">SAVE SETTINGS</button>';
      html += '        <button class="trmnl-btn secondary" id="cfg-reset-btn" style="width: 100%; font-size:12px; border-style:dashed;">RESET ALL OVERRIDES</button>';
      html += '      </div>';

      html += '    </div>';
      html += '  </div>';
      html += '</div>';

      this.container.innerHTML = html;

      // Event Bindings
      var saveBtn = this.container.querySelector('#cfg-save-btn');
      var resetBtn = this.container.querySelector('#cfg-reset-btn');

      if (saveBtn) {
        saveBtn.addEventListener('click', function() {
          self.saveSettings();
        });
      }

      if (resetBtn) {
        resetBtn.addEventListener('click', function() {
          if (confirm("Prune all browser settings overrides and reload defaults from config.js?")) {
            self.resetAll();
          }
        });
      }

      // File Reader Bindings
      var wifiFileInput = this.container.querySelector('#cfg-wifi-qr-img');

      if (wifiFileInput) {
        wifiFileInput.addEventListener('change', function() {
          var file = wifiFileInput.files[0];
          if (file) {
            var reader = new FileReader();
            reader.onload = function(e) {
              self.wifiQrBase64 = e.target.result;
              self.container.querySelector('#cfg-wifi-qr-preview').textContent = "Loaded: " + file.name.substring(0, 15) + "...";
            };
            reader.readAsDataURL(file);
          }
        });
      }
    }
  };

  // Register plugin
  window.Plugins = window.Plugins || {};
  window.Plugins.settings = SettingsPlugin;

})();
