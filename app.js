/**
 * TRMNL Dashboard Orchestrator
 * Manages plugin lifecycles, configuration overrides, page transitions, and UI scaling.
 * 
 * DESIGNED FOR IPAD MINI 2: ES6 compatible, no optional chaining (?.) or nullish coalescing (??).
 */

(function() {
  'use strict';

  // State Management
  var state = {
    activePlugins: [],
    activeIndex: 0,
    cycleTimer: null,
    battery: null,
    config: {}
  };

  // 1. Initialize Configuration
  function initConfig() {
    var defaultConfig = window.DASHBOARD_CONFIG || {};
    var localOverrides = {};
    
    try {
      var saved = localStorage.getItem('trmnl_dashboard_settings');
      if (saved) {
        localOverrides = JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Failed to load local overrides:", e);
    }

    // Merge configurations (safe ES5/ES6 style merge)
    state.config = Object.assign({}, defaultConfig);
    state.config.plugins = Object.assign({}, defaultConfig.plugins || {});

    // Deep merge local overrides
    var rootKeys = ['refreshInterval', 'flashRefresh', 'theme', 'birthdate', 'latitude', 'longitude', 'locationName', 'tempUnit', 'wifiQrBase64', 'hslStopIds', 'hslNeighbourhood', 'digitransitApiKey', 'hslRadius'];
    rootKeys.forEach(function(key) {
      if (localOverrides[key] !== undefined) {
        state.config[key] = localOverrides[key];
      }
    });

    if (localOverrides.plugins) {
      Object.keys(localOverrides.plugins).forEach(function(pluginId) {
        if (!state.config.plugins[pluginId]) {
          state.config.plugins[pluginId] = {};
        }
        state.config.plugins[pluginId] = Object.assign(
          {},
          state.config.plugins[pluginId],
          localOverrides.plugins[pluginId]
        );
      });
    }
  }

  // 2. Viewport Scaling for iPad Mini 2 Safari
  function adjustScale() {
    var viewport = document.getElementById('app-viewport');
    if (!viewport) return;

    var targetWidth = 1024;
    var targetHeight = 768;
    
    var windowWidth = window.innerWidth;
    var windowHeight = window.innerHeight;

    // Calculate scale ratio to fit both dimensions
    var scaleX = windowWidth / targetWidth;
    var scaleY = windowHeight / targetHeight;
    var finalScale = Math.min(scaleX, scaleY);

    // Apply scaling centered
    viewport.style.transform = 'translate(-50%, -50%) scale(' + finalScale + ')';
  }

  // 3. Theme application
  function applyTheme() {
    var body = document.body;
    body.className = ''; // Reset themes
    
    var theme = state.config.theme || 'paper';
    var activeTheme = theme;
    
    if (theme === 'auto') {
      // Auto dark mode override: 6 PM to 8 AM local time
      var now = new Date();
      var hour = now.getHours();
      var isNightTime = (hour >= 18 || hour < 8);
      activeTheme = isNightTime ? 'coal' : 'paper';
    }
    
    if (activeTheme === 'coal') {
      body.classList.add('theme-coal');
    } else if (activeTheme === 'stark') {
      body.classList.add('theme-stark');
    } else if (activeTheme === 'ft') {
      body.classList.add('theme-ft');
    }
  }

  // 4. Initialize & Load Plugins
  function initPlugins() {
    var container = document.getElementById('plugin-container');
    if (!container) return;

    container.innerHTML = '';
    state.activePlugins = [];

    // Check all registered plugins on window.Plugins
    var registry = window.Plugins || {};
    var order = ['time', 'history', 'life', 'stats', 'weather', 'sun', 'word', 'wifi', 'guardian', 'wikirandom', 'wikiphoto', 'laundry', 'hsl'];

    order.forEach(function(pluginId) {
      var plugin = registry[pluginId];
      if (!plugin) return;

      var pluginSettings = state.config.plugins[pluginId] || {};
      
      // Load enabled plugins
      if (pluginSettings.enabled !== false) {
        // Create view element
        var view = document.createElement('div');
        view.id = 'view-' + pluginId;
        view.className = 'plugin-view';
        container.appendChild(view);

        // Init plugin with merged configurations
        try {
          plugin.init(pluginSettings);
          plugin.render(view);
          
          state.activePlugins.push({
            id: pluginId,
            name: pluginSettings.name || plugin.name || pluginId,
            plugin: plugin,
            element: view
          });
        } catch (e) {
          console.error("Error initializing plugin: " + pluginId, e);
        }
      }
    });

    // Separately initialize settings plugin view (not added to state.activePlugins)
    var settingsPlugin = registry['settings'];
    if (settingsPlugin) {
      var settingsView = document.createElement('div');
      settingsView.id = 'view-settings';
      settingsView.className = 'plugin-view';
      container.appendChild(settingsView);
      try {
        var settingsConfig = state.config.plugins['settings'] || {};
        settingsPlugin.init(settingsConfig);
        settingsPlugin.render(settingsView);
      } catch (e) {
        console.error("Error initializing settings plugin", e);
      }
    }

    // Render footer page dots
    renderPageDots();
  }

  // 5. Page Indicators (dots)
  function renderPageDots() {
    var dotsContainer = document.getElementById('footer-page-dots');
    if (!dotsContainer) return;

    dotsContainer.innerHTML = '';
    state.activePlugins.forEach(function(_, idx) {
      var dot = document.createElement('div');
      dot.className = 'page-dot' + (idx === state.activeIndex ? ' active' : '');
      dot.addEventListener('click', function() {
        showPage(idx);
      });
      dotsContainer.appendChild(dot);
    });
  }

  // 6. Navigation Controls
  function showPage(index) {
    if (state.activePlugins.length === 0) return;
    
    // Bounds check
    if (index < 0) {
      index = state.activePlugins.length - 1;
    } else if (index >= state.activePlugins.length) {
      index = 0;
    }

    if (index === state.activeIndex && document.querySelector('.plugin-view.active')) {
      // Just refresh current page if we trigger refresh on same page
      refreshActivePlugin();
      return;
    }

    var flashRefresh = state.config.flashRefresh;

    if (flashRefresh) {
      // E-paper signature black flash
      var overlay = document.getElementById('flash-overlay');
      if (overlay) {
        overlay.classList.add('flash-active');
        
        setTimeout(function() {
          // Switch page while screen is black
          switchView(index);
          setTimeout(function() {
            overlay.classList.remove('flash-active');
          }, 250);
        }, 200);
      } else {
        switchView(index);
      }
    } else {
      switchView(index);
    }
  }

  function switchView(index) {
    state.activePlugins.forEach(function(item, idx) {
      if (idx === index) {
        item.element.classList.add('active');

      } else {
        item.element.classList.remove('active');
      }
    });

    // Explicitly hide settings view when transitioning to active plugins
    var settingsView = document.getElementById('view-settings');
    if (settingsView) {
      settingsView.classList.remove('active');
    }

    state.activeIndex = index;

    // Update Dots
    var dots = document.querySelectorAll('.page-dot');
    dots.forEach(function(dot, idx) {
      if (idx === index) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });

    // Run update lifecycle for this plugin
    refreshActivePlugin();

    // Reset cycle timer
    resetCycleTimer();
  }

  function refreshActivePlugin() {
    var activeItem = state.activePlugins[state.activeIndex];
    if (activeItem && activeItem.plugin && typeof activeItem.plugin.update === 'function') {
      try {
        activeItem.plugin.update();
      } catch (e) {
        console.error("Error updating plugin: " + activeItem.id, e);
      }
    }
  }

  // 7. Timer & Cyclic Refreshing
  function resetCycleTimer() {
    if (state.cycleTimer) {
      clearInterval(state.cycleTimer);
      state.cycleTimer = null;
    }

    var interval = state.config.refreshInterval !== undefined ? state.config.refreshInterval : 60; // default 60s
    if (interval > 0) {
      state.cycleTimer = setInterval(function() {
        showPage(state.activeIndex + 1);
      }, interval * 1000);
    }
  }

  // 8. Clock & Date Tick
  function startClock() {
    var clockElem = document.getElementById('footer-date-time');
    
    function tick() {
      var now = new Date();
      applyTheme(); // Ensure auto dark mode updates live with time
      var days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      var months = ['JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR', 'APR', 'MAY']; // Safe reordering or just mapping month indexes
      var realMonths = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      
      var dayName = days[now.getDay()];
      var monthName = realMonths[now.getMonth()];
      var dateNum = now.getDate();
      var year = now.getFullYear();

      var hours = now.getHours();
      var minutes = now.getMinutes();
      var ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 should be 12
      minutes = minutes < 10 ? '0' + minutes : minutes;

      if (clockElem) {
        clockElem.textContent = dayName + ', ' + monthName + ' ' + dateNum + ', ' + year + ' - ' + hours + ':' + minutes + ' ' + ampm;
      }
    }

    tick();
    setInterval(tick, 1000 * 60); // update every minute
  }

  // 9. Network Status Monitor
  function updateNetworkStatus() {
    var statusText = document.getElementById('network-status');
    var wifiIndicator = document.getElementById('wifi-indicator');
    var isOnline = navigator.onLine;

    if (statusText) {
      statusText.textContent = isOnline ? 'ONLINE' : 'OFFLINE';
    }

    if (wifiIndicator) {
      if (isOnline) {
        wifiIndicator.classList.remove('blink');
        wifiIndicator.style.backgroundColor = ''; // default text-color
      } else {
        wifiIndicator.classList.add('blink');
        wifiIndicator.style.backgroundColor = '#cc0000'; // red blinking offline
      }
    }
  }

  // 10. Battery Status API Monitor (Safari iOS 12 Safe)
  function initBattery() {
    var batteryElem = document.getElementById('battery-status');
    if (!batteryElem) return;

    if (navigator.getBattery) {
      navigator.getBattery().then(function(battery) {
        state.battery = battery;
        
        function update() {
          var level = Math.round(battery.level * 100);
          var charging = battery.charging ? ' (CHG)' : '';
          batteryElem.textContent = 'BATT: ' + level + '%' + charging;
        }

        update();
        battery.addEventListener('levelchange', update);
        battery.addEventListener('chargingchange', update);
      });
    } else {
      // Fallback for browsers without Battery API
      batteryElem.textContent = 'BATT: AC';
    }
  }

  // 11. Touch Gestures & Arrow Clicks
  function initNavEvents() {
    var prevBtn = document.getElementById('nav-prev');
    var nextBtn = document.getElementById('nav-next');

    if (prevBtn) {
      prevBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        var settingsView = document.getElementById('view-settings');
        if (settingsView && settingsView.classList.contains('active')) return; // disable during settings editing
        showPage(state.activeIndex - 1);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        var settingsView = document.getElementById('view-settings');
        if (settingsView && settingsView.classList.contains('active')) return; // disable during settings editing
        showPage(state.activeIndex + 1);
      });
    }

    // Keyboard Navigation (Arrow Keys)
    document.addEventListener('keydown', function(e) {
      var settingsView = document.getElementById('view-settings');
      if (settingsView && settingsView.classList.contains('active')) return; // disable during settings editing

      if (e.key === 'ArrowLeft') {
        showPage(state.activeIndex - 1);
      } else if (e.key === 'ArrowRight') {
        showPage(state.activeIndex + 1);
      }
    });

    // Touch Swiping Support for iPad Mini 2
    var touchStartX = 0;
    var touchEndX = 0;
    var viewport = document.getElementById('app-viewport');

    if (viewport) {
      viewport.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
      }, false);

      viewport.addEventListener('touchend', function(e) {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
      }, false);
    }

    function handleSwipe() {
      var settingsView = document.getElementById('view-settings');
      if (settingsView && settingsView.classList.contains('active')) return; // disable during settings editing

      var swipeThreshold = 50; // pixels
      var diff = touchEndX - touchStartX;
      
      if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
          // Swipe Right -> Show Previous
          showPage(state.activeIndex - 1);
        } else {
          // Swipe Left -> Show Next
          showPage(state.activeIndex + 1);
        }
      }
    }
  }

  // 12. External API: reload config from settings changes
  window.Dashboard = {
    reloadSettings: function() {
      initConfig();
      applyTheme();
      initPlugins();
      showPage(0);
    },
    getActiveConfig: function() {
      return state.config;
    },
    resetTimer: function() {
      resetCycleTimer();
    },
    openSettings: function(tabId) {
      openSettings(tabId);
    }
  };

  // 12. Settings Panel View Controllers
  function openSettings(tabId) {
    // Stop the auto cycle timer
    if (state.cycleTimer) {
      clearInterval(state.cycleTimer);
      state.cycleTimer = null;
    }

    // Hide all carousel pages
    state.activePlugins.forEach(function(item) {
      item.element.classList.remove('active');
    });

    // Remove active page dot highlighting
    var dots = document.querySelectorAll('.page-dot');
    dots.forEach(function(dot) {
      dot.classList.remove('active');
    });

    // Show the settings page
    var settingsView = document.getElementById('view-settings');
    if (settingsView) {
      settingsView.classList.add('active');
    }

    // Run settings update/render
    var registry = window.Plugins || {};
    var settingsPlugin = registry['settings'];
    if (settingsPlugin) {
      if (tabId && typeof settingsPlugin.setTab === 'function') {
        settingsPlugin.setTab(tabId);
      }
      settingsPlugin.update();
    }
  }

  function initSettingsToggle() {
    var btn = document.getElementById('settings-toggle-btn');
    if (!btn) return;

    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var settingsView = document.getElementById('view-settings');
      if (settingsView) {
        var isActive = settingsView.classList.contains('active');
        if (isActive) {
          // Exit settings using the settingsPlugin's cancel routine
          var registry = window.Plugins || {};
          var settingsPlugin = registry['settings'];
          if (settingsPlugin && typeof settingsPlugin.cancelSettings === 'function') {
            settingsPlugin.cancelSettings();
          } else {
            settingsView.classList.remove('active');
            showPage(0);
          }
        } else {
          // Open settings
          openSettings();
        }
      }
    });
  }

  // 13. Quick Page Switcher Overlay
  function initQuickSwitcher() {
    var container = document.getElementById('plugin-container');
    var switcher = document.getElementById('quick-switcher');
    
    if (!container || !switcher) return;

    container.addEventListener('click', function(e) {
      // Check if click was inside a .trmnl-footer-bar
      var footerBar = e.target.closest('.trmnl-footer-bar');
      if (!footerBar) return;

      e.stopPropagation();
      var isSettingsActive = document.getElementById('view-settings').classList.contains('active');
      if (isSettingsActive) return; // Disable switcher during settings view
      
      switcher.classList.toggle('active');
      if (switcher.classList.contains('active')) {
        renderQuickSwitcherButtons();
      }
    });

    // Close when clicking outside
    document.addEventListener('click', function(e) {
      if (switcher.classList.contains('active') && !switcher.contains(e.target)) {
        switcher.classList.remove('active');
      }
    });
  }

  // 14. SVG Icon Mapping for Quick Switcher
  function getPluginIcon(pluginId) {
    var svgStart = '<svg viewBox="0 0 24 24" style="width: 18px; height: 18px; margin-right: 8px; fill: none; stroke: currentColor; stroke-width: 2.5; flex-shrink: 0; vertical-align: middle;">';
    var paths = {
      time: '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>',
      history: '<circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path><path d="M16.24 7.76a6 6 0 100 8.49"></path>',
      life: '<circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"></path>',
      weather: '<path d="M12 2v2M4.93 4.93l1.41 1.41M20 12h2M6.34 17.66l-1.41 1.41M12 20v2M17.66 17.66l1.41 1.41M2 12h2M17.66 6.34l-1.41 1.41"></path><circle cx="12" cy="12" r="4"></circle>',
      sun: '<path d="M17 18a5 5 0 00-10 0M12 2v7M4.22 10.22l4.95-4.95M19.78 10.22l-4.95-4.95"></path>',
      word: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>',
      wifi: '<path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"></path>',
      guardian: '<path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line>',
      wikirandom: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="9"></line><line x1="9" y1="13" x2="15" y2="13"></line><line x1="9" y1="17" x2="11" y2="17"></line>',
      wikiphoto: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline>',
      laundry: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="12" cy="13" r="5"></circle><path d="M12 2v2"></path>',
      hsl: '<rect x="2" y="2" width="20" height="20" rx="2.5" ry="2.5"></rect><line x1="2" y1="17" x2="22" y2="17"></line><line x1="2" y1="6" x2="22" y2="6"></line><circle cx="7" cy="11.5" r="1.5"></circle><circle cx="17" cy="11.5" r="1.5"></circle>',
      stats: '<path d="M18 20V10M12 20V4M6 20v-6"></path>'
    };
    var path = paths[pluginId] || '<circle cx="12" cy="12" r="10"></circle>';
    return svgStart + path + '</svg>';
  }

  function renderQuickSwitcherButtons() {
    var container = document.querySelector('.quick-switcher-content');
    if (!container) return;

    container.innerHTML = '';
    state.activePlugins.forEach(function(item, idx) {
      var btn = document.createElement('button');
      btn.className = 'quick-switcher-btn' + (idx === state.activeIndex ? ' active' : '');
      
      // Clean up names for button display
      var name = item.name;
      if (name === 'HSL Departures') name = 'HSL Live';
      if (name === 'Guardian headlines') name = 'News';
      if (name === 'Guest Wifi') name = 'Wifi';
      if (name === 'Wikipedia photo') name = 'Wiki Photo';
      if (name === 'Wikipedia article') name = 'Wiki Article';
      if (name === 'Personal Stats') name = 'Stats';
      if (name === 'Laundry Cost') name = 'Laundry';
      
      btn.innerHTML = getPluginIcon(item.id) + '<span>' + name.toUpperCase() + '</span>';
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        showPage(idx);
        document.getElementById('quick-switcher').classList.remove('active');
      });
      container.appendChild(btn);
    });
  }

  // Launch Dashboard
  function launch() {
    initConfig();
    applyTheme();
    adjustScale();
    initPlugins();
    startClock();
    initBattery();
    initNavEvents();
    initSettingsToggle();
    initQuickSwitcher();
    
    // Initial page load
    showPage(0);

    // Event listeners
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    updateNetworkStatus(); // initial run
  }

  window.addEventListener('load', launch);

})();
