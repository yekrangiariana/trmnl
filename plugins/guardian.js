/**
 * The Guardian World News Headlines Plugin for TRMNL Dashboard
 * Fetches and formats 7 headlines vertically with dither bullets and brief subtitles.
 */

(function() {
  'use strict';

  var GuardianPlugin = {
    id: 'guardian',
    name: 'The Guardian',
    config: {},
    container: null,

    init: function(pluginConfig) {
      this.config = pluginConfig || {};
    },

    render: function(element) {
      this.container = element;
      this.container.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100%;font-family:var(--font-mono);font-size:16px;">RETRIEVING GUARDIAN HEADLINES...</div>';
    },

    update: function() {
      var self = this;
      var feedUrl = "https://www.theguardian.com/world/rss";
      var url = "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(feedUrl);

      fetch(url)
        .then(function(response) {
          if (!response.ok) throw new Error("HTTP error " + response.status);
          return response.json();
        })
        .then(function(data) {
          if (data.status === 'ok') {
            self.renderHeadlines(data.items || []);
          } else {
            throw new Error("RSS load error");
          }
        })
        .catch(function(err) {
          console.error("Guardian news fetch failed:", err);
          self.renderError();
        });
    },

    formatTimeAgo: function(dateStr) {
      try {
        var pubDate = new Date(dateStr.replace(/-/g, "/"));
        if (isNaN(pubDate.getTime())) {
          pubDate = new Date(dateStr);
        }
        var now = new Date();
        var diffMs = now.getTime() - pubDate.getTime();
        var diffMins = Math.floor(diffMs / (1000 * 60));
        var diffHours = Math.floor(diffMs / (1000 * 60 * 60));

        if (diffMins < 60) {
          return (diffMins <= 1 ? 1 : diffMins) + "m ago";
        } else if (diffHours < 24) {
          return diffHours + "h ago";
        } else {
          var days = Math.floor(diffHours / 24);
          return days + "d ago";
        }
      } catch (e) {
        return "";
      }
    },

    renderHeadlines: function(items) {
      if (items.length === 0) {
        this.container.innerHTML = 
          '<div class="trmnl-card" style="height:100%; justify-content:center; align-items:center;">' +
          '  <div style="font-family: var(--font-mono); font-size: 16px; font-weight:700;">NO ARTICLES FOUND</div>' +
          '</div>';
        return;
      }

      // Display exactly 8 headlines vertically
      var displayItems = items.slice(0, 8);

      var html = '<div style="display:flex; flex-direction:column; height:100%; justify-content:space-between; padding: 4px 0 0 0;">';

      // Headlines List (flex column containing exactly 7 rows)
      html += '  <div style="display:flex; flex-direction:column; justify-content:space-between; flex:1; margin-bottom: 16px;">';

      displayItems.forEach(function(item) {
        var title = item.title || "";
        var desc = item.description || item.content || "";
        desc = desc.replace(/<[^>]*>/g, ""); // strip HTML
        
        // Truncate description to fit single line if too long
        if (desc.length > 130) {
          desc = desc.substring(0, 130) + "...";
        }

        var timeAgo = GuardianPlugin.formatTimeAgo(item.pubDate);

        html += '    <div class="news-item" style="display:flex; align-items: flex-start; margin-bottom: 10px;">';
        html += '      <span class="dither-bullet" style="height: 34px; width: 6px; margin-right: 12px; margin-top: 2px; flex-shrink: 0;"></span>';
        html += '      <div style="flex:1; display:flex; flex-direction:column;">';
        html += '        <div style="font-family: var(--font-sans); font-size: 17px; font-weight: 700; line-height: 1.2; margin-bottom: 3px; color: var(--text-color);">' + title + '</div>';
        html += '        <div style="font-family: var(--font-sans); font-size: 14px; line-height: 1.35; opacity: 0.8; color: var(--text-color);">' + desc + ' (' + timeAgo + ')</div>';
        html += '      </div>';
        html += '    </div>';
      });

      html += '  </div>';

      // Custom Dithered Footer Bar
      html += '  <div class="trmnl-footer-bar">';
      html += '    <div class="trmnl-footer-badge">';
      // Inline Newspaper SVG
      html += '      <svg viewBox="0 0 24 24"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path><path d="M18 14h-8M18 18h-8M16 6H10v4h6V6z"></path></svg>';
      html += '      <span>Guardian headlines</span>';
      html += '    </div>';
      html += '    <div class="trmnl-footer-meta">World Top Stories</div>';
      html += '  </div>';

      html += '</div>';

      this.container.innerHTML = html;
    },

    renderError: function() {
      this.container.innerHTML = 
        '<div class="trmnl-card" style="height:100%; justify-content:center; align-items:center; text-align:center;">' +
        '  <div style="font-size: 48px; margin-bottom: 16px;">📰</div>' +
        '  <div style="font-family: var(--font-mono); font-size: 16px; font-weight:700;">HEADLINES OFFLINE</div>' +
        '  <div style="font-family: var(--font-mono); font-size: 12px; margin-top: 8px; opacity: 0.6;">Could not fetch Guardian World RSS feed.</div>' +
        '</div>';
    }
  };

  // Register plugin
  window.Plugins = window.Plugins || {};
  window.Plugins.guardian = GuardianPlugin;

})();
