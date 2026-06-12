/**
 * "Your Life in Weeks" Plugin for BRIEF Dashboard
 * Calculates and visualizes life progress on a 90-year grid (52 weeks x 90 years = 4680 weeks)
 */

(function() {
  'use strict';

  var LifePlugin = {
    id: 'life_in_weeks',
    name: 'Life in Weeks',
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
      html += '    <div style="font-family: var(--font-sans); font-size: 17px; font-weight: 700; margin-bottom: 8px; color: var(--text-color); text-align: center; text-transform: uppercase; letter-spacing: 0.05em;">';
      html += '      Your Life in Weeks: Lived ' + formattedLifeLived + ' of ' + formattedLifeTotal + ' (' + lifePercentage + '%)';
      html += '    </div>';
      
      // High-resolution Canvas replacing the heavy 4,680 DOM divs (adjusted for wider & shorter aspect ratio)
      html += '    <div style="width: 900px; display: flex; justify-content: center; align-items: center; overflow: hidden;">';
      html += '      <canvas id="life-weeks-canvas" style="width: 899px; height: 311px; display: block;"></canvas>';
      html += '    </div>';
      html += '  </div>';

      // Row for SECTION 2 & SECTION 3 (Side-by-side cards)
      html += '  <div style="display: flex; flex: 1; min-height: 170px;">';

      // SECTION 2: Weeks in Year
      html += '    <div class="trmnl-card" style="flex: 1.1; padding: 12px 16px; display: flex; flex-direction: column; align-items: center; justify-content: space-around; margin-right: 12px;">';
      html += '      <div style="font-family: var(--font-sans); font-size: 15.5px; font-weight: 700; text-align: center; text-transform: uppercase; letter-spacing: 0.05em; width: 100%; margin-bottom: 6px;">';
      html += '        Weeks in Year: Week ' + currentWeekOfYear + ' of 52 (' + yearPercentage + '%)';
      html += '      </div>';
      
      // 4 rows (Q1-Q4) of 13 columns = 52 weeks
      html += '      <div style="display: grid; grid-template-columns: 16px repeat(13, 13px); grid-gap: 4px; gap: 4px; align-items: center; justify-content: center;">';
      for (var q = 0; q < 4; q++) {
        // Quarter Label
        html += '        <div style="font-family: var(--font-mono); font-size: 9px; font-weight: 700; width: 16px; text-align: left; opacity: 0.65;">Q' + (q + 1) + '</div>';
        for (var w = 0; w < 13; w++) {
          var weekNum = (q * 13) + w + 1;
          var cellHtml = '';
          if (weekNum < currentWeekOfYear) {
            // Lived/Past week
            cellHtml = '<div style="width: 13px; height: 13px; border: var(--border-width-thin) solid var(--border-color); box-sizing: border-box; background-color: var(--text-color);"></div>';
          } else if (weekNum === currentWeekOfYear) {
            // Current week (target indicator)
            cellHtml = '<div style="width: 13px; height: 13px; border: var(--border-width-thin) solid var(--border-color); box-sizing: border-box; background-color: transparent; display: flex; align-items: center; justify-content: center;">' +
                       '  <div style="width: 4px; height: 4px; background-color: var(--text-color); border-radius: 50%;"></div>' +
                       '</div>';
          } else {
            // Future week
            cellHtml = '<div style="width: 13px; height: 13px; border: var(--border-width-thin) solid var(--border-color); box-sizing: border-box; background-color: transparent;"></div>';
          }
          html += cellHtml;
        }
      }
      html += '      </div>';
      html += '    </div>';
 
      // SECTION 3: Days in Month
      html += '    <div class="trmnl-card" style="flex: 0.9; padding: 10px 14px; display: flex; flex-direction: column; align-items: center; justify-content: space-around;">';
      html += '      <div style="font-family: var(--font-sans); font-size: 15.5px; font-weight: 700; text-align: center; text-transform: uppercase; letter-spacing: 0.05em; width: 100%; margin-bottom: 4px;">';
      html += '        ' + currentMonthName.toUpperCase() + ': Day ' + currentDayOfMonth + ' of ' + totalDaysInMonth + ' (' + monthPercentage + '%)';
      html += '      </div>';
 
      // Calendar grid (7 columns: Sun-Sat)
      html += '      <div style="display: grid; grid-template-columns: repeat(7, 13px); grid-gap: 4px; gap: 4px; justify-content: center; align-items: center; margin-top: 4px;">';
      
      // Day headers row
      var daysHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      for (var d = 0; d < 7; d++) {
        html += '        <div style="font-family: var(--font-mono); font-size: 9px; font-weight: 700; width: 13px; text-align: center; opacity: 0.6;">' + daysHeaders[d] + '</div>';
      }

      // Calendar days
      var dayCounter = 1;
      var totalCells = firstDayIndex + totalDaysInMonth;
      var rowsNeeded = Math.ceil(totalCells / 7);
      var gridCellsCount = rowsNeeded * 7;

      for (var i = 0; i < gridCellsCount; i++) {
        if (i < firstDayIndex || dayCounter > totalDaysInMonth) {
          // Empty padded cell
          html += '        <div style="width: 13px; height: 13px;"></div>';
        } else {
          var cellHtml = '';
          if (dayCounter < currentDayOfMonth) {
            // Past day
            cellHtml = '<div style="width: 13px; height: 13px; border: var(--border-width-thin) solid var(--border-color); box-sizing: border-box; background-color: var(--text-color);"></div>';
          } else if (dayCounter === currentDayOfMonth) {
            // Current day (target indicator)
            cellHtml = '<div style="width: 13px; height: 13px; border: var(--border-width-thin) solid var(--border-color); box-sizing: border-box; background-color: transparent; display: flex; align-items: center; justify-content: center;">' +
                       '  <div style="width: 4px; height: 4px; background-color: var(--text-color); border-radius: 50%;"></div>' +
                       '</div>';
          } else {
            // Future day
            cellHtml = '<div style="width: 13px; height: 13px; border: var(--border-width-thin) solid var(--border-color); box-sizing: border-box; background-color: transparent;"></div>';
          }
          html += cellHtml;
          dayCounter++;
        }
      }
      html += '      </div>';
      html += '    </div>';

      html += '  </div>';

      // Custom Dithered Footer Bar
      html += '  <div class="trmnl-footer-bar" style="margin-top: 12px;">';
      html += '    <div class="trmnl-footer-badge">';
      html += '      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"></path></svg>';
      html += '      <span>Life in Weeks</span>';
      html += '    </div>';
      html += '    <div class="trmnl-footer-meta">LIFE, YEAR, & MONTH METRICS</div>';
      html += '  </div>';

      html += '</div>';

      this.container.innerHTML = html;

      // Draw grid squares on canvas with sub-pixel correction and DPR support
      var canvas = this.container.querySelector('#life-weeks-canvas');
      if (canvas) {
        var ctx = canvas.getContext('2d');
        if (ctx) {
          var dpr = window.devicePixelRatio || 1;
          canvas.width = 899 * dpr;
          canvas.height = 311 * dpr;
          canvas.style.width = '899px';
          canvas.style.height = '311px';
          ctx.scale(dpr, dpr);

          var styles = window.getComputedStyle(document.body);
          var textColor = styles.getPropertyValue('--text-color').trim() || '#111111';
          var borderColor = styles.getPropertyValue('--border-color').trim() || '#111111';
          var cardBg = styles.getPropertyValue('--card-bg').trim() || '#ffffff';

          ctx.clearRect(0, 0, 899, 311);
          
          for (var week = 0; week < 52; week++) {
            for (var year = 0; year < 90; year++) {
              var index = (year * 52) + week;
              var isLived = index < weeksLived;
              
              var x = year * 10;
              var y = week * 6;
              
              if (isLived) {
                ctx.fillStyle = textColor;
                ctx.fillRect(x, y, 9, 5);
              } else {
                ctx.fillStyle = borderColor;
                ctx.fillRect(x, y, 9, 5);
                ctx.fillStyle = cardBg;
                ctx.fillRect(x + 1, y + 1, 7, 3);
              }
            }
          }
        }
      }
    }
  };

  // Register plugin
  window.Plugins = window.Plugins || {};
  window.Plugins.life_in_weeks = LifePlugin;

})();
