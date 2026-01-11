import { Level } from '../types';
export const HOME_LEVEL: Level = {
  "id": -999,
  "type": "DEV",
  "name": "HOME",
  "width": 1000,
  "height": 800,
  "start": {
    "x": 0,
    "y": 0
  },
  "goal": {
    "x": 0,
    "y": 0,
    "w": 0,
    "h": 0
  },
  "platforms": []
};
export const LEVELS: Level[] = [
  {
    "id": 9999,
    "type": "DEV",
    "region": "Drafts",
    "name": "Sandbox",
    "width": 2000,
    "height": 1000,
    "start": {
      "x": 1050,
      "y": 800
    },
    "goal": {
      "x": 1740,
      "y": 530,
      "w": 60,
      "h": 60
    },
    "platforms": [
      {
        "id": 1765752107959.2363,
        "x": -50,
        "y": 920,
        "w": 1940,
        "h": 50,
        "pivot": {
          "x": 0,
          "y": 0
        },
        "rotation": 0
      },
      {
        "id": 1765752107959.4978,
        "x": 450,
        "y": 870,
        "w": 40,
        "h": 40,
        "pivot": {
          "x": 0,
          "y": 0
        },
        "rotation": 0
      },
      {
        "id": 1765752107959.6606,
        "x": 1180,
        "y": 870,
        "w": 120,
        "h": 20,
        "pivot": {
          "x": 0,
          "y": 0
        },
        "rotation": 0
      },
      {
        "id": 1765752107959.3792,
        "x": 950,
        "y": 180,
        "w": 180,
        "h": 180,
        "type": "cube",
        "rotation": 0
      },
      {
        "id": 1765752107959.4656,
        "x": 630,
        "y": 210,
        "w": 120,
        "h": 120,
        "type": "cube",
        "rotation": 0
      },
      {
        "id": 1765752107959.4312,
        "x": 560,
        "y": 550,
        "w": 40,
        "h": 40,
        "type": "cube",
        "rotation": 0
      },
      {
        "id": 1765752107959.2263,
        "x": 400,
        "y": 380,
        "w": 40,
        "h": 40,
        "type": "cube",
        "rotation": 0
      },
      {
        "id": 1765752107960.828,
        "x": 1290,
        "y": 320,
        "w": 120,
        "h": 120,
        "type": "cube",
        "rotation": 0
      },
      {
        "id": 1765752107960.4219,
        "x": 760,
        "y": 370,
        "w": 30,
        "h": 530,
        "type": "wall",
        "rotation": 0
      },
      {
        "id": 1765752107960.2969,
        "x": 160,
        "y": 590,
        "w": 120,
        "h": 120,
        "type": "cube",
        "rotation": 0
      }
    ],
    "enemies": []
  },
  {
    "id": 1,
    "type": "PROD",
    "region": "Tutorial",
    "name": "Welcome",
    "width": 1000,
    "height": 600,
    "targetTime": 5,
    "start": {
      "x": 640,
      "y": 680
    },
    "goal": {
      "x": 890,
      "y": 670,
      "w": 60,
      "h": 60
    },
    "platforms": [
      {
        "id": 2,
        "x": 840,
        "y": 480,
        "w": 120,
        "h": 110,
        "type": "floor",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 3,
        "x": 600,
        "y": 720,
        "w": 360,
        "h": 40,
        "type": "floor",
        "pivot": {
          "x": 0,
          "y": 0
        }
      }
    ]
  },
  {
    "id": 2,
    "type": "PROD",
    "region": "Tutorial",
    "name": "Jump",
    "width": 1000,
    "height": 800,
    "targetTime": 20,
    "start": {
      "x": 820,
      "y": 330
    },
    "goal": {
      "x": 1310,
      "y": 250,
      "w": 60,
      "h": 60
    },
    "platforms": [
      {
        "id": 1,
        "x": 930,
        "y": 400,
        "w": 510,
        "h": 30,
        "type": "floor",
        "rotation": 0,
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 5,
        "x": 1110,
        "y": 370,
        "w": 330,
        "h": 60,
        "type": "floor",
        "rotation": 0,
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 6,
        "x": 750,
        "y": 370,
        "w": 180,
        "h": 60,
        "type": "floor",
        "pivot": {
          "x": 0,
          "y": 0
        }
      }
    ]
  },
  {
    "id": 3,
    "type": "PROD",
    "region": "Tutorial",
    "name": "Long Jump",
    "width": 1200,
    "height": 600,
    "targetTime": 6,
    "start": {
      "x": 190,
      "y": 520
    },
    "goal": {
      "x": 930,
      "y": 430,
      "w": 60,
      "h": 60
    },
    "platforms": [
      {
        "id": 12,
        "x": 300,
        "y": 590,
        "w": 780,
        "h": 40,
        "type": "floor",
        "rotation": 0,
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 13,
        "x": 120,
        "y": 560,
        "w": 180,
        "h": 70,
        "type": "floor",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 14,
        "x": 740,
        "y": 560,
        "w": 140,
        "h": 70,
        "type": "floor",
        "rotation": 0,
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 16,
        "x": 880,
        "y": 490,
        "w": 200,
        "h": 140,
        "type": "platform",
        "pivot": {
          "x": 0,
          "y": 0
        }
      }
    ]
  },
  {
    "id": 4,
    "type": "PROD",
    "region": "Tutorial",
    "name": "Double Jump",
    "width": 1000,
    "height": 800,
    "targetTime": 8,
    "start": {
      "x": 350,
      "y": 700
    },
    "goal": {
      "x": 1180,
      "y": 540,
      "w": 60,
      "h": 60
    },
    "platforms": [
      {
        "id": 3,
        "x": 280,
        "y": 740,
        "w": 330,
        "h": 50,
        "type": "floor",
        "rotation": 0,
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 6,
        "x": 610.5,
        "y": 540,
        "w": 20,
        "h": 250,
        "type": "wall",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 7,
        "x": 631,
        "y": 740,
        "w": 189,
        "h": 50,
        "type": "floor",
        "rotation": 0,
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 8,
        "x": 820,
        "y": 760,
        "w": 380,
        "h": 30,
        "type": "floor",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 9,
        "x": 1200.5,
        "y": 690,
        "w": 119.5,
        "h": 100,
        "type": "floor",
        "rotation": 0,
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 10,
        "x": 631,
        "y": 639.5,
        "w": 119.5,
        "h": 100,
        "type": "floor",
        "rotation": 0,
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 11,
        "x": 1320.5,
        "y": 480,
        "w": 20,
        "h": 310,
        "type": "wall",
        "pivot": {
          "x": 0,
          "y": 0
        }
      }
    ]
  },
  {
    "id": 5,
    "type": "PROD",
    "region": "Tutorial",
    "name": "Wall Slide",
    "width": 1000,
    "height": 800,
    "targetTime": 12,
    "start": {
      "x": 440,
      "y": 510
    },
    "goal": {
      "x": 400,
      "y": 100,
      "w": 60,
      "h": 60
    },
    "platforms": [
      {
        "id": 15,
        "x": 370,
        "y": 560,
        "w": 180,
        "h": 40,
        "rotation": 0,
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 24,
        "x": 350,
        "y": 240,
        "w": 20,
        "h": 360,
        "type": "wall",
        "pivot": {
          "x": 0,
          "y": 0
        }
      }
    ]
  },
  {
    "id": 6,
    "type": "PROD",
    "region": "Beginner",
    "name": "First Steps I",
    "width": 1000,
    "height": 800,
    "targetTime": 20,
    "start": {
      "x": 130,
      "y": 200
    },
    "goal": {
      "x": 190,
      "y": 700,
      "w": 60,
      "h": 60
    },
    "platforms": [
      {
        "id": 1767635812604.122,
        "x": -560,
        "y": 640,
        "w": 1380,
        "h": 170,
        "type": "cube",
        "rotation": 0,
        "layer": 2
      },
      {
        "id": 1767656370407.0752,
        "x": 0,
        "y": 250,
        "w": 370,
        "h": 210,
        "type": "cube",
        "rotation": 0,
        "layer": 2
      }
    ],
    "enemies": [
      {
        "id": 1767656391762.4,
        "x": 500,
        "y": 580,
        "w": 40,
        "h": 40,
        "type": "jumper",
        "rotation": 0
      }
    ]
  },
  {
    "id": 11,
    "type": "PROD",
    "region": "Beginner",
    "name": "Ascension",
    "width": 800,
    "height": 1000,
    "targetTime": 12,
    "start": {
      "x": 270,
      "y": -70
    },
    "goal": {
      "x": 260,
      "y": 50,
      "w": 60,
      "h": 60
    },
    "platforms": [
      {
        "id": 1767644290158.8066,
        "x": 140,
        "y": -20,
        "w": 240,
        "h": 170,
        "type": "cube",
        "rotation": 0,
        "layer": 2
      },
      {
        "id": 1767644290158.3826,
        "x": 430,
        "y": -210,
        "w": 240,
        "h": 170,
        "type": "cube",
        "rotation": 0,
        "layer": 2
      },
      {
        "id": 1767644290158.1777,
        "x": 90,
        "y": -360,
        "w": 240,
        "h": 170,
        "type": "cube",
        "rotation": 0,
        "layer": 2
      }
    ],
    "enemies": [
      {
        "id": 1767644290159.0698,
        "x": 200,
        "y": -410,
        "w": 40,
        "h": 40,
        "type": "jumper",
        "rotation": 0
      }
    ]
  },
  {
    "id": 7,
    "type": "PROD",
    "region": "Beginner",
    "name": "First Steps II",
    "width": 1000,
    "height": 600,
    "targetTime": 5,
    "start": {
      "x": 90,
      "y": 500
    },
    "goal": {
      "x": 300,
      "y": -290,
      "w": 60,
      "h": 60
    },
    "platforms": [
      {
        "id": 1,
        "x": 20,
        "y": 540,
        "w": 180,
        "h": 50,
        "type": "floor",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 2,
        "x": 440,
        "y": 540,
        "w": 300,
        "h": 50,
        "type": "floor",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 3,
        "x": 740,
        "y": 0,
        "w": 20,
        "h": 590,
        "type": "wall",
        "rotation": 0,
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 4,
        "x": 140,
        "y": 260,
        "w": 400,
        "h": 20,
        "type": "platform",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 5,
        "x": 700,
        "y": 410,
        "w": 40,
        "h": 40,
        "type": "cube",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 6,
        "x": 140,
        "y": 0,
        "w": 520,
        "h": 20,
        "type": "platform",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 7,
        "x": 520,
        "y": -280,
        "w": 540,
        "h": 180,
        "type": "cube",
        "rotation": 1.1780972450961724,
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 8,
        "x": 200.5,
        "y": 560,
        "w": 240,
        "h": 30,
        "type": "floor",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 9,
        "x": 20,
        "y": 14.175717592590985,
        "w": 120,
        "h": 20,
        "type": "moving",
        "pivot": {
          "x": 0,
          "y": 0
        },
        "moving": {
          "start": {
            "x": 20,
            "y": 260
          },
          "end": {
            "x": 20,
            "y": 0
          },
          "duration": 2
        }
      },
      {
        "id": 10,
        "x": 249.91291940488634,
        "y": -121.04487141061651,
        "w": 120,
        "h": 120,
        "type": "cube",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 11,
        "x": 140,
        "y": -510,
        "w": 272.11071342395803,
        "h": 90.70357114131934,
        "type": "floor",
        "pivot": {
          "x": 0,
          "y": 0
        }
      }
    ]
  },
  {
    "id": 8,
    "type": "PROD",
    "region": "Beginner",
    "name": "New Level 16",
    "width": 1000,
    "height": 800,
    "targetTime": 20,
    "start": {
      "x": 100,
      "y": 500
    },
    "goal": {
      "x": 810,
      "y": -250,
      "w": 60,
      "h": 60
    },
    "platforms": [
      {
        "id": 1,
        "x": 30,
        "y": 550,
        "w": 180,
        "h": 50,
        "type": "floor",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 2,
        "x": 210.5,
        "y": 570,
        "w": 479.5,
        "h": 30,
        "type": "floor",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 3,
        "x": 640,
        "y": 540,
        "w": 50,
        "h": 60,
        "type": "floor",
        "pivot": {
          "x": -2.395092234176758,
          "y": 0.9623607062933388
        }
      },
      {
        "id": 4,
        "x": 397.97925928566576,
        "y": 450,
        "w": 40,
        "h": 40,
        "type": "cube",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 5,
        "x": 690,
        "y": 470,
        "w": 180,
        "h": 130,
        "type": "floor",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 6,
        "x": 870.5,
        "y": 519.5,
        "w": 209.5,
        "h": 80.5,
        "type": "floor",
        "rotation": 0,
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 11,
        "x": 960,
        "y": 380,
        "w": 120,
        "h": 40,
        "type": "cube",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 12,
        "x": 1080.5,
        "y": 240,
        "w": 120,
        "h": 360,
        "type": "cube",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 13,
        "x": 292.68249999999097,
        "y": 220,
        "w": 120,
        "h": 20,
        "type": "moving",
        "pivot": {
          "x": 0,
          "y": 0
        },
        "moving": {
          "start": {
            "x": 290,
            "y": 220
          },
          "end": {
            "x": 660,
            "y": 220
          },
          "duration": 2
        }
      },
      {
        "id": 15,
        "x": 60,
        "y": -230,
        "w": 20,
        "h": 400.11533771454805,
        "type": "wall",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 17,
        "x": 370,
        "y": -110,
        "w": 120,
        "h": 120,
        "type": "cube",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 18,
        "x": 720,
        "y": -120,
        "w": 239.5,
        "h": 50,
        "type": "platform",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 20,
        "x": 760,
        "y": -350,
        "w": 272.11071342395803,
        "h": 90.70357114131934,
        "type": "floor",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 21,
        "x": 60,
        "y": 170.61533771454805,
        "w": 190,
        "h": 40,
        "type": "cube",
        "pivot": {
          "x": 0,
          "y": 0
        }
      }
    ]
  },
  {
    "id": 9,
    "type": "PROD",
    "region": "Beginner",
    "name": "The Walls",
    "width": 1200,
    "height": 600,
    "targetTime": 6,
    "start": {
      "x": 100,
      "y": 500
    },
    "goal": {
      "x": 1440,
      "y": 530,
      "w": 60,
      "h": 60
    },
    "platforms": [
      {
        "id": 2,
        "x": 30,
        "y": 540,
        "w": 180,
        "h": 180,
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 3,
        "x": 210.5,
        "y": 540,
        "w": 79.5,
        "h": 70,
        "type": "vanishing",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 4,
        "x": 994.08773148148,
        "y": 550,
        "w": 180,
        "h": 20,
        "type": "moving",
        "pivot": {
          "x": 0,
          "y": 0
        },
        "moving": {
          "start": {
            "x": 940,
            "y": 550
          },
          "end": {
            "x": 1140,
            "y": 550
          },
          "duration": 2
        }
      },
      {
        "id": 5,
        "x": 1435.1698223597518,
        "y": 600,
        "w": 129.66035528049633,
        "h": 30,
        "type": "platform",
        "rotation": 0,
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 6,
        "x": 290.5,
        "y": 540,
        "w": 79.5,
        "h": 70,
        "type": "vanishing",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 7,
        "x": 370.5,
        "y": 540,
        "w": 79.5,
        "h": 70,
        "type": "vanishing",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 8,
        "x": 450.5,
        "y": 540,
        "w": 79.5,
        "h": 70,
        "type": "vanishing",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 9,
        "x": 530.5,
        "y": 540,
        "w": 79.5,
        "h": 70,
        "type": "vanishing",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 10,
        "x": 610.5,
        "y": 540,
        "w": 79.5,
        "h": 70,
        "type": "vanishing",
        "pivot": {
          "x": 0,
          "y": 0
        }
      }
    ]
  },
  {
    "id": 10,
    "type": "PROD",
    "region": "Beginner",
    "name": "Simple Mover",
    "width": 1000,
    "height": 600,
    "targetTime": 10,
    "start": {
      "x": 100,
      "y": 500
    },
    "goal": {
      "x": 3250,
      "y": 380,
      "w": 60,
      "h": 60
    },
    "platforms": [
      {
        "id": 1,
        "x": 0,
        "y": 550,
        "w": 200,
        "h": 80,
        "type": "floor",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 2,
        "x": 275.0732510287935,
        "y": 550,
        "w": 150,
        "h": 20,
        "type": "moving",
        "pivot": {
          "x": 0,
          "y": 0
        },
        "moving": {
          "start": {
            "x": 250,
            "y": 550
          },
          "end": {
            "x": 550,
            "y": 550
          },
          "duration": 3
        }
      },
      {
        "id": 3,
        "x": 700,
        "y": 550,
        "w": 300,
        "h": 80,
        "type": "floor",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 4,
        "x": 1102.622222222196,
        "y": 550,
        "w": 150,
        "h": 20,
        "type": "moving",
        "pivot": {
          "x": 0,
          "y": 0
        },
        "moving": {
          "start": {
            "x": 1050,
            "y": 550
          },
          "end": {
            "x": 1350,
            "y": 550
          },
          "duration": 2
        }
      },
      {
        "id": 6,
        "x": 1500.5,
        "y": 550,
        "w": 200,
        "h": 80,
        "type": "floor",
        "rotation": 0,
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 7,
        "x": 1801.8180521261731,
        "y": 550,
        "w": 150,
        "h": 20,
        "type": "moving",
        "pivot": {
          "x": 0,
          "y": 0
        },
        "moving": {
          "start": {
            "x": 1750,
            "y": 550
          },
          "end": {
            "x": 2370,
            "y": 550
          },
          "duration": 3
        }
      },
      {
        "id": 9,
        "x": 2668.362737777799,
        "y": 550,
        "w": 220,
        "h": 20,
        "type": "moving",
        "pivot": {
          "x": 0,
          "y": 0
        },
        "moving": {
          "start": {
            "x": 2550,
            "y": 550
          },
          "end": {
            "x": 3120,
            "y": 550
          },
          "duration": 5
        }
      },
      {
        "id": 10,
        "x": 450,
        "y": 100,
        "w": 80,
        "h": 40,
        "type": "platform",
        "pivot": {
          "x": -40,
          "y": 20
        },
        "shooter": {
          "type": "aim",
          "fireRate": 1.5,
          "bulletSpeed": 5,
          "bulletSize": 10,
          "burstEnabled": false,
          "burstCount": 3,
          "burstInterval": 0.1,
          "burstDelay": 2
        }
      },
      {
        "id": 12,
        "x": 200,
        "y": 600,
        "w": 800,
        "h": 30,
        "type": "floor",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 13,
        "x": 1000,
        "y": 600,
        "w": 500,
        "h": 30,
        "type": "floor",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 17,
        "x": 3850,
        "y": 230,
        "w": 272.11071342395803,
        "h": 90.70357114131934,
        "type": "floor",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 18,
        "x": 2360,
        "y": 100,
        "w": 80,
        "h": 40,
        "type": "platform",
        "pivot": {
          "x": 0,
          "y": 0
        },
        "shooter": {
          "type": "aim",
          "fireRate": 1.5,
          "bulletSpeed": 5,
          "bulletSize": 10,
          "burstEnabled": false,
          "burstCount": 3,
          "burstInterval": 0.1,
          "burstDelay": 2
        }
      },
      {
        "id": 19,
        "x": 1680.5,
        "y": 189.5,
        "w": 20,
        "h": 360,
        "type": "wall",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 20,
        "x": 1160,
        "y": 110,
        "w": 80,
        "h": 40,
        "type": "platform",
        "pivot": {
          "x": -40,
          "y": 20
        },
        "shooter": {
          "type": "aim",
          "fireRate": 1.5,
          "bulletSpeed": 5,
          "bulletSize": 10,
          "burstEnabled": false,
          "burstCount": 3,
          "burstInterval": 0.1,
          "burstDelay": 2
        }
      },
      {
        "id": 21,
        "x": 2950,
        "y": 110,
        "w": 80,
        "h": 40,
        "type": "platform",
        "pivot": {
          "x": 40,
          "y": 12.18736856558985
        },
        "shooter": {
          "type": "aim",
          "fireRate": 1.5,
          "bulletSpeed": 5,
          "bulletSize": 10,
          "burstEnabled": false,
          "burstCount": 3,
          "burstInterval": 0.1,
          "burstDelay": 2
        }
      },
      {
        "id": 22,
        "x": 820,
        "y": 509.5,
        "w": 40,
        "h": 40,
        "type": "cube",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 23,
        "x": 1701,
        "y": 600,
        "w": 1689,
        "h": 30,
        "type": "floor",
        "rotation": 0,
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 24,
        "x": 3390.5,
        "y": 270,
        "w": 20,
        "h": 360,
        "type": "wall",
        "pivot": {
          "x": 0,
          "y": 0
        }
      }
    ]
  },
  {
    "id": 12,
    "type": "PROD",
    "region": "Intermediate",
    "name": "Up & Down",
    "width": 2800,
    "height": 800,
    "targetTime": 22,
    "start": {
      "x": 50,
      "y": 400
    },
    "goal": {
      "x": 880,
      "y": -330,
      "w": 60,
      "h": 60
    },
    "platforms": [
      {
        "id": 1,
        "x": 0,
        "y": 450,
        "w": 220,
        "h": 100,
        "rotation": 0,
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 21,
        "x": 570,
        "y": 120.5,
        "w": 300,
        "h": 50,
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 25,
        "x": 490,
        "y": 248.99305555560406,
        "w": 120,
        "h": 20,
        "type": "moving",
        "rotation": -1.5707963267948966,
        "pivot": {
          "x": -31.4561126256624,
          "y": 0.5719293204666674
        },
        "moving": {
          "start": {
            "x": 490,
            "y": 380
          },
          "end": {
            "x": 490,
            "y": 170
          },
          "duration": 2
        }
      },
      {
        "id": 29,
        "x": 1080,
        "y": 200,
        "w": 50,
        "h": 20,
        "type": "vanishing",
        "rotation": 0,
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 30,
        "x": 1310,
        "y": 120.5,
        "w": 50,
        "h": 20,
        "type": "vanishing",
        "rotation": 0,
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 31,
        "x": 1070,
        "y": -100,
        "w": 50,
        "h": 20,
        "type": "vanishing",
        "rotation": 0,
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 32,
        "x": 540.5,
        "y": 480,
        "w": 869.5,
        "h": 70,
        "type": "floor",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 33,
        "x": 1410.5,
        "y": 450,
        "w": 29.5,
        "h": 100,
        "rotation": 0,
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 34,
        "x": 320,
        "y": 450,
        "w": 220,
        "h": 100,
        "rotation": 0,
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 35,
        "x": 220.5,
        "y": 480,
        "w": 99.5,
        "h": 70,
        "type": "floor",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 36,
        "x": 1190,
        "y": -10,
        "w": 50,
        "h": 20,
        "type": "vanishing",
        "rotation": 0,
        "pivot": {
          "x": 0,
          "y": 0
        }
      }
    ]
  },
  {
    "id": 13,
    "type": "PROD",
    "region": "Intermediate",
    "name": "No Trouble",
    "width": 1200,
    "height": 600,
    "targetTime": 10,
    "start": {
      "x": 50,
      "y": 460
    },
    "goal": {
      "x": 250,
      "y": -320,
      "w": 60,
      "h": 60
    },
    "platforms": [
      {
        "id": 1,
        "x": 0,
        "y": 500,
        "w": 300,
        "h": 50,
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 5,
        "x": 522.4421874482052,
        "y": 479.5,
        "w": 120,
        "h": 20,
        "type": "moving",
        "pivot": {
          "x": 0,
          "y": 0
        },
        "moving": {
          "start": {
            "x": 305.21407402227413,
            "y": 479.5
          },
          "end": {
            "x": 675.2140740222741,
            "y": 479.5
          },
          "duration": 2
        }
      },
      {
        "id": 11,
        "x": 0,
        "y": -700,
        "w": 180,
        "h": 82.19506473641508,
        "type": "floor",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 13,
        "x": 570,
        "y": 120,
        "w": 100,
        "h": 70,
        "type": "cube",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 14,
        "x": 0,
        "y": 120,
        "w": 89.5,
        "h": 80,
        "type": "cube",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 16,
        "x": 0,
        "y": -150.5,
        "w": 20,
        "h": 270.5,
        "type": "wall",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 17,
        "x": 830,
        "y": 10,
        "w": 20,
        "h": 540.5,
        "type": "wall",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 18,
        "x": 300.5,
        "y": 520.5,
        "w": 529.5,
        "h": 30,
        "type": "floor",
        "pivot": {
          "x": 0,
          "y": 0
        }
      }
    ]
  },
  {
    "id": 14,
    "type": "PROD",
    "region": "Intermediate",
    "name": "Big Steps",
    "width": 1000,
    "height": 800,
    "targetTime": 7,
    "start": {
      "x": 50,
      "y": 650
    },
    "goal": {
      "x": 60,
      "y": -280,
      "w": 60,
      "h": 60
    },
    "platforms": [
      {
        "id": 1,
        "x": 0,
        "y": 750,
        "w": 200,
        "h": 50,
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 6,
        "x": -40,
        "y": -510,
        "w": 265.6047449578647,
        "h": 88.53491498595488,
        "type": "floor",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 7,
        "x": 0,
        "y": -180,
        "w": 180,
        "h": 20,
        "type": "platform",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 12,
        "x": 280,
        "y": 640,
        "w": 200,
        "h": 50,
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 13,
        "x": 560,
        "y": 490,
        "w": 200,
        "h": 50,
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 14,
        "x": 360,
        "y": 320,
        "w": 200,
        "h": 50,
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 15,
        "x": 560,
        "y": 130,
        "w": 200,
        "h": 50,
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 16,
        "x": 360,
        "y": -50,
        "w": 200,
        "h": 50,
        "pivot": {
          "x": 0,
          "y": 0
        }
      }
    ]
  },
  {
    "id": 15,
    "type": "PROD",
    "region": "Intermediate",
    "name": "First Jumps",
    "width": 1000,
    "height": 800,
    "targetTime": 12,
    "start": {
      "x": 120,
      "y": 650
    },
    "goal": {
      "x": 10,
      "y": -460,
      "w": 60,
      "h": 60
    },
    "platforms": [
      {
        "id": 1,
        "x": 0,
        "y": 700,
        "w": 300,
        "h": 50,
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 2,
        "x": 300,
        "y": 550,
        "w": 150,
        "h": 40,
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 3,
        "x": 681.9914351851905,
        "y": 370,
        "w": 180,
        "h": 40,
        "type": "moving",
        "pivot": {
          "x": 0,
          "y": 0
        },
        "moving": {
          "start": {
            "x": 550,
            "y": 370
          },
          "end": {
            "x": 750,
            "y": 370
          },
          "duration": 2
        }
      },
      {
        "id": 4,
        "x": 300,
        "y": 710,
        "w": 740,
        "h": 40,
        "type": "floor",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 5,
        "x": 750,
        "y": 50,
        "w": 20,
        "h": 140,
        "type": "wall",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 6,
        "x": 1020,
        "y": -50,
        "w": 20,
        "h": 360,
        "type": "wall",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 7,
        "x": 920,
        "y": 290,
        "w": 100,
        "h": 20,
        "type": "cube",
        "rotation": 0,
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 8,
        "x": 770,
        "y": 170,
        "w": 100,
        "h": 20,
        "type": "cube",
        "rotation": 0,
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 9,
        "x": 920,
        "y": 80,
        "w": 100,
        "h": 20,
        "type": "cube",
        "rotation": 0,
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 14,
        "x": 610,
        "y": 30,
        "w": 160,
        "h": 20,
        "type": "cube",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 15,
        "x": -10,
        "y": 30,
        "w": 620,
        "h": 20,
        "type": "floor",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 16,
        "x": 480,
        "y": -60,
        "w": 60,
        "h": 60,
        "type": "cube",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 17,
        "x": 270,
        "y": -60,
        "w": 60,
        "h": 60,
        "type": "cube",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 18,
        "x": 36.599571759259526,
        "y": -211.5888657407477,
        "w": 140,
        "h": 20,
        "type": "moving",
        "pivot": {
          "x": 0,
          "y": 0
        },
        "moving": {
          "start": {
            "x": 30,
            "y": -40
          },
          "end": {
            "x": 40,
            "y": -300
          },
          "duration": 2
        }
      },
      {
        "id": 19,
        "x": -20,
        "y": -180,
        "w": 20,
        "h": 60,
        "type": "wall",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 20,
        "x": 360,
        "y": -240,
        "w": 20,
        "h": 60,
        "type": "wall",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 21,
        "x": -20,
        "y": -350,
        "w": 20,
        "h": 60,
        "type": "wall",
        "pivot": {
          "x": 0,
          "y": 0
        }
      }
    ]
  },
  {
    "id": 16,
    "type": "PROD",
    "region": "Intermediate",
    "name": "Spike Introduction",
    "width": 1200,
    "height": 600,
    "targetTime": 8,
    "start": {
      "x": 50,
      "y": 460
    },
    "goal": {
      "x": 230,
      "y": -240,
      "w": 60,
      "h": 60
    },
    "platforms": [
      {
        "id": 2,
        "x": 10,
        "y": 500,
        "w": 180,
        "h": 50,
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 5,
        "x": 190,
        "y": 520,
        "w": 740,
        "h": 30,
        "type": "floor",
        "rotation": 0,
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 6,
        "x": 930,
        "y": 510,
        "w": 540,
        "h": 40,
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 7,
        "x": 1597.2844328701924,
        "y": 405.1519097226168,
        "w": 220,
        "h": 60,
        "type": "moving",
        "pivot": {
          "x": 0,
          "y": 0
        },
        "moving": {
          "start": {
            "x": 1550,
            "y": 510
          },
          "end": {
            "x": 1780,
            "y": 0
          },
          "duration": 2
        }
      },
      {
        "id": 8,
        "x": 1900,
        "y": -120,
        "w": 120,
        "h": 40,
        "type": "cube",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 9,
        "x": 1970,
        "y": -210,
        "w": 120,
        "h": 40,
        "type": "cube",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 10,
        "x": 1680,
        "y": -370,
        "w": 180,
        "h": 20,
        "type": "platform",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 11,
        "x": 920,
        "y": -540,
        "w": 20,
        "h": 240,
        "type": "wall",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 12,
        "x": 840,
        "y": -640,
        "w": 180,
        "h": 20,
        "type": "floor",
        "rotation": 1.5707963267948966,
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 13,
        "x": 476.34548611078617,
        "y": -180,
        "w": 120,
        "h": 20,
        "type": "moving",
        "pivot": {
          "x": 0,
          "y": 0
        },
        "moving": {
          "start": {
            "x": 390,
            "y": -180
          },
          "end": {
            "x": 810,
            "y": -180
          },
          "duration": 2
        }
      },
      {
        "id": 14,
        "x": 190,
        "y": -180,
        "w": 180,
        "h": 20,
        "type": "platform",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 15,
        "x": 800,
        "y": -40,
        "w": 120,
        "h": 40,
        "type": "cube",
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 16,
        "x": 201.870661910668,
        "y": -520,
        "w": 160,
        "h": 94.58044127377866,
        "type": "floor",
        "pivot": {
          "x": 0,
          "y": 0
        }
      }
    ]
  },
  {
    "id": 17,
    "type": "PROD",
    "region": "Intermediate",
    "name": "Hurdle Jumping",
    "width": 1000,
    "height": 600,
    "targetTime": 15,
    "start": {
      "x": 10,
      "y": 510
    },
    "goal": {
      "x": 2290,
      "y": -360,
      "w": 60,
      "h": 60
    },
    "platforms": [
      {
        "id": 1,
        "x": -160,
        "y": 560,
        "w": 1940,
        "h": 50,
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 4,
        "x": 340,
        "y": 510,
        "w": 40,
        "h": 40,
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 6,
        "x": 1070,
        "y": 510,
        "w": 120,
        "h": 20,
        "pivot": {
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 1765751580906.5586,
        "x": 840,
        "y": -180,
        "w": 180,
        "h": 180,
        "type": "cube",
        "rotation": 0
      },
      {
        "id": 1765751582643.7915,
        "x": 520,
        "y": -150,
        "w": 120,
        "h": 120,
        "type": "cube",
        "rotation": 0
      },
      {
        "id": 1765751589860.9456,
        "x": 450,
        "y": 190,
        "w": 40,
        "h": 40,
        "type": "cube",
        "rotation": 0
      },
      {
        "id": 1765751593693.92,
        "x": 290,
        "y": 20,
        "w": 40,
        "h": 40,
        "type": "cube",
        "rotation": 0
      },
      {
        "id": 1765751597391.2725,
        "x": 1180,
        "y": -40,
        "w": 120,
        "h": 120,
        "type": "cube",
        "rotation": 0
      },
      {
        "id": 1765751600092.9404,
        "x": 650,
        "y": 10,
        "w": 30,
        "h": 530,
        "type": "wall",
        "rotation": 0
      },
      {
        "id": 1765751612092.338,
        "x": 50,
        "y": 230,
        "w": 120,
        "h": 120,
        "type": "cube",
        "rotation": 0
      }
    ],
    "enemies": []
  }
];