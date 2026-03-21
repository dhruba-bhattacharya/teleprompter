const SAMPLE_SCRIPT = `Good evening.

This is a live teleprompter preview. Replace this sample with your own script, or load a PDF or Word document using the controls on the left.

You can change how much text is visible, make the type larger, tighten or loosen the spacing, mirror the script for beam-splitter glass, and either play an automatic scroll or let your microphone guide the script forward while you speak.

When you are ready, press play and start reading.`;

const state = {
  scriptText: SAMPLE_SCRIPT,
  segments: [],
  scrollOffset: 0,
  isPlaying: false,
  scrollSpeed: 32,
  fontSize: 54,
  lineHeight: 1.32,
  visibleLines: 14,
  columnWidth: 74,
  animationFrame: null,
  lastTick: 0,
  recognition: null,
  voiceEnabled: false,
  activeSegmentIndex: 0,
  mirror: false,
  uppercase: false,
};

const content = document.querySelector('#teleprompterContent');
const viewport = document.querySelector('#teleprompterViewport');
const sourceText = document.querySelector('#sourceText');
const sourceUrl = document.querySelector('#sourceUrl');
const fileInput = document.querySelector('#fileInput');
const statusMessage = document.querySelector('#statusMessage');
const voiceButton = document.querySelector('#voiceButton');
const focusFrame = document.querySelector('#focusFrame');

const controls = {
  windowRange: document.querySelector('#windowRange'),
  fontSizeRange: document.querySelector('#fontSizeRange'),
  speedRange: document.querySelector('#speedRange'),
  lineHeightRange: document.querySelector('#lineHeightRange'),
  columnWidthRange: document.querySelector('#columnWidthRange'),
  windowValue: document.querySelector('#windowValue'),
  fontSizeValue: document.querySelector('#fontSizeValue'),
  speedValue: document.querySelector('#speedValue'),
  lineHeightValue: document.querySelector('#lineHeightValue'),
  columnWidthValue: document.querySelector('#columnWidthValue'),
  mirrorToggle: document.querySelector('#mirrorToggle'),
  capsToggle: document.querySelector('#capsToggle'),
};

sourceText.value = SAMPLE_SCRIPT;

const normalizeWords = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9'\s]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

const normalizeText = (value) => normalizeWords(value).join(' ');

const setStatus = (message) => {
  statusMessage.textContent = message;
};

const splitIntoSegments = (text) =>
  text
    .split(/\n+/)
    .flatMap((paragraph) =>
      paragraph
        .split(/(?<=[.!?])\s+/)
        .map((segment) => segment.trim())
        .filter(Boolean),
    )
    .filter(Boolean);

const getMaxScroll = () => Math.max(0, content.scrollHeight - viewport.clientHeight);

const clampOffset = () => {
  state.scrollOffset = Math.min(Math.max(state.scrollOffset, 0), getMaxScroll());
};

const applyTransform = () => {
  const translate = `translateY(${-state.scrollOffset}px)`;
  const mirror = state.mirror ? ' scaleX(-1)' : '';
  content.style.transform = `${translate}${mirror}`;
};

const updateVisibleWindow = () => {
  const focusHeight = Math.min(
    82,
    Math.max(18, ((state.visibleLines * state.lineHeight * state.fontSize) / viewport.clientHeight) * 100),
  );
  document.documentElement.style.setProperty('--focus-height', `${focusHeight}%`);
  focusFrame.setAttribute('aria-label', `Visible text window approximately ${state.visibleLines} lines high`);
};

const applyTypography = () => {
  content.style.fontSize = `${state.fontSize}px`;
  content.style.lineHeight = `${state.lineHeight}`;
  document.documentElement.style.setProperty('--column-width', `${state.columnWidth}%`);
  content.classList.toggle('is-caps', state.uppercase);
  applyTransform();
  updateVisibleWindow();
};

const getSegmentElements = () => Array.from(content.querySelectorAll('.script-segment'));

const getFocusCenterY = () => state.scrollOffset + viewport.clientHeight / 2;

const updateActiveStyles = () => {
  const segmentElements = getSegmentElements();
  segmentElements.forEach((element, index) => {
    const isActive = index === state.activeSegmentIndex;
    element.classList.toggle('is-active', isActive);
    element.classList.toggle('is-before', index < state.activeSegmentIndex);
    element.classList.toggle('is-after', index > state.activeSegmentIndex);
  });
};

