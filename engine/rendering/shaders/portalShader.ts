
export const PORTAL_VERTEX_SHADER = `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vPos; // Local position
  varying vec3 vNormal; 

  void main() {
    vUv = uv;
    vPos = position; 
    vNormal = normal;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    // REVERTED: No breathing on tunnel.
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

export const PORTAL_FRAGMENT_SHADER = `
  uniform float uTime;
  // uniform float uTunnelDepth; // Decoupled from geometry
  
  varying vec2 vUv;
  varying vec3 vPos;
  varying vec3 vNormal;

  vec3 hsl2rgb(vec3 c) {
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
  }

  void main() {
    float dist = 0.0;
    
    // Detect Back Face (Normal.z is approx 1.0 or -1.0)
    // When looking at the inside of the back face, the normal points parallel to Z.
    // Side walls have normal.z ~ 0.
    float isBack = step(0.9, abs(vNormal.z)); 

    if (isBack > 0.5) {
        // --- BACK WALL EFFECT ---
        // Concentric Squares moving towards center
        float dCenter = max(abs(vUv.x - 0.5), abs(vUv.y - 0.5)); // 0.5 at edge, 0.0 at center
        
        // Map distance to visually continue the tunnel
        // Edge (0.5) matches tunnel depth. Center (0.0) matches infinity/far.
        
        // FIXED VISUAL DEPTH: 65.0
        float visualDepth = 65.0;
        dist = visualDepth + (0.5 - dCenter) * visualDepth * 4.0; 
        
        // Continuous Rainbow Cycle (No black gaps)
        // Speed factor 2.0. Scale factor 0.05 determines stripe density.
        float hue = (dist * 0.05) - (uTime * 2.0);
        
        vec3 color = hsl2rgb(vec3(fract(hue), 1.0, 0.6)); 
        gl_FragColor = vec4(color, 0.8);
    } else {
        // This part should technically be covered by normal material, 
        // but if shader is applied to sides, make it transparent or black
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    }
  }
`;
