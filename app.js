/* ═══════════════════════════════════════════════════════════════════════
   AOL TIME WARNER — COMBINED SERVICE FRONT-DOOR PORTAL
   Application Logic — 2001 "Show Me" Phase
   ═══════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ─── TICKER DATA ──────────────────────────────────────────────────
  const tickerHeadlines = [
    { text: 'AOL Time Warner merger clears FTC review, final approval expected Q1 2001', category: 'BUSINESS' },
    { text: 'President Bush signs $1.35 trillion tax cut into law', category: 'POLITICS' },
    { text: 'Microsoft found to have violated antitrust laws; breakup order debated', category: 'TECH' },
    { text: 'Nasdaq falls below 2,000 for first time since 1998 amid tech selloff', category: 'MARKETS' },
    { text: 'Harry Potter and the Sorcerer\'s Stone breaks opening weekend box office records', category: 'ENTERTAINMENT' },
    { text: 'Wikipedia launches as a free online encyclopedia', category: 'TECH' },
    { text: 'U.S. unemployment rate rises to 4.9% as dot-com layoffs mount', category: 'ECONOMY' },
    { text: 'Apple unveils iPod: "1,000 songs in your pocket"', category: 'TECH' },
    { text: 'Barry Bonds hits 73rd home run, setting new single-season record', category: 'SPORTS' },
    { text: 'Road Runner Cable broadband now available in 12 new markets', category: 'AOL/TW' },
  ];

  // ─── INITIALIZATION ───────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    initDialupSequence();
    initTicker();
    initClock();
    initGreeting();
    initAIM();
    initEntertainmentTabs();
    initConnectionToggle();
    initPollWidget();
    initCrossSellMetrics();
    initSearch();
    initToasts();
    initCNNRefresh();
    initMailWidget();
  });

  // ─── DIAL-UP CONNECTION SEQUENCE ──────────────────────────────────
  function initDialupSequence() {
    const overlay = document.createElement('div');
    overlay.className = 'dialup-overlay';
    overlay.innerHTML = `
      <div class="dialup-logo">
        <div style="font-size:48px;color:#FFD700;font-weight:900;font-family:Arial;text-shadow:0 0 20px rgba(255,215,0,.5);">▲ AOL</div>
      </div>
      <div class="dialup-text">Initializing modem...
Dialing 1-800-AOL-TIME...
Connecting at 56,000 bps...
Verifying screen name: SurfDude2001
Welcome to AOL Time Warner!</div>
    `;
    document.body.prepend(overlay);

    // Play dial-up sound simulation with visual feedback
    const statusLines = overlay.querySelectorAll('.dialup-text');

    setTimeout(function () {
      overlay.style.transition = 'opacity 1s ease';
      overlay.style.opacity = '0';
      setTimeout(function () {
        overlay.remove();
        showToast('✉', 'You\'ve Got Mail!', '3 new messages in your AOL Mailbox');
        setTimeout(function () {
          showToast('💬', 'AIM Buddy Alert', 'MovieFan99 has signed on');
        }, 2000);
      }, 1000);
    }, 3500);
  }

  // ─── NEWS TICKER ──────────────────────────────────────────────────
  function initTicker() {
    const container = document.getElementById('ticker-content');
    if (!container) return;

    // Build ticker items — duplicate for seamless scroll
    let html = '';
    for (let i = 0; i < 3; i++) {
      tickerHeadlines.forEach(function (item) {
        html += '<span class="ticker-item">' +
          '<span class="ticker-bullet">▸</span>' +
          '<strong>' + item.category + ':</strong> ' +
          '<a href="#">' + item.text + '</a>' +
          '</span>';
      });
    }
    container.innerHTML = html;
  }

  // ─── CLOCK ────────────────────────────────────────────────────────
  function initClock() {
    function updateClock() {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      const tickerTime = document.getElementById('ticker-time');
      if (tickerTime) tickerTime.textContent = timeStr;

      const cnnTimestamp = document.getElementById('cnn-timestamp');
      if (cnnTimestamp) {
        cnnTimestamp.textContent = 'Updated: ' + now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      }
    }
    updateClock();
    setInterval(updateClock, 1000);
  }

  // ─── GREETING ─────────────────────────────────────────────────────
  function initGreeting() {
    const hour = new Date().getHours();
    var greeting;
    if (hour < 12) greeting = 'Good Morning';
    else if (hour < 17) greeting = 'Good Afternoon';
    else greeting = 'Good Evening';

    const greetingEl = document.getElementById('hero-greeting');
    if (greetingEl) greetingEl.textContent = greeting + ', SurfDude2001';

    const dateEl = document.getElementById('hero-date');
    if (dateEl) {
      // Simulate being in 2001
      dateEl.textContent = 'Monday, October 15, 2001';
    }
  }

  // ─── AIM (AOL INSTANT MESSENGER) ─────────────────────────────────
  function initAIM() {
    // Category toggle
    var catHeaders = document.querySelectorAll('.aim-cat-header');
    catHeaders.forEach(function (header) {
      header.addEventListener('click', function () {
        var catName = this.getAttribute('data-toggle');
        var list = document.getElementById('buddy-list-' + catName);
        var arrow = this.querySelector('.aim-cat-arrow');
        if (list) {
          list.classList.toggle('collapsed');
          arrow.textContent = list.classList.contains('collapsed') ? '▸' : '▾';
        }
      });
    });

    // Open chat on buddy click
    var buddies = document.querySelectorAll('.aim-buddy.online, .aim-buddy.away');
    buddies.forEach(function (buddy) {
      buddy.addEventListener('click', function () {
        var name = this.querySelector('.buddy-name').textContent;
        openAIMChat(name);
      });
    });

    // Chat close
    var closeBtn = document.getElementById('aim-chat-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        document.getElementById('aim-chat-window').classList.add('hidden');
      });
    }

    // Chat send
    var chatSendBtn = document.getElementById('aim-chat-send');
    var chatInput = document.getElementById('aim-chat-input');
    if (chatSendBtn && chatInput) {
      chatSendBtn.addEventListener('click', function () {
        sendAIMMessage();
      });
      chatInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') sendAIMMessage();
      });
    }

    // Send IM button
    var sendIMBtn = document.getElementById('aim-send-im');
    if (sendIMBtn) {
      sendIMBtn.addEventListener('click', function () {
        openAIMChat('MovieFan99');
      });
    }

    // Simulate buddy activity
    setTimeout(function () {
      showToast('💬', 'AIM Message', 'MovieFan99: Did you see the HP trailer? 🧙');
    }, 8000);

    // Minimize
    var minBtn = document.getElementById('aim-minimize');
    if (minBtn) {
      minBtn.addEventListener('click', function () {
        var body = document.getElementById('aim-body');
        if (body) body.classList.toggle('hidden');
        this.textContent = body.classList.contains('hidden') ? '+' : '−';
      });
    }
  }

  function openAIMChat(buddyName) {
    var chatWindow = document.getElementById('aim-chat-window');
    var buddyTitle = document.getElementById('aim-chat-buddy-name');
    var messages = document.getElementById('aim-chat-messages');

    if (buddyTitle) buddyTitle.textContent = buddyName;

    // Set conversation based on buddy
    var conversationStarters = {
      'MovieFan99': [
        { from: buddyName, text: 'Hey! Did you see the new Harry Potter trailer? 🧙' },
        { from: buddyName, text: 'It\'s on the WB page right now!' }
      ],
      'CableGuy_NYC': [
        { from: buddyName, text: 'Dude, Road Runner just went live in our area!' },
        { from: buddyName, text: 'No more waiting 10 min for pages to load lol' }
      ],
      'TechWiz42': [
        { from: buddyName, text: 'Did you read about Windows XP launch?' },
        { from: buddyName, text: 'Looks pretty slick actually' }
      ],
      'JennyX2001': [
        { from: buddyName, text: 'hey! are you watching Sopranos on Sunday?' }
      ],
      'MomOnline': [
        { from: buddyName, text: 'Hi sweetie! How do I change my screen name? 😂' }
      ]
    };

    var convo = conversationStarters[buddyName] || [
      { from: buddyName, text: 'Hey there!' }
    ];

    if (messages) {
      messages.innerHTML = '';
      convo.forEach(function (msg) {
        var div = document.createElement('div');
        div.className = 'chat-msg incoming';
        div.innerHTML = '<span class="chat-name">' + msg.from + ':</span> ' + msg.text;
        messages.appendChild(div);
      });
    }

    if (chatWindow) chatWindow.classList.remove('hidden');
    var input = document.getElementById('aim-chat-input');
    if (input) input.focus();
  }

  function sendAIMMessage() {
    var input = document.getElementById('aim-chat-input');
    var messages = document.getElementById('aim-chat-messages');
    if (!input || !messages || !input.value.trim()) return;

    var msgDiv = document.createElement('div');
    msgDiv.className = 'chat-msg outgoing';
    msgDiv.innerHTML = '<span class="chat-name">SurfDude2001:</span> ' + escapeHtml(input.value);
    messages.appendChild(msgDiv);
    messages.scrollTop = messages.scrollHeight;

    var userMsg = input.value;
    input.value = '';

    // Simulate reply
    setTimeout(function () {
      var buddyName = document.getElementById('aim-chat-buddy-name').textContent;
      var replies = [
        'LOL totally! 😂',
        'Yeah I saw that!',
        'brb phone ringing',
        'That\'s awesome!',
        'Check out the WB page for more',
        'haha nice',
        'g2g dinner time, ttyl! 👋',
        'OMG really??',
        'Cool cool cool'
      ];
      var reply = replies[Math.floor(Math.random() * replies.length)];
      var replyDiv = document.createElement('div');
      replyDiv.className = 'chat-msg incoming';
      replyDiv.innerHTML = '<span class="chat-name">' + buddyName + ':</span> ' + reply;
      messages.appendChild(replyDiv);
      messages.scrollTop = messages.scrollHeight;
    }, 1500 + Math.random() * 2000);
  }

  // ─── ENTERTAINMENT TABS ───────────────────────────────────────────
  function initEntertainmentTabs() {
    var tabs = document.querySelectorAll('.mod-tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var targetTab = this.getAttribute('data-tab');

        // Update active tab
        tabs.forEach(function (t) { t.classList.remove('active'); });
        this.classList.add('active');

        // Show corresponding content
        var contents = document.querySelectorAll('.ent-tab-content');
        contents.forEach(function (c) { c.classList.remove('active'); });
        var target = document.getElementById('tab-content-' + targetTab);
        if (target) target.classList.add('active');
      });
    });

    // Trailer button
    var trailerBtn = document.getElementById('btn-hp-trailer');
    if (trailerBtn) {
      trailerBtn.addEventListener('click', function () {
        showToast('🎬', 'Harry Potter Trailer', 'Trailer requires Road Runner Cable broadband connection. Your current connection: 56k Dial-Up. Upgrade to watch video content!');
      });
    }

    // Stills button
    var stillsBtn = document.getElementById('btn-hp-stills');
    if (stillsBtn) {
      stillsBtn.addEventListener('click', function () {
        showToast('📸', 'Production Stills', 'Loading 4 images (45KB each)... Estimated time on 56k: 25 seconds');
      });
    }

    // Audio button
    var audioBtn = document.getElementById('btn-hp-audio');
    if (audioBtn) {
      audioBtn.addEventListener('click', function () {
        showToast('🎤', 'Cast Interview', 'Loading RealAudio clip (180KB)... Estimated time on 56k: 32 seconds. Launching RealPlayer...');
      });
    }

    // Sopranos buttons
    var guideBtn = document.getElementById('btn-sopranos-guide');
    if (guideBtn) {
      guideBtn.addEventListener('click', function () {
        showToast('📋', 'Episode Guide', 'Loading The Sopranos Season 3 Episode Guide (8KB)...');
      });
    }

    // Music play buttons
    var musicPlays = document.querySelectorAll('.music-play');
    musicPlays.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var artist = this.parentElement.querySelector('.music-artist').textContent;
        var track = this.parentElement.querySelector('.music-track').textContent;
        showToast('🎵', 'Now Playing', artist + ' — ' + track + '\nStreaming via RealAudio (56k)...');
        // Visual feedback
        this.textContent = '■';
        this.style.background = 'var(--tw-red)';
        var self = this;
        setTimeout(function () {
          self.textContent = '▶';
          self.style.background = '';
        }, 5000);
      });
    });
  }

  // ─── CONNECTION TOGGLE ────────────────────────────────────────────
  function initConnectionToggle() {
    var toggleBtn = document.getElementById('conn-toggle');
    var dropdown = document.getElementById('conn-dropdown');
    if (!toggleBtn || !dropdown) return;

    toggleBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      dropdown.classList.toggle('hidden');
    });

    var options = dropdown.querySelectorAll('.conn-option');
    options.forEach(function (opt) {
      opt.addEventListener('click', function () {
        var speed = this.getAttribute('data-speed');
        options.forEach(function (o) { o.classList.remove('active'); });
        this.classList.add('active');
        var label = document.querySelector('.conn-label');
        if (label) {
          if (speed === 'cable') {
            label.textContent = 'Connected — Road Runner Cable';
            showToast('🚀', 'Broadband Mode', 'Switched to Road Runner Cable. High-bandwidth content unlocked!');
          } else {
            label.textContent = 'Connected — 56k Dial-Up';
            showToast('📞', 'Dial-Up Mode', 'Switched to 56k Dial-Up. Multimedia content bandwidth-limited.');
          }
        }
        dropdown.classList.add('hidden');
      });
    });

    document.addEventListener('click', function () {
      dropdown.classList.add('hidden');
    });
  }

  // ─── POLL WIDGET ──────────────────────────────────────────────────
  function initPollWidget() {
    var voteBtn = document.getElementById('poll-vote');
    if (!voteBtn) return;

    voteBtn.addEventListener('click', function () {
      var selected = document.querySelector('input[name="poll"]:checked');
      if (!selected) {
        showToast('⚠', 'Poll', 'Please select an option before voting.');
        return;
      }

      var results = document.getElementById('poll-results');
      var options = document.querySelector('.poll-options');
      if (results) results.classList.remove('hidden');
      if (options) options.style.opacity = '0.5';
      this.disabled = true;
      this.textContent = 'Voted ✓';
      this.style.background = 'var(--aol-gray)';
      this.style.borderColor = 'var(--aol-gray)';

      showToast('📊', 'Poll', 'Thank you for voting! 14,329 total votes.');
    });
  }

  // ─── CROSS-SELL METRICS ───────────────────────────────────────────
  function initCrossSellMetrics() {
    var impressions = 0;
    var clicks = 0;

    // Update impression count when visible
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          impressions++;
          updateMetric('metric-impressions', impressions.toLocaleString());
        }
      });
    }, { threshold: 0.5 });

    var crosssellSection = document.getElementById('track3-cross-sell');
    if (crosssellSection) observer.observe(crosssellSection);

    // Track CTA clicks
    var offerBtns = document.querySelectorAll('.offer-btn');
    offerBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        clicks++;
        var ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(1) : '0.0';
        updateMetric('metric-ctr', ctr + '%');

        var offerId = this.id;
        if (offerId === 'offer-hbo-btn') {
          showToast('📺', 'HBO Bundle', 'HBO bundle offer added to your cart! A Time Warner Cable representative will contact you within 24 hours to activate HBO.');
          this.textContent = 'Added ✓';
          this.disabled = true;
          updateMetric('metric-conv', clicks.toString());
        } else if (offerId === 'offer-time-btn') {
          showToast('📰', 'TIME Subscription', 'TIME Digital subscription activated! Your first issue arrives next week. Digital access is available immediately.');
          this.textContent = 'Subscribed ✓';
          this.disabled = true;
          updateMetric('metric-conv', clicks.toString());
        } else if (offerId === 'offer-rr-btn') {
          showToast('🚀', 'Road Runner Check', 'Checking Road Runner availability for your area... Please enter your ZIP code on the next page.');
        }
      });
    });
  }

  function updateMetric(id, value) {
    var el = document.getElementById(id);
    if (el) {
      el.textContent = value;
      el.style.transform = 'scale(1.2)';
      setTimeout(function () { el.style.transform = 'scale(1)'; }, 300);
    }
  }

  // ─── SEARCH ───────────────────────────────────────────────────────
  function initSearch() {
    var form = document.getElementById('search-form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var query = document.getElementById('search-input').value;
      var scope = document.getElementById('search-scope').value;
      if (query.trim()) {
        showToast('🔍', 'AOL Search', 'Searching ' + scope.toUpperCase() + ' for "' + query + '"...\nPowered by AOL Search / Netscape');
      }
    });

    // Keyword Go
    var keywordGo = document.getElementById('keyword-go');
    var keywordInput = document.getElementById('keyword-input');
    if (keywordGo && keywordInput) {
      keywordGo.addEventListener('click', function () {
        var kw = keywordInput.value.trim();
        if (kw) {
          showToast('🔑', 'AOL Keyword', 'Going to keyword: ' + kw);
        }
      });
      keywordInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') keywordGo.click();
      });
    }

    // Popular keywords
    var keywords = document.querySelectorAll('.keyword-tag');
    keywords.forEach(function (kw) {
      kw.addEventListener('click', function (e) {
        e.preventDefault();
        showToast('🔑', 'AOL Keyword', 'Going to keyword: ' + this.textContent);
      });
    });
  }

  // ─── CNN REFRESH ──────────────────────────────────────────────────
  function initCNNRefresh() {
    var refreshBtn = document.getElementById('cnn-refresh');
    if (!refreshBtn) return;

    refreshBtn.addEventListener('click', function () {
      var headlines = document.getElementById('cnn-headlines');
      if (headlines) {
        headlines.style.opacity = '0.4';
        var self = this;
        self.style.animation = 'spin 0.5s linear';
        setTimeout(function () {
          headlines.style.opacity = '1';
          self.style.animation = '';
          showToast('📡', 'CNN News Wire', 'Headlines refreshed. Feed payload: 11.2KB');
        }, 800);
      }
    });

    // Add spin keyframe dynamically
    var style = document.createElement('style');
    style.textContent = '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
    document.head.appendChild(style);
  }

  // ─── MAIL WIDGET ──────────────────────────────────────────────────
  function initMailWidget() {
    var mailBtn = document.getElementById('open-mail-btn');
    var mailHeaderBtn = document.getElementById('btn-mail');

    function openMail() {
      showToast('✉', 'AOL Mail', 'Opening Mailbox...\n\n📩 From: AOL Member Services — Welcome to AOL Time Warner!\n📩 From: MovieFone — Harry Potter tickets on sale now!\n📩 From: TIME.com — Your weekly digest is ready');
    }

    if (mailBtn) mailBtn.addEventListener('click', openMail);
    if (mailHeaderBtn) mailHeaderBtn.addEventListener('click', openMail);
  }

  // ─── TOAST SYSTEM ────────────────────────────────────────────────
  function initToasts() {
    // Subscribe button toast
    var subBtn = document.getElementById('time-subscribe-btn');
    if (subBtn) {
      subBtn.addEventListener('click', function () {
        showToast('📖', 'TIME Subscription', 'Redirecting to TIME.com subscription page... Special AOL member pricing: $3.99/mo (reg. $7.99/mo)');
      });
    }

    // Ad CTA
    var adCta = document.getElementById('ad-cta-learn');
    if (adCta) {
      adCta.addEventListener('click', function () {
        showToast('📺', 'AOL × Time Warner Bundle', 'Learn about our exclusive all-in-one subscription bundle. AOL + HBO + TIME starting at $29.95/mo.');
      });
    }

    // My AOL
    var myAolBtn = document.getElementById('btn-myaol');
    if (myAolBtn) {
      myAolBtn.addEventListener('click', function () {
        showToast('🏠', 'My AOL', 'Your personalized AOL dashboard. Customize channels, parental controls, and account settings.');
      });
    }

    // Favorites
    var favBtn = document.getElementById('btn-favorites');
    if (favBtn) {
      favBtn.addEventListener('click', function () {
        showToast('❤', 'Favorites', 'Your saved Favorite Places:\n★ CNN.com\n★ HBO.com\n★ AOL Shopping\n★ MapQuest');
      });
    }

    // Chat Room button
    var chatRoomBtn = document.getElementById('aim-chat-room');
    if (chatRoomBtn) {
      chatRoomBtn.addEventListener('click', function () {
        showToast('💬', 'AOL Chat Rooms', 'Opening Chat Room Directory...\n\n🔥 Popular: Movies, Music, Sports\n⭐ Featured: AOL Time Warner Town Hall\n🆕 New: Harry Potter Fan Chat');
      });
    }
  }

  function showToast(icon, title, message) {
    var container = document.getElementById('toast-container');
    if (!container) return;

    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML =
      '<span class="toast-icon">' + icon + '</span>' +
      '<div class="toast-body">' +
      '<div class="toast-title">' + escapeHtml(title) + '</div>' +
      '<div class="toast-message">' + escapeHtml(message).replace(/\n/g, '<br>') + '</div>' +
      '</div>' +
      '<button class="toast-close">✕</button>';

    var closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', function () {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(function () { toast.remove(); }, 300);
    });

    container.appendChild(toast);

    // Auto-dismiss after 6 seconds
    setTimeout(function () {
      if (toast.parentNode) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(function () { toast.remove(); }, 300);
      }
    }, 6000);
  }

  // ─── UTILITIES ────────────────────────────────────────────────────
  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ─── PERIODIC BUDDY STATUS CHANGES ────────────────────────────────
  setTimeout(function () {
    // Simulate a buddy signing off
    var buddy = document.querySelector('.aim-buddy.away');
    if (buddy) {
      buddy.classList.remove('away');
      buddy.classList.add('offline');
      var statusDot = buddy.querySelector('.buddy-status');
      if (statusDot) statusDot.textContent = '○';
      var idle = buddy.querySelector('.buddy-idle');
      if (idle) idle.textContent = '';
      var name = buddy.querySelector('.buddy-name');
      showToast('💬', 'AIM', (name ? name.textContent : 'A buddy') + ' has signed off');
    }
  }, 15000);

  setTimeout(function () {
    // Simulate a buddy signing on
    var offlineBuddies = document.querySelectorAll('.aim-buddy.offline');
    if (offlineBuddies.length > 0) {
      var buddy = offlineBuddies[Math.floor(Math.random() * offlineBuddies.length)];
      buddy.classList.remove('offline');
      buddy.classList.add('online');
      var statusDot = buddy.querySelector('.buddy-status');
      if (statusDot) statusDot.textContent = '●';
      var name = buddy.querySelector('.buddy-name');
      showToast('💬', 'AIM Buddy Alert', (name ? name.textContent : 'A buddy') + ' has signed on');
    }
  }, 25000);

  // ─── SIMULATE "AD ROTATION" ───────────────────────────────────────
  var adVariations = [
    {
      headline: 'The Future is Connected.',
      sub: 'Get AOL Plus + HBO + TIME — One subscription, unlimited worlds.',
      metric: 'CPM Lift Test A/B — Cohort 7a'
    },
    {
      headline: 'Unlimited Entertainment Awaits.',
      sub: 'Harry Potter, The Sopranos, TIME — all at your fingertips with AOL.',
      metric: 'CPM Lift Test A/B — Cohort 7b'
    },
    {
      headline: 'Stay Informed. Stay Connected.',
      sub: 'CNN + AOL: Breaking news delivered to your desktop, instantly.',
      metric: 'CPM Lift Test — News vertical cohort 4a'
    }
  ];
  var adIndex = 0;

  setInterval(function () {
    adIndex = (adIndex + 1) % adVariations.length;
    var adEl = document.getElementById('ad-leaderboard');
    if (adEl) {
      var headline = adEl.querySelector('.ad-headline');
      var sub = adEl.querySelector('.ad-sub');
      var metric = adEl.querySelector('.ad-metrics-tag');
      if (headline) {
        adEl.style.opacity = '0';
        adEl.style.transition = 'opacity 0.5s ease';
        setTimeout(function () {
          headline.textContent = adVariations[adIndex].headline;
          sub.textContent = adVariations[adIndex].sub;
          metric.textContent = adVariations[adIndex].metric;
          adEl.style.opacity = '1';
        }, 500);
      }
    }
  }, 12000);

})();
