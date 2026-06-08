/**
 * Finnish Idiom of the Day Plugin for TRMNL Dashboard
 * Displays a daily Finnish idiom with English translation and meaning.
 * Supports chronological history navigation through previously unlocked/seen idioms.
 * Caches results and seen history in localStorage for offline-first PWA operation.
 */

(function() {
  'use strict';

  var FinnishPlugin = {
    id: 'finnish',
    name: 'Finnish Idioms',
    config: {},
    container: null,
    idioms: [],
    seenList: [],          // Array of { index: number, date: string }
    currentViewIndex: 0,   // Index within seenList being viewed

    init: function(pluginConfig) {
      this.config = pluginConfig || {};
      this.seenList = [];
      this.currentViewIndex = 0;
    },

    render: function(element) {
      this.container = element;
      this.fetchAndRender();
    },

    update: function() {
      this.fetchAndRender();
    },

    fetchAndRender: function() {
      if (!this.container) return;

      var self = this;
      
      // Load static data first
      if (this.idioms && this.idioms.length > 0) {
        this.processSeenHistoryAndRender();
        return;
      }

      // Check if we have cached idioms in localStorage
      try {
        var cached = localStorage.getItem('trmnl_finnish_idioms_cache');
        if (cached) {
          var parsed = JSON.parse(cached);
          if (parsed && parsed.length > 0) {
            self.idioms = parsed;
            self.processSeenHistoryAndRender();
            return;
          }
        }
      } catch (e) {
        console.warn("Error reading idioms cache:", e);
      }

      this.drawLoading();
      
      fetch('idioms.json')
        .then(function(res) {
          if (!res.ok) throw new Error("Failed to load idioms.json");
          return res.json();
        })
        .then(function(data) {
          if (data && data.length > 0) {
            self.idioms = data;
            // Cache data locally
            try {
              localStorage.setItem('trmnl_finnish_idioms_cache', JSON.stringify(data));
            } catch (err) {
              console.warn("Failed to cache idioms list:", err);
            }
            self.processSeenHistoryAndRender();
          } else {
            throw new Error("Empty idioms data");
          }
        })
        .catch(function(err) {
          console.error("Finnish idioms fetch failed:", err);
          self.drawError();
        });
    },

    processSeenHistoryAndRender: function() {
      if (!this.idioms || this.idioms.length === 0) return;

      var totalIdioms = this.idioms.length;
      var todayStr = new Date().toDateString();
      
      // 1. Load seen history from localStorage
      var savedSeen = [];
      try {
        var saved = localStorage.getItem('trmnl_finnish_seen_list');
        if (saved) {
          savedSeen = JSON.parse(saved);
        }
      } catch (e) {
        console.warn("Error parsing seen list:", e);
      }

      if (Array.isArray(savedSeen)) {
        this.seenList = savedSeen;
      } else {
        this.seenList = [];
      }

      // 2. Perform daily unlock logic
      if (this.seenList.length === 0) {
        // First time running: unlock the first idiom (index 0)
        this.seenList.push({
          index: 0,
          date: todayStr
        });
        this.saveSeenList();
        this.currentViewIndex = 0;
      } else {
        var lastItem = this.seenList[this.seenList.length - 1];
        
        if (lastItem.date !== todayStr) {
          if (this.seenList.length >= totalIdioms) {
            // Completed cycle: start fresh at index 0 and reset history
            this.seenList = [{
              index: 0,
              date: todayStr
            }];
          } else {
            // New calendar day visit: unlock the next sequential idiom
            var nextIdiomIndex = (lastItem.index + 1) % totalIdioms;
            this.seenList.push({
              index: nextIdiomIndex,
              date: todayStr
            });
          }
          this.saveSeenList();
        }
        
        // Default view index is the last unlocked idiom (today's)
        this.currentViewIndex = this.seenList.length - 1;
      }

      this.renderCurrentIdiom();
    },

    saveSeenList: function() {
      try {
        localStorage.setItem('trmnl_finnish_seen_list', JSON.stringify(this.seenList));
      } catch (e) {
        console.warn("Error saving seen list:", e);
      }
    },

    renderCurrentIdiom: function() {
      if (!this.container || this.seenList.length === 0) return;

      var currentSeenItem = this.seenList[this.currentViewIndex];
      var selected = this.idioms[currentSeenItem.index];
      
      this.drawIdiom(selected, currentSeenItem.date);
    },

    formatDateLabel: function(dateStr) {
      var todayStr = new Date().toDateString();
      if (dateStr === todayStr) {
        return "TODAY'S IDIOM";
      }

      var itemDate = new Date(dateStr);
      var today = new Date();
      
      // Calculate day difference by stripping hours
      var normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      var normalizedItem = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate()).getTime();
      var diffMs = normalizedToday - normalizedItem;
      var oneDayMs = 24 * 60 * 60 * 1000;

      if (diffMs === oneDayMs) {
        return "YESTERDAY'S IDIOM";
      }

      // Format standard date: e.g. "JUN 8, 2026"
      var months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      return months[itemDate.getMonth()] + ' ' + itemDate.getDate() + ', ' + itemDate.getFullYear();
    },

    drawIdiom: function(selected, dateStr) {
      var html = '<div style="display:flex; flex-direction:column; height:100%; justify-content:space-between; padding: 10px 0;">';
      
      // Card Container
      html += '  <div class="trmnl-card" style="flex:1; display:flex; flex-direction:column; justify-content:space-between; padding: 32px 40px; margin-bottom: 16px;">';
      
      // Top header showing the date description
      var dateLabel = this.formatDateLabel(dateStr);
      var historyProgress = (this.currentViewIndex + 1) + ' / ' + this.seenList.length;

      html += '    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:var(--border-width-thin) solid var(--border-color); padding-bottom:8px; margin-bottom:16px;">';
      html += '      <div style="font-family: var(--font-mono); font-size: 13px; font-weight: 700; text-transform: uppercase; opacity: 0.65; letter-spacing: 0.05em;">' + dateLabel + '</div>';
      html += '      <div style="font-family: var(--font-mono); font-size: 12px; font-weight: 700; opacity: 0.5;">' + historyProgress + '</div>';
      html += '    </div>';

      // Idiom Detail Content
      html += '    <div style="flex:1; display:flex; flex-direction:column; justify-content:center;">';
      
      // Finnish idiom in large text
      html += '      <div class="text-serif" style="font-size: 42px; font-weight: 600; line-height: 1.15; margin-bottom: 16px; color: var(--text-color);">';
      html += '        ' + selected.idiom;
      html += '      </div>';
      
      // Literal Translation
      if (selected.translation) {
        html += '      <div style="font-family: var(--font-sans); font-size: 16px; font-style: italic; opacity:0.8; margin-bottom: 24px; display: flex; align-items: flex-start;">';
        html += '        <span style="font-weight:700; font-family: var(--font-mono); font-size:12px; margin-right: 8px; border: var(--border-width-thin) solid var(--border-color); border-radius: 4px; padding: 1px 6px; font-style: normal; opacity: 0.75; text-transform: uppercase;">Literal</span>';
        html += '        <span style="flex:1;">' + selected.translation + '</span>';
        html += '      </div>';
      }

      // Figured Meaning
      if (selected.meaning) {
        html += '      <div class="text-serif" style="font-size: 20px; line-height: 1.45; font-weight: 500; border-left: var(--border-width) solid var(--border-color); padding-left: 16px;">';
        html += '        ' + selected.meaning;
        html += '      </div>';
      }
      
      html += '    </div>';

      // Navigation Control Row
      var hasPrev = this.currentViewIndex > 0;
      var hasNext = this.currentViewIndex < this.seenList.length - 1;
      
      if (hasPrev || hasNext) {
        html += '    <div style="margin-top: 24px; display:flex; gap:12px; align-items:center;">';
        if (hasPrev) {
          html += '      <button id="finnish-prev-btn" class="trmnl-btn secondary" style="font-size: 13px; padding: 8px 16px;">' + window.getIcon('arrow-left', 'margin-right: 6px;') + 'Prev</button>';
        }
        if (hasNext) {
          html += '      <button id="finnish-next-btn" class="trmnl-btn secondary" style="font-size: 13px; padding: 8px 16px;">Next' + window.getIcon('arrow-right', 'margin-left: 6px;') + '</button>';
          html += '      <button id="finnish-today-btn" class="trmnl-btn" style="font-size: 13px; padding: 8px 16px; margin-left:auto;">Today</button>';
        }
        html += '    </div>';
      }

      html += '  </div>'; // End trmnl-card

      // Footer Bar
      html += '  <div class="trmnl-footer-bar">';
      html += '    <div class="trmnl-footer-badge">';
      // Inline Speech Bubble SVG Icon
      html += '      <svg viewBox="0 0 24 24" style="stroke-width: 2.5;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
      html += '      <span>Finnish Idiom</span>';
      html += '    </div>';
      var totalIdioms = this.idioms ? this.idioms.length : 170;
      var seenCount = this.seenList ? this.seenList.length : 1;
      html += '    <div class="trmnl-footer-meta">' + seenCount + ' / ' + totalIdioms + ' REVIEWED</div>';
      html += '  </div>';

      html += '</div>';

      this.container.innerHTML = html;

      // Event Bindings
      var self = this;
      var prevBtn = this.container.querySelector('#finnish-prev-btn');
      if (prevBtn && hasPrev) {
        prevBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          e.preventDefault();
          self.currentViewIndex--;
          self.renderCurrentIdiom();
        });
      }

      var nextBtn = this.container.querySelector('#finnish-next-btn');
      if (nextBtn && hasNext) {
        nextBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          e.preventDefault();
          self.currentViewIndex++;
          self.renderCurrentIdiom();
        });
      }

      var todayBtn = this.container.querySelector('#finnish-today-btn');
      if (todayBtn) {
        todayBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          e.preventDefault();
          self.currentViewIndex = self.seenList.length - 1;
          self.renderCurrentIdiom();
        });
      }
    },

    drawLoading: function() {
      var html = '<div style="display:flex; flex-direction:column; height:100%; justify-content:space-between; padding: 10px 0;">' +
                 '  <div class="trmnl-card" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 32px; margin-bottom: 16px;">' +
                 '    <div style="font-family: var(--font-sans); font-size: 18px; font-weight:700;">Loading Finnish Idioms...</div>' +
                 '  </div>' +
                 '  <div class="trmnl-footer-bar">' +
                 '    <div class="trmnl-footer-badge">' +
                 '      <span>Finnish Idiom</span>' +
                 '    </div>' +
                 '    <div class="trmnl-footer-meta">LATATAAN...</div>' +
                 '  </div>' +
                 '</div>';
      this.container.innerHTML = html;
    },

    drawError: function() {
      var html = '<div style="display:flex; flex-direction:column; height:100%; justify-content:space-between; padding: 10px 0;">' +
                 '  <div class="trmnl-card" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 32px; margin-bottom: 16px;">' +
                 '    <svg style="width:48px; height:48px; stroke:var(--text-color); stroke-width:2; fill:none; margin-bottom:16px;" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>' +
                 '    <div style="font-family: var(--font-sans); font-size: 18px; font-weight:700;">Failed to load Finnish idioms</div>' +
                 '    <div style="font-family: var(--font-mono); font-size: 12px; opacity:0.6; margin-top:8px;">Check network connection</div>' +
                 '  </div>' +
                 '  <div class="trmnl-footer-bar">' +
                 '    <div class="trmnl-footer-badge">' +
                 '      <span>Finnish Idiom</span>' +
                 '    </div>' +
                 '    <div class="trmnl-footer-meta">VIRHE / ERROR</div>' +
                 '  </div>' +
                 '</div>';
      this.container.innerHTML = html;
    }
  };

  // Register plugin
  window.Plugins = window.Plugins || {};
  window.Plugins.finnish = FinnishPlugin;

})();
