/**
 * Laundry Cost Calculator Plugin for TRMNL Dashboard
 * Calculates cycle costs for the Electrolux EW2F3048C1 front-loading washing machine
 * using live hourly spot electricity prices in Finland (porssisahko.net API).
 */

(function() {
  'use strict';

  var LaundryPlugin = {
    id: 'laundry',
    name: 'Laundry Cost',
    config: {},
    container: null,

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
    },

    render: function(element) {
      this.container = element;
      this.container.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100%;font-family:var(--font-mono);font-size:16px;">RETRIEVING FINNISH SPOT ELECTRICITY PRICES...</div>';
    },

    formatCost: function(cents) {
      if (cents >= 100) {
        return (cents / 100).toFixed(2) + ' €';
      }
      return cents.toFixed(1) + ' ¢';
    },

    getPriceRating: function(price) {
      if (price < 3.0) return "VERY CHEAP";
      if (price < 8.0) return "CHEAP";
      if (price < 15.0) return "MODERATE";
      if (price < 25.0) return "EXPENSIVE";
      return "VERY HIGH";
    },

    update: function() {
      var self = this;
      var url = "https://api.porssisahko.net/v2/latest-prices.json";

      fetch(url)
        .then(function(res) {
          if (!res.ok) throw new Error("HTTP error " + res.status);
          return res.json();
        })
        .then(function(data) {
          if (data && data.prices) {
            // Save to cache
            localStorage.setItem('trmnl_cache_laundry_prices', JSON.stringify(data.prices));
            localStorage.setItem('trmnl_cache_laundry_updated', new Date().toISOString());
            self.renderData(data.prices, false);
          } else {
            throw new Error("Invalid API payload");
          }
        })
        .catch(function(err) {
          console.warn("Porssisahko fetch failed, attempting cache recovery:", err);
          try {
            var cachedPrices = localStorage.getItem('trmnl_cache_laundry_prices');
            if (cachedPrices) {
              self.renderData(JSON.parse(cachedPrices), true);
            } else {
              self.renderFallback();
            }
          } catch (e) {
            self.renderFallback();
          }
        });
    },

    renderData: function(prices, isCached) {
      if (!this.container) return;

      var now = new Date();
      var currentPrice = 6.5; // fallback default
      var matched = false;

      // Find current spot price
      for (var i = 0; i < prices.length; i++) {
        var start = new Date(prices[i].startDate);
        var end = new Date(prices[i].endDate);
        if (now >= start && now <= end) {
          currentPrice = prices[i].price;
          matched = true;
          break;
        }
      }

      // If no exact match (time drift / upcoming window), find the first one in the list
      if (!matched && prices.length > 0) {
        currentPrice = prices[0].price;
      }

      var rating = this.getPriceRating(currentPrice);

      // Build layouts
      var html = '<div style="display:flex; flex-direction:column; height:100%; justify-content:space-between; box-sizing:border-box;">';

      // 1. TOP RATE HEADER BANNER WITH LOCAL REFRESH & CALCULATION DESCRIPTION
      html += '  <div class="trmnl-card" style="padding: 8px 16px; display: flex; justify-content: space-between; align-items: center; height: 52px; box-sizing: border-box; margin-bottom: 6px;">';
      html += '    <div>';
      html += '      <div style="font-family: var(--font-mono); font-size: 11px; font-weight: 700; opacity: 0.6; letter-spacing: 0.05em; line-height: 1.1;">ELECTROLUX EW2F3048C1</div>';
      html += '      <div style="font-family: var(--font-mono); font-size: 8.5px; opacity: 0.5; margin-top: 2px;">* COSTS CALCULATED AT CURRENT SPOT RATE</div>';
      html += '    </div>';
      html += '    <div style="display: flex; align-items: center; gap: 8px;">';
      html += '      <div style="font-family: var(--font-mono); font-size: 12px; font-weight: 700; text-align: right;">';
      html += '        SPOT: <span style="font-size: 15px; font-weight: 800; font-family: var(--font-sans);">' + currentPrice.toFixed(2) + ' ¢/kWh</span> (' + rating + ')';
      html += '      </div>';
      html += '      <button id="laundry-refresh-btn" style="position: relative; z-index: 10000; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 4px; border-radius: 4px; border: 1.5px solid var(--border-color); background: transparent; color: var(--text-color); outline: none;" title="Refresh Prices">';
      html += '        <svg style="width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-width: 2.5;" viewBox="0 0 24 24"><path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>';
      html += '      </button>';
      html += '    </div>';
      html += '  </div>';

      // 2. TWO-COLUMN PROGRAMME GRID
      html += '  <div class="trmnl-card" style="flex: 1; padding: 12px 16px; box-sizing: border-box; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-start; max-height: 420px; margin-bottom: 4px;">';
      html += '    <div class="grid-row" style="height: 100%; display: flex;">';
      
      var selfRef = this;
      var mid = Math.ceil(this.programmes.length / 2);
      var col1Html = '';
      var col2Html = '';

      this.programmes.forEach(function(prog, idx) {
        var costNow = prog.energy * currentPrice;
        
        var itemHtml = '<div style="font-family: var(--font-mono); font-size: 12px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed rgba(0,0,0,0.1); padding: 8px 0;">' +
                       '  <span style="font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;">' + prog.name + ' <span style="font-weight: 400; opacity: 0.6; font-size: 10px;">(' + prog.time + ')</span></span>' +
                       '  <span style="font-weight: 800; font-size: 13px; text-align: right; margin-left: 12px;">' + selfRef.formatCost(costNow) + '</span>' +
                       '</div>';
                       
        if (idx < mid) {
          col1Html += itemHtml;
        } else {
          col2Html += itemHtml;
        }
      });

      // Left Column
      html += '      <div class="grid-col col-1" style="display: flex; flex-direction: column; justify-content: space-between; padding-right: 16px; border-right: 1.5px dashed var(--border-color); height: 100%; box-sizing: border-box;">';
      html += col1Html;
      html += '      </div>';

      // Right Column
      html += '      <div class="grid-col col-1" style="display: flex; flex-direction: column; justify-content: space-between; padding-left: 16px; height: 100%; box-sizing: border-box;">';
      html += col2Html;
      html += '      </div>';

      html += '    </div>';
      html += '  </div>';

      // 3. FOOTER
      var sourceLabel = isCached ? "OFFLINE CACHE" : "LIVE SPOT PRICE";
      var nowHours = now.getHours();
      var nowMins = now.getMinutes();
      nowMins = nowMins < 10 ? '0' + nowMins : nowMins;
      var nowTime = nowHours + ':' + nowMins;

      html += '  <div class="trmnl-footer-bar">';
      html += '    <div class="trmnl-footer-badge">';
      html += '      <svg viewBox="0 0 24 24" style="width:14px; height:14px; stroke:var(--text-color); fill:none; stroke-width:2.5;"><rect x="4" y="2" width="16" height="20" rx="2"></rect><circle cx="12" cy="14" r="5"></circle><line x1="8" y1="6" x2="16" y2="6"></line></svg>';
      html += '      <span>Laundry Cost</span>';
      html += '    </div>';
      html += '    <div class="trmnl-footer-meta">NORD POOL FI (' + sourceLabel + ') - ' + nowTime + '</div>';
      html += '  </div>';

      html += '</div>';

      this.container.innerHTML = html;

      // Bind local refresh action
      var refreshBtn = this.container.querySelector('#laundry-refresh-btn');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          refreshBtn.disabled = true;
          refreshBtn.style.opacity = '0.5';
          var svg = refreshBtn.querySelector('svg');
          if (svg) {
            svg.style.transition = 'transform 0.8s ease-in-out';
            svg.style.transform = 'rotate(360deg)';
          }
          selfRef.update();
        });
      }
    },

    renderFallback: function() {
      if (!this.container) return;

      var now = new Date();
      var defaultPrice = 6.5; // fallback default
      var rating = this.getPriceRating(defaultPrice);

      // Build layouts
      var html = '<div style="display:flex; flex-direction:column; height:100%; justify-content:space-between; box-sizing:border-box;">';

      // 1. TOP RATE HEADER BANNER WITH LOCAL REFRESH & CALCULATION DESCRIPTION
      html += '  <div class="trmnl-card" style="padding: 8px 16px; display: flex; justify-content: space-between; align-items: center; height: 52px; box-sizing: border-box; margin-bottom: 6px;">';
      html += '    <div>';
      html += '      <div style="font-family: var(--font-mono); font-size: 11px; font-weight: 700; opacity: 0.6; letter-spacing: 0.05em; line-height: 1.1;">ELECTROLUX EW2F3048C1 (OFFLINE)</div>';
      html += '      <div style="font-family: var(--font-mono); font-size: 8.5px; opacity: 0.5; margin-top: 2px;">* COSTS CALCULATED AT OFFLINE RATE</div>';
      html += '    </div>';
      html += '    <div style="display: flex; align-items: center; gap: 8px;">';
      html += '      <div style="font-family: var(--font-mono); font-size: 12px; font-weight: 700; text-align: right;">';
      html += '        EST: <span style="font-size: 15px; font-weight: 800; font-family: var(--font-sans);">' + defaultPrice.toFixed(2) + ' ¢/kWh</span> (' + rating + ')';
      html += '      </div>';
      html += '      <button id="laundry-refresh-btn" style="position: relative; z-index: 10000; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 4px; border-radius: 4px; border: 1.5px solid var(--border-color); background: transparent; color: var(--text-color); outline: none;" title="Refresh Prices">';
      html += '        <svg style="width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-width: 2.5;" viewBox="0 0 24 24"><path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>';
      html += '      </button>';
      html += '    </div>';
      html += '  </div>';

      // 2. TWO-COLUMN PROGRAMME GRID
      html += '  <div class="trmnl-card" style="flex: 1; padding: 12px 16px; box-sizing: border-box; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-start; max-height: 420px; margin-bottom: 4px;">';
      html += '    <div class="grid-row" style="height: 100%; display: flex;">';
      
      var selfRef = this;
      var mid = Math.ceil(this.programmes.length / 2);
      var col1Html = '';
      var col2Html = '';

      this.programmes.forEach(function(prog, idx) {
        var costNow = prog.energy * defaultPrice;
        
        var itemHtml = '<div style="font-family: var(--font-mono); font-size: 12px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed rgba(0,0,0,0.1); padding: 8px 0;">' +
                       '  <span style="font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;">' + prog.name + ' <span style="font-weight: 400; opacity: 0.6; font-size: 10px;">(' + prog.time + ')</span></span>' +
                       '  <span style="font-weight: 800; font-size: 13px; text-align: right; margin-left: 12px;">' + selfRef.formatCost(costNow) + '</span>' +
                       '</div>';
                       
        if (idx < mid) {
          col1Html += itemHtml;
        } else {
          col2Html += itemHtml;
        }
      });

      // Left Column
      html += '      <div class="grid-col col-1" style="display: flex; flex-direction: column; justify-content: space-between; padding-right: 16px; border-right: 1.5px dashed var(--border-color); height: 100%; box-sizing: border-box;">';
      html += col1Html;
      html += '      </div>';

      // Right Column
      html += '      <div class="grid-col col-1" style="display: flex; flex-direction: column; justify-content: space-between; padding-left: 16px; height: 100%; box-sizing: border-box;">';
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
      html += '      <svg viewBox="0 0 24 24" style="width:14px; height:14px; stroke:var(--text-color); fill:none; stroke-width:2.5;"><rect x="4" y="2" width="16" height="20" rx="2"></rect><circle cx="12" cy="14" r="5"></circle><line x1="8" y1="6" x2="16" y2="6"></line></svg>';
      html += '      <span>Laundry Cost</span>';
      html += '    </div>';
      html += '    <div class="trmnl-footer-meta">NORD POOL FI (OFFLINE) - ' + nowTime + '</div>';
      html += '  </div>';

      html += '</div>';

      this.container.innerHTML = html;

      // Bind local refresh action
      var refreshBtn = this.container.querySelector('#laundry-refresh-btn');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          refreshBtn.disabled = true;
          refreshBtn.style.opacity = '0.5';
          var svg = refreshBtn.querySelector('svg');
          if (svg) {
            svg.style.transition = 'transform 0.8s ease-in-out';
            svg.style.transform = 'rotate(360deg)';
          }
          selfRef.update();
        });
      }
    }
  };

  // Register plugin
  window.Plugins = window.Plugins || {};
  window.Plugins.laundry = LaundryPlugin;

})();
