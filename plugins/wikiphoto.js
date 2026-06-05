/**
 * Wikimedia Commons Picture of the Day Plugin for TRMNL Dashboard
 * Fetches the daily featured picture of the day and its description from MediaWiki API.
 */

(function() {
  'use strict';

  var WikiPhotoPlugin = {
    id: 'wikiphoto',
    name: 'Wiki Photo',
    config: {},
    container: null,

    init: function(pluginConfig) {
      this.config = pluginConfig || {};
    },

    render: function(element) {
      this.container = element;
      this.fetchPhotoOfTheDay();
    },

    update: function() {
      this.fetchPhotoOfTheDay();
    },

    fetchPhotoOfTheDay: function() {
      if (!this.container) return;

      var self = this;
      
      if (navigator.onLine) {
        // Get today's date formatted as YYYY-MM-DD
        var now = new Date();
        var yyyy = now.getFullYear();
        var mm = String(now.getMonth() + 1).padStart(2, '0');
        var dd = String(now.getDate()).padStart(2, '0');
        var dateStr = yyyy + "-" + mm + "-" + dd;

        // Step 1: Query template page for today's POTD filename
        var listUrl = "https://commons.wikimedia.org/w/api.php?action=query&titles=Template:Potd/" + dateStr + "&prop=images&format=json&origin=*";
        
        fetch(listUrl)
          .then(function(res) {
            if (!res.ok) throw new Error("Template image fetch failed");
            return res.json();
          })
          .then(function(data) {
            var pages = data.query.pages;
            var pageId = Object.keys(pages)[0];
            var images = pages[pageId].images;
            if (images && images.length > 0) {
              var filename = images[0].title;
              
              // Step 2: Query file URL and extmetadata description/artist
              var infoUrl = "https://commons.wikimedia.org/w/api.php?action=query&titles=" + encodeURIComponent(filename) + "&prop=imageinfo&iiprop=url|extmetadata&format=json&origin=*";
              return fetch(infoUrl)
                .then(function(res2) {
                  if (!res2.ok) throw new Error("Image info fetch failed");
                  return res2.json();
                })
                .then(function(infoData) {
                  var pages2 = infoData.query.pages;
                  var pageId2 = Object.keys(pages2)[0];
                  var imgInfo = pages2[pageId2].imageinfo[0];
                  
                  self.drawPhoto(imgInfo);
                });
            } else {
              throw new Error("No picture template for today");
            }
          })
          .catch(function(err) {
            console.error("Wikipedia POTD fetch failed:", err);
            self.drawError();
          });
      } else {
        self.drawOffline();
      }
    },

    drawPhoto: function(imgInfo) {
      var url = imgInfo.url;
      var metadata = imgInfo.extmetadata || {};
      
      var description = "Wikimedia Commons Picture of the Day";
      if (metadata.ImageDescription && metadata.ImageDescription.value) {
        // Strip HTML tags from description
        var div = document.createElement("div");
        div.innerHTML = metadata.ImageDescription.value;
        description = div.textContent || div.innerText || description;
      }
      
      var artist = "Unknown Artist";
      if (metadata.Artist && metadata.Artist.value) {
        var div2 = document.createElement("div");
        div2.innerHTML = metadata.Artist.value;
        artist = div2.textContent || div2.innerText || artist;
      }

      // Clean up description if it's too long
      if (description.length > 180) {
        description = description.substring(0, 175) + "...";
      }

      var html = '<div style="display:flex; flex-direction:column; height:100%; justify-content:space-between; padding: 10px 0;">';
      
      // Main Card Content (Full Height Image with details footer inside)
      html += '  <div class="trmnl-card" style="flex:1; display:flex; flex-direction:column; padding: 20px; margin-bottom: 16px; align-items: center; justify-content: space-between; min-height: 480px; overflow: hidden;">';
      
      // Grayscale styled POTD frame with no borders and e-ink grain overlay
      html += '    <div style="flex: 1; width: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; background-color: #ffffff; margin-bottom: 12px; max-height: 350px; position: relative;">';
      html += '      <img src="' + url + '" alt="POTD" style="width: 100%; height: 100%; object-fit: contain; filter: grayscale(1) contrast(1.4) brightness(0.9); image-rendering: pixelated;">';
      html += '      <div class="trmnl-dither" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0.45; pointer-events: none; mix-blend-mode: multiply;"></div>';
      html += '    </div>';

      // Captions
      html += '    <div style="width: 100%; display: flex; flex-direction: column; text-align: center; justify-content: center;">';
      html += '      <div class="text-serif" style="font-size: 16px; font-weight: 600; line-height: 1.35; margin-bottom: 4px; color: var(--text-color);">' + description + '</div>';
      html += '      <div style="font-family: var(--font-mono); font-size: 11px; opacity: 0.65; font-weight: 700; text-transform: uppercase;">By ' + artist + '</div>';
      html += '    </div>';

      html += '  </div>';

      // Dithered Footer Bar
      html += '  <div class="trmnl-footer-bar">';
      html += '    <div class="trmnl-footer-badge">';
      // Camera SVG Icon
      html += '      <svg viewBox="0 0 24 24"><path d="M4 4h3l2-2h6l2 2h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"></path><circle cx="12" cy="13" r="4"></circle></svg>';
      html += '      <span>Picture of the Day</span>';
      html += '    </div>';
      html += '    <div class="trmnl-footer-meta">COMMONS.WIKIMEDIA.ORG</div>';
      html += '  </div>';

      html += '</div>';

      this.container.innerHTML = html;
    },

    drawError: function() {
      var html = '<div style="display:flex; flex-direction:column; height:100%; justify-content:space-between; padding: 10px 0;">' +
                 '  <div class="trmnl-card" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 32px; margin-bottom: 16px;">' +
                 '    <svg style="width:48px; height:48px; stroke:var(--text-color); stroke-width:2; fill:none; margin-bottom:16px;" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>' +
                 '    <div style="font-family: var(--font-sans); font-size: 18px; font-weight:700;">Failed to load Picture of the Day</div>' +
                 '    <div style="font-family: var(--font-mono); font-size: 12px; opacity:0.6; margin-top:8px;">Check network connection</div>' +
                 '  </div>' +
                 '  <div class="trmnl-footer-bar">' +
                 '    <div class="trmnl-footer-badge">' +
                 '      <span>Picture of the Day</span>' +
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
                 '    <div style="font-family: var(--font-mono); font-size: 12px; opacity:0.6; margin-top:8px;">Wikimedia POTD requires active network</div>' +
                 '  </div>' +
                 '  <div class="trmnl-footer-bar">' +
                 '    <div class="trmnl-footer-badge">' +
                 '      <span>Picture of the Day</span>' +
                 '    </div>' +
                 '    <div class="trmnl-footer-meta">OFFLINE</div>' +
                 '  </div>' +
                 '</div>';
      this.container.innerHTML = html;
    }
  };

  // Register plugin
  window.Plugins = window.Plugins || {};
  window.Plugins.wikiphoto = WikiPhotoPlugin;

})();