const syncActiveSegmentFromScroll = () => {
  const segmentElements = getSegmentElements();
  if (!segmentElements.length) return;

  const focusY = getFocusCenterY();
  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  segmentElements.forEach((element, index) => {
    const center = element.offsetTop + element.offsetHeight / 2;
    const distance = Math.abs(center - focusY);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  state.activeSegmentIndex = closestIndex;
  updateActiveStyles();
};

const scrollSegmentIntoFocus = (index) => {
  const segmentElements = getSegmentElements();
  const element = segmentElements[index];
  if (!element) return;

  const target = element.offsetTop + element.offsetHeight / 2 - viewport.clientHeight / 2;
  state.scrollOffset = target;
  clampOffset();
  applyTransform();
  syncActiveSegmentFromScroll();
};

const renderScript = () => {
  if (!state.scriptText.trim()) {
    state.segments = [];
    state.activeSegmentIndex = 0;
    content.innerHTML = '<p class="placeholder">Your script will appear here in white text on a black background.</p>';
    state.scrollOffset = 0;
    applyTypography();
    return;
  }

  state.segments = splitIntoSegments(state.scriptText);
  content.innerHTML = state.segments
    .map((segment, index) => `<span class="script-segment" data-index="${index}">${segment}</span>`)
    .join('');

  clampOffset();
  applyTypography();
  syncActiveSegmentFromScroll();
};

const stopPlayback = () => {
  state.isPlaying = false;
  if (state.animationFrame) {
    cancelAnimationFrame(state.animationFrame);
  }
  state.animationFrame = null;
  state.lastTick = 0;
};

const tick = (timestamp) => {
  if (!state.isPlaying) return;

  if (!state.lastTick) {
    state.lastTick = timestamp;
  }

  const deltaMs = timestamp - state.lastTick;
  state.lastTick = timestamp;
  state.scrollOffset += (state.scrollSpeed * deltaMs) / 1000;
  clampOffset();
  applyTransform();
  syncActiveSegmentFromScroll();

  if (state.scrollOffset >= getMaxScroll()) {
    stopPlayback();
    setStatus('Reached the end of the script.');
    return;
  }

  state.animationFrame = requestAnimationFrame(tick);
};

const startPlayback = () => {
  if (!state.scriptText.trim()) {
    setStatus('Load text before starting playback.');
    return;
  }

  if (state.isPlaying) return;

  if (state.voiceEnabled && state.recognition) {
    state.voiceEnabled = false;
    state.recognition.stop();
    voiceButton.textContent = 'Start voice follow';
  }

  state.isPlaying = true;
  setStatus(`Auto-scroll running at ${state.scrollSpeed} px/s.`);
  state.animationFrame = requestAnimationFrame(tick);
};

const stopVoiceTracking = (message = 'Voice follow stopped.') => {
  state.voiceEnabled = false;
  if (state.recognition) {
    state.recognition.onend = null;
    state.recognition.stop();
    state.recognition = null;
  }
  voiceButton.textContent = 'Start voice follow';
  setStatus(message);
};

const resetPlayback = () => {
  stopPlayback();
  state.scrollOffset = 0;
  state.activeSegmentIndex = 0;
  applyTransform();
  updateActiveStyles();
  setStatus('Playback reset to the start.');
};

const updateText = (text, sourceLabel = 'Text loaded.') => {
  state.scriptText = text.replace(/\n{3,}/g, '\n\n').trim();
  state.activeSegmentIndex = 0;
  resetPlayback();
  renderScript();
  setStatus(sourceLabel);
};

const inferFileName = (url, response) => {
  const fromUrl = url.split('/').pop()?.split('?')[0];
  if (fromUrl) return fromUrl;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('pdf')) return 'remote.pdf';
  if (contentType.includes('word') || contentType.includes('officedocument')) return 'remote.docx';
  return 'remote.txt';
};

const extractPdfText = async (arrayBuffer) => {
  const pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.min.mjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.worker.min.mjs';
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    pages.push(textContent.items.map((item) => item.str).join(' '));
  }

  return pages.join('\n\n');
};

const extractDocText = async (arrayBuffer, name = '') => {
  const lower = name.toLowerCase();
  if (!lower.endsWith('.doc') && !lower.endsWith('.docx')) {
    return new TextDecoder().decode(arrayBuffer);
  }

  if (!window.mammoth) {
    throw new Error('Mammoth is not available for Word parsing.');
  }

  const result = await window.mammoth.extractRawText({ arrayBuffer });
  return result.value;
};

