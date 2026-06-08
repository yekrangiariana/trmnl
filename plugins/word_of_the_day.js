/**
 * British Word of the Day Plugin for TRMNL Dashboard
 * Cycles daily through a curated list of British English terms with phonetics and usage examples.
 * When online, fetches Merriam-Webster Word of the Day RSS feed and queries the Free Dictionary API for definitions, phonetics, and examples.
 * Caches results in localStorage for offline PWA operation.
 */

(function() {
  'use strict';

  var WordPlugin = {
    id: 'word_of_the_day',
    name: 'Word of the Day',
    config: {},
    container: null,

    // Curated British English Dictionary Database (Fallback for offline-first run)
    britishDictionary: [
      { word: "gobsmacked", phonetic: "/ˈɡɒbsmækt/", type: "adjective", definition: "Utterly astonished; astounded.", example: "\"I was completely gobsmacked when she told me the news.\"" },
      { word: "kerfuffle", phonetic: "/kəˈfʌf.əl/", type: "noun", definition: "A commotion or fuss, especially one caused by conflicting views.", example: "\"There was a minor kerfuffle outside the town hall last night.\"" },
      { word: "chuffed", phonetic: "/tʃʌft/", type: "adjective", definition: "Very pleased; delighted.", example: "\"He was chuffed to bits with his birthday present.\"" },
      { word: "codswallop", phonetic: "/ˈkɒdzˌwɒl.əp/", type: "noun", definition: "Nonsense; rubbish.", example: "\"What a load of old codswallop! That cannot possibly be true.\"" },
      { word: "skive", phonetic: "/skaɪv/", type: "verb", definition: "Avoid work or duty by idling or pretending to be ill.", example: "\"I decided to skive off work and spend the sunny afternoon in the park.\"" },
      { word: "widdershins", phonetic: "/ˈwɪd.ə.ʃɪnz/", type: "adverb", definition: "In a direction contrary to the sun's course; anticlockwise.", example: "\"The legend says you must walk widdershins around the well three times.\"" },
      { word: "flummoxed", phonetic: "/ˈflʌm.əkst/", type: "adjective", definition: "Bewildered or perplexed.", example: "\"The physics professor was completely flummoxed by the student's question.\"" },
      { word: "discombobulate", phonetic: "/ˌdɪs.kəmˈbɒb.jə.leɪt/", type: "verb", definition: "To disconcert, upset, or confuse.", example: "\"The sudden layout changes discombobulated the regular users.\"" },
      { word: "shenanigans", phonetic: "/ʃəˈnæn.ɪ.ɡənz/", type: "noun", definition: "Secret or dishonest activity; silly or high-spirited behavior.", example: "\"I suspect there were some political shenanigans involved in the vote.\"" },
      { word: "barmy", phonetic: "/ˈbɑː.mi/", type: "adjective", definition: "Mad; eccentric or foolish.", example: "\"That is a completely barmy idea, but it just might work!\"" },
      { word: "miffed", phonetic: "/mɪft/", type: "adjective", definition: "Somewhat annoyed; peeved.", example: "\"She was a bit miffed that they hadn't invited her to the dinner party.\"" },
      { word: "knackered", phonetic: "/ˈnæk.əd/", type: "adjective", definition: "Extremely tired; exhausted.", example: "\"I am absolutely knackered after that ten-mile trek up the hills.\"" },
      { word: "faff", phonetic: "/fæf/", type: "verb / noun", definition: "To spend time in ineffectual activity; a prolonged fuss.", example: "\"Stop faffing about and get your boots on, we are late!\"" },
      { word: "gumption", phonetic: "/ˈɡʌmp.ʃən/", type: "noun", definition: "Shrewd or spirited initiative and resourcefulness.", example: "\"At least he had the gumption to apologize for his mistakes.\"" },
      { word: "palaver", phonetic: "/pəˈlɑː.və/", type: "noun", definition: "Prolonged and tedious fuss or discussion.", example: "\"What a palaver just to sign a simple piece of paper!\"" },
      { word: "suss", phonetic: "/sʌs/", type: "verb", definition: "To realize, figure out, or investigate.", example: "\"It took me a while to suss out how the e-paper screen refreshed.\"" },
      { word: "dilly-dally", phonetic: "/ˈdɪl.i.ˌdæl.i/", type: "verb", definition: "Waste time through aimless wandering or indecision.", example: "\"Don't dilly-dally on the way to the station, the train leaves soon.\"" },
      { word: "scrumptious", phonetic: "/ˈskrʌmp.ʃəs/", type: "adjective", definition: "Extremely delicious; excellent.", example: "\"That was a scrumptious chocolate gateau we had for tea.\"" },
      { word: "quixotic", phonetic: "/kwɪkˈsɒt.ɪk/", type: "adjective", definition: "Extremely idealistic; unrealistic and impractical.", example: "\"He launched a quixotic campaign to change the county laws.\"" },
      { word: "wonky", phonetic: "/ˈwɒŋ.ki/", type: "adjective", definition: "Crooked; off-center or unsteady.", example: "\"The kitchen table leg is wonky, can you balance it with card?\"" },
      { word: "posh", phonetic: "/pɒʃ/", type: "adjective", definition: "Elegant or stylishly luxurious; high-class.", example: "\"They stayed at a very posh hotel during their holiday in London.\"" },
      { word: "dodgy", phonetic: "/ˈdɒdʒ.i/", type: "adjective", definition: "Dishonest, unreliable, or risky.", example: "\"I bought this camera from a dodgy website and now it won't turn on.\"" },
      { word: "cheeky", phonetic: "/ˈtʃiː.ki/", type: "adjective", definition: "Impudent or irreverent, typically in an amusing way.", example: "\"The toddler gave her mother a cheeky grin and ran off.\"" },
      { word: "skulduggery", phonetic: "/skʌlˈdʌɡ.ər.i/", type: "noun", definition: "Underhanded or unscrupulous behavior; trickery.", example: "\"The investigative report uncovered corporate skulduggery on a large scale.\"" },
      { word: "collywobbles", phonetic: "/ˈkɒl.i.ˌwɒb.əlz/", type: "noun", definition: "Nervous anxiety; butterflies in the stomach.", example: "\"Giving a speech to the board always gives me the collywobbles.\"" },
      { word: "namby-pamby", phonetic: "/ˌnæm.biˈpæm.bi/", type: "adjective", definition: "Lacking energy, strength, or courage; feeble.", example: "\"We need decisive leadership, not namby-pamby statements.\"" },
      { word: "skive", phonetic: "/skaɪv/", type: "verb", definition: "To avoid work or school by playing truant.", example: "\"If we skive off lessons this afternoon, we can go to the football match.\"" }
    ],

    init: function(pluginConfig) {
      this.config = pluginConfig || {};
    },

    render: function(element) {
      this.container = element;
      this.fetchAndRenderWord();
    },

    update: function() {
      this.fetchAndRenderWord();
    },

    fetchAndRenderWord: function() {
      if (!this.container) return;

      var self = this;
      var todayDateStr = new Date().toDateString();

      // Check if we have cached today's word
      try {
        var cached = localStorage.getItem('trmnl_word_of_day_cache');
        if (cached) {
          var parsed = JSON.parse(cached);
          if (parsed && parsed.cacheDate === todayDateStr && parsed.source === "Wiktionary") {
            self.drawWord(parsed);
            return;
          }
        }
      } catch (e) {
        console.warn("Error reading word cache:", e);
      }

      // If online, attempt to fetch live word
      if (navigator.onLine) {
        var cacheBuster = Math.floor(Date.now() / (3 * 60 * 60 * 1000));
        var feedUrl = "https://en.wiktionary.org/w/api.php?action=featuredfeed&feed=wotd&feedformat=rss&_t=" + cacheBuster;
        var proxyUrl = "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(feedUrl);

        fetch(proxyUrl)
          .then(function(res) {
            if (!res.ok) throw new Error("RSS proxy fetch failed");
            return res.json();
          })
          .then(function(rssData) {
            if (rssData && rssData.status === "ok" && rssData.items && rssData.items.length > 0) {
              // Wiktionary RSS items are in chronological order; the last item is the most recent
              var item = rssData.items[rssData.items.length - 1];
              var rawDesc = item.description || "";
              
              var parser = new DOMParser();
              var doc = parser.parseFromString(rawDesc, "text/html");
              
              // Extract the word
              var titleSpan = doc.getElementById("WOTD-rss-title");
              var liveWord = "";
              if (titleSpan) {
                liveWord = titleSpan.textContent.trim().toLowerCase();
              } else {
                var bAnchor = doc.querySelector("b a");
                if (bAnchor) {
                  liveWord = bAnchor.textContent.trim().toLowerCase();
                }
              }

              if (!liveWord) {
                throw new Error("Could not parse word from Wiktionary feed");
              }

              // Extract part of speech
              var partOfSpeech = "noun";
              var posElem = doc.querySelector("b + i") || doc.querySelector("a + i") || doc.querySelector("i");
              if (posElem) {
                partOfSpeech = posElem.textContent.trim().toLowerCase();
              }
              var posMapping = {
                "n": "noun",
                "v": "verb",
                "adj": "adjective",
                "adv": "adverb",
                "prep": "preposition",
                "conj": "conjunction",
                "pron": "pronoun",
                "interj": "interjection",
                "phrase": "phrase"
              };
              if (posMapping[partOfSpeech]) {
                partOfSpeech = posMapping[partOfSpeech];
              }

              // Extract definition
              var definitionText = "No definition available.";
              var defElem = doc.querySelector("#WOTD-rss-description li") || doc.querySelector("ol li");
              if (defElem) {
                var tempDiv = document.createElement("div");
                tempDiv.innerHTML = defElem.innerHTML;
                var subElems = tempDiv.querySelectorAll("ol, ul, dl, audio, style, script");
                subElems.forEach(function(el) {
                  el.remove();
                });
                definitionText = tempDiv.textContent.trim();
              }

              // Attempt to fetch phonetic transcription and usage example from the Free Dictionary API
              var phoneticText = "";
              var exampleText = "";
              var dictUrl = "https://api.dictionaryapi.dev/api/v2/entries/en/" + encodeURIComponent(liveWord);

              fetch(dictUrl)
                .then(function(dictRes) {
                  if (!dictRes.ok) throw new Error("Dictionary lookup failed");
                  return dictRes.json();
                })
                .then(function(dictData) {
                  if (dictData && dictData.length > 0) {
                    var entry = dictData[0];
                    
                    // Parse phonetic transcription
                    phoneticText = entry.phonetic || "";
                    if (!phoneticText && entry.phonetics && entry.phonetics.length > 0) {
                      for (var i = 0; i < entry.phonetics.length; i++) {
                        if (entry.phonetics[i].text) {
                          phoneticText = entry.phonetics[i].text;
                          break;
                        }
                      }
                    }

                    // Parse example sentence
                    if (entry.meanings && entry.meanings.length > 0) {
                      for (var m = 0; m < entry.meanings.length; m++) {
                        var meaning = entry.meanings[m];
                        if (meaning.definitions && meaning.definitions.length > 0) {
                          for (var d = 0; d < meaning.definitions.length; d++) {
                            if (meaning.definitions[d].example) {
                              exampleText = meaning.definitions[d].example;
                              break;
                            }
                          }
                        }
                        if (exampleText) break;
                      }
                    }
                  }
                  finalizeAndRender();
                })
                .catch(function(err) {
                  console.warn("Free Dictionary lookup failed/skipped for word: " + liveWord, err);
                  finalizeAndRender();
                });

              function finalizeAndRender() {
                if (exampleText && !exampleText.startsWith('"') && !exampleText.startsWith('“')) {
                  exampleText = '"' + exampleText + '"';
                }

                var newWordObj = {
                  word: liveWord,
                  phonetic: phoneticText,
                  type: partOfSpeech,
                  definition: definitionText,
                  example: exampleText,
                  source: "Wiktionary",
                  cacheDate: todayDateStr
                };

                // Cache in localStorage
                try {
                  localStorage.setItem('trmnl_word_of_day_cache', JSON.stringify(newWordObj));
                } catch (err) {
                  console.warn("Failed to write word cache:", err);
                }

                self.drawWord(newWordObj);
              }
            } else {
              throw new Error("Invalid RSS proxy data");
            }
          })
          .catch(function(err) {
            console.error("Live word of the day fetch failed, falling back to local list:", err);
            self.loadFallbackWord();
          });
      } else {
        self.loadFallbackWord();
      }
    },

    loadFallbackWord: function() {
      // Offline/Failure Fallback: cycle local array
      var now = new Date();
      var start = new Date(now.getFullYear(), 0, 0);
      var diff = now - start;
      var oneDay = 1000 * 60 * 60 * 24;
      var dayOfYear = Math.floor(diff / oneDay);
      
      var dictSize = this.britishDictionary.length;
      var selected = this.britishDictionary[dayOfYear % dictSize];
      
      // Add offline source tag
      var todayDateStr = new Date().toDateString();
      var fallbackObj = Object.assign({}, selected, { 
        source: "Local Curated List",
        cacheDate: todayDateStr
      });

      // Cache fallback word so we don't continuously request on subsequent ticks
      try {
        localStorage.setItem('trmnl_word_of_day_cache', JSON.stringify(fallbackObj));
      } catch (err) {
        console.warn("Failed to write word cache:", err);
      }

      this.drawWord(fallbackObj);
    },

    drawWord: function(selected) {
      var html = '<div style="display:flex; flex-direction:column; height:100%; justify-content:space-between; padding: 10px 0;">';
      
      // Content container
      html += '  <div class="trmnl-card" style="flex:1; display:flex; flex-direction:column; justify-content:space-between; padding: 32px 40px; margin-bottom: 16px;">';
      
      // Word details
      html += '    <div style="flex:1; display:flex; flex-direction:column; justify-content:center;">';
      html += '      <div class="text-serif" style="font-size: 58px; font-weight: 600; line-height: 1.1; margin-bottom: 4px; color: var(--text-color); text-transform: lowercase;">' + selected.word + '</div>';
      
      // Phonetic & Type row
      html += '      <div style="display:flex; align-items:center; font-family: var(--font-mono); font-size: 15px; opacity:0.8; margin-bottom: 24px;">';
      if (selected.phonetic) {
        html += '        <span style="font-weight:700; margin-right: 12px;">' + selected.phonetic + '</span>';
      }
      html += '        <span style="font-style:italic;">' + selected.type + '</span>';
      html += '      </div>';

      // Definition
      html += '      <div class="text-serif" style="font-size: 22px; line-height: 1.4; font-weight: 500; margin-bottom: 20px; border-left: var(--border-width) solid var(--border-color); padding-left: 16px;">';
      html += '        ' + selected.definition;
      html += '      </div>';

      // Example sentence
      if (selected.example) {
        html += '      <div style="font-family: var(--font-sans); font-size: 17px; font-style: italic; line-height: 1.45; opacity:0.75; padding-left: 20px;">';
        html += '        ' + selected.example;
        html += '      </div>';
      }
      html += '    </div>';

      html += '  </div>';

      // Dithered Footer Bar
      var sourceMeta = selected.source || "Wiktionary";
      html += '  <div class="trmnl-footer-bar">';
      html += '    <div class="trmnl-footer-badge">';
      // Inline Book/Dictionary SVG
      html += '      <svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>';
      html += '      <span>Word of the Day</span>';
      html += '    </div>';
      html += '    <div class="trmnl-footer-meta">FEED: ' + sourceMeta.toUpperCase() + '</div>';
      html += '  </div>';

      html += '</div>';

      this.container.innerHTML = html;
    }
  };

  // Register plugin
  window.Plugins = window.Plugins || {};
  window.Plugins.word_of_the_day = WordPlugin;

})();
