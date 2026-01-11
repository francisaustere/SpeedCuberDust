
export const GRID_VERTEX_SHADER = `
  uniform float uTime;
  uniform float uBreathMag; // 0.0 or 1.0
  
  varying vec2 vWorldPos;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 pos = position;
    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    
    // Subtle Z breathing to keep 3D feel alive
    // Multiplied by uBreathMag (0 if disabled)
    float breath = sin(worldPosition.x * 0.005 + worldPosition.y * 0.005 + uTime * 0.5);
    worldPosition.z += breath * 5.0 * uBreathMag; 
    
    vWorldPos = worldPosition.xy;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

export const GRID_FRAGMENT_SHADER = `
  uniform float uTime;
  
  // DYNAMIC GRADIENT
  uniform vec3 uGradientColors[5];
  uniform int uGradientCount;
  uniform vec2 uResolution;
  
  uniform vec3 uLineColor; // Lines
  
  uniform float uGridSize;
  uniform float uThickness;
  uniform vec3 uGoalConfig; // x, y, size
  
  // Grid / Undulation Uniforms
  uniform float uGridFreq;
  uniform float uGridAmp;
  uniform float uGridSpeed;
  uniform float uGridOffset; 
  uniform float uGridRigid;  
  uniform float uTransparent; 
  
  // Fade Logic
  uniform float uFadeY; // Lowest platform Y coordinate (World Space)
  
  // Exit Fog
  uniform vec2 uExitFogCenter;
  uniform float uExitFogRadius;
  uniform float uExitFogStrength;

  varying vec2 vWorldPos;
  varying vec2 vUv;

  vec3 getGradientColor(float t) {
      if (uGradientCount <= 0) return vec3(0.0);
      if (uGradientCount == 1) return uGradientColors[0];
      
      float step = 1.0 / float(uGradientCount - 1);
      float idx = floor(t / step);
      int i = int(idx);
      
      // Clamp index
      if (i < 0) i = 0;
      if (i >= uGradientCount - 1) return uGradientColors[uGradientCount - 1];
      
      float localT = (t - idx * step) / step;
      return mix(uGradientColors[i], uGradientColors[i+1], localT);
  }

  void main() {
    // Check for Goal Cell Transparency
    float gx = uGoalConfig.x;
    float gy = uGoalConfig.y;
    float halfSize = uGoalConfig.z * 0.5 - 1.0; 
    
    if (vWorldPos.x > gx - halfSize && vWorldPos.x < gx + halfSize &&
        vWorldPos.y > gy - halfSize && vWorldPos.y < gy + halfSize) {
        discard;
    }

    // 0. Grid Distortion
    vec2 distortedPos = vWorldPos;
    float waveX = 0.0;
    float waveY = 0.0;

    if (uGridRigid > 0.5) {
        waveX = sin(vWorldPos.x * uGridFreq + uTime * uGridSpeed + uGridOffset * 1000.0) * uGridAmp;
        waveY = sin(vWorldPos.y * uGridFreq + uTime * uGridSpeed + uGridOffset * 1000.0) * uGridAmp;
    } else {
        waveX = sin((vWorldPos.y * uGridFreq) + (vWorldPos.x * uGridOffset) + uTime * uGridSpeed) * uGridAmp;
        waveY = sin((vWorldPos.x * uGridFreq) + (vWorldPos.y * uGridOffset) + uTime * (uGridSpeed * 1.25)) * uGridAmp;
    }
    
    distortedPos.x += waveX;
    distortedPos.y += waveY;

    // 1. Grid Lines Calculation
    vec2 gridUV = distortedPos / uGridSize;
    vec2 gridDist = abs(fract(gridUV - 0.5) - 0.5) * uGridSize; 
    float lineX = smoothstep(uThickness, uThickness - 1.0, gridDist.x);
    float lineY = smoothstep(uThickness, uThickness - 1.0, gridDist.y);
    float gridLine = max(lineX, lineY);
    
    // 2. Base Pulse Animation
    float pulse = 0.8 + sin(uTime * 1.5) * 0.2;
    
    // 3. Y-Fade Logic
    float heightMask = smoothstep(uFadeY, uFadeY + 500.0, vWorldPos.y);
    gridLine *= heightMask;
    
    vec3 effectiveLineColor = uLineColor * pulse;
    
    // 4. Output Logic
    if (uTransparent > 0.5) {
        gl_FragColor = vec4(effectiveLineColor, gridLine);
    } else {
        // Gradient Background (Screen Space Vertical)
        vec3 baseColor = getGradientColor(gl_FragCoord.y / uResolution.y);
        
        // Mix to Base Gradient
        vec3 finalColor = mix(baseColor, effectiveLineColor, gridLine);
        gl_FragColor = vec4(finalColor, 1.0);
    }
  }
`;
