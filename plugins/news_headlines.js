/**
 * News Headlines Plugin for BRIEF Dashboard
 * Fetches from RSS and sorts by date to show the latest headlines.
 */

(function() {
  'use strict';

  var NewsPlugin = {
    id: 'news_headlines',
    name: 'News Headlines',
    config: {},
    container: null,

    init: function(pluginConfig) {
      this.config = pluginConfig || {};
    },

    render: function(element) {
      this.container = element;
      var cachedStr = localStorage.getItem('brief_news_cache');
      if (cachedStr) {
        try {
          var cached = JSON.parse(cachedStr);
          if (cached && cached.headlines && cached.timestamp) {
            this.lastUpdated = cached.lastUpdated ? new Date(cached.lastUpdated) : new Date(cached.timestamp);
            this.renderHeadlines(cached.headlines);
            return;
          }
        } catch (e) {
          console.warn("Error parsing news cache in render:", e);
        }
      }
      this.container.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100%;font-family:var(--font-mono);font-size:16px;">RETRIEVING BBC HEADLINES...</div>';
    },

    update: function(force) {
      var self = this;
      var cachedStr = localStorage.getItem('brief_news_cache');
      var needsFetch = true;

      if (!force && cachedStr) {
        try {
          var cached = JSON.parse(cachedStr);
          if (cached && cached.headlines && cached.timestamp) {
            var age = Date.now() - cached.timestamp;
            if (age < 30 * 60 * 1000) {
              needsFetch = false;
              self.lastUpdated = cached.lastUpdated ? new Date(cached.lastUpdated) : new Date(cached.timestamp);
              if (self.container) {
                self.renderHeadlines(cached.headlines);
              }
            } else {
              // Cache is old, but render it first to avoid loading flash
              self.lastUpdated = cached.lastUpdated ? new Date(cached.lastUpdated) : new Date(cached.timestamp);
              if (self.container) {
                self.renderHeadlines(cached.headlines);
              }
            }
          }
        } catch (e) {
          console.warn("Error checking news cache in update:", e);
        }
      }

      if (!needsFetch) {
        return;
      }

      var cacheBuster = Math.floor(Date.now() / (3 * 60 * 60 * 1000));
      var feedUrl = "https://feeds.bbci.co.uk/news/world/rss.xml?_t=" + cacheBuster;
      var url = "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(feedUrl);

      fetch(url)
        .then(function(response) {
          if (!response.ok) throw new Error("HTTP error " + response.status);
          return response.json();
        })
        .then(function(data) {
          if (data.status === 'ok') {
            var items = data.items || [];

            // Sort items by pubDate descending (newest first)
            items.sort(function(a, b) {
              var dateA = new Date(a.pubDate.replace(/-/g, "/"));
              var dateB = new Date(b.pubDate.replace(/-/g, "/"));
              return dateB.getTime() - dateA.getTime();
            });

            self.lastUpdated = new Date();
            var cacheObj = {
              timestamp: Date.now(),
              headlines: items,
              lastUpdated: self.lastUpdated.getTime()
            };
            try {
              localStorage.setItem('brief_news_cache', JSON.stringify(cacheObj));
            } catch (e) {
              console.warn("Failed to set news cache:", e);
            }
            self.renderHeadlines(items);
          } else {
            throw new Error("RSS load error");
          }
        })
        .catch(function(err) {
          console.error("BBC news fetch failed:", err);
          if (cachedStr) {
            try {
              var cached = JSON.parse(cachedStr);
              if (cached && cached.headlines) {
                self.lastUpdated = cached.lastUpdated ? new Date(cached.lastUpdated) : new Date(cached.timestamp);
                self.renderHeadlines(cached.headlines);
                return;
              }
            } catch (e) {}
          }
          self.renderError();
        });
    },

    formatTimeAgo: function(dateStr) {
      try {
        var pubDate = new Date(dateStr.replace(/-/g, "/"));
        if (isNaN(pubDate.getTime())) {
          pubDate = new Date(dateStr);
        }
        var now = new Date();
        var diffMs = now.getTime() - pubDate.getTime();
        var diffMins = Math.floor(diffMs / (1000 * 60));
        var diffHours = Math.floor(diffMs / (1000 * 60 * 60));

        if (diffMins < 60) {
          return (diffMins <= 1 ? 1 : diffMins) + "m ago";
        } else if (diffHours < 24) {
          return diffHours + "h ago";
        } else {
          var days = Math.floor(diffHours / 24);
          return days + "d ago";
        }
      } catch (e) {
        return "";
      }
    },

    renderHeadlines: function(items) {
      this.cachedHeadlines = items;
      if (items.length === 0) {
        this.container.innerHTML = 
          '<div class="trmnl-card" style="height:100%; justify-content:center; align-items:center;">' +
          '  <div style="font-family: var(--font-mono); font-size: 16px; font-weight:700;">NO ARTICLES FOUND</div>' +
          '</div>';
        return;
      }

      // Display exactly 8 headlines vertically
      var displayItems = items.slice(0, 8);

      var html = '<div style="display:flex; flex-direction:column; height:100%; justify-content:space-between; padding: 4px 0 0 0;">';

      // Headlines List
      html += '  <div style="display:flex; flex-direction:column; justify-content:space-between; flex:1; margin-bottom: 16px;">';

      displayItems.forEach(function(item) {
        var title = item.title || "";
        var desc = item.description || item.content || "";
        desc = desc.replace(/<[^>]*>/g, ""); // strip HTML
        
        // Truncate description to fit single line if too long
        if (desc.length > 130) {
          desc = desc.substring(0, 130) + "...";
        }

        var timeAgo = NewsPlugin.formatTimeAgo(item.pubDate);

        html += '    <div class="news-item" style="display:flex; align-items: flex-start; margin-bottom: 10px;">';
        html += '      <span class="dither-bullet" style="height: 34px; width: 6px; margin-right: 12px; margin-top: 2px; flex-shrink: 0;"></span>';
        html += '      <div style="flex:1; display:flex; flex-direction:column;">';
        html += '        <div class="news-item-title" style="font-family: var(--font-sans); font-size: 17px; font-weight: 700; line-height: 1.2; margin-bottom: 3px; color: var(--text-color);">' + title + '</div>';
        html += '        <div style="font-family: var(--font-sans); font-size: 14px; line-height: 1.35; opacity: 0.8; color: var(--text-color);">' + desc + ' (' + timeAgo + ')</div>';
        html += '      </div>';
        html += '    </div>';
      });

      html += '  </div>';

      // Custom Dithered Footer Bar
      html += '  <div class="trmnl-footer-bar">';
      html += '    <div class="trmnl-footer-badge">';
      // Inline Newspaper SVG
      html += '      <svg viewBox="0 0 24 24"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path><path d="M18 14h-8M18 18h-8M16 6H10v4h6V6z"></path></svg>';
      html += '      <span>News Headlines</span>';
      html += '    </div>';
      var updatedText = 'Not yet';
      if (this.lastUpdated) {
        var h = this.lastUpdated.getHours();
        var m = this.lastUpdated.getMinutes();
        var ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        h = h ? h : 12;
        m = m < 10 ? '0' + m : m;
        updatedText = h + ':' + m + ' ' + ampm;
      }
      html += '    <div class="trmnl-footer-meta" style="display: flex; align-items: center;">';
      html += '      <span style="margin-right: 12px;">Updated ' + updatedText + '</span>';
      html += '      <button id="news-refresh-btn" class="trmnl-btn" style="padding: 2px 10px; font-size: 11px; height: 26px; line-height: 1; border-radius: 4px; font-family: var(--font-sans); text-transform: uppercase; cursor: pointer;">Refresh</button>';
      html += '    </div>';
      html += '  </div>';

      html += '</div>';

      var self = this;
      this.container.innerHTML = html;

      // Attach click events to news items
      var newsElements = this.container.querySelectorAll('.news-item');
      newsElements.forEach(function(elem, idx) {
        elem.addEventListener('click', function() {
          var item = displayItems[idx];
          if (item) {
            self.viewArticle(item);
          }
        });
      });

      // Attach click event to refresh button
      var refreshBtn = this.container.querySelector('#news-refresh-btn');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          if (window.Dashboard && typeof window.Dashboard.resetTimer === 'function') {
            window.Dashboard.resetTimer();
          }
          refreshBtn.textContent = "Updating...";
          refreshBtn.disabled = true;
          self.update(true);
        });
      }
    },

    viewArticle: function(item) {
      var self = this;
      
      if (window.Dashboard && typeof window.Dashboard.pauseTimer === 'function') {
        window.Dashboard.pauseTimer();
      }

      this.container.innerHTML = 
        '<div style="display:flex; flex-direction:column; height:100%; justify-content:center; align-items:center;">' +
        '  <div style="font-family: var(--font-mono); font-size: 16px; font-weight: 700; margin-bottom: 8px;">RETRIEVING ARTICLE...</div>' +
        '  <div style="font-family: var(--font-sans); font-size: 14px; opacity: 0.7; text-align: center; max-width: 80%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + (item.title || '') + '</div>' +
        '</div>';

      var targetUrl = item.link || item.guid || '';
      if (!targetUrl) {
        self.renderArticleFallback(item);
        return;
      }

      // 1. Try Primary Proxy: corsproxy.io
      var primaryProxyUrl = "https://corsproxy.io/?url=" + encodeURIComponent(targetUrl);

      fetch(primaryProxyUrl)
        .then(function(res) {
          if (!res.ok) throw new Error("Primary proxy failed: HTTP " + res.status);
          return res.text();
        })
        .then(function(html) {
          self.renderArticleContent(html, item);
        })
        .catch(function(err) {
          console.warn("Primary proxy failed, trying backup proxy. Error:", err);
          
          // 2. Try Backup Proxy: api.allorigins.win (JSON Wrapper)
          var backupProxyUrl = "https://api.allorigins.win/get?url=" + encodeURIComponent(targetUrl);
          
          fetch(backupProxyUrl)
            .then(function(res) {
              if (!res.ok) throw new Error("Backup proxy failed: HTTP " + res.status);
              return res.json();
            })
            .then(function(data) {
              if (data && typeof data.contents === 'string') {
                self.renderArticleContent(data.contents, item);
              } else {
                throw new Error("Invalid response format from backup proxy");
              }
            })
            .catch(function(backupErr) {
              console.error("All proxies failed to fetch article body:", backupErr);
              self.renderArticleFallback(item);
            });
        });
    },

    renderArticleContent: function(html, item) {
      try {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');
        var scriptTag = doc.getElementById('__NEXT_DATA__');
        
        var title = item.title || "";
        var dateStr = item.pubDate;
        var paragraphs = [];

        if (scriptTag) {
          var data = JSON.parse(scriptTag.textContent);
          var pageProps = data.props && data.props.pageProps;
          if (pageProps && pageProps.page) {
            var keys = Object.keys(pageProps.page);
            if (keys.length > 0) {
              var pageData = pageProps.page[keys[0]];
              if (pageData && Array.isArray(pageData.contents)) {
                pageData.contents.forEach(function(block) {
                  if (block.type === 'paragraph') {
                    var text = "";
                    if (block.model) {
                      if (typeof block.model.text === 'string') {
                        text = block.model.text;
                      } else if (Array.isArray(block.model.blocks)) {
                        block.model.blocks.forEach(function(b) {
                          if (b.model) {
                            if (typeof b.model.text === 'string') {
                              text += b.model.text;
                            } else if (Array.isArray(b.model.blocks)) {
                              b.model.blocks.forEach(function(bb) {
                                if (bb.model && typeof bb.model.text === 'string') {
                                  text += bb.model.text;
                                }
                              });
                            }
                          }
                        });
                      }
                    }
                    if (text.trim()) {
                      paragraphs.push(text.trim());
                    }
                  } else if (block.type === 'subheadline') {
                    var subText = "";
                    if (block.model && typeof block.model.text === 'string') {
                      subText = block.model.text;
                    }
                    if (subText.trim()) {
                      paragraphs.push("### " + subText.trim());
                    }
                  }
                });
              }
            }
          }
        }

        // If JSON parsing yielded no paragraphs, try DOM parser fallback
        if (paragraphs.length === 0) {
          var pTags = doc.querySelectorAll('article p, p');
          if (pTags.length > 0) {
            for (var i = 0; i < pTags.length; i++) {
              var p = pTags[i];
              var t = p.textContent || p.innerText || "";
              if (t.trim() && t.trim().length > 20) {
                paragraphs.push(t.trim());
              }
            }
          }
        }

        // If still empty, use description fallback
        if (paragraphs.length === 0) {
          this.renderArticleFallback(item);
          return;
        }

        this.displayArticle(title, dateStr, paragraphs, false);
      } catch (e) {
        console.warn("Failed to parse article content:", e);
        this.renderArticleFallback(item);
      }
    },

    renderArticleFallback: function(item) {
      var desc = item.description || item.content || "Could not retrieve full article text.";
      desc = desc.replace(/<[^>]*>/g, ""); // strip HTML
      this.displayArticle(item.title, item.pubDate, [desc], true);
    },

    displayArticle: function(title, dateStr, paragraphs, isFallback) {
      var self = this;
      var html = '<div style="display:flex; flex-direction:column; height:100%; justify-content:space-between; padding: 4px 0 0 0;">';
      
      // Article Header (Back button only)
      html += '  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px; border-bottom: var(--border-width-thin) solid var(--border-color); padding-bottom: 6px;">';
      html += '    <button id="article-back-btn" class="trmnl-btn" style="padding: 2px 10px; font-size: 11px; height: 26px; line-height: 1; border-radius: 4px; font-family: var(--font-sans); text-transform: uppercase; cursor: pointer;">&larr; Back</button>';
      if (isFallback) {
        html += '    <span style="font-family: var(--font-mono); font-size: 12px; opacity: 0.7;">(Summary)</span>';
      }
      html += '  </div>';

      // Article Content Viewport
      html += '  <div class="article-reader-body" style="display:flex; flex-direction:column; flex:1; overflow-y:auto; margin-bottom: 12px; padding-right: 8px;">';
      html += '    <h1 style="font-family: var(--font-sans); font-size: 25px; font-weight: 800; line-height: 1.25; margin-bottom: 14px; color: var(--text-color);">' + title + '</h1>';
      
      paragraphs.forEach(function(p) {
        if (p.indexOf("### ") === 0) {
          var sub = p.substring(4);
          html += '    <h2 style="font-family: var(--font-sans); font-size: 20px; font-weight: 700; margin-top: 16px; margin-bottom: 8px; color: var(--text-color);">' + sub + '</h2>';
        } else {
          html += '    <p style="font-family: var(--font-serif); font-size: 18px; line-height: 1.6; margin-bottom: 12px; color: var(--text-color); text-align: justify; opacity: 0.9;">' + p + '</p>';
        }
      });
      html += '  </div>';

      // Custom Dithered Footer Bar
      html += '  <div class="trmnl-footer-bar">';
      html += '    <div class="trmnl-footer-badge">';
      html += '      <svg viewBox="0 0 24 24"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path><path d="M18 14h-8M18 18h-8M16 6H10v4h6V6z"></path></svg>';
      html += '      <span>News Reader</span>';
      html += '    </div>';
      html += '    <div class="trmnl-footer-meta">';
      html += '      <span style="font-family: var(--font-mono); font-size: 11px; opacity: 0.8;">BBC News</span>';
      html += '    </div>';
      html += '  </div>';

      html += '</div>';

      this.container.innerHTML = html;

      var backBtn = this.container.querySelector('#article-back-btn');
      if (backBtn) {
        backBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          if (window.Dashboard && typeof window.Dashboard.resumeTimer === 'function') {
            window.Dashboard.resumeTimer();
          }
          self.renderHeadlines(self.cachedHeadlines || []);
        });
      }
    },

    renderError: function() {
      this.container.innerHTML = 
        '<div class="trmnl-card" style="height:100%; justify-content:center; align-items:center; text-align:center;">' +
        '  <div style="font-size: 48px; margin-bottom: 16px;">📰</div>' +
        '  <div style="font-family: var(--font-mono); font-size: 16px; font-weight:700;">HEADLINES OFFLINE</div>' +
        '  <div style="font-family: var(--font-mono); font-size: 12px; margin-top: 8px; opacity: 0.6;">Could not fetch BBC RSS feed.</div>' +
        '</div>';
    }
  };

  // Register plugin
  window.Plugins = window.Plugins || {};
  window.Plugins.news_headlines = NewsPlugin;

})();
