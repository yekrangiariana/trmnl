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
      this.cachedData = data;
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
        displayEvents.forEach(function(item, idx) {
          var cleanText = self.truncateText(item.text, 95);
          html += '        <div class="history-item" data-type="event" data-index="' + idx + '" style="margin-bottom: 5px; overflow:hidden;">';
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
        displayBirths.forEach(function(item, idx) {
          var cleanText = self.truncateText(item.text, 90);
          html += '          <div class="history-item" data-type="birth" data-index="' + idx + '" style="margin-bottom: 3px; overflow:hidden;">';
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
        displayDeaths.forEach(function(item, idx) {
          var cleanText = self.truncateText(item.text, 90);
          html += '          <div class="history-item" data-type="death" data-index="' + idx + '" style="margin-bottom: 3px; overflow:hidden;">';
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
        leftEvents.forEach(function(item, idx) {
          var cleanText = self.truncateText(item.text, 95);
          html += '        <div class="history-item" data-type="event" data-index="' + idx + '" style="margin-bottom: 5px; overflow:hidden;">';
          html += '          <span class="dither-bullet" style="height: 15px; margin-top: 1px; flex-shrink:0;"></span>';
          html += '          <div class="history-item-content">';
          html += '            <span class="history-item-year" style="font-size: 15px; font-weight:800; margin-right: 4px;">' + item.year + '</span>';
          html += '            <span class="history-item-text" style="font-size: 13.5px; line-height: 1.25;">' + cleanText + '</span>';
          html += '          </div>';
          html += '          </div>';
        });
        html += '      </div>';
        html += '    </div>';

        // Right Column
        html += '    <div class="grid-col col-1" style="justify-content:space-between; height: 560px; overflow:hidden;">';
        html += '      <h2 class="history-title" style="margin-bottom: 6px; font-size: 24px; visibility: hidden;">&nbsp;</h2>';
        html += '      <div style="display:flex; flex-direction:column; justify-content:space-between; flex:1; overflow:hidden;">';
        rightEvents.forEach(function(item, idx) {
          var cleanText = self.truncateText(item.text, 95);
          html += '        <div class="history-item" data-type="event" data-index="' + (idx + 7) + '" style="margin-bottom: 5px; overflow:hidden;">';
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

      // Attach click events
      var historyElements = this.container.querySelectorAll('.history-item');
      historyElements.forEach(function(elem) {
        elem.addEventListener('click', function() {
          var type = elem.dataset.type;
          var indexVal = parseInt(elem.dataset.index, 10);
          var selectedItem = null;
          if (type === 'event') {
            selectedItem = displayEvents[indexVal];
          } else if (type === 'birth') {
            selectedItem = displayBirths[indexVal];
          } else if (type === 'death') {
            selectedItem = displayDeaths[indexVal];
          }
          if (selectedItem) {
            self.viewWikipediaArticle(selectedItem);
          }
        });
      });
    },

    viewWikipediaArticle: function(item) {
      var self = this;
      
      if (window.Dashboard && typeof window.Dashboard.pauseTimer === 'function') {
        window.Dashboard.pauseTimer();
      }

      var page = item.pages && item.pages[0];
      if (!page) {
        self.renderWikipediaFallback(item, null);
        return;
      }

      this.container.innerHTML = 
        '<div style="display:flex; flex-direction:column; height:100%; justify-content:center; align-items:center;">' +
        '  <div style="font-family: var(--font-mono); font-size: 16px; font-weight: 700; margin-bottom: 8px;">RETRIEVING WIKIPEDIA PAGE...</div>' +
        '  <div style="font-family: var(--font-sans); font-size: 14px; opacity: 0.7; text-align: center; max-width: 80%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + (page.normalizedtitle || page.title || item.text) + '</div>' +
        '</div>';

      var title = page.title;
      // CORS-free Wikipedia Action API for summaries/extracts (intro section only)
      var url = "https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=true&explaintext=true&titles=" + encodeURIComponent(title) + "&origin=*";

      fetch(url)
        .then(function(res) {
          if (!res.ok) throw new Error("Wikipedia API error: " + res.status);
          return res.json();
        })
        .then(function(json) {
          self.renderWikipediaContent(json, item, page);
        })
        .catch(function(err) {
          console.error("Wikipedia article fetch failed:", err);
          self.renderWikipediaFallback(item, page);
        });
    },

    renderWikipediaContent: function(json, item, page) {
      try {
        var pages = json.query && json.query.pages;
        var extractText = "";
        if (pages) {
          var keys = Object.keys(pages);
          if (keys.length > 0) {
            extractText = pages[keys[0]].extract || "";
          }
        }

        if (!extractText) {
          this.renderWikipediaFallback(item, page);
          return;
        }

        var lines = extractText.split('\n');
        var paragraphs = [];
        var skipSection = false;

        for (var i = 0; i < lines.length; i++) {
          var line = lines[i].trim();
          if (!line) continue;

          // Check for headers (Wikipedia returns sections separated by == Section Name == or === Subsection ===)
          if (line.indexOf('===') === 0 && line.lastIndexOf('===') === line.length - 3) {
            var headerText = line.substring(3, line.length - 3).trim();
            if (skipSection) continue;
            paragraphs.push("### " + headerText);
          } else if (line.indexOf('==') === 0 && line.lastIndexOf('==') === line.length - 2) {
            var headerText = line.substring(2, line.length - 2).trim();
            var lowerHeader = headerText.toLowerCase();
            // Skip references, bibliography, further reading, and external links
            if (lowerHeader === 'see also' || lowerHeader === 'references' || lowerHeader === 'external links' || lowerHeader === 'further reading' || lowerHeader === 'sources' || lowerHeader === 'notes' || lowerHeader === 'bibliography') {
              skipSection = true;
            } else {
              skipSection = false;
              paragraphs.push("## " + headerText);
            }
          } else {
            if (skipSection) continue;
            paragraphs.push(line);
          }
        }

        if (paragraphs.length === 0) {
          this.renderWikipediaFallback(item, page);
          return;
        }

        var title = page.normalizedtitle || page.title || item.text;
        this.displayWikipediaArticle(title, paragraphs, page);
      } catch (e) {
        console.warn("Error parsing Wikipedia contents:", e);
        this.renderWikipediaFallback(item, page);
      }
    },

    renderWikipediaFallback: function(item, page) {
      var title = page ? (page.normalizedtitle || page.title) : "Historical Event";
      var summary = (page && page.extract) ? page.extract : item.text;
      this.displayWikipediaArticle(title, [summary], page);
    },

    displayWikipediaArticle: function(title, paragraphs, page) {
      var self = this;
      var html = '<div style="display:flex; flex-direction:column; height:100%; justify-content:space-between; padding: 4px 0 0 0;">';
      
      // Article Header (Back button only)
      html += '  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px; border-bottom: var(--border-width-thin) solid var(--border-color); padding-bottom: 6px;">';
      html += '    <button id="article-back-btn" class="trmnl-btn" style="padding: 2px 10px; font-size: 11px; height: 26px; line-height: 1; border-radius: 4px; font-family: var(--font-sans); text-transform: uppercase; cursor: pointer;">&larr; Back</button>';
      html += '  </div>';

      // Article Content Viewport
      html += '  <div class="article-reader-body" style="display:flex; flex-direction:column; flex:1; overflow-y:auto; margin-bottom: 12px; padding-right: 8px;">';
      
      // Render Thumbnail Image if available
      if (page && page.thumbnail && page.thumbnail.source) {
        html += '    <div style="display: flex; align-items: center; justify-content: center; overflow: hidden; height: 220px; background-color: var(--card-bg); position: relative; margin-bottom: 16px; border-radius: 8px; border: var(--border-width-thin) solid var(--border-color);">';
        html += '      <img src="' + page.thumbnail.source + '" alt="Article image" style="width: 100%; height: 100%; object-fit: cover; filter: grayscale(1) contrast(1.4) brightness(0.9); image-rendering: pixelated;" decoding="async">';
        html += '      <div class="trmnl-dither" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0.45; pointer-events: none; mix-blend-mode: multiply;"></div>';
        html += '    </div>';
      }

      html += '    <h1 style="font-family: var(--font-sans); font-size: 25px; font-weight: 800; line-height: 1.25; margin-bottom: 14px; color: var(--text-color);">' + title + '</h1>';
      
      paragraphs.forEach(function(p) {
        if (p.indexOf("## ") === 0) {
          var sub2 = p.substring(3);
          html += '    <h2 style="font-family: var(--font-sans); font-size: 20px; font-weight: 700; margin-top: 18px; margin-bottom: 8px; color: var(--text-color);">' + sub2 + '</h2>';
        } else if (p.indexOf("### ") === 0) {
          var sub3 = p.substring(4);
          html += '    <h3 style="font-family: var(--font-sans); font-size: 17px; font-weight: 700; margin-top: 14px; margin-bottom: 6px; color: var(--text-color);">' + sub3 + '</h3>';
        } else {
          html += '    <p style="font-family: var(--font-serif); font-size: 18px; line-height: 1.6; margin-bottom: 12px; color: var(--text-color); text-align: justify; opacity: 0.9;">' + p + '</p>';
        }
      });
      html += '  </div>';

      // Custom Dithered Footer Bar
      html += '  <div class="trmnl-footer-bar">';
      html += '    <div class="trmnl-footer-badge">';
      html += '      <svg viewBox="0 0 24 24"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path><path d="M18 14h-8M18 18h-8M16 6H10v4h6V6z"></path></svg>';
      html += '      <span>History Reader</span>';
      html += '    </div>';
      html += '    <div class="trmnl-footer-meta">';
      html += '      <span style="font-family: var(--font-mono); font-size: 11px; opacity: 0.8;">Wikipedia</span>';
      html += '    </div>';
      html += '  </div>';

      html += '</div>';

      this.container.innerHTML = html;

      var backBtn = this.container.querySelector('#article-back-btn');
      if (backBtn) {
        backBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          if (window.Dashboard && typeof window.Dashboard.resumeTimer === 'function') {
            window.Dashboard.resumeTimer();
          }
          if (self.cachedData) {
            self.renderHistory(self.cachedData);
          } else {
            self.update();
          }
        });
      }
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
