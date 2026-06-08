/**
 * Personal Stats & Reflections Plugin for TRMNL Dashboard
 * Tracks childhood (Child 1 & Child 2), marriage & parenthood, cooking & writing, sleep, and cosmic statistics.
 * Allows editing configurations directly on the plugin page.
 */

(function() {
  'use strict';

  var StatsPlugin = {
    id: 'stats',
    name: 'Personal Stats',
    config: {},
    container: null,
    editMode: false,

    init: function(pluginConfig) {
      this.config = pluginConfig || {};
      this.loadConfig();
    },

    render: function(element) {
      this.container = element;
      this.renderView();
    },

    update: function() {
      this.loadConfig();
      this.renderView();
    },

    loadConfig: function() {
      var activeConfig = window.Dashboard ? window.Dashboard.getActiveConfig() : {};
      var defaults = {
        birthdate: activeConfig.birthdate || '1995-04-12',
        child1Name: 'Child 1',
        child2Name: 'Child 2',
        child1Date: '2020-06-01',
        child2Date: '2023-06-01',
        marriageDate: '2021-06-15',
        cookingStartDate: '2022-01-01',
        writingStartDate: '2016-01-01',
        mealsPerDay: 2,
        articlesPerMonth: 4,
        wordsPerArticle: 4000,
        sleepHoursPerDay: 8,
        storySessionsPerWeek: 7,
        storyDurationMinutes: 10
      };

      try {
        var saved = localStorage.getItem('trmnl_personal_stats_config');
        if (saved) {
          this.config = Object.assign({}, defaults, JSON.parse(saved));
        } else {
          this.config = defaults;
        }
      } catch (e) {
        this.config = defaults;
      }
    },

    saveConfig: function(newConfig) {
      this.config = Object.assign({}, this.config, newConfig);
      try {
        localStorage.setItem('trmnl_personal_stats_config', JSON.stringify(this.config));
        
        // Synchronize birthdate with global settings
        var globalSaved = localStorage.getItem('trmnl_dashboard_settings');
        var globalSettings = {};
        if (globalSaved) {
          globalSettings = JSON.parse(globalSaved);
        }
        globalSettings.birthdate = this.config.birthdate;
        localStorage.setItem('trmnl_dashboard_settings', JSON.stringify(globalSettings));
      } catch (e) {
        console.error("Failed to save stats config:", e);
      }
    },

    parseDate: function(dateStr) {
      var d = new Date(dateStr);
      if (isNaN(d.getTime())) {
        d = new Date(dateStr.replace(/-/g, '/'));
      }
      return d;
    },

    formatNumber: function(num) {
      return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    },

    calculateChildAge: function(birthdateStr, today) {
      var birthdate = this.parseDate(birthdateStr);
      if (isNaN(birthdate.getTime())) return { years: 0, months: 0, pct: 0 };

      var todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      // Completed years
      var years = todayMidnight.getFullYear() - birthdate.getFullYear();
      var testBday = new Date(birthdate.getFullYear() + years, birthdate.getMonth(), birthdate.getDate());
      if (todayMidnight < testBday) years--;

      // Completed months within current year
      var lastBday = new Date(birthdate.getFullYear() + years, birthdate.getMonth(), birthdate.getDate());
      var months = (todayMidnight.getFullYear() - lastBday.getFullYear()) * 12 + (todayMidnight.getMonth() - lastBday.getMonth());
      var testMonth = new Date(lastBday.getFullYear(), lastBday.getMonth() + months, lastBday.getDate());
      if (todayMidnight < testMonth) months--;
      months = Math.max(0, months);

      // Percentage based on actual days elapsed vs total days from birth to 18th birthday
      var bday18 = new Date(birthdate.getFullYear() + 18, birthdate.getMonth(), birthdate.getDate());
      var totalDays = Math.round((bday18.getTime() - birthdate.getTime()) / (1000 * 60 * 60 * 24));
      var elapsedDays = Math.round((todayMidnight.getTime() - birthdate.getTime()) / (1000 * 60 * 60 * 24));
      var pct = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

      // Fractional years for partial-year bar fill
      var nextBday = new Date(birthdate.getFullYear() + years + 1, birthdate.getMonth(), birthdate.getDate());
      var daysInThisYear = Math.round((nextBday.getTime() - lastBday.getTime()) / (1000 * 60 * 60 * 24));
      var daysSinceLastBday = Math.round((todayMidnight.getTime() - lastBday.getTime()) / (1000 * 60 * 60 * 24));
      var yearFraction = Math.min(1, daysSinceLastBday / daysInThisYear);

      return {
        years: Math.max(0, Math.min(18, years)),
        months: months,
        pct: pct,
        yearFraction: yearFraction
      };
    },

    buildChildProgressBar: function(childAge) {
      var barHtml = '<div style="display: flex; height: 22px; border: var(--border-width) solid var(--border-color); border-radius: 4px; overflow: hidden;">';
      for (var i = 0; i < 18; i++) {
        var borderR = i < 17 ? 'border-right: var(--border-width-thin) solid var(--border-color);' : '';
        var bg;
        if (i < childAge.years) {
          bg = 'background-color: var(--text-color);';
        } else if (i === childAge.years && childAge.years < 18) {
          // Partial fill for current year using a gradient
          var fillPct = Math.round(childAge.yearFraction * 100);
          bg = 'background: linear-gradient(to right, var(--text-color) ' + fillPct + '%, var(--card-bg) ' + fillPct + '%);';
        } else {
          bg = 'background-color: var(--card-bg);';
        }
        barHtml += '<div style="flex: 1; ' + bg + borderR + '"></div>';
      }
      barHtml += '</div>';

      // Year markers
      barHtml += '<div style="display: flex; justify-content: space-between; margin-top: 3px; font-family: var(--font-mono); font-size: 9px; font-weight: 700; opacity: 0.45;">';
      barHtml += '<span>0</span><span>3</span><span>6</span><span>9</span><span>12</span><span>15</span><span>18</span>';
      barHtml += '</div>';

      return barHtml;
    },

    renderView: function() {
      if (!this.container) return;
      this.renderStatsPanel();
    },

    renderStatsPanel: function() {
      var self = this;
      var today = new Date();
      var birthdateStr = this.config.birthdate || '1995-04-12';
      
      // 1. Childhood calculations
      var child1Age = this.calculateChildAge(this.config.child1Date, today);
      var child2Age = this.calculateChildAge(this.config.child2Date, today);

      // Parent days starts from the birth of Child 1
      var child1Date = this.parseDate(this.config.child1Date);
      var child1Days = Math.max(0, Math.floor((today - child1Date) / (1000 * 60 * 60 * 24)));
      var parentDays = child1Days;
      var storySessionsPerWeek = this.config.storySessionsPerWeek !== undefined ? this.config.storySessionsPerWeek : 7;
      var totalStorySessions = Math.round(parentDays * (storySessionsPerWeek / 7));
      var storyDurationMinutes = this.config.storyDurationMinutes !== undefined ? this.config.storyDurationMinutes : 10;
      var bedtimeHours = Math.round((totalStorySessions * storyDurationMinutes) / 60);

      // 2. Marriage calculations
      var marriageDate = this.parseDate(this.config.marriageDate);
      var marriageDays = Math.max(0, Math.floor((today - marriageDate) / (1000 * 60 * 60 * 24)));
      var marriageYears = marriageDays / 365.25;
      var marriageSunKm = marriageYears * 940000000;
      var marriageMilkyWayKm = marriageDays * 24 * 828000;

      // 3. Cooking calculations
      var cookDate = this.parseDate(this.config.cookingStartDate);
      var cookDays = Math.max(0, Math.floor((today - cookDate) / (1000 * 60 * 60 * 24)));
      var totalMeals = Math.floor(cookDays * this.config.mealsPerDay);

      // 4. Writing calculations
      var writeDate = this.parseDate(this.config.writingStartDate);
      var writeMonths = (today.getFullYear() - writeDate.getFullYear()) * 12 + (today.getMonth() - writeDate.getMonth());
      if (today.getDate() < writeDate.getDate()) {
        writeMonths = Math.max(0, writeMonths - 1);
      }
      writeMonths = Math.max(0, writeMonths);
      var totalArticles = Math.floor(writeMonths * this.config.articlesPerMonth);
      var totalWords = totalArticles * this.config.wordsPerArticle;

      // 5. Cosmic & Sleep calculations
      var birthDate = this.parseDate(birthdateStr);
      var lifeDays = Math.max(0, Math.floor((today - birthDate) / (1000 * 60 * 60 * 24)));
      var lifeYears = lifeDays / 365.25;

      var totalSleepHours = lifeDays * this.config.sleepHoursPerDay;
      var sleepYears = (totalSleepHours / (24 * 365.25)).toFixed(1);

      // 940M km around Sun per year
      var sunKm = lifeYears * 940000000;
      // 828,000 km/h around Milky Way center
      var milkyWayKm = lifeDays * 24 * 828000;
      // 27.32 days per orbit of Moon
      var moonOrbits = Math.floor(lifeDays / 27.32);

      // Layout: 2 Rows
      var html = '<div style="display:flex; flex-direction:column; height:100%; justify-content:space-between; box-sizing:border-box; padding: 2px 0 0 0;">';

      // ROW 1: Marriage & Family Combined Card (Full Width)
      html += '  <div class="grid-row" style="flex: 1.3; margin-bottom: 8px;">';
      html += '    <div class="trmnl-card" style="flex: 1; padding: 14px 20px; display: flex; flex-direction: column; overflow: hidden;">';
      html += '      <div style="display: flex; flex-direction: column; height: 100%; justify-content: space-between;">';
      html += '        <div class="trmnl-card-header" style="margin-bottom: 8px; font-size: 15px;">MARRIAGE &amp; FAMILY</div>';
      
      html += '        <div style="display: flex; flex-direction: row; flex: 1; align-items: stretch;">';
      
      // Left Column (Marriage & Parenthood Stats)
      html += '          <div style="flex: 0.85; display: flex; flex-direction: column; justify-content: space-around; padding-right: 22px; border-right: var(--border-width-thin) solid var(--border-color);">';
      
      // Marriage Section
      html += '            <div>';
      html += '              <div style="font-family: var(--font-mono); font-size: 12px; font-weight: 700; opacity: 0.55; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px;">MARRIAGE JOURNEY</div>';
      html += '              <div style="font-family: var(--font-sans); font-size: 36px; font-weight: 800; line-height: 1.05; margin-bottom: 8px;">' + self.formatNumber(marriageDays) + '</div>';
      html += '              <div style="font-family: var(--font-mono); font-size: 13px; font-weight: 700; opacity: 0.65; text-transform: uppercase;">Days Married</div>';
      html += '              <div style="font-family: var(--font-sans); font-size: 13px; font-weight: 700; line-height: 1.4; opacity: 0.75; margin-top: 8px;">';
      html += '                Travelled <b>' + (marriageSunKm / 1000000000).toFixed(2) + 'B km</b> around the Sun together<br>';
      html += '                and cruised <b>' + (marriageMilkyWayKm / 1000000000).toFixed(2) + 'B km</b> around the Milky Way together';
      html += '              </div>';
      html += '            </div>';
      
      // Dotted Divider
      html += '            <div class="dotted-divider" style="margin: 10px 0;"></div>';
      
      // Parenthood Section
      html += '            <div>';
      html += '              <div style="font-family: var(--font-mono); font-size: 12px; font-weight: 700; opacity: 0.55; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px;">PARENTHOOD</div>';
      html += '              <div style="font-family: var(--font-sans); font-size: 30px; font-weight: 800; line-height: 1.05; margin-bottom: 8px;">' + self.formatNumber(parentDays) + '</div>';
      html += '              <div style="font-family: var(--font-mono); font-size: 13px; font-weight: 700; opacity: 0.65; text-transform: uppercase;">Days as Parents</div>';
      html += '              <div style="font-family: var(--font-sans); font-size: 13px; font-weight: 700; line-height: 1.4; opacity: 0.75; margin-top: 8px;">';
      html += '                Spent more than <b>' + self.formatNumber(bedtimeHours) + ' hours</b> reading bedtime stories (' + self.formatNumber(totalStorySessions) + ' sessions)';
      html += '              </div>';
      html += '            </div>';
      
      html += '          </div>'; // End Left Column
      
      // Right Column (Childhood Progress Bars)
      html += '          <div style="flex: 1.15; display: flex; flex-direction: column; justify-content: space-around; padding-left: 22px;">';
      
      // Child 1
      html += '            <div>';
      html += '              <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 6px;">';
      html += '                <div style="font-family: var(--font-sans); font-size: 16px; font-weight: 800; line-height: 1.1;">' + (this.config.child1Name || 'Child 1') + '</div>';
      html += '                <div style="font-family: var(--font-mono); font-size: 13px; font-weight: 700; opacity: 0.7;">' + child1Age.years + ' yrs ' + child1Age.months + ' mos</div>';
      html += '              </div>';
      html += '              ' + self.buildChildProgressBar(child1Age);
      html += '              <div style="font-family: var(--font-mono); font-size: 12px; font-weight: 700; opacity: 0.55; text-transform: uppercase; margin-top: 5px;">';
      html += '                ' + child1Age.pct.toFixed(1) + '% of childhood elapsed &middot; ' + (100 - child1Age.pct).toFixed(1) + '% remaining';
      html += '              </div>';
      html += '            </div>';
      
      // Divider
      html += '            <div class="dotted-divider" style="margin: 10px 0;"></div>';
      
      // Child 2
      html += '            <div>';
      html += '              <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 6px;">';
      html += '                <div style="font-family: var(--font-sans); font-size: 16px; font-weight: 800; line-height: 1.1;">' + (this.config.child2Name || 'Child 2') + '</div>';
      html += '                <div style="font-family: var(--font-mono); font-size: 13px; font-weight: 700; opacity: 0.7;">' + child2Age.years + ' yrs ' + child2Age.months + ' mos</div>';
      html += '              </div>';
      html += '              ' + self.buildChildProgressBar(child2Age);
      html += '              <div style="font-family: var(--font-mono); font-size: 12px; font-weight: 700; opacity: 0.55; text-transform: uppercase; margin-top: 5px;">';
      html += '                ' + child2Age.pct.toFixed(1) + '% of childhood elapsed &middot; ' + (100 - child2Age.pct).toFixed(1) + '% remaining';
      html += '              </div>';
      html += '            </div>';
      
      html += '          </div>'; // End Right Column
      
      html += '        </div>'; // End flex-row
      html += '      </div>'; // End container
      html += '    </div>'; // End Card
      
      html += '  </div>';

      // ROW 2: Cooking & Writing & Cosmic Paths
      html += '  <div class="grid-row" style="flex: 0.7; margin-bottom: 8px;">';

      // Card 3: Making Things (Left)
      var hobbitContext;
      var hobbitMealsPerYear = 7 * 365.25;
      var hobbitMealsPerMonth = 7 * 30.44;
      if (totalMeals >= hobbitMealsPerYear) {
        hobbitContext = (totalMeals / hobbitMealsPerYear).toFixed(1) + ' years';
      } else {
        hobbitContext = (totalMeals / hobbitMealsPerMonth).toFixed(1) + ' months';
      }

      html += '    <div class="grid-col col-1 trmnl-card" style="padding: 12px 16px; justify-content: space-between; overflow: hidden; margin-right: 10px;">';
      html += '      <div style="display: flex; flex-direction: column; height: 100%; justify-content: space-between;">';
      html += '        <div>';
      html += '          <div class="trmnl-card-header" style="margin-bottom: 6px; font-size: 14px;">MAKING THINGS</div>';
      html += '          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 6px;">';
      html += '            <div>';
      html += '              <div style="font-family: var(--font-sans); font-size: 24px; font-weight: 800; line-height: 1.1;">' + self.formatNumber(totalMeals) + '</div>';
      html += '              <div style="font-family: var(--font-mono); font-size: 11px; font-weight: 700; opacity: 0.6; text-transform: uppercase; margin-top: 2px;">Meals Prepared</div>';
      html += '            </div>';
      html += '            <div style="text-align: right;">';
      html += '              <div style="font-family: var(--font-sans); font-size: 24px; font-weight: 800; line-height: 1.1;">' + self.formatNumber(totalWords) + '</div>';
      html += '              <div style="font-family: var(--font-mono); font-size: 11px; font-weight: 700; opacity: 0.6; text-transform: uppercase; margin-top: 2px;">Words Written</div>';
      html += '            </div>';
      html += '          </div>';
      html += '        </div>';
      
      html += '        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 2px 0;">';
      html += '          <canvas id="canvas-writing" style="width: 430px; height: 100px; display: block;"></canvas>';
      html += '        </div>';
      
      html += '        <div style="font-family: var(--font-mono); font-size: 11px; font-weight: 700; opacity: 0.6; text-transform: uppercase; display: flex; justify-content: space-between;">';
      html += '          <span>Cooked: Fed a Hobbit for ' + hobbitContext + '</span>';
      html += '          <span>Written: ' + (totalWords / 480000).toFixed(1) + 'x Lord of the Rings</span>';
      html += '        </div>';
      html += '      </div>';
      html += '    </div>';

      // Card 4: Cosmic Stats (Right)
      var galaxyLogo = '<svg viewBox="0 0 24 24" style="width:20px; height:20px; stroke:var(--text-color); fill:none; stroke-width:2.5; margin-right:8px; flex-shrink:0; vertical-align:middle;"><circle cx="12" cy="12" r="3" fill="var(--text-color)" /><ellipse cx="12" cy="12" rx="9" ry="3" transform="rotate(-30 12 12)" /><ellipse cx="12" cy="12" rx="9" ry="3" transform="rotate(30 12 12)" /></svg>';

      html += '    <div class="grid-col col-1 trmnl-card" style="padding: 12px 16px; justify-content: space-between; overflow: hidden; display: flex; flex-direction: column; height: 100%;">';
      html += '      <div style="display: flex; flex-direction: column; flex: 1; justify-content: space-between; height: 100%;">';
      html += '        <div class="trmnl-card-header" style="margin-bottom: 6px; font-size: 14px;">COSMIC STATS</div>';
      html += '        <div style="display: flex; flex: 1; align-items: center; min-height: 130px;">';
      html += '          <div style="flex: 1.4; display: flex; flex-direction: column; font-family: var(--font-sans); font-size: 13px; font-weight: 700; line-height: 1.4; padding: 4px 0;">';
      html += '            <div style="display: flex; align-items: center; margin-bottom: 10px; padding-right: 4px;">' + window.getIcon('bed', 'margin-right:8px;', '16px') + '<span>Spent <b>' + sleepYears + ' years</b> sleeping (' + this.config.sleepHoursPerDay + 'h/day)</span></div>';
      html += '            <div style="display: flex; align-items: center; margin-bottom: 10px; padding-right: 4px;">' + window.getIcon('sun', 'margin-right:8px;', '16px') + '<span>Travelled <b>' + (sunKm / 1000000000).toFixed(1) + 'B km</b> around the Sun</span></div>';
      html += '            <div style="display: flex; align-items: center; margin-bottom: 10px; padding-right: 4px;">' + galaxyLogo + '<span>Cruised <b>' + (milkyWayKm / 1000000000).toFixed(1) + 'B km</b> around the Milky Way</span></div>';
      html += '            <div style="display: flex; align-items: center; padding-right: 4px;">' + window.getIcon('moon', 'margin-right:8px;', '16px') + '<span>Moon circled Earth <b>' + self.formatNumber(moonOrbits) + ' times</b></span></div>';
      html += '          </div>';
      html += '          <div style="flex: 0.8; display: flex; align-items: center; justify-content: center; height: 130px;">';
      html += '            <canvas id="canvas-cosmic" style="width: 150px; height: 130px; display: block;"></canvas>';
      html += '          </div>';
      html += '        </div>';
      html += '      </div>';
      html += '    </div>';

      html += '  </div>';

      // 6. Footer Bar
      html += '  <div class="trmnl-footer-bar">';
      html += '    <div class="trmnl-footer-badge">';
      html += '      <svg viewBox="0 0 24 24" style="width:14px; height:14px; stroke:var(--text-color); fill:none; stroke-width:2.5; vertical-align:middle; flex-shrink:0;"><path d="M18 20V10M12 20V4M6 20v-6"></path></svg>';
      html += '      <span>Personal Stats</span>';
      html += '    </div>';
    html += '    <button id="stats-edit-btn" style="cursor: pointer; background: transparent; border: 1px solid var(--border-color); border-radius: 4px; padding: 4px 10px; font-family: var(--font-mono); font-size: 11px; font-weight: 700; color: var(--text-color); outline: none;">[ EDIT SETTINGS ]</button>';
    html += '  </div>';

    html += '</div>';

    this.container.innerHTML = html;

    // Bind edit button
    var editBtn = this.container.querySelector('#stats-edit-btn');
    if (editBtn) {
      editBtn.addEventListener('click', function(e) {
        e.stopPropagation(); // Prevent opening the quick switcher
        if (window.Dashboard && typeof window.Dashboard.openSettings === 'function') {
          window.Dashboard.openSettings('stats');
        }
      });
    }

      // Draw Canvases
      this.drawWritingBooks(totalWords);
      this.drawCosmicOrbits();
    },



    // Canvas drawing helper for colors based on theme
    getThemeColors: function() {
      var styles = window.getComputedStyle(document.body);
      var textColor = styles.getPropertyValue('--text-color').trim() || '#111111';
      var borderColor = styles.getPropertyValue('--border-color').trim() || '#111111';
      var cardBg = styles.getPropertyValue('--card-bg').trim() || '#f0f0f0';
      return {
        text: textColor,
        border: borderColor,
        bg: cardBg
      };
    },

    setupCanvas: function(canvasId, width, height) {
      var canvas = this.container.querySelector('#' + canvasId);
      if (!canvas) return null;
      var ctx = canvas.getContext('2d');
      if (!ctx) return null;

      var dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.scale(dpr, dpr);
      return ctx;
    },





    drawWritingBooks: function(totalWords) {
      var ctx = this.setupCanvas('canvas-writing', 430, 100);
      if (!ctx) return;

      var colors = this.getThemeColors();
      ctx.clearRect(0, 0, 430, 100);

      // 1 book spine = 100,000 words.
      var booksCount = Math.floor(totalWords / 100000);
      if (booksCount < 1 && totalWords > 0) booksCount = 1;
      
      var shelfY = 88;
      var startX = 40;

      // Draw shelf line
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(20, shelfY);
      ctx.lineTo(410, shelfY);
      ctx.stroke();

      // Draw brackets
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(30, shelfY);
      ctx.lineTo(26, shelfY + 10);
      ctx.moveTo(400, shelfY);
      ctx.lineTo(404, shelfY + 10);
      ctx.stroke();

      var bookWidth = 11;
      var spacing = 14;

      for (var i = 0; i < booksCount; i++) {
        var h = 42 + (i % 4) * 6;
        var bx = startX + i * spacing;

        if (bx > 380) {
          // Leaning books at the end
          var angle = 20 * Math.PI / 180;
          ctx.save();
          ctx.translate(bx, shelfY);
          ctx.rotate(angle);
          
          ctx.fillStyle = colors.bg;
          ctx.fillRect(0, -h, bookWidth, h);
          ctx.strokeStyle = colors.border;
          ctx.lineWidth = 1.25;
          ctx.strokeRect(0, -h, bookWidth, h);

          // Draw stripe on book
          ctx.beginPath();
          ctx.moveTo(3.5, -h + 6);
          ctx.lineTo(3.5, -6);
          ctx.stroke();

          ctx.restore();
          break;
        }

        ctx.fillStyle = colors.bg;
        ctx.fillRect(bx, shelfY - h, bookWidth, h);
        
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 1.25;
        ctx.strokeRect(bx, shelfY - h, bookWidth, h);

        // Pattern designs on spine
        ctx.fillStyle = colors.text;
        ctx.strokeStyle = colors.text;
        ctx.lineWidth = 1.25;

        if (i % 3 === 0) {
          // Horizontal double bands
          ctx.fillRect(bx + 1.5, shelfY - h + 5, bookWidth - 3, 3.5);
          ctx.fillRect(bx + 1.5, shelfY - 10, bookWidth - 3, 3.5);
        } else if (i % 3 === 1) {
          // Ladder pattern
          ctx.beginPath();
          for (var sy = shelfY - h + 6; sy < shelfY - 7; sy += 6) {
            ctx.moveTo(bx + 2.5, sy);
            ctx.lineTo(bx + bookWidth - 2.5, sy);
          }
          ctx.stroke();
        } else {
          // Solid spine with white label
          ctx.fillRect(bx + 1, shelfY - h + 1, bookWidth - 2, h - 2);
          ctx.fillStyle = colors.bg;
          ctx.fillRect(bx + 3, shelfY - h + 8, bookWidth - 6, h - 16);
        }
      }
    },

    drawCosmicOrbits: function() {
      var ctx = this.setupCanvas('canvas-cosmic', 150, 130);
      if (!ctx) return;

      var colors = this.getThemeColors();
      ctx.clearRect(0, 0, 150, 130);

      var cx = 75;
      var cy = 65;

      // 1. Draw Orbit Ellipses
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 1;
      
      // Orbit 1
      ctx.beginPath();
      ctx.ellipse(cx, cy, 32, 22, -10 * Math.PI / 180, 0, 2 * Math.PI);
      ctx.stroke();

      // Orbit 2
      ctx.beginPath();
      ctx.ellipse(cx, cy, 52, 36, -10 * Math.PI / 180, 0, 2 * Math.PI);
      ctx.stroke();

      // Orbit 3
      ctx.beginPath();
      ctx.ellipse(cx, cy, 70, 48, -10 * Math.PI / 180, 0, 2 * Math.PI);
      ctx.stroke();

      // 2. Draw Sun in center
      ctx.fillStyle = colors.bg;
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      // Sun rays
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 1.25;
      for (var a = 0; a < 360; a += 45) {
        var rad = a * Math.PI / 180;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(rad) * 11, cy + Math.sin(rad) * 11);
        ctx.lineTo(cx + Math.cos(rad) * 14, cy + Math.sin(rad) * 14);
        ctx.stroke();
      }

      // 3. Draw Planets
      ctx.fillStyle = colors.text;

      // Planet 1
      var p1Rad = (30 - 10) * Math.PI / 180;
      var p1x = cx + Math.cos(p1Rad) * 32 * Math.cos(-10 * Math.PI / 180) - Math.sin(p1Rad) * 22 * Math.sin(-10 * Math.PI / 180);
      var p1y = cy + Math.cos(p1Rad) * 32 * Math.sin(-10 * Math.PI / 180) + Math.sin(p1Rad) * 22 * Math.cos(-10 * Math.PI / 180);
      ctx.beginPath();
      ctx.arc(p1x, p1y, 3, 0, 2 * Math.PI);
      ctx.fill();

      // Planet 2
      var p2Rad = (145 - 10) * Math.PI / 180;
      var p2x = cx + Math.cos(p2Rad) * 52 * Math.cos(-10 * Math.PI / 180) - Math.sin(p2Rad) * 36 * Math.sin(-10 * Math.PI / 180);
      var p2y = cy + Math.cos(p2Rad) * 52 * Math.sin(-10 * Math.PI / 180) + Math.sin(p2Rad) * 36 * Math.cos(-10 * Math.PI / 180);
      ctx.beginPath();
      ctx.arc(p2x, p2y, 4, 0, 2 * Math.PI);
      ctx.fill();

      // Planet 3
      var p3Rad = (280 - 10) * Math.PI / 180;
      var p3x = cx + Math.cos(p3Rad) * 70 * Math.cos(-10 * Math.PI / 180) - Math.sin(p3Rad) * 48 * Math.sin(-10 * Math.PI / 180);
      var p3y = cy + Math.cos(p3Rad) * 70 * Math.sin(-10 * Math.PI / 180) + Math.sin(p3Rad) * 48 * Math.cos(-10 * Math.PI / 180);
      ctx.beginPath();
      ctx.arc(p3x, p3y, 5, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

  // Register plugin
  window.Plugins = window.Plugins || {};
  window.Plugins.stats = StatsPlugin;

})();
