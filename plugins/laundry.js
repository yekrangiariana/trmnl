/**
 * Laundry Cost Calculator Plugin for TRMNL Dashboard
 * Calculates cycle costs for the Electrolux EW2F3048C1 front-loading washing machine (8kg)
 * using local price tiers and manual rate adjustment. Offline-friendly, zero external API dependencies.
 */

(function() {
  'use strict';

  var LaundryPlugin = {
    id: 'laundry',
    name: 'Laundry Cost',
    config: {},
    container: null,
    
    // State
    currentPrice: 0.16, // Default rate in Euro per kWh

    // Manufacturer programme specifications for Electrolux EW2F3048C1 (8kg)
    programmes: [
      { name: "Eco 40-60", energy: 0.47, time: "3h 25m" },
      { name: "Cottons 60°", energy: 1.40, time: "2h 50m" },
      { name: "Cottons 40°", energy: 0.90, time: "2h 45m" },
      { name: "Cottons 90°", energy: 2.20, time: "3h 05m" },
      { name: "Synthetics 40°", energy: 0.60, time: "2h 00m" },
      { name: "Delicates 30°", energy: 0.35, time: "1h 10m" },
      { name: "Wool/Silk 30°", energy: 0.30, time: "1h 05m" },
      { name: "Quick 30m (30°)", energy: 0.30, time: "30m" },
      { name: "Quick 14m (30°)", energy: 0.15, time: "14m" },
      { name: "Anti-Allergy", energy: 1.80, time: "3h 10m" }
    ],

    init: function(pluginConfig) {
      this.config = pluginConfig || {};
      this.loadPrice();
    },

    render: function(element) {
      this.container = element;
      this.renderCalculator();
    },

    update: function() {
      this.loadPrice();
      this.renderCalculator();
    },

    loadPrice: function() {
      try {
        var saved = localStorage.getItem('trmnl_laundry_price');
        if (saved) {
          this.currentPrice = parseFloat(saved);
        } else {
          this.currentPrice = 0.16;
        }
      } catch (e) {
        this.currentPrice = 0.16;
      }
    },

    savePrice: function(price) {
      this.currentPrice = Math.max(0.01, parseFloat(price.toFixed(2)));
      try {
        localStorage.setItem('trmnl_laundry_price', this.currentPrice.toString());
      } catch (e) {
        console.warn("Failed to save laundry price:", e);
      }
    },

    formatCost: function(kwh) {
      var cost = kwh * this.currentPrice;
      return cost.toFixed(2) + ' €';
    },

    renderCalculator: function() {
      if (!this.container) return;

      var self = this;
      var now = new Date();

      var btnStyle = 'cursor: pointer; font-family: var(--font-mono); font-size: 12px; font-weight: 800; border: var(--border-width-thin) solid var(--border-color); background: transparent; color: var(--text-color); padding: 5px 11px; border-radius: 4px; outline: none;';
      var activeBtnStyle = 'cursor: pointer; font-family: var(--font-mono); font-size: 12px; font-weight: 800; border: var(--border-width-thin) solid var(--border-color); background: var(--text-color); color: var(--bg-color); padding: 5px 11px; border-radius: 4px; outline: none;';
      var adjustStyle = 'cursor: pointer; font-family: var(--font-mono); font-size: 18px; font-weight: 800; border: var(--border-width-thin) solid var(--border-color); background: transparent; color: var(--text-color); width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 4px; outline: none;';

      // Preset checks
      var isOffpeak = Math.abs(this.currentPrice - 0.06) < 0.005;
      var isStandard = Math.abs(this.currentPrice - 0.16) < 0.005;
      var isPeak = Math.abs(this.currentPrice - 0.36) < 0.005;

      var html = '<div style="display:flex; flex-direction:column; height:100%; justify-content:space-between; box-sizing:border-box;">';

      // 1. TOP RATE HEADER BANNER WITH LOCAL ADJUSTERS
      html += '  <div class="trmnl-card" style="padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; height: 62px; box-sizing: border-box; margin-bottom: 8px;">';
      html += '    <div>';
      html += '      <div style="font-family: var(--font-mono); font-size: 17px; font-weight: 800; letter-spacing: 0.03em; line-height: 1.1;">ELECTROLUX EW2F3048C1</div>';
      html += '    </div>';
      
      html += '    <div style="display: flex; align-items: center;">';
      
      // Presets
      html += '      <div style="display: flex; margin-right: 16px;">';
      html += '        <button id="laundry-preset-offpeak" style="' + (isOffpeak ? activeBtnStyle : btnStyle) + ' margin-right: 6px;">OFF-PEAK</button>';
      html += '        <button id="laundry-preset-standard" style="' + (isStandard ? activeBtnStyle : btnStyle) + ' margin-right: 6px;">STANDARD</button>';
      html += '        <button id="laundry-preset-peak" style="' + (isPeak ? activeBtnStyle : btnStyle) + '">PEAK</button>';
      html += '      </div>';

      // Adjuster buttons
      html += '      <div style="display: flex; align-items: center; font-family: var(--font-mono); font-size: 15px; font-weight: 800;">';
      html += '        <span style="margin-right: 10px;">RATE:</span>';
      html += '        <button id="laundry-price-minus" style="' + adjustStyle + ' margin-right: 10px;">-</button>';
      html += '        <span id="laundry-price-val" style="font-family: var(--font-sans); font-size: 22px; font-weight: 800; min-width: 75px; text-align: center; margin-right: 10px;">' + this.currentPrice.toFixed(2) + ' €</span>';
      html += '        <button id="laundry-price-plus" style="' + adjustStyle + '">+</button>';
      html += '      </div>';
      
      html += '    </div>';
      html += '  </div>';

      // 2. TWO-COLUMN PROGRAMME GRID (STRETCHED)
      html += '  <div class="trmnl-card" style="flex: 1; padding: 18px 24px; box-sizing: border-box; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-start; margin-bottom: 8px;">';
      html += '    <div class="grid-row" style="height: 100%; display: flex;">';
      
      var mid = Math.ceil(this.programmes.length / 2);
      var col1Html = '';
      var col2Html = '';

      this.programmes.forEach(function(prog, idx) {
        var costStr = self.formatCost(prog.energy);
        
        var itemHtml = '<div style="font-family: var(--font-mono); font-size: 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: var(--border-width-thin) dashed var(--border-color); padding: 14px 0;">' +
                       '  <span style="font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; letter-spacing: -0.02em;">' + prog.name + ' <span style="font-weight: 500; opacity: 0.6; font-size: 12px;">(' + prog.time + ')</span></span>' +
                       '  <span style="font-weight: 800; font-size: 20px; text-align: right; margin-left: 12px;">' + costStr + '</span>' +
                       '</div>';
                       
        if (idx < mid) {
          col1Html += itemHtml;
        } else {
          col2Html += itemHtml;
        }
      });

      // Left Column
      html += '      <div class="grid-col col-1" style="display: flex; flex-direction: column; justify-content: space-between; padding-right: 24px; border-right: var(--border-width-thin) dashed var(--border-color); height: 100%; box-sizing: border-box; margin-right: 0 !important;">';
      html += col1Html;
      html += '      </div>';

      // Right Column
      html += '      <div class="grid-col col-1" style="display: flex; flex-direction: column; justify-content: space-between; padding-left: 24px; height: 100%; box-sizing: border-box; margin-right: 0 !important;">';
      html += col2Html;
      html += '      </div>';

      html += '    </div>';
      html += '  </div>';

      // 3. FOOTER
      var nowHours = now.getHours();
      var nowMins = now.getMinutes();
      nowMins = nowMins < 10 ? '0' + nowMins : nowMins;
      var nowTime = nowHours + ':' + nowMins;

      html += '  <div class="trmnl-footer-bar">';
      html += '    <div class="trmnl-footer-badge">';
      html += '      <svg viewBox="0 0 24 24" style="width:14px; height:14px; stroke:var(--text-color); fill:none; stroke-width:2.5; vertical-align:middle; flex-shrink:0;"><rect x="4" y="2" width="16" height="20" rx="2"></rect><circle cx="12" cy="14" r="5"></circle><line x1="8" y1="6" x2="16" y2="6"></line></svg>';
      html += '      <span>Laundry Cost</span>';
      html += '    </div>';
      html += '    <div class="trmnl-footer-meta">CALCULATOR (LOCAL RATE) - ' + nowTime + '</div>';
      html += '  </div>';

      html += '</div>';

      this.container.innerHTML = html;

      // Event Bindings
      this.bindActions();
    },

    bindActions: function() {
      var self = this;
      
      // Presets
      var btnOffpeak = this.container.querySelector('#laundry-preset-offpeak');
      var btnStandard = this.container.querySelector('#laundry-preset-standard');
      var btnPeak = this.container.querySelector('#laundry-preset-peak');
      
      if (btnOffpeak) {
        btnOffpeak.addEventListener('click', function(e) {
          e.stopPropagation();
          self.savePrice(0.06);
          self.renderCalculator();
        });
      }
      if (btnStandard) {
        btnStandard.addEventListener('click', function(e) {
          e.stopPropagation();
          self.savePrice(0.16);
          self.renderCalculator();
        });
      }
      if (btnPeak) {
        btnPeak.addEventListener('click', function(e) {
          e.stopPropagation();
          self.savePrice(0.36);
          self.renderCalculator();
        });
      }

      // Plus/Minus
      var btnMinus = this.container.querySelector('#laundry-price-minus');
      var btnPlus = this.container.querySelector('#laundry-price-plus');
      
      if (btnMinus) {
        btnMinus.addEventListener('click', function(e) {
          e.stopPropagation();
          self.savePrice(self.currentPrice - 0.01);
          self.renderCalculator();
        });
      }
      if (btnPlus) {
        btnPlus.addEventListener('click', function(e) {
          e.stopPropagation();
          self.savePrice(self.currentPrice + 0.01);
          self.renderCalculator();
        });
      }
    }
  };

  // Register plugin
  window.Plugins = window.Plugins || {};
  window.Plugins.laundry = LaundryPlugin;

})();
