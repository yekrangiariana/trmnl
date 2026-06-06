/**
 * Custom Weather Plugin for TRMNL Dashboard
 * Replicates the exact 3-column detailed dashboard (Amersfoort Layout).
 * Fetches data from Open-Meteo Weather and Air Quality APIs (free, keyless).
 */

(function() {
  'use strict';

  var WeatherPlugin = {
    id: 'weather',
    name: 'Weather',
    config: {},
    container: null,

    init: function(pluginConfig) {
      this.config = pluginConfig || {};
    },

    render: function(element) {
      this.container = element;
      this.container.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100%;font-family:var(--font-mono);font-size:16px;">LOADING DETAILED WEATHER DASHBOARD...</div>';
    },

    // SVG Outline Icons Generator
    getWeatherIcon: function(code, size) {
      var s = size || 24;
      var style = 'width:' + s + 'px; height:' + s + 'px;';
      
      // Map WMO codes
      if (code === 0 || code === 1) {
        // Sunny / Clear
        return '<svg viewBox="0 0 24 24" style="' + style + '"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
      } else if (code === 2 || code === 3) {
        // Overcast / Cloudy
        return '<svg viewBox="0 0 24 24" style="' + style + '"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>';
      } else if (code >= 51 && code <= 67) {
        // Rain / Drizzle
        return '<svg viewBox="0 0 24 24" style="' + style + '"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path><line x1="8" y1="22" x2="8" y2="24"></line><line x1="12" y1="22" x2="12" y2="24"></line><line x1="16" y1="22" x2="16" y2="24"></line></svg>';
      } else if (code >= 71 && code <= 77) {
        // Snow
        return '<svg viewBox="0 0 24 24" style="' + style + '"><line x1="12" y1="2" x2="12" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line><line x1="4.93" y1="19.07" x2="19.07" y2="4.93"></line></svg>';
      } else if (code >= 80 && code <= 82) {
        // Rain Showers
        return '<svg viewBox="0 0 24 24" style="' + style + '"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path><line x1="9" y1="21" x2="7" y2="23"></line><line x1="13" y1="21" x2="11" y2="23"></line><line x1="17" y1="21" x2="15" y2="23"></line></svg>';
      } else if (code >= 95) {
        // Thunderstorm
        return '<svg viewBox="0 0 24 24" style="' + style + '"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path><polyline points="13 14 9 18 12 18 10 22"></polyline></svg>';
      }
      // Default Cloud/Sun mix
      return '<svg viewBox="0 0 24 24" style="' + style + '"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>';
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

    formatTimeOnly: function(isoStr) {
      if (!isoStr) return "--:--";
      var parts = isoStr.split('T')[1];
      if (!parts) return "--:--";
      return parts.substring(0, 5); // Returns HH:MM
    },

    update: function() {
      var self = this;
      var activeConfig = window.Dashboard ? window.Dashboard.getActiveConfig() : {};
      self.config = Object.assign({}, self.config, activeConfig);
      
      var lat = self.config.latitude !== undefined ? self.config.latitude : 60.1699;
      var lon = self.config.longitude !== undefined ? self.config.longitude : 24.9384;
      
      var weatherUrl = "https://api.open-meteo.com/v1/forecast?" +
                       "latitude=" + lat +
                       "&longitude=" + lon +
                       "&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,uv_index,visibility" +
                       "&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,daylight_duration" +
                       "&hourly=precipitation_probability" +
                       "&timezone=auto" +
                       "&forecast_days=8";

      var airQualityUrl = "https://air-quality-api.open-meteo.com/v1/air-quality?" +
                          "latitude=" + lat +
                          "&longitude=" + lon +
                          "&current=pm10,pm2_5,european_aqi";

      Promise.all([
        fetch(weatherUrl).then(function(r) { if (!r.ok) throw new Error(); return r.json(); }),
        fetch(airQualityUrl).then(function(r) { if (!r.ok) throw new Error(); return r.json(); })
      ])
      .then(function(results) {
        self.renderDashboard(results[0], results[1]);
      })
      .catch(function(err) {
        console.error("Weather/AQI fetch failed:", err);
        self.renderError();
      });
    },

    renderDashboard: function(weatherData, aqiData) {
      var locName = this.config.locationName || 'Helsinki';
      
      var now = new Date();
      var hours = now.getHours();
      var minutes = now.getMinutes();
      var ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      minutes = minutes < 10 ? '0' + minutes : minutes;
      var timeStr = hours + ':' + minutes + ' ' + ampm;

      var current = weatherData.current || {};
      var daily = weatherData.daily || {};
      var hourly = weatherData.hourly || {};
      var aqiCurrent = aqiData.current || {};

      var tempVal = Math.round(current.temperature_2m || 0);
      var highVal = daily.temperature_2m_max ? Math.round(daily.temperature_2m_max[0]) : 0;
      var lowVal = daily.temperature_2m_min ? Math.round(daily.temperature_2m_min[0]) : 0;
      var descText = this.getWeatherDesc(current.weather_code);

      // Cache weather summary for other plugins (like Time)
      try {
        var weatherSummary = {
          temp: tempVal,
          high: highVal,
          low: lowVal,
          desc: descText,
          timestamp: Date.now()
        };
        localStorage.setItem('trmnl_weather_cache', JSON.stringify(weatherSummary));
      } catch (e) {
        console.warn("Failed to cache weather data:", e);
      }

      // Chance of Rain (current hour)
      var currentHour = new Date().getHours();
      var rainProb = 0;
      if (hourly.precipitation_probability) {
        rainProb = hourly.precipitation_probability[currentHour] || 0;
      }

      var html = '<div style="display:flex; flex-direction:column; height:100%;">';
      
      // Panel Row
      html += '  <div class="weather-container">';
      
      // 1. LEFT COLUMN: Current Conditions
      html += '    <div class="weather-col">';
      // Dither header with icon
      html += '      <div class="weather-current-header trmnl-dither">';
      html += '        ' + this.getWeatherIcon(current.weather_code, 120);
      html += '        <div class="weather-current-desc">' + descText + '</div>';
      html += '      </div>';
      // Bottom stats
      html += '      <div class="weather-current-body">';
      html += '        <div class="weather-temp-large">' + tempVal + '°</div>';
      html += '        <div class="weather-high-low-row">';
      html += '          <div class="weather-pill"><span>↑</span> <span>' + highVal + '°</span></div>';
      html += '          <div class="weather-pill"><span>↓</span> <span>' + lowVal + '°</span></div>';
      html += '        </div>';
      html += '      </div>';
      // Custom icon-based sub-footer
      html += '      <div class="weather-current-footer">';
      // Cloud cover icon + pct
      html += '        <div class="weather-footer-item">';
      html += '          <svg viewBox="0 0 24 24"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>';
      html += '          <span>' + (current.cloud_cover || 0) + '%</span>';
      html += '        </div>';
      // Humidity droplet icon + pct
      html += '        <div class="weather-footer-item">';
      html += '          <svg viewBox="0 0 24 24"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>';
      html += '          <span>' + (current.relative_humidity_2m || 0) + '%</span>';
      html += '        </div>';
      // Feels-like person icon + temp
      html += '        <div class="weather-footer-item">';
      html += '          <svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"></circle><path d="M14 9h-4L9 21h2v-6h2v6h2l-1-12z"></path></svg>';
      html += '          <span>' + Math.round(current.apparent_temperature || 0) + '°</span>';
      html += '        </div>';
      html += '      </div>';
      html += '    </div>';

      // 2. MIDDLE COLUMN: 8-Day Forecast
      html += '    <div class="weather-col">';
      html += '      <div class="weather-forecast-list">';
      
      var daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      var today = new Date();

      for (var i = 0; i < 8; i++) {
        var dateVal = new Date(today);
        dateVal.setDate(today.getDate() + i);
        var dayName = i === 0 ? "Today" : daysOfWeek[dateVal.getDay()];
        
        var maxTemp = (daily.temperature_2m_max && daily.temperature_2m_max[i] !== undefined) ? Math.round(daily.temperature_2m_max[i]) : '--';
        var minTemp = (daily.temperature_2m_min && daily.temperature_2m_min[i] !== undefined) ? Math.round(daily.temperature_2m_min[i]) : '--';
        var wCode = daily.weather_code ? daily.weather_code[i] : 0;

        html += '        <div class="weather-forecast-row">';
        html += '          <div style="display: flex; align-items: center;">';
        html += '            ' + this.getWeatherIcon(wCode, 22);
        html += '            <span class="weather-forecast-day">' + dayName + '</span>';
        html += '          </div>';
        html += '          <span class="weather-forecast-temp">' + maxTemp + '°<span class="weather-forecast-temp-min">/' + minTemp + '°</span></span>';
        html += '        </div>';
      }
      
      html += '      </div>';
      
      // Sunrise / Sunset footer
      var sunr = daily.sunrise ? this.formatTimeOnly(daily.sunrise[0]) : '--:--';
      var suns = daily.sunset ? this.formatTimeOnly(daily.sunset[0]) : '--:--';
      html += '      <div class="weather-forecast-sun-footer">';
      html += '        <div style="display:flex; align-items:center;">';
      html += '          <svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:var(--text-color);fill:none;stroke-width:2;margin-right:6px;"><path d="M17 18a5 5 0 0 0-10 0"></path><line x1="12" y1="2" x2="12" y2="9"></line><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"></line><line x1="1" y1="18" x2="3" y2="18"></line><line x1="21" y1="18" x2="23" y2="18"></line><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"></line><polyline points="8 12 12 8 16 12"></polyline></svg>';
      html += '          <span>' + sunr + '</span>';
      html += '        </div>';
      html += '        <div style="display:flex; align-items:center;">';
      html += '          <svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:var(--text-color);fill:none;stroke-width:2;margin-right:6px;"><path d="M17 18a5 5 0 0 0-10 0"></path><line x1="12" y1="9" x2="12" y2="2"></line><line x1="4.22" y1="11.64" x2="5.64" y2="10.22"></line><line x1="1" y1="18" x2="3" y2="18"></line><line x1="21" y1="18" x2="23" y2="18"></line><line x1="18.36" y1="10.22" x2="19.78" y2="11.64"></line><polyline points="16 6 12 10 8 6"></polyline></svg>';
      html += '          <span>' + suns + '</span>';
      html += '        </div>';
      html += '      </div>';
      html += '    </div>';

      // 3. RIGHT COLUMN: Weather Metrics & Air Quality
      html += '    <div class="weather-col">';
      html += '      <div class="weather-metrics-list">';
      
      // Metric helper rows
      var mWind = Math.round(current.wind_speed_10m || 0) + ' kmh';
      var mDir = Math.round(current.wind_direction_10m || 0) + '°';
      var mUv = (current.uv_index !== undefined ? current.uv_index : 0).toFixed(1);
      var mRain = rainProb + '%';
      var mVis = ((current.visibility || 0) / 1000).toFixed(1) + ' km';
      var mAqi = aqiCurrent.european_aqi !== undefined ? aqiCurrent.european_aqi : '--';
      var mPress = Math.round(current.pressure_msl || 1013) + ' hPa';
      var mLight = daily.daylight_duration ? (daily.daylight_duration[0] / 3600).toFixed(1) + 'h' : '--h';

      var metrics = [
        { label: "Wind Speed", val: mWind, icon: '<svg viewBox="0 0 24 24"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"></path></svg>' },
        { label: "Wind Direction", val: mDir, icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>' },
        { label: "UV Index", val: mUv, icon: '<svg viewBox="0 0 24 24"><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path><circle cx="12" cy="12" r="4"></circle></svg>' },
        { label: "Chance of Rain", val: mRain, icon: '<svg viewBox="0 0 24 24"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>' },
        { label: "Visibility", val: mVis, icon: '<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>' },
        { label: "Air Quality", val: mAqi, icon: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"></path><path d="M12 6v6l4 2"></path></svg>' },
        { label: "Pressure", val: mPress, icon: '<svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>' },
        { label: "Total daylight", val: mLight, icon: '<svg viewBox="0 0 24 24"><path d="M17 18a5 5 0 0 0-10 0"></path><line x1="12" y1="9" x2="12" y2="2"></line><line x1="4.22" y1="11.64" x2="5.64" y2="10.22"></line><line x1="1" y1="18" x2="3" y2="18"></line><line x1="21" y1="18" x2="23" y2="18"></line><line x1="18.36" y1="10.22" x2="19.78" y2="11.64"></line></svg>' }
      ];

      metrics.forEach(function(m) {
        html += '        <div class="weather-metric-row">';
        html += '          <span class="weather-metric-label">' + m.icon + ' ' + m.label + '</span>';
        html += '          <span class="weather-metric-val">' + m.val + '</span>';
        html += '        </div>';
      });

      html += '      </div>';
      
      // PM2.5 & PM10 AQI Details footer
      var pm25 = aqiCurrent.pm2_5 !== undefined ? aqiCurrent.pm2_5.toFixed(1) : '--';
      var pm10 = aqiCurrent.pm10 !== undefined ? aqiCurrent.pm10.toFixed(1) : '--';
      html += '      <div class="weather-aqi-footer">';
      html += '        <div style="text-align:center;">';
      html += '          <span style="opacity:0.6; display:block; font-size:10px;">PM2.5</span>';
      html += '          <span>' + pm25 + 'µg/m³</span>';
      html += '        </div>';
      html += '        <div style="text-align:center; border-left:1px dashed var(--border-color); padding-left:16px;">';
      html += '          <span style="opacity:0.6; display:block; font-size:10px;">PM10</span>';
      html += '          <span>' + pm10 + 'µg/m³</span>';
      html += '        </div>';
      html += '      </div>';
      html += '    </div>';

      html += '  </div>';

      // Weather Footer Bar
      html += '  <div class="trmnl-footer-bar" style="margin-top: 12px;">';
      html += '    <div class="trmnl-footer-badge">';
      // Weather Cloud Icon SVG
      html += '      <svg viewBox="0 0 24 24"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>';
      html += '      <span>Weather</span>';
      html += '    </div>';
      html += '    <div class="trmnl-footer-meta">' + locName.toUpperCase() + ' - ' + timeStr + '</div>';
      html += '  </div>';

      html += '</div>';

      this.container.innerHTML = html;
    },

    renderError: function() {
      this.container.innerHTML = 
        '<div class="trmnl-card" style="height:100%; justify-content:center; align-items:center; text-align:center;">' +
        '  <div style="font-size: 48px; margin-bottom: 16px;">⚠</div>' +
        '  <div style="font-family: var(--font-mono); font-size: 16px; font-weight:700;">WEATHER DASHBOARD OFFLINE</div>' +
        '  <div style="font-family: var(--font-mono); font-size: 12px; margin-top: 8px; opacity: 0.6;">Check coordinates in config file.</div>' +
        '</div>';
    }
  };

  // Register plugin
  window.Plugins = window.Plugins || {};
  window.Plugins.weather = WeatherPlugin;

})();
