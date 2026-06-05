/**
 * "Your Life in Weeks" Plugin for TRMNL Dashboard
 * Calculates and visualizes life progress on a 90-year grid (52 weeks x 90 years = 4680 weeks)
 */

(function() {
  'use strict';

  var LifePlugin = {
    id: 'life',
    name: 'Your Life in Weeks',
    config: {},
    container: null,

    init: function(pluginConfig) {
      this.config = pluginConfig || {};
    },

    render: function(element) {
      this.container = element;
      this.renderLifeGrid();
    },

    update: function() {
      // Re-load settings in case birthdate was updated on-screen
      var activeConfig = window.Dashboard ? window.Dashboard.getActiveConfig() : {};
      this.config.birthdate = activeConfig.birthdate || '1995-04-12';
      this.renderLifeGrid();
    },

    renderLifeGrid: function() {
      if (!this.container) return;

      var dobStr = this.config.birthdate || '1995-04-12';
      var dob = new Date(dobStr);
      var now = new Date();

      // Safari 12 compatible date parsing safety
      if (isNaN(dob.getTime())) {
        dob = new Date(dobStr.replace(/-/g, '/'));
      }

      // 1. Calculate Life Weeks
      var weeksLived = 0;
      if (!isNaN(dob.getTime())) {
        var diffMs = now.getTime() - dob.getTime();
        var msInWeek = 1000 * 60 * 60 * 24 * 7;
        weeksLived = Math.floor(diffMs / msInWeek);
      }

      var totalLifeWeeks = 4680; // 90 years * 52 weeks
      if (weeksLived < 0) weeksLived = 0;
      if (weeksLived > totalLifeWeeks) weeksLived = totalLifeWeeks;
      var lifePercentage = ((weeksLived / totalLifeWeeks) * 100).toFixed(1);

      var formattedLifeLived = weeksLived.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      var formattedLifeTotal = totalLifeWeeks.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

      // 2. Calculate Year Weeks
      var startOfYear = new Date(now.getFullYear(), 0, 1);
      var diffYearMs = now - startOfYear;
      var currentWeekOfYear = Math.floor(diffYearMs / (1000 * 60 * 60 * 24 * 7)) + 1;
      if (currentWeekOfYear > 52) currentWeekOfYear = 52;
      var yearPercentage = ((currentWeekOfYear / 52) * 100).toFixed(0);

      // 3. Calculate Month Days
      var currentYear = now.getFullYear();
      var currentMonth = now.getMonth();
      var currentDayOfMonth = now.getDate();
      var totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      var firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun, 6 = Sat
      var monthPercentage = ((currentDayOfMonth / totalDaysInMonth) * 100).toFixed(0);

      var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      var currentMonthName = monthNames[currentMonth];

      var html = '<div style="display:flex; flex-direction:column; height:100%; justify-content:space-between; box-sizing:border-box;">';

      // SECTION 1: Life in Weeks (Top Card)
      html += '  <div class="trmnl-card" style="padding: 16px 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; margin-bottom: 12px; flex: 1.3;">';
      html += '    <div style="font-family: var(--font-sans); font-size: 15px; font-weight: 700; margin-bottom: 8px; color: var(--text-color); text-align: center; text-transform: uppercase; letter-spacing: 0.05em;">';
      html += '      Your Life in Weeks: Lived ' + formattedLifeLived + ' of ' + formattedLifeTotal + ' (' + lifePercentage + '%)';
      html += '    </div>';
      
      // Grid container for 90 columns x 52 rows
      html += '    <div style="display: flex; flex-direction: column; gap: 1px; width: 539px;">';
      for (var week = 0; week < 52; week++) {
        html += '      <div style="display: flex; gap: 1px;">';
        for (var year = 0; year < 90; year++) {
          var index = (year * 52) + week;
          var isLived = index < weeksLived;
          var bgColor = isLived ? 'var(--text-color)' : 'transparent';
          html += '        <div style="width: 5px; height: 5px; border: 1px solid var(--border-color); box-sizing: border-box; background-color: ' + bgColor + ';"></div>';
        }
        html += '      </div>';
      }
      html += '    </div>';
      html += '  </div>';

      // Row for SECTION 2 & SECTION 3 (Side-by-side cards)
      html += '  <div style="display: flex; gap: 12px; flex: 1; min-height: 170px;">';

      // SECTION 2: Weeks in Year
      html += '    <div class="trmnl-card" style="flex: 1.1; padding: 12px 16px; display: flex; flex-direction: column; align-items: center; justify-content: space-around;">';
      html += '      <div style="font-family: var(--font-sans); font-size: 13.5px; font-weight: 700; text-align: center; text-transform: uppercase; letter-spacing: 0.05em; width: 100%; margin-bottom: 6px;">';
      html += '        Weeks in Year: Week ' + currentWeekOfYear + ' of 52 (' + yearPercentage + '%)';
      html += '      </div>';
      
      // 4 rows (Q1-Q4) of 13 columns = 52 weeks
      html += '      <div style="display: flex; flex-direction: column; gap: 4px;">';
      for (var q = 0; q < 4; q++) {
        html += '        <div style="display: flex; align-items: center; gap: 4px;">';
        // Quarter Label
        html += '          <div style="font-family: var(--font-mono); font-size: 9px; font-weight: 700; width: 16px; text-align: left; opacity: 0.65;">Q' + (q + 1) + '</div>';
        for (var w = 0; w < 13; w++) {
          var weekNum = (q * 13) + w + 1;
          var cellHtml = '';
          if (weekNum < currentWeekOfYear) {
            // Lived/Past week
            cellHtml = '<div style="width: 11px; height: 11px; border: 1.5px solid var(--border-color); box-sizing: border-box; background-color: var(--text-color);"></div>';
          } else if (weekNum === currentWeekOfYear) {
            // Current week (target indicator)
            cellHtml = '<div style="width: 11px; height: 11px; border: 1.5px solid var(--border-color); box-sizing: border-box; background-color: transparent; display: flex; align-items: center; justify-content: center;">' +
                       '  <div style="width: 3px; height: 3px; background-color: var(--text-color); border-radius: 50%;"></div>' +
                       '</div>';
          } else {
            // Future week
            cellHtml = '<div style="width: 11px; height: 11px; border: 1.5px solid var(--border-color); box-sizing: border-box; background-color: transparent;"></div>';
          }
          html += cellHtml;
        }
        html += '        </div>';
      }
      html += '      </div>';
      html += '    </div>';

      // SECTION 3: Days in Month
      html += '    <div class="trmnl-card" style="flex: 0.9; padding: 10px 14px; display: flex; flex-direction: column; align-items: center; justify-content: space-around;">';
      html += '      <div style="font-family: var(--font-sans); font-size: 13.5px; font-weight: 700; text-align: center; text-transform: uppercase; letter-spacing: 0.05em; width: 100%; margin-bottom: 4px;">';
      html += '        ' + currentMonthName.toUpperCase() + ': Day ' + currentDayOfMonth + ' of ' + totalDaysInMonth + ' (' + monthPercentage + '%)';
      html += '      </div>';

      // Calendar grid (7 columns: Sun-Sat)
      html += '      <div style="display: flex; flex-direction: column; gap: 3px; align-items: center;">';
      
      // Day headers row
      var daysHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      html += '        <div style="display: flex; gap: 4px; margin-bottom: 2px;">';
      for (var d = 0; d < 7; d++) {
        html += '          <div style="font-family: var(--font-mono); font-size: 8px; font-weight: 700; width: 11px; text-align: center; opacity: 0.6;">' + daysHeaders[d] + '</div>';
      }
      html += '        </div>';

      // Calendar weeks rows
      var dayCounter = 1;
      var totalCells = firstDayIndex + totalDaysInMonth;
      var rowsNeeded = Math.ceil(totalCells / 7);

      for (var row = 0; row < rowsNeeded; row++) {
        html += '        <div style="display: flex; gap: 4px;">';
        for (var col = 0; col < 7; col++) {
          var cellIdx = (row * 7) + col;
          if (cellIdx < firstDayIndex || dayCounter > totalDaysInMonth) {
            // Empty padded cell
            html += '          <div style="width: 11px; height: 11px;"></div>';
          } else {
            var cellHtml = '';
            if (dayCounter < currentDayOfMonth) {
              // Past day
              cellHtml = '<div style="width: 11px; height: 11px; border: 1.5px solid var(--border-color); box-sizing: border-box; background-color: var(--text-color);"></div>';
            } else if (dayCounter === currentDayOfMonth) {
              // Current day (target indicator)
              cellHtml = '<div style="width: 11px; height: 11px; border: 1.5px solid var(--border-color); box-sizing: border-box; background-color: transparent; display: flex; align-items: center; justify-content: center;">' +
                         '  <div style="width: 3px; height: 3px; background-color: var(--text-color); border-radius: 50%;"></div>' +
                         '</div>';
            } else {
              // Future day
              cellHtml = '<div style="width: 11px; height: 11px; border: 1.5px solid var(--border-color); box-sizing: border-box; background-color: transparent;"></div>';
            }
            html += cellHtml;
            dayCounter++;
          }
        }
        html += '        </div>';
      }
      html += '      </div>';
      html += '    </div>';

      html += '  </div>';

      // Custom Dithered Footer Bar
      html += '  <div class="trmnl-footer-bar" style="margin-top: 12px;">';
      html += '    <div class="trmnl-footer-badge">';
      html += '      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';
      html += '      <span>Time Progression</span>';
      html += '    </div>';
      html += '    <div class="trmnl-footer-meta">LIFE, YEAR, & MONTH METRICS</div>';
      html += '  </div>';

      html += '</div>';

      this.container.innerHTML = html;
    }
  };

  // Register plugin
  window.Plugins = window.Plugins || {};
  window.Plugins.life = LifePlugin;

})();