const readByType = async (arrayBuffer, fileName) => {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return extractPdfText(arrayBuffer);
  if (lower.endsWith('.doc') || lower.endsWith('.docx')) return extractDocText(arrayBuffer, fileName);
  return new TextDecoder().decode(arrayBuffer);
};

const loadUrl = async () => {
  const url = sourceUrl.value.trim();
  if (!url) {
    setStatus('Paste a URL first.');
    return;
  }

  try {
    setStatus('Fetching remote document...');
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Request failed with ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    const fileName = inferFileName(url, response);
    const text = await readByType(arrayBuffer, fileName);
    sourceText.value = text;
    updateText(text, `Loaded script from ${fileName}.`);
  } catch (error) {
    console.error(error);
    setStatus('Could not load that URL. Check the link format and whether the source allows cross-origin access.');
  }
};

const handleFile = async (file) => {
  if (!file) return;

  try {
    setStatus(`Reading ${file.name}...`);
    const arrayBuffer = await file.arrayBuffer();
    const text = await readByType(arrayBuffer, file.name);
    sourceText.value = text;
    updateText(text, `Loaded script from ${file.name}.`);
  } catch (error) {
    console.error(error);
    setStatus('That file could not be parsed. Try PDF, DOCX, DOC, or plain text.');
  }
};

const sentenceMatchScore = (transcriptWords, segmentWords) => {
  if (!transcriptWords.length || !segmentWords.length) return 0;
  const transcriptSet = new Set(transcriptWords);
  let matches = 0;
  segmentWords.forEach((word) => {
    if (transcriptSet.has(word)) matches += 1;
  });
  return matches / segmentWords.length;
};

const syncVoicePosition = (transcript) => {
  const normalizedTranscript = normalizeText(transcript);
  if (!normalizedTranscript || !state.segments.length) return;

  const transcriptWords = normalizedTranscript.split(' ');
  let bestIndex = -1;
  let bestScore = 0;
  const searchStart = Math.max(0, state.activeSegmentIndex - 1);
  const searchEnd = Math.min(state.segments.length, state.activeSegmentIndex + 8);

  for (let index = searchStart; index < searchEnd; index += 1) {
    const segmentWords = normalizeWords(state.segments[index]);
    const score = sentenceMatchScore(transcriptWords, segmentWords);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
    if (normalizedTranscript.includes(normalizeText(state.segments[index]).slice(0, 80))) {
      bestIndex = index;
      bestScore = 1;
      break;
    }
  }

  if (bestIndex === -1 || bestScore < 0.35) return;

  state.activeSegmentIndex = bestIndex;
  scrollSegmentIntoFocus(bestIndex);
  setStatus('Voice follow is listening and keeping the current sentence centered.');
};

const toggleVoice = () => {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    setStatus('Speech recognition is not available in this browser. Try Chrome on desktop and allow microphone access.');
    return;
  }

  if (!state.scriptText.trim()) {
    setStatus('Load text before using voice follow.');
    return;
  }

  if (state.voiceEnabled) {
    stopVoiceTracking();
    return;
  }

  stopPlayback();
  const recognition = new Recognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  recognition.maxAlternatives = 1;
  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .slice(Math.max(0, event.resultIndex - 1))
      .map((result) => result[0].transcript)
      .join(' ');
    syncVoicePosition(transcript);
  };
  recognition.onerror = (event) => {
    if (event.error === 'not-allowed') {
      stopVoiceTracking('Microphone permission was denied.');
      return;
    }
    if (event.error === 'no-speech') {
      setStatus('Listening for speech...');
      return;
    }
    setStatus(`Voice follow error: ${event.error}. Try Chrome and confirm microphone permissions.`);
  };
  recognition.onend = () => {
    if (state.voiceEnabled) {
      recognition.start();
    }
  };

  try {
    recognition.start();
    state.recognition = recognition;
    state.voiceEnabled = true;
    voiceButton.textContent = 'Stop voice follow';
    setStatus('Voice follow started. Allow microphone access and begin reading the current sentence.');
  } catch (error) {
    console.error(error);
    setStatus('Voice follow could not start. Check microphone permissions and browser support.');
  }
};

const refreshFromTextarea = () => {
  updateText(sourceText.value, 'Preview refreshed from the text box.');
};

