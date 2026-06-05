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
    websiteQrBase64: null,

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
            websiteQrBase64: self.websiteQrBase64 || activeConfig.websiteQrBase64 || null
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
        this.websiteQrBase64 = null;
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
      this.websiteQrBase64 = activeConfig.websiteQrBase64 || null;

      var html = '<div class="grid-row" style="height:100%;">';

      // Left Column: Global, Personal, and WiFi uploads
      html += '  <div class="grid-col col-1 trmnl-card" style="justify-content: flex-start; overflow-y: auto;">';
      html += '    <div class="trmnl-card-header">GLOBAL & PERSONAL CONFIG</div>';
      
      // Theme selection
      html += '    <div style="margin-bottom: 12px;">';
      html += '      <label style="font-family:var(--font-mono); font-size:11px; font-weight:700; display:block; margin-bottom:4px;">THEME</label>';
      html += '      <select id="cfg-theme">';
      html += '        <option value="paper"' + (globalTheme === 'paper' ? ' selected' : '') + '>Paper (Warm E-Paper)</option>';
      html += '        <option value="coal"' + (globalTheme === 'coal' ? ' selected' : '') + '>Coal (Dark E-Paper)</option>';
      html += '        <option value="stark"' + (globalTheme === 'stark' ? ' selected' : '') + '>Stark (High Contrast B&W)</option>';
      html += '      </select>';
      html += '    </div>';

      // Cycle speed selection
      html += '    <div style="margin-bottom: 12px;">';
      html += '      <label style="font-family:var(--font-mono); font-size:11px; font-weight:700; display:block; margin-bottom:4px;">CYCLE INTERVAL</label>';
      html += '      <select id="cfg-interval">';
      html += '        <option value="0"' + (globalInterval === 0 ? ' selected' : '') + '>Manual Navigation Only</option>';
      html += '        <option value="15"' + (globalInterval === 15 ? ' selected' : '') + '>15 Seconds</option>';
      html += '        <option value="30"' + (globalInterval === 30 ? ' selected' : '') + '>30 Seconds</option>';
      html += '        <option value="60"' + (globalInterval === 60 ? ' selected' : '') + '>60 Seconds</option>';
      html += '        <option value="120"' + (globalInterval === 120 ? ' selected' : '') + '>120 Seconds</option>';
      html += '      </select>';
      html += '    </div>';

      // Flash refresh selection
      html += '    <div style="margin-bottom: 12px;">';
      html += '      <label style="font-family:var(--font-mono); font-size:11px; font-weight:700; display:block; margin-bottom:4px;">E-INK REFRESH FLASH</label>';
      html += '      <select id="cfg-flash">';
      html += '        <option value="true"' + (globalFlash ? ' selected' : '') + '>Enabled (Authentic Flash)</option>';
      html += '        <option value="false"' + (!globalFlash ? ' selected' : '') + '>Disabled (No Fade/Flash)</option>';
      html += '      </select>';
      html += '    </div>';

      html += '    <div class="dotted-divider" style="margin:10px 0;"></div>';

      // Birthdate
      html += '    <div style="margin-bottom: 10px;">';
      html += '      <label style="font-family:var(--font-mono); font-size:11px; font-weight:700; display:block; margin-bottom:4px;">BIRTHDATE (YYYY-MM-DD)</label>';
      html += '      <input type="text" id="cfg-birthdate" value="' + birthdate + '">';
      html += '    </div>';

      html += '  </div>';

      // Right Column: Weather Location, WiFi Uploads & Actions
      html += '  <div class="grid-col col-1 trmnl-card" style="justify-content: space-between; overflow-y: auto;">';
      html += '    <div>';
      html += '      <div class="trmnl-card-header">WEATHER & GUEST WIFI CONFIG</div>';

      // Location Name
      html += '      <div style="margin-bottom: 10px;">';
      html += '        <label style="font-family:var(--font-mono); font-size:11px; font-weight:700; display:block; margin-bottom:4px;">LOCATION NAME</label>';
      html += '        <input type="text" id="cfg-name" value="' + weatherName + '">';
      html += '      </div>';

      // Lat/Lon (Hidden, dynamically resolved via geocoding)
      html += '      <input type="hidden" id="cfg-lat" value="' + weatherLat + '">';
      html += '      <input type="hidden" id="cfg-lon" value="' + weatherLon + '">';

      // Temperature Unit
      html += '      <div style="margin-bottom: 10px;">';
      html += '        <label style="font-family:var(--font-mono); font-size:11px; font-weight:700; display:block; margin-bottom:4px;">TEMPERATURE SCALE</label>';
      html += '      <select id="cfg-unit">';
      html += '        <option value="celsius"' + (weatherUnit === 'celsius' ? ' selected' : '') + '>Celsius (°C)</option>';
      html += '        <option value="fahrenheit"' + (weatherUnit === 'fahrenheit' ? ' selected' : '') + '>Fahrenheit (°F)</option>';
      html += '      </select>';
      html += '      </div>';

      html += '      <div class="dotted-divider" style="margin: 12px 0;"></div>';

      // Custom QR File Uploads
      html += '      <div style="margin-bottom: 10px;">';
      html += '        <label style="font-family:var(--font-mono); font-size:10px; font-weight:700; display:block; margin-bottom:4px;">UPLOAD WIFI QR IMAGE</label>';
      html += '        <input type="file" id="cfg-wifi-qr-img" accept="image/*" style="font-size:11px; padding:6px;">';
      html += '        <div id="cfg-wifi-qr-preview" style="font-family:var(--font-mono); font-size:9px; margin-top:2px; opacity:0.6;">' + (this.wifiQrBase64 ? "✓ Saved in browser overrides" : "No file uploaded (dashed placeholder displayed)") + '</div>';
      html += '      </div>';

      html += '      <div style="margin-bottom: 10px;">';
      html += '        <label style="font-family:var(--font-mono); font-size:10px; font-weight:700; display:block; margin-bottom:4px;">UPLOAD WEBSITE QR IMAGE</label>';
      html += '        <input type="file" id="cfg-website-qr-img" accept="image/*" style="font-size:11px; padding:6px;">';
      html += '        <div id="cfg-website-qr-preview" style="font-family:var(--font-mono); font-size:9px; margin-top:2px; opacity:0.6;">' + (this.websiteQrBase64 ? "✓ Saved in browser overrides" : "No file uploaded (dashed placeholder displayed)") + '</div>';
      html += '      </div>';

      html += '    </div>';

      // Action Buttons
      html += '    <div style="display:flex; flex-direction:column; gap:10px; margin-top:20px;">';
      html += '      <button class="trmnl-btn" id="cfg-save-btn" style="width: 100%;">SAVE SETTINGS</button>';
      html += '      <button class="trmnl-btn secondary" id="cfg-reset-btn" style="width: 100%; font-size:12px; border-style:dashed;">RESET ALL OVERRIDES</button>';
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
      var websiteFileInput = this.container.querySelector('#cfg-website-qr-img');

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

      if (websiteFileInput) {
        websiteFileInput.addEventListener('change', function() {
          var file = websiteFileInput.files[0];
          if (file) {
            var reader = new FileReader();
            reader.onload = function(e) {
              self.websiteQrBase64 = e.target.result;
              self.container.querySelector('#cfg-website-qr-preview').textContent = "Loaded: " + file.name.substring(0, 15) + "...";
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
