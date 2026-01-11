import { AudioConfig } from '../debug/DebugConfig';

export enum MusicState {
  LANDING = 1,
  PLAYING_START = 2,      
  PLAYING_1_DEATH = 3,    
  PLAYING_2_DEATHS = 4,   
  PLAYING_5_DEATHS = 5,   
  PLAYING_8_DEATHS = 6,   
  PLAYING_10_DEATHS = 7,  
  LEVEL_COMPLETE = 8      
}

export class GameMusicManager {
  private ctx: AudioContext | null = null;
  public currentState: MusicState = MusicState.LANDING;
  private pendingState: MusicState | null = null;
  private isPlaying: boolean = false;
  
  private previewBassOnly: boolean = false;
  private layerVolumes = { clap: 0, hihat: 0, melody: 0 };
  private readonly FADE_SPEED = 0.05; 
  private userConfig: AudioConfig | null = null;
  private masterVolume: number = 1.0;
  private isMuted: boolean = false;

  private wallSlideNode: OscillatorNode | null = null;
  private wallSlideGain: GainNode | null = null;
  private etherealGain: GainNode | null = null;
  private etherealNodes: AudioNode[] = [];

  private nextNoteTime: number = 0;
  private current16thNote: number = 0; 
  private readonly lookahead: number = 25.0; 
  private readonly scheduleAheadTime: number = 0.1; 
  private timerID: number | null = null;
  
  private BPM: number = 128;
  private noteLength: number = (60 / 128) / 4; 
  
  private readonly verseBass = [65.41, 65.41, 73.42, 87.31, 87.31, 98.00, 73.42, 65.41]; 
  private readonly chorusBass = [65.41, 87.31, 98.00, 87.31, 65.41, 87.31, 98.00, 110.00]; 
  
  private readonly verseMelody = [
    261.63, 293.66, 329.63, 349.23,
    392.00, 349.23, 329.63, 293.66,
    261.63, 329.63, 392.00, 329.63,
    261.63, 293.66, 261.63, 196.00
  ];

  private readonly chorusMelody = [
    523.25, 493.88, 440.00, 392.00,
    523.25, 587.33, 523.25, 493.88,
    440.00, 493.88, 523.25, 587.33,
    659.25, 587.33, 523.25, 493.88
  ];

