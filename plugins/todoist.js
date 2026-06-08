/**
 * Todoist Plugin for TRMNL Dashboard
 * Fetches active due tasks and today's completed tasks from the Todoist API and renders them in a split e-paper layout.
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

      // Calculate start of today local time in ISO format for completed tasks
      var today = new Date();
      today.setHours(0, 0, 0, 0);
      var sinceIso = today.toISOString();

      var tasksUrl = 'https://api.todoist.com/api/v1/tasks';
      // Force 'today | overdue' default to show items due now
      var activeFilter = filter || 'today | overdue';
      if (activeFilter) {
        tasksUrl += '?filter=' + encodeURIComponent(activeFilter);
      }

      var completedUrl = 'https://api.todoist.com/api/v1/tasks/completed?since=' + encodeURIComponent(sinceIso);

      var headers = {
        'Authorization': 'Bearer ' + apiKey
      };

      // Fetch active tasks and completed tasks in parallel
      Promise.all([
        fetch(tasksUrl, { headers: headers }).then(function(r) {
          if (!r.ok) throw new Error("Tasks fetch failed: HTTP " + r.status);
          return r.json();
        }),
        fetch(completedUrl, { headers: headers }).then(function(r) {
          if (!r.ok) throw new Error("Completed fetch failed: HTTP " + r.status);
          return r.json();
        })
      ])
      .then(function(results) {
        var activeTasks = results[0] ? (results[0].results || results[0]) : [];
        var completedTasks = results[1] ? (results[1].items || results[1]) : [];

        // Save to local cache
        localStorage.setItem('trmnl_todoist_tasks_cache', JSON.stringify(activeTasks));
        localStorage.setItem('trmnl_todoist_completed_cache', JSON.stringify(completedTasks));
        localStorage.setItem('trmnl_todoist_timestamp', Date.now().toString());

        self.lastUpdated = new Date();
        self.renderTasks(activeTasks, completedTasks, maxTasks, false);
      })
      .catch(function(err) {
        console.error("Todoist API fetch error:", err);
        self.loadFromCache(false);
      });
    },

    loadFromCache: function(isOffline) {
      var self = this;
      var cachedTasks = localStorage.getItem('trmnl_todoist_tasks_cache');
      var cachedCompleted = localStorage.getItem('trmnl_todoist_completed_cache');
      var cachedTime = localStorage.getItem('trmnl_todoist_timestamp');

      var activeConfig = window.Dashboard ? window.Dashboard.getActiveConfig() : {};
      var maxTasks = activeConfig.todoistMaxTasks !== undefined ? activeConfig.todoistMaxTasks : (this.config.todoistMaxTasks || 6);

      if (cachedTasks && cachedTime) {
        try {
          var activeTasks = JSON.parse(cachedTasks);
          var completedTasks = cachedCompleted ? JSON.parse(cachedCompleted) : [];
          self.lastUpdated = new Date(parseInt(cachedTime, 10));
          self.renderTasks(activeTasks, completedTasks, maxTasks, true);
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

    formatCompletionTime: function(completedAtIso) {
      if (!completedAtIso) return 'completed today';
      try {
        var date = new Date(completedAtIso);
        var h = date.getHours();
        var m = date.getMinutes();
        var ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        h = h ? h : 12;
        m = m < 10 ? '0' + m : m;
        return 'completed ' + h + ':' + m + ' ' + ampm;
      } catch (e) {
        return 'completed today';
      }
    },

    renderTasks: function(activeTasks, completedTasks, maxTasks, isCached) {
      var self = this;
      
      // Calculate local today string in YYYY-MM-DD
      var now = new Date();
      var y = now.getFullYear();
      var m = now.getMonth() + 1;
      var d = now.getDate();
      var localTodayStr = y + '-' + (m < 10 ? '0' + m : m) + '-' + (d < 10 ? '0' + d : d);

      // 1. Group 1: Due Now (due today or overdue in local time)
      var dueNowTasks = activeTasks.filter(function(task) {
        if (!task.due || !task.due.date) return false;
        var taskDueDateOnly = task.due.date.substring(0, 10);
        return taskDueDateOnly <= localTodayStr;
      });

      var sortedDueNow = dueNowTasks.slice().sort(function(a, b) {
        return b.priority - a.priority;
      });

      // Split column limits: cap shared left column sections to prevent vertical overflow
      var sectionLimit = Math.max(3, Math.ceil(maxTasks / 2));
      var displayActive = sortedDueNow.slice(0, sectionLimit);

      // 2. Group 2: Inbox (no deadline / no due date)
      var inboxTasks = activeTasks.filter(function(task) {
        return !task.due || !task.due.date;
      });

      var sortedInbox = inboxTasks.slice().sort(function(a, b) {
        return b.priority - a.priority;
      });

      var displayInbox = sortedInbox.slice(0, sectionLimit);

      // 3. Group 3: Upcoming (due in the future)
      var upcomingTasks = activeTasks.filter(function(task) {
        if (!task.due || !task.due.date) return false;
        var taskDueDateOnly = task.due.date.substring(0, 10);
        return taskDueDateOnly > localTodayStr;
      });

      var sortedUpcoming = upcomingTasks.slice().sort(function(a, b) {
        var dateA = a.due.date.substring(0, 10);
        var dateB = b.due.date.substring(0, 10);
        if (dateA !== dateB) {
          return dateA < dateB ? -1 : 1;
        }
        return b.priority - a.priority;
      });

      var displayUpcoming = sortedUpcoming.slice(0, maxTasks);

      // Filter completed tasks to strictly only show those completed today in local time
      var localTodayYear = now.getFullYear();
      var localTodayMonth = now.getMonth();
      var localTodayDate = now.getDate();

      var completedTodayTasks = completedTasks.filter(function(task) {
        if (!task.completed_at) return false;
        var date = new Date(task.completed_at);
        return date.getFullYear() === localTodayYear &&
               date.getMonth() === localTodayMonth &&
               date.getDate() === localTodayDate;
      });

      // Sort completed by completion timestamp descending (most recent first)
      var sortedCompleted = completedTodayTasks.slice().sort(function(a, b) {
        var dateA = new Date(a.completed_at);
        var dateB = new Date(b.completed_at);
        return dateB.getTime() - dateA.getTime();
      });

      var displayCompleted = sortedCompleted.slice(0, maxTasks);

      var html = '<div style="display:flex; flex-direction:column; height:100%; justify-content:space-between; padding: 4px 0 0 0;">';
      
      // 3-Column Layout Grid Row
      html += '  <div class="grid-row" style="flex:1; display:flex; width:100%; min-height:0; margin-bottom: 16px;">';

      // Left Column: Due Now & Inbox (No Deadline)
      html += '    <div class="grid-col" style="flex:1; display:flex; flex-direction:column; min-width:0; padding-right: 20px; border-right: 1px dashed var(--border-color);">';
      
      // Section 1: Due Now
      html += '      <div style="flex:1; min-height:0; display:flex; flex-direction:column; margin-bottom: 16px;">';
      html += '        <div style="font-family: var(--font-mono); font-size: 14px; font-weight:700; text-transform: uppercase; border-bottom: 2px solid var(--border-color); padding-bottom: 6px; margin-bottom: 12px; color: var(--text-color); letter-spacing: 0.05em;">Due Now</div>';
      html += '        <div style="flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:flex-start;">';

      if (displayActive.length === 0) {
        html += '          <div style="font-family: var(--font-sans); font-size: 15px; opacity:0.6; padding: 6px 0;">No active tasks due now.</div>';
      } else {
        displayActive.forEach(function(task, idx) {
          var content = task.content || '';
          var dueText = self.formatDueDate(task.due);

          html += '          <div class="todoist-item" data-task-id="' + task.id + '" data-index="' + idx + '" style="display:flex; align-items:center; margin-bottom: 12px; padding-bottom: 2px; cursor: pointer; user-select: none;">';
          
          // Custom E-Ink Left Bullet + Number Indicator
          html += '            <div class="todoist-indicator-col" style="display:flex; flex-direction:column; align-items:center; justify-content:center; width: 18px; margin-right: 14px; flex-shrink: 0; height: 38px;">';
          html += '              <div class="dither-bullet" style="height: 12px; width: 5px; margin: 0; display: block; vertical-align: top; background-repeat: repeat;"></div>';
          html += '              <div style="font-family: var(--font-mono); font-size: 13px; font-weight: 700; line-height: 1.2; margin: 1px 0; color: var(--text-color); text-align: center;">' + (idx + 1) + ':</div>';
          html += '              <div class="dither-bullet" style="height: 12px; width: 5px; margin: 0; display: block; vertical-align: top; background-repeat: repeat;"></div>';
          html += '            </div>';

          // Content
          html += '          <div style="flex:1; display:flex; flex-direction:column; min-width:0;">';
          html += '            <div class="todoist-content" style="font-family: var(--font-sans); font-size: 17px; font-weight: 700; line-height: 1.25; color: var(--text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: all 0.2s ease;">' + content + '</div>';
          if (dueText) {
            html += '            <div style="margin-top: 3px; display: flex;">';
            html += '              <span class="todoist-due" style="font-family: var(--font-sans); font-size: 13px; color: var(--text-color); font-weight: 500; opacity: 0.8; border-bottom: 1px dotted var(--border-color); padding-bottom: 1px; line-height: 1.15; transition: all 0.2s ease;">' + dueText + '</span>';
            html += '            </div>';
          }
          html += '          </div>';
          html += '        </div>';
        });
      }

      html += '        </div>';
      html += '      </div>'; // End Due Now Section

      // Section 2: Inbox (No deadline)
      html += '      <div style="flex:1; min-height:0; display:flex; flex-direction:column;">';
      html += '        <div style="font-family: var(--font-mono); font-size: 14px; font-weight:700; text-transform: uppercase; border-bottom: 2px solid var(--border-color); padding-bottom: 6px; margin-bottom: 12px; color: var(--text-color); letter-spacing: 0.05em;">Inbox (No Date)</div>';
      html += '        <div style="flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:flex-start;">';

      if (displayInbox.length === 0) {
        html += '          <div style="font-family: var(--font-sans); font-size: 15px; opacity:0.6; padding: 6px 0;">No tasks in Inbox.</div>';
      } else {
        displayInbox.forEach(function(task, idx) {
          var content = task.content || '';

          html += '          <div class="todoist-item" data-task-id="' + task.id + '" data-index="' + idx + '" style="display:flex; align-items:center; margin-bottom: 12px; padding-bottom: 2px; cursor: pointer; user-select: none;">';
          
          // Custom E-Ink Left Bullet + Number Indicator
          html += '            <div class="todoist-indicator-col" style="display:flex; flex-direction:column; align-items:center; justify-content:center; width: 18px; margin-right: 14px; flex-shrink: 0; height: 38px;">';
          html += '              <div class="dither-bullet" style="height: 12px; width: 5px; margin: 0; display: block; vertical-align: top; background-repeat: repeat;"></div>';
          html += '              <div style="font-family: var(--font-mono); font-size: 13px; font-weight: 700; line-height: 1.2; margin: 1px 0; color: var(--text-color); text-align: center;">' + (idx + 1) + ':</div>';
          html += '              <div class="dither-bullet" style="height: 12px; width: 5px; margin: 0; display: block; vertical-align: top; background-repeat: repeat;"></div>';
          html += '            </div>';

          // Content
          html += '            <div style="flex:1; display:flex; flex-direction:column; min-width:0;">';
          html += '              <div class="todoist-content" style="font-family: var(--font-sans); font-size: 17px; font-weight: 700; line-height: 1.25; color: var(--text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: all 0.2s ease;">' + content + '</div>';
          html += '            </div>';
          html += '          </div>';
        });
      }

      html += '        </div>';
      html += '      </div>'; // End Inbox Section
      html += '    </div>'; // End Left Column

      // Middle Column: Upcoming
      html += '    <div class="grid-col" style="flex:1; display:flex; flex-direction:column; min-width:0; padding-left: 20px; padding-right: 20px; border-right: 1px dashed var(--border-color);">';
      html += '      <div style="font-family: var(--font-mono); font-size: 14px; font-weight: 700; text-transform: uppercase; border-bottom: 2px solid var(--border-color); padding-bottom: 6px; margin-bottom: 12px; color: var(--text-color); letter-spacing: 0.05em;">Upcoming</div>';
      html += '      <div style="flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:flex-start;">';

      if (displayUpcoming.length === 0) {
        html += '        <div style="font-family: var(--font-sans); font-size: 15px; opacity:0.6; padding: 12px 0;">No upcoming tasks.</div>';
      } else {
        displayUpcoming.forEach(function(task, idx) {
          var content = task.content || '';
          var dueText = self.formatDueDate(task.due);

          html += '          <div class="todoist-item" data-task-id="' + task.id + '" data-index="' + idx + '" style="display:flex; align-items:center; margin-bottom: 12px; padding-bottom: 2px; cursor: pointer; user-select: none;">';
          
          // Custom E-Ink Left Bullet + Number Indicator
          html += '            <div class="todoist-indicator-col" style="display:flex; flex-direction:column; align-items:center; justify-content:center; width: 18px; margin-right: 14px; flex-shrink: 0; height: 38px;">';
          html += '              <div class="dither-bullet" style="height: 12px; width: 5px; margin: 0; display: block; vertical-align: top; background-repeat: repeat;"></div>';
          html += '              <div style="font-family: var(--font-mono); font-size: 13px; font-weight: 700; line-height: 1.2; margin: 1px 0; color: var(--text-color); text-align: center;">' + (idx + 1) + ':</div>';
          html += '              <div class="dither-bullet" style="height: 12px; width: 5px; margin: 0; display: block; vertical-align: top; background-repeat: repeat;"></div>';
          html += '            </div>';

          // Content
          html += '          <div style="flex:1; display:flex; flex-direction:column; min-width:0;">';
          html += '            <div class="todoist-content" style="font-family: var(--font-sans); font-size: 17px; font-weight: 700; line-height: 1.25; color: var(--text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: all 0.2s ease;">' + content + '</div>';
          if (dueText) {
            html += '            <div style="margin-top: 3px; display: flex;">';
            html += '              <span class="todoist-due" style="font-family: var(--font-sans); font-size: 13px; color: var(--text-color); font-weight: 500; opacity: 0.8; border-bottom: 1px dotted var(--border-color); padding-bottom: 1px; line-height: 1.15; transition: all 0.2s ease;">' + dueText + '</span>';
            html += '            </div>';
          }
          html += '          </div>';
          html += '        </div>';
        });
      }

      html += '      </div>';
      html += '    </div>'; // End Middle Column

      // Right Column: Completed Today
      html += '    <div class="grid-col" style="flex:1; display:flex; flex-direction:column; min-width:0; padding-left: 20px;">';
      html += '      <div style="font-family: var(--font-mono); font-size: 14px; font-weight: 700; text-transform: uppercase; border-bottom: 2px solid var(--border-color); padding-bottom: 6px; margin-bottom: 12px; color: var(--text-color); letter-spacing: 0.05em;">Completed Today</div>';
      html += '      <div style="flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:flex-start;">';

      if (displayCompleted.length === 0) {
        html += '        <div style="font-family: var(--font-sans); font-size: 15px; opacity:0.6; padding: 12px 0;">No tasks completed today yet.</div>';
      } else {
        displayCompleted.forEach(function(task) {
          var content = task.content || '';
          var completionText = self.formatCompletionTime(task.completed_at);

          html += '        <div class="todoist-item completed-item" style="display:flex; align-items:center; margin-bottom: 12px; padding-bottom: 2px; opacity: 0.65; user-select: none;">';
          
          // Left Bullet + Checkmark
          html += '          <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; width: 18px; margin-right: 14px; flex-shrink: 0; height: 38px;">';
          html += '            <div class="dither-bullet" style="height: 12px; width: 5px; margin: 0; display: block; vertical-align: top; background-repeat: repeat;"></div>';
          html += '            <div style="font-family: var(--font-mono); font-size: 13px; font-weight: 700; line-height: 1.2; margin: 1px 0; color: var(--text-color); text-align: center; display: flex; align-items: center; justify-content: center; height: 16px;">';
          html += '              <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; fill: none; stroke: var(--text-color); stroke-width: 4.5; stroke-linecap: round; stroke-linejoin: round;"><polyline points="20 6 9 17 4 12"></polyline></svg>';
          html += '            </div>';
          html += '            <div class="dither-bullet" style="height: 12px; width: 5px; margin: 0; display: block; vertical-align: top; background-repeat: repeat;"></div>';
          html += '          </div>';
          
          // Content
          html += '          <div style="flex:1; display:flex; flex-direction:column; min-width:0;">';
          html += '            <div style="font-family: var(--font-sans); font-size: 17px; font-weight: 700; line-height: 1.25; color: var(--text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-decoration: line-through;">' + content + '</div>';
          html += '            <div style="margin-top: 3px; display: flex;">';
          html += '              <span style="font-family: var(--font-sans); font-size: 13px; color: var(--text-color); font-weight: 500; opacity: 0.8; border-bottom: 1px dotted var(--border-color); padding-bottom: 1px; line-height: 1.15;">' + completionText + '</span>';
          html += '            </div>';
          html += '          </div>';
          html += '        </div>';
        });
      }

      html += '      </div>';
      html += '    </div>'; // End Right Column

      html += '  </div>'; // End Grid Row

      // Footer Bar
      html += self.getFooterHtml(isCached);
      html += '</div>';

      this.container.innerHTML = html;
      self.bindRefreshEvent();
      self.bindTaskClickEvents();
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

      var html = '  <div class="trmnl-footer-bar">';
      html += '    <div class="trmnl-footer-badge">';
      
      // Three stacked chevrons SVG representing the Todoist Logo
      html += '      <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; fill: none; stroke: var(--text-color); stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round; margin-right: 8px; flex-shrink: 0; vertical-align: middle;">';
      html += '        <path d="M6 6l4 4 8-8"></path>';
      html += '        <path d="M6 12l4 4 8-8"></path>';
      html += '        <path d="M6 18l4 4 8-8"></path>';
      html += '      </svg>';
      
      html += '      <span>Todoist</span>';
      html += '    </div>';
      
      html += '    <div class="trmnl-footer-meta" style="display: flex; align-items: center;">';
      html += '      <span style="margin-right: 12px;">Updated ' + updatedText + '</span>';
      html += '      <button id="todoist-refresh-btn" class="trmnl-btn" style="padding: 2px 10px; font-size: 11px; height: 26px; line-height: 1; border-radius: 4px; font-family: var(--font-sans); text-transform: uppercase; cursor: pointer;">Refresh</button>';
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
          refreshBtn.textContent = "Updating...";
          refreshBtn.disabled = true;
          self.update();
        });
      }
    },

    bindTaskClickEvents: function() {
      var self = this;
      var items = this.container.querySelectorAll('.todoist-item');
      items.forEach(function(item) {
        if (item.classList.contains('completed-item')) return; // Ignore completed items
        
        item.addEventListener('click', function(e) {
          if (item.classList.contains('closing')) return;

          var taskId = item.getAttribute('data-task-id');
          if (!taskId) return;

          item.classList.add('closing');

          // Style changes (line-through & opacity)
          var content = item.querySelector('.todoist-content');
          if (content) {
            content.style.textDecoration = 'line-through';
            content.style.opacity = '0.5';
          }
          var due = item.querySelector('.todoist-due');
          if (due) {
            due.style.textDecoration = 'line-through';
            due.style.opacity = '0.5';
          }

          // Left indicator replaces numbers with checkmark SVG
          var indicatorCol = item.querySelector('.todoist-indicator-col');
          if (indicatorCol) {
            indicatorCol.innerHTML = '<svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: none; stroke: var(--text-color); stroke-width: 4; stroke-linecap: round; stroke-linejoin: round;"><polyline points="20 6 9 17 4 12"></polyline></svg>';
            indicatorCol.style.opacity = '0.7';
          }

          self.closeTask(taskId, item);
        });
      });
    },

    closeTask: function(taskId, itemElement) {
      var self = this;
      var activeConfig = window.Dashboard ? window.Dashboard.getActiveConfig() : {};
      var apiKey = activeConfig.todoistApiKey || this.config.todoistApiKey || '';

      if (!apiKey) return;

      var url = 'https://api.todoist.com/api/v1/tasks/' + taskId + '/close';

      fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + apiKey
        }
      })
      .then(function(res) {
        if (res.ok) {
          // Wait 1 second for the Todoist servers to sync, then update
          setTimeout(function() {
            self.update();
          }, 1000);
        } else {
          throw new Error("HTTP Status " + res.status);
        }
      })
      .catch(function(err) {
        console.error("Failed to close task:", err);
        alert("Could not complete task. Please try again.");

        // Revert UI states on error
        itemElement.classList.remove('closing');
        var content = itemElement.querySelector('.todoist-content');
        if (content) {
          content.style.textDecoration = 'none';
          content.style.opacity = '1';
        }
        var due = itemElement.querySelector('.todoist-due');
        if (due) {
          due.style.textDecoration = 'none';
          due.style.opacity = '0.8';
        }
        var idx = parseInt(itemElement.getAttribute('data-index'), 10);
        var indicatorCol = itemElement.querySelector('.todoist-indicator-col');
        if (indicatorCol) {
          indicatorCol.innerHTML = 
            '<div class="dither-bullet" style="height: 12px; width: 5px; margin: 0; display: block; vertical-align: top; background-repeat: repeat;"></div>' +
            '<div style="font-family: var(--font-mono); font-size: 13px; font-weight: 700; line-height: 1.2; margin: 1px 0; color: var(--text-color); text-align: center;">' + (idx + 1) + ':</div>' +
            '<div class="dither-bullet" style="height: 12px; width: 5px; margin: 0; display: block; vertical-align: top; background-repeat: repeat;"></div>';
          indicatorCol.style.opacity = '1';
        }
      });
    }
  };

  // Register plugin
  window.Plugins = window.Plugins || {};
  window.Plugins.todoist = TodoistPlugin;

})();
