/**
 * Central SVG Icon Registry for TRMNL Dashboard
 * Replaces the large FontAwesome CDN CSS and font files.
 * Provides a simple method: window.getIcon(name, extraStyles, size)
 * Designed for iPad Mini 2 compatibility.
 */

(function() {
  'use strict';

  var icons = {
    'arrow-left': '<svg viewBox="0 0 24 24"><polyline points="12 19 5 12 12 5"></polyline><line x1="19" y1="12" x2="5" y2="12"></line></svg>',
    'arrow-right': '<svg viewBox="0 0 24 24"><polyline points="12 5 19 12 12 19"></polyline><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
    'sliders': '<svg viewBox="0 0 24 24"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="12" x2="23" y2="12"></line></svg>',
    'bus': '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="2"></rect><circle cx="7" cy="20" r="2"></circle><circle cx="17" cy="20" r="2"></circle><path d="M19 16v2a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-2"></path><path d="M5 8h14"></path><path d="M12 4v4"></path></svg>',
    'chart-line': '<svg viewBox="0 0 24 24"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>',
    'list-check': '<svg viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>',
    'clock-rotate-left': '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><polyline points="3 3 3 8 8 8"></polyline><line x1="12" y1="7" x2="12" y2="12"></line><line x1="12" y1="12" x2="16" y2="14"></line></svg>',
    'puzzle-piece': '<svg viewBox="0 0 24 24"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><polygon points="12 22.08 12 12 3 6.92 3 17.08 12 22.08"></polygon><polygon points="12 22.08 12 12 21 6.92 21 17.08 12 22.08"></polygon><polygon points="12 12 3 6.92 12 1.84 21 6.92 12 12"></polygon><line x1="12" y1="5.12" x2="20.1" y2="9.79"></line><line x1="12" y1="5.12" x2="3.9" y2="9.79"></line></svg>',
    'database': '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"></path></svg>',
    'download': '<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>',
    'upload': '<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>',
    'cloud-arrow-up': '<svg viewBox="0 0 24 24"><polyline points="16 16 12 12 8 16"></polyline><line x1="12" y1="12" x2="12" y2="21"></line><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path></svg>',
    'bed': '<svg viewBox="0 0 24 24"><path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"></path><circle cx="6" cy="12" r="2"></circle></svg>',
    'sun': '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path></svg>',
    'moon': '<svg viewBox="0 0 24 24"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>',
    'spinner': '<svg class="fa-spin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path></svg>'
  };

  window.getIcon = function(name, extraStyles, size) {
    var icon = icons[name] || '';
    if (!icon) return '';

    var widthHeight = 'width: 1.2em; height: 1.2em;';
    if (size) {
      widthHeight = 'width: ' + size + '; height: ' + size + ';';
    }

    var styleAttr = 'style="' + widthHeight + ' fill: none; stroke: currentColor; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; vertical-align: middle; flex-shrink: 0;';
    if (extraStyles) {
      styleAttr += ' ' + extraStyles;
    }
    styleAttr += '"';

    return icon.replace('<svg', '<svg ' + styleAttr);
  };

})();