  constructor() {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
        this.ctx = new AudioContextClass();
    }
  }

  public resumeContext() {
      if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
      }
  }

  public updateUserConfig(config: AudioConfig) {
      this.userConfig = config;
  }
  
  public setMasterSettings(volume: number, muted: boolean) {
      this.masterVolume = volume;
      this.isMuted = muted;
      if (muted) {
          this.stopWallSlide();
      }
  }
  
  public setBpm(bpm: number) {
      this.BPM = Math.max(60, Math.min(200, bpm));
      this.noteLength = (60 / this.BPM) / 4;
  }

  public setState(newState: MusicState) {
    if (this.currentState !== newState) {
        this.pendingState = newState;
    }
  }
  
  public setPreviewMode(enabled: boolean) {
      if (this.previewBassOnly === enabled) return;
      this.previewBassOnly = enabled;
      if (enabled) {
          this.start();
      }
  }

  public start() {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.current16thNote = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.layerVolumes = { clap: 0, hihat: 0, melody: 0 };
    this.scheduler();
  }
  
  public stop() {
      this.isPlaying = false;
      this.previewBassOnly = false; 
      this.stopWallSlide();
      this.stopEtherealChord();
      if (this.timerID !== null) window.clearTimeout(this.timerID);
  }
  
  public dispose() {
      this.stop();
      if (this.ctx && this.ctx.state !== 'closed') {
          this.ctx.close().catch(() => {});
      }
      this.ctx = null;
  }

  private startEtherealChord() {
      if (!this.ctx) return;
      this.stopEtherealChord(); 
      const t = this.ctx.currentTime;
      const master = this.ctx.createGain();
      const targetVolume = this.getEffectiveVolume('ethereal', 0.3);
      master.gain.value = 0;
      master.gain.linearRampToValueAtTime(targetVolume, t + 2.0); 
      master.connect(this.ctx.destination);
      this.etherealGain = master;
      this.etherealNodes.push(master);
      const lfo1 = this.ctx.createOscillator();
      lfo1.type = 'sine';
      lfo1.frequency.value = 0.3;
      const lfo1G = this.ctx.createGain();
      lfo1G.gain.value = 30;
      lfo1.connect(lfo1G);
      lfo1.start(t);
      this.etherealNodes.push(lfo1, lfo1G);
      const lfo2 = this.ctx.createOscillator();
      lfo2.type = 'sine';
      lfo2.frequency.value = 0.17;
      const lfo2G = this.ctx.createGain();
      lfo2G.gain.value = 50;
      lfo2.connect(lfo2G);
      lfo2.start(t);
      this.etherealNodes.push(lfo2, lfo2G);
      const pairs = [[120, 180], [180, 270], [240, 360]];
      pairs.forEach(pair => {
          const filter = this.ctx!.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.value = 800;
          filter.Q.value = 2.0;
          filter.connect(master);
          this.etherealNodes.push(filter);
          pair.forEach(freq => {
              const osc = this.ctx!.createOscillator();
              osc.type = 'sine';
              osc.frequency.value = freq;
              const g = this.ctx!.createGain();
              g.gain.value = 0.15;
              lfo1G.connect(osc.detune);
              lfo2G.connect(osc.detune);
              osc.connect(g);
              g.connect(filter);
              osc.start(t);
              this.etherealNodes.push(osc, g);
          });
      });
      const delay = this.ctx.createDelay(1.0);
      delay.delayTime.value = 0.3;
      const feedback = this.ctx.createGain();
      feedback.gain.value = 0.5;
      const wet = this.ctx.createGain();
      wet.gain.value = 0.4;
      master.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(wet);
      wet.connect(this.ctx.destination);
      this.etherealNodes.push(delay, feedback, wet);
  }

  private stopEtherealChord() {
      if (this.etherealGain && this.ctx) {
          const t = this.ctx.currentTime;
          try {
              this.etherealGain.gain.cancelScheduledValues(t);
              this.etherealGain.gain.setValueAtTime(this.etherealGain.gain.value, t);
              this.etherealGain.gain.linearRampToValueAtTime(0, t + 4.0);
          } catch(e) {}
          const nodesToStop = [...this.etherealNodes];
          this.etherealNodes = [];
          this.etherealGain = null;
          setTimeout(() => {
              nodesToStop.forEach(node => {
                  try {
                      if (node instanceof OscillatorNode) node.stop();
                      node.disconnect();
                  } catch(e) {}
              });
          }, 4100);
      }
  }

  public playJump() {
      if (!this.ctx) return;
      const vol = this.getEffectiveVolume('kick', 1.0); 
      if (vol <= 0.001) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(600, t + 0.1);
      gain.gain.setValueAtTime(0.3 * vol, t);
      gain.gain.exponentialRampToValueAtTime(0.01 * vol, t + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.1);
  }

  public playDoubleJump() {
      if (!this.ctx) return;
      const vol = this.getEffectiveVolume('kick', 1.0);
      if (vol <= 0.001) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(800, t + 0.15);
      gain.gain.setValueAtTime(0.3 * vol, t);
      gain.gain.exponentialRampToValueAtTime(0.01 * vol, t + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
  }

  public playLandSmash() {
      if (!this.ctx) return;
      const vol = this.getEffectiveVolume('kick', 1.0);
      if (vol <= 0.001) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.15);
      gain.gain.setValueAtTime(0.8 * vol, t);
      gain.gain.exponentialRampToValueAtTime(0.01 * vol, t + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
      const bufferSize = this.ctx.sampleRate * 0.1;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1);
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.value = 600;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.5 * vol, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.01 * vol, t + 0.1);
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(t);
  }

  public playDeath() {
      if (!this.ctx) return;
      const vol = this.getEffectiveVolume('bass', 1.0);
      if (vol <= 0.001) return;
      const t = this.ctx.currentTime;
      const masterGain = this.ctx.createGain();
      masterGain.gain.value = 0.5 * vol;
      masterGain.connect(this.ctx.destination);
      const p1Duration = 0.1;
      const createPhase1Osc = (freq: number, startGain: number) => {
          const osc = this.ctx!.createOscillator();
          const g = this.ctx!.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          g.gain.setValueAtTime(startGain, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + p1Duration);
          osc.connect(g);
          g.connect(masterGain);
          osc.start(t);
          osc.stop(t + p1Duration);
      };
      createPhase1Osc(40, 0.3);  
      createPhase1Osc(120, 0.2); 
      createPhase1Osc(240, 0.1); 
      const p2Start = t + 0.1;
      const p2Duration = 0.5;
      const p2End = p2Start + p2Duration;
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.value = 8;
      lfoGain.gain.value = 20;
      lfo.connect(lfoGain);
      lfo.start(p2Start);
      lfo.stop(p2End);
      const createPhase2Osc = (type: OscillatorType, startFreq: number, endFreq: number, startGain: number, startCutoff: number, endCutoff: number) => {
          const osc = this.ctx!.createOscillator();
          const filter = this.ctx!.createBiquadFilter();
          const g = this.ctx!.createGain();
          osc.type = type;
          osc.frequency.setValueAtTime(startFreq, p2Start);
          osc.frequency.exponentialRampToValueAtTime(endFreq, p2End);
          lfoGain.connect(osc.frequency);
          filter.type = 'lowpass';
          filter.Q.value = 3.0;
          filter.frequency.setValueAtTime(startCutoff, p2Start);
          filter.frequency.exponentialRampToValueAtTime(endCutoff, p2End);
          g.gain.setValueAtTime(startGain, p2Start);
          g.gain.exponentialRampToValueAtTime(0.001, p2End);
          osc.connect(filter);
          filter.connect(g);
          g.connect(masterGain);
          osc.start(p2Start);
          osc.stop(p2End);
      };
      createPhase2Osc('sine', 300, 80, 0.15, 1200, 400);
      createPhase2Osc('triangle', 450, 120, 0.12, 1200, 400);
      createPhase2Osc('sawtooth', 600, 160, 0.08, 1200, 400);
      setTimeout(() => {
          try {
            masterGain.disconnect();
          } catch(e) {}
      }, 700);
  }

  public playShoot() {
      if (!this.ctx) return;
      const vol = this.getEffectiveVolume('hihat', 1.0);
      if (vol <= 0.001) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.2 * vol, t);
      gain.gain.exponentialRampToValueAtTime(0.01 * vol, t + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.1);
  }

  public playVictory() {
      if (!this.ctx) return;
      const volume = this.getEffectiveVolume('victory', 1.0);
      if (volume <= 0.001) return;
      const t = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; 
      notes.forEach((freq, i) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          osc.type = 'triangle';
          osc.frequency.value = freq;
          const startTime = t + (i * 0.1);
          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(0.3 * volume, startTime + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.01 * volume, startTime + 0.5);
          osc.connect(gain);
          gain.connect(this.ctx!.destination);
          osc.start(startTime);
          osc.stop(startTime + 0.6);
      });
  }

  public startWallSlide() {
      if (!this.ctx || this.wallSlideNode) return;
      const vol = this.getEffectiveVolume('bass', 1.0);
      if (vol <= 0.001) return;
      this.wallSlideNode = this.ctx.createOscillator();
      this.wallSlideNode.type = 'sawtooth';
      this.wallSlideNode.frequency.value = 60; 
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400; 
      filter.Q.value = 1.0;
      this.wallSlideGain = this.ctx.createGain();
      this.wallSlideGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
      this.wallSlideGain.gain.linearRampToValueAtTime(0.15 * vol, this.ctx.currentTime + 0.1); 
      this.wallSlideNode.connect(filter);
      filter.connect(this.wallSlideGain);
      this.wallSlideGain.connect(this.ctx.destination);
      this.wallSlideNode.start();
  }
  
  public stopWallSlide() {
      if (this.wallSlideNode && this.wallSlideGain && this.ctx) {
          const t = this.ctx.currentTime;
          try {
            this.wallSlideGain.gain.cancelScheduledValues(t);
            this.wallSlideGain.gain.setValueAtTime(this.wallSlideGain.gain.value, t);
            this.wallSlideGain.gain.linearRampToValueAtTime(0, t + 0.15);
          } catch(e) {}
          const oldNode = this.wallSlideNode;
          setTimeout(() => {
              try { oldNode.stop(); } catch(e) {}
          }, 200);
          this.wallSlideNode = null;
          this.wallSlideGain = null;
      }
  }

  private scheduler() {
    if (!this.ctx) return;
    const s = this.currentState;
    const tClap = (s >= MusicState.PLAYING_START && s !== MusicState.LEVEL_COMPLETE) ? 1.0 : 0.0;
    const tHiHat = (s >= MusicState.PLAYING_1_DEATH && s !== MusicState.LEVEL_COMPLETE) ? 1.0 : 0.0;
    const tMelody = (s >= MusicState.PLAYING_8_DEATHS && s !== MusicState.LEVEL_COMPLETE) ? 1.0 : 0.0;
    const approach = (current: number, target: number) => {
        const diff = target - current;
        if (Math.abs(diff) <= this.FADE_SPEED) return target;
        return current + Math.sign(diff) * this.FADE_SPEED;
    };
    this.layerVolumes.clap = approach(this.layerVolumes.clap, tClap);
    this.layerVolumes.hihat = approach(this.layerVolumes.hihat, tHiHat);
    this.layerVolumes.melody = approach(this.layerVolumes.melody, tMelody);
    if (this.etherealGain && this.currentState === MusicState.LEVEL_COMPLETE) {
        const target = this.getEffectiveVolume('ethereal', 0.3);
        try {
            this.etherealGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
        } catch(e) {}
    }
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.current16thNote, this.nextNoteTime);
      this.nextNote();
    }
    this.timerID = window.setTimeout(() => this.scheduler(), this.lookahead);
  }

  private nextNote() {
    this.nextNoteTime += this.noteLength;
    this.current16thNote++;
    if (this.current16thNote >= 512) {
      this.current16thNote = 0;
    }
  }

  private getEffectiveVolume(instrument: keyof AudioConfig, baseVolume: number): number {
      if (this.isMuted) return 0;
      if (!this.userConfig) return baseVolume * this.masterVolume;
      const conf = this.userConfig[instrument];
      if (conf && conf.muted) return 0;
      const configVol = conf ? conf.volume : 1.0;
      return baseVolume * configVol * this.masterVolume;
  }

  private scheduleNote(noteIndex: number, time: number) {
    if (!this.ctx) return;
    if (this.pendingState !== null) {
        const oldState = this.currentState;
        this.currentState = this.pendingState;
        this.pendingState = null;
        if (this.currentState === MusicState.LEVEL_COMPLETE) {
             this.startEtherealChord();
        } else if (oldState === MusicState.LEVEL_COMPLETE) {
             this.stopEtherealChord();
        }
    }
    const state = this.currentState;
    if (this.previewBassOnly) {
        const beat16 = noteIndex % 16;
        if (beat16 % 2 === 0) { 
            const noteIdx = (beat16 / 2) % 8;
            const freq = this.verseBass[noteIdx];
            const dur = this.noteLength * 1.8; 
            this.scheduleDeepBass(time, freq, dur, this.getEffectiveVolume('bass', 1.0));
        }
        return; 
    }
    const barIndex = Math.floor(noteIndex / 16);
    const isChorus = (barIndex >= 8 && barIndex <= 15) || (barIndex >= 24 && barIndex <= 31);
    const beat16 = noteIndex % 16;
    if (state >= MusicState.PLAYING_2_DEATHS || state === MusicState.LEVEL_COMPLETE) {
        let kickVol = 0;
        if (beat16 === 0) kickVol = 1.0;
        else if (beat16 === 2) kickVol = 0.9;
        else if (beat16 === 4) kickVol = 0.9;
        else if (beat16 === 7) kickVol = 0.9;
        else if (beat16 === 9) kickVol = 0.9;
        else if (beat16 === 10) kickVol = 0.9;
        else if (beat16 === 12) kickVol = 1.0;
        else if (beat16 === 14) kickVol = 0.9;
        if (kickVol > 0) this.scheduleDeepKick(time, this.getEffectiveVolume('kick', kickVol));
    }
    if (state >= MusicState.LANDING) {
        if (beat16 % 2 === 0) { 
            const noteIdx = (beat16 / 2) % 8;
            const freq = isChorus ? this.chorusBass[noteIdx] : this.verseBass[noteIdx];
            const dur = this.noteLength * 1.8; 
            this.scheduleDeepBass(time, freq, dur, this.getEffectiveVolume('bass', 1.0));
        }
    }
    if (this.layerVolumes.clap > 0) {
        if (beat16 === 4 || beat16 === 12) {
            this.scheduleClap(time, this.getEffectiveVolume('clap', 1.0 * this.layerVolumes.clap), isChorus);
        }
    }
    if (this.layerVolumes.hihat > 0) {
        let useFastPattern = false;
        if (state >= MusicState.PLAYING_5_DEATHS) {
            if (barIndex % 3 === 0) {
                useFastPattern = true;
            }
        }
        if (useFastPattern || isChorus) {
            const isClosed = (beat16 % 4 !== 2);
            this.scheduleHiHat(time, this.getEffectiveVolume('hihat', 1.0 * this.layerVolumes.hihat), isClosed);
        } else {
            if (beat16 % 4 === 2) {
                this.scheduleHiHat(time, this.getEffectiveVolume('hihat', 1.0 * this.layerVolumes.hihat), true);
            }
        }
    }
    if (this.layerVolumes.melody > 0) {
        const noteIdx = beat16 % 16;
        const freq = isChorus ? this.chorusMelody[noteIdx] : this.verseMelody[noteIdx];
        const beatDur = this.noteLength * 4; 
        const dur = isChorus ? beatDur * 0.15 : beatDur * 0.2;
        const isSynthActive = (state >= MusicState.PLAYING_10_DEATHS);
        const playSynth = isSynthActive && (Math.floor(barIndex / 4) % 2 !== 0);
        if (playSynth) {
            this.scheduleSynthwaveLead(time, freq, dur, this.getEffectiveVolume('synth', 1.0 * this.layerVolumes.melody));
        } else {
            this.scheduleDeepPad(time, freq, dur, this.getEffectiveVolume('melody', 1.0 * this.layerVolumes.melody));
        }
    }
  }

  private scheduleDeepKick(time: number, volume: number) {
    if (!this.ctx || volume <= 0.001) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(35, time + 0.08);
    gain.gain.setValueAtTime(volume * 0.7, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + 0.4);
  }

  private scheduleDeepBass(time: number, frequency: number, duration: number, volume: number) {
    if (!this.ctx || volume <= 0.001) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    filter.type = 'lowpass';
    filter.frequency.value = frequency * 2;
    filter.Q.value = 3;
    gain.gain.setValueAtTime(volume * 0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + duration);
  }

  private scheduleClap(time: number, volume: number, isChorus: boolean) {
    if (!this.ctx || volume <= 0.001) return;
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    const source = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.value = 2000;
    filter.Q.value = 10;
    const clapVol = isChorus ? volume * 0.9 : volume * 0.7;
    gain.gain.value = clapVol * 0.36;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    source.start(time);
  }

  private scheduleHiHat(time: number, volume: number, closed: boolean) {
    if (!this.ctx || volume <= 0.001) return;
    const duration = closed ? 0.03 : 0.08;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    const source = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    filter.type = 'highpass';
    filter.frequency.value = closed ? 10000 : 8000;
    gain.gain.value = volume * 0.10;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    source.start(time);
  }

  private scheduleDeepPad(time: number, frequency: number, duration: number, volume: number) {
    if (!this.ctx || volume <= 0.001) return;
    const harmonics = [1, 1.5, 2];
    harmonics.forEach((harmonic, idx) => {
        const osc = this.ctx!.createOscillator();
        const filter = this.ctx!.createBiquadFilter();
        const gain = this.ctx!.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = frequency * harmonic;
        filter.type = 'lowpass';
        filter.frequency.value = frequency * 2;
        filter.Q.value = 1;
        const vol = (volume * 0.15 * 0.5) / (idx + 1);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(vol, time + 0.1);
        gain.gain.setValueAtTime(vol, time + duration - 0.1);
        gain.gain.linearRampToValueAtTime(0, time + duration);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(time);
        osc.stop(time + duration);
    });
  }

  private scheduleSynthwaveLead(time: number, frequency: number, duration: number, volume: number) {
    if (!this.ctx || volume <= 0.001) return;
    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = frequency;
    lfo.type = 'sine';
    lfo.frequency.value = 6;
    lfoGain.gain.value = 10;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    filter.type = 'lowpass';
    filter.frequency.value = frequency * 4;
    filter.Q.value = 2;
    gain.gain.setValueAtTime(volume * 0.3 * 0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    lfo.start(time);
    osc.start(time);
    lfo.stop(time + duration);
    osc.stop(time + duration);
  }
}