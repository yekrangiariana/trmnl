/**
 * Random Wikipedia Article Plugin for BRIEF Dashboard
 * Fetches a random article summary from Wikipedia API and renders it in e-paper style.
 * Includes a 20-article history navigation and pre-fetching to prevent layout flashes.
 */

(function() {
  'use strict';

  var WikiRandomPlugin = {
    id: 'random_wikipedia',
    name: 'Random Wikipedia',
    config: {},
    container: null,
    wasActive: false,
    preFetchedArticle: null,

    init: function(pluginConfig) {
      this.config = pluginConfig || {};
      this.wasActive = false;
      this.preFetchedArticle = null;
    },

    getHistory: function() {
      try {
        var saved = localStorage.getItem('brief_wiki_random_history');
        if (saved) {
          var parsed = JSON.parse(saved);
          if (parsed && Array.isArray(parsed.articles)) {
            return parsed;
          }
        }
      } catch (e) {
        console.warn("Failed to read wiki history:", e);
      }
      return { articles: [], currentIndex: -1, lastFetchTime: 0 };
    },

    saveHistory: function(historyObj) {
      try {
        localStorage.setItem('brief_wiki_random_history', JSON.stringify(historyObj));
      } catch (e) {
        console.warn("Failed to save wiki history:", e);
      }
    },

    render: function(element) {
      this.container = element;
      this.wasActive = this.container && this.container.classList.contains('active');

      var historyObj = this.getHistory();
      if (historyObj.articles.length === 0) {
        this.fetchRandomArticle(true);
      } else {
        this.drawArticle(historyObj.articles[historyObj.currentIndex]);
        this.preFetchNextArticle();
      }
    },

    update: function() {
      if (!this.container) return;

      var isActiveNow = this.container.classList.contains('active');
      var transitionedToActive = isActiveNow && !this.wasActive;
      this.wasActive = isActiveNow;

      if (transitionedToActive) {
        this.loadNextArticle();
      }
    },

    loadNextArticle: function() {
      var self = this;
      var historyObj = this.getHistory();
      
      // If we are currently browsing the history (not at the end), "Next" should just move forward in history
      if (historyObj.currentIndex < historyObj.articles.length - 1) {
        historyObj.currentIndex++;
        this.saveHistory(historyObj);
        this.drawArticle(historyObj.articles[historyObj.currentIndex]);
        return;
      }
      
      // Otherwise, we are at the end of history, so we want a new article!
      if (this.preFetchedArticle) {
        var newArticle = this.preFetchedArticle;
        this.preFetchedArticle = null; // consume it
        
        historyObj.articles.push(newArticle);
        if (historyObj.articles.length > 20) {
          historyObj.articles.shift();
        }
        historyObj.currentIndex = historyObj.articles.length - 1;
        historyObj.lastFetchTime = Date.now();
        this.saveHistory(historyObj);
        
        this.drawArticle(newArticle);
        this.preFetchNextArticle();
      } else {
        // Fetch live
        this.fetchRandomArticle(false);
      }
    },

    preFetchNextArticle: function() {
      var self = this;
      if (!navigator.onLine) return;
      if (this.preFetchedArticle) return; // already have one

      var url = "https://en.wikipedia.org/api/rest_v1/page/random/summary";
      fetch(url)
        .then(function(res) {
          if (res.ok) return res.json();
        })
        .then(function(data) {
          if (data) {
            self.preFetchedArticle = data;
          }
        })
        .catch(function(err) {
          console.warn("Failed to pre-fetch random article:", err);
        });
    },

    fetchRandomArticle: function(showLoading) {
      if (!this.container) return;

      var self = this;
      
      if (showLoading) {
        this.drawLoading();
      }

      if (navigator.onLine) {
        var url = "https://en.wikipedia.org/api/rest_v1/page/random/summary";
        
        fetch(url)
          .then(function(res) {
            if (!res.ok) throw new Error("Wiki random fetch failed");
            return res.json();
          })
          .then(function(data) {
            var historyObj = self.getHistory();
            historyObj.articles.push(data);
            if (historyObj.articles.length > 20) {
              historyObj.articles.shift();
            }
            historyObj.currentIndex = historyObj.articles.length - 1;
            historyObj.lastFetchTime = Date.now();
            self.saveHistory(historyObj);

            self.drawArticle(data);
            self.preFetchNextArticle();
          })
          .catch(function(err) {
            console.error("Wikipedia random fetch failed:", err);
            var historyObj = self.getHistory();
            if (historyObj.articles.length === 0) {
              self.drawError();
            } else {
              self.drawArticle(historyObj.articles[historyObj.currentIndex]);
            }
          });
      } else {
        var historyObj = self.getHistory();
        if (historyObj.articles.length === 0) {
          self.drawOffline();
        } else {
          self.drawArticle(historyObj.articles[historyObj.currentIndex]);
        }
      }
    },

    drawArticle: function(data) {
      if (!data) return;
      var title = data.title || "Wikipedia Article";
      var description = data.description ? data.description.trim() : "";
      var extract = data.extract ? data.extract.trim() : "No summary available.";
      var imageHtml = "";
      
      // Limit extract character count to fit inside standard height
      if (extract.length > 420) {
        extract = extract.substring(0, 410) + "...";
      }

      if (data.thumbnail && data.thumbnail.source) {
        imageHtml = '    <div style="flex: 0.9; display: flex; align-items: center; justify-content: center; overflow: hidden; height: 350px; background-color: var(--card-bg); position: relative;">' +
                    '      <img src="' + data.thumbnail.source + '" alt="Article image" style="width: 100%; height: 100%; object-fit: cover; filter: grayscale(1) contrast(1.4) brightness(0.9); image-rendering: pixelated;" decoding="async">' +
                    '      <div class="trmnl-dither" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0.45; pointer-events: none; mix-blend-mode: multiply;"></div>' +
                    '    </div>';
      }

      var html = '<div style="display:flex; flex-direction:column; height:100%; justify-content:space-between; padding: 10px 0;">';
      
      html += '  <div class="trmnl-card" style="flex:1; display:flex; flex-direction:row; padding: 32px 36px; margin-bottom: 16px; overflow: hidden; align-items: center; min-height: 480px;">';
      
      var marginStyle = imageHtml ? 'margin-right: 24px;' : '';
      html += '    <div style="flex: 1.1; display: flex; flex-direction: column; justify-content: center; height: 100%; ' + marginStyle + '">';
      html += '      <div class="text-serif" style="font-size: 42px; font-weight: 600; line-height: 1.15; margin-bottom: 6px; color: var(--text-color);">' + title + '</div>';
      
      if (description) {
        html += '      <div style="font-family: var(--font-mono); font-size: 13px; font-weight: 700; text-transform: uppercase; opacity: 0.65; letter-spacing: 0.05em; margin-bottom: 20px;">' + description + '</div>';
      } else {
        html += '      <div style="margin-bottom: 20px;"></div>';
      }

      html += '      <div style="font-family: var(--font-sans); font-size: 18px; line-height: 1.5; opacity: 0.85;">' + extract + '</div>';
      
      // Prev and Next Buttons
      var historyObj = this.getHistory();
      var isFirst = historyObj.currentIndex <= 0;
      var isLast = historyObj.currentIndex >= historyObj.articles.length - 1;
      var buttonText = isLast ? 'New Random' : 'Next';

      html += '      <div style="margin-top: 28px; display: flex;">';
      html += '        <button id="wiki-random-prev-btn" class="trmnl-btn secondary" style="font-size: 13px; padding: 8px 16px; margin-right: 12px;' + (isFirst ? ' opacity: 0.35; cursor: not-allowed;' : '') + '"' + (isFirst ? ' disabled' : '') + '>' + window.getIcon('arrow-left', 'margin-right: 6px;') + 'Prev</button>';
      html += '        <button id="wiki-random-next-btn" class="trmnl-btn" style="font-size: 13px; padding: 8px 20px;">' + buttonText + window.getIcon('arrow-right', 'margin-left: 6px;') + '</button>';
      html += '      </div>';
      
      html += '    </div>';

      if (imageHtml) {
        html += imageHtml;
      }

      html += '  </div>';

      html += '  <div class="trmnl-footer-bar">';
      html += '    <div class="trmnl-footer-badge">';
      html += '      <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="9"></line><line x1="9" y1="13" x2="15" y2="13"></line><line x1="9" y1="17" x2="11" y2="17"></line></svg>';
      html += '      <span>Random Wikipedia</span>';
      html += '    </div>';
      html += '    <div class="trmnl-footer-meta">RANDOM ARTICLE KNOWLEDGE</div>';
      html += '  </div>';

      html += '</div>';

      this.container.innerHTML = html;

      // Event Bindings
      var self = this;
      var prevBtn = this.container.querySelector('#wiki-random-prev-btn');
      if (prevBtn) {
        prevBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          e.preventDefault();
          var historyObj = self.getHistory();
          if (historyObj.currentIndex > 0) {
            historyObj.currentIndex--;
            self.saveHistory(historyObj);
            self.drawArticle(historyObj.articles[historyObj.currentIndex]);
          }
        });
      }

      var nextBtn = this.container.querySelector('#wiki-random-next-btn');
      if (nextBtn) {
        nextBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          e.preventDefault();
          nextBtn.innerHTML = window.getIcon('spinner', 'margin-right: 6px;') + 'Loading...';
          nextBtn.disabled = true;
          self.loadNextArticle();
        });
      }
    },

    drawLoading: function() {
      var html = '<div style="display:flex; flex-direction:column; height:100%; justify-content:space-between; padding: 10px 0;">' +
                 '  <div class="trmnl-card" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 32px; margin-bottom: 16px;">' +
                 '    <div style="font-family: var(--font-sans); font-size: 18px; font-weight:700;">Loading Wikipedia Article...</div>' +
                 '  </div>' +
                 '  <div class="trmnl-footer-bar">' +
                 '    <div class="trmnl-footer-badge">' +
                 '      <span>Random Wikipedia</span>' +
                 '    </div>' +
                 '    <div class="trmnl-footer-meta">RANDOM ARTICLE KNOWLEDGE</div>' +
                 '  </div>' +
                 '</div>';
      this.container.innerHTML = html;
    },

    drawError: function() {
      var html = '<div style="display:flex; flex-direction:column; height:100%; justify-content:space-between; padding: 10px 0;">' +
                 '  <div class="trmnl-card" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 32px; margin-bottom: 16px;">' +
                 '    <svg style="width:48px; height:48px; stroke:var(--text-color); stroke-width:2; fill:none; margin-bottom:16px;" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>' +
                 '    <div style="font-family: var(--font-sans); font-size: 18px; font-weight:700;">Failed to load random article</div>' +
                 '    <div style="font-family: var(--font-mono); font-size: 12px; opacity:0.6; margin-top:8px;">Check network connection</div>' +
                 '  </div>' +
                 '  <div class="trmnl-footer-bar">' +
                 '    <div class="trmnl-footer-badge">' +
                 '      <span>Random Wikipedia</span>' +
                 '    </div>' +
                 '    <div class="trmnl-footer-meta">CONNECTION TIMEOUT</div>' +
                 '  </div>' +
                 '</div>';
      this.container.innerHTML = html;
    },

    drawOffline: function() {
      var html = '<div style="display:flex; flex-direction:column; height:100%; justify-content:space-between; padding: 10px 0;">' +
                 '  <div class="trmnl-card" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 32px; margin-bottom: 16px;">' +
                 '    <svg style="width:48px; height:48px; stroke:var(--text-color); stroke-width:2; fill:none; margin-bottom:16px;" viewBox="0 0 24 24"><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.5M5 12.5a10.94 10.94 0 0 1 5.83-2.84M8.5 16.5a10.94 10.94 0 0 1 3.5-1.5M12 18.5a10.94 10.94 0 0 1 0-3.5M15.5 16.5a10.94 10.94 0 0 1-3.5-1.5"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>' +
                 '    <div style="font-family: var(--font-sans); font-size: 18px; font-weight:700;">Offline Mode</div>' +
                 '    <div style="font-family: var(--font-mono); font-size: 12px; opacity:0.6; margin-top:8px;">Wiki Random requires active network</div>' +
                 '  </div>' +
                 '  <div class="trmnl-footer-bar">' +
                 '    <div class="trmnl-footer-badge">' +
                 '      <span>Random Wikipedia</span>' +
                 '    </div>' +
                 '    <div class="trmnl-footer-meta">OFFLINE</div>' +
                 '  </div>' +
                 '</div>';
      this.container.innerHTML = html;
    }
  };

  // Register plugin
  window.Plugins = window.Plugins || {};
  window.Plugins.random_wikipedia = WikiRandomPlugin;

})();
