// GLSL for terrain, sky, clouds and post-processing. Lighting is done in linear HDR;
// the composite pass tone-maps and encodes to sRGB.

export const SKY_COMMON = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uSunDir;
uniform vec3 uGlowColor;
vec3 skyBase(vec3 d) {
  float h = max(d.y, 0.0);
  vec3 c = mix(uHorizon, uZenith, 1.0 - pow(1.0 - h, 2.6));
  float sd = max(dot(d, uSunDir), 0.0);
  float hz = 1.0 - h;
  c += uGlowColor * (pow(sd, 6.0) * 0.32 * hz * hz + pow(sd, 48.0) * 0.45);
  if (d.y < 0.0) c = mix(c, uHorizon * 0.6, min(-d.y * 3.0, 1.0));
  return c;
}
`;

export const CHUNK_VERT = /* glsl */ `
precision highp float;
in vec4 aPos;
in vec4 aUv;
in vec4 aLight;
in vec4 aTint;
uniform float uTime;
uniform float uSway;
uniform mat4 uShadowMatrix;
out vec2 vUv;
flat out float vLayer;
out float vAux;
out vec4 vLight;
out vec4 vTint;
out vec3 vWorld;
out vec3 vNormal;
out vec3 vShadow;
flat out float vWater;
const vec3 NORMALS[7] = vec3[7](vec3(1,0,0), vec3(-1,0,0), vec3(0,1,0), vec3(0,-1,0), vec3(0,0,1), vec3(0,0,-1), vec3(0,1,0));
void main() {
  int flags = int(aPos.w);
  int sway = (flags >> 3) & 3;
  vec3 wp = (modelMatrix * vec4(aPos.xyz / 16.0, 1.0)).xyz;
  if (uSway > 0.0 && sway > 0) {
    float t = uTime;
    if (sway == 1) {
      wp.x += sin(t * 1.6 + wp.x * 0.7 + wp.y * 1.1 + wp.z * 0.5) * 0.035;
      wp.z += cos(t * 1.3 + wp.z * 0.8 + wp.y * 0.9) * 0.035;
      wp.y += sin(t * 2.0 + wp.x + wp.z) * 0.015;
    } else if (sway == 2) {
      wp.x += sin(t * 1.8 + wp.x * 0.9 + wp.z * 1.3) * 0.08 + sin(t * 0.7 + wp.z * 0.3) * 0.05;
      wp.z += cos(t * 1.5 + wp.x * 1.1 + wp.z * 0.4) * 0.07;
    } else {
      wp.y += (sin(t * 1.2 + wp.x * 0.55 + wp.z * 0.35) + sin(t * 0.9 - wp.x * 0.3 + wp.z * 0.7)) * 0.035 - 0.02;
    }
  }
  vUv = aUv.xy / 16.0;
  vLayer = aUv.z;
  vAux = aUv.w / 255.0;
  vLight = aLight;
  vTint = aTint;
  vWorld = wp;
  vNormal = NORMALS[flags & 7];
  vWater = float((flags >> 5) & 1);
  vec4 sp = uShadowMatrix * vec4(wp + vNormal * 0.06, 1.0);
  vShadow = sp.xyz;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`;

export const CHUNK_FRAG = /* glsl */ `
precision highp float;
precision highp sampler2DArray;
precision highp sampler2DShadow;
uniform sampler2DArray uAtlas;
uniform sampler2DShadow uShadowMap;
uniform float uShadowOn;
uniform float uShadowTexel;
uniform float uTime;
uniform vec3 uLightDir;
uniform vec3 uLightColor;
uniform vec3 uSkyLight;
uniform vec3 uAmbient;
uniform float uFogDensity;
uniform float uFogStart;
uniform float uFogEnd;
uniform float uCave;
uniform float uUnderwater;
uniform vec3 uWaterFog;
in vec2 vUv;
flat in float vLayer;
in float vAux;
in vec4 vLight;
in vec4 vTint;
in vec3 vWorld;
in vec3 vNormal;
in vec3 vShadow;
flat in float vWater;
${SKY_COMMON}
float curve(float x) { return x * x * (0.35 + 0.65 * x); }
vec3 curve3(vec3 x) { return x * x * (0.35 + 0.65 * x); }

float sunShadow() {
  if (uShadowOn <= 0.0) return 1.0;
  vec3 p = vShadow;
  if (p.x < 0.01 || p.x > 0.99 || p.y < 0.01 || p.y > 0.99 || p.z > 0.999) return 1.0;
  float s = 0.0, o = uShadowTexel;
  s += texture(uShadowMap, vec3(p.xy + vec2(-o, -o) * 0.75, p.z));
  s += texture(uShadowMap, vec3(p.xy + vec2(o, -o) * 0.75, p.z));
  s += texture(uShadowMap, vec3(p.xy + vec2(-o, o) * 0.75, p.z));
  s += texture(uShadowMap, vec3(p.xy + vec2(o, o) * 0.75, p.z));
  s += texture(uShadowMap, vec3(p.xy, p.z));
  s *= 0.2;
  vec2 e = abs(p.xy - 0.5) * 2.0;
  return mix(1.0, mix(s, 1.0, smoothstep(0.82, 0.98, max(e.x, e.y))), uShadowOn);
}

void main() {
  vec3 uvl = vec3(vUv, vLayer);
  vec3 V = vWorld - cameraPosition;
  float dist = length(V);
  vec3 dir = V / max(dist, 1e-4);
  vec3 N = vNormal;
  float em = vAux;
  float alpha = 1.0;
  float glow;
#if defined(TRANSLUCENT)
  vec4 tex;
  if (vWater > 0.5) {
    vec2 flow = vec2(uTime * 0.035, uTime * 0.022);
    tex = mix(texture(uAtlas, vec3(vUv + flow, vLayer)), texture(uAtlas, vec3(vUv * 1.0 - flow.yx + 0.37, vLayer)), 0.5);
  } else tex = texture(uAtlas, uvl);
  vec3 base = tex.rgb * vTint.rgb;
  glow = vWater > 0.5 ? 0.0 : 1.0;
  alpha = tex.a;
#elif defined(CUTOUT)
  vec4 tex = texture(uAtlas, uvl);
  if (tex.a < 0.42) discard;
  vec3 base = tex.rgb * vTint.rgb;
  glow = smoothstep(0.45, 0.85, dot(tex.rgb, vec3(0.3, 0.5, 0.2)));
  // cross plants are upright quads that carry an up normal: keep it on their back faces so both sides are lit like the ground
  vec3 gN = cross(dFdx(vWorld), dFdy(vWorld));
  if (!gl_FrontFacing && !(N.y > 0.5 && abs(gN.y) < 0.5 * length(gN))) N = -N;
#else
  vec4 tex = texture(uAtlas, uvl);
  float mask = 1.0 - tex.a;
  vec3 base = em > 0.0 ? tex.rgb : tex.rgb * mix(vec3(1.0), vTint.rgb, mask);
  glow = mask;
#endif
  vec3 albedo = base * base;
  float ao = 0.42 + 0.58 * vTint.a;
  float skyL = curve(vLight.x);
  vec3 blk = curve3(vLight.yzw);
  float shade = 0.78 + 0.22 * N.y - 0.06 * abs(N.x) + 0.06 * abs(N.z);
  float ndl = max(dot(N, uLightDir), 0.0);
  float sunVis = smoothstep(0.5, 0.98, vLight.x);
  if (sunVis > 0.0 && ndl > 0.0) sunVis *= sunShadow();
  vec3 light = uSkyLight * skyL * shade + uLightColor * ndl * sunVis + blk * vec3(1.75, 1.6, 1.45) + uAmbient * shade;
  light *= ao;
  vec3 col = albedo * light;

#if defined(TRANSLUCENT)
  if (vWater > 0.5) {
    float depth = clamp(vAux, 0.0, 1.0);
    float t = uTime;
    vec2 w = vWorld.xz;
    vec3 Nw = normalize(vec3(
      cos(w.x * 1.7 + t * 1.4) * 0.05 + cos(w.x * 0.55 + w.y * 0.35 + t * 1.2) * 0.04, 1.0,
      cos(w.y * 1.9 + t * 1.1) * 0.05 + cos(w.y * 0.7 - w.x * 0.3 + t * 0.9) * 0.04));
    if (N.y < 0.5) Nw = N;
    if (!gl_FrontFacing) Nw = -Nw;
    float fres = 0.03 + 0.97 * pow(1.0 - max(dot(-dir, Nw), 0.0), 4.0);
    vec3 r = reflect(dir, Nw); r.y = abs(r.y);
    vec3 refl = skyBase(r) * mix(0.25, 1.0, sunVis);
    vec3 body = albedo * mix(1.0, 0.32, depth) * light;
    col = mix(body, refl, fres * (gl_FrontFacing ? 1.0 : 0.25));
    float spec = pow(max(dot(r, uLightDir), 0.0), 220.0);
    col += uLightColor * spec * 6.0 * sunVis;
    alpha = mix(mix(0.5, 0.86, depth), 1.0, fres);
  } else {
    col += albedo * em * 3.0;
  }
#else
  col += albedo * em * glow * 4.0;
#endif

  float f = 1.0 - exp(-pow(dist * uFogDensity, 2.0));
  f = max(f, smoothstep(uFogStart, uFogEnd, length(V.xz)));
  vec3 fd = normalize(vec3(dir.x, max(dir.y, 0.0) * 0.5 + 0.015, dir.z));
  vec3 fc = mix(skyBase(fd), uAmbient * 0.6, uCave);
  if (uUnderwater > 0.5) { f = 1.0 - exp(-dist * 0.085); fc = uWaterFog; }
  col = mix(col, fc, f);
  gl_FragColor = vec4(col, alpha);
}
`;

export const DEPTH_VERT = /* glsl */ `
precision highp float;
in vec4 aPos;
void main() { gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(aPos.xyz / 16.0, 1.0); }
`;
export const DEPTH_FRAG = /* glsl */ `
precision highp float;
void main() { gl_FragColor = vec4(1.0); }
`;
export const DEPTH_CUT_VERT = /* glsl */ `
precision highp float;
in vec4 aPos;
in vec4 aUv;
out vec2 vUv;
flat out float vLayer;
void main() { vUv = aUv.xy / 16.0; vLayer = aUv.z; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(aPos.xyz / 16.0, 1.0); }
`;
export const DEPTH_CUT_FRAG = /* glsl */ `
precision highp float;
precision highp sampler2DArray;
uniform sampler2DArray uAtlas;
in vec2 vUv;
flat in float vLayer;
void main() { if (texture(uAtlas, vec3(vUv, vLayer)).a < 0.42) discard; gl_FragColor = vec4(1.0); }
`;

export const SKY_VERT = /* glsl */ `
out vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * mat4(mat3(viewMatrix)) * vec4(position, 1.0);
  gl_Position = p.xyww;
}
`;
export const SKY_FRAG = /* glsl */ `
precision highp float;
in vec3 vDir;
uniform vec3 uSunDisc;
uniform vec3 uMoonColor;
uniform float uStars;
uniform float uTime;
uniform float uMoonPhase;
uniform float uStarSpin;
uniform vec3 uAurora;
${SKY_COMMON}
float hash3(vec3 p) { p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }
float disc(vec3 d, vec3 c, float size, float soft) {
  vec3 r = normalize(cross(c, vec3(0.0, 0.0, 1.0)));
  vec3 u = cross(r, c);
  float k = dot(d, c);
  if (k <= 0.0) return 0.0;
  vec2 p = vec2(dot(d, r), dot(d, u)) / k / size;
  float m = pow(pow(abs(p.x), 4.0) + pow(abs(p.y), 4.0), 0.25);
  return 1.0 - smoothstep(1.0 - soft, 1.0, m);
}
void main() {
  vec3 d = normalize(vDir);
  vec3 col = skyBase(d);
  float above = smoothstep(-0.02, 0.08, d.y);
  // stars: blocky cells on the sphere, slowly wheeling around the pole
  if (uStars > 0.01) {
    float a = uStarSpin;
    vec3 s = vec3(d.x * cos(a) - d.y * sin(a), d.x * sin(a) + d.y * cos(a), d.z);
    vec3 cell = floor(s * 110.0);
    float h = hash3(cell);
    float star = step(0.9972, h) * (0.5 + 0.5 * sin(uTime * (1.0 + h * 3.0) + h * 90.0));
    vec3 tint = mix(vec3(0.75, 0.85, 1.0), vec3(1.0, 0.9, 0.75), hash3(cell + 7.0));
    col += tint * star * uStars * above * 1.6;
  }
  if (uAurora.x + uAurora.y + uAurora.z > 0.0) {
    float band = sin(d.x * 6.0 + sin(d.z * 4.0 + uTime * 0.15) * 2.0 + uTime * 0.1) * 0.5 + 0.5;
    float curtain = smoothstep(0.15, 0.6, d.y) * smoothstep(0.95, 0.5, d.y) * pow(band, 3.0);
    col += uAurora * curtain * (0.6 + 0.4 * sin(d.z * 30.0 + uTime));
  }
  float sun = disc(d, uSunDir, 0.055, 0.25);
  col += uSunDisc * sun;
  vec3 md = -uSunDir;
  float moon = disc(d, md, 0.045, 0.12);
  if (moon > 0.0) {
    vec3 off = normalize(md + normalize(cross(md, vec3(0.0, 0.0, 1.0))) * (uMoonPhase * 0.09));
    float cut = uMoonPhase == 0.0 ? 0.0 : disc(d, off, 0.045, 0.12);
    col += uMoonColor * moon * (1.0 - cut * 0.92);
  }
  gl_FragColor = vec4(col, 1.0);
}
`;

export const CLOUD_VERT = /* glsl */ `
out vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;
export const CLOUD_FRAG = /* glsl */ `
precision highp float;
in vec3 vWorld;
uniform float uTime;
uniform vec3 uCloudLit;
uniform vec3 uCloudDark;
uniform float uCover;
uniform float uFogEnd;
${SKY_COMMON}
float h2(vec2 p) { p = fract(p * vec2(0.1031, 0.1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y);
}
void main() {
  vec2 p = (vWorld.xz + vec2(uTime * 2.4, uTime * 0.9)) / 12.0;
  vec2 cell = floor(p);
  float n = vn(cell / 5.0) * 0.6 + vn(cell / 2.2 + 31.0) * 0.3 + vn(cell + 7.0) * 0.1;
  float a = smoothstep(uCover, uCover + 0.06, n);
  if (a < 0.01) discard;
  vec3 V = vWorld - cameraPosition;
  float d = length(V.xz);
  float shade = smoothstep(uCover, uCover + 0.3, n);
  vec3 col = mix(uCloudLit, uCloudDark, shade * 0.55 + (cameraPosition.y > vWorld.y ? 0.0 : 0.15));
  float fog = smoothstep(uFogEnd * 0.9, uFogEnd * 2.6, d);
  vec3 dir = normalize(V);
  col = mix(col, skyBase(normalize(vec3(dir.x, abs(dir.y) * 0.5 + 0.02, dir.z))), fog);
  gl_FragColor = vec4(col, a * 0.9 * (1.0 - fog));
}
`;

