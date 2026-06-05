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

      // Assemble Main HTML
      var html = '<div style="display:flex; flex-direction:column; height:100%; justify-content:space-between; padding: 10px 0;">';
      html += '  <div class="grid-row" style="flex:1; margin-bottom: 16px;">';

      // Left Column - Clock Card (takes col-3)
      html += '    <div class="grid-col col-3 trmnl-card" style="padding: 32px 40px; justify-content: center; align-items: flex-start; gap: 0;">';
      html += '      <div style="display:flex; align-items: flex-end; margin-bottom: 10px;">';
      html += '        <div style="font-family: var(--font-sans); font-size: 130px; font-weight: 800; letter-spacing: -0.05em; line-height: 0.95; color: var(--text-color);">' + timeStr + '</div>';
      html += '        <div style="font-family: var(--font-mono); font-size: 20px; font-weight: 700; margin-left: 12px; margin-bottom: 12px; border: var(--border-width-thin) solid var(--border-color); padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">' + ampm + '</div>';
      html += '      </div>';
      html += '      <div style="font-family: var(--font-serif); font-size: 34px; font-style: italic; font-weight: 500; color: var(--text-color); opacity: 0.95; margin-bottom: 4px;">' + dayName + ',</div>';
      html += '      <div style="font-family: var(--font-sans); font-size: 28px; font-weight: 700; color: var(--text-color); text-transform: uppercase; letter-spacing: 0.02em;">' + monthName + ' ' + dateNum + ', ' + year + '</div>';
      html += '    </div>';

      // Right Column - Calendar Card (takes col-2)
      html += '    <div class="grid-col col-2 trmnl-card" style="padding: 24px 28px; justify-content: space-between; gap: 0;">';
      html += '      <div>';
      html += '        <div style="font-family: var(--font-sans); font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: var(--border-width-thin) solid var(--border-color); padding-bottom: 8px; margin-bottom: 12px;">' + monthName.toUpperCase() + ' ' + year + '</div>';
      html += '        ' + calHtml;
      html += '      </div>';
      html += '      <div style="border-top: var(--border-width-thin) dotted var(--border-color); padding-top: 14px; margin-top: 12px;">';
      html += '        <div style="display:flex; justify-content:space-between; font-family: var(--font-mono); font-size: 11px; font-weight: 700; text-transform: uppercase; opacity: 0.8;">';
      html += '          <span>Week ' + weekNum + '</span>';
      html += '          <span>Day ' + dayOfYear + ' of ' + totalDays + '</span>';
      html += '        </div>';
      html += '        ' + progressBarHtml;
      html += '        <div style="text-align: right; font-family: var(--font-mono); font-size: 10px; font-weight: 700; margin-top: 4px; opacity: 0.6;">YEAR PROGRESS: ' + progress + '%</div>';
      html += '      </div>';
      html += '    </div>';

      html += '  </div>';

      // Footer bar
      html += '  <div class="trmnl-footer-bar">';
      html += '    <div class="trmnl-footer-badge">';
      html += '      <svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:none;stroke:var(--text-color);stroke-width:2.5;vertical-align:middle;flex-shrink:0;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>';
      html += '      <span>Time &amp; Date</span>';
      html += '    </div>';
      html += '    <div class="trmnl-footer-meta">TODAY &amp; CALENDAR</div>';
      html += '  </div>';
      html += '</div>';

      this.container.innerHTML = html;
    }
  };

  // Register plugin
  window.Plugins = window.Plugins || {};
  window.Plugins.time = TimePlugin;

})();
