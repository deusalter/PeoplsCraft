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

/** Cloud cover lookup shared by the cloud slab, the cloud shadows on terrain and water reflections.
 *  Needs uTime and uLightDir declared by the including shader. */
export const CLOUD_COMMON = /* glsl */ `
uniform sampler2D uCloudMap;   // tileable cover noise, one texel per 12-block cloud cell
uniform vec4 uCloud;           // layer base y, thickness, shadow strength, 1 while the layer is drawn
uniform float uCover;
vec2 cloudCell(vec2 xz) { return (xz + vec2(uTime * 2.4, uTime * 0.9)) / 12.0; }
float cloudShade(vec3 w) {
  if (uCloud.z <= 0.0 || w.y > uCloud.x) return 1.0;
  vec2 q = cloudCell(w.xz + uLightDir.xz * ((uCloud.x - w.y) / max(uLightDir.y, 0.2)));
  return 1.0 - uCloud.z * smoothstep(uCover - 0.03, uCover + 0.05, texture(uCloudMap, q / 256.0).r);
}
`;

/** Distance fog, height mist and the underwater murk. Needs SKY_COMMON and uAmbient before it. */
export const FOG_COMMON = /* glsl */ `
uniform float uFogDensity;
uniform float uFogStart;
uniform float uFogEnd;
uniform float uCave;
uniform float uUnderwater;
uniform vec3 uWaterFog;
uniform vec2 uMist;            // mist density at its base height, base height
vec3 applyFog(vec3 col, vec3 world) {
  vec3 V = world - cameraPosition;
  float dist = length(V);
  if (uUnderwater > 0.5) return mix(col, uWaterFog, 1.0 - exp(-dist * 0.085));
  vec3 dir = V / max(dist, 1e-4);
  // mist thins exponentially above its base height; the density is integrated along the view ray, with both
  // ends clamped a little below the base so pits and ravines seen from above do not go opaque
  const float k = 0.045;
  float lo = uMist.y - 12.0;
  float y0 = max(cameraPosition.y, lo) - uMist.y, y1 = max(world.y, lo) - uMist.y, dy = y1 - y0;
  float e0 = exp(-k * y0);
  float avg = abs(dy) < 0.5 ? e0 : (e0 - exp(-k * y1)) / (k * dy);
  float f = 1.0 - exp(-pow(dist * uFogDensity, 2.0) - uMist.x * avg * dist);
  f = max(f, smoothstep(uFogStart, uFogEnd, length(V.xz)));
  // follow the sky below the horizon too, so a fogged rim seen from a hill matches the sky behind it
  vec3 fd = normalize(vec3(dir.x, max(dir.y, 0.0) * 0.5 + min(dir.y, 0.0) + 0.015, dir.z));
  return mix(col, mix(skyBase(fd), uAmbient * 0.6, uCave), f);
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
uniform float uShadowBias;
uniform vec3 uLightDir;
out vec2 vUv;
flat out float vLayer;
out float vAux;
out vec4 vLight;
out vec4 vTint;
out vec3 vWorld;
out vec3 vNormal;
out vec3 vShadow;
flat out float vWater;
flat out float vFol;    // 0 solid, 1 leaves, 2 cross plant
flat out float vLava;
flat out float vSub;    // face lies under water
const vec3 NORMALS[7] = vec3[7](vec3(1,0,0), vec3(-1,0,0), vec3(0,1,0), vec3(0,-1,0), vec3(0,0,1), vec3(0,0,-1), vec3(0,1,0));
void main() {
  int flags = int(aPos.w);
  int sway = (flags >> 3) & 3;
  vec3 wp0 = (modelMatrix * vec4(aPos.xyz / 16.0, 1.0)).xyz, wp = wp0;
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
  vLava = float((flags >> 7) & 1);
  vSub = float((flags >> 8) & 1);
  vFol = (flags & 7) == 6 ? 2.0 : sway == 1 ? 1.0 : 0.0;
  // shadow lookup from the unswayed position (the depth pass does not sway), pushed off the surface by an offset
  // that grows with the shadow texel and the grazing angle; back faces of leaves are pushed towards the light
  float nl = dot(vNormal, uLightDir), sn = sqrt(max(1.0 - nl * nl, 0.0));
  vec4 sp = uShadowMatrix * vec4(wp0 + vNormal * ((nl < 0.0 ? -1.0 : 1.0) * uShadowBias * (0.6 + 0.9 * sn)) + uLightDir * (uShadowBias * 0.5), 1.0);
  vShadow = sp.xyz;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`;

