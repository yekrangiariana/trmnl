/**
 * Time & Date Plugin for TRMNL Dashboard
 * Renders a large, elegant clock, the full date, a mini-calendar of the current month,
 * and year progress metrics. Designed for iPad Mini 2 screen sizes.
 */

(function() {
  'use strict';

  var TimePlugin = {
    id: 'time',
    name: 'Time & Date',
    config: {},
    container: null,
    localTimer: null,

    init: function(pluginConfig) {
      this.config = pluginConfig || {};
    },

    render: function(element) {
      this.container = element;
      this.renderTime();
      this.startLocalTimer();
    },

    update: function() {
      this.renderTime();
      this.startLocalTimer();
    },

    startLocalTimer: function() {
      var self = this;
      if (self.localTimer) return;

      self.localTimer = setInterval(function() {
        if (self.container && self.container.classList.contains('active')) {
          self.renderTime();
        } else {
          clearInterval(self.localTimer);
          self.localTimer = null;
        }
      }, 1000 * 30);
    },

    getWeatherDesc: function(code) {
      var desc = {
        0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
        45: "Foggy", 48: "Depositing fog", 51: "Light drizzle", 53: "Drizzle",
        55: "Dense drizzle", 61: "Light rain", 63: "Moderate rain", 65: "Heavy rain",
        71: "Light snow", 73: "Moderate snow", 75: "Heavy snow", 77: "Snow grains",
        80: "Slight showers", 81: "Rain showers", 82: "Heavy showers",
        95: "Thunderstorm", 96: "Storm w/ hail", 99: "Heavy storm"
      };
      return desc[code] || "Overcast";
    },

    getWeather: function() {
      var self = this;
      var cached = localStorage.getItem('trmnl_weather_cache');
      if (cached) {
        try {
          var data = JSON.parse(cached);
          if (Date.now() - data.timestamp < 30 * 60 * 1000) {
            return data;
          }
        } catch (e) {}
      }

      if (navigator.onLine) {
        var activeConfig = window.Dashboard ? window.Dashboard.getActiveConfig() : {};
        var lat = activeConfig.latitude !== undefined ? activeConfig.latitude : 60.1699;
        var lon = activeConfig.longitude !== undefined ? activeConfig.longitude : 24.9384;
        
        var weatherUrl = "https://api.open-meteo.com/v1/forecast?" +
                         "latitude=" + lat +
                         "&longitude=" + lon +
                         "&current=temperature_2m,weather_code" +
                         "&daily=temperature_2m_max,temperature_2m_min" +
                         "&timezone=auto" +
                         "&forecast_days=1";

        fetch(weatherUrl)
          .then(function(res) {
            if (res.ok) return res.json();
          })
          .then(function(weatherData) {
            if (weatherData && weatherData.current && weatherData.daily) {
              var current = weatherData.current;
              var daily = weatherData.daily;
              
              var tempVal = Math.round(current.temperature_2m || 0);
              var highVal = daily.temperature_2m_max ? Math.round(daily.temperature_2m_max[0]) : 0;
              var lowVal = daily.temperature_2m_min ? Math.round(daily.temperature_2m_min[0]) : 0;
              var descText = self.getWeatherDesc(current.weather_code);
              
              var weatherSummary = {
                temp: tempVal,
                high: highVal,
                low: lowVal,
                desc: descText,
                timestamp: Date.now()
              };
              
              localStorage.setItem('trmnl_weather_cache', JSON.stringify(weatherSummary));
              
              if (self.container && self.container.classList.contains('active')) {
                self.renderTime();
              }
            }
          })
          .catch(function(err) {
            console.warn("Failed to fetch background weather:", err);
          });
      }

      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {}
      }
      return null;
    },

    renderTime: function() {
      if (!this.container) return;

      var now = new Date();
      var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      
      var dayName = days[now.getDay()];
      var monthName = months[now.getMonth()];
      var dateNum = now.getDate();
      var year = now.getFullYear();

      // Hours, minutes, and AM/PM
      var hours = now.getHours();
      var minutes = now.getMinutes();
      var ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 should be 12
      var timeStr = hours + ':' + minutes.toString().padStart(2, '0') + ' ' + ampm;

      var weather = this.getWeather();
      var weatherHtml = '';
      if (weather) {
        weatherHtml = '<div class="time-pixel-widget-weather">' + 
                      weather.temp + '° &bull; ' + weather.desc.toUpperCase() + ' &bull; H: ' + weather.high + '° L: ' + weather.low + '°' +
                      '</div>';
      }

      var activeConfig = window.Dashboard ? window.Dashboard.getActiveConfig() : {};
      var wallpaper = activeConfig.wallpaper || 'pixel_art_landscape.png';
      var wallpaperDark = activeConfig.wallpaperDark;
      var customBase64 = activeConfig.customWallpaperBase64;

      var bgHtml = '';
      if (wallpaper === 'custom' && customBase64) {
        bgHtml = '  <img src="' + customBase64 + '" class="time-pixel-landscape custom-photo" style="mix-blend-mode: normal;" alt="Custom background" decoding="async" fetchpriority="high">';
      } else {
        var lightSrc = wallpaper;
        if (!lightSrc.startsWith('wallpapers/')) {
          lightSrc = 'wallpapers/' + lightSrc;
        }
        
        if (wallpaperDark) {
          var darkSrc = wallpaperDark;
          if (!darkSrc.startsWith('wallpapers/')) {
            darkSrc = 'wallpapers/' + darkSrc;
          }
          bgHtml = '  <img src="' + lightSrc + '" class="time-pixel-landscape light-only" alt="Background light" decoding="async" fetchpriority="high">';
          bgHtml += '  <img src="' + darkSrc + '" class="time-pixel-landscape dark-only" alt="Background dark" decoding="async" fetchpriority="high">';
        } else {
          bgHtml = '  <img src="' + lightSrc + '" class="time-pixel-landscape" style="mix-blend-mode: normal;" alt="Background" decoding="async" fetchpriority="high">';
        }
      }

      // Assemble Main HTML in pixel art landscape layout with floating widget
      var html = '<div class="trmnl-card time-pixel-card">';
      html += bgHtml;
      html += '  <div class="time-pixel-widget">';
      html += '    <div class="time-pixel-widget-header-minimal">' + dayName.toUpperCase() + ' &bull; ' + monthName.toUpperCase() + ' ' + dateNum + ', ' + year + '</div>';
      html += '    <div class="time-pixel-widget-clock-minimal">' + timeStr + '</div>';
      if (weatherHtml) {
        html += '    ' + weatherHtml;
      }
      html += '  </div>';
      html += '  <!-- Invisible footer bar for quick switcher activation -->';
      html += '  <div class="trmnl-footer-bar" style="position: absolute; bottom: 0; left: 0; right: 0; height: 60px; background: transparent; border: none; opacity: 0; z-index: 15; cursor: pointer;"></div>';
      html += '</div>';

      this.container.innerHTML = html;
    }
  };

  // Register plugin
  window.Plugins = window.Plugins || {};
  window.Plugins.time = TimePlugin;

})();
