/**
 * Todoist Plugin for TRMNL Dashboard
 * Fetches active tasks from the Todoist REST API and renders them in a high-contrast e-paper format.
 * Designed for iPad Mini 2 screen compatibility (ES6 safe, no optional chaining or nullish coalescing).
 */

(function() {
  'use strict';

  var TodoistPlugin = {
    id: 'todoist',
    name: 'Todoist',
    config: {},
    container: null,
    lastUpdated: null,

    init: function(pluginConfig) {
      this.config = pluginConfig || {};
    },

    render: function(element) {
      this.container = element;
      this.container.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100%;font-family:var(--font-mono);font-size:16px;">RETRIEVING TODOIST TASKS...</div>';
    },

    update: function() {
      var self = this;
      var activeConfig = window.Dashboard ? window.Dashboard.getActiveConfig() : {};

      var apiKey = activeConfig.todoistApiKey || this.config.todoistApiKey || '';
      var filter = activeConfig.todoistFilter !== undefined ? activeConfig.todoistFilter : (this.config.todoistFilter || 'today | overdue');
      var maxTasks = activeConfig.todoistMaxTasks !== undefined ? activeConfig.todoistMaxTasks : (this.config.todoistMaxTasks || 6);

      if (!apiKey) {
        self.renderConfigureMessage();
        return;
      }

      if (!navigator.onLine) {
        self.loadFromCache(true);
        return;
      }

      var tasksUrl = 'https://api.todoist.com/api/v1/tasks';
      if (filter) {
        tasksUrl += '?filter=' + encodeURIComponent(filter);
      }

      var headers = {
        'Authorization': 'Bearer ' + apiKey
      };

      // Fetch tasks and projects in parallel
      Promise.all([
        fetch(tasksUrl, { headers: headers }).then(function(r) {
          if (!r.ok) throw new Error("Tasks fetch failed: HTTP " + r.status);
          return r.json();
        }),
        fetch('https://api.todoist.com/api/v1/projects', { headers: headers }).then(function(r) {
          if (!r.ok) throw new Error("Projects fetch failed: HTTP " + r.status);
          return r.json();
        })
      ])
      .then(function(results) {
        var tasks = results[0] ? (results[0].results || results[0]) : [];
        var projects = results[1] ? (results[1].results || results[1]) : [];

        // Save to local cache
        localStorage.setItem('trmnl_todoist_tasks_cache', JSON.stringify(tasks));
        localStorage.setItem('trmnl_todoist_projects_cache', JSON.stringify(projects));
        localStorage.setItem('trmnl_todoist_timestamp', Date.now().toString());

        self.lastUpdated = new Date();
        self.renderTasks(tasks, projects, maxTasks, false);
      })
      .catch(function(err) {
        console.error("Todoist API fetch error:", err);
        self.loadFromCache(false);
      });
    },

    loadFromCache: function(isOffline) {
      var self = this;
      var cachedTasks = localStorage.getItem('trmnl_todoist_tasks_cache');
      var cachedProjects = localStorage.getItem('trmnl_todoist_projects_cache');
      var cachedTime = localStorage.getItem('trmnl_todoist_timestamp');

      var activeConfig = window.Dashboard ? window.Dashboard.getActiveConfig() : {};
      var maxTasks = activeConfig.todoistMaxTasks !== undefined ? activeConfig.todoistMaxTasks : (this.config.todoistMaxTasks || 6);

      if (cachedTasks && cachedTime) {
        try {
          var tasks = JSON.parse(cachedTasks);
          var projects = cachedProjects ? JSON.parse(cachedProjects) : [];
          self.lastUpdated = new Date(parseInt(cachedTime, 10));
          self.renderTasks(tasks, projects, maxTasks, true);
        } catch (e) {
          self.renderError();
        }
      } else {
        if (isOffline) {
          self.renderOfflineMessage();
        } else {
          self.renderError();
        }
      }
    },

    renderConfigureMessage: function() {
      this.container.innerHTML = 
        '<div class="trmnl-card" style="height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; padding: 24px;">' +
        '  <div style="font-size: 48px; margin-bottom: 16px;">📋</div>' +
        '  <div style="font-family: var(--font-mono); font-size: 16px; font-weight:700; text-transform: uppercase;">TODOIST CONFIGURATION REQUIRED</div>' +
        '  <div style="font-family: var(--font-sans); font-size: 14px; margin-top: 12px; max-width: 450px; opacity: 0.8; line-height: 1.4;">' +
        '    Please open settings (via the gear icon in the top right) and enter your Todoist Personal API Token under the <strong>TODOIST</strong> tab.' +
        '  </div>' +
        '</div>';
    },

    renderOfflineMessage: function() {
      this.container.innerHTML = 
        '<div class="trmnl-card" style="height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; padding: 24px;">' +
        '  <div style="font-size: 48px; margin-bottom: 16px;">📶</div>' +
        '  <div style="font-family: var(--font-mono); font-size: 16px; font-weight:700; text-transform: uppercase;">TODOIST OFFLINE</div>' +
        '  <div style="font-family: var(--font-sans); font-size: 14px; margin-top: 8px; opacity: 0.6;">' +
        '    Internet connection required. No offline cache is available.' +
        '  </div>' +
        '</div>';
    },

    renderError: function() {
      this.container.innerHTML = 
        '<div class="trmnl-card" style="height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; padding: 24px;">' +
        '  <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>' +
        '  <div style="font-family: var(--font-mono); font-size: 16px; font-weight:700; text-transform: uppercase;">TODOIST CONNECTION ERROR</div>' +
        '  <div style="font-family: var(--font-sans); font-size: 14px; margin-top: 8px; opacity: 0.6;">' +
        '    Failed to fetch tasks from Todoist. Verify your API Token or check your network connection.' +
        '  </div>' +
        '</div>';
    },

    formatDueDate: function(dueObj) {
      if (!dueObj) return '';
      if (dueObj.date) {
        var parts = dueObj.date.split('-');
        if (parts.length === 3) {
          var month = parseInt(parts[1], 10) - 1;
          var day = parseInt(parts[2], 10);
          
          var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          var monthName = months[month] || '';
          
          return 'due ' + day + ' ' + monthName;
        }
      }
      return 'due ' + (dueObj.string || '');
    },

    renderTasks: function(tasks, projects, maxTasks, isCached) {
      var self = this;
      
      if (tasks.length === 0) {
        var emptyHtml = '<div style="display:flex; flex-direction:column; height:100%; justify-content:space-between; padding: 4px 0 0 0;">' +
          '  <div class="trmnl-card" style="flex: 1; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; padding: 24px; margin-bottom: 16px;">' +
          '    <div style="font-size: 54px; margin-bottom: 16px;">🎉</div>' +
          '    <div style="font-family: var(--font-sans); font-size: 20px; font-weight:700;">ALL TASKS COMPLETED!</div>' +
          '    <div style="font-family: var(--font-mono); font-size: 13px; margin-top: 8px; opacity: 0.6;">Your to-do list is empty. Excellent work!</div>' +
          '  </div>' +
          '  ' + self.getFooterHtml(isCached) +
          '</div>';
        this.container.innerHTML = emptyHtml;
        self.bindRefreshEvent();
        return;
      }

      // Sort tasks by priority descending (priority 4 is highest, priority 1 is lowest)
      var sortedTasks = tasks.slice().sort(function(a, b) {
        return b.priority - a.priority;
      });

      // Limit items
      var displayTasks = sortedTasks.slice(0, maxTasks);

      var html = '<div style="display:flex; flex-direction:column; height:100%; justify-content:space-between; padding: 4px 0 0 0;">';
      
      // Tasks Queue List
      html += '  <div style="display:flex; flex-direction:column; flex:1; margin-bottom: 16px; justify-content: flex-start; padding-top: 8px;">';

      displayTasks.forEach(function(task, idx) {
        var content = task.content || '';
        var dueText = self.formatDueDate(task.due);

        html += '    <div class="todoist-item" style="display:flex; align-items:center; margin-bottom: 26px; padding-bottom: 2px;">';
        
        // Custom E-Ink Left Bullet + Number Indicator (Larger)
        html += '      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; width: 18px; margin-right: 22px; flex-shrink: 0;">';
        html += '        <div class="dither-bullet" style="height: 14px; width: 6px; margin: 0; display: block; vertical-align: top; background-repeat: repeat;"></div>';
        html += '        <div style="font-family: var(--font-mono); font-size: 13px; font-weight: 700; line-height: 1.2; margin: 1px 0; color: var(--text-color); text-align: center;">' + (idx + 1) + ':</div>';
        html += '        <div class="dither-bullet" style="height: 14px; width: 6px; margin: 0; display: block; vertical-align: top; background-repeat: repeat;"></div>';
        html += '      </div>';

        // Content
        html += '      <div style="flex:1; display:flex; flex-direction:column; min-width:0;">';
        
        // Task content - Bold, clean sans-serif (Larger)
        html += '        <div style="font-family: var(--font-sans); font-size: 22px; font-weight: 700; line-height: 1.25; color: var(--text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">' + content + '</div>';
        
        if (dueText) {
          // Underlined with dotted line directly below due date text (Larger)
          html += '        <div style="margin-top: 4px; display: flex;">';
          html += '          <span style="font-family: var(--font-sans); font-size: 16px; color: var(--text-color); font-weight: 500; opacity: 0.8; border-bottom: 1px dotted var(--border-color); padding-bottom: 1px; line-height: 1.15;">' + dueText + '</span>';
          html += '        </div>';
        }
        html += '      </div>';

        html += '    </div>';
      });

      html += '  </div>';

      // Footer Bar
      html += self.getFooterHtml(isCached);
      html += '</div>';

      this.container.innerHTML = html;
      self.bindRefreshEvent();
    },

    getFooterHtml: function(isCached) {
      var updatedText = 'Not yet';
      if (this.lastUpdated) {
        var h = this.lastUpdated.getHours();
        var m = this.lastUpdated.getMinutes();
        var ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        h = h ? h : 12;
        m = m < 10 ? '0' + m : m;
        updatedText = h + ':' + m + ' ' + ampm;
        if (isCached) {
          updatedText += ' (Cached)';
        }
      }

      var html = '  <div class="trmnl-footer-bar trmnl-dither" style="padding: 0 12px; height: 48px; border: var(--border-width) solid var(--border-color); border-radius: 12px; display: flex; justify-content: space-between; align-items: center; background-color: transparent;">';
      
      // Left solid black badge with Todoist logo
      html += '    <div class="trmnl-footer-badge" style="background-color: var(--text-color); color: var(--bg-color); border: var(--border-width) solid var(--border-color); border-radius: 6px; padding: 4px 10px; display: flex; align-items: center; cursor: pointer;" id="todoist-refresh-btn" title="Click to refresh">';
      
      // Three stacked chevrons SVG representing the Todoist Logo
      html += '      <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round; margin-right: 8px; flex-shrink: 0; vertical-align: middle;">';
      html += '        <path d="M6 6l4 4 8-8"></path>';
      html += '        <path d="M6 12l4 4 8-8"></path>';
      html += '        <path d="M6 18l4 4 8-8"></path>';
      html += '      </svg>';
      
      html += '      <span>Todoist</span>';
      html += '    </div>';
      
      // Right solid white/paper badge with text "Todoist"
      html += '    <div class="trmnl-footer-badge" style="background-color: var(--bg-color); color: var(--text-color); border: var(--border-width) solid var(--border-color); border-radius: 6px; padding: 4px 10px; font-weight: 700; font-family: var(--font-sans);">';
      html += '      <span>Todoist</span>';
      html += '    </div>';
      
      html += '  </div>';

      return html;
    },

    bindRefreshEvent: function() {
      var self = this;
      var refreshBtn = this.container.querySelector('#todoist-refresh-btn');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          if (window.Dashboard && typeof window.Dashboard.resetTimer === 'function') {
            window.Dashboard.resetTimer();
          }
          var span = refreshBtn.querySelector('span');
          if (span) {
            span.textContent = "Updating...";
          }
          refreshBtn.style.opacity = '0.7';
          self.update();
        });
      }
    }
  };

  // Register plugin
  window.Plugins = window.Plugins || {};
  window.Plugins.todoist = TodoistPlugin;

})();
