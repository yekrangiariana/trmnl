/**
 * Settings Control Panel Plugin for TRMNL Dashboard
 * Manages configuration overrides in localStorage for global settings and other plugins
 */

(function() {
  'use strict';

  var SettingsPlugin = {
    id: 'settings',
    name: 'Settings',
    config: {},
    container: null,
    activeTab: 'general', // default active tab: general, transit, stats, backup
    isEditing: false,

    // In-memory data structures for values being edited
    editedSettings: {},
    editedStats: {},
    wifiQrBase64: null,

    init: function(pluginConfig) {
      this.config = pluginConfig || {};
    },

    render: function(element) {
      this.container = element;
      this.update();
    },

    update: function() {
      if (!this.container) return;

      // Initialize the edit buffers from localStorage/config.js if we're not currently editing
      if (!this.isEditing) {
        this.loadCurrentSettings();
        this.isEditing = true;
      }

      this.renderPanel();
    },

    setTab: function(tabId) {
      this.captureTabInputs();
      this.activeTab = tabId || 'general';
    },

    loadCurrentSettings: function() {
      var activeConfig = window.Dashboard ? window.Dashboard.getActiveConfig() : {};
      
      // Load current dashboard settings
      var savedDashboard = {};
      try {
        var saved = localStorage.getItem('trmnl_dashboard_settings');
        if (saved) {
          savedDashboard = JSON.parse(saved);
        }
      } catch (e) {
        console.warn("Error parsing dashboard settings:", e);
      }

      this.editedSettings = Object.assign({
        refreshInterval: activeConfig.refreshInterval !== undefined ? activeConfig.refreshInterval : 60,
        flashRefresh: activeConfig.flashRefresh !== undefined ? activeConfig.flashRefresh : true,
        theme: activeConfig.theme || 'paper',
        birthdate: activeConfig.birthdate || '1995-04-12',
        latitude: activeConfig.latitude !== undefined ? activeConfig.latitude : 60.1699,
        longitude: activeConfig.longitude !== undefined ? activeConfig.longitude : 24.9384,
        locationName: activeConfig.locationName || 'Helsinki',
        tempUnit: activeConfig.tempUnit || 'celsius',
        wifiQrBase64: activeConfig.wifiQrBase64 || null,
        hslNeighbourhood: activeConfig.hslNeighbourhood || 'Kallio',
        hslRadius: activeConfig.hslRadius !== undefined ? activeConfig.hslRadius : 700,
        digitransitApiKey: activeConfig.digitransitApiKey || '',
        todoistApiKey: activeConfig.todoistApiKey || '',
        todoistFilter: activeConfig.todoistFilter || 'today | overdue',
        todoistMaxTasks: activeConfig.todoistMaxTasks !== undefined ? activeConfig.todoistMaxTasks : 6,
        historyShowBirthsDeaths: activeConfig.historyShowBirthsDeaths !== undefined ? activeConfig.historyShowBirthsDeaths : false,
        historyEventMode: activeConfig.historyEventMode || 'mix',
        wallpaper: activeConfig.wallpaper || 'pixel_art_landscape.png',
        customWallpaperBase64: activeConfig.customWallpaperBase64 || null,
        wallpaperDark: activeConfig.wallpaperDark || null
      }, savedDashboard);

      // Deep merge plugins config so we don't lose existing settings keys
      var activePluginsConfig = activeConfig.plugins || {};
      var mergedPlugins = Object.assign({}, activePluginsConfig);
      if (savedDashboard.plugins) {
        Object.keys(savedDashboard.plugins).forEach(function(pluginId) {
          mergedPlugins[pluginId] = Object.assign({}, activePluginsConfig[pluginId] || {}, savedDashboard.plugins[pluginId]);
        });
      }
      this.editedSettings.plugins = mergedPlugins;

      this.wifiQrBase64 = this.editedSettings.wifiQrBase64;

      // Load current stats config
      var defaultStats = {
        birthdate: this.editedSettings.birthdate,
        child1Name: 'Child 1',
        child2Name: 'Child 2',
        child1Date: '2020-06-01',
        child2Date: '2023-06-01',
        marriageDate: '2021-06-15',
        cookingStartDate: '2022-01-01',
        writingStartDate: '2016-01-01',
        mealsPerDay: 2,
        articlesPerMonth: 4,
        wordsPerArticle: 4000,
        sleepHoursPerDay: 8,
        storySessionsPerWeek: 7,
        storyDurationMinutes: 10
      };
      
      var savedStats = {};
      try {
        var saved = localStorage.getItem('trmnl_personal_stats_config');
        if (saved) {
          savedStats = JSON.parse(saved);
        }
      } catch (e) {
        console.warn("Error parsing stats config:", e);
      }

      this.editedStats = Object.assign({}, defaultStats, savedStats);
      this.editedStats.birthdate = this.editedSettings.birthdate; // Keep birthdates in sync
    },

    captureTabInputs: function() {
      if (!this.container) return;

      if (this.activeTab === 'general') {
        var themeSelect = this.container.querySelector('#cfg-theme');
        var intervalSelect = this.container.querySelector('#cfg-interval');
        var flashSelect = this.container.querySelector('#cfg-flash');
        
        if (themeSelect) this.editedSettings.theme = themeSelect.value;
        if (intervalSelect) this.editedSettings.refreshInterval = parseInt(intervalSelect.value, 10);
        if (flashSelect) this.editedSettings.flashRefresh = flashSelect.value === 'true';
        this.editedSettings.wifiQrBase64 = this.wifiQrBase64;
      } 
      else if (this.activeTab === 'transit') {
        var nameInput = this.container.querySelector('#cfg-name');
        var unitSelect = this.container.querySelector('#cfg-unit');
        var neighbourhoodInput = this.container.querySelector('#cfg-hsl-neighbourhood');
        var radiusInput = this.container.querySelector('#cfg-hsl-radius');
        var keyInput = this.container.querySelector('#cfg-digitransit-key');
        
        if (nameInput) this.editedSettings.locationName = nameInput.value.trim();
        if (unitSelect) this.editedSettings.tempUnit = unitSelect.value;
        if (neighbourhoodInput) this.editedSettings.hslNeighbourhood = neighbourhoodInput.value.trim();
        if (radiusInput) this.editedSettings.hslRadius = parseInt(radiusInput.value, 10) || 700;
        if (keyInput) this.editedSettings.digitransitApiKey = keyInput.value.trim();
      } 
      else if (this.activeTab === 'stats') {
        var birthdateInput = this.container.querySelector('#stats-birthdate');
        var child1NameInput = this.container.querySelector('#stats-child1-name');
        var child2NameInput = this.container.querySelector('#stats-child2-name');
        var child1Input = this.container.querySelector('#stats-child1-date');
        var child2Input = this.container.querySelector('#stats-child2-date');
        var marriageInput = this.container.querySelector('#stats-marriage-date');
        var cookInput = this.container.querySelector('#stats-cook-date');
        var mealsInput = this.container.querySelector('#stats-meals-per-day');
        var sleepInput = this.container.querySelector('#stats-sleep-hours');
        var writeInput = this.container.querySelector('#stats-write-date');
        var articlesInput = this.container.querySelector('#stats-articles-per-month');
        var wordsInput = this.container.querySelector('#stats-words-per-article');

        if (birthdateInput) {
          var bday = birthdateInput.value.trim();
          this.editedSettings.birthdate = bday;
          this.editedStats.birthdate = bday;
        }
        if (child1NameInput) this.editedStats.child1Name = child1NameInput.value.trim() || 'Child 1';
        if (child2NameInput) this.editedStats.child2Name = child2NameInput.value.trim() || 'Child 2';
        if (child1Input) this.editedStats.child1Date = child1Input.value.trim();
        if (child2Input) this.editedStats.child2Date = child2Input.value.trim();
        if (marriageInput) this.editedStats.marriageDate = marriageInput.value.trim();
        if (cookInput) this.editedStats.cookingStartDate = cookInput.value.trim();
        if (mealsInput) this.editedStats.mealsPerDay = parseInt(mealsInput.value, 10) || 2;
        if (sleepInput) this.editedStats.sleepHoursPerDay = parseFloat(sleepInput.value) || 8;
        var storiesInput = this.container.querySelector('#stats-story-frequency');
        if (storiesInput) this.editedStats.storySessionsPerWeek = parseInt(storiesInput.value, 10) || 7;
        var storyDurationInput = this.container.querySelector('#stats-story-duration');
        if (storyDurationInput) this.editedStats.storyDurationMinutes = parseInt(storyDurationInput.value, 10) || 10;
        if (writeInput) this.editedStats.writingStartDate = writeInput.value.trim();
        if (articlesInput) this.editedStats.articlesPerMonth = parseInt(articlesInput.value, 10) || 4;
        if (wordsInput) this.editedStats.wordsPerArticle = parseInt(wordsInput.value, 10) || 4000;
      }
      else if (this.activeTab === 'todoist') {
        var keyInput = this.container.querySelector('#cfg-todoist-key');
        var filterInput = this.container.querySelector('#cfg-todoist-filter');
        var maxInput = this.container.querySelector('#cfg-todoist-max');

        if (keyInput) this.editedSettings.todoistApiKey = keyInput.value.trim();
        if (filterInput) this.editedSettings.todoistFilter = filterInput.value.trim();
        if (maxInput) this.editedSettings.todoistMaxTasks = parseInt(maxInput.value, 10) || 6;
      }
      else if (this.activeTab === 'history') {
        var birthsDeathsSelect = this.container.querySelector('#cfg-history-births-deaths');
        var eventModeSelect = this.container.querySelector('#cfg-history-event-mode');
        
        if (birthsDeathsSelect) this.editedSettings.historyShowBirthsDeaths = birthsDeathsSelect.value === 'true';
        if (eventModeSelect) this.editedSettings.historyEventMode = eventModeSelect.value;
      }
      else if (this.activeTab === 'plugins') {
        var registry = window.Plugins || {};
        var order = ['time', 'history', 'life', 'stats', 'weather', 'sun', 'todoist', 'word', 'finnish', 'wifi', 'news', 'wikirandom', 'wikiphoto', 'laundry', 'hsl'];
        
        if (!this.editedSettings.plugins) {
          this.editedSettings.plugins = {};
        }

        var self = this;
        order.forEach(function(pluginId) {
          var plugin = registry[pluginId];
          if (!plugin) return;

          var chkCarousel = self.container.querySelector('#chk-carousel-' + pluginId);
          var chkQuick = self.container.querySelector('#chk-quick-' + pluginId);

          if (!self.editedSettings.plugins[pluginId]) {
            self.editedSettings.plugins[pluginId] = {};
          }

          if (chkCarousel) {
            self.editedSettings.plugins[pluginId].showInCarousel = chkCarousel.checked;
          }
          if (chkQuick) {
            self.editedSettings.plugins[pluginId].showInQuickMenu = chkQuick.checked;
          }
        });
      }
    },

    saveSettings: function() {
      var self = this;
      this.captureTabInputs();

      var saveBtn = this.container.querySelector('#cfg-save-btn');
      var inputName = this.editedSettings.locationName || '';
      
      var activeConfig = window.Dashboard ? window.Dashboard.getActiveConfig() : {};
      var currentName = activeConfig.locationName || '';
      
      var latVal = parseFloat(this.editedSettings.latitude) || 60.1699;
      var lonVal = parseFloat(this.editedSettings.longitude) || 24.9384;

      function executeSave(finalLat, finalLon, resolvedName) {
        try {
          self.editedSettings.latitude = finalLat;
          self.editedSettings.longitude = finalLon;
          if (resolvedName) {
            self.editedSettings.locationName = resolvedName;
          }

          // Save settings to localStorage
          localStorage.setItem('trmnl_dashboard_settings', JSON.stringify(self.editedSettings));
          localStorage.setItem('trmnl_personal_stats_config', JSON.stringify(self.editedStats));
          
          alert("All changes saved successfully! Reloading dashboard...");
          
          self.isEditing = false;
          
          if (window.Dashboard && typeof window.Dashboard.reloadSettings === 'function') {
            window.Dashboard.reloadSettings();
          }
        } catch (e) {
          console.error("Save settings failed:", e);
          alert("Error saving settings: " + e.message);
        } finally {
          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = "SAVE ALL CHANGES";
          }
        }
      }

      // Validate Stats Dates (Simple YYYY-MM-DD Regex Check)
      var dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      var datesToValidate = [
        { name: 'Birthdate', value: this.editedSettings.birthdate },
        { name: 'Child 1 Date', value: this.editedStats.child1Date },
        { name: 'Child 2 Date', value: this.editedStats.child2Date },
        { name: 'Marriage Date', value: this.editedStats.marriageDate },
        { name: 'Cooking Start Date', value: this.editedStats.cookingStartDate },
        { name: 'Writing Start Date', value: this.editedStats.writingStartDate }
      ];

      for (var i = 0; i < datesToValidate.length; i++) {
        var dateObj = datesToValidate[i];
        if (!dateRegex.test(dateObj.value)) {
          alert("Invalid date format for " + dateObj.name + " (" + dateObj.value + "). Please use YYYY-MM-DD format.");
          return;
        }
      }

      // Check if location changed and needs resolving
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

    cancelSettings: function() {
      this.isEditing = false;
      this.activeTab = 'general';
      this.wifiQrBase64 = null;
      this.editedSettings = {};
      this.editedStats = {};
      
      // Hide settings view
      var settingsView = document.getElementById('view-settings');
      if (settingsView) {
        settingsView.classList.remove('active');
      }

      if (window.Dashboard && typeof window.Dashboard.reloadSettings === 'function') {
        window.Dashboard.reloadSettings();
      }
    },

    resetAll: function() {
      try {
        localStorage.removeItem('trmnl_dashboard_settings');
        localStorage.removeItem('trmnl_personal_stats_config');
        this.wifiQrBase64 = null;
        this.isEditing = false;
        alert("Local settings overrides cleared! Reverted to config.js defaults...");
        
        if (window.Dashboard && typeof window.Dashboard.reloadSettings === 'function') {
          window.Dashboard.reloadSettings();
        }
      } catch (e) {
        console.error("Reset failed:", e);
      }
    },

    exportSettings: function() {
      this.captureTabInputs();
      
      var exportData = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        trmnl_dashboard_settings: this.editedSettings,
        trmnl_personal_stats_config: this.editedStats
      };

      try {
        var blob = new Blob([JSON.stringify(exportData, null, 2)], {type: "application/json"});
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = "trmnl_settings_backup.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error("Export settings failed:", e);
        alert("Failed to export settings: " + e.message);
      }
    },

    importSettings: function(file) {
      var self = this;
      if (!file) return;

      var reader = new FileReader();
      reader.onload = function(e) {
        try {
          var importData = JSON.parse(e.target.result);
          
          if (!importData || !importData.trmnl_dashboard_settings || !importData.trmnl_personal_stats_config) {
            throw new Error("Invalid backup file structure. Missing configurations.");
          }

          // Update in-memory configurations
          self.editedSettings = Object.assign({}, self.editedSettings, importData.trmnl_dashboard_settings);
          self.editedStats = Object.assign({}, self.editedStats, importData.trmnl_personal_stats_config);
          self.wifiQrBase64 = self.editedSettings.wifiQrBase64;
          
          alert("Settings imported in-memory! Click 'SAVE ALL CHANGES' to apply them.");
          self.renderPanel();
        } catch (err) {
          console.error("Import settings failed:", err);
          alert("Failed to import settings: " + err.message);
        }
      };
      reader.readAsText(file);
    },

    checkForUpdates: function() {
      var self = this;
      var currentVersion = "trmnl-dashboard-cache-v44";
      
      if (!navigator.onLine) return;
      
      fetch('./sw.js?t=' + Date.now())
        .then(function(res) {
          if (!res.ok) throw new Error("HTTP error " + res.status);
          return res.text();
        })
        .then(function(text) {
          var match = text.match(/CACHE_NAME\s*=\s*["']([^"']+)["']/);
          if (match && match[1]) {
            var serverVersion = match[1];
            if (serverVersion !== currentVersion) {
              var wrapper = self.container ? self.container.querySelector('#cfg-update-indicator-wrapper') : null;
              if (wrapper) {
                wrapper.style.display = 'block';
              }
            }
          }
        })
        .catch(function(err) {
          console.warn("Failed to check for updates:", err);
        });
    },

    renderPanel: function() {
      if (!this.container) return;

      var self = this;
      var activeTab = this.activeTab;

      // Start settings container HTML
      var html = '<div class="settings-container">';
      
      // Header Section
      html += '  <div class="settings-header">';
      html += '    <div class="settings-title">DASHBOARD CONFIGURATION</div>';
      html += '  </div>';

      // Settings Body (Sidebar + Content Panel)
      html += '  <div class="settings-body">';
      
      // Sidebar Navigation
      html += '    <div class="settings-sidebar">';
      html += '      <button class="settings-tab-btn' + (activeTab === 'general' ? ' active' : '') + '" data-tab="general">';
      html += '        ' + window.getIcon('sliders') + '<span>GENERAL</span>';
      html += '      </button>';
      html += '      <button class="settings-tab-btn' + (activeTab === 'transit' ? ' active' : '') + '" data-tab="transit">';
      html += '        ' + window.getIcon('bus') + '<span>LOCATION &amp; TRANSIT</span>';
      html += '      </button>';
      html += '      <button class="settings-tab-btn' + (activeTab === 'stats' ? ' active' : '') + '" data-tab="stats">';
      html += '        ' + window.getIcon('chart-line') + '<span>PERSONAL STATS</span>';
      html += '      </button>';
      html += '      <button class="settings-tab-btn' + (activeTab === 'todoist' ? ' active' : '') + '" data-tab="todoist">';
      html += '        ' + window.getIcon('list-check') + '<span>TODOIST</span>';
      html += '      </button>';
      html += '      <button class="settings-tab-btn' + (activeTab === 'history' ? ' active' : '') + '" data-tab="history">';
      html += '        ' + window.getIcon('clock-rotate-left') + '<span>HISTORY</span>';
      html += '      </button>';
      html += '      <button class="settings-tab-btn' + (activeTab === 'plugins' ? ' active' : '') + '" data-tab="plugins">';
      html += '        ' + window.getIcon('puzzle-piece') + '<span>PLUGINS</span>';
      html += '      </button>';
      html += '      <button class="settings-tab-btn' + (activeTab === 'backup' ? ' active' : '') + '" data-tab="backup">';
      html += '        ' + window.getIcon('database') + '<span>BACKUP &amp; RESET</span>';
      html += '      </button>';
      html += '    </div>';

      // Settings Content Panel
      html += '    <div class="settings-content">';

      // TAB 1: GENERAL PANE
      html += '      <div class="settings-pane' + (activeTab === 'general' ? ' active' : '') + '" id="pane-general">';
      html += '        <div class="settings-section-title">Global Theme &amp; Refresh Cycles</div>';
      
      html += '        <div class="form-group">';
      html += '          <label for="cfg-theme">Theme Profile</label>';
      html += '          <select id="cfg-theme">';
      html += '            <option value="auto"' + (this.editedSettings.theme === 'auto' ? ' selected' : '') + '>Auto (Coal Dark mode after 6:00 PM)</option>';
      html += '            <option value="paper"' + (this.editedSettings.theme === 'paper' ? ' selected' : '') + '>Paper (Warm E-Paper White)</option>';
      html += '            <option value="coal"' + (this.editedSettings.theme === 'coal' ? ' selected' : '') + '>Coal (Minimal Dark Theme)</option>';
      html += '            <option value="stark"' + (this.editedSettings.theme === 'stark' ? ' selected' : '') + '>Stark (High-Contrast Black &amp; White)</option>';
      html += '            <option value="ft"' + (this.editedSettings.theme === 'ft' ? ' selected' : '') + '>FT (Salmon/Peach Editorial Cream)</option>';
      html += '          </select>';
      html += '        </div>';

      html += '        <div class="form-row">';
      html += '          <div class="form-group">';
      html += '            <label for="cfg-interval">Cycle Refresh Interval</label>';
      html += '            <select id="cfg-interval">';
      html += '              <option value="0"' + (this.editedSettings.refreshInterval === 0 ? ' selected' : '') + '>Manual Only (No Auto-cycle)</option>';
      html += '              <option value="15"' + (this.editedSettings.refreshInterval === 15 ? ' selected' : '') + '>15 Seconds</option>';
      html += '              <option value="30"' + (this.editedSettings.refreshInterval === 30 ? ' selected' : '') + '>30 Seconds</option>';
      html += '              <option value="60"' + (this.editedSettings.refreshInterval === 60 ? ' selected' : '') + '>60 Seconds (1 Min)</option>';
      html += '              <option value="120"' + (this.editedSettings.refreshInterval === 120 ? ' selected' : '') + '>120 Seconds (2 Mins)</option>';
      html += '            </select>';
      html += '          </div>';
      
      html += '          <div class="form-group">';
      html += '            <label for="cfg-flash">E-Ink Refresh Flash</label>';
      html += '            <select id="cfg-flash">';
      html += '              <option value="true"' + (this.editedSettings.flashRefresh ? ' selected' : '') + '>Enabled (Full Black Blink)</option>';
      html += '              <option value="false"' + (!this.editedSettings.flashRefresh ? ' selected' : '') + '>Disabled (Smooth Transition)</option>';
      html += '            </select>';
      html += '          </div>';
      html += '        </div>';

      html += '        <div class="settings-section-title">Connectivity &amp; Assets</div>';
      html += '        <div class="form-group">';
      html += '          <label>Wifi QR Code Image</label>';
      html += '          <div class="file-upload-wrapper">';
      html += '            <input type="file" id="cfg-wifi-qr-img" accept="image/*" style="display:none;">';
      html += '            <button class="file-upload-btn" onclick="document.getElementById(\'cfg-wifi-qr-img\').click();">CHOOSE IMAGE</button>';
      if (this.wifiQrBase64) {
        html += '            <button class="file-upload-btn" id="cfg-wifi-qr-clear" style="border-style:dashed;">CLEAR IMAGE</button>';
      }
      html += '            <span id="cfg-wifi-qr-preview" style="font-family:var(--font-mono); font-size:11px; opacity:0.75;">';
      html += (this.wifiQrBase64 ? '✓ Wifi QR Loaded' : 'No image loaded (shows placeholder)');
      html += '            </span>';
      html += '          </div>';
      html += '        </div>';

      html += '        <div class="form-group">';
      html += '          <label>Wallpaper Background</label>';
      html += '          <div class="wallpaper-preview-container">';
      html += '            <div class="wallpaper-current-preview">';
      if (this.editedSettings.wallpaper === 'custom' && this.editedSettings.customWallpaperBase64) {
        html += '              <img src="' + this.editedSettings.customWallpaperBase64 + '" alt="Custom Wallpaper">';
      } else {
        html += '              <img src="wallpapers/' + (this.editedSettings.wallpaper || 'pixel_art_landscape.png') + '" alt="Current Wallpaper" onerror="this.src=\'wallpapers/pixel_art_landscape.png\'">';
      }
      html += '            </div>';
      html += '            <div class="wallpaper-current-info">';
      var wallName = this.editedSettings.wallpaper || 'pixel_art_landscape.png';
      if (wallName === 'custom') {
        wallName = 'Custom (Uploaded)';
      }
      html += '              <div class="wallpaper-current-name" id="cfg-wallpaper-current-name">' + wallName.replace('.png', '').replace('.jpg', '').replace('.jpeg', '') + '</div>';
      html += '              <button class="wallpaper-change-btn" id="cfg-wallpaper-change-btn" type="button">Change Wallpaper</button>';
      html += '            </div>';
      html += '          </div>';
      html += '        </div>';

      html += '        <div id="cfg-update-indicator-wrapper" style="display:none; margin-top:10px;">';
      html += '          <button class="trmnl-btn" id="cfg-update-indicator-btn" style="width: 100%; font-size: 11px; background-color: var(--text-color); color: var(--bg-color);">NEW UPDATE DETECTED — CLICK TO APPLY SOFTWARE UPDATE</button>';
      html += '        </div>';
      html += '      </div>';

      // TAB 2: TRANSIT PANE
      html += '      <div class="settings-pane' + (activeTab === 'transit' ? ' active' : '') + '" id="pane-transit">';
      html += '        <div class="settings-section-title">Location &amp; Coordinates</div>';
      html += '        <div class="form-row">';
      html += '          <div class="form-group" style="flex: 1.5;">';
      html += '            <label for="cfg-name">Location / City Name</label>';
      html += '            <input type="text" id="cfg-name" value="' + this.editedSettings.locationName + '" placeholder="e.g. Helsinki">';
      html += '          </div>';
      html += '          <div class="form-group" style="flex: 1;">';
      html += '            <label for="cfg-unit">Temperature Unit</label>';
      html += '            <select id="cfg-unit">';
      html += '              <option value="celsius"' + (this.editedSettings.tempUnit === 'celsius' ? ' selected' : '') + '>Celsius (°C)</option>';
      html += '              <option value="fahrenheit"' + (this.editedSettings.tempUnit === 'fahrenheit' ? ' selected' : '') + '>Fahrenheit (°F)</option>';
      html += '            </select>';
      html += '          </div>';
      html += '        </div>';

      html += '        <div style="font-family:var(--font-mono); font-size:10px; margin-top:-4px; opacity:0.65;">';
      html += '          Active Coordinates: Lat ' + (parseFloat(this.editedSettings.latitude) || 60.1699).toFixed(4) + ' / Lon ' + (parseFloat(this.editedSettings.longitude) || 24.9384).toFixed(4);
      html += '        </div>';

      html += '        <div class="settings-section-title">HSL Helsinki Region Transport</div>';
      html += '        <div class="form-row">';
      html += '          <div class="form-group" style="flex: 2;">';
      html += '            <label for="cfg-hsl-neighbourhood">HSL Neighbourhood / Address</label>';
      html += '            <input type="text" id="cfg-hsl-neighbourhood" value="' + this.editedSettings.hslNeighbourhood + '" placeholder="e.g. Kallio">';
      html += '          </div>';
      html += '          <div class="form-group" style="flex: 1;">';
      html += '            <label for="cfg-hsl-radius">Search Radius (m)</label>';
      html += '            <input type="number" id="cfg-hsl-radius" value="' + this.editedSettings.hslRadius + '" min="100" max="5000" step="50">';
      html += '          </div>';
      html += '        </div>';

      html += '        <div class="form-group">';
      html += '          <label for="cfg-digitransit-key">Digitransit API Key</label>';
      html += '          <input type="password" id="cfg-digitransit-key" value="' + this.editedSettings.digitransitApiKey + '" placeholder="Paste api key here..." autocomplete="off">';
      html += '        </div>';
      html += '      </div>';

      // TAB 3: PERSONAL METRICS PANE
      html += '      <div class="settings-pane' + (activeTab === 'stats' ? ' active' : '') + '" id="pane-stats">';
      html += '        <div class="settings-section-title">Birthdates &amp; Anniversaries</div>';
      
      html += '        <div class="form-row">';
      html += '          <div class="form-group">';
      html += '            <label for="stats-birthdate">Your Birthdate (YYYY-MM-DD)</label>';
      html += '            <input type="text" id="stats-birthdate" value="' + this.editedSettings.birthdate + '" placeholder="YYYY-MM-DD">';
      html += '          </div>';
      
      html += '          <div class="form-group">';
      html += '            <label for="stats-marriage-date">Marriage Date (YYYY-MM-DD)</label>';
      html += '            <input type="text" id="stats-marriage-date" value="' + this.editedStats.marriageDate + '" placeholder="YYYY-MM-DD">';
      html += '          </div>';
      html += '        </div>';

      html += '        <div class="form-row">';
      html += '          <div class="form-group">';
      html += '            <label for="stats-child1-name">Child 1 Name</label>';
      html += '            <input type="text" id="stats-child1-name" value="' + (this.editedStats.child1Name || 'Child 1') + '" placeholder="Child 1">';
      html += '          </div>';
      html += '          <div class="form-group">';
      html += '            <label for="stats-child1-date">Child 1 Birthdate (YYYY-MM-DD)</label>';
      html += '            <input type="text" id="stats-child1-date" value="' + this.editedStats.child1Date + '" placeholder="YYYY-MM-DD">';
      html += '          </div>';
      html += '        </div>';

      html += '        <div class="form-row">';
      html += '          <div class="form-group">';
      html += '            <label for="stats-child2-name">Child 2 Name</label>';
      html += '            <input type="text" id="stats-child2-name" value="' + (this.editedStats.child2Name || 'Child 2') + '" placeholder="Child 2">';
      html += '          </div>';
      html += '          <div class="form-group">';
      html += '            <label for="stats-child2-date">Child 2 Birthdate (YYYY-MM-DD)</label>';
      html += '            <input type="text" id="stats-child2-date" value="' + this.editedStats.child2Date + '" placeholder="YYYY-MM-DD">';
      html += '          </div>';
      html += '        </div>';

      html += '        <div class="form-row">';
      html += '          <div class="form-group">';
      html += '            <label for="stats-story-frequency">Bedtime Stories / Week</label>';
      html += '            <input type="number" id="stats-story-frequency" value="' + (this.editedStats.storySessionsPerWeek !== undefined ? this.editedStats.storySessionsPerWeek : 7) + '" min="1" max="7" step="1">';
      html += '          </div>';
      html += '          <div class="form-group">';
      html += '            <label for="stats-story-duration">Story Duration (mins)</label>';
      html += '            <input type="number" id="stats-story-duration" value="' + (this.editedStats.storyDurationMinutes !== undefined ? this.editedStats.storyDurationMinutes : 10) + '" min="5" max="60" step="5">';
      html += '          </div>';
      html += '        </div>';

      html += '        <div class="settings-section-title">Habits &amp; Making Things Metrics</div>';
      html += '        <div class="form-row">';
      html += '          <div class="form-group" style="flex: 1.5;">';
      html += '            <label for="stats-cook-date">Cooking Start Date (YYYY-MM-DD)</label>';
      html += '            <input type="text" id="stats-cook-date" value="' + this.editedStats.cookingStartDate + '" placeholder="YYYY-MM-DD">';
      html += '          </div>';
      html += '          <div class="form-group" style="flex: 1;">';
      html += '            <label for="stats-meals-per-day">Meals Prepared / Day</label>';
      html += '            <input type="number" id="stats-meals-per-day" value="' + this.editedStats.mealsPerDay + '" min="1" max="6">';
      html += '          </div>';
      html += '          <div class="form-group" style="flex: 1;">';
      html += '            <label for="stats-sleep-hours">Sleep Hours / Day</label>';
      html += '            <input type="number" id="stats-sleep-hours" value="' + this.editedStats.sleepHoursPerDay + '" min="4" max="12" step="0.5">';
      html += '          </div>';
      html += '        </div>';

      html += '        <div class="form-row">';
      html += '          <div class="form-group" style="flex: 1.5;">';
      html += '            <label for="stats-write-date">Writing Start Date (YYYY-MM-DD)</label>';
      html += '            <input type="text" id="stats-write-date" value="' + this.editedStats.writingStartDate + '" placeholder="YYYY-MM-DD">';
      html += '          </div>';
      html += '          <div class="form-group" style="flex: 1;">';
      html += '            <label for="stats-articles-per-month">Articles / Month</label>';
      html += '            <input type="number" id="stats-articles-per-month" value="' + this.editedStats.articlesPerMonth + '" min="1" max="30">';
      html += '          </div>';
      html += '          <div class="form-group" style="flex: 1;">';
      html += '            <label for="stats-words-per-article">Words / Article</label>';
      html += '            <input type="number" id="stats-words-per-article" value="' + this.editedStats.wordsPerArticle + '" step="100" min="500">';
      html += '          </div>';
      html += '        </div>';
      html += '      </div>';
      
      // TAB 4: TODOIST PANE
      html += '      <div class="settings-pane' + (activeTab === 'todoist' ? ' active' : '') + '" id="pane-todoist">';
      html += '        <div class="settings-section-title">Todoist Integration</div>';
      html += '        <div class="form-group">';
      html += '          <label for="cfg-todoist-key">Personal API Token</label>';
      html += '          <input type="password" id="cfg-todoist-key" value="' + (this.editedSettings.todoistApiKey || '') + '" placeholder="Paste Todoist API token here..." autocomplete="off">';
      html += '          <div class="field-desc">Find your Personal API token in Todoist Settings &gt; Integrations &gt; Developer. Works on free accounts.</div>';
      html += '        </div>';
      html += '        <div class="form-group">';
      html += '          <label for="cfg-todoist-filter">Task Filter Query</label>';
      html += '          <input type="text" id="cfg-todoist-filter" value="' + (this.editedSettings.todoistFilter || 'today | overdue') + '" placeholder="e.g. today | overdue">';
      html += '          <div class="field-desc">Todoist filter query (e.g. "today | overdue", "#Work", "priority 4"). Leave empty for all tasks.</div>';
      html += '        </div>';
      html += '        <div class="form-group">';
      html += '          <label for="cfg-todoist-max">Max Tasks</label>';
      html += '          <input type="number" id="cfg-todoist-max" value="' + (this.editedSettings.todoistMaxTasks || 6) + '" min="1" max="15" step="1">';
      html += '          <div class="field-desc">Number of tasks to show (1-15).</div>';
      html += '        </div>';
      html += '      </div>';

      // TAB 5: HISTORY PANE
      html += '      <div class="settings-pane' + (activeTab === 'history' ? ' active' : '') + '" id="pane-history">';
      html += '        <div class="settings-section-title">Wikipedia Today in History</div>';
      html += '        <div class="form-group">';
      html += '          <label for="cfg-history-births-deaths">Show Births &amp; Deaths</label>';
      html += '          <select id="cfg-history-births-deaths">';
      html += '            <option value="true"' + (this.editedSettings.historyShowBirthsDeaths ? ' selected' : '') + '>Show Events, Births &amp; Deaths</option>';
      html += '            <option value="false"' + (!this.editedSettings.historyShowBirthsDeaths ? ' selected' : '') + '>Show Events Only (Hides Births &amp; Deaths)</option>';
      html += '          </select>';
      html += '          <div class="field-desc">Choose whether to display daily births and deaths or maximize space for events.</div>';
      html += '        </div>';
      html += '        <div class="form-group">';
      html += '          <label for="cfg-history-event-mode">Event Selection Mode</label>';
      html += '          <select id="cfg-history-event-mode">';
      html += '            <option value="default"' + (this.editedSettings.historyEventMode === 'default' ? ' selected' : '') + '>Newest First (Wikipedia Default)</option>';
      html += '            <option value="oldest"' + (this.editedSettings.historyEventMode === 'oldest' ? ' selected' : '') + '>Oldest First (Chronological)</option>';
      html += '            <option value="mix"' + (this.editedSettings.historyEventMode === 'mix' ? ' selected' : '') + '>Mixed Eras (Oldest, Mid-Era &amp; Recent)</option>';
      html += '          </select>';
      html += '          <div class="field-desc">Choose how events are sampled and sorted. Mixed mode shows a curated selection across history.</div>';
      html += '        </div>';
      html += '      </div>';

      // TAB: PLUGINS PANE
      html += '      <div class="settings-pane' + (activeTab === 'plugins' ? ' active' : '') + '" id="pane-plugins">';
      html += '        <div class="settings-section-title">Plugin Visibility Settings</div>';
      html += '        <div class="field-desc" style="margin-bottom: 12px; font-size: 11px;">Configure which plugins are cycled automatically in the carousel and which appear in the footer\'s quick switcher menu.</div>';
      
      html += '        <table class="plugins-visibility-table">';
      html += '          <thead>';
      html += '            <tr>';
      html += '              <th>PLUGIN NAME</th>';
      html += '              <th style="text-align: center;">CAROUSEL</th>';
      html += '              <th style="text-align: center;">QUICK MENU</th>';
      html += '              <th style="text-align: center;">STATUS</th>';
      html += '            </tr>';
      html += '          </thead>';
      html += '          <tbody>';

      var registry = window.Plugins || {};
      var order = ['time', 'history', 'life', 'stats', 'weather', 'sun', 'todoist', 'word', 'finnish', 'wifi', 'news', 'wikirandom', 'wikiphoto', 'laundry', 'hsl'];
      
      var self = this;
      order.forEach(function(pluginId) {
        var plugin = registry[pluginId];
        if (!plugin) return;

        var cleanName = plugin.name || pluginId;
        if (cleanName === 'This Day in History (Wikipedia)') cleanName = 'This Day in History';
        
        var pluginConf = self.editedSettings.plugins && self.editedSettings.plugins[pluginId] ? self.editedSettings.plugins[pluginId] : {};
        
        var showCarousel = pluginConf.showInCarousel !== false;
        var showQuick = pluginConf.showInQuickMenu !== false;
        var isEnabled = pluginConf.enabled !== false;
        
        html += '            <tr>';
        html += '              <td class="plugin-table-name">' + cleanName.toUpperCase() + '</td>';
        html += '              <td style="text-align: center;">';
        html += '                <input type="checkbox" class="trmnl-checkbox" id="chk-carousel-' + pluginId + '"' + (showCarousel ? ' checked' : '') + (isEnabled ? '' : ' disabled') + '>';
        html += '              </td>';
        html += '              <td style="text-align: center;">';
        html += '                <input type="checkbox" class="trmnl-checkbox" id="chk-quick-' + pluginId + '"' + (showQuick ? ' checked' : '') + (isEnabled ? '' : ' disabled') + '>';
        html += '              </td>';
        html += '              <td style="text-align: center;">';
        html += '                <span class="plugin-status-badge ' + (isEnabled ? 'status-enabled' : 'status-disabled') + '">' + (isEnabled ? 'ACTIVE' : 'OFF') + '</span>';
        html += '              </td>';
        html += '            </tr>';
      });

      html += '          </tbody>';
      html += '        </table>';
      html += '      </div>';

      // TAB 5: BACKUP & RESTORE PANE
      html += '      <div class="settings-pane' + (activeTab === 'backup' ? ' active' : '') + '" id="pane-backup">';
      html += '        <div class="settings-section-title">Backup &amp; Restore Configuration</div>';
      html += '        <div style="display:flex; margin-bottom: 20px;">';
      html += '          <button class="trmnl-btn" id="btn-export-settings" style="flex:1; margin-right:12px;">' + window.getIcon('download', 'margin-right:8px;') + 'EXPORT BACKUP</button>';
      html += '          <input type="file" id="btn-import-file" accept=".json" style="display:none;">';
      html += '          <button class="trmnl-btn" id="btn-import-trigger" style="flex:1;">' + window.getIcon('upload', 'margin-right:8px;') + 'IMPORT BACKUP</button>';
      html += '        </div>';

      html += '        <div class="settings-section-title">Factory Reset</div>';
      html += '        <button class="trmnl-btn secondary" id="cfg-reset-btn" style="width: 100%; border-style:dashed; border-color:#cc0000; color:#cc0000;">RESET ALL overrides</button>';
      html += '      </div>';

      html += '    </div>'; // End Settings Content Panel
      html += '  </div>'; // End Settings Body

      // Settings Footer (Actions)
      html += '  <div class="settings-footer">';
      html += '    <button class="trmnl-btn secondary" id="cfg-cancel-btn">CANCEL</button>';
      html += '    <button class="trmnl-btn" id="cfg-save-btn">SAVE ALL CHANGES</button>';
      html += '  </div>';

      html += '</div>'; // End Settings Container

      // Wallpaper Selection Modal Overlay
      html += '<div class="wallpaper-modal-overlay" id="wallpaper-modal">';
      html += '  <div class="wallpaper-modal">';
      html += '    <div class="wallpaper-modal-header">';
      html += '      <div class="wallpaper-modal-title">Select Wallpaper</div>';
      html += '      <button class="wallpaper-modal-close" id="wallpaper-modal-close" type="button">&times;</button>';
      html += '    </div>';
      html += '    <div class="wallpaper-modal-body">';
      
      // Upload Section
      html += '      <div class="wallpaper-upload-section" id="wallpaper-upload-section">';
      html += '        ' + window.getIcon('cloud-arrow-up', '', '22px');
      html += '        <span>Upload Custom Photo</span>';
      html += '        <input type="file" id="wallpaper-file-input" accept="image/*" style="display:none;">';
      html += '      </div>';
      
      // Gallery Grid
      html += '      <div class="wallpaper-grid" id="wallpaper-grid-container">';
      html += '        <div style="grid-column: span 3; text-align: center; font-family: var(--font-mono); font-size: 11px; padding: 20px; opacity: 0.7;">Loading gallery...</div>';
      html += '      </div>';
      
      html += '    </div>';
      html += '    <div class="wallpaper-modal-footer">';
      html += '      <button class="trmnl-btn secondary" id="wallpaper-modal-cancel" type="button">Cancel</button>';
      html += '      <button class="trmnl-btn" id="wallpaper-modal-apply" type="button">Select Wallpaper</button>';
      html += '    </div>';
      html += '  </div>';
      html += '</div>';

      this.container.innerHTML = html;

      // Event Bindings
      var saveBtn = this.container.querySelector('#cfg-save-btn');
      var cancelBtn = this.container.querySelector('#cfg-cancel-btn');
      var resetBtn = this.container.querySelector('#cfg-reset-btn');
      
      var exportBtn = this.container.querySelector('#btn-export-settings');
      var importTrigger = this.container.querySelector('#btn-import-trigger');
      var importFileInput = this.container.querySelector('#btn-import-file');
      
      var updateIndicatorBtn = this.container.querySelector('#cfg-update-indicator-btn');

      // Stop touch/click propagation inside settings forms to prevent orchestrator swipes
      var formInputs = this.container.querySelectorAll('input, select, button, textarea');
      formInputs.forEach(function(elem) {
        elem.addEventListener('click', function(e) {
          e.stopPropagation();
        });
        elem.addEventListener('touchstart', function(e) {
          e.stopPropagation();
        });
        elem.addEventListener('touchend', function(e) {
          e.stopPropagation();
        });
      });

      // Bind Save
      if (saveBtn) {
        saveBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          self.saveSettings();
        });
      }

      // Bind Cancel
      if (cancelBtn) {
        cancelBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          self.cancelSettings();
        });
      }

      // Bind Reset All
      if (resetBtn) {
        resetBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          if (confirm("Prune all browser settings overrides (including Personal Stats) and reload defaults from config.js?")) {
            self.resetAll();
          }
        });
      }

      // Bind Export
      if (exportBtn) {
        exportBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          self.exportSettings();
        });
      }

      // Bind Import
      if (importTrigger && importFileInput) {
        importTrigger.addEventListener('click', function(e) {
          e.stopPropagation();
          importFileInput.click();
        });
        importFileInput.addEventListener('change', function(e) {
          var file = importFileInput.files[0];
          if (file) {
            self.importSettings(file);
          }
        });
      }

      // Bind Tab Navigation
      var tabButtons = this.container.querySelectorAll('.settings-tab-btn');
      tabButtons.forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var targetTab = btn.getAttribute('data-tab');
          self.setTab(targetTab);
          self.renderPanel();
        });
      });

      // File Reader Bindings (Wifi QR Image)
      var wifiFileInput = this.container.querySelector('#cfg-wifi-qr-img');
      var wifiFileClearBtn = this.container.querySelector('#cfg-wifi-qr-clear');

      if (wifiFileInput) {
        wifiFileInput.addEventListener('change', function() {
          var file = wifiFileInput.files[0];
          if (file) {
            var reader = new FileReader();
            reader.onload = function(e) {
              self.wifiQrBase64 = e.target.result;
              var preview = self.container.querySelector('#cfg-wifi-qr-preview');
              if (preview) {
                preview.textContent = "✓ Loaded: " + file.name.substring(0, 15) + "...";
              }
              // Re-render to show clear button
              self.renderPanel();
            };
            reader.readAsDataURL(file);
          }
        });
      }

      if (wifiFileClearBtn) {
        wifiFileClearBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          self.wifiQrBase64 = null;
          self.renderPanel();
        });
      }

      // --- Wallpaper Modal Event Bindings & Logic ---
      var wpChangeBtn = this.container.querySelector('#cfg-wallpaper-change-btn');
      var wpModal = this.container.querySelector('#wallpaper-modal');
      var wpCloseBtn = this.container.querySelector('#wallpaper-modal-close');
      var wpCancelBtn = this.container.querySelector('#wallpaper-modal-cancel');
      var wpApplyBtn = this.container.querySelector('#wallpaper-modal-apply');
      var wpUploadSection = this.container.querySelector('#wallpaper-upload-section');
      var wpFileInput = this.container.querySelector('#wallpaper-file-input');
      var wpGridContainer = this.container.querySelector('#wallpaper-grid-container');

      var modalSelectedWallpaper = self.editedSettings.wallpaper || 'pixel_art_landscape.png';
      var modalCustomBase64 = self.editedSettings.customWallpaperBase64 || null;

      function resizeImage(base64Str, maxWidth, maxHeight, callback) {
        var img = new Image();
        img.onload = function() {
          var width = img.width;
          var height = img.height;
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round(height * (maxWidth / width));
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round(width * (maxHeight / height));
              height = maxHeight;
            }
          }
          var canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          var resized = canvas.toDataURL('image/jpeg', 0.75);
          callback(resized);
        };
        img.onerror = function() {
          callback(base64Str);
        };
        img.src = base64Str;
      }

      function scanWallpapers(callback) {
        var defaultWallpapers = ['pixel_art_landscape.png', 'pixel_art_landscape_dark.png'];
        if (!navigator.onLine) {
          callback(defaultWallpapers);
          return;
        }
        fetch('./wallpapers/', {
          headers: { 'Accept': 'application/json' }
        })
        .then(function(res) {
          if (!res.ok) throw new Error("Fetch listing failed");
          var contentType = res.headers.get('content-type') || '';
          if (contentType.indexOf('application/json') !== -1) {
            return res.json();
          } else {
            return res.text();
          }
        })
        .then(function(data) {
          var files = [];
          if (typeof data === 'object' && Array.isArray(data)) {
            files = data.filter(function(item) {
              return item.type === 'file' && /\.(png|jpe?g|webp|gif)$/i.test(item.name);
            }).map(function(item) {
              return item.name;
            });
          } else if (typeof data === 'string') {
            var parser = new DOMParser();
            var doc = parser.parseFromString(data, 'text/html');
            var links = doc.querySelectorAll('a');
            var matched = {};
            for (var i = 0; i < links.length; i++) {
              var href = links[i].getAttribute('href') || '';
              href = href.split('?')[0].split('#')[0];
              var decoded = decodeURIComponent(href);
              var basename = decoded.substring(decoded.lastIndexOf('/') + 1);
              if (basename && /\.(png|jpe?g|webp|gif)$/i.test(basename)) {
                matched[basename] = true;
              }
            }
            files = Object.keys(matched);
          }
          defaultWallpapers.forEach(function(w) {
            if (files.indexOf(w) === -1) files.push(w);
          });
          callback(files);
        })
        .catch(function(err) {
          console.warn("Scanning failed, using default list", err);
          callback(defaultWallpapers);
        });
      }

      function isDarkVersion(filename, allFiles) {
        var parts = filename.split('.');
        if (parts.length < 2) return false;
        var ext = parts.pop();
        var base = parts.join('.');
        if (base.endsWith('_dark')) {
          var lightBase = base.substring(0, base.length - 5);
          var lightName = lightBase + '.' + ext;
          return allFiles.indexOf(lightName) !== -1;
        }
        return false;
      }

      function renderGrid(files) {
        if (!wpGridContainer) return;
        wpGridContainer.innerHTML = '';

        // Filter out _dark versions if their light partner exists to keep UI tidy
        var displayFiles = files.filter(function(f) {
          return !isDarkVersion(f, files);
        });

        // Add custom upload thumbnail if base64 exists
        if (modalCustomBase64) {
          displayFiles.unshift('custom');
        }

        displayFiles.forEach(function(file) {
          var item = document.createElement('div');
          item.className = 'wallpaper-item' + (modalSelectedWallpaper === file ? ' selected' : '');
          item.setAttribute('data-wallpaper', file);
          
          var badge = document.createElement('div');
          badge.className = 'wallpaper-item-selected-badge';
          badge.innerHTML = '✓';
          item.appendChild(badge);

          var img = document.createElement('img');
          var name = '';
          if (file === 'custom') {
            img.src = modalCustomBase64;
            name = 'CUSTOM PHOTO';
          } else {
            img.src = 'wallpapers/' + file;
            img.onerror = function() { img.src = 'wallpapers/pixel_art_landscape.png'; };
            name = file.replace('.png', '').replace('.jpg', '').replace('.jpeg', '').replace('_', ' ');
          }
          item.appendChild(img);

          var label = document.createElement('div');
          label.className = 'wallpaper-item-label';
          label.textContent = name;
          item.appendChild(label);

          item.addEventListener('click', function(e) {
            e.stopPropagation();
            modalSelectedWallpaper = file;
            var items = wpGridContainer.querySelectorAll('.wallpaper-item');
            items.forEach(function(it) {
              it.classList.remove('selected');
            });
            item.classList.add('selected');
          });

          wpGridContainer.appendChild(item);
        });
      }

      if (wpChangeBtn && wpModal) {
        wpChangeBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          wpModal.classList.add('active');
          modalSelectedWallpaper = self.editedSettings.wallpaper || 'pixel_art_landscape.png';
          modalCustomBase64 = self.editedSettings.customWallpaperBase64 || null;
          
          if (wpGridContainer) {
            wpGridContainer.innerHTML = '<div style="grid-column: span 3; text-align: center; font-family: var(--font-mono); font-size: 11px; padding: 20px; opacity: 0.7;">Loading gallery...</div>';
          }

          scanWallpapers(function(files) {
            self.scannedWallpaperList = files; // Cache list in settings plugin
            renderGrid(files);
          });
        });
      }

      function closeModal() {
        if (wpModal) wpModal.classList.remove('active');
      }

      if (wpCloseBtn) {
        wpCloseBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          closeModal();
        });
      }

      if (wpCancelBtn) {
        wpCancelBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          closeModal();
        });
      }

      if (wpUploadSection && wpFileInput) {
        wpUploadSection.addEventListener('click', function(e) {
          e.stopPropagation();
          wpFileInput.click();
        });

        wpFileInput.addEventListener('change', function(e) {
          e.stopPropagation();
          var file = wpFileInput.files[0];
          if (file) {
            var reader = new FileReader();
            reader.onload = function(evt) {
              resizeImage(evt.target.result, 1024, 768, function(resizedBase64) {
                modalCustomBase64 = resizedBase64;
                modalSelectedWallpaper = 'custom';
                
                // Re-scan/re-render grid to show new custom upload
                scanWallpapers(function(files) {
                  self.scannedWallpaperList = files;
                  renderGrid(files);
                });
              });
            };
            reader.readAsDataURL(file);
          }
        });
      }

      if (wpApplyBtn) {
        wpApplyBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          self.editedSettings.wallpaper = modalSelectedWallpaper;
          if (modalSelectedWallpaper === 'custom') {
            self.editedSettings.customWallpaperBase64 = modalCustomBase64;
            self.editedSettings.wallpaperDark = null;
          } else {
            // Find if a dark counterpart exists for the selected wallpaper
            var lightName = modalSelectedWallpaper;
            var parts = lightName.split('.');
            var ext = parts.pop();
            var base = parts.join('.');
            var darkName = base + '_dark.' + ext;
            
            var hasDark = false;
            var files = self.scannedWallpaperList || [];
            if (files.indexOf(darkName) !== -1) {
              hasDark = true;
            }
            
            // Hardcoded fallback logic for default wallpapers if offline
            if (!hasDark && (lightName === 'pixel_art_landscape.png' || lightName === 'pixel_art_landscape_dark.png')) {
              hasDark = true;
              darkName = 'pixel_art_landscape_dark.png';
            }
            
            self.editedSettings.wallpaperDark = hasDark ? darkName : null;
          }
          closeModal();
          // Re-render settings panel to show the selected wallpaper in the preview block
          self.renderPanel();
        });
      }

      // Live Theme Preview Binding
      var themeSelect = this.container.querySelector('#cfg-theme');
      if (themeSelect) {
        themeSelect.addEventListener('change', function() {
          var selectedTheme = themeSelect.value;
          var body = document.body;
          body.className = '';
          
          if (selectedTheme === 'coal') {
            body.classList.add('theme-coal');
          } else if (selectedTheme === 'stark') {
            body.classList.add('theme-stark');
          } else if (selectedTheme === 'ft') {
            body.classList.add('theme-ft');
          } else if (selectedTheme === 'auto') {
            var now = new Date();
            var hour = now.getHours();
            var isNightTime = (hour >= 18 || hour < 8);
            if (isNightTime) {
              body.classList.add('theme-coal');
            }
          }
        });
      }

      // Bind Update reload button if visible
      if (updateIndicatorBtn) {
        updateIndicatorBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          if (confirm("This will clear cached app files, check for server updates, and reload. Settings will be preserved. Proceed?")) {
            updateIndicatorBtn.disabled = true;
            updateIndicatorBtn.textContent = "UPDATING...";
            
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.getRegistrations().then(function(registrations) {
                var promises = [];
                registrations.forEach(function(reg) {
                  promises.push(reg.unregister());
                });
                
                Promise.all(promises).then(function() {
                  clearCachesAndReload();
                }).catch(function() {
                  clearCachesAndReload();
                });
              }).catch(function() {
                clearCachesAndReload();
              });
            } else {
              clearCachesAndReload();
            }
          }
          
          function clearCachesAndReload() {
            if (window.caches) {
              caches.keys().then(function(keys) {
                var cachePromises = [];
                keys.forEach(function(key) {
                  cachePromises.push(caches.delete(key));
                });
                
                Promise.all(cachePromises).then(function() {
                  window.location.reload(true);
                }).catch(function() {
                  window.location.reload(true);
                });
              }).catch(function() {
                window.location.reload(true);
              });
            } else {
              window.location.reload(true);
            }
          }
        });
      }

      // Check for update availability dynamically
      this.checkForUpdates();
    }
  };

  // Register plugin
  window.Plugins = window.Plugins || {};
  window.Plugins.settings = SettingsPlugin;

})();