export const CHUNK_FRAG = /* glsl */ `
precision highp float;
precision highp sampler2DArray;
precision highp sampler2DShadow;
uniform sampler2DArray uAtlas;
uniform sampler2DArray uAtlasF;   // the same tiles with linear and anisotropic filtering
uniform sampler2DShadow uShadowMap;
uniform float uShadowOn;
uniform float uShadowTexel;
uniform float uTime;
uniform vec3 uLightDir;
uniform vec3 uLightColor;
uniform vec3 uSkyLight;
uniform vec3 uAmbient;
uniform vec3 uCloudLit;
uniform vec3 uCloudDark;
in vec2 vUv;
flat in float vLayer;
in float vAux;
in vec4 vLight;
in vec4 vTint;
in vec3 vWorld;
in vec3 vNormal;
in vec3 vShadow;
flat in float vWater;
flat in float vFol;
flat in float vLava;
flat in float vSub;
${SKY_COMMON}
${FOG_COMMON}
${CLOUD_COMMON}
float h21(vec2 p) { p = fract(p * vec2(0.1031, 0.1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }
float curve(float x) { return x * x * (0.35 + 0.65 * x); }
vec3 curve3(vec3 x) { return x * x * (0.35 + 0.65 * x); }
// Block texture lookup that keeps hard texels up close (with their seams antialiased over one pixel) and is trilinear
// and anisotropic at range. The position is clamped inside its tile so a face never picks up the tile's opposite edge.
vec4 tileTex(vec2 uv, float layer) {
  vec2 f = (uv - floor(uv)) * 16.0, seam = floor(f + 0.5);
  f = seam + clamp((f - seam) / clamp(fwidth(uv) * 16.0, 1e-5, 1.0), -0.5, 0.5);
  return textureGrad(uAtlasF, vec3(clamp(f, 0.5, 15.5) / 16.0, layer), dFdx(uv), dFdy(uv));
}

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
  vec3 V = vWorld - cameraPosition;
  float dist = length(V);
  vec3 dir = V / max(dist, 1e-4);
  vec3 N = vNormal;
  float em = vAux;
  float alpha = 1.0;
  float glow;
  float ao = 0.42 + 0.58 * vTint.a;
#if defined(TRANSLUCENT)
  vec4 tex;
  if (vWater > 0.5) {
    vec2 flow = vec2(uTime * 0.035, uTime * 0.022);
    tex = mix(texture(uAtlas, vec3(vUv + flow, vLayer)), texture(uAtlas, vec3(vUv * 1.0 - flow.yx + 0.37, vLayer)), 0.5);
    ao = 1.0;   // water carries its shoreline factor in the AO channel
  } else tex = tileTex(vUv, vLayer);
  vec3 base = tex.rgb * vTint.rgb;
  glow = vWater > 0.5 ? 0.0 : 1.0;
  alpha = tex.a;
#elif defined(CUTOUT)
  vec4 tex = tileTex(vUv, vLayer);
  // mip-averaged alpha of sparse foliage drops under a fixed threshold at range, so relax it with distance
  if (tex.a < mix(0.42, 0.18, min(vFol, 1.0) * smoothstep(48.0, 128.0, dist))) discard;
  vec3 base = tex.rgb * vTint.rgb;
  glow = smoothstep(0.45, 0.85, dot(tex.rgb, vec3(0.3, 0.5, 0.2)));
  if (!gl_FrontFacing && vFol < 1.5) N = -N;
#else
  vec4 tex;
  if (vLava > 0.5) {
    // two crossed, slowly drifting copies of the tile, and a glow that breathes
    vec2 fl = vec2(uTime * 0.012, uTime * 0.008);
    tex = mix(texture(uAtlas, vec3(vUv + fl, vLayer)), texture(uAtlas, vec3(vUv.yx - fl + 0.41, vLayer)), 0.5);
    em *= 0.82 + 0.18 * sin(uTime * 1.1 + vWorld.x * 0.6 + vWorld.z * 0.8);
  } else tex = tileTex(vUv, vLayer);
  float mask = 1.0 - tex.a;
  vec3 base = em > 0.0 ? tex.rgb : tex.rgb * mix(vec3(1.0), vTint.rgb, mask);
  glow = mask;
#endif
  vec3 albedo = base * base;
  float skyL = curve(vLight.x);
  vec3 blk = curve3(vLight.yzw);
  float shade = 0.78 + 0.22 * N.y - 0.06 * abs(N.x) + 0.06 * abs(N.z);
  float ndl = max(dot(N, uLightDir), 0.0);
  float skyVis = smoothstep(0.5, 0.98, vLight.x), sunVis = skyVis;
  if (sunVis > 0.0 && ndl > 0.0) sunVis *= sunShadow() * cloudShade(vWorld);
  vec3 amb = uSkyLight * skyL * shade + blk * vec3(1.75, 1.6, 1.45) + uAmbient * shade;
  // a little warm light bounced off the ground onto walls and undersides
  amb += uLightColor * vec3(1.0, 0.92, 0.8) * (skyL * 0.07 * (1.0 - max(N.y, 0.0)));
  vec3 sun = uLightColor * (ndl * sunVis);
#if defined(CUTOUT)
  // light passing through leaves and blades. Gated by sky light, not the shadow map, so a leaf cannot shadow its own glow
  float wrap = max((dot(N, uLightDir) + 0.6) / 1.6, 0.0);
  sun += uLightColor * (min(vFol, 1.0) * (max(wrap * 0.6 - ndl, 0.0) + 0.4 * pow(max(dot(dir, uLightDir), 0.0), 3.0)) * skyVis * 0.6);
#endif
#if !defined(TRANSLUCENT)
  if (vSub > 0.5) {
    // caustics, snapped to texels on all three axes (nudged off the face so floor() is stable on integer planes)
    vec3 pw = floor((vWorld - vNormal * 0.03) * 16.0) / 16.0;
    vec2 q = pw.xz + pw.y * 0.37;
    float ca = sin(q.x * 3.1 + uTime * 1.3 + sin(q.y * 2.3 + uTime * 0.7) * 1.6) * sin(q.y * 2.7 - uTime * 1.1 + sin(q.x * 1.9 - uTime * 0.5) * 1.6);
    sun += uLightColor * (pow(1.0 - abs(ca), 6.0) * 0.7 * skyL * max(N.y, 0.25));
  }
#endif
  // corners keep full ambient occlusion in shade but only a hint of it in direct sun
  vec3 light = amb * ao + sun * mix(ao, 1.0, 0.55);
  vec3 col = albedo * light;
  float pulse = 0.93 + 0.07 * sin(uTime * 1.7 + dot(vWorld, vec3(0.35, 0.5, 0.45)));

#if defined(TRANSLUCENT)
  if (vWater > 0.5) {
    float depth = clamp(vAux, 0.0, 1.0);
    float t = uTime;
    vec2 w = vWorld.xz;
    bool top = N.y > 0.5;
    // broad swells plus texel-snapped ripples that fade with distance so far water does not sparkle-alias
    vec2 wq = floor(w * 16.0) / 16.0;
    float rip = 0.035 / (1.0 + dist * 0.03);
    vec3 Nw = normalize(vec3(
      cos(w.x * 1.7 + t * 1.4) * 0.05 + cos(w.x * 0.55 + w.y * 0.35 + t * 1.2) * 0.04 + (cos(wq.x * 5.3 + wq.y * 2.3 + t * 2.3) + cos(wq.x * 7.1 - wq.y * 3.1 - t * 1.7)) * rip, 1.0,
      cos(w.y * 1.9 + t * 1.1) * 0.05 + cos(w.y * 0.7 - w.x * 0.3 + t * 0.9) * 0.04 + (cos(wq.y * 5.3 - wq.x * 2.9 + t * 2.0) + cos(wq.y * 7.1 + wq.x * 3.7 - t * 1.5)) * rip));
    if (!top) Nw = N;
    if (!gl_FrontFacing) Nw = -Nw;
    float cosv = max(dot(-dir, Nw), 0.0);
    float fres = 0.03 + 0.97 * pow(1.0 - cosv, 4.0);
    vec3 r = reflect(dir, Nw); r.y = abs(r.y);
    vec3 refl = skyBase(r);
    if (uCloud.w > 0.5 && vWorld.y < uCloud.x) {
      // the underside of the cloud layer, mirrored
      vec2 cp = w + r.xz * ((uCloud.x - vWorld.y) / max(r.y, 0.05));
      float cf = 1.0 - smoothstep(uFogEnd * 0.9, uFogEnd * 2.6, length(cp - cameraPosition.xz));
      refl = mix(refl, mix(uCloudLit, uCloudDark, 0.6), 0.75 * cf * smoothstep(uCover - 0.02, uCover + 0.04, texture(uCloudMap, cloudCell(cp) / 256.0).r));
    }
    refl *= mix(0.25, 1.0, sunVis);
    float path = clamp(depth / max(cosv, 0.25), 0.0, 1.0);   // absorption along the view path, not straight down
    vec3 body = albedo * mix(1.0, 0.32, path) * light;
    col = mix(body, refl, fres * (gl_FrontFacing ? 1.0 : 0.25));
    alpha = mix(mix(0.5, 0.86, path), 1.0, fres);
    if (gl_FrontFacing) {
      // a soft sheen and a hard glitter path under the sun or moon
      float rl = max(dot(r, uLightDir), 0.0);
      col += uLightColor * ((pow(rl, 90.0) * 1.2 + pow(rl, 700.0) * 14.0) * sunVis);
      if (top) {
        // ragged foam where the surface meets land, lapping in and out
        float shore = 1.0 - vTint.a;
        float lap = 0.5 + 0.5 * sin(t * 1.1 + w.x * 0.9 + w.y * 1.3);
        float foam = step(0.44, shore * (0.8 + 0.4 * lap) + (h21(floor(w * 16.0)) - 0.5) * 0.36) * step(0.02, shore);
        col = mix(col, light * 0.85, foam);
        alpha = max(alpha, foam * 0.92);
      }
    } else {
      // from below only a cone overhead shows the sky; beyond it the surface mirrors the water
      float tir = smoothstep(0.6, 0.72, 1.0 - abs(dir.y));
      col = mix(col, uWaterFog * 2.0, tir);
      alpha = mix(alpha, 1.0, tir);
    }
  } else {
    col += albedo * em * 3.0 * pulse;
  }
#else
  col += albedo * em * glow * 4.0 * pulse;
#endif

  gl_FragColor = vec4(applyFog(col, vWorld), alpha);
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
void main() {
  vUv = aUv.xy / 16.0; vLayer = aUv.z;
  // cross plants stay out of the shadow map: their lookup offset runs along the quad, so they would shadow themselves
  if ((int(aPos.w) & 7) == 6) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); return; }
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(aPos.xyz / 16.0, 1.0);
}
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
uniform float uUnderwater;
uniform vec3 uWaterFog;
${SKY_COMMON}
float hash3(vec3 p) { p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }
/** Rounded-square disc around direction c; lp receives the position inside it (-1..1 across the disc). */
float disc(vec3 d, vec3 c, float size, float soft, out vec2 lp) {
  lp = vec2(1e3);
  vec3 r = normalize(cross(c, vec3(0.0, 0.0, 1.0)));
  vec3 u = cross(r, c);
  float k = dot(d, c);
  if (k <= 0.0) return 0.0;
  lp = vec2(dot(d, r), dot(d, u)) / k / size;
  float m = pow(pow(abs(lp.x), 4.0) + pow(abs(lp.y), 4.0), 0.25);
  return 1.0 - smoothstep(1.0 - soft, 1.0, m);
}
void main() {
  vec3 d = normalize(vDir);
  vec3 col = skyBase(d);
  float above = smoothstep(-0.02, 0.08, d.y);
  float hz = smoothstep(-0.05, 0.0, d.y);   // the sun and moon set behind the horizon instead of fading in mid-air
  // stars: small blocky points fixed to the sphere that turns with the sun and moon
  if (uStars > 0.01) {
    float a = uStarSpin;
    vec3 s = vec3(d.x * cos(a) - d.y * sin(a), d.x * sin(a) + d.y * cos(a), d.z);
    vec3 cell = floor(s * 110.0);
    float h = hash3(cell);
    if (h > 0.992) {
      vec3 q = abs(s * 110.0 - cell - 0.5);
      float mag = pow(hash3(cell + 3.0), 6.0);
      float star = step(max(q.x, max(q.y, q.z)), 0.18 + 0.22 * mag) * (0.25 + 1.75 * mag) * (0.8 + 0.2 * sin(uTime * (1.0 + h * 3.0) + h * 90.0));
      col += mix(vec3(0.75, 0.85, 1.0), vec3(1.0, 0.9, 0.75), hash3(cell + 7.0)) * (star * uStars * above * 1.6);
    }
    // a faint band of unresolved stars
    col += vec3(0.5, 0.6, 1.0) * (0.012 * uStars * above * exp(-pow(dot(s, vec3(0.2995, 0.1997, 0.9330)) * 5.0, 2.0)));
  }
  if (uAurora.x + uAurora.y + uAurora.z > 0.0) {
    float band = sin(d.x * 6.0 + sin(d.z * 4.0 + uTime * 0.15) * 2.0 + uTime * 0.1) * 0.5 + 0.5;
    float curtain = smoothstep(0.15, 0.6, d.y) * smoothstep(0.95, 0.5, d.y) * pow(band, 3.0);
    col += uAurora * curtain * (0.6 + 0.4 * sin(d.z * 30.0 + uTime));
  }
  vec2 lp;
  float sun = disc(d, uSunDir, 0.055, 0.25, lp);
  col += uSunDisc * ((sun + 0.1 * exp(-dot(lp, lp) * 0.2)) * hz);
  vec3 md = -uSunDir;
  float moon = disc(d, md, 0.045, 0.12, lp);
  if (moon > 0.0) {
    vec3 off = normalize(md + normalize(cross(md, vec3(0.0, 0.0, 1.0))) * (uMoonPhase * 0.09));
    vec2 cp;
    float cut = disc(d, off, 0.045, 0.12, cp);
    // darker seas on a 10 x 10 pixel face
    float mare = step(0.5, hash3(vec3(floor(lp * 2.5 + 0.5), 9.0))) * step(0.3, hash3(vec3(floor(lp * 5.0), 4.0)));
    col += uMoonColor * (moon * (1.0 - cut * 0.92) * (1.0 - 0.24 * mare) * hz);
  }
  // under water everything below the cone overhead is murk, never the bright horizon
  if (uUnderwater > 0.5) col = mix(uWaterFog, col, smoothstep(0.1, 0.45, d.y));
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
// The cloud layer is a slab of 12-block cells in two heights. It is drawn as the inside of a box (exactly one
// fragment per view ray from below, inside or above) and each fragment walks the ray through the cells it crosses.
export const CLOUD_FRAG = /* glsl */ `
precision highp float;
in vec3 vWorld;
uniform float uTime;
uniform vec3 uLightDir;
uniform vec3 uCloudLit;
uniform vec3 uCloudDark;
uniform float uFogEnd;
${SKY_COMMON}
${CLOUD_COMMON}
void main() {
  vec3 ro = cameraPosition, rd = normalize(vWorld - ro);
  float y0 = uCloud.x, y1 = uCloud.x + uCloud.y;
  float iy = 1.0 / (abs(rd.y) < 1e-4 ? (rd.y < 0.0 ? -1e-4 : 1e-4) : rd.y);
  float ta = (y0 - ro.y) * iy, tb = (y1 - ro.y) * iy;
  float hl = max(length(rd.xz), 1e-4);
  float t = max(min(ta, tb), 0.0), tEnd = min(max(ta, tb), uFogEnd * 2.6 / hl);
  if (t >= tEnd) discard;
  bool skip = t <= 0.0;   // camera inside the slab: see out of the cloud it may be standing in
  vec2 dc = rd.xz / 12.0;
  dc = vec2(abs(dc.x) < 1e-6 ? 1e-6 : dc.x, abs(dc.y) < 1e-6 ? 1e-6 : dc.y);
  vec2 o = cloudCell(ro.xz), p = o + dc * t, cell = floor(p), stp = sign(dc), td = abs(1.0 / dc);
  vec2 tm = t + (cell + max(stp, 0.0) - p) / dc;
  vec3 nrm = vec3(0.0, rd.y > 0.0 ? -1.0 : 1.0, 0.0);
  float hit = -1.0, dens = 0.0;
  bool done = false;
  for (int i = 0; i < 14; i++) {
    float n = texelFetch(uCloudMap, ivec2(cell) & 255, 0).r, tn = min(tm.x, tm.y);
    if (n > uCover) {
      float top = y0 + uCloud.y * (n > uCover + 0.1 ? 1.0 : 0.55), ye = ro.y + rd.y * t;
      if (ye <= top + 0.01) { if (!skip) { hit = t; dens = n; break; } }
      else {
        // above a low cell: the ray may still come down onto its top before leaving it
        skip = false;
        float tt = (top - ro.y) * iy;
        if (rd.y < 0.0 && tt < min(tn, tEnd)) { hit = tt; dens = n; nrm = vec3(0.0, 1.0, 0.0); break; }
      }
    } else skip = false;
    if (tn >= tEnd) { done = true; break; }
    if (tm.x < tm.y) { cell.x += stp.x; tm.x += td.x; nrm = vec3(-stp.x, 0.0, 0.0); }
    else { cell.y += stp.y; tm.y += td.y; nrm = vec3(0.0, 0.0, -stp.y); }
    t = tn;
  }
  if (hit < 0.0 && !done) {
    // step budget spent (grazing rays near the layer's own altitude): fall back to the flat cover at the exit point
    float n = texelFetch(uCloudMap, ivec2(floor(o + dc * tEnd)) & 255, 0).r;
    if (n > uCover) { hit = tEnd; dens = n; nrm = vec3(0.0, rd.y > 0.0 ? -1.0 : 1.0, 0.0); }
  }
  if (hit < 0.0) discard;
  float hf = clamp((ro.y + rd.y * hit - y0) / uCloud.y, 0.0, 1.0);
  vec3 col;
  if (nrm.y > 0.5) col = mix(uCloudDark, uCloudLit, 0.82 + 0.18 * step(0.9, hf));
  // undersides shade smoothly from pale rims to a heavier middle (filtered cover, so no per-cell checkering)
  else if (nrm.y < -0.5) col = mix(uCloudLit, uCloudDark, 0.3 + 0.6 * smoothstep(uCover - 0.03, uCover + 0.2, texture(uCloudMap, (o + dc * hit) / 256.0).r));
  else col = mix(uCloudDark, uCloudLit, clamp(0.5 + 0.42 * dot(nrm, uLightDir), 0.0, 1.0)) * (0.86 + 0.14 * hf);
  col += uGlowColor * (pow(max(dot(rd, uSunDir), 0.0), 8.0) * 0.3);
  float fog = smoothstep(uFogEnd * 0.9, uFogEnd * 2.6, hit * hl);
  col = mix(col, skyBase(normalize(vec3(rd.x, abs(rd.y) * 0.5 + 0.02, rd.z))), fog);
  gl_FragColor = vec4(col, 1.0 - fog);   // opaque up close, or stars and the sun disc would show through
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
uniform float uSat;
uniform vec3 uTint;
uniform float uFlash;
uniform float uUnder;
uniform float uTime;
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  // a slow refraction wobble while the camera is under water
  vec2 uv = vUv + uUnder * 0.0025 * vec2(sin(vUv.y * 40.0 + uTime * 2.0), cos(vUv.x * 36.0 + uTime * 1.7));
  vec3 c = texture(tScene, uv).rgb;
  c += texture(tBloom, uv).rgb * uBloom;
  c *= uExposure * uTint;
  if (uTonemap > 0.5) {
    // part per-channel curve, part luminance-only, so a saturated dusk horizon and emissives keep their hue
    float L = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = mix(aces(c), clamp(c * (aces(vec3(L)).r / max(L, 1e-4)), 0.0, 1.0), 0.35);
  } else c = clamp(c, 0.0, 1.0);
  c = pow(c, vec3(1.0 / 2.2));
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l), c, uSat);
  vec2 q = vUv - 0.5;
  c *= 1.0 - (uVignette + uUnder * 0.15) * smoothstep(0.35, 0.95, dot(q, q) * 2.2);
  c = mix(c, vec3(1.0, 0.15, 0.1), uFlash);
  // triangular dither: dark sky gradients span only a handful of 8-bit codes
  c += (hash(gl_FragCoord.xy) + hash(gl_FragCoord.xy + 31.7) - 1.0) / 255.0;
