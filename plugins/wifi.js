/**
 * Guest Wi-Fi & Website QR Plugin for TRMNL Dashboard
 * Renders two side-by-side cards (Free Wi-Fi and Visit my website) on a dithered background.
 * Supports custom image file uploads for both QR slots.
 */

(function() {
  'use strict';

  var WifiPlugin = {
    id: 'wifi',
    name: 'Guest Wifi',
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

      var wifiHtml = '';
      if (this.config.wifiQrBase64) {
        wifiHtml = '<div style="background-color: #ffffff; border: 1.5px solid var(--border-color); padding: 8px; line-height: 0; display: inline-block; border-radius: 4px;">' +
                   '  <img src="' + this.config.wifiQrBase64 + '" alt="WiFi QR" style="width: 220px; height: 220px; image-rendering: pixelated;">' +
                   '</div>';
      } else {
        wifiHtml = '<div style="width: 220px; height: 220px; border: 2.5px dashed var(--border-color); border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box; background-color: var(--card-bg);">' +
                   '  <svg style="width: 48px; height: 48px; fill: var(--text-color); margin-bottom: 12px;" viewBox="0 0 24 24">' +
                   '    <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13 1v2h2v-2h-2zm-2-2h2v2h-2v-2zm4 4h2v2h-2v-2zm-2 2h2v-2h-2v2zm4-2v-2h-2v2h2zm-4-6h2v2h-2v-2zm2 2h2v2h-2v-2zm-6-2h2v2h-2v-2zm2-2h2v2h-2v-2zm-2 4h2v2h-2v-2z"/>' +
                   '  </svg>' +
                   '  <div style="font-family: var(--font-mono); font-size: 11px; font-weight: 700; line-height: 1.3; color: var(--text-color); text-transform: uppercase; letter-spacing: 0.05em;">No WiFi QR</div>' +
                   '  <div style="font-family: var(--font-sans); font-size: 10px; color: var(--text-color); opacity: 0.6; margin-top: 6px; line-height: 1.3;">Upload image in Settings</div>' +
                   '</div>';
      }

      var websiteHtml = '';
      if (this.config.websiteQrBase64) {
        websiteHtml = '<div style="background-color: #ffffff; border: 1.5px solid var(--border-color); padding: 8px; line-height: 0; display: inline-block; border-radius: 4px;">' +
                      '  <img src="' + this.config.websiteQrBase64 + '" alt="Website QR" style="width: 220px; height: 220px; image-rendering: pixelated;">' +
                      '</div>';
      } else {
        websiteHtml = '<div style="width: 220px; height: 220px; border: 2.5px dashed var(--border-color); border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box; background-color: var(--card-bg);">' +
                      '  <svg style="width: 48px; height: 48px; fill: var(--text-color); margin-bottom: 12px;" viewBox="0 0 24 24">' +
                      '    <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>' +
                      '  </svg>' +
                      '  <div style="font-family: var(--font-mono); font-size: 11px; font-weight: 700; line-height: 1.3; color: var(--text-color); text-transform: uppercase; letter-spacing: 0.05em;">No Website QR</div>' +
                      '  <div style="font-family: var(--font-sans); font-size: 10px; color: var(--text-color); opacity: 0.6; margin-top: 6px; line-height: 1.3;">Upload image in Settings</div>' +
                      '</div>';
      }

      // Render the side-by-side cards on a full dithered background
      var html = '<div class="trmnl-dither" style="width: 100%; height: 560px; display: flex; align-items: center; justify-content: center; gap: 48px; border: var(--border-width) solid var(--border-color); border-radius: 12px; box-sizing: border-box; padding: 24px;">';

      // Left Card: Free Wi-Fi
      html += '  <div style="background-color: var(--card-bg); border: var(--border-width) solid var(--border-color); border-radius: 12px; padding: 32px; width: 360px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: none;">';
      html += '    <div style="font-family: var(--font-sans); font-size: 26px; font-weight: 700; margin-bottom: 24px; color: var(--text-color);">Free Wi-Fi</div>';
      html += wifiHtml;
      html += '  </div>';

      // Right Card: Visit my website
      html += '  <div style="background-color: var(--card-bg); border: var(--border-width) solid var(--border-color); border-radius: 12px; padding: 32px; width: 360px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: none;">';
      html += '    <div style="font-family: var(--font-sans); font-size: 26px; font-weight: 700; margin-bottom: 24px; color: var(--text-color);">Visit my website</div>';
      html += websiteHtml;
      html += '  </div>';

      html += '</div>';

      this.container.innerHTML = html;
    }
  };

  // Register plugin
  window.Plugins = window.Plugins || {};
  window.Plugins.wifi = WifiPlugin;

})();
