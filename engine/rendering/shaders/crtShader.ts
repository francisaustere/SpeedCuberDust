
export const CRT_VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const CRT_FRAGMENT_SHADER = `
  uniform sampler2D tDiffuse;
  uniform float uTime;
  
  // Grain Config
  uniform float uGrainStrength;
  
  // Exit Fog Uniforms (Screen Space Hole)
  uniform vec2 uExitFogCenter; 
  uniform float uExitFogRadius; 
  uniform float uExitFogStrength; 
  uniform float uAspect; 

  varying vec2 vUv;

  vec2 curve(vec2 uv) {
    uv = (uv - 0.5) * 2.0;
    uv *= 1.1;	
    uv.x *= 1.0 + pow((abs(uv.y) / 5.0), 2.0);
    uv.y *= 1.0 + pow((abs(uv.x) / 4.0), 2.0);
    uv  = (uv / 2.0) + 0.5;
    uv =  uv *0.92 + 0.04;
    return uv;
  }
  
  // High Frequency Noise
  float rand(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec2 q = vUv;
    vec2 uv = curve(q);

    // CRT Vignette/Bezel (Black outside)
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }
    
    vec3 col = texture2D(tDiffuse, uv).rgb;
    
    // CRT Vignette (Inside)
    float vig = (0.0 + 1.0 * 16.0 * uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y));
    col *= vec3(pow(vig, 0.12));
    
    // --- FILM GRAIN (FORCED BROKEN) ---
    // We multiply by a massive number to force Floating Point Precision Loss immediately.
    // This causes the rand() function to fail (returning 0.0 or fixed patterns) on all devices,
    // recreating the "Darkening / High Contrast" effect instantly.
    if (uGrainStrength > 0.0) {
        float noise = rand(uv * (uTime + 100.0) * 100000.0); 
        col += (noise - 0.5) * uGrainStrength;
    }
    
    // --- EXIT FOG LOGIC ---
    if (uExitFogStrength > 0.001) {
        vec2 distVec = vec2((uv.x - uExitFogCenter.x) * uAspect, uv.y - uExitFogCenter.y);
        float dist = length(distVec);
        float visibility = 1.0 - smoothstep(uExitFogRadius, uExitFogRadius + 0.05, dist);
        col = mix(col, vec3(0.0), uExitFogStrength * (1.0 - visibility));
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;