export const FS_VERT = /* glsl */ `
out vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
export const BRIGHT_FRAG = /* glsl */ `
precision highp float;
in vec2 vUv;
uniform sampler2D tSrc;
uniform float uThreshold;
void main() {
  vec3 c = texture(tSrc, vUv).rgb;
  float b = max(c.r, max(c.g, c.b));
  float k = max(b - uThreshold, 0.0) / max(b, 1e-4);
  gl_FragColor = vec4(min(c * k, vec3(12.0)), 1.0);
}
`;
export const DOWN_FRAG = /* glsl */ `
precision highp float;
in vec2 vUv;
uniform sampler2D tSrc;
uniform vec2 uTexel;
void main() {
  vec3 c = texture(tSrc, vUv).rgb * 4.0;
  c += texture(tSrc, vUv + uTexel * vec2(-1.0, -1.0)).rgb;
  c += texture(tSrc, vUv + uTexel * vec2(1.0, -1.0)).rgb;
  c += texture(tSrc, vUv + uTexel * vec2(-1.0, 1.0)).rgb;
  c += texture(tSrc, vUv + uTexel * vec2(1.0, 1.0)).rgb;
  gl_FragColor = vec4(c / 8.0, 1.0);
}
`;
export const UP_FRAG = /* glsl */ `
precision highp float;
in vec2 vUv;
uniform sampler2D tSrc;
uniform sampler2D tAdd;
uniform vec2 uTexel;
void main() {
  vec3 c = texture(tSrc, vUv + uTexel * vec2(-1.0, 0.0)).rgb + texture(tSrc, vUv + uTexel * vec2(1.0, 0.0)).rgb
         + texture(tSrc, vUv + uTexel * vec2(0.0, -1.0)).rgb + texture(tSrc, vUv + uTexel * vec2(0.0, 1.0)).rgb;
  c = c * 0.125 + texture(tSrc, vUv).rgb * 0.5;
  gl_FragColor = vec4(c + texture(tAdd, vUv).rgb, 1.0);
}
`;
export const FINAL_FRAG = /* glsl */ `
precision highp float;
in vec2 vUv;
uniform sampler2D tScene;
uniform sampler2D tBloom;
uniform float uBloom;
uniform float uExposure;
uniform float uVignette;
uniform float uTonemap;
uniform vec3 uTint;
uniform float uFlash;
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main() {
  vec3 c = texture(tScene, vUv).rgb;
  c += texture(tBloom, vUv).rgb * uBloom;
  c *= uExposure * uTint;
  c = uTonemap > 0.5 ? aces(c) : clamp(c, 0.0, 1.0);
  c = pow(c, vec3(1.0 / 2.2));
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l), c, 1.1);
  vec2 q = vUv - 0.5;
  c *= 1.0 - uVignette * smoothstep(0.35, 0.95, dot(q, q) * 2.2);
  c = mix(c, vec3(1.0, 0.15, 0.1), uFlash);
  gl_FragColor = vec4(c, 1.0);
}
`;
