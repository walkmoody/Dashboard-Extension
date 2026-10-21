const DEFAULT_LINKS = [
  {label:"TTU", url: "https://texastech.instructure.com/", icon: "https://du11hjcvx0uqb.cloudfront.net/dist/images/favicon-e10d657a73.ico"},
  {label:"ChatGPT", url: "https://chat.openai.com/chat", icon:"./assets/image.png"},
  {label:"Claude", url: "https://claude.ai/new", icon:"./assets/claude-color.webp"},
  {label:"Github", url: "https://github.com/", icon:"https://github.githubassets.com/assets/pinned-octocat-093da3e6fa40.svg"},
  {label:"Outlook", url: "https://outlook.office.com/mail/?login_hint=wamoody%40ttu.edu", icon:"https://res.public.onecdn.static.microsoft/owamail/20260213001.06/resources/images/favicons/mail-seen.ico"},
  {label:"Gmail", url: "https://mail.google.com/mail/u/0/#inbox", icon:"https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico"},
  {label:"Youtube", url: "https://youtube.com/", icon:"https://www.youtube.com/s/desktop/00d5ae36/img/favicon_144x144.png"},
  {label:"Docs", url: "https://docs.google.com/document/u/0/", icon:"https://www.gstatic.com/images/branding/product/1x/docs_2020q4_48dp.png"},
  {label:"Slides", url: "https://docs.google.com/presentation/u/0/", icon:"https://www.gstatic.com/images/branding/product/1x/slides_2020q4_48dp.png"},
];

const GREETINGS = [
  "Walker",
  "Hello",
  "I am watching you.",
  "I am watching you...",
];

function getRandomGreeting() {
  return GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
}

function parseBookmarksHtml(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const anchors = Array.from(doc.querySelectorAll("a[href]"));

  return anchors
    .map(a => {
      const url = a.getAttribute("href")?.trim();
      const label = (a.textContent || "").trim();
      const icon = a.getAttribute("icon") || a.getAttribute("ICON") || "";
      if (!url || !label) return null;
      return { label, url, icon };
    })
    .filter(Boolean);
}


function parseRawLinks(text) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, url] = line.split("|").map((x) => (x || "").trim());
      if (!label || !url) return null;
      return { label, url };
    })
    .filter(Boolean);
}

function toRawLinks(links) {
  return links.map((x) => `${x.label} | ${x.url}`).join("\n");
}

async function loadState() {
  const stored = await chrome.storage.local.get(["links"]);
  return {
    links: DEFAULT_LINKS
  };
}

async function saveState(partial) {
  await chrome.storage.local.set(partial);
}

function renderLinks(links) {
  const el = document.getElementById("links");
  if (!el) return;

  el.innerHTML = "";
  for (const item of links) {
    const a = document.createElement("a");
    a.className = "link";
    a.href = item.url;
    a.target = "_self";
    a.rel = "noreferrer";

    const iconHtml = item.icon
      ? `<img class="favicon" src="${item.icon}" alt="" />`
      : "";

    a.innerHTML = `
      <div class="center">
        ${iconHtml}
      </div>
    `;

    el.appendChild(a);
  }
}

function prettyHost(url) {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function doSearch() {
  const input = document.getElementById("q");
  const q = (input?.value || "").trim();
  if (!q) return;

  const url = `https://search.brave.com/search?q=${encodeURIComponent(q)}`;
  window.location.assign(url);
}

function bingSearch() {
  const input = document.getElementById("bingQ");  // changed from "q"
  const q = (input?.value || "").trim();
  if (!q) return;

  const url = `https://www.bing.com/search?q=${encodeURIComponent(q)}`;
  window.location.assign(url);
}

function openModal() {
  const modal = document.getElementById("modal");
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  const modal = document.getElementById("modal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

function startClock() {
  const clockEl = document.getElementById("clock");
  if (!clockEl) return;

  function wrapLetters(text) {
    return text.split('').map(ch =>
      `<span class="vp-letter" style="display:inline-block">${ch}</span>`
    ).join('');
  }

  function update() {
    const now = new Date();
    const time = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    }).replace(/\s*(AM|PM)/i, "");

    clockEl.innerHTML = wrapLetters(time);
  }

  update();
  setInterval(update, 1000);

  initVariableProximity(clockEl, {
    fromFontVariationSettings: "'wght' 600, 'opsz' 9",
    toFontVariationSettings: "'wght' 1300, 'opsz' 40",
    radius: 120,
    falloff: 'linear'
  });
}


function initVariableProximity(containerEl, {
  fromFontVariationSettings = "'wght' 300, 'opsz' 9",
  toFontVariationSettings = "'wght' 900, 'opsz' 40",
  radius = 150,
  falloff = 'linear'
} = {}) {
  function parseSettings(str) {
    return new Map(str.split(',').map(s => {
      const [name, value] = s.trim().split(' ');
      return [name.replace(/['"]/g, ''), parseFloat(value)];
    }));
  }

  const fromMap = parseSettings(fromFontVariationSettings);
  const toMap = parseSettings(toFontVariationSettings);
  const axes = Array.from(fromMap.entries()).map(([axis, from]) => ({
    axis, from, to: toMap.get(axis) ?? from
  }));

  let mouseX = 0, mouseY = 0;
  window.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });

  function calcFalloff(distance) {
    const norm = Math.min(Math.max(1 - distance / radius, 0), 1);
    switch (falloff) {
      case 'exponential': return norm ** 2;
      case 'gaussian': return Math.exp(-((distance / (radius / 2)) ** 2) / 2);
      default: return norm;
    }
  }

  function tick() {
    const containerRect = containerEl.getBoundingClientRect();
    const relX = mouseX - containerRect.left;
    const relY = mouseY - containerRect.top;

    containerEl.querySelectorAll('.vp-letter').forEach(span => {
      const rect = span.getBoundingClientRect();
      const cx = rect.left + rect.width / 2 - containerRect.left;
      const cy = rect.top + rect.height / 2 - containerRect.top;
      const dist = Math.sqrt((relX - cx) ** 2 + (relY - cy) ** 2);

      if (dist >= radius) {
        span.style.fontVariationSettings = fromFontVariationSettings;
        return;
      }

      const f = calcFalloff(dist);
      span.style.fontVariationSettings = axes
        .map(({ axis, from, to }) => `'${axis}' ${from + (to - from) * f}`)
        .join(', ');
    });

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

function initSplashCursor({
  SIM_RESOLUTION = 128,
  DYE_RESOLUTION = 1440,
  DENSITY_DISSIPATION = 2.5,
  VELOCITY_DISSIPATION = 2,
  PRESSURE = 0.1,
  PRESSURE_ITERATIONS = 5,
  CURL = 1,
  SPLAT_RADIUS = 0.2,
  SPLAT_FORCE = 1100,
  SHADING = true,
  COLOR_UPDATE_SPEED = 3,
  BACK_COLOR = { r: 0, g: 0, b: 0 },
  TRANSPARENT = true
} = {}) {
  const canvas = document.getElementById('fluid-canvas');
  if (!canvas) return;

  function pointerPrototype() {
    this.id = -1; this.texcoordX = 0; this.texcoordY = 0;
    this.prevTexcoordX = 0; this.prevTexcoordY = 0;
    this.deltaX = 0; this.deltaY = 0;
    this.down = false; this.moved = false; this.color = [0, 0, 0];
  }

  let config = {
    SIM_RESOLUTION, DYE_RESOLUTION, DENSITY_DISSIPATION, VELOCITY_DISSIPATION,
    PRESSURE, PRESSURE_ITERATIONS, CURL, SPLAT_RADIUS, SPLAT_FORCE,
    SHADING, COLOR_UPDATE_SPEED, PAUSED: false, BACK_COLOR, TRANSPARENT
  };

  let pointers = [new pointerPrototype()];

  function getWebGLContext(canvas) {
    const params = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false };
    let gl = canvas.getContext('webgl2', params);
    const isWebGL2 = !!gl;
    if (!isWebGL2) gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);
    let halfFloat, supportLinearFiltering;
    if (isWebGL2) {
      gl.getExtension('EXT_color_buffer_float');
      supportLinearFiltering = gl.getExtension('OES_texture_float_linear');
    } else {
      halfFloat = gl.getExtension('OES_texture_half_float');
      supportLinearFiltering = gl.getExtension('OES_texture_half_float_linear');
    }
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    const halfFloatTexType = isWebGL2 ? gl.HALF_FLOAT : halfFloat && halfFloat.HALF_FLOAT_OES;
    let formatRGBA, formatRG, formatR;
    if (isWebGL2) {
      formatRGBA = getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, halfFloatTexType);
      formatRG = getSupportedFormat(gl, gl.RG16F, gl.RG, halfFloatTexType);
      formatR = getSupportedFormat(gl, gl.R16F, gl.RED, halfFloatTexType);
    } else {
      formatRGBA = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
      formatRG = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
      formatR = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
    }
    return { gl, ext: { formatRGBA, formatRG, formatR, halfFloatTexType, supportLinearFiltering } };
  }

  function getSupportedFormat(gl, internalFormat, format, type) {
    if (!supportRenderTextureFormat(gl, internalFormat, format, type)) {
      switch (internalFormat) {
        case gl.R16F: return getSupportedFormat(gl, gl.RG16F, gl.RG, type);
        case gl.RG16F: return getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, type);
        default: return null;
      }
    }
    return { internalFormat, format };
  }

  function supportRenderTextureFormat(gl, internalFormat, format, type) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    return gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  }

  const { gl, ext } = getWebGLContext(canvas);
  if (!ext.supportLinearFiltering) { config.DYE_RESOLUTION = 256; config.SHADING = false; }

  function hashCode(s) {
    if (s.length === 0) return 0;
    let hash = 0;
    for (let i = 0; i < s.length; i++) { hash = (hash << 5) - hash + s.charCodeAt(i); hash |= 0; }
    return hash;
  }

  function compileShader(type, source, keywords) {
    if (keywords) { let kw = ''; keywords.forEach(k => kw += '#define ' + k + '\n'); source = kw + source; }
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) console.trace(gl.getShaderInfoLog(shader));
    return shader;
  }

  function createProgram(vs, fs) {
    const program = gl.createProgram();
    gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) console.trace(gl.getProgramInfoLog(program));
    return program;
  }

  function getUniforms(program) {
    const uniforms = [];
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const name = gl.getActiveUniform(program, i).name;
      uniforms[name] = gl.getUniformLocation(program, name);
    }
    return uniforms;
  }

  class Material {
    constructor(vs, fsSrc) { this.vs = vs; this.fsSrc = fsSrc; this.programs = []; this.activeProgram = null; this.uniforms = []; }
    setKeywords(keywords) {
      let hash = 0; for (let i = 0; i < keywords.length; i++) hash += hashCode(keywords[i]);
      let program = this.programs[hash];
      if (!program) { program = createProgram(this.vs, compileShader(gl.FRAGMENT_SHADER, this.fsSrc, keywords)); this.programs[hash] = program; }
      if (program === this.activeProgram) return;
      this.uniforms = getUniforms(program); this.activeProgram = program;
    }
    bind() { gl.useProgram(this.activeProgram); }
  }

  class Program {
    constructor(vs, fs) { this.program = createProgram(vs, fs); this.uniforms = getUniforms(this.program); }
    bind() { gl.useProgram(this.program); }
  }

  const baseVertexShader = compileShader(gl.VERTEX_SHADER, `
    precision highp float;
    attribute vec2 aPosition;
    varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
    uniform vec2 texelSize;
    void main () {
      vUv = aPosition * 0.5 + 0.5;
      vL = vUv - vec2(texelSize.x, 0.0); vR = vUv + vec2(texelSize.x, 0.0);
      vT = vUv + vec2(0.0, texelSize.y); vB = vUv - vec2(0.0, texelSize.y);
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `);

  const copyShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float; precision mediump sampler2D;
    varying highp vec2 vUv; uniform sampler2D uTexture;
    void main () { gl_FragColor = texture2D(uTexture, vUv); }
  `);

  const clearShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float; precision mediump sampler2D;
    varying highp vec2 vUv; uniform sampler2D uTexture; uniform float value;
    void main () { gl_FragColor = value * texture2D(uTexture, vUv); }
  `);

  const displayShaderSource = `
    precision highp float; precision highp sampler2D;
    varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
    uniform sampler2D uTexture; uniform vec2 texelSize;
    vec3 linearToGamma(vec3 color) { color = max(color, vec3(0)); return max(1.055 * pow(color, vec3(0.416666667)) - 0.055, vec3(0)); }
    void main () {
      vec3 c = texture2D(uTexture, vUv).rgb;
      #ifdef SHADING
        vec3 lc = texture2D(uTexture, vL).rgb; vec3 rc = texture2D(uTexture, vR).rgb;
        vec3 tc = texture2D(uTexture, vT).rgb; vec3 bc = texture2D(uTexture, vB).rgb;
        float dx = length(rc) - length(lc); float dy = length(tc) - length(bc);
        vec3 n = normalize(vec3(dx, dy, length(texelSize)));
        float diffuse = clamp(dot(n, vec3(0,0,1)) + 0.7, 0.7, 1.0); c *= diffuse;
      #endif
      float a = max(c.r, max(c.g, c.b));
      gl_FragColor = vec4(c, a);
    }
  `;

  const splatShader = compileShader(gl.FRAGMENT_SHADER, `
    precision highp float; precision highp sampler2D;
    varying vec2 vUv; uniform sampler2D uTarget; uniform float aspectRatio;
    uniform vec3 color; uniform vec2 point; uniform float radius;
    void main () {
      vec2 p = vUv - point.xy; p.x *= aspectRatio;
      vec3 splat = exp(-dot(p, p) / radius) * color;
      gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + splat, 1.0);
    }
  `);

  const advectionShader = compileShader(gl.FRAGMENT_SHADER, `
    precision highp float; precision highp sampler2D;
    varying vec2 vUv; uniform sampler2D uVelocity; uniform sampler2D uSource;
    uniform vec2 texelSize; uniform vec2 dyeTexelSize; uniform float dt; uniform float dissipation;
    vec4 bilerp(sampler2D sam, vec2 uv, vec2 tsize) {
      vec2 st = uv / tsize - 0.5; vec2 iuv = floor(st); vec2 fuv = fract(st);
      vec4 a = texture2D(sam, (iuv + vec2(0.5,0.5)) * tsize); vec4 b = texture2D(sam, (iuv + vec2(1.5,0.5)) * tsize);
      vec4 c = texture2D(sam, (iuv + vec2(0.5,1.5)) * tsize); vec4 d = texture2D(sam, (iuv + vec2(1.5,1.5)) * tsize);
      return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
    }
    void main () {
      #ifdef MANUAL_FILTERING
        vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
        vec4 result = bilerp(uSource, coord, dyeTexelSize);
      #else
        vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
        vec4 result = texture2D(uSource, coord);
      #endif
      gl_FragColor = result / (1.0 + dissipation * dt);
    }
  `, ext.supportLinearFiltering ? null : ['MANUAL_FILTERING']);

  const divergenceShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float; precision mediump sampler2D;
    varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB;
    uniform sampler2D uVelocity;
    void main () {
      float L = texture2D(uVelocity, vL).x; float R = texture2D(uVelocity, vR).x;
      float T = texture2D(uVelocity, vT).y; float B = texture2D(uVelocity, vB).y;
      vec2 C = texture2D(uVelocity, vUv).xy;
      if (vL.x < 0.0) L = -C.x; if (vR.x > 1.0) R = -C.x;
      if (vT.y > 1.0) T = -C.y; if (vB.y < 0.0) B = -C.y;
      gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
    }
  `);

  const curlShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float; precision mediump sampler2D;
    varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB;
    uniform sampler2D uVelocity;
    void main () {
      float L = texture2D(uVelocity, vL).y; float R = texture2D(uVelocity, vR).y;
      float T = texture2D(uVelocity, vT).x; float B = texture2D(uVelocity, vB).x;
      gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
    }
  `);

  const vorticityShader = compileShader(gl.FRAGMENT_SHADER, `
    precision highp float; precision highp sampler2D;
    varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
    uniform sampler2D uVelocity; uniform sampler2D uCurl; uniform float curl; uniform float dt;
    void main () {
      float L = texture2D(uCurl, vL).x; float R = texture2D(uCurl, vR).x;
      float T = texture2D(uCurl, vT).x; float B = texture2D(uCurl, vB).x;
      float C = texture2D(uCurl, vUv).x;
      vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
      force /= length(force) + 0.0001; force *= curl * C; force.y *= -1.0;
      vec2 velocity = texture2D(uVelocity, vUv).xy + force * dt;
      velocity = min(max(velocity, -1000.0), 1000.0);
      gl_FragColor = vec4(velocity, 0.0, 1.0);
    }
  `);

  const pressureShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float; precision mediump sampler2D;
    varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB;
    uniform sampler2D uPressure; uniform sampler2D uDivergence;
    void main () {
      float L = texture2D(uPressure, vL).x; float R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x; float B = texture2D(uPressure, vB).x;
      float divergence = texture2D(uDivergence, vUv).x;
      gl_FragColor = vec4((L + R + B + T - divergence) * 0.25, 0.0, 0.0, 1.0);
    }
  `);

  const gradientSubtractShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float; precision mediump sampler2D;
    varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB;
    uniform sampler2D uPressure; uniform sampler2D uVelocity;
    void main () {
      float L = texture2D(uPressure, vL).x; float R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x; float B = texture2D(uPressure, vB).x;
      vec2 velocity = texture2D(uVelocity, vUv).xy - vec2(R - L, T - B);
      gl_FragColor = vec4(velocity, 0.0, 1.0);
    }
  `);

  const blit = (() => {
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,-1,1,1,1,1,-1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0,1,2,0,2,3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
    return (target, clear = false) => {
      if (target == null) { gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight); gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
      else { gl.viewport(0, 0, target.width, target.height); gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo); }
      if (clear) { gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT); }
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    };
  })();

  let dye, velocity, divergence, curl, pressure;

  const copyProgram = new Program(baseVertexShader, copyShader);
  const clearProgram = new Program(baseVertexShader, clearShader);
  const splatProgram = new Program(baseVertexShader, splatShader);
  const advectionProgram = new Program(baseVertexShader, advectionShader);
  const divergenceProgram = new Program(baseVertexShader, divergenceShader);
  const curlProgram = new Program(baseVertexShader, curlShader);
  const vorticityProgram = new Program(baseVertexShader, vorticityShader);
  const pressureProgram = new Program(baseVertexShader, pressureShader);
  const gradienSubtractProgram = new Program(baseVertexShader, gradientSubtractShader);
  const displayMaterial = new Material(baseVertexShader, displayShaderSource);

  function scaleByPixelRatio(input) { return Math.floor(input * (window.devicePixelRatio || 1)); }

  function getResolution(resolution) {
    let ar = gl.drawingBufferWidth / gl.drawingBufferHeight;
    if (ar < 1) ar = 1.0 / ar;
    const min = Math.round(resolution), max = Math.round(resolution * ar);
    return gl.drawingBufferWidth > gl.drawingBufferHeight ? { width: max, height: min } : { width: min, height: max };
  }

  function createFBO(w, h, internalFormat, format, type, param) {
    gl.activeTexture(gl.TEXTURE0);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, w, h); gl.clear(gl.COLOR_BUFFER_BIT);
    return { texture, fbo, width: w, height: h, texelSizeX: 1/w, texelSizeY: 1/h,
      attach(id) { gl.activeTexture(gl.TEXTURE0 + id); gl.bindTexture(gl.TEXTURE_2D, texture); return id; } };
  }

  function createDoubleFBO(w, h, internalFormat, format, type, param) {
    let fbo1 = createFBO(w, h, internalFormat, format, type, param);
    let fbo2 = createFBO(w, h, internalFormat, format, type, param);
    return { width: w, height: h, texelSizeX: fbo1.texelSizeX, texelSizeY: fbo1.texelSizeY,
      get read() { return fbo1; }, set read(v) { fbo1 = v; },
      get write() { return fbo2; }, set write(v) { fbo2 = v; },
      swap() { let t = fbo1; fbo1 = fbo2; fbo2 = t; } };
  }

  function resizeFBO(target, w, h, internalFormat, format, type, param) {
    const newFBO = createFBO(w, h, internalFormat, format, type, param);
    copyProgram.bind(); gl.uniform1i(copyProgram.uniforms.uTexture, target.attach(0)); blit(newFBO);
    return newFBO;
  }

  function resizeDoubleFBO(target, w, h, internalFormat, format, type, param) {
    if (target.width === w && target.height === h) return target;
    target.read = resizeFBO(target.read, w, h, internalFormat, format, type, param);
    target.write = createFBO(w, h, internalFormat, format, type, param);
    target.width = w; target.height = h; target.texelSizeX = 1/w; target.texelSizeY = 1/h;
    return target;
  }

  function initFramebuffers() {
    const simRes = getResolution(config.SIM_RESOLUTION);
    const dyeRes = getResolution(config.DYE_RESOLUTION);
    const texType = ext.halfFloatTexType;
    const rgba = ext.formatRGBA, rg = ext.formatRG, r = ext.formatR;
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;
    gl.disable(gl.BLEND);
    if (!dye) dye = createDoubleFBO(dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
    else dye = resizeDoubleFBO(dye, dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
    if (!velocity) velocity = createDoubleFBO(simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);
    else velocity = resizeDoubleFBO(velocity, simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);
    divergence = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    curl = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    pressure = createDoubleFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
  }

  function HSVtoRGB(h, s, v) {
    const i = Math.floor(h * 6), f = h * 6 - i, p = v*(1-s), q = v*(1-f*s), t = v*(1-(1-f)*s);
    switch (i % 6) {
      case 0: return {r:v, g:t, b:p}; case 1: return {r:q, g:v, b:p};
      case 2: return {r:p, g:v, b:t}; case 3: return {r:p, g:q, b:v};
      case 4: return {r:t, g:p, b:v}; case 5: return {r:v, g:p, b:q};
    }
  }

  function generateColor() {
    const c = HSVtoRGB(Math.random(), 1.0, 1.0);
    return { r: c.r * 0.15, g: c.g * 0.15, b: c.b * 0.15 };
  }

  function correctRadius(radius) {
    const ar = canvas.width / canvas.height;
    return ar > 1 ? radius * ar : radius;
  }

  function correctDeltaX(delta) { const ar = canvas.width / canvas.height; return ar < 1 ? delta * ar : delta; }
  function correctDeltaY(delta) { const ar = canvas.width / canvas.height; return ar > 1 ? delta / ar : delta; }

  function splat(x, y, dx, dy, color) {
    splatProgram.bind();
    gl.uniform1i(splatProgram.uniforms.uTarget, velocity.read.attach(0));
    gl.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height);
    gl.uniform2f(splatProgram.uniforms.point, x, y);
    gl.uniform3f(splatProgram.uniforms.color, dx, dy, 0.0);
    gl.uniform1f(splatProgram.uniforms.radius, correctRadius(config.SPLAT_RADIUS / 100.0));
    blit(velocity.write); velocity.swap();
    gl.uniform1i(splatProgram.uniforms.uTarget, dye.read.attach(0));
    gl.uniform3f(splatProgram.uniforms.color, color.r, color.g, color.b);
    blit(dye.write); dye.swap();
  }

  function splatPointer(pointer) {
    splat(pointer.texcoordX, pointer.texcoordY,
      pointer.deltaX * config.SPLAT_FORCE, pointer.deltaY * config.SPLAT_FORCE, pointer.color);
  }

  function clickSplat(pointer) {
    const color = generateColor(); color.r *= 10; color.g *= 10; color.b *= 10;
    splat(pointer.texcoordX, pointer.texcoordY, 10*(Math.random()-0.5), 30*(Math.random()-0.5), color);
  }

  function updatePointerDownData(pointer, id, posX, posY) {
    pointer.id = id; pointer.down = true; pointer.moved = false;
    pointer.texcoordX = posX / canvas.width; pointer.texcoordY = 1.0 - posY / canvas.height;
    pointer.prevTexcoordX = pointer.texcoordX; pointer.prevTexcoordY = pointer.texcoordY;
    pointer.deltaX = 0; pointer.deltaY = 0; pointer.color = generateColor();
  }

  function updatePointerMoveData(pointer, posX, posY, color) {
    pointer.prevTexcoordX = pointer.texcoordX; pointer.prevTexcoordY = pointer.texcoordY;
    pointer.texcoordX = posX / canvas.width; pointer.texcoordY = 1.0 - posY / canvas.height;
    pointer.deltaX = correctDeltaX(pointer.texcoordX - pointer.prevTexcoordX);
    pointer.deltaY = correctDeltaY(pointer.texcoordY - pointer.prevTexcoordY);
    pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
    pointer.color = color;
  }

  function updatePointerUpData(pointer) { pointer.down = false; }

  function step(dt) {
    gl.disable(gl.BLEND);
    curlProgram.bind();
    gl.uniform2f(curlProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.read.attach(0));
    blit(curl);

    vorticityProgram.bind();
    gl.uniform2f(vorticityProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(vorticityProgram.uniforms.uCurl, curl.attach(1));
    gl.uniform1f(vorticityProgram.uniforms.curl, config.CURL);
    gl.uniform1f(vorticityProgram.uniforms.dt, dt);
    blit(velocity.write); velocity.swap();

    divergenceProgram.bind();
    gl.uniform2f(divergenceProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read.attach(0));
    blit(divergence);

    clearProgram.bind();
    gl.uniform1i(clearProgram.uniforms.uTexture, pressure.read.attach(0));
    gl.uniform1f(clearProgram.uniforms.value, config.PRESSURE);
    blit(pressure.write); pressure.swap();

    pressureProgram.bind();
    gl.uniform2f(pressureProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(pressureProgram.uniforms.uDivergence, divergence.attach(0));
    for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
      gl.uniform1i(pressureProgram.uniforms.uPressure, pressure.read.attach(1));
      blit(pressure.write); pressure.swap();
    }

    gradienSubtractProgram.bind();
    gl.uniform2f(gradienSubtractProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(gradienSubtractProgram.uniforms.uPressure, pressure.read.attach(0));
    gl.uniform1i(gradienSubtractProgram.uniforms.uVelocity, velocity.read.attach(1));
    blit(velocity.write); velocity.swap();

    advectionProgram.bind();
    gl.uniform2f(advectionProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    if (!ext.supportLinearFiltering) gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY);
    const vId = velocity.read.attach(0);
    gl.uniform1i(advectionProgram.uniforms.uVelocity, vId);
    gl.uniform1i(advectionProgram.uniforms.uSource, vId);
    gl.uniform1f(advectionProgram.uniforms.dt, dt);
    gl.uniform1f(advectionProgram.uniforms.dissipation, config.VELOCITY_DISSIPATION);
    blit(velocity.write); velocity.swap();

    if (!ext.supportLinearFiltering) gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
    gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(advectionProgram.uniforms.uSource, dye.read.attach(1));
    gl.uniform1f(advectionProgram.uniforms.dissipation, config.DENSITY_DISSIPATION);
    blit(dye.write); dye.swap();
  }

  function drawDisplay(target) {
    const width = target == null ? gl.drawingBufferWidth : target.width;
    const height = target == null ? gl.drawingBufferHeight : target.height;
    displayMaterial.bind();
    if (config.SHADING) gl.uniform2f(displayMaterial.uniforms.texelSize, 1.0/width, 1.0/height);
    gl.uniform1i(displayMaterial.uniforms.uTexture, dye.read.attach(0));
    blit(target);
  }

  function fluidRender(target) {
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
    drawDisplay(target);
  }

  if (config.SHADING) displayMaterial.setKeywords(['SHADING']);
  else displayMaterial.setKeywords([]);
  initFramebuffers();

  let lastUpdateTime = Date.now(), colorUpdateTimer = 0;

  function updateFrame() {
    let now = Date.now();
    let dt = Math.min((now - lastUpdateTime) / 1000, 0.016666);
    lastUpdateTime = now;

    const w = scaleByPixelRatio(canvas.clientWidth), h = scaleByPixelRatio(canvas.clientHeight);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; initFramebuffers(); }

    colorUpdateTimer += dt * config.COLOR_UPDATE_SPEED;
    if (colorUpdateTimer >= 1) {
      colorUpdateTimer = colorUpdateTimer % 1;
      pointers.forEach(p => { p.color = generateColor(); });
    }

    pointers.forEach(p => { if (p.moved) { p.moved = false; splatPointer(p); } });
    step(dt);
    fluidRender(null);
    requestAnimationFrame(updateFrame);
  }

  window.addEventListener('mousedown', e => {
    const pointer = pointers[0];
    updatePointerDownData(pointer, -1, scaleByPixelRatio(e.clientX), scaleByPixelRatio(e.clientY));
    clickSplat(pointer);
  });

  document.body.addEventListener('mousemove', function handleFirstMove(e) {
    const pointer = pointers[0];
    updatePointerMoveData(pointer, scaleByPixelRatio(e.clientX), scaleByPixelRatio(e.clientY), generateColor());
    updateFrame();
    document.body.removeEventListener('mousemove', handleFirstMove);
  });

  window.addEventListener('mousemove', e => {
    const pointer = pointers[0];
    updatePointerMoveData(pointer, scaleByPixelRatio(e.clientX), scaleByPixelRatio(e.clientY), pointer.color);
  });

  window.addEventListener('touchstart', e => {
    const touches = e.targetTouches, pointer = pointers[0];
    for (let i = 0; i < touches.length; i++)
      updatePointerDownData(pointer, touches[i].identifier, scaleByPixelRatio(touches[i].clientX), scaleByPixelRatio(touches[i].clientY));
  });

  window.addEventListener('touchmove', e => {
    const touches = e.targetTouches, pointer = pointers[0];
    for (let i = 0; i < touches.length; i++)
      updatePointerMoveData(pointer, scaleByPixelRatio(touches[i].clientX), scaleByPixelRatio(touches[i].clientY), pointer.color);
  }, false);

  window.addEventListener('touchend', e => {
    const touches = e.changedTouches, pointer = pointers[0];
    for (let i = 0; i < touches.length; i++) updatePointerUpData(pointer);
  });

  updateFrame();
}

// ── Todo list ────────────────────────────────────────────────────────────────

let todoState = { classes: [], tasks: [] };
const expandedClasses = new Set();
const expandedDoneSections = new Set();

const PRIORITY_ORDER  = { high: 0, medium: 1, low: 2, none: 3 };
const PRIORITY_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e', none: 'transparent' };

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

async function loadTodoState() {
  const stored = await chrome.storage.local.get('todos');
  let seed = null;
  try {
    const resp = await fetch(chrome.runtime.getURL('todos.json'));
    seed = await resp.json();
  } catch {}

  if (stored.todos) {
    todoState = stored.todos;
    // Replace classes when todos.json ships a newer class list (e.g. new semester)
    if (seed && (seed.version || 0) > (todoState.version || 0)) {
      todoState.classes = seed.classes;
      todoState.version = seed.version;
      await saveTodoState();
    }
  } else {
    todoState = seed || { classes: [], tasks: [] };
  }
}

async function saveTodoState() {
  await chrome.storage.local.set({ todos: todoState });
}

function formatDue(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return 'today';
  if (diff === 1) return 'tmrw';
  if (diff < 0) return `${Math.abs(diff)}d ago`;
  if (diff <= 6) return `${diff}d`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function renderTodos() {
  const container = document.getElementById('todoList');
  if (!container) return;

  container.innerHTML = todoState.classes.map(cls => {
    const tasks = todoState.tasks.filter(t => t.classId === cls.id);
    const pending = tasks.filter(t => !t.done).sort((a, b) => {
      const pd = PRIORITY_ORDER[a.priority ?? 'none'] - PRIORITY_ORDER[b.priority ?? 'none'];
      if (pd !== 0) return pd;
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });
    const done = tasks.filter(t => t.done);
    const isOpen = expandedClasses.has(cls.id);
    const doneOpen = expandedDoneSections.has(cls.id);

    const taskRow = task => {
      const dot = (task.priority && task.priority !== 'none')
        ? `<span class="todo-priority-dot" style="background:${PRIORITY_COLORS[task.priority]}"></span>`
        : '';
      const due = task.dueDate
        ? `<span class="todo-due">${formatDue(task.dueDate)}</span>`
        : '';
      return `
        <div class="todo-task${task.done ? ' done' : ''}" data-task-id="${task.id}">
          <button class="todo-task-toggle" data-action="toggle-task" data-id="${task.id}" title="mark done"></button>
          ${dot}
          <span class="todo-task-text" data-id="${task.id}">${escapeHtml(task.title)}</span>
          ${due}
          <button class="todo-del-task" data-action="delete-task" data-id="${task.id}" title="delete">×</button>
        </div>
      `;
    };

    const doneSection = done.length > 0 ? `
      <div class="todo-done-header" data-action="toggle-done-section" data-id="${cls.id}">
        <span class="todo-done-arrow">${doneOpen ? '▾' : '▸'}</span>
        <span>done (${done.length})</span>
      </div>
      <div class="todo-done-tasks${doneOpen ? '' : ' hidden'}">
        ${done.map(taskRow).join('')}
      </div>
    ` : '';

    return `
      <div class="todo-class" data-class-id="${cls.id}">
        <div class="todo-class-row" data-action="toggle-class" data-id="${cls.id}" draggable="true">
          <span class="todo-class-icon">&#8801;</span>
          <span class="todo-class-name">${escapeHtml(cls.name)}</span>
          ${pending.length > 0 ? `<span class="todo-badge">${pending.length}</span>` : ''}
        </div>
        <div class="todo-tasks${isOpen ? '' : ' hidden'}">
          ${pending.map(taskRow).join('')}
          ${doneSection}
          <div class="todo-add-row">
            <input class="todo-input" data-class-id="${cls.id}" placeholder="add task…">
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ── Context menu (priority / due date) ──────────────────────────────────────

function removeContextMenu() {
  document.querySelector('.todo-context-menu')?.remove();
}

function showContextMenu(x, y, taskId) {
  removeContextMenu();
  const task = todoState.tasks.find(t => t.id === taskId);
  if (!task) return;

  const menu = document.createElement('div');
  menu.className = 'todo-context-menu';
  menu.style.left = x + 'px';
  menu.style.top  = y + 'px';

  const priorities = ['high', 'medium', 'low', 'none'];
  menu.innerHTML = `
    <div class="tcm-section">Priority</div>
    ${priorities.map(p => `
      <div class="tcm-item${(task.priority ?? 'none') === p ? ' active' : ''}" data-set-priority="${p}">
        <span class="tcm-dot" style="background:${PRIORITY_COLORS[p]}"></span>${p}
      </div>
    `).join('')}
    <div class="tcm-section">Due date</div>
    <input class="tcm-date" type="date" value="${task.dueDate ?? new Date().toISOString().slice(0, 10)}">
    ${task.dueDate ? '<div class="tcm-item" data-clear-date="1">Clear date</div>' : ''}
  `;

  document.body.appendChild(menu);

  // Keep menu inside viewport
  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth)  menu.style.left = (window.innerWidth - rect.width - 8) + 'px';
  if (rect.bottom > window.innerHeight) menu.style.top = (window.innerHeight - rect.height - 8) + 'px';

  menu.querySelector('.tcm-date').addEventListener('change', async ev => {
    task.dueDate = ev.target.value || null;
    await saveTodoState(); renderTodos(); removeContextMenu();
  });

  menu.addEventListener('click', async ev => {
    const setPri = ev.target.closest('[data-set-priority]');
    if (setPri) {
      task.priority = setPri.dataset.setPriority;
      await saveTodoState(); renderTodos(); removeContextMenu();
      return;
    }
    if (ev.target.closest('[data-clear-date]')) {
      task.dueDate = null;
      await saveTodoState(); renderTodos(); removeContextMenu();
    }
  });

  menu.addEventListener('click', e => e.stopPropagation());
  menu.addEventListener('mousedown', e => e.stopPropagation());
  setTimeout(() => document.addEventListener('click', removeContextMenu, { once: true }), 0);
}

// ── Drag state ───────────────────────────────────────────────────────────────

let _dragSrcClassId = null;

function initTodos() {
  const list = document.getElementById('todoList');

  // ── click delegation ──────────────────────────────────────────────────────
  list.addEventListener('click', async e => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const { action, id } = target.dataset;

    if (action === 'toggle-class') {
      if (e.target.closest('[data-action="delete-class"]')) return;
      expandedClasses.has(id) ? expandedClasses.delete(id) : expandedClasses.add(id);
      renderTodos();
    }

    if (action === 'delete-class') {
      todoState.classes = todoState.classes.filter(c => c.id !== id);
      todoState.tasks   = todoState.tasks.filter(t => t.classId !== id);
      expandedClasses.delete(id);
      await saveTodoState(); renderTodos();
    }

    if (action === 'delete-task') {
      todoState.tasks = todoState.tasks.filter(t => t.id !== id);
      await saveTodoState(); renderTodos();
    }

    if (action === 'toggle-done-section') {
      expandedDoneSections.has(id) ? expandedDoneSections.delete(id) : expandedDoneSections.add(id);
      renderTodos();
    }
  });

  list.addEventListener('click', async e => {
    const target = e.target.closest('.todo-task-toggle[data-action="toggle-task"]');
    if (!target) return;
    const task = todoState.tasks.find(t => t.id === target.dataset.id);
    if (task) { task.done = !task.done; await saveTodoState(); renderTodos(); }
  });

  // ── inline editing (double-click) ─────────────────────────────────────────
  list.addEventListener('dblclick', e => {
    const span = e.target.closest('.todo-task-text');
    if (!span) return;
    const taskId = span.dataset.id;
    const task = todoState.tasks.find(t => t.id === taskId);
    if (!task) return;

    const input = document.createElement('input');
    input.className = 'todo-input todo-inline-edit';
    input.value = task.title;
    span.replaceWith(input);
    input.focus();
    input.select();

    const commit = async () => {
      const val = input.value.trim();
      if (val) task.title = val;
      await saveTodoState(); renderTodos();
    };
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', ev => {
      if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
      if (ev.key === 'Escape') { renderTodos(); }
    });
  });

  // ── context menu (right-click) ────────────────────────────────────────────
  list.addEventListener('contextmenu', e => {
    const task = e.target.closest('.todo-task');
    if (!task) return;
    e.preventDefault();
    showContextMenu(e.clientX, e.clientY, task.dataset.taskId);
  });

  // ── add task on Enter ─────────────────────────────────────────────────────
  list.addEventListener('keydown', async e => {
    if (e.key !== 'Enter') return;
    const input = e.target.closest('.todo-input[data-class-id]');
    if (!input) return;
    const title = input.value.trim();
    if (!title) return;
    todoState.tasks.push({
      id: genId(), classId: input.dataset.classId,
      title, done: false, priority: 'none', dueDate: null, createdAt: Date.now()
    });
    input.value = '';
    await saveTodoState(); renderTodos();
    const rerendered = list.querySelector(`.todo-input[data-class-id="${input.dataset.classId}"]`);
    if (rerendered) rerendered.focus();
  });

  // ── drag-to-reorder classes ───────────────────────────────────────────────
  list.addEventListener('dragstart', e => {
    const row = e.target.closest('.todo-class-row[draggable]');
    if (!row) return;
    _dragSrcClassId = row.closest('.todo-class')?.dataset.classId ?? null;
    e.dataTransfer.effectAllowed = 'move';
  });

  list.addEventListener('dragover', e => {
    if (!_dragSrcClassId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  });

  list.addEventListener('drop', async e => {
    e.preventDefault();
    const row = e.target.closest('.todo-class-row');
    if (!row || !_dragSrcClassId) return;
    const targetId = row.closest('.todo-class')?.dataset.classId;
    if (!targetId || targetId === _dragSrcClassId) return;

    const srcIdx = todoState.classes.findIndex(c => c.id === _dragSrcClassId);
    const tgtIdx = todoState.classes.findIndex(c => c.id === targetId);
    if (srcIdx < 0 || tgtIdx < 0) return;

    const [moved] = todoState.classes.splice(srcIdx, 1);
    todoState.classes.splice(tgtIdx, 0, moved);
    await saveTodoState(); renderTodos();
    _dragSrcClassId = null;
  });

  list.addEventListener('dragend', () => { _dragSrcClassId = null; });
}

// ── End todo list ─────────────────────────────────────────────────────────────

function enableDynamicBackground() {
  const root = document.documentElement;
  const lerp = 0.05;

  let targetX = 0, targetY = 0;
  let currentX = 0, currentY = 0;

  function tick() {
    currentX += (targetX - currentX) * lerp;
    currentY += (targetY - currentY) * lerp;

    root.style.setProperty("--tx", currentX.toFixed(2) + "px");
    root.style.setProperty("--ty", currentY.toFixed(2) + "px");

    requestAnimationFrame(tick);
  }

  window.addEventListener("mousemove", (e) => {
    const nx = e.clientX / window.innerWidth - 0.5;   // -0.5..0.5
    const ny = e.clientY / window.innerHeight - 0.5;  // -0.5..0.5

    // max travel ~3% of viewport — safely within the 5% buffer from scale(1.1)
    targetX = nx * window.innerWidth * 0.04;
    targetY = ny * window.innerHeight * 0.03;
  }, { passive: true });

  requestAnimationFrame(tick);
}



// ── Ollama AI Summary ─────────────────────────────────────────────────────────

const OLLAMA_MODEL = 'llama3.2:1b';

function buildOllamaPrompt() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const pendingByClass = todoState.classes.map(cls => {
    const pending = todoState.tasks.filter(t => t.classId === cls.id && !t.done);
    if (!pending.length) return null;
    return `${cls.name}: ${pending.map(t => {
      let s = t.title;
      if (t.priority && t.priority !== 'none') s += ` [${t.priority}]`;
      if (t.dueDate) s += ` (due ${t.dueDate})`;
      return s;
    }).join(', ')}`;
  }).filter(Boolean);

  const taskSection = pendingByClass.length
    ? pendingByClass.join('\n')
    : 'No pending tasks.';

  return `Today is ${dateStr} at ${timeStr}.\n\nMy pending tasks:\n${taskSection}\n\n In order of whats coming, give me a brief summary of what I have to do and make sure to state each task in a new line with ✦ in front, and give the date for each one if its given and also give a bit of encouragement on each task. Be concise.`;
}

async function streamOllamaSummary() {
  const textEl  = document.getElementById('ollamaText');
  const spinner = document.getElementById('ollamaSpinner');
  textEl.textContent = '';
  spinner.classList.remove('hidden');

  try {
    const resp = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt: buildOllamaPrompt(), stream: true })
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const reader  = resp.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of decoder.decode(value).split('\n')) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          if (data.response) textEl.textContent += data.response;
          if (data.done) { spinner.classList.add('hidden'); return; }
        } catch {}
      }
    }
  } catch (err) {
    const hint = err.message.includes('403')
      ? `Ollama is running but blocked this origin.\nFix: restart Ollama with\nOLLAMA_ORIGINS="*" ollama serve`
      : `Could not reach Ollama — is it running?\n(${err.message})`;
    textEl.textContent = hint;
  }
  spinner.classList.add('hidden');
}

function initOllamaSummary() {
  const toggle      = document.getElementById('ollamaToggle');
  const panel       = document.getElementById('ollamaPanel');
  const todoSection = document.getElementById('todoSection');
  const opts        = toggle.querySelectorAll('.ollama-toggle-opt');

  function apply(isOn, stream) {
    opts.forEach(o => o.classList.toggle('active', o.dataset.side === (isOn ? 'ai' : 'tasks')));
    panel.classList.toggle('hidden', !isOn);
    todoSection.classList.toggle('hidden', isOn);
    if (isOn && stream) streamOllamaSummary();
  }

  // Restore persisted state
  const persisted = localStorage.getItem('ollamaOn') === 'true';
  apply(persisted, persisted);

  toggle.addEventListener('click', e => {
    const opt = e.target.closest('.ollama-toggle-opt');
    if (!opt) return;
    const isOn = opt.dataset.side === 'ai';
    localStorage.setItem('ollamaOn', isOn);
    apply(isOn, true);
  });
}

// ── End Ollama summary ────────────────────────────────────────────────────────

(async function init() {
  const state = await loadState();
  renderLinks(state.links);
  startClock();
  await loadTodoState();
  renderTodos();
  initTodos();
  initSplashCursor();
  enableDynamicBackground();
  initOllamaSummary();
  const greetingEl = document.getElementById("greeting");
  if (greetingEl) {
    greetingEl.textContent = getRandomGreeting();
  }
  // --- Search wiring (form submit covers Enter + button) ---
  const form = document.getElementById("searchForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      doSearch();
    });
  } else {
    // fallback if you remove the form later
    document.getElementById("go")?.addEventListener("click", doSearch);
    document.getElementById("q")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doSearch();
    });
  }
  const bingForm = document.getElementById("bingForm");
  if (bingForm) {
    bingForm.addEventListener("submit", (e) => {
      e.preventDefault();
      bingSearch();
    });
  } else {
    document.getElementById("bingGo")?.addEventListener("click", bingSearch);
    document.getElementById("bingQ")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") bingSearch();
    });
  }

  // --- Modal wiring (optional) ---
  const linksRawEl = document.getElementById("linksRaw");
  if (linksRawEl) linksRawEl.value = toRawLinks(state.links);

  document.getElementById("edit")?.addEventListener("click", openModal);
  document.getElementById("close")?.addEventListener("click", closeModal);

  document.getElementById("save")?.addEventListener("click", async () => {
    const raw = document.getElementById("linksRaw")?.value ?? "";
    const parsed = parseRawLinks(raw);
    if (!parsed.length) return;
    await saveState({ links: parsed });
    renderLinks(parsed);
    closeModal();
  });
})();

