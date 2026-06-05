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
        child1Date: '2020-06-01',
        child2Date: '2023-06-01',
        marriageDate: '2021-06-15',
        cookingStartDate: '2022-01-01',
        writingStartDate: '2016-01-01',
        mealsPerDay: 2,
        articlesPerMonth: 4,
        wordsPerArticle: 4000,
        sleepHoursPerDay: 8
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

    renderView: function() {
      if (!this.container) return;

      if (this.editMode) {
        this.renderEditPanel();
      } else {
        this.renderStatsPanel();
      }
    },

    renderStatsPanel: function() {
      var self = this;
      var today = new Date();
      var birthdateStr = this.config.birthdate || '1995-04-12';
      
      // 1. Childhood calculations
      var child1Date = this.parseDate(this.config.child1Date);
      var child1Days = Math.max(0, Math.floor((today - child1Date) / (1000 * 60 * 60 * 24)));
      var child1Weeks = Math.floor(child1Days / 7);

      var child2Date = this.parseDate(this.config.child2Date);
      var child2Days = Math.max(0, Math.floor((today - child2Date) / (1000 * 60 * 60 * 24)));
      var child2Weeks = Math.floor(child2Days / 7);

      // Parent days starts from the birth of Child 1
      var parentDays = child1Days;

      // 2. Marriage calculations
      var marriageDate = this.parseDate(this.config.marriageDate);
      var marriageDays = Math.max(0, Math.floor((today - marriageDate) / (1000 * 60 * 60 * 24)));
      var marriageYears = marriageDays / 365.25;
      var marriageSunKm = marriageYears * 940000000;

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

      // Layout: 2 Rows (2x2 Grid Layout)
      var html = '<div style="display:flex; flex-direction:column; height:100%; justify-content:space-between; box-sizing:border-box; padding: 2px 0 0 0;">';

      // ROW 1: Childhood Reflections & Marriage Reflection
      html += '  <div class="grid-row" style="flex: 1.15; margin-bottom: 8px;">';
      
      // Card 1: Childhood Reflections (Left)
      html += '    <div class="grid-col col-1 trmnl-card" style="padding: 10px 14px; justify-content: space-between; overflow: hidden; margin-right: 10px;">';
      html += '      <div style="display: flex; flex-direction: column; height: 100%; justify-content: space-between;">';
      html += '        <div class="trmnl-card-header" style="margin-bottom: 4px;">CHILDHOOD REFLECTIONS</div>';
      
      // Child 1 Section
      html += '        <div>';
      html += '          <div style="font-family: var(--font-sans); font-size: 14px; font-weight: 800; line-height: 1.1; margin-bottom: 2px;">Child 1</div>';
      html += '          <div style="display: flex; justify-content: center; margin: 1px 0;">';
      html += '            <canvas id="canvas-child1" style="width: 363px; height: 72px; display: block;"></canvas>';
      html += '          </div>';
      html += '          <div style="font-family: var(--font-mono); font-size: 8.5px; font-weight: 700; opacity: 0.6; text-transform: uppercase;">';
      html += '            ' + child1Weeks + ' of 936 weeks before age 18 (' + ((child1Weeks / 936) * 100).toFixed(1) + '%)';
      html += '          </div>';
      html += '        </div>';

      // Dotted Divider
      html += '        <div class="dotted-divider" style="margin: 3px 0;"></div>';

      // Child 2 Section
      html += '        <div>';
      html += '          <div style="font-family: var(--font-sans); font-size: 14px; font-weight: 800; line-height: 1.1; margin-bottom: 2px;">Child 2</div>';
      html += '          <div style="display: flex; justify-content: center; margin: 1px 0;">';
      html += '            <canvas id="canvas-child2" style="width: 363px; height: 72px; display: block;"></canvas>';
      html += '          </div>';
      html += '          <div style="font-family: var(--font-mono); font-size: 8.5px; font-weight: 700; opacity: 0.6; text-transform: uppercase;">';
      html += '            ' + child2Weeks + ' of 936 weeks before age 18 (' + ((child2Weeks / 936) * 100).toFixed(1) + '%)';
      html += '          </div>';
      html += '        </div>';

      html += '      </div>';
      html += '    </div>';

      // Card 2: Marriage & Parenthood Reflection (Right)
      html += '    <div class="grid-col col-1 trmnl-card" style="padding: 10px 14px; justify-content: space-between; overflow: hidden; display: flex; flex-direction: column;">';
      html += '      <div style="display: flex; flex-direction: column; height: 100%; justify-content: space-between;">';
      html += '        <div class="trmnl-card-header" style="margin-bottom: 6px;">MARRIAGE &amp; FAMILY</div>';
      html += '        <div>';
      html += '          <div style="font-family: var(--font-sans); font-size: 19px; font-weight: 800; line-height: 1.1; margin-bottom: 2px;">' + self.formatNumber(marriageDays) + ' Days of Marriage</div>';
      html += '          <div style="font-family: var(--font-sans); font-size: 14.5px; font-weight: 700; opacity: 0.8; margin-top: 4px;">Been parents for ' + self.formatNumber(parentDays) + ' days</div>';
      html += '        </div>';
      html += '        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 2px 0; flex: 1;">';
      html += '          <canvas id="canvas-marriage" style="width: 363px; height: 100px; display: block;"></canvas>';
      html += '        </div>';
      html += '        <div style="font-family: var(--font-mono); font-size: 9px; font-weight: 700; opacity: 0.7; line-height: 1.25;">';
      html += '          Together you have travelled <b>' + (marriageSunKm / 1000000000).toFixed(2) + ' Billion km</b> riding Earth around the Sun!';
      html += '        </div>';
      html += '      </div>';
      html += '    </div>';

      html += '  </div>';

      // ROW 2: Cooking & Writing & Cosmic Paths
      html += '  <div class="grid-row" style="flex: 0.85; margin-bottom: 8px;">';

      // Card 3: Cooking & Writing (Left)
      html += '    <div class="grid-col col-1 trmnl-card" style="padding: 10px 14px; justify-content: space-between; overflow: hidden; margin-right: 10px;">';
      html += '      <div style="display: flex; flex-direction: column; height: 100%; justify-content: space-between;">';
      html += '        <div>';
      html += '          <div class="trmnl-card-header" style="margin-bottom: 6px;">COOKING &amp; WRITING</div>';
      html += '          <div style="font-family: var(--font-sans); font-size: 15.5px; font-weight: 800; line-height: 1.1; margin-bottom: 2px;">' + self.formatNumber(totalMeals) + ' Meals Prepared</div>';
      html += '          <div style="font-family: var(--font-mono); font-size: 9px; font-weight: 700; opacity: 0.55; text-transform: uppercase; margin-bottom: 6px;">Avg ' + this.config.mealsPerDay + ' meals/day since ' + this.config.cookingStartDate + '</div>';
      
      html += '          <div style="font-family: var(--font-sans); font-size: 15.5px; font-weight: 800; line-height: 1.1; margin-bottom: 2px;">' + self.formatNumber(totalWords) + ' Words Written</div>';
      html += '          <div style="font-family: var(--font-mono); font-size: 9px; font-weight: 700; opacity: 0.55; text-transform: uppercase;">' + totalArticles + ' articles (avg ' + this.config.wordsPerArticle + ' words) since ' + this.config.writingStartDate + '</div>';
      html += '        </div>';
      
      html += '        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 2px 0;">';
      html += '          <canvas id="canvas-writing" style="width: 363px; height: 90px; display: block;"></canvas>';
      html += '        </div>';
      html += '        <div style="font-family: var(--font-mono); font-size: 8.5px; font-weight: 700; opacity: 0.6; text-transform: uppercase;">';
      html += '          Writing output is equivalent to ' + (totalWords / 480000).toFixed(1) + 'x Lord of the Rings trilogies';
      html += '        </div>';
      html += '      </div>';
      html += '    </div>';

      // Card 4: Cosmic / Sleep Stats (Right)
      html += '    <div class="grid-col col-1 trmnl-card" style="padding: 12px 14px; justify-content: space-between; overflow: hidden; display: flex; flex-direction: column; height: 100%;">';
      html += '      <div style="display: flex; flex-direction: column; flex: 1; justify-content: space-between; height: 100%;">';
      html += '        <div class="trmnl-card-header" style="margin-bottom: 6px;">COSMIC PATHS &amp; SLEEP</div>';
      html += '        <div style="display: flex; flex: 1; align-items: center; min-height: 125px;">';
      html += '          <div style="flex: 1.4; display: flex; flex-direction: column; justify-content: space-around; font-family: var(--font-sans); font-size: 11px; font-weight: 700; height: 125px; line-height: 1.4; padding: 2px 0;">';
      html += '            <div style="display: flex; align-items: center; padding-right: 4px;"><i class="fa-solid fa-bed" style="font-size:12px; width:16px; margin-right:6px; flex-shrink: 0;"></i><span>You spent <b>' + sleepYears + ' years</b> sleeping (at a rate of ' + this.config.sleepHoursPerDay + ' hours/day)</span></div>';
      html += '            <div style="display: flex; align-items: center; padding-right: 4px;"><i class="fa-solid fa-sun" style="font-size:12px; width:16px; margin-right:6px; flex-shrink: 0;"></i><span>Travelled <b>' + (sunKm / 1000000000).toFixed(2) + 'B km</b> riding Earth around the Sun (940M km/yr)</span></div>';
      html += '            <div style="display: flex; align-items: center; padding-right: 4px;"><i class="fa-solid fa-rocket" style="font-size:12px; width:16px; margin-right:6px; flex-shrink: 0;"></i><span>Cruised <b>' + (milkyWayKm / 1000000000).toFixed(1) + 'B km</b> around Milky Way center (7.26B km/yr)</span></div>';
      html += '            <div style="display: flex; align-items: center; padding-right: 4px;"><i class="fa-solid fa-moon" style="font-size:12px; width:16px; margin-right:6px; flex-shrink: 0;"></i><span>The Moon completed <b>' + self.formatNumber(moonOrbits) + ' orbits</b> around Earth (27.3 days/orbit)</span></div>';
      html += '          </div>';
      html += '          <div style="flex: 0.8; display: flex; align-items: center; justify-content: center; height: 125px;">';
      html += '            <canvas id="canvas-cosmic" style="width: 140px; height: 120px; display: block;"></canvas>';
      html += '          </div>';
      html += '        </div>';
      html += '        <div style="font-family: var(--font-mono); font-size: 10px; font-weight: 700; opacity: 0.6; text-transform: uppercase; margin-top: 6px;">';
      html += '          Based on birthdate metrics';
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
      html += '    <button id="stats-edit-btn" style="cursor: pointer; background: transparent; border: 1px solid var(--border-color); border-radius: 4px; padding: 4px 10px; font-family: var(--font-mono); font-size: 11px; font-weight: 700; color: var(--text-color); outline: none;">[ EDIT DATES ]</button>';
      html += '  </div>';

      html += '</div>';

      this.container.innerHTML = html;

      // Bind edit button
      var editBtn = this.container.querySelector('#stats-edit-btn');
      if (editBtn) {
        editBtn.addEventListener('click', function(e) {
          e.stopPropagation(); // Prevent opening the quick switcher
          self.editMode = true;
          self.renderView();
        });
      }

      // Draw Canvases
      this.drawChildhoodGrid('canvas-child1', child1Weeks);
      this.drawChildhoodGrid('canvas-child2', child2Weeks);
      this.drawMarriageHeart();
      this.drawWritingBooks(totalWords);
      this.drawCosmicOrbits();
    },

    renderEditPanel: function() {
      var self = this;
      
      var fieldStyle = 'margin-bottom: 12px;';
      var labelStyle = 'font-family:var(--font-mono); font-size:10px; font-weight:700; display:block; margin-bottom:4px; text-transform:uppercase; letter-spacing:0.04em; opacity:0.75;';
      
      var html = '<div class="trmnl-card" style="display:flex; flex-direction:column; height:100%; padding: 24px 28px; box-sizing:border-box;">';
      html += '  <div class="trmnl-card-header" style="margin-bottom: 14px;">EDIT PERSONAL STATS CONFIGURATION</div>';
      
      html += '  <div class="grid-row" style="flex:1; overflow:hidden; gap:24px;">';
      
      // Left Column
      html += '    <div class="grid-col col-1" style="justify-content: flex-start;">';
      html += '      <div style="' + fieldStyle + '">';
      html += '        <label style="' + labelStyle + '">BIRTHDATE (YYYY-MM-DD)</label>';
      html += '        <input type="text" id="stats-birthdate" value="' + this.config.birthdate + '">';
      html += '      </div>';

      html += '      <div style="' + fieldStyle + '">';
      html += '        <label style="' + labelStyle + '">CHILD 1 START DATE (YYYY-MM-DD)</label>';
      html += '        <input type="text" id="stats-child1-date" value="' + this.config.child1Date + '">';
      html += '      </div>';

      html += '      <div style="' + fieldStyle + '">';
      html += '        <label style="' + labelStyle + '">CHILD 2 START DATE (YYYY-MM-DD)</label>';
      html += '        <input type="text" id="stats-child2-date" value="' + this.config.child2Date + '">';
      html += '      </div>';

      html += '      <div style="' + fieldStyle + '">';
      html += '        <label style="' + labelStyle + '">MARRIAGE DATE (YYYY-MM-DD)</label>';
      html += '        <input type="text" id="stats-marriage-date" value="' + this.config.marriageDate + '">';
      html += '      </div>';
      html += '    </div>';
      
      // Right Column
      html += '    <div class="grid-col col-1" style="justify-content: flex-start;">';
      html += '      <div style="' + fieldStyle + '">';
      html += '        <label style="' + labelStyle + '">COOKING START DATE (YYYY-MM-DD)</label>';
      html += '        <input type="text" id="stats-cook-date" value="' + this.config.cookingStartDate + '">';
      html += '      </div>';

      html += '      <div style="' + fieldStyle + '">';
      html += '        <label style="' + labelStyle + '">AVERAGE MEALS PER DAY</label>';
      html += '        <input type="number" id="stats-meals-per-day" value="' + this.config.mealsPerDay + '" min="1" max="6">';
      html += '      </div>';

      html += '      <div style="' + fieldStyle + '">';
      html += '        <label style="' + labelStyle + '">AVERAGE SLEEP HOURS PER DAY</label>';
      html += '        <input type="number" id="stats-sleep-hours" value="' + this.config.sleepHoursPerDay + '" min="4" max="12" step="0.5">';
      html += '      </div>';

      html += '      <div style="' + fieldStyle + '">';
      html += '        <label style="' + labelStyle + '">WRITING START DATE (YYYY-MM-DD)</label>';
      html += '        <input type="text" id="stats-write-date" value="' + this.config.writingStartDate + '">';
      html += '      </div>';
      
      html += '      <div style="' + fieldStyle + '">';
      html += '        <label style="' + labelStyle + '">ARTICLES WRITTEN PER MONTH</label>';
      html += '        <input type="number" id="stats-articles-per-month" value="' + this.config.articlesPerMonth + '" min="1" max="30">';
      html += '      </div>';
      
      html += '      <div style="' + fieldStyle + '">';
      html += '        <label style="' + labelStyle + '">AVERAGE WORDS PER ARTICLE</label>';
      html += '        <input type="number" id="stats-words-per-article" value="' + this.config.wordsPerArticle + '" step="100" min="500">';
      html += '      </div>';

      html += '      <div style="margin-top: 14px; display:flex; flex-direction:column; gap:10px;">';
      html += '        <button class="trmnl-btn" id="stats-save-btn" style="width: 100%;">SAVE STATS SETTINGS</button>';
      html += '        <button class="trmnl-btn secondary" id="stats-cancel-btn" style="width: 100%; border-style:dashed;">CANCEL</button>';
      html += '      </div>';
      html += '    </div>';
      
      html += '  </div>';
      html += '</div>';

      this.container.innerHTML = html;

      // Event listeners
      var saveBtn = this.container.querySelector('#stats-save-btn');
      var cancelBtn = this.container.querySelector('#stats-cancel-btn');

      // Stop event propagation inside form inputs so clicking them doesn't do anything weird
      var inputs = this.container.querySelectorAll('input, select');
      for (var i = 0; i < inputs.length; i++) {
        inputs[i].addEventListener('click', function(e) {
          e.stopPropagation();
        });
      }

      if (saveBtn) {
        saveBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          var birthD = self.container.querySelector('#stats-birthdate').value.trim();
          var child1D = self.container.querySelector('#stats-child1-date').value.trim();
          var child2D = self.container.querySelector('#stats-child2-date').value.trim();
          var marD = self.container.querySelector('#stats-marriage-date').value.trim();
          var cookD = self.container.querySelector('#stats-cook-date').value.trim();
          var writeD = self.container.querySelector('#stats-write-date').value.trim();
          var meals = parseInt(self.container.querySelector('#stats-meals-per-day').value, 10) || 2;
          var sleep = parseFloat(self.container.querySelector('#stats-sleep-hours').value) || 8;
          var articles = parseInt(self.container.querySelector('#stats-articles-per-month').value, 10) || 4;
          var words = parseInt(self.container.querySelector('#stats-words-per-article').value, 10) || 4000;

          // Simple date check
          var dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(birthD) || !dateRegex.test(child1D) || !dateRegex.test(child2D) || !dateRegex.test(marD) || !dateRegex.test(cookD) || !dateRegex.test(writeD)) {
            alert("Please use YYYY-MM-DD format for dates.");
            return;
          }

          self.saveConfig({
            birthdate: birthD,
            child1Date: child1D,
            child2Date: child2D,
            marriageDate: marD,
            cookingStartDate: cookD,
            writingStartDate: writeD,
            mealsPerDay: meals,
            sleepHoursPerDay: sleep,
            articlesPerMonth: articles,
            wordsPerArticle: words
          });

          self.editMode = false;
          
          if (window.Dashboard && typeof window.Dashboard.reloadSettings === 'function') {
            window.Dashboard.reloadSettings();
          } else {
            self.renderView();
          }
        });
      }

      if (cancelBtn) {
        cancelBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          self.editMode = false;
          self.renderView();
        });
      }
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

    drawChildhoodGrid: function(canvasId, dadWeeks) {
      var ctx = this.setupCanvas(canvasId, 363, 72);
      if (!ctx) return;

      var colors = this.getThemeColors();
      ctx.clearRect(0, 0, 363, 72);

      var boxSize = 3;
      var gap = 1; // 3 + 1 = 4px spacing
      var startX = 78;
      var startY = 0;

      for (var y = 0; y < 18; y++) {
        for (var w = 0; w < 52; w++) {
          var weekIndex = y * 52 + w;
          var isLived = weekIndex < dadWeeks;
          var px = startX + w * (boxSize + gap);
          var py = startY + y * (boxSize + gap);

          if (isLived) {
            ctx.fillStyle = colors.text;
            ctx.fillRect(px, py, boxSize, boxSize);
          } else {
            // Draw hollow box
            ctx.strokeStyle = colors.border;
            ctx.lineWidth = 0.5;
            ctx.strokeRect(px + 0.25, py + 0.25, boxSize - 0.5, boxSize - 0.5);
          }
        }
      }

      // Draw faint lines dividing key childhood segments
      ctx.strokeStyle = colors.text;
      ctx.lineWidth = 0.5;
      ctx.setLineDash([1, 2]);

      // Row line after row 3 (Age 3)
      ctx.beginPath();
      ctx.moveTo(startX, startY + 3 * 4 - 0.5);
      ctx.lineTo(startX + 207, startY + 3 * 4 - 0.5);
      ctx.stroke();

      // Row line after row 6 (Age 6)
      ctx.beginPath();
      ctx.moveTo(startX, startY + 6 * 4 - 0.5);
      ctx.lineTo(startX + 207, startY + 6 * 4 - 0.5);
      ctx.stroke();

      // Row line after row 13 (Age 13)
      ctx.beginPath();
      ctx.moveTo(startX, startY + 13 * 4 - 0.5);
      ctx.lineTo(startX + 207, startY + 13 * 4 - 0.5);
      ctx.stroke();

      ctx.setLineDash([]); // Reset dash
    },

    drawMarriageHeart: function() {
      var ctx = this.setupCanvas('canvas-marriage', 363, 100);
      if (!ctx) return;

      var colors = this.getThemeColors();
      ctx.clearRect(0, 0, 363, 100);

      var cx = 180;
      var cy = 34;

      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 3.5;
      ctx.fillStyle = colors.bg;

      // Draw heart shape using cubic bezier curves
      ctx.beginPath();
      ctx.moveTo(cx, cy + 12);
      ctx.bezierCurveTo(cx - 22, cy - 15, cx - 35, cy + 8, cx, cy + 32);
      ctx.bezierCurveTo(cx + 35, cy + 8, cx + 22, cy - 15, cx, cy + 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Add small pixel sparkles around the heart for e-ink charm
      ctx.fillStyle = colors.text;
      // Star 1
      ctx.fillRect(cx - 40, cy - 8, 2, 2);
      ctx.fillRect(cx - 41, cy - 7, 4, 1);
      ctx.fillRect(cx - 40, cy - 9, 1, 4);
      // Star 2
      ctx.fillRect(cx + 38, cy + 20, 2, 2);
      ctx.fillRect(cx + 37, cy + 21, 4, 1);
    },

    drawWritingBooks: function(totalWords) {
      var ctx = this.setupCanvas('canvas-writing', 363, 90);
      if (!ctx) return;

      var colors = this.getThemeColors();
      ctx.clearRect(0, 0, 363, 90);

      // 1 book spine = 100,000 words.
      var booksCount = Math.floor(totalWords / 100000);
      if (booksCount < 1 && totalWords > 0) booksCount = 1;
      
      var shelfY = 78;
      var startX = 40;

      // Draw shelf line
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(20, shelfY);
      ctx.lineTo(343, shelfY);
      ctx.stroke();

      // Draw brackets
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(30, shelfY);
      ctx.lineTo(26, shelfY + 10);
      ctx.moveTo(333, shelfY);
      ctx.lineTo(337, shelfY + 10);
      ctx.stroke();

      var bookWidth = 9;
      var spacing = 11;

      for (var i = 0; i < booksCount; i++) {
        var h = 38 + (i % 4) * 5; // varying heights
        var bx = startX + i * spacing;

        if (bx > 320) {
          // Leaning books at the end
          var angle = 20 * Math.PI / 180;
          ctx.save();
          ctx.translate(bx, shelfY);
          ctx.rotate(angle);
          
          ctx.fillStyle = colors.bg;
          ctx.fillRect(0, -h, bookWidth, h);
          ctx.strokeStyle = colors.border;
          ctx.lineWidth = 1;
          ctx.strokeRect(0, -h, bookWidth, h);

          // Draw stripe on book
          ctx.beginPath();
          ctx.moveTo(3, -h + 6);
          ctx.lineTo(3, -6);
          ctx.stroke();

          ctx.restore();
          break;
        }

        ctx.fillStyle = colors.bg;
        ctx.fillRect(bx, shelfY - h, bookWidth, h);
        
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, shelfY - h, bookWidth, h);

        // Pattern designs on spine
        ctx.fillStyle = colors.text;
        ctx.strokeStyle = colors.text;
        ctx.lineWidth = 1;

        if (i % 3 === 0) {
          // Horizontal double bands
          ctx.fillRect(bx + 1, shelfY - h + 5, bookWidth - 2, 3);
          ctx.fillRect(bx + 1, shelfY - 10, bookWidth - 2, 3);
        } else if (i % 3 === 1) {
          // Ladder pattern
          ctx.beginPath();
          for (var sy = shelfY - h + 5; sy < shelfY - 7; sy += 5) {
            ctx.moveTo(bx + 2, sy);
            ctx.lineTo(bx + bookWidth - 2, sy);
          }
          ctx.stroke();
        } else {
          // Solid spine with white label
          ctx.fillRect(bx + 1, shelfY - h + 1, bookWidth - 2, h - 2);
          ctx.fillStyle = colors.bg;
          ctx.fillRect(bx + 2.5, shelfY - h + 8, bookWidth - 5, h - 16);
        }
      }
    },

    drawCosmicOrbits: function() {
      var ctx = this.setupCanvas('canvas-cosmic', 140, 120);
      if (!ctx) return;

      var colors = this.getThemeColors();
      ctx.clearRect(0, 0, 140, 120);

      // Draw sleeping crescent moon with a nightcap, floating in a starry sky with a ringed Saturn planet.
      // 1. Crescent Moon outline
      ctx.fillStyle = colors.text;
      ctx.beginPath();
      ctx.arc(88, 62, 28, 0, 2 * Math.PI);
      ctx.fill();

      // Mask circle to create crescent shape
      ctx.fillStyle = colors.bg;
      ctx.beginPath();
      ctx.arc(77, 62, 28, 0, 2 * Math.PI);
      ctx.fill();

      // Draw outer crescent stroke
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 1.75;
      ctx.beginPath();
      ctx.arc(88, 62, 28, -Math.PI / 2, Math.PI / 2);
      ctx.arc(77, 62, 28, Math.PI / 2, -Math.PI / 2, true);
      ctx.stroke();

      // 2. Closed sleeping eye on the moon
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.arc(89, 64, 3.5, 0, Math.PI);
      ctx.stroke();
      
      // Eyelashes
      ctx.beginPath();
      ctx.moveTo(86.5, 65.5); ctx.lineTo(84.5, 68);
      ctx.moveTo(91.5, 65.5); ctx.lineTo(93.5, 68);
      ctx.stroke();

      // 3. Draping nightcap on moon's top point
      ctx.fillStyle = colors.bg;
      ctx.beginPath();
      ctx.moveTo(80, 36);
      ctx.lineTo(96, 40);
      ctx.lineTo(66, 52); // draping tip
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Pom-pom at nightcap tip
      ctx.fillStyle = colors.text;
      ctx.beginPath();
      ctx.arc(66, 52, 3.5, 0, 2 * Math.PI);
      ctx.fill();

      // 4. Ringed planet (Saturn) in bottom-left
      var px = 28, py = 80, pr = 7;
      ctx.fillStyle = colors.bg;
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 1.75;
      
      // Ring under planet
      ctx.beginPath();
      ctx.ellipse(px, py, 14, 3.5, -20 * Math.PI / 180, 0.9 * Math.PI, 1.9 * Math.PI);
      ctx.stroke();

      // Planet sphere
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      // Ring over planet
      ctx.beginPath();
      ctx.ellipse(px, py, 14, 3.5, -20 * Math.PI / 180, -0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();

      // 5. Star sparkles
      drawSparkle(ctx, 32, 28, colors);
      drawSparkle(ctx, 115, 30, colors);
      drawSparkle(ctx, 72, 18, colors);
      drawSparkle(ctx, 118, 92, colors);
      
      function drawSparkle(c, x, y, col) {
        c.strokeStyle = col.border;
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(x - 3.5, y); c.lineTo(x + 3.5, y);
        c.moveTo(x, y - 3.5); c.lineTo(x, y + 3.5);
        c.stroke();
        c.fillStyle = col.text;
        c.fillRect(x - 0.5, y - 0.5, 2, 2);
      }
    }
  };

  // Register plugin
  window.Plugins = window.Plugins || {};
  window.Plugins.stats = StatsPlugin;

})();
