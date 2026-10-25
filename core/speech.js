// Озвучка: сначала файл audio/<язык>/<ключ>.mp3, если его нет — Web Speech API.

const LOCALES = { ru: 'ru-RU', de: 'de-DE', en: 'en-US' };

// enabled — включена ли озвучка по умолчанию. Если выключена, speak() ничего не произносит,
// но всё равно «длится» примерно как речь, чтобы подсказки в модулях сохраняли темп.
// Отдельному модулю озвучку можно включить параметром `on` в speak() (поле voice в манифесте).
export function createSpeech(getSettings, { enabled = true } = {}) {
  const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
  const missingFiles = new Set();
  let token = 0; // каждая новая фраза и stop() обнуляют предыдущую
  let release = null; // завершает ожидание текущей фразы
  let audio = null;
  let utterance = null; // держим ссылку, иначе Chrome может собрать её сборщиком мусора

  function keyFrom(text) {
    return text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
  }

  function loadVoices() {
    if (!synth) return Promise.resolve([]);
    const now = synth.getVoices();
    if (now.length) return Promise.resolve(now);
    return new Promise((resolve) => {
      const done = () => {
        synth.removeEventListener('voiceschanged', done);
        resolve(synth.getVoices());
      };
      synth.addEventListener('voiceschanged', done);
      setTimeout(done, 1500);
    });
  }

  function matchesLang(voice, lang) {
    return voice.lang.toLowerCase().replace('_', '-').startsWith(lang);
  }

  // Голоса, доступные браузеру для языка: { name, local }. Онлайн-голоса (Google и др.) — local: false.
  async function listVoices(lang) {
    if (!enabled) return [];
    const voices = await loadVoices();
    return voices
      .filter((v) => matchesLang(v, lang))
      .map((v) => ({ name: v.name, local: v.localService }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // Онлайн — лучше Google/нейронные голоса, офлайн — только локальные.
  function pickVoice(voices, lang) {
    const locale = LOCALES[lang] || lang;
    const online = navigator.onLine;
    const candidates = voices.filter((v) => matchesLang(v, lang));
    // Голос, выбранный родителем. Онлайн-голос без интернета не работает — тогда подбираем сами.
    const chosen = candidates.find((v) => v.name === getSettings().voices?.[lang]);
    if (chosen && (online || chosen.localService)) return chosen;
    let best = null;
    let bestScore = -1;
    for (const v of candidates) {
      const name = v.name.toLowerCase();
      let score = 0;
      if (online) {
        if (/natural|neural|online/.test(name)) score += 110;
        if (name.includes('google')) score += 100;
      } else if (v.localService) {
        score += 200;
      }
      if (v.localService) score += 5;
      if (v.lang.replace('_', '-').toLowerCase() === locale.toLowerCase()) score += 10;
      if (score > bestScore) {
        best = v;
        bestScore = score;
      }
    }
    return best;
  }

  function stop() {
    token += 1;
    if (audio) {
      audio.pause();
      audio = null;
    }
    if (synth) synth.cancel();
    if (release) release(true);
    release = null;
  }

  // true — файл проигран (или фраза остановлена), false — файла нет или он не играет.
  function playFile(url) {
    return new Promise((resolve) => {
      const a = new Audio(url);
      a.volume = getSettings().volume;
      audio = a;
      release = resolve;
      a.addEventListener('ended', () => resolve(true));
      a.addEventListener('error', () => resolve(false));
      a.play().catch((err) => resolve(err.name === 'NotAllowedError'));
    });
  }

  async function synthesize(text, lang, mine) {
    if (!synth) return;
    const voices = await loadVoices();
    if (mine !== token) return;
    const { speechRate, volume } = getSettings();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LOCALES[lang] || lang;
    const voice = pickVoice(voices, lang);
    if (voice) u.voice = voice;
    u.rate = speechRate;
    u.volume = volume;
    utterance = u;
    await new Promise((resolve) => {
      release = resolve;
      const timer = setTimeout(resolve, 3000 + text.length * 200); // на случай, если onend не придёт
      const end = () => {
        clearTimeout(timer);
        resolve();
      };
      u.onend = end;
      u.onerror = end;
      synth.speak(u);
    });
  }

  async function speak(text, lang = 'ru', key, on = enabled) {
    stop();
    const mine = token;
    if (!text) return;
    if (!on) {
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, 400 + text.length * 60);
        release = () => {
          clearTimeout(timer);
          resolve();
        };
      });
      return;
    }
    const url = `audio/${lang}/${key || keyFrom(text)}.mp3`;
    if (!missingFiles.has(url)) {
      const played = await playFile(url);
      if (played || mine !== token) return;
      missingFiles.add(url);
    }
    await synthesize(text, lang, mine);
  }

  return { speak, stop, listVoices };
}
