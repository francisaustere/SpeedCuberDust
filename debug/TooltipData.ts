export interface TooltipEntry {
    desc: string;
    trigger?: string;
    values?: string;
}

export const TOOLTIPS: Record<string, TooltipEntry> = {
    // --- ENGINE ---
    "TIME SCALE": {
        desc: "Global multiplier for game time delta.",
        trigger: "Affects physics steps and visual updates immediately.",
        values: "1.0: Normal speed.\n0.5: Slow motion (Matrix style).\n2.0: Fast forward."
    },

    // --- MOVEMENT ---
    "GRAVITY": {
        desc: "Constant downward acceleration applied to the player.",
        trigger: "Applied every frame while airborne.",
        values: "Low (<0.5): Moon gravity, floaty jumps.\nHigh (>1.0): Heavy feel, fast falling, requires higher jump force."
    },
    "JUMP FORCE": {
        desc: "Instant upward velocity applied when jumping.",
        trigger: "On Jump button press when grounded (or coyote time).",
        values: "High Negative (e.g. -20): Higher jump.\nCloser to 0 (e.g. -10): Short hop."
    },
    "DOUBLE JUMP": {
        desc: "Instant upward velocity for the second jump.",
        trigger: "On Jump button press while airborne (if jump count available).",
        values: "Usually slightly lower than Jump Force to feel controlled."
    },
    "MAX SPEED": {
        desc: "Horizontal velocity cap.",
        trigger: "Clamps speed every frame.",
        values: "Low: Slow precision platforming.\nHigh: Sonic-style speed."
    },
    "DIVING FORCE": {
        desc: "Extra downward gravity when holding DOWN key in air.",
        trigger: "While airborne and holding DOWN.",
        values: "High: Fast dive/ground pound."
    },
    "BOUNCE RESTITUTION Y": {
        desc: "Vertical bounciness factor on Bouncy Blocks.",
        trigger: "Landing on Bouncy Block.",
        values: "1.0: Bounce back at same speed.\n>1.0: Gain height.\n<1.0: Lose height."
    },
    "BOUNCE RESTITUTION X": {
        desc: "Horizontal bounciness factor on Bouncy Blocks.",
        trigger: "Hitting side of Bouncy Block.",
        values: "1.0: Reflect at same speed.\n>1.0: Speed Boost.\n<1.0: Lose speed."
    },
    "BOUNCY MIN SPEED": {
        desc: "Minimum vertical speed for a bounce. Ensures satisfying hops.",
        trigger: "Landing on Bouncy Block with low velocity.",
        values: "Should be close to Jump Force magnitude (e.g. 15-20)."
    },
    "DEFLECT FORCE": {
        desc: "Velocity multiplier applied to projectiles when deflected by the player.",
        trigger: "Deflection event (Spinning player hitting bullet).",
        values: "1.0: No speed change.\n>1.0: Accelerates projectile back at enemy."
    },
    "ACCEL GROUND": {
        desc: "How quickly player reaches max speed on floor.",
        trigger: "Input held while grounded.",
        values: "High: Instant snapping to max speed.\nLow: Ice-like buildup."
    },
    "ACCEL AIR": {
        desc: "Air control authority.",
        trigger: "Input held while airborne.",
        values: "High: Full control in air.\nLow: Momentum-based, hard to change direction mid-air."
    },
    "FRICTION": {
        desc: "Deceleration when no input is pressed on ground.",
        trigger: "Grounded, no horizontal input.",
        values: "1.0: No friction (Slide forever).\n0.5: Fast stop.\nLower is stronger friction."
    },
    "AIR FRICTION": {
        desc: "Air resistance.",
        trigger: "Airborne.",
        values: "1.0: No drag.\n0.9: Thick air, slows down horizontal jumps."
    },
    "MAX FALL VEL": {
        desc: "Terminal velocity for falling.",
        trigger: "Clamps positive Y velocity.",
        values: "High: Realistic unrestricted fall.\nLow: Float/Parachute effect."
    },

    // --- WALLS ---
    "SLIDE SPEED": {
        desc: "Max downward speed while sliding on a wall.",
        trigger: "On wall, falling, holding towards wall.",
        values: "Low: Sticky walls.\nHigh: Slippery walls."
    },
    "WALL JUMP X": {
        desc: "Horizontal force pushing away from wall.",
        trigger: "Jump input while on wall.",
        values: "High: Pushes you far into the room."
    },
    "WALL JUMP Y": {
        desc: "Vertical force going up during wall jump.",
        trigger: "Jump input while on wall.",
        values: "Usually similar to normal Jump Force."
    },
    "WALL GRACE": {
        desc: "Frames after wall jump where you can't control horizontal movement.",
        trigger: "Post wall-jump.",
        values: "High: Committed jump arc (Classic).\n0: Full air control immediately."
    },
    
    // --- CEILING ---
    "CEILING SPEED": {
        desc: "Max movement speed while crawling on the ceiling.",
        trigger: "Hanging on ceiling with directional input.",
        values: "Low: Sticky climb.\nHigh: Fast traversal."
    },
    "CEILING ACCEL": {
        desc: "Acceleration while hanging on ceiling.",
        trigger: "Hanging on ceiling with directional input.",
        values: "High: Snappy control."
    },

    // --- ROTATION ---
    "ACCELERATING SPIN": {
        desc: "If enabled, spin speed builds up over time. If disabled, spin is constant.",
        trigger: "While jumping/falling."
    },
    "MAX SPIN": {
        desc: "Maximum angular velocity for visual rotation.",
        trigger: "Clamps rotation speed.",
        values: "High: Blur/Helicopter effect.\nLow: Slow tumble."
    },
    "SPIN ACCEL": {
        desc: "How fast rotation reaches max speed.",
        trigger: "Every frame in air.",
        values: "High: Instant spin start."
    },
    "Land Rot Lerp": {
        desc: "Smoothing factor for aligning rotation to 0 when landing.",
        trigger: "On landing (Grounded = true).",
        values: "0.0: No correction (stay tilted).\n0.1: Slow smooth correction.\n1.0: Instant snap to flat."
    },
    "SPIN ARC MODE": {
        desc: "Alters gravity or lift based on spin speed to create loftier arcs.",
        trigger: "Airborne state.",
        values: "Disabled: Standard gravity.\nLow Gravity: Reduces gravity constant.\nLift Force: Adds upward force (propeller).\nApex Hang: Reduces gravity only at top of jump."
    },
    "SPIN ARC STRENGTH": {
        desc: "Intensity of the spin arc effect.",
        trigger: "Airborne state with Spin Mode enabled.",
        values: "Higher values = More float/lift/hang."
    },
    "SPIN ARC DECAY": {
        desc: "How quickly the spin effect loses power over time while in air.",
        trigger: "Every frame while spin effect is active.",
        values: "0: Infinite duration.\n0.5: Loses 50% power per second.\n2.0: Rapidly fades out."
    },

    // --- DEFORMATION ---
    "Stiffness": {
        desc: "Spring stiffness for squash/stretch. Hooke's Law constant.",
        trigger: "Every frame visual update.",
        values: "High: Rigid, vibrates fast.\nLow: Jelly-like, slow wobbles."
    },
    "Damping": {
        desc: "Resistance to spring motion.",
        trigger: "Every frame visual update.",
        values: "High: Shape settles quickly (Clay).\nLow: Oscillates for a long time (Jello)."
    },
    "Max Scale": {
        desc: "Absolute limit for scaling on any axis.",
        trigger: "Clamping visual scale.",
        values: "Prevents graphical glitches if physics go wild."
    },
    "Run Stretch (X)": {
        desc: "Horizontal stretch based on speed.",
        trigger: "Running on ground.",
        values: "Positive: Elongates like a cheetah.\n0: Rigid cube."
    },
    "Fall Stretch (Y)": {
        desc: "Vertical stretch based on fall speed.",
        trigger: "Falling downward.",
        values: "High: Cartoon 'drop' effect."
    },
    "Morph Speed (Lerp)": {
        desc: "How fast the target shape changes between states (e.g., Run -> Jump).",
        trigger: "State change.",
        values: "1.0: Instant target change.\n0.1: Smooth morphing between poses."
    },
    "Snap Speed": {
        desc: "How fast rotation aligns to the nearest 90 degrees in air.",
        trigger: "When angular velocity is low.",
        values: "High: Magnetic snap.\nLow: Subtle drift."
    },
    "Jump Squash X": {
        desc: "Horizontal compression when jumping.",
        trigger: "Jump start.",
        values: "<1.0: Thinning out (Streamline).\n>1.0: Widening."
    },
    "Jump Squash Y": {
        desc: "Vertical expansion when jumping.",
        trigger: "Jump start.",
        values: ">1.0: Stretch up towards jump direction."
    },
    "Squash Y (Impact)": {
        desc: "Vertical compression multiplier on landing impact.",
        trigger: "Landing.",
        values: "Higher = More pancake effect on landing."
    },

    // --- GRID & VISUALS ---
    "FREQ": {
        desc: "Frequency of the grid noise undulation.",
        trigger: "Vertex shader.",
        values: "High: Dense ripples."
    },
    "AMP": {
        desc: "Amplitude of grid waves.",
        trigger: "Vertex shader.",
        values: "High: Large hills/valleys."
    },
    "SPEED": {
        desc: "Animation speed of grid waves.",
        trigger: "Vertex shader time uniform.",
        values: "High: Stormy sea."
    },
    "BLOOM STRENGTH": {
        desc: "Intensity of the glow effect.",
        trigger: "Post-processing.",
        values: "High: Neon overload."
    },
    
    // --- CAMERA ---
    "LERP FACTOR": {
        desc: "Camera smoothing speed.",
        trigger: "Every frame camera update.",
        values: "0.1: Smooth follow.\n1.0: Locked to player (No lag)."
    },
    "ZOOM (Z)": {
        desc: "Distance of camera from the plane.",
        trigger: "Camera transform.",
        values: "High: Zoom out (See more).\nLow: Zoom in."
    }
};