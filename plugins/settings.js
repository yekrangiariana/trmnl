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
    editedFinnishSeenList: null,
    editedLaundryPrice: null,

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
        theme: activeConfig.theme || 'auto',
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
        wallpaperEInk: activeConfig.wallpaperEInk || false,
        cycleWallpapers: activeConfig.cycleWallpapers || false,
        wallpaperZoom: activeConfig.wallpaperZoom !== undefined ? activeConfig.wallpaperZoom : 1.0,
        clockPlacement: activeConfig.clockPlacement || 'middle-center',
        clockComposition: activeConfig.clockComposition || 'comp-default'
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

      if (!this.editedSettings.plugins.time) {
        this.editedSettings.plugins.time = {};
      }
      this.editedSettings.plugins.time.enabled = true;
      this.editedSettings.plugins.time.showInCarousel = true;
      this.editedSettings.plugins.time.showInQuickMenu = true;

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

      this.editedFinnishSeenList = null;
      this.editedLaundryPrice = null;
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
        
        var einkCheck = this.container.querySelector('#cfg-wallpaper-eink');
        if (einkCheck) this.editedSettings.wallpaperEInk = einkCheck.checked;
        var cycleCheck = this.container.querySelector('#cfg-wallpaper-cycle');
        if (cycleCheck) this.editedSettings.cycleWallpapers = cycleCheck.checked;
      }
      else if (this.activeTab === 'clock') {
        var clockPlacementSelect = this.container.querySelector('#cfg-clock-placement');
        if (clockPlacementSelect) this.editedSettings.clockPlacement = clockPlacementSelect.value;
        var clockCompositionSelect = this.container.querySelector('#cfg-clock-composition');
        if (clockCompositionSelect) this.editedSettings.clockComposition = clockCompositionSelect.value;
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
        var order = ['time', 'today_in_history', 'life_in_weeks', 'personal_stats', 'weather', 'sunrise_sunset', 'todoist', 'word_of_the_day', 'finnish_idioms', 'guest_wifi', 'news_headlines', 'random_wikipedia', 'nasa_space_photo', 'laundry_cost', 'hsl_departures'];
        
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
          
          if (self.editedFinnishSeenList) {
            localStorage.setItem('trmnl_finnish_seen_list', JSON.stringify(self.editedFinnishSeenList));
          }
          if (self.editedLaundryPrice !== null && self.editedLaundryPrice !== undefined) {
            localStorage.setItem('trmnl_laundry_price', self.editedLaundryPrice.toString());
          }
          
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
      this.editedFinnishSeenList = null;
      this.editedLaundryPrice = null;
      
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
        localStorage.removeItem('trmnl_laundry_price');
        localStorage.removeItem('trmnl_finnish_seen_list');
        this.wifiQrBase64 = null;
        this.editedFinnishSeenList = null;
        this.editedLaundryPrice = null;
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
      
      // Deep clone editedSettings and strip wallpaper keys to respect "wallpaper is not necessary obviously"
      var settingsToExport = Object.assign({}, this.editedSettings);
      delete settingsToExport.wallpaper;
      delete settingsToExport.customWallpaperBase64;
      delete settingsToExport.wallpaperDark;
      delete settingsToExport.wallpaperEInk;

      var exportData = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        trmnl_dashboard_settings: settingsToExport,
        trmnl_personal_stats_config: this.editedStats
      };

      var finnishSeen = this.editedFinnishSeenList;
      if (!finnishSeen) {
        try {
          var saved = localStorage.getItem('trmnl_finnish_seen_list');
          if (saved) {
            finnishSeen = JSON.parse(saved);
          }
        } catch (e) {
          console.warn("Failed to read finnish seen list for export:", e);
        }
      }
      if (finnishSeen) {
        exportData.trmnl_finnish_seen_list = finnishSeen;
      }

      var laundryPrice = this.editedLaundryPrice;
      if (laundryPrice === null || laundryPrice === undefined) {
        try {
          var saved = localStorage.getItem('trmnl_laundry_price');
          if (saved) {
            laundryPrice = parseFloat(saved);
          }
        } catch (e) {
          console.warn("Failed to read laundry price for export:", e);
        }
      }
      if (laundryPrice !== null && laundryPrice !== undefined) {
        exportData.trmnl_laundry_price = laundryPrice;
      }

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

          // Strip wallpaper settings from the imported configurations to respect "wallpaper is not necessary"
          var importedSettings = Object.assign({}, importData.trmnl_dashboard_settings);
          delete importedSettings.wallpaper;
          delete importedSettings.customWallpaperBase64;
          delete importedSettings.wallpaperDark;
          delete importedSettings.wallpaperEInk;

          // Update in-memory configurations
          self.editedSettings = Object.assign({}, self.editedSettings, importedSettings);
          self.editedStats = Object.assign({}, self.editedStats, importData.trmnl_personal_stats_config);
          self.wifiQrBase64 = self.editedSettings.wifiQrBase64;
          
          if (importData.trmnl_finnish_seen_list) {
            self.editedFinnishSeenList = importData.trmnl_finnish_seen_list;
          }
          if (importData.trmnl_laundry_price !== undefined) {
            self.editedLaundryPrice = importData.trmnl_laundry_price;
          }

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
      
      if (!navigator.onLine) return;
      if (!window.caches || !caches.keys) return;
      
      fetch('./sw.js?t=' + Date.now())
        .then(function(res) {
          if (!res.ok) throw new Error("HTTP error " + res.status);
          return res.text();
        })
        .then(function(text) {
          var match = text.match(/CACHE_NAME\s*=\s*["']([^"']+)["']/);
          if (match && match[1]) {
            var serverVersion = match[1];
            
            caches.keys().then(function(keys) {
              // Check if we have at least one trmnl cache stored locally
              var hasAnyTrmnlCache = keys.some(function(key) {
                return key.indexOf('trmnl-dashboard-cache-') === 0;
              });
              
              // If there is an existing cache, but it doesn't match the server version, show update button
              if (hasAnyTrmnlCache && keys.indexOf(serverVersion) === -1) {
                var wrapper = self.container ? self.container.querySelector('#cfg-update-indicator-wrapper') : null;
                if (wrapper) {
                  wrapper.style.display = 'block';
                }
              }
            }).catch(function(err) {
              console.warn("Failed to read cache keys:", err);
            });
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
      html += '      <button class="settings-tab-btn' + (activeTab === 'clock' ? ' active' : '') + '" data-tab="clock">';
      html += '        ' + window.getIcon('clock-rotate-left') + '<span>CLOCK LAYOUT</span>';
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
      html += '            <option value="auto"' + (this.editedSettings.theme === 'auto' ? ' selected' : '') + '>Auto (Time-based: E-Ink Dark at Night)</option>';
      html += '            <option value="eink-white"' + (this.editedSettings.theme === 'eink-white' ? ' selected' : '') + '>E-Ink White</option>';
      html += '            <option value="eink-dark"' + (this.editedSettings.theme === 'eink-dark' ? ' selected' : '') + '>E-Ink Dark</option>';
      html += '            <option value="warm"' + (this.editedSettings.theme === 'warm' ? ' selected' : '') + '>Warm (Peach)</option>';
      html += '            <option value="navy"' + (this.editedSettings.theme === 'navy' ? ' selected' : '') + '>Navy Blue</option>';
      html += '            <option value="programmer"' + (this.editedSettings.theme === 'programmer' ? ' selected' : '') + '>Programmer (Terminal)</option>';
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
      html += '            <div class="wallpaper-current-preview' + (this.editedSettings.wallpaperEInk ? ' e-ink-active' : '') + '" id="cfg-wallpaper-current-preview">';
      var currentPos = this.editedSettings.wallpaperPosition || 'center bottom';
      var currentZoom = this.editedSettings.wallpaperZoom !== undefined ? this.editedSettings.wallpaperZoom : 1.0;
      var transformStyle = 'transform: scale(' + currentZoom + '); transform-origin: center center;';
      if (this.editedSettings.wallpaper === 'custom' && this.editedSettings.customWallpaperBase64) {
        html += '              <img src="' + this.editedSettings.customWallpaperBase64 + '" alt="Custom Wallpaper" style="object-position: ' + currentPos + '; ' + transformStyle + '">';
      } else if (this.editedSettings.wallpaper && this.editedSettings.wallpaper.indexOf('nasa-') === 0) {
        var savedList = [];
        try {
          var cachedSaved = localStorage.getItem('trmnl_nasa_saved_wallpapers');
          if (cachedSaved) savedList = JSON.parse(cachedSaved);
        } catch (e) {}
        var savedObj = null;
        if (Array.isArray(savedList)) {
          for (var i = 0; i < savedList.length; i++) {
            if (savedList[i] && savedList[i].id === this.editedSettings.wallpaper) {
              savedObj = savedList[i];
              break;
            }
          }
        }
        var imgSrc = savedObj ? (savedObj.base64 || savedObj.url) : 'wallpapers/scene-1.jpg';
        html += '              <img src="' + imgSrc + '" alt="Saved NASA Wallpaper" style="object-position: ' + currentPos + '; ' + transformStyle + '">';
      } else {
        html += '              <img src="wallpapers/' + (this.editedSettings.wallpaper || 'scene-1.jpg') + '" alt="Current Wallpaper" onerror="this.src=\'wallpapers/scene-1.jpg\'" style="object-position: ' + currentPos + '; ' + transformStyle + '">';
      }
      html += '            </div>';
      html += '            <div class="wallpaper-current-info">';
      var wallName = this.editedSettings.wallpaper || 'scene-1.jpg';
      var displayName = wallName;
      if (displayName === 'custom') {
        displayName = 'Custom (Uploaded)';
      } else if (displayName.indexOf('nasa-') === 0) {
        var savedList = [];
        try {
          var cachedSaved = localStorage.getItem('trmnl_nasa_saved_wallpapers');
          if (cachedSaved) savedList = JSON.parse(cachedSaved);
        } catch (e) {}
        var savedObj = null;
        if (Array.isArray(savedList)) {
          for (var i = 0; i < savedList.length; i++) {
            if (savedList[i] && savedList[i].id === displayName) {
              savedObj = savedList[i];
              break;
            }
          }
        }
        displayName = savedObj ? (savedObj.name || ('NASA ' + savedObj.date)) : 'NASA Space Photo';
      }
      html += '              <div class="wallpaper-current-name" id="cfg-wallpaper-current-name">' + displayName.replace('.png', '').replace('.jpg', '').replace('.jpeg', '').replace(/_/g, ' ') + '</div>';
      html += '              <button class="wallpaper-change-btn" id="cfg-wallpaper-change-btn" type="button">Change Wallpaper</button>';
      html += '            </div>';
      html += '          </div>';
      html += '        </div>';

      html += '        <div class="form-group" style="margin-top: 10px;">';
      html += '          <label>AUTHENTIC E-INK EFFECT</label>';
      html += '          <div style="display: flex; align-items: center; margin-top: 8px;">';
      html += '            <input type="checkbox" id="cfg-wallpaper-eink" style="display: none;"' + (this.editedSettings.wallpaperEInk ? ' checked' : '') + '>';
      html += '            <button class="wallpaper-eink-toggle-btn' + (this.editedSettings.wallpaperEInk ? ' active' : '') + '" id="cfg-wallpaper-eink-btn" type="button">';
      html += '              <span class="eink-indicator-dot"></span>';
      html += '              <span class="eink-status-text">AUTHENTIC E-INK: ' + (this.editedSettings.wallpaperEInk ? 'ON' : 'OFF') + '</span>';
      html += '            </button>';
      html += '          </div>';
      html += '          <div class="field-desc" style="margin-top: 4px;">Grayscales and dithers the wallpaper to look like a physical e-paper display.</div>';
      html += '        </div>';

      html += '        <div class="form-group" style="margin-top: 10px;">';
      html += '          <label>CYCLE WALLPAPERS ON LOOP</label>';
      html += '          <div style="display: flex; align-items: center; margin-top: 8px;">';
      html += '            <input type="checkbox" id="cfg-wallpaper-cycle" style="display: none;"' + (this.editedSettings.cycleWallpapers ? ' checked' : '') + '>';
      html += '            <button class="wallpaper-eink-toggle-btn' + (this.editedSettings.cycleWallpapers ? ' active' : '') + '" id="cfg-wallpaper-cycle-btn" type="button">';
      html += '              <span class="eink-indicator-dot"></span>';
      html += '              <span class="eink-status-text">CYCLE WALLPAPERS: ' + (this.editedSettings.cycleWallpapers ? 'ON' : 'OFF') + '</span>';
      html += '            </button>';
      html += '          </div>';
      html += '          <div class="field-desc" style="margin-top: 4px;">Automatically rotates to the next wallpaper after every full carousel cycle.</div>';
      html += '        </div>';
      html += '        <div id="cfg-update-indicator-wrapper" style="display:none; margin-top:10px;">';
      html += '          <button class="trmnl-btn" id="cfg-update-indicator-btn" style="width: 100%; font-size: 11px; background-color: var(--text-color); color: var(--bg-color);">NEW UPDATE DETECTED — CLICK TO APPLY SOFTWARE UPDATE</button>';
      html += '        </div>';
      html += '      </div>';

      // TAB: CLOCK LAYOUT PANE
      html += '      <div class="settings-pane' + (activeTab === 'clock' ? ' active' : '') + '" id="pane-clock">';
      html += '        <div class="settings-section-title">Clock Widget Layout &amp; Position</div>';
      html += '        <div class="form-row">';
      html += '          <div class="form-group">';
      html += '            <label for="cfg-clock-placement">Position Selection</label>';
      html += '            <select id="cfg-clock-placement">';
      html += '              <option value="top-left"' + (this.editedSettings.clockPlacement === 'top-left' ? ' selected' : '') + '>Top Left</option>';
      html += '              <option value="top-center"' + (this.editedSettings.clockPlacement === 'top-center' ? ' selected' : '') + '>Top Center</option>';
      html += '              <option value="top-right"' + (this.editedSettings.clockPlacement === 'top-right' ? ' selected' : '') + '>Top Right</option>';
      html += '              <option value="middle-left"' + (this.editedSettings.clockPlacement === 'middle-left' ? ' selected' : '') + '>Middle Left</option>';
      html += '              <option value="middle-center"' + (this.editedSettings.clockPlacement === 'middle-center' ? ' selected' : '') + '>Middle Center (Default)</option>';
      html += '              <option value="middle-right"' + (this.editedSettings.clockPlacement === 'middle-right' ? ' selected' : '') + '>Middle Right</option>';
      html += '              <option value="bottom-left"' + (this.editedSettings.clockPlacement === 'bottom-left' ? ' selected' : '') + '>Bottom Left</option>';
      html += '              <option value="bottom-center"' + (this.editedSettings.clockPlacement === 'bottom-center' ? ' selected' : '') + '>Bottom Center</option>';
      html += '              <option value="bottom-right"' + (this.editedSettings.clockPlacement === 'bottom-right' ? ' selected' : '') + '>Bottom Right</option>';
      html += '            </select>';
      html += '          </div>';
      html += '          <div class="form-group">';
      html += '            <label for="cfg-clock-composition">Layout Composition</label>';
      html += '            <select id="cfg-clock-composition">';
      html += '              <option value="comp-default"' + (this.editedSettings.clockComposition === 'comp-default' ? ' selected' : '') + '>Standard Minimal</option>';
      html += '              <option value="comp-split"' + (this.editedSettings.clockComposition === 'comp-split' ? ' selected' : '') + '>Split Columns</option>';
      html += '              <option value="comp-retro"' + (this.editedSettings.clockComposition === 'comp-retro' ? ' selected' : '') + '>Retro E-Ink Card</option>';
      html += '              <option value="comp-clean-left"' + (this.editedSettings.clockComposition === 'comp-clean-left' ? ' selected' : '') + '>Modern Left-Aligned</option>';
      html += '              <option value="comp-brutalist"' + (this.editedSettings.clockComposition === 'comp-brutalist' ? ' selected' : '') + '>Neo-Brutalist Badge</option>';
      html += '              <option value="comp-terminal"' + (this.editedSettings.clockComposition === 'comp-terminal' ? ' selected' : '') + '>Terminal Console</option>';
      html += '              <option value="comp-timeline"' + (this.editedSettings.clockComposition === 'comp-timeline' ? ' selected' : '') + '>Vertical Timeline Stack</option>';
      html += '            </select>';
      html += '          </div>';
      html += '        </div>';
      html += '        <div class="settings-section-title">Layout Preview</div>';
      html += '        <div class="clock-layout-preview-screen" style="position: relative; width: 100%; max-width: 440px; height: 260px; border: var(--border-width) solid var(--border-color); background: var(--bg-color); border-radius: 8px; margin: 12px auto; overflow: hidden; display: flex; justify-content: center; align-items: center;">';
      html += '          <div style="position: absolute; top:0; left:0; width:100%; height:100%; opacity: 0.15; background-image: url(\'wallpapers/scene-1.jpg\'); background-size: cover; background-position: center bottom;"></div>';
      html += '          <div id="clock-mini-preview" class="clock-mini-preview-widget ' + (this.editedSettings.clockComposition || 'comp-default') + '" style="position: absolute; z-index: 5; transition: all 0.25s ease-out;">';
      html += '            <div class="time-pixel-widget-header-minimal" style="font-size: 8px; font-family: var(--font-mono); font-weight: 700; text-transform: uppercase;">THURSDAY &bull; JUN 11</div>';
      html += '            <div class="time-pixel-widget-clock-minimal" style="font-size: 16px; font-weight: 800; font-family: var(--font-sans); line-height: 1;">11:15 AM</div>';
      html += '            <div class="time-pixel-widget-weather" style="font-size: 7px; font-family: var(--font-sans); margin-top: 2px;">16° &bull; OVERCAST</div>';
      html += '          </div>';
      html += '          <div style="position: absolute; top: 8px; right: 8px; width: 10px; height: 10px; border-radius: 50%; border: var(--border-width-thin) solid var(--border-color); opacity: 0.3;"></div>';
      html += '          <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 18px; border-top: var(--border-width-thin) solid var(--border-color); opacity: 0.2; background: var(--bg-color);"></div>';
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
      var order = ['time', 'today_in_history', 'life_in_weeks', 'personal_stats', 'weather', 'sunrise_sunset', 'todoist', 'word_of_the_day', 'finnish_idioms', 'guest_wifi', 'news_headlines', 'random_wikipedia', 'nasa_space_photo', 'laundry_cost', 'hsl_departures'];
      
      var self = this;
      order.forEach(function(pluginId) {
        var plugin = registry[pluginId];
        if (!plugin) return;

        var cleanName = plugin.name || pluginId;
        
        var pluginConf = self.editedSettings.plugins && self.editedSettings.plugins[pluginId] ? self.editedSettings.plugins[pluginId] : {};
        
        var isTime = pluginId === 'time';
        var showCarousel = isTime ? true : (pluginConf.showInCarousel !== false);
        var showQuick = isTime ? true : (pluginConf.showInQuickMenu !== false);
        var isEnabled = isTime ? true : (pluginConf.enabled !== false);
        
        html += '            <tr>';
        html += '              <td class="plugin-table-name">' + cleanName.toUpperCase() + '</td>';
        html += '              <td style="text-align: center;">';
        html += '                <input type="checkbox" class="trmnl-checkbox" id="chk-carousel-' + pluginId + '"' + (showCarousel ? ' checked' : '') + ((isEnabled && !isTime) ? '' : ' disabled') + '>';
        html += '              </td>';
        html += '              <td style="text-align: center;">';
        html += '                <input type="checkbox" class="trmnl-checkbox" id="chk-quick-' + pluginId + '"' + (showQuick ? ' checked' : '') + ((isEnabled && !isTime) ? '' : ' disabled') + '>';
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

      // Wallpaper Positioning Modal Overlay
      html += '<div class="wallpaper-modal-overlay" id="wallpaper-position-modal">';
      html += '  <div class="wallpaper-modal" style="max-width: 540px; width: 90%;">';
      html += '    <div class="wallpaper-modal-header">';
      html += '      <div class="wallpaper-modal-title">Adjust Wallpaper Position</div>';
      html += '      <button class="wallpaper-modal-close" id="wallpaper-position-modal-close" type="button">&times;</button>';
      html += '    </div>';
      html += '    <div class="wallpaper-modal-body" style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 15px;">';
      
      // Viewport container (4:3 aspect ratio like the iPad Mini 2 screen)
      html += '      <div class="wallpaper-drag-viewport" id="wp-drag-viewport" style="position:relative; width: 100%; max-width: 480px; height: 320px; border: var(--border-width) solid var(--border-color); border-radius: 8px; overflow: hidden; cursor: grab; user-select: none; -webkit-user-select: none;">';
      html += '        <img id="wp-drag-img" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; pointer-events:none; image-rendering:pixelated; image-rendering:crisp-edges;" src="" alt="Wallpaper Preview">';
      html += '      </div>';
      
      html += '    </div>';
      html += '    <div class="wallpaper-modal-footer">';
      html += '      <button class="trmnl-btn secondary" id="wallpaper-position-modal-cancel" type="button">Cancel</button>';
      html += '      <button class="trmnl-btn" id="wallpaper-position-modal-apply" type="button">Apply Position</button>';
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

      // Bind Clock Placement & Composition Live Preview
      var clockPlacementSelect = this.container.querySelector('#cfg-clock-placement');
      var clockCompositionSelect = this.container.querySelector('#cfg-clock-composition');
      var clockPreview = this.container.querySelector('#clock-mini-preview');
      
      function updatePreviewPosition(val) {
        if (!clockPreview) return;
        clockPreview.style.top = '';
        clockPreview.style.bottom = '';
        clockPreview.style.left = '';
        clockPreview.style.right = '';
        clockPreview.style.transform = '';
        
        switch (val) {
          case 'top-left':
            clockPreview.style.top = '15px';
            clockPreview.style.left = '15px';
            break;
          case 'top-center':
            clockPreview.style.top = '15px';
            clockPreview.style.left = '50%';
            clockPreview.style.transform = 'translateX(-50%)';
            break;
          case 'top-right':
            clockPreview.style.top = '15px';
            clockPreview.style.right = '15px';
            break;
          case 'middle-left':
            clockPreview.style.top = '36%';
            clockPreview.style.left = '15px';
            clockPreview.style.transform = 'translateY(-50%)';
            break;
          case 'middle-center':
            clockPreview.style.top = '36%';
            clockPreview.style.left = '50%';
            clockPreview.style.transform = 'translate(-50%, -50%)';
            break;
          case 'middle-right':
            clockPreview.style.top = '36%';
            clockPreview.style.right = '15px';
            clockPreview.style.transform = 'translateY(-50%)';
            break;
          case 'bottom-left':
            clockPreview.style.bottom = '25px';
            clockPreview.style.left = '15px';
            break;
          case 'bottom-center':
            clockPreview.style.bottom = '25px';
            clockPreview.style.left = '50%';
            clockPreview.style.transform = 'translateX(-50%)';
            break;
          case 'bottom-right':
            clockPreview.style.bottom = '25px';
            clockPreview.style.right = '15px';
            break;
        }
      }

      function updatePreviewComposition(val) {
        if (!clockPreview) return;
        clockPreview.classList.remove('comp-default', 'comp-split', 'comp-retro', 'comp-clean-left', 'comp-brutalist', 'comp-terminal', 'comp-timeline');
        clockPreview.classList.add(val);
      }

      if (clockPlacementSelect) {
        updatePreviewPosition(clockPlacementSelect.value);
        clockPlacementSelect.addEventListener('change', function() {
          updatePreviewPosition(clockPlacementSelect.value);
        });
      }

      if (clockCompositionSelect) {
        updatePreviewComposition(clockCompositionSelect.value);
        clockCompositionSelect.addEventListener('change', function() {
          updatePreviewComposition(clockCompositionSelect.value);
        });
      }

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

      var modalSelectedWallpaper = self.editedSettings.wallpaper || 'scene-1.jpg';
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
        var activeConfig = window.Dashboard ? window.Dashboard.getActiveConfig() : {};
        var defaultWallpapers = activeConfig.availableWallpapers || [
          'scene-1.jpg',
          'scene-2.jpg',
          'scene-3.jpg',
          'scene-4.jpg',
          'scene-5.jpg',
          'scene-6.jpg',
          'scene-7.jpg',
          'scene-8.jpg'
        ];
        fetch('./wallpapers.json?_t=' + Date.now(), {
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
          if (Array.isArray(data)) {
            files = data.filter(function(item) {
              if (typeof item === 'string') return /\.(png|jpe?g|webp|gif)$/i.test(item);
              return item && item.type === 'file' && /\.(png|jpe?g|webp|gif)$/i.test(item.name);
            }).map(function(item) {
              if (typeof item === 'string') return item;
              return item.name;
            });
          } else if (typeof data === 'string') {
            var regex = /href=["']?([^"'\s>]+?\.(?:png|jpe?g|webp|gif))["']?/gi;
            var match;
            var matched = {};
            while ((match = regex.exec(data)) !== null) {
              var href = match[1];
              var decoded = decodeURIComponent(href);
              var basename = decoded.substring(decoded.lastIndexOf('/') + 1);
              if (basename) {
                matched[basename] = true;
              }
            }
            files = Object.keys(matched);
          }
          defaultWallpapers.forEach(function(w) {
            if (files.indexOf(w) === -1) files.push(w);
          });
          
          // Cache scanned list in localStorage only if we found more than default
          if (files.length > defaultWallpapers.length) {
            try {
              localStorage.setItem('trmnl_raw_scanned_wallpapers', JSON.stringify(files));
              localStorage.setItem('trmnl_available_wallpapers', JSON.stringify(files));
            } catch (e) {
              console.warn("Failed to cache wallpapers from settings scan:", e);
            }
          }
          
          callback(files);
        })
        .catch(function(err) {
          console.warn("Scanning failed, trying cache", err);
          var cached = null;
          try {
            cached = localStorage.getItem('trmnl_available_wallpapers');
          } catch (e) {}
          if (cached) {
            try {
              var parsed = JSON.parse(cached);
              if (Array.isArray(parsed) && parsed.length > 0) {
                callback(parsed);
                return;
              }
            } catch (e) {}
          }
          callback(defaultWallpapers);
        });
      }



      function renderGrid(files) {
        if (!wpGridContainer) return;
        wpGridContainer.innerHTML = '';

        var displayFiles = files.slice();

        // Add saved NASA wallpapers if they exist
        var savedList = [];
        try {
          var cachedSaved = localStorage.getItem('trmnl_nasa_saved_wallpapers');
          if (cachedSaved) savedList = JSON.parse(cachedSaved);
        } catch (e) {}
        
        if (Array.isArray(savedList)) {
          // Prepend NASA wallpapers in reverse order so the latest one ends up first
          for (var idx = savedList.length - 1; idx >= 0; idx--) {
            var savedObj = savedList[idx];
            if (savedObj && savedObj.id) {
              displayFiles.unshift(savedObj.id);
            }
          }
        }

        // Add custom upload thumbnail if base64 exists
        if (modalCustomBase64) {
          displayFiles.unshift('custom');
        }

        displayFiles.forEach(function(file) {
          var item = document.createElement('div');
          item.className = 'wallpaper-item' + (modalSelectedWallpaper === file ? ' selected' : '') + (self.editedSettings.wallpaperEInk ? ' e-ink-active' : '');
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
          } else if (file.indexOf('nasa-') === 0) {
            var savedObj = null;
            if (Array.isArray(savedList)) {
              for (var i = 0; i < savedList.length; i++) {
                if (savedList[i] && savedList[i].id === file) {
                  savedObj = savedList[i];
                  break;
                }
              }
            }
            img.src = savedObj ? (savedObj.base64 || savedObj.url) : 'wallpapers/scene-1.jpg';
            name = savedObj ? (savedObj.name || ('NASA ' + savedObj.date)) : 'NASA Space Photo';
          } else {
            img.src = 'wallpapers/' + file;
            img.onerror = function() { img.src = 'wallpapers/scene-1.jpg'; };
            name = file.replace('.png', '').replace('.jpg', '').replace('.jpeg', '').replace(/_/g, ' ');
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
          modalSelectedWallpaper = self.editedSettings.wallpaper || 'scene-1.jpg';
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
          }
          self.editedSettings.wallpaperDark = null;
          closeModal();
          // Immediately open the positioning modal to let user align the selected wallpaper
          openPositionModal();
        });
      }

      // --- Wallpaper Positioning Event Bindings ---
      var wpPosModal = this.container.querySelector('#wallpaper-position-modal');
      var wpPosCloseBtn = this.container.querySelector('#wallpaper-position-modal-close');
      var wpPosCancelBtn = this.container.querySelector('#wallpaper-position-modal-cancel');
      var wpPosApplyBtn = this.container.querySelector('#wallpaper-position-modal-apply');
      var wpDragViewport = this.container.querySelector('#wp-drag-viewport');
      var wpDragImg = this.container.querySelector('#wp-drag-img');

      var isDragging = false;
      var startY = 0;
      var startPercent = 50;
      var currentPercent = 50;
      var currentZoom = 1.0;

      var isPinching = false;
      var startTouchDist = 0;
      var startZoom = 1.0;

      function parseVerticalPercent(posStr) {
        var pos = posStr || 'center bottom';
        if (pos === 'center bottom' || pos === 'bottom') return 100;
        if (pos === 'center top' || pos === 'top') return 0;
        if (pos === 'center' || pos === 'center center') return 50;
        var match = pos.match(/(\d+)%/);
        if (match) return parseInt(match[1], 10);
        return 100; // fallback default
      }

      function openPositionModal() {
        if (!wpPosModal) return;
        wpPosModal.classList.add('active');
        
        var currentWp = self.editedSettings.wallpaper || 'scene-1.jpg';
        var customBase64 = self.editedSettings.customWallpaperBase64;
        
        if (currentWp === 'custom' && customBase64) {
          wpDragImg.src = customBase64;
        } else if (currentWp && currentWp.indexOf('nasa-') === 0) {
          var savedList = [];
          try {
            var cachedSaved = localStorage.getItem('trmnl_nasa_saved_wallpapers');
            if (cachedSaved) savedList = JSON.parse(cachedSaved);
          } catch (e) {}
          var savedObj = null;
          if (Array.isArray(savedList)) {
            for (var i = 0; i < savedList.length; i++) {
              if (savedList[i] && savedList[i].id === currentWp) {
                savedObj = savedList[i];
                break;
              }
            }
          }
          wpDragImg.src = savedObj ? (savedObj.base64 || savedObj.url) : 'wallpapers/scene-1.jpg';
        } else {
          wpDragImg.src = 'wallpapers/' + currentWp;
        }
        
        var currentPos = self.editedSettings.wallpaperPosition || 'center bottom';
        currentPercent = parseVerticalPercent(currentPos);
        currentZoom = self.editedSettings.wallpaperZoom !== undefined ? parseFloat(self.editedSettings.wallpaperZoom) : 1.0;
        
        wpDragImg.style.objectPosition = 'center ' + currentPercent + '%';
        wpDragImg.style.transform = 'scale(' + currentZoom + ')';
        wpDragImg.style.transformOrigin = 'center center';
      }

      function startDrag(y) {
        isDragging = true;
        startY = y;
        startPercent = currentPercent;
        if (wpDragViewport) wpDragViewport.style.cursor = 'grabbing';
      }

      function moveDrag(y) {
        if (!isDragging) return;
        var deltaY = y - startY;
        // Sensitivity: 3 pixels of drag changes 1% of position
        var newPercent = startPercent - (deltaY / 3);
        if (newPercent < 0) newPercent = 0;
        if (newPercent > 100) newPercent = 100;
        currentPercent = Math.round(newPercent);
        
        wpDragImg.style.objectPosition = 'center ' + currentPercent + '%';
      }

      function stopDrag() {
        isDragging = false;
        if (wpDragViewport) wpDragViewport.style.cursor = 'grab';
      }

      if (wpDragViewport) {
        // Trackpad / Mouse Scroll Wheel Zoom
        wpDragViewport.addEventListener('wheel', function(e) {
          e.stopPropagation();
          e.preventDefault();
          
          var zoomStep = 0.05;
          if (e.deltaY < 0) {
            currentZoom += zoomStep; // zoom in
          } else {
            currentZoom -= zoomStep; // zoom out
          }
          
          if (currentZoom < 1.0) currentZoom = 1.0;
          if (currentZoom > 3.0) currentZoom = 3.0;
          currentZoom = Math.round(currentZoom * 100) / 100;
          
          wpDragImg.style.transform = 'scale(' + currentZoom + ')';
        });

        // Mouse Drag Events
        wpDragViewport.addEventListener('mousedown', function(e) {
          e.stopPropagation();
          e.preventDefault();
          startDrag(e.clientY);
        });

        window.addEventListener('mousemove', function(e) {
          if (isDragging) {
            e.stopPropagation();
            e.preventDefault();
            moveDrag(e.clientY);
          }
        });

        window.addEventListener('mouseup', function(e) {
          if (isDragging) {
            e.stopPropagation();
            stopDrag();
          }
        });

        // Touch Pinch-to-Zoom & Drag Events (iPad Mini 2 safe)
        wpDragViewport.addEventListener('touchstart', function(e) {
          e.stopPropagation();
          if (e.touches && e.touches.length === 2) {
            isPinching = true;
            isDragging = false;
            startTouchDist = Math.hypot(
              e.touches[0].clientX - e.touches[1].clientX,
              e.touches[0].clientY - e.touches[1].clientY
            );
            startZoom = currentZoom;
          } else if (e.touches && e.touches.length === 1) {
            isPinching = false;
            startDrag(e.touches[0].clientY);
          }
        });

        wpDragViewport.addEventListener('touchmove', function(e) {
          if (isPinching && e.touches && e.touches.length === 2) {
            e.stopPropagation();
            e.preventDefault();
            var currentTouchDist = Math.hypot(
              e.touches[0].clientX - e.touches[1].clientX,
              e.touches[0].clientY - e.touches[1].clientY
            );
            if (startTouchDist > 0) {
              var scaleFactor = currentTouchDist / startTouchDist;
              currentZoom = startZoom * scaleFactor;
              if (currentZoom < 1.0) currentZoom = 1.0;
              if (currentZoom > 3.0) currentZoom = 3.0;
              currentZoom = Math.round(currentZoom * 100) / 100;
              wpDragImg.style.transform = 'scale(' + currentZoom + ')';
            }
          } else if (!isPinching && isDragging && e.touches && e.touches.length === 1) {
            e.stopPropagation();
            e.preventDefault();
            moveDrag(e.touches[0].clientY);
          }
        });

        wpDragViewport.addEventListener('touchend', function(e) {
          e.stopPropagation();
          if (isPinching) {
            isPinching = false;
            startTouchDist = 0;
          } else if (isDragging) {
            stopDrag();
          }
        });
      }

      if (wpPosApplyBtn) {
        wpPosApplyBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          self.editedSettings.wallpaperPosition = 'center ' + currentPercent + '%';
          self.editedSettings.wallpaperZoom = currentZoom;
          wpPosModal.classList.remove('active');
          
          // Re-render the main preview in the settings page
          var mainPreviewImg = self.container.querySelector('#cfg-wallpaper-current-preview img');
          if (mainPreviewImg) {
            mainPreviewImg.style.objectPosition = 'center ' + currentPercent + '%';
            mainPreviewImg.style.transform = 'scale(' + currentZoom + ')';
            mainPreviewImg.style.transformOrigin = 'center center';
          }
        });
      }

      if (wpPosCloseBtn) {
        wpPosCloseBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          wpPosModal.classList.remove('active');
          self.renderPanel();
        });
      }

      if (wpPosCancelBtn) {
        wpPosCancelBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          wpPosModal.classList.remove('active');
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
          
          var activeTheme = selectedTheme;
          if (selectedTheme === 'auto') {
            var now = new Date();
            var hour = now.getHours();
            var isNightTime = (hour >= 18 || hour < 8);
            activeTheme = isNightTime ? 'eink-dark' : 'eink-white';
          }
          
          // Normalize legacy themes
          if (activeTheme === 'stark' || activeTheme === 'paper') {
            activeTheme = 'eink-white';
          } else if (activeTheme === 'coal') {
            activeTheme = 'eink-dark';
          } else if (activeTheme === 'ft') {
            activeTheme = 'warm';
          }
          
          if (activeTheme === 'eink-white') {
            body.classList.add('theme-eink-white');
          } else if (activeTheme === 'eink-dark') {
            body.classList.add('theme-eink-dark');
          } else if (activeTheme === 'warm') {
            body.classList.add('theme-warm');
          } else if (activeTheme === 'navy') {
            body.classList.add('theme-navy');
          } else if (activeTheme === 'programmer') {
            body.classList.add('theme-programmer');
          }
        });
      }

      // Live E-Ink Preview / Toggle Button Binding
      var einkBtn = this.container.querySelector('#cfg-wallpaper-eink-btn');
      var einkCheckbox = this.container.querySelector('#cfg-wallpaper-eink');
      var wpPreview = this.container.querySelector('#cfg-wallpaper-current-preview');
      
      if (einkBtn && einkCheckbox) {
        einkBtn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          einkCheckbox.checked = !einkCheckbox.checked;
          self.editedSettings.wallpaperEInk = einkCheckbox.checked;
          
          // Update button styling
          if (einkCheckbox.checked) {
            einkBtn.classList.add('active');
            var statusText = einkBtn.querySelector('.eink-status-text');
            if (statusText) statusText.textContent = 'AUTHENTIC E-INK: ON';
            if (wpPreview) wpPreview.classList.add('e-ink-active');
          } else {
            einkBtn.classList.remove('active');
            var statusText = einkBtn.querySelector('.eink-status-text');
            if (statusText) statusText.textContent = 'AUTHENTIC E-INK: OFF';
            if (wpPreview) wpPreview.classList.remove('e-ink-active');
          }
          
          // Dynamically update wallpaper items inside modal grid if generated
          var wpGridContainer = self.container.querySelector('#wallpaper-grid');
          if (wpGridContainer) {
            var items = wpGridContainer.querySelectorAll('.wallpaper-item');
            items.forEach(function(item) {
              if (einkCheckbox.checked) {
                item.classList.add('e-ink-active');
              } else {
                item.classList.remove('e-ink-active');
              }
            });
          }
        });
      }

      // Live Cycle Wallpapers Toggle Button Binding
      var cycleBtn = this.container.querySelector('#cfg-wallpaper-cycle-btn');
      var cycleCheckbox = this.container.querySelector('#cfg-wallpaper-cycle');
      
      if (cycleBtn && cycleCheckbox) {
        cycleBtn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          cycleCheckbox.checked = !cycleCheckbox.checked;
          self.editedSettings.cycleWallpapers = cycleCheckbox.checked;
          
          if (cycleCheckbox.checked) {
            cycleBtn.classList.add('active');
            var statusText = cycleBtn.querySelector('.eink-status-text');
            if (statusText) statusText.textContent = 'CYCLE WALLPAPERS: ON';
          } else {
            cycleBtn.classList.remove('active');
            var statusText = cycleBtn.querySelector('.eink-status-text');
            if (statusText) statusText.textContent = 'CYCLE WALLPAPERS: OFF';
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
