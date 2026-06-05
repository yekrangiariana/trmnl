/**
 * Random Wikipedia Article Plugin for TRMNL Dashboard
 * Fetches a random article summary from Wikipedia API and renders it in e-paper style.
 */

(function() {
  'use strict';

  var WikiRandomPlugin = {
    id: 'wikirandom',
    name: 'Wiki Random',
    config: {},
    container: null,

    init: function(pluginConfig) {
      this.config = pluginConfig || {};
    },

    render: function(element) {
      this.container = element;
      this.fetchRandomArticle();
    },

    update: function() {
      this.fetchRandomArticle();
    },

    fetchRandomArticle: function() {
      if (!this.container) return;

      var self = this;
      
      if (navigator.onLine) {
        var url = "https://en.wikipedia.org/api/rest_v1/page/random/summary";
        
        fetch(url)
          .then(function(res) {
            if (!res.ok) throw new Error("Wiki random fetch failed");
            return res.json();
          })
          .then(function(data) {
            self.drawArticle(data);
          })
          .catch(function(err) {
            console.error("Wikipedia random fetch failed:", err);
            self.drawError();
          });
      } else {
        self.drawOffline();
      }
    },

    drawArticle: function(data) {
      var title = data.title || "Wikipedia Article";
      var description = data.description ? data.description.trim() : "";
      var extract = data.extract ? data.extract.trim() : "No summary available.";
      
      // Limit extract character count to fit inside standard height
      if (extract.length > 420) {
        extract = extract.substring(0, 410) + "...";
      }

      var imageHtml = '';
      if (data.thumbnail && data.thumbnail.source) {
        // Grayscale filter with e-ink grain overlay and no borders
        imageHtml = '    <div style="flex: 0.9; display: flex; align-items: center; justify-content: center; overflow: hidden; height: 350px; background-color: #ffffff; position: relative;">' +
                    '      <img src="' + data.thumbnail.source + '" alt="Article image" style="width: 100%; height: 100%; object-fit: cover; filter: grayscale(1) contrast(1.4) brightness(0.9); image-rendering: pixelated;">' +
                    '      <div class="trmnl-dither" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0.45; pointer-events: none; mix-blend-mode: multiply;"></div>' +
                    '    </div>';
      }

      var html = '<div style="display:flex; flex-direction:column; height:100%; justify-content:space-between; padding: 10px 0;">';
      
      // Main Content Split Layout
      html += '  <div class="trmnl-card" style="flex:1; display:flex; flex-direction:row; padding: 32px 36px; margin-bottom: 16px; overflow: hidden; align-items: center; min-height: 480px;">';
      
      // Left side: Text content
      var marginStyle = imageHtml ? 'margin-right: 24px;' : '';
      html += '    <div style="flex: 1.1; display: flex; flex-direction: column; justify-content: center; height: 100%; ' + marginStyle + '">';
      html += '      <div class="text-serif" style="font-size: 42px; font-weight: 600; line-height: 1.15; margin-bottom: 6px; color: var(--text-color);">' + title + '</div>';
      
      if (description) {
        html += '      <div style="font-family: var(--font-mono); font-size: 13px; font-weight: 700; text-transform: uppercase; opacity: 0.65; letter-spacing: 0.05em; margin-bottom: 20px;">' + description + '</div>';
      } else {
        html += '      <div style="margin-bottom: 20px;"></div>';
      }

      html += '      <div style="font-family: var(--font-sans); font-size: 18px; line-height: 1.5; opacity: 0.85;">' + extract + '</div>';
      
      // Next Article button
      html += '      <div style="margin-top: 28px;">';
      html += '        <button id="wiki-random-next-btn" class="trmnl-btn" style="font-size: 13px; padding: 8px 20px;">Next Article &rarr;</button>';
      html += '      </div>';
      
      html += '    </div>';

      // Right side: Image (if exists)
      if (imageHtml) {
        html += imageHtml;
      }

      html += '  </div>';

      // Dithered Footer Bar
      html += '  <div class="trmnl-footer-bar">';
      html += '    <div class="trmnl-footer-badge">';
      // Wikipedia Logo SVG
      html += '      <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"></path></svg>';
      html += '      <span>Wiki Random</span>';
      html += '    </div>';
      html += '    <div class="trmnl-footer-meta">RANDOM ARTICLE KNOWLEDGE</div>';
      html += '  </div>';

      html += '</div>';

      this.container.innerHTML = html;

      // Bind Next Article button — stop propagation so dashboard doesn't cycle pages
      var self = this;
      var nextBtn = this.container.querySelector('#wiki-random-next-btn');
      if (nextBtn) {
        nextBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          e.preventDefault();
          nextBtn.textContent = 'Loading...';
          nextBtn.disabled = true;
          self.fetchRandomArticle();
        });
      }
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
                 '      <span>Wiki Random</span>' +
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
                 '      <span>Wiki Random</span>' +
                 '    </div>' +
                 '    <div class="trmnl-footer-meta">OFFLINE</div>' +
                 '  </div>' +
                 '</div>';
      this.container.innerHTML = html;
    }
  };

  // Register plugin
  window.Plugins = window.Plugins || {};
  window.Plugins.wikirandom = WikiRandomPlugin;

})();
