/**
 * Wikipedia "This Day in History" Plugin for BRIEF Dashboard
 * Fetches events, births, and deaths for today's date from Wikipedia REST API.
 */

(function() {
  'use strict';

  var HistoryPlugin = {
    id: 'today_in_history',
    name: 'Today in History',
    config: {},
    container: null,

    init: function(pluginConfig) {
      this.config = pluginConfig || {};
    },

    render: function(element) {
      this.container = element;
      var cachedStr = localStorage.getItem('brief_history_cache');
      if (cachedStr) {
        try {
          var cached = JSON.parse(cachedStr);
          var todayStr = new Date().toDateString();
          if (cached && cached.date === todayStr && cached.data) {
            this.renderHistory(cached.data);
            return;
          }
        } catch (e) {
          console.warn("Failed to parse history cache in render:", e);
        }
      }
      this.container.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100%;font-family:var(--font-mono);font-size:16px;">RETRIEVING HISTORY FROM WIKIPEDIA...</div>';
    },

    update: function() {
      var self = this;
      var todayStr = new Date().toDateString();
      var cachedStr = localStorage.getItem('brief_history_cache');
      var needsFetch = true;

      if (cachedStr) {
        try {
          var cached = JSON.parse(cachedStr);
          if (cached && cached.date === todayStr && cached.data) {
            needsFetch = false;
            if (self.container) {
              self.renderHistory(cached.data);
            }
          }
        } catch (e) {
          console.warn("Failed to check history cache in update:", e);
        }
      }

      if (!needsFetch) {
        return;
      }

      var now = new Date();
      var month = now.getMonth() + 1;
      var day = now.getDate();

      // Pad helper
      var mm = month < 10 ? '0' + month : month;
      var dd = day < 10 ? '0' + day : day;

      var url = "https://en.wikipedia.org/api/rest_v1/feed/onthisday/all/" + mm + "/" + dd;

      fetch(url)
        .then(function(response) {
          if (!response.ok) throw new Error("HTTP error " + response.status);
          return response.json();
        })
        .then(function(data) {
          var cacheObj = {
            date: todayStr,
            data: data
          };
          try {
            localStorage.setItem('brief_history_cache', JSON.stringify(cacheObj));
          } catch (e) {
            console.warn("Failed to save history cache:", e);
          }
          self.renderHistory(data);
        })
        .catch(function(err) {
          console.error("Wikipedia history fetch failed:", err);
          if (cachedStr) {
            try {
              var cached = JSON.parse(cachedStr);
              if (cached && cached.data) {
                self.renderHistory(cached.data);
                return;
              }
            } catch (e) {}
          }
          self.renderError();
        });
    },

    formatLongDate: function() {
      var now = new Date();
      var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      return months[now.getMonth()] + " " + now.getDate() + ", " + now.getFullYear();
    },

    truncateText: function(str, maxLen) {
      if (!str) return "";
      if (str.length <= maxLen) return str;
      return str.substring(0, maxLen) + "...";
    },

    getSelectedEvents: function(events, mode, count) {
      var N = events.length;
      if (N === 0) return [];
      
      var selected = [];
      if (mode === 'oldest') {
        var actualCount = Math.min(count, N);
        selected = events.slice(-actualCount);
      } else if (mode === 'mix') {
        if (N <= count) {
          selected = events.slice();
        } else {
          // Determine counts for recent, middle, oldest
          var recentCount = Math.floor(count * 0.25);
          var middleCount = Math.floor(count * 0.25);
          if (count === 7) {
            recentCount = 1;
            middleCount = 2;
          } else if (count === 14) {
            recentCount = 3;
            middleCount = 4;
          }
          var oldestCount = count - recentCount - middleCount;
          
          var recentList = events.slice(0, recentCount);
          var oldestList = events.slice(-oldestCount);
          
          var mid = Math.floor(N / 2);
          var startMid = mid - Math.floor(middleCount / 2);
          if (startMid < recentCount) startMid = recentCount;
          if (startMid + middleCount > N - oldestCount) startMid = N - oldestCount - middleCount;
          var middleList = events.slice(startMid, startMid + middleCount);
          
          selected = recentList.concat(middleList, oldestList);
        }
      } else {
        // default / recent (Wikipedia default: newest first)
        var actualCount = Math.min(count, N);
        selected = events.slice(0, actualCount);
      }
      
      // Sort the entire selected list from oldest to newest (chronological order)
      return selected.sort(function(a, b) {
        return parseInt(a.year, 10) - parseInt(b.year, 10);
      });
    },

    renderHistory: function(data) {
      var self = this;
      var events = data.events || [];
      var births = data.births || [];
      var deaths = data.deaths || [];

      var activeConfig = window.Dashboard ? window.Dashboard.getActiveConfig() : {};
      var showBirthsDeaths = activeConfig.historyShowBirthsDeaths !== undefined ? activeConfig.historyShowBirthsDeaths : false;
      var mode = activeConfig.historyEventMode || 'mix';

      var html = '<div style="display:flex; flex-direction:column; height:100%; justify-content:space-between; padding: 0;">';
      
      // Columns Row
      html += '  <div class="grid-row" style="flex:1; margin-bottom: 12px;">';

      if (showBirthsDeaths) {
        // Case 1: Standard layout (Events in Left Column, Births/Deaths in Right Column)
        var displayEvents = self.getSelectedEvents(events, mode, 7);
        var displayBirths = births.slice(0, 5);
        var displayDeaths = deaths.slice(0, 5);

        // Left Column: Events (Full Height, max 560px)
        html += '    <div class="grid-col col-1" style="justify-content:space-between; height: 560px; overflow:hidden;">';
        html += '      <h2 class="history-title" style="margin-bottom: 6px; font-size: 24px;">On This Day</h2>';
        html += '      <div style="display:flex; flex-direction:column; justify-content:space-between; flex:1; overflow:hidden;">';
        displayEvents.forEach(function(item) {
          var cleanText = self.truncateText(item.text, 95);
          html += '        <div class="history-item" style="margin-bottom: 5px; overflow:hidden;">';
          html += '          <span class="dither-bullet" style="height: 15px; margin-top: 1px; flex-shrink:0;"></span>';
          html += '          <div class="history-item-content">';
          html += '            <span class="history-item-year" style="font-size: 15px; font-weight:800; margin-right: 4px;">' + item.year + '</span>';
          html += '            <span class="history-item-text" style="font-size: 13.5px; line-height: 1.25;">' + cleanText + '</span>';
          html += '          </div>';
          html += '        </div>';
        });
        html += '      </div>';
        html += '    </div>';

        // Right Column: Births (Top Half) & Deaths (Bottom Half)
        html += '    <div class="grid-col col-1" style="height: 560px; justify-content:space-between; overflow:hidden;">';
        
        // Births section
        html += '      <div style="height: 270px; display:flex; flex-direction:column; overflow:hidden;">';
        html += '        <h2 class="history-title" style="margin-bottom:4px; font-size: 24px;">Births</h2>';
        html += '        <div style="display:flex; flex-direction:column; justify-content:space-between; flex:1; overflow:hidden;">';
        displayBirths.forEach(function(item) {
          var cleanText = self.truncateText(item.text, 90);
          html += '          <div class="history-item" style="margin-bottom: 3px; overflow:hidden;">';
          html += '            <span class="dither-bullet" style="height: 15px; margin-top: 1px; flex-shrink:0;"></span>';
          html += '            <div class="history-item-content">';
          html += '              <span class="history-item-year" style="font-size: 15px; font-weight:800; margin-right: 4px;">' + item.year + '</span>';
          html += '              <span class="history-item-text" style="font-size: 13.5px; line-height: 1.25;">' + cleanText + '</span>';
          html += '            </div>';
          html += '          </div>';
        });
        html += '        </div>';
        html += '      </div>';

        // Deaths section
        html += '      <div style="height: 270px; display:flex; flex-direction:column; border-top: var(--border-width-thin) dashed var(--border-color); padding-top: 6px; overflow:hidden;">';
        html += '        <h2 class="history-title" style="margin-bottom:4px; font-size: 24px;">Deaths</h2>';
        html += '        <div style="display:flex; flex-direction:column; justify-content:space-between; flex:1; overflow:hidden;">';
        displayDeaths.forEach(function(item) {
          var cleanText = self.truncateText(item.text, 90);
          html += '          <div class="history-item" style="margin-bottom: 3px; overflow:hidden;">';
          html += '            <span class="dither-bullet" style="height: 15px; margin-top: 1px; flex-shrink:0;"></span>';
          html += '            <div class="history-item-content">';
          html += '              <span class="history-item-year" style="font-size: 15px; font-weight:800; margin-right: 4px;">' + item.year + '</span>';
          html += '              <span class="history-item-text" style="font-size: 13.5px; line-height: 1.25;">' + cleanText + '</span>';
          html += '            </div>';
          html += '          </div>';
        });
        html += '        </div>';
        html += '      </div>';

        html += '    </div>';
      } else {
        // Case 2: Events Only layout (Hides Births & Deaths)
        var displayEvents = self.getSelectedEvents(events, mode, 14);
        var leftEvents = displayEvents.slice(0, 7);
        var rightEvents = displayEvents.slice(7);

        // Left Column
        html += '    <div class="grid-col col-1" style="justify-content:space-between; height: 560px; overflow:hidden;">';
        html += '      <h2 class="history-title" style="margin-bottom: 6px; font-size: 24px;">On This Day</h2>';
        html += '      <div style="display:flex; flex-direction:column; justify-content:space-between; flex:1; overflow:hidden;">';
        leftEvents.forEach(function(item) {
          var cleanText = self.truncateText(item.text, 95);
          html += '        <div class="history-item" style="margin-bottom: 5px; overflow:hidden;">';
          html += '          <span class="dither-bullet" style="height: 15px; margin-top: 1px; flex-shrink:0;"></span>';
          html += '          <div class="history-item-content">';
          html += '            <span class="history-item-year" style="font-size: 15px; font-weight:800; margin-right: 4px;">' + item.year + '</span>';
          html += '            <span class="history-item-text" style="font-size: 13.5px; line-height: 1.25;">' + cleanText + '</span>';
          html += '          </div>';
          html += '        </div>';
        });
        html += '      </div>';
        html += '    </div>';

        // Right Column
        html += '    <div class="grid-col col-1" style="justify-content:space-between; height: 560px; overflow:hidden;">';
        html += '      <h2 class="history-title" style="margin-bottom: 6px; font-size: 24px; visibility: hidden;">&nbsp;</h2>';
        html += '      <div style="display:flex; flex-direction:column; justify-content:space-between; flex:1; overflow:hidden;">';
        rightEvents.forEach(function(item) {
          var cleanText = self.truncateText(item.text, 95);
          html += '        <div class="history-item" style="margin-bottom: 5px; overflow:hidden;">';
          html += '          <span class="dither-bullet" style="height: 15px; margin-top: 1px; flex-shrink:0;"></span>';
          html += '          <div class="history-item-content">';
          html += '            <span class="history-item-year" style="font-size: 15px; font-weight:800; margin-right: 4px;">' + item.year + '</span>';
          html += '            <span class="history-item-text" style="font-size: 13.5px; line-height: 1.25;">' + cleanText + '</span>';
          html += '          </div>';
          html += '        </div>';
        });
        html += '      </div>';
        html += '    </div>';
      }

      html += '  </div>';

      // Custom Dithered Footer Bar
      html += '  <div class="trmnl-footer-bar">';
      html += '    <div class="trmnl-footer-badge">';
      html += '      <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>';
      html += '      <span>Today in History</span>';
      html += '    </div>';
      html += '    <div class="trmnl-footer-meta">' + this.formatLongDate() + '</div>';
      html += '  </div>';

      html += '</div>';

      this.container.innerHTML = html;
    },

    renderError: function() {
      this.container.innerHTML = 
        '<div class="trmnl-card" style="height:100%; justify-content:center; align-items:center; text-align:center;">' +
        '  <div style="font-size: 48px; margin-bottom: 16px;">📰</div>' +
        '  <div style="font-family: var(--font-mono); font-size: 16px; font-weight:700;">WIKIPEDIA HISTORY FAILED</div>' +
        '  <div style="font-family: var(--font-mono); font-size: 12px; margin-top: 8px; opacity: 0.6;">Could not reach Wikipedia API.</div>' +
        '</div>';
    }
  };

  // Register plugin
  window.Plugins = window.Plugins || {};
  window.Plugins.today_in_history = HistoryPlugin;

})();