document.querySelector('#loadTextButton').addEventListener('click', refreshFromTextarea);
document.querySelector('#sampleButton').addEventListener('click', () => {
  sourceText.value = SAMPLE_SCRIPT;
  updateText(SAMPLE_SCRIPT, 'Sample script loaded into the preview.');
});
document.querySelector('#clearButton').addEventListener('click', () => {
  sourceText.value = '';
  sourceUrl.value = '';
  fileInput.value = '';
  stopPlayback();
  if (state.voiceEnabled) stopVoiceTracking('Voice follow stopped because the script was cleared.');
  updateText('', 'Cleared script.');
});
document.querySelector('#loadUrlButton').addEventListener('click', loadUrl);
fileInput.addEventListener('change', (event) => handleFile(event.target.files?.[0]));
document.querySelector('#playButton').addEventListener('click', startPlayback);
document.querySelector('#pauseButton').addEventListener('click', () => {
  stopPlayback();
  setStatus('Playback paused.');
});
document.querySelector('#resetButton').addEventListener('click', resetPlayback);
voiceButton.addEventListener('click', toggleVoice);
sourceText.addEventListener('input', () => {
  state.scriptText = sourceText.value;
  renderScript();
  setStatus('Updating live preview from the text box...');
});

controls.windowRange.addEventListener('input', (event) => {
  state.visibleLines = Number(event.target.value);
  controls.windowValue.textContent = `${state.visibleLines} lines`;
  updateVisibleWindow();
  scrollSegmentIntoFocus(state.activeSegmentIndex);
});
controls.fontSizeRange.addEventListener('input', (event) => {
  state.fontSize = Number(event.target.value);
  controls.fontSizeValue.textContent = `${state.fontSize} px`;
  renderScript();
  scrollSegmentIntoFocus(state.activeSegmentIndex);
});
controls.speedRange.addEventListener('input', (event) => {
  state.scrollSpeed = Number(event.target.value);
  controls.speedValue.textContent = `${state.scrollSpeed} px/s`;
  if (state.isPlaying) setStatus(`Auto-scroll running at ${state.scrollSpeed} px/s.`);
});
controls.lineHeightRange.addEventListener('input', (event) => {
  state.lineHeight = Number(event.target.value) / 100;
  controls.lineHeightValue.textContent = state.lineHeight.toFixed(2);
  renderScript();
  scrollSegmentIntoFocus(state.activeSegmentIndex);
});
controls.columnWidthRange.addEventListener('input', (event) => {
  state.columnWidth = Number(event.target.value);
  controls.columnWidthValue.textContent = `${state.columnWidth}%`;
  renderScript();
  scrollSegmentIntoFocus(state.activeSegmentIndex);
});
controls.mirrorToggle.addEventListener('change', (event) => {
  state.mirror = event.target.checked;
  applyTransform();
  setStatus(state.mirror ? 'Mirror mode enabled.' : 'Mirror mode disabled.');
});
controls.capsToggle.addEventListener('change', (event) => {
  state.uppercase = event.target.checked;
  renderScript();
  scrollSegmentIntoFocus(state.activeSegmentIndex);
  setStatus(state.uppercase ? 'All caps enabled.' : 'All caps disabled.');
});

window.addEventListener('resize', () => {
  renderScript();
  scrollSegmentIntoFocus(state.activeSegmentIndex);
});
window.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
    return;
  }

  if (event.code === 'Space') {
    event.preventDefault();
    if (state.isPlaying) {
      stopPlayback();
      setStatus('Playback paused.');
    } else {
      startPlayback();
    }
  }

  if (event.key === 'ArrowUp') {
    state.scrollSpeed = Math.min(state.scrollSpeed + 2, 140);
    controls.speedRange.value = String(state.scrollSpeed);
    controls.speedValue.textContent = `${state.scrollSpeed} px/s`;
    if (state.isPlaying) setStatus(`Auto-scroll running at ${state.scrollSpeed} px/s.`);
  }

  if (event.key === 'ArrowDown') {
    state.scrollSpeed = Math.max(state.scrollSpeed - 2, 5);
    controls.speedRange.value = String(state.scrollSpeed);
    controls.speedValue.textContent = `${state.scrollSpeed} px/s`;
    if (state.isPlaying) setStatus(`Auto-scroll running at ${state.scrollSpeed} px/s.`);
  }

  if (event.key.toLowerCase() === 'm') {
    state.mirror = !state.mirror;
    controls.mirrorToggle.checked = state.mirror;
    applyTransform();
    setStatus(state.mirror ? 'Mirror mode enabled.' : 'Mirror mode disabled.');
  }
});

renderScript();
scrollSegmentIntoFocus(0);
