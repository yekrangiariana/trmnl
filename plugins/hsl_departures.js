/**
 * HSL Live Departures Plugin for TRMNL Dashboard
 * Uses:
 *  - Nominatim (OpenStreetMap) for free geocoding of address/neighbourhood
 *  - Digitransit GraphQL API for stop discovery and live departures
 *    (requires a free API key from portal-api.digitransit.fi)
 */

(function() {
  'use strict';

  // Free geocoding: handles neighbourhood names AND street addresses
  var NOMINATIM_API = 'https://nominatim.openstreetmap.org/search';
  // HSL routing v2 — GraphQL (requires digitransit-subscription-key header)
  var ROUTING_API   = 'https://api.digitransit.fi/routing/v2/hsl/gtfs/v1';

  var HSLPlugin = {
    id: 'hsl',
    name: 'HSL Departures',
    config: {},
    container: null,

    init: function(pluginConfig) {
      this.config = pluginConfig || {};
    },

    render: function(element) {
      this.container = element;
      var cfg = this.getActiveConfig();
      var neighbourhood = (cfg.hslNeighbourhood || this.config.hslNeighbourhood || 'Kallio').trim();
      var hasRendered = this.loadFromDeparturesCache(neighbourhood);
      this.fetchDepartures(hasRendered);
    },

    update: function() {
      var activeConfig = window.Dashboard ? window.Dashboard.getActiveConfig() : this.config;
      this.config = Object.assign({}, this.config, activeConfig);
      var cfg = this.getActiveConfig();
      var neighbourhood = (cfg.hslNeighbourhood || this.config.hslNeighbourhood || 'Kallio').trim();
      var hasRendered = this.loadFromDeparturesCache(neighbourhood);
      this.fetchDepartures(hasRendered);
    },

    // ── Helpers ────────────────────────────────────────────────────────────────
    getActiveConfig: function() {
      return window.Dashboard ? window.Dashboard.getActiveConfig() : this.config;
    },

    getApiKey: function() {
      var cfg = this.getActiveConfig();
      return (cfg.digitransitApiKey || this.config.digitransitApiKey || '').trim();
    },

    routingHeaders: function() {
      var key = this.getApiKey();
      var h = { 'Content-Type': 'application/json' };
      if (key) h['digitransit-subscription-key'] = key;
      return h;
    },

    formatTime: function(unixTs) {
      var d = new Date(unixTs * 1000);
      return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    },

    formatDelay: function(delaySec) {
      if (Math.abs(delaySec) < 45) return null;
      var mins = Math.round(delaySec / 60);
      return (mins > 0 ? '+' : '') + mins + 'min';
    },

    modeIcon: function(mode) {
      var icons = {
        BUS:    '<svg style="width:16px;height:16px;fill:var(--text-color);vertical-align:middle;flex-shrink:0;" viewBox="0 0 24 24"><path d="M17 20H7v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-1H3V6c0-2.21 3.58-4 8-4s8 1.79 8 4v14h-1v1a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1zM5 13h14v-2H5v2zm0 4h14v-2H5v2zM5 7v2h14V7H5z"/></svg>',
        TRAM:   '<svg style="width:16px;height:16px;fill:var(--text-color);vertical-align:middle;flex-shrink:0;" viewBox="0 0 24 24"><path d="M12 2C8.69 2 4 2.5 4 6v9l2 3v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h6v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1l2-3V6c0-3.5-4.69-4-8-4zm4 12H8v-4h8v4zm0-6H8V6h8v2z"/></svg>',
        SUBWAY: '<svg style="width:16px;height:16px;fill:var(--text-color);vertical-align:middle;flex-shrink:0;" viewBox="0 0 24 24"><path d="M4 15.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h12v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V5c0-3.5-3.58-4-8-4s-8 .5-8 4v10.5zm8 1.5c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm6-7H6V5h12v5z"/></svg>',
        RAIL:   '<svg style="width:16px;height:16px;fill:var(--text-color);vertical-align:middle;flex-shrink:0;" viewBox="0 0 24 24"><path d="M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5V21h12v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-4-4-8-4zm0 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm5-8H7V6h10v2z"/></svg>',
        FERRY:  '<svg style="width:16px;height:16px;fill:var(--text-color);vertical-align:middle;flex-shrink:0;" viewBox="0 0 24 24"><path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.64 2.62.99 4 .99h2v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.78s-.34-.42-.6-.5L20 10.62V6c0-1.1-.9-2-2-2h-3V1H9v3H6c-1.1 0-2 .9-2 2v4.62l-1.29.42c-.26.08-.48.26-.6.5s-.15.52-.06.78L3.95 19z"/></svg>',
      };
      return icons[mode] || icons['BUS'];
    },

    footerHtml: function(neighbourhood, meta) {
      return '  <div class="trmnl-footer-bar">' +
        '    <div class="trmnl-footer-badge">' +
        '      <svg viewBox="0 0 24 24"><path d="M4 15.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h12v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V5c0-3.5-3.58-4-8-4s-8 .5-8 4v10.5zm8 1.5c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm6-7H6V5h12v5z"/></svg>' +
        '      <span>HSL Live</span>' +
        '    </div>' +
        '    <div class="trmnl-footer-meta">' + (neighbourhood ? neighbourhood.toUpperCase() + ' &nbsp;·&nbsp; ' : '') + (meta || '') + '</div>' +
        '  </div>';
    },

    loadFromDeparturesCache: function(neighbourhood) {
      var cachedStr = localStorage.getItem('trmnl_hsl_departures_cache');
      if (cachedStr) {
        try {
          var cached = JSON.parse(cachedStr);
          if (cached && cached.neighbourhood === neighbourhood && cached.departures) {
            this.drawDepartures(cached.departures, neighbourhood, Math.floor(Date.now() / 1000), true);
            return true;
          }
        } catch (e) {
          console.warn("Failed to load departures from cache:", e);
        }
      }
      return false;
    },

    // ── Entry point ────────────────────────────────────────────────────────────
    fetchDepartures: function(silent) {
      if (!this.container) return;
      if (!navigator.onLine) {
        if (!silent) {
          this.drawOffline();
        }
        return;
      }

      var self = this;
      var cfg = this.getActiveConfig();
      var neighbourhood = (cfg.hslNeighbourhood || this.config.hslNeighbourhood || 'Kallio').trim();
      var radius = parseInt(cfg.hslRadius || this.config.hslRadius || 700, 10);
      var apiKey = this.getApiKey();

      if (!silent) {
        this.drawLoading(neighbourhood);
      }

      if (!apiKey) {
        this.drawNoKey(neighbourhood);
        return;
      }

      var stopCacheStr = localStorage.getItem('trmnl_hsl_stop_cache');
      if (stopCacheStr) {
        try {
          var stopCache = JSON.parse(stopCacheStr);
          if (stopCache && stopCache.neighbourhood === neighbourhood && stopCache.radius === radius && stopCache.stopIds && stopCache.stopIds.length > 0) {
            self.fetchStopDepartures(stopCache.stopIds, neighbourhood);
            return;
          }
        } catch (e) {
          console.warn("Failed parsing HSL stop cache:", e);
        }
      }

      // Step 1: Geocode via Nominatim (free, no key needed)
      // Append ", Helsinki" to bias results to the right city
      var query = neighbourhood;
      if (!/helsinki|espoo|vantaa|hsl|finland|suomi/i.test(query)) {
        query = query + ', Helsinki';
      }

      var geoUrl = NOMINATIM_API +
        '?q=' + encodeURIComponent(query) +
        '&format=json&limit=1&countrycodes=fi' +
        '&accept-language=fi';

      fetch(geoUrl)
      .then(function(res) {
        if (!res.ok) throw new Error('Geocoding error: HTTP ' + res.status);
        return res.json();
      })
      .then(function(results) {
        if (!results || results.length === 0) {
          throw new Error('"' + neighbourhood + '" not found.\nTry a more specific name like "Suvelantie 14, Helsinki".');
        }
        var lat = parseFloat(results[0].lat);
        var lon = parseFloat(results[0].lon);
        var displayName = results[0].display_name || neighbourhood;
        return self.fetchNearbyStops(lat, lon, neighbourhood, displayName, radius);
      })
      .catch(function(err) {
        console.error('HSL geocoding error:', err);
        if (self.loadFromDeparturesCache(neighbourhood)) {
          return;
        }
        self.drawError(err.message);
      });
    },

    // Step 2: Find stops within custom radius via GraphQL stopsByRadius
    fetchNearbyStops: function(lat, lon, neighbourhood, displayName, radius) {
      var self = this;
      var query = '{ stopsByRadius(lat: ' + lat + ', lon: ' + lon + ', radius: ' + radius + ', first: 8) {' +
        '  edges { node { stop { gtfsId name code } distance } }' +
        '} }';

      return fetch(ROUTING_API, {
        method: 'POST',
        headers: this.routingHeaders(),
        body: JSON.stringify({ query: query })
      })
      .then(function(res) {
        if (res.status === 401) throw new Error('API key rejected (401). Check your Digitransit key in Settings.');
        if (res.status === 403) throw new Error('API key quota exceeded (403). Check your Digitransit key.');
        if (!res.ok) throw new Error('Routing API error: HTTP ' + res.status);
        return res.json();
      })
      .then(function(json) {
        var edges = (json.data && json.data.stopsByRadius && json.data.stopsByRadius.edges) || [];
        if (edges.length === 0) {
          throw new Error('No HSL stops found within ' + radius + 'm of "' + neighbourhood + '".');
        }
        var stopIds = edges.slice(0, 8).map(function(e) { return e.node.stop.gtfsId; });

        var stopCache = {
          neighbourhood: neighbourhood,
          radius: radius,
          stopIds: stopIds
        };
        try {
          localStorage.setItem('trmnl_hsl_stop_cache', JSON.stringify(stopCache));
        } catch (e) {
          console.warn("Failed to save stopCache:", e);
        }

        return self.fetchStopDepartures(stopIds, neighbourhood);
      })
      .catch(function(err) {
        console.error('HSL stops error:', err);
        if (self.loadFromDeparturesCache(neighbourhood)) {
          return;
        }
        self.drawError(err.message);
      });
    },

    // Step 3: Fetch live departures for resolved stops
    fetchStopDepartures: function(stopIds, neighbourhood) {
      var self = this;
      var fragments = stopIds.map(function(gtfsId) {
        var k = gtfsId.replace(/[^a-zA-Z0-9]/g, '_');
        return 's_' + k + ': stop(id: "' + gtfsId + '") {' +
               '  name code' +
               '  stoptimesWithoutPatterns(numberOfDepartures: 12, omitNonPickups: true) {' +
               '    scheduledDeparture realtimeDeparture realtime serviceDay headsign' +
               '    trip { route { shortName mode } }' +
               '  }' +
               '}';
      });

      return fetch(ROUTING_API, {
        method: 'POST',
        headers: this.routingHeaders(),
        body: JSON.stringify({ query: '{ ' + fragments.join(' ') + ' }' })
      })
      .then(function(res) {
        if (res.status === 401) throw new Error('API key rejected (401).');
        if (!res.ok) throw new Error('Departures API error: HTTP ' + res.status);
        return res.json();
      })
      .then(function(json) {
        if (!json.data) throw new Error('No data in response');
        var now = Math.floor(Date.now() / 1000);
        var all = [];

        Object.keys(json.data).forEach(function(key) {
          var stop = json.data[key];
          if (!stop) return;
          (stop.stoptimesWithoutPatterns || []).forEach(function(st) {
            var sched = st.serviceDay + st.scheduledDeparture;
            var real  = st.serviceDay + st.realtimeDeparture;
            all.push({
              routeShort: (st.trip && st.trip.route) ? (st.trip.route.shortName || '?') : '?',
              mode:       (st.trip && st.trip.route) ? (st.trip.route.mode || 'BUS') : 'BUS',
              headsign:   st.headsign || '',
              scheduled:  sched,
              realtime:   real,
              isRealtime: st.realtime,
              delaySec:   real - sched,
              stopName:   stop.name || '',
              stopCode:   stop.code || ''
            });
          });
        });

        all = all
          .filter(function(d) { return d.realtime >= now - 60; })
          .sort(function(a, b) { return a.realtime - b.realtime; });

        var depCache = {
          neighbourhood: neighbourhood,
          departures: all,
          timestamp: Date.now()
        };
        try {
          localStorage.setItem('trmnl_hsl_departures_cache', JSON.stringify(depCache));
        } catch (e) {
          console.warn("Failed to cache departures:", e);
        }

        self.drawDepartures(all, neighbourhood, now, false);
      })
      .catch(function(err) {
        console.error('HSL departures error:', err);
        if (self.loadFromDeparturesCache(neighbourhood)) {
          return;
        }
        self.drawError(err.message);
      });
    },

    // ── Draw states ────────────────────────────────────────────────────────────
    drawLoading: function(neighbourhood) {
      if (!this.container) return;
      this.container.innerHTML =
        '<div style="display:flex;flex-direction:column;height:100%;justify-content:space-between;padding:10px 0;">' +
        '  <div class="trmnl-card" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px;margin-bottom:16px;">' +
        '    <div style="font-family:var(--font-mono);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;opacity:0.55;margin-bottom:12px;">Finding stops near</div>' +
        '    <div style="font-family:var(--font-sans);font-size:28px;font-weight:700;">' + neighbourhood + '</div>' +
        '  </div>' +
        this.footerHtml(neighbourhood, 'LOADING...') +
        '</div>';
    },

    drawNoKey: function(neighbourhood) {
      if (!this.container) return;
      this.container.innerHTML =
        '<div style="display:flex;flex-direction:column;height:100%;justify-content:space-between;padding:10px 0;">' +
        '  <div class="trmnl-card" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;margin-bottom:16px;">' +
        '    <svg style="width:44px;height:44px;stroke:var(--text-color);stroke-width:2;fill:none;margin-bottom:20px;" viewBox="0 0 24 24"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>' +
        '    <div style="font-family:var(--font-sans);font-size:20px;font-weight:700;text-align:center;margin-bottom:12px;">Digitransit API Key Required</div>' +
        '    <div style="font-family:var(--font-mono);font-size:11px;opacity:0.65;text-align:center;line-height:1.6;max-width:480px;">' +
        '      Get a free key at<br><strong>portal-api.digitransit.fi</strong><br>' +
        '      then paste it in Settings under<br><strong>DIGITRANSIT API KEY</strong>' +
        '    </div>' +
        '  </div>' +
        this.footerHtml(neighbourhood, 'SETUP REQUIRED') +
        '</div>';
    },

    drawDepartures: function(departures, neighbourhood, now, isCached) {
      var self = this;
      var shown = departures.slice(0, 10);

      var nowDate = new Date();
      var timeStr = nowDate.getHours().toString().padStart(2, '0') + ':' +
                    nowDate.getMinutes().toString().padStart(2, '0') + ':' +
                    nowDate.getSeconds().toString().padStart(2, '0');
      if (isCached) {
        timeStr += ' (Cached)';
      }

      var html = '<div style="display:flex;flex-direction:column;height:100%;justify-content:space-between;padding:10px 0;">';
      html += '  <div class="trmnl-card" style="flex:1;overflow:hidden;padding:0;margin-bottom:16px;">';

      // Column header row
      html += '    <div style="display:flex;align-items:center;padding:12px 20px 11px;border-bottom:var(--border-width) solid var(--border-color);background-color:var(--highlight-bg);">';
      html += '      <div style="width:36px;flex-shrink:0;"></div>';
      html += '      <div style="width:64px;font-family:var(--font-mono);font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;flex-shrink:0;">Line</div>';
      html += '      <div style="flex:1;font-family:var(--font-mono);font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;">Stop / via Destination</div>';
      html += '      <div style="width:58px;text-align:center;font-family:var(--font-mono);font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;flex-shrink:0;">Sched</div>';
      html += '      <div style="width:64px;text-align:center;font-family:var(--font-mono);font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;flex-shrink:0;">Delay</div>';
      html += '      <div style="width:62px;text-align:right;font-family:var(--font-mono);font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;flex-shrink:0;">Due</div>';
      html += '    </div>';

      if (shown.length === 0) {
        html += '    <div style="display:flex;align-items:center;justify-content:center;padding:60px;font-family:var(--font-mono);font-size:15px;opacity:0.6;">No upcoming departures near ' + neighbourhood + '</div>';
      } else {
        shown.forEach(function(dep, idx) {
          var rowBg = (idx % 2 !== 0) ? 'background-color:var(--highlight-bg);' : '';
          var border = (idx < shown.length - 1) ? 'border-bottom:1px solid var(--highlight-bg);' : '';
          var delayStr = dep.isRealtime ? self.formatDelay(dep.delaySec) : null;
          var minsUntil = Math.round((dep.realtime - now) / 60);
          var dueSoon = minsUntil <= 2;
          var headsign = dep.headsign;
          if (headsign && headsign.length > 28) headsign = headsign.substring(0, 27) + '…';

          var stopInfo = dep.stopName || '';
          if (dep.stopCode) {
            stopInfo += ' (' + dep.stopCode + ')';
          }
          if (stopInfo.length > 35) {
            stopInfo = stopInfo.substring(0, 34) + '…';
          }

          html += '    <div style="display:flex;align-items:center;padding:10px 20px;' + rowBg + border + '">';
          html += '      <div style="width:36px;flex-shrink:0;display:flex;align-items:center;">' + self.modeIcon(dep.mode) + '</div>';
          html += '      <div style="width:64px;font-family:var(--font-mono);font-size:22px;font-weight:800;flex-shrink:0;letter-spacing:-0.01em;">' + dep.routeShort + '</div>';
          
          html += '      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;overflow:hidden;padding-right:10px;">';
          html += '        <div style="font-family:var(--font-sans);font-size:17px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (stopInfo || '—') + '</div>';
          html += '        <div style="font-family:var(--font-mono);font-size:11px;opacity:0.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;">' + (headsign ? 'via ' + headsign : '—') + '</div>';
          html += '      </div>';

          html += '      <div style="width:58px;text-align:center;font-family:var(--font-mono);font-size:16px;opacity:0.7;flex-shrink:0;">' + self.formatTime(dep.scheduled) + '</div>';

          if (delayStr) {
            var isLate = dep.delaySec > 0;
            var bs = isLate
              ? 'background-color:var(--text-color);color:var(--bg-color);padding:2px 6px;border-radius:4px;'
              : 'border:var(--border-width-thin) solid var(--text-color);padding:2px 5px;border-radius:4px;';
            html += '      <div style="width:64px;text-align:center;flex-shrink:0;"><span style="font-family:var(--font-mono);font-size:12px;font-weight:800;' + bs + '">' + delayStr + '</span></div>';
          } else {
            html += '      <div style="width:64px;flex-shrink:0;"></div>';
          }

          var dueText = minsUntil <= 0 ? 'now' : (minsUntil < 60 ? minsUntil + ' min' : self.formatTime(dep.realtime));
          html += '      <div style="width:62px;text-align:right;font-family:var(--font-mono);font-size:16px;flex-shrink:0;' + (dueSoon ? 'font-weight:800;' : 'opacity:0.85;') + '">' + dueText + '</div>';
          html += '    </div>';
        });
      }

      html += '  </div>';
      html += this.footerHtml(neighbourhood, timeStr);
      html += '</div>';
      this.container.innerHTML = html;
    },


    drawError: function(msg) {
      if (!this.container) return;
      this.container.innerHTML =
        '<div style="display:flex;flex-direction:column;height:100%;justify-content:space-between;padding:10px 0;">' +
        '  <div class="trmnl-card" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px;margin-bottom:16px;">' +
        '    <svg style="width:44px;height:44px;stroke:var(--text-color);stroke-width:2;fill:none;margin-bottom:16px;" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>' +
        '    <div style="font-family:var(--font-sans);font-size:18px;font-weight:700;text-align:center;">HSL Departures Unavailable</div>' +
        '    <div style="font-family:var(--font-mono);font-size:11px;opacity:0.6;margin-top:10px;text-align:center;max-width:420px;line-height:1.55;white-space:pre-line;">' + (msg || '') + '</div>' +
        '  </div>' +
        this.footerHtml('', 'ERROR') +
        '</div>';
    },

    drawOffline: function() {
      if (!this.container) return;
      this.container.innerHTML =
        '<div style="display:flex;flex-direction:column;height:100%;justify-content:space-between;padding:10px 0;">' +
        '  <div class="trmnl-card" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px;margin-bottom:16px;">' +
        '    <svg style="width:44px;height:44px;stroke:var(--text-color);stroke-width:2;fill:none;margin-bottom:16px;" viewBox="0 0 24 24"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.5M5 12.5a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"></path></svg>' +
        '    <div style="font-family:var(--font-sans);font-size:18px;font-weight:700;">Offline Mode</div>' +
        '    <div style="font-family:var(--font-mono);font-size:12px;opacity:0.6;margin-top:8px;">Live departures require network</div>' +
        '  </div>' +
        this.footerHtml('', 'OFFLINE') +
        '</div>';
    }
  };

  window.Plugins = window.Plugins || {};
  window.Plugins.hsl = HSLPlugin;

})();
