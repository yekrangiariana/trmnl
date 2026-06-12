/**
 * Guest Wi-Fi & Website QR Plugin for BRIEF Dashboard
 * Renders two side-by-side cards (Free Wi-Fi and Visit my website) on a dithered background.
 * Supports custom image file uploads for both QR slots.
 */

(function() {
  'use strict';

  var WifiPlugin = {
    id: 'guest_wifi',
    name: 'Guest Wi-Fi',
    config: {},
    container: null,

    init: function(pluginConfig) {
      this.config = pluginConfig || {};
    },

    render: function(element) {
      this.container = element;
      this.renderWifi();
    },

    update: function() {
      // Re-load settings in case custom base64 images or details were changed
      var activeConfig = window.Dashboard ? window.Dashboard.getActiveConfig() : {};
      this.config = Object.assign({}, this.config, activeConfig);
      this.renderWifi();
    },

    renderWifi: function() {
      if (!this.container) return;

      var qrSize = '290px';
      var wifiHtml = '';
      if (this.config.wifiQrBase64) {
        wifiHtml = '<div style="background-color: var(--card-bg); border: var(--border-width-thin) solid var(--border-color); padding: 10px; line-height: 0; display: inline-block; border-radius: 6px;">' +
                   '  <img src="' + this.config.wifiQrBase64 + '" alt="WiFi QR" style="width: ' + qrSize + '; height: ' + qrSize + '; image-rendering: pixelated;">' +
                   '</div>';
      } else {
        wifiHtml = '<div style="width: ' + qrSize + '; height: ' + qrSize + '; border: var(--border-width) dashed var(--border-color); border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; box-sizing: border-box; background-color: var(--card-bg);">' +
                   '  <svg style="width: 64px; height: 64px; fill: var(--text-color); margin-bottom: 16px;" viewBox="0 0 24 24">' +
                   '    <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13 1v2h2v-2h-2zm-2-2h2v2h-2v-2zm4 4h2v2h-2v-2zm-2 2h2v-2h-2v2zm4-2v-2h-2v2h2zm-4-6h2v2h-2v-2zm2 2h2v2h-2v-2zm-6-2h2v2h-2v-2zm2-2h2v2h-2v-2zm-2 4h2v2h-2v-2z"/>' +
                   '  </svg>' +
                   '  <div style="font-family: var(--font-mono); font-size: 13px; font-weight: 700; line-height: 1.3; color: var(--text-color); text-transform: uppercase; letter-spacing: 0.05em;">No WiFi QR</div>' +
                   '  <div style="font-family: var(--font-sans); font-size: 12px; color: var(--text-color); opacity: 0.6; margin-top: 8px; line-height: 1.3;">Upload image in Settings</div>' +
                   '</div>';
      }

      var html = '<div style="display:flex; flex-direction:column; height:100%; justify-content:space-between; padding: 10px 0;">';

      // Single centered card on dithered background
      html += '  <div class="trmnl-dither" style="flex:1; display: flex; align-items: center; justify-content: center; border: var(--border-width) solid var(--border-color); border-radius: 12px; box-sizing: border-box; padding: 24px; margin-bottom: 16px;">';
      html += '    <div style="background-color: var(--card-bg); border: var(--border-width) solid var(--border-color); border-radius: 12px; padding: 40px 52px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">';
      html += '      <div style="font-family: var(--font-sans); font-size: 30px; font-weight: 700; margin-bottom: 28px; color: var(--text-color); letter-spacing: 0.01em;">Guest Wi-Fi</div>';
      html += '      ' + wifiHtml;
      html += '    </div>';
      html += '  </div>';

      // Footer bar
      html += '  <div class="trmnl-footer-bar">';
      html += '    <div class="trmnl-footer-badge">';
      html += '      <svg viewBox="0 0 24 24"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>';
      html += '      <span>Guest Wi-Fi</span>';
      html += '    </div>';
      html += '    <div class="trmnl-footer-meta">SCAN QR TO CONNECT</div>';
      html += '  </div>';

      html += '</div>';

      this.container.innerHTML = html;
    }
  };

  // Register plugin
  window.Plugins = window.Plugins || {};
  window.Plugins.guest_wifi = WifiPlugin;

})();
