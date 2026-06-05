/**
 * Time & Date Plugin for TRMNL Dashboard
 * Renders a large, elegant clock, the full date, a mini-calendar of the current month,
 * and year progress metrics. Designed for iPad Mini 2 screen sizes.
 */

(function() {
  'use strict';

  var TimePlugin = {
    id: 'time',
    name: 'Time',
    config: {},
    container: null,

    init: function(pluginConfig) {
      this.config = pluginConfig || {};
    },

    render: function(element) {
      this.container = element;
      this.renderTime();
    },

    update: function() {
      this.renderTime();
    },

    renderTime: function() {
      if (!this.container) return;

      var now = new Date();
      var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      
      var dayName = days[now.getDay()];
      var monthName = months[now.getMonth()];
      var dateNum = now.getDate();
      var year = now.getFullYear();

      // Hours, minutes, and AM/PM
      var hours = now.getHours();
      var minutes = now.getMinutes();
      var ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 should be 12
      var timeStr = hours.toString().padStart(2, '0') + ':' + minutes.toString().padStart(2, '0');

      // Year progress calculation
      var start = new Date(year, 0, 1);
      var diff = now - start;
      var oneDay = 1000 * 60 * 60 * 24;
      var dayOfYear = Math.floor(diff / oneDay) + 1;
      var isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
      var totalDays = isLeap ? 366 : 365;
      var progress = ((dayOfYear / totalDays) * 100).toFixed(1);

      // Week number calculation
      var pastDays = (now - start) / 86400000;
      var weekNum = Math.ceil((pastDays + start.getDay() + 1) / 7);

      // Generate Calendar HTML
      var firstDay = new Date(year, now.getMonth(), 1).getDay();
      var daysInMonth = new Date(year, now.getMonth() + 1, 0).getDate();
      var prevMonthDays = new Date(year, now.getMonth(), 0).getDate();
      
      var calHtml = '';
      calHtml += '<div style="display:grid; grid-template-columns: repeat(7, 1fr); gap: 4px; text-align: center; font-family: var(--font-mono); font-size: 13px;">';
      
      // Calendar Headers
      var headers = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      headers.forEach(function(h) {
        calHtml += '<div style="font-weight: 800; border-bottom: var(--border-width-thin) solid var(--border-color); padding-bottom: 4px; opacity:0.8;">' + h + '</div>';
      });

      // Calendar Days
      var dayCounter = 1;
      var totalCells = 42; // 6 rows * 7 columns
      for (var i = 0; i < totalCells; i++) {
        if (i < firstDay) {
          // Empty cell or previous month days muted
          var prevDay = prevMonthDays - (firstDay - 1 - i);
          calHtml += '<div style="opacity: 0.25; padding: 6px 0;">' + prevDay + '</div>';
        } else if (dayCounter <= daysInMonth) {
          var isToday = (dayCounter === dateNum);
          var cellStyle = '';
          if (isToday) {
            cellStyle = 'background-color: var(--text-color); color: var(--bg-color); font-weight: 800; border-radius: 4px;';
          }
          calHtml += '<div style="padding: 6px 0; ' + cellStyle + '">' + dayCounter + '</div>';
          dayCounter++;
        } else {
          // Next month days muted
          var nextDay = dayCounter - daysInMonth;
          calHtml += '<div style="opacity: 0.25; padding: 6px 0;">' + nextDay + '</div>';
          dayCounter++;
        }
      }
      calHtml += '</div>';

      // Year Progress Bar Draw (halftone dither representation)
      var barBlocks = Math.round(progress / 5); // 20 blocks total
      var progressBarHtml = '<div style="display:flex; border: var(--border-width-thin) solid var(--border-color); height: 16px; border-radius: 4px; overflow: hidden; background-color: var(--bg-color); margin-top: 8px;">';
      for (var b = 0; b < 20; b++) {
        if (b < barBlocks) {
          progressBarHtml += '<div style="flex:1; background-color: var(--text-color); border-right: 0.5px solid var(--card-bg);"></div>';
        } else {
          progressBarHtml += '<div style="flex:1; background-color: transparent;"></div>';
        }
      }
      progressBarHtml += '</div>';

      // Assemble Main HTML in pixel art landscape layout
      var html = '<div class="trmnl-card time-pixel-card">';
      html += '  <div class="time-pixel-header">';
      html += '    <div>' + dayName.toUpperCase() + '</div>';
      html += '    <div>' + monthName.toUpperCase() + ' ' + dateNum + ', ' + year + '</div>';
      html += '  </div>';
      html += '  <div class="time-pixel-clock">' + timeStr + '</div>';
      html += '  <img src="pixel_art_landscape.png" class="time-pixel-landscape" alt="Pixel art mountain landscape">';
      html += '  <!-- Invisible footer bar for quick switcher activation -->';
      html += '  <div class="trmnl-footer-bar" style="position: absolute; bottom: 0; left: 0; right: 0; height: 60px; background: transparent; border: none; opacity: 0; z-index: 15; cursor: pointer;"></div>';
      html += '</div>';

      this.container.innerHTML = html;
    }
  };

  // Register plugin
  window.Plugins = window.Plugins || {};
  window.Plugins.time = TimePlugin;

})();
