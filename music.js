(function () {
  if (window.janitorSoundQueueRunning) return;
  window.janitorSoundQueueRunning = true;

  const style = document.createElement("style");
  style.textContent = `
    #janitor-sidebar {
      position: fixed;
      top: 0;
      left: 0;
      width: 320px;
      height: 100%;
      background: #1e1e1e;
      color: white;
      z-index: 9999;
      font-family: sans-serif;
      display: flex;
      flex-direction: column;
      border-right: 2px solid #444;
    }
    #sc-player {
      width: 100%;
      height: 166px;
      border: none;
    }
    #janitor-queue {
      flex: 1;
      overflow-y: auto;
      padding: 10px;
    }
    .song-entry {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 5px;
      padding: 5px;
      background: #2a2a2a;
      border-radius: 5px;
    }
    .song-entry button {
      background: #ff5c5c;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      padding: 2px 6px;
    }
    #janitor-log {
      font-size: 10px;
      background: black;
      color: lime;
      height: 80px;
      overflow-y: auto;
      padding: 5px;
      border-top: 1px solid #333;
    }
  `;
  document.head.appendChild(style);

  const sidebar = document.createElement("div");
  sidebar.id = "janitor-sidebar";
  sidebar.innerHTML = `
    <iframe id="sc-player" src="" allow="autoplay"></iframe>
    <div id="janitor-queue"></div>
    <pre id="janitor-log">[Janitor AI Log]\n</pre>
  `;
  document.body.appendChild(sidebar);

  const log = (msg) => {
    const logBox = document.getElementById("janitor-log");
    if (logBox) logBox.textContent += msg + "\n";
    console.log("[Janitor AI] " + msg);
  };

  const SC_URL_PREFIX = "https://w.soundcloud.com/player/?url=";
  const queue = [];
  const played = new Set();
  let widget = null;

  const loadSoundCloudPlayer = (trackUrl) => {
    const iframe = document.getElementById("sc-player");
    iframe.src = SC_URL_PREFIX + encodeURIComponent(trackUrl) + "&auto_play=true";
    iframe.onload = () => {
      widget = SC.Widget(iframe);
      widget.bind(SC.Widget.Events.FINISH, () => {
        log("🔁 Song finished.");
        queue.shift();
        renderQueue();
        if (queue.length > 0) loadSoundCloudPlayer(queue[0]);
      });
    };
  };

  const renderQueue = () => {
    const queueDiv = document.getElementById("janitor-queue");
    queueDiv.innerHTML = "";
    queue.forEach((trackUrl, idx) => {
      const entry = document.createElement("div");
      entry.className = "song-entry";
      entry.innerHTML = `
        <span>${decodeURIComponent(trackUrl.split("/").pop())}</span>
        <button data-index="${idx}">X</button>
      `;
      entry.querySelector("button").addEventListener("click", (e) => {
        const i = parseInt(e.target.getAttribute("data-index"));
        log("🗑 Removed: " + queue[i]);
        queue.splice(i, 1);
        renderQueue();
        if (i === 0 && queue[0]) loadSoundCloudPlayer(queue[0]);
        if (queue.length === 0) document.getElementById("sc-player").src = "";
      });
      queueDiv.appendChild(entry);
    });
  };

  const tryAttach = () => {
    const button = document.querySelector(".chakra-button.css-1ar7tdv");
    if (button && !button._janitorAttached) {
      log("✅ Attached to send button.");
      button._janitorAttached = true;

      button.addEventListener("click", () => {
        log("✉️ Send clicked");

        setTimeout(() => {
          const blocks = Array.from(document.querySelectorAll("div.css-0"));
          let song = null;
          for (let i = blocks.length - 1; i >= 0; i--) {
            const txt = blocks[i].innerText?.trim();
            if (txt && txt.startsWith("Song: ")) {
              song = txt.replace("Song: ", "").trim();
              break;
            }
          }

          if (!song) return log("⚠️ No 'Song:' found.");
          if (played.has(song)) return log("🔁 Duplicate ignored: " + song);

          const trackUrl = prompt("Paste SoundCloud track URL for:\n" + song);
          if (!trackUrl) return log("❌ No URL provided.");

          log("🎵 Queued: " + trackUrl);
          queue.push(trackUrl);
          played.add(song);
          renderQueue();
          if (queue.length === 1) loadSoundCloudPlayer(trackUrl);
        }, 1000);
      });
    }
  };

  // Load SC API
  const scScript = document.createElement("script");
  scScript.src = "https://w.soundcloud.com/player/api.js";
  scScript.onload = () => {
    setInterval(tryAttach, 2000);
    log("✅ SoundCloud Widget API loaded.");
  };
  document.body.appendChild(scScript);

  // Visual confirmation banner
  const banner = document.createElement("div");
  banner.textContent = "🎵 Janitor Music Script Active";
  banner.style = "position:fixed;top:0;right:0;background:#4caf50;color:white;padding:8px 12px;z-index:10000;font-size:14px;border-bottom-left-radius:8px;";
  document.body.appendChild(banner);
  setTimeout(() => banner.remove(), 4000);
})();