#ifdef LUMA_OUT
  gl_FragColor = vec4(c, dot(clamp(c, 0.0, 1.0), vec3(0.299, 0.587, 0.114)));
#else
  gl_FragColor = vec4(c, 1.0);
#endif
}
`;
// Edge anti-aliasing on the tone-mapped image (luma in alpha): blends along the local luma gradient, and only
// where the contrast is high enough to be a silhouette, so texel detail inside a face is left alone.
export const FXAA_FRAG = /* glsl */ `
precision highp float;
in vec2 vUv;
uniform sampler2D tSrc;
uniform vec2 uTexel;
void main() {
  vec4 m = texture(tSrc, vUv);
  float nw = texture(tSrc, vUv + uTexel * vec2(-1.0, -1.0)).a, ne = texture(tSrc, vUv + uTexel * vec2(1.0, -1.0)).a;
  float sw = texture(tSrc, vUv + uTexel * vec2(-1.0, 1.0)).a, se = texture(tSrc, vUv + uTexel * vec2(1.0, 1.0)).a;
  float lo = min(m.a, min(min(nw, ne), min(sw, se))), hi = max(m.a, max(max(nw, ne), max(sw, se)));
  if (hi - lo < max(0.05, hi * 0.125)) { gl_FragColor = vec4(m.rgb, 1.0); return; }
  vec2 dir = vec2((sw + se) - (nw + ne), (nw + sw) - (ne + se));
  float rcp = 1.0 / (min(abs(dir.x), abs(dir.y)) + max((nw + ne + sw + se) * 0.03125, 0.0078125));
  dir = clamp(dir * rcp, -8.0, 8.0) * uTexel;
  vec4 a = 0.5 * (texture(tSrc, vUv - dir * (1.0 / 6.0)) + texture(tSrc, vUv + dir * (1.0 / 6.0)));
  vec4 b = a * 0.5 + 0.25 * (texture(tSrc, vUv - dir * 0.5) + texture(tSrc, vUv + dir * 0.5));
  gl_FragColor = vec4(b.a < lo || b.a > hi ? a.rgb : b.rgb, 1.0);
}
`;
