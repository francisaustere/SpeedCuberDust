
import React, { useState, useEffect } from 'react';
import { useDebugConfig } from './DebugConfig';
import { TOOLTIPS, TooltipEntry } from './TooltipData';

// --- SHARED COMPONENTS ---

interface HelpProps {
    label: string;
    onShowHelp?: (key: string) => void;
}

const HelpButton: React.FC<HelpProps> = ({ label, onShowHelp }) => {
    const hasHelp = !!TOOLTIPS[label];

    if (!hasHelp || !onShowHelp) return null;

    return (
        <button
            onClick={(e) => { e.stopPropagation(); onShowHelp(label); }}
            className="ml-1.5 w-3 h-3 rounded-full border border-cyan-700/50 bg-cyan-900/20 text-[8px] font-bold text-cyan-500 hover:text-white hover:border-cyan-400 hover:bg-cyan-500 transition-all flex items-center justify-center shrink-0 leading-none"
            title="Info"
        >
            ?
        </button>
    );
};

const TooltipPopup: React.FC<{ title: string, data: TooltipEntry, onClose: () => void }> = ({ title, data, onClose }) => {
    return (
        <div className="fixed left-80 top-20 w-64 bg-black/95 border border-cyan-500/50 p-4 rounded shadow-[0_0_30px_rgba(0,0,0,0.8)] z-[1000] text-left animate-in fade-in slide-in-from-left-4 duration-200">
            <button
                onClick={onClose}
                className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center text-white/30 hover:text-white transition-colors"
            >
                ✕
            </button>
            <h4 className="text-cyan-400 font-bold tracking-widest text-xs mb-3 border-b border-white/10 pb-2 pr-6 uppercase">
                {title}
            </h4>
            <div className="space-y-4">
                <div>
                    <span className="text-[9px] uppercase text-white/40 font-bold block mb-1 tracking-wider">Effect</span>
                    <p className="text-[11px] text-white/90 leading-relaxed font-sans">{data.desc}</p>
                </div>
                {data.trigger && (
                    <div>
                        <span className="text-[9px] uppercase text-white/40 font-bold block mb-1 tracking-wider">Trigger</span>
                        <p className="text-[11px] text-cyan-100/70 leading-relaxed font-sans italic">{data.trigger}</p>
                    </div>
                )}
                {data.values && (
                    <div className="bg-white/5 p-2 rounded border border-white/5">
                        <span className="text-[9px] uppercase text-white/40 font-bold block mb-1 tracking-wider">Values</span>
                        <p className="text-[10px] text-yellow-100/80 leading-relaxed font-mono whitespace-pre-wrap">{data.values}</p>
                    </div>
                )}
            </div>
            <div className="absolute top-6 -left-1.5 w-3 h-3 bg-black/95 border-l border-b border-cyan-500/50 transform rotate-45"></div>
        </div>
    );
};

// --- INPUT COMPONENTS ---

interface SliderProps extends HelpProps {
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (val: number) => void;
}

const PhysicsSlider: React.FC<SliderProps> = ({ label, value, min, max, step = 1, onChange, onShowHelp }) => (
    <div className="flex flex-col mb-1 group">
        <div className="flex justify-between items-end mb-0.5">
            <div className="flex items-center">
                <span className="text-[9px] font-bold text-white/70 tracking-wider group-hover:text-white transition-colors">{label}</span>
                <HelpButton label={label} onShowHelp={onShowHelp} />
            </div>
            <span className="text-[9px] font-mono text-cyan-400">{value.toFixed(3)}</span>
        </div>
        <input
            type="range"
            min={min} max={max} step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:rounded-full"
        />
    </div>
);

const NumberInput: React.FC<{ label: string, value: number, onChange: (val: number) => void, step?: number } & HelpProps> = ({ label, value, onChange, step = 0.01, onShowHelp }) => {
    const [localStr, setLocalStr] = useState(value.toString());
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (!isFocused) {
            setLocalStr(value.toString());
        }
    }, [value, isFocused]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalStr(e.target.value);
    };

    const handleCommit = () => {
        const normalized = localStr.replace(',', '.');
        const num = parseFloat(normalized);
        if (!isNaN(num)) {
            onChange(num);
        } else {
            setLocalStr(value.toString());
        }
    };

    return (
        <div className="flex justify-between items-center mb-1 group">
            <div className="flex items-center">
                <span className="text-[9px] font-bold text-white/70 tracking-wider truncate max-w-[150px] group-hover:text-white transition-colors">{label}</span>
                <HelpButton label={label} onShowHelp={onShowHelp} />
            </div>
            <input
                type="text"
                value={localStr}
                onChange={handleChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => { setIsFocused(false); handleCommit(); }}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                className="w-16 bg-white/10 text-right text-[10px] font-mono text-cyan-400 p-1 rounded border border-white/20 outline-none focus:border-cyan-400"
            />
        </div>
    );
};

const Toggle: React.FC<{ label: string, value: boolean, onChange: (val: boolean) => void } & HelpProps> = ({ label, value, onChange, onShowHelp }) => (
    <div className="flex justify-between items-center mb-1 cursor-pointer group" onClick={() => onChange(!value)}>
        <div className="flex items-center">
            <span className="text-[9px] font-bold text-white/70 tracking-wider group-hover:text-white transition-colors">{label}</span>
            <HelpButton label={label} onShowHelp={onShowHelp} />
        </div>
        <div className={`w-6 h-3 rounded-full relative transition-colors ${value ? 'bg-cyan-500' : 'bg-white/20'}`}>
            <div className={`absolute top-0.5 left-0.5 w-2 h-2 bg-white rounded-full transition-transform ${value ? 'translate-x-3' : 'translate-x-0'}`} />
        </div>
    </div>
);

const ColorInput: React.FC<{ value: string, onChange: (val: string) => void }> = ({ value, onChange }) => (
    <div className="flex-1 h-3 relative border border-white/20 rounded-sm overflow-hidden group hover:border-white/50 transition-colors">
        <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute -top-2 -left-2 w-[200%] h-[200%] p-0 m-0 border-0 cursor-pointer"
        />
    </div>
);

const MaterialRow: React.FC<{
    label: string,
    fill: string,
    edge: string,
    onFillChange: (v: string) => void,
    onEdgeChange: (v: string) => void
}> = ({ label, fill, edge, onFillChange, onEdgeChange }) => (
    <div className="flex items-center justify-between mb-1 gap-2">
        <span className="text-[9px] font-bold text-white/60 tracking-wider flex-1 truncate">{label}</span>
        <div className="flex gap-1 w-16">
            <ColorInput value={fill} onChange={onFillChange} />
            <ColorInput value={edge} onChange={onEdgeChange} />
        </div>
    </div>
);

const SectionSave: React.FC<{ data: any, name: string }> = ({ data, name }) => (
    <button
        onClick={() => {
            const text = "Please update this default values:\n\n" + JSON.stringify(data, null, 2);
            navigator.clipboard.writeText(text);
        }}
        className="w-full mb-3 py-1.5 bg-white/5 hover:bg-cyan-900/50 border border-white/10 hover:border-cyan-500/50 rounded text-[9px] font-bold text-cyan-400 tracking-widest transition-all flex items-center justify-center gap-2 group"
        title="Copy Config JSON to Clipboard"
    >
        <span className="group-hover:scale-110 transition-transform">💾</span> SAVE {name}
    </button>
);

export const DebugUI: React.FC<{ 
    config: ReturnType<typeof useDebugConfig>, 
    isLoggingEnemies?: boolean, 
    onToggleEnemyLog?: () => void
}> = ({ config, isLoggingEnemies, onToggleEnemyLog }) => {
    const {
        physicsConfig, updatePhysics,
        physicsProfiles, activeProfile, setActiveProfile, createProfile,
        gridConfig, updateGrid,
        visualConfig, updateVisual,
        rainbowConfig, updateRainbow,
        deformationConfig, updateDeformation,
        deformationProfiles, activeDeformationProfile, setActiveDeformationProfile, createDeformationProfile,
        cameraConfig, updateCamera,
        lightConfig, updateLight,
        enemyConfig, updateEnemy,
        postProcessConfig, updatePostProcess,
        activeDebugSection, setActiveDebugSection,
        timeScale, setTimeScale,
        drawConfig, updateDrawConfig,
        pathfindingConfig, updatePathfinding,
        resetConfig
    } = config;

    const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
    const [activeEnemyTab, setActiveEnemyTab] = useState<'DRONE' | 'NEW_WALKER' | 'JUMPER'>('NEW_WALKER');

    const sections = [
        { id: 'ENGINE', label: 'ENGINE' },
        { id: 'PHYSICS', label: 'PHYSICS' },
        { id: 'DEFORM', label: 'PLAYER DEF' },
        { id: 'ENEMIES', label: 'ENEMIES' },
        { id: 'PATH', label: 'PATHFINDING' },
        { id: 'GRID', label: 'GRID' },
        { id: 'VISUALS', label: 'VISUALS' },
        { id: 'POST', label: 'POST FX' },
        { id: 'LIGHT', label: 'LIGHT' },
        { id: 'CAMERA', label: 'CAMERA' },
    ];

    const renderEnemySection = () => (
        <>
            <SectionSave data={enemyConfig} name="ENEMIES" />
            
            {onToggleEnemyLog && (
                <button 
                    onClick={onToggleEnemyLog}
                    className={`w-full mb-3 py-1.5 border rounded text-[9px] font-bold tracking-widest transition-all flex items-center justify-center gap-2 ${
                        isLoggingEnemies 
                        ? 'bg-green-900/50 hover:bg-green-800 border-green-500/50 text-green-300 animate-pulse' 
                        : 'bg-purple-900/50 hover:bg-purple-800 border-purple-500/50 text-purple-300'
                    }`}
                >
                    {isLoggingEnemies ? "STOP LOGGING" : "START LOGGING (PER FRAME)"}
                </button>
            )}

            <div className="flex border-b border-white/10 mb-2">
                <button onClick={() => setActiveEnemyTab('DRONE')} className={`flex-1 py-1 text-[9px] font-bold tracking-wider transition-colors ${activeEnemyTab === 'DRONE' ? 'bg-cyan-900/50 text-cyan-400' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>DRONE</button>
                <div className="w-[1px] bg-white/10" />
                <button onClick={() => setActiveEnemyTab('NEW_WALKER')} className={`flex-1 py-1 text-[9px] font-bold tracking-wider transition-colors ${activeEnemyTab === 'NEW_WALKER' ? 'bg-red-900/50 text-red-400' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>NEW WALKER</button>
                <div className="w-[1px] bg-white/10" />
                <button onClick={() => setActiveEnemyTab('JUMPER')} className={`flex-1 py-1 text-[9px] font-bold tracking-wider transition-colors ${activeEnemyTab === 'JUMPER' ? 'bg-purple-900/50 text-purple-400' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>JUMPER</button>
            </div>
            {activeEnemyTab === 'DRONE' && (
                <div className="animate-in fade-in duration-200">
                    <div className="text-[9px] font-bold text-yellow-500 border-b border-white/10 mt-2 mb-2 pb-0.5">SENSORS & AI</div>
                    <PhysicsSlider label="VIEW DIST (TILES)" value={enemyConfig.droneViewDist} min={0} max={20} step={0.5} onChange={(v) => updateEnemy('droneViewDist', v)} />
                    <PhysicsSlider label="VIEW ANGLE" value={enemyConfig.droneViewAngle} min={0} max={360} step={1} onChange={(v) => updateEnemy('droneViewAngle', v)} />
                    <PhysicsSlider label="CHASE DIST" value={enemyConfig.droneChaseViewDist || 6.0} min={0} max={20} step={0.5} onChange={(v) => updateEnemy('droneChaseViewDist', v)} />
                    <PhysicsSlider label="CHASE ANGLE" value={enemyConfig.droneChaseViewAngle || 180} min={0} max={180} step={1} onChange={(v) => updateEnemy('droneChaseViewAngle', v)} />
                    <PhysicsSlider label="LOST TIME" value={enemyConfig.droneLostThreshold} min={0} max={10} step={0.1} onChange={(v) => updateEnemy('droneLostThreshold', v)} />
                    <PhysicsSlider label="SURPRISE TIME" value={enemyConfig.droneSurpriseTime ?? 0.5} min={0} max={2.0} step={0.1} onChange={(v) => updateEnemy('droneSurpriseTime', v)} />
                    <PhysicsSlider label="CHEAT LKP DIST" value={enemyConfig.droneCheatLKPDistance ?? 200} min={0} max={1000} step={10} onChange={(v) => updateEnemy('droneCheatLKPDistance', v)} />
                    <PhysicsSlider label="SCAN RADIUS" value={enemyConfig.droneScanRadius ?? 600} min={100} max={2000} step={50} onChange={(v) => updateEnemy('droneScanRadius', v)} />
                    <PhysicsSlider label="SCAN DURATION" value={enemyConfig.droneScanDuration ?? 2.0} min={0.1} max={5.0} step={0.1} onChange={(v) => updateEnemy('droneScanDuration', v)} />
                    <div className="text-[9px] font-bold text-yellow-500 border-b border-white/10 mt-2 mb-2 pb-0.5">MOVEMENT</div>
                    <PhysicsSlider label="PATROL SPEED (PPS)" value={enemyConfig.dronePatrolSpeed} min={0} max={500} step={1} onChange={(v) => updateEnemy('dronePatrolSpeed', v)} />
                    <PhysicsSlider label="CHASE SPEED (PPS)" value={enemyConfig.droneChaseSpeed} min={0} max={500} step={1} onChange={(v) => updateEnemy('droneChaseSpeed', v)} />
                    <PhysicsSlider label="ACCELERATION" value={enemyConfig.droneAccel} min={0.1} max={1.0} step={0.01} onChange={(v) => updateEnemy('droneAccel', v)} />
                    <PhysicsSlider label="DRAG" value={enemyConfig.droneDrag} min={0.5} max={0.999} step={0.001} onChange={(v) => updateEnemy('droneDrag', v)} />
                    <PhysicsSlider label="WAYPOINT RAD" value={enemyConfig.droneWaypointThreshold || 25} min={5} max={100} step={1} onChange={(v) => updateEnemy('droneWaypointThreshold', v)} />
                    <div className="text-[9px] font-bold text-purple-500 border-b border-white/10 mt-2 mb-2 pb-0.5">DRONE - COLLISION & DEATH</div>
                    <PhysicsSlider label="IMPACT THRESHOLD" value={enemyConfig.droneImpactExplodeSpeed ?? 15} min={1} max={50} step={1} onChange={(v) => updateEnemy('droneImpactExplodeSpeed', v)} />
                    <PhysicsSlider label="DEATH DURATION" value={enemyConfig.droneDeathDuration ?? 3.0} min={0} max={10.0} step={0.1} onChange={(v) => updateEnemy('droneDeathDuration', v)} />
                    <PhysicsSlider label="PUSH FORCE" value={enemyConfig.droneCollisionPush ?? 5.0} min={0} max={20} step={0.5} onChange={(v) => updateEnemy('droneCollisionPush', v)} />
                    <div className="mt-2 mb-2 border-t border-white/10 pt-1 flex flex-col gap-1">
                        <Toggle label="SHOW CONES" value={drawConfig.showDroneViewCones} onChange={(v) => updateDrawConfig('showDroneViewCones', v)} />
                    </div>
                    <div className="text-[9px] font-bold text-yellow-500 border-b border-white/10 mt-2 mb-2 pb-0.5">SHOOTER (AIM)</div>
                    <PhysicsSlider label="FIRE RATE" value={enemyConfig.aimFireRate} min={0} max={30.0} step={0.1} onChange={(v) => updateEnemy('aimFireRate', v)} />
                    <PhysicsSlider label="FIRST DELAY" value={enemyConfig.aimFirstShotDelay || 1.0} min={0} max={5.0} step={0.1} onChange={(v) => updateEnemy('aimFirstShotDelay', v)} />
                    <PhysicsSlider label="BACK IN SIGHT" value={enemyConfig.aimBackInSightDelay ?? 0.5} min={0} max={3.0} step={0.1} onChange={(v) => updateEnemy('aimBackInSightDelay', v)} />
                    <PhysicsSlider label="SPEED" value={enemyConfig.aimSpeed} min={1} max={20} step={0.5} onChange={(v) => updateEnemy('aimSpeed', v)} />
                </div>
            )}
            {activeEnemyTab === 'NEW_WALKER' && (
                <div className="animate-in fade-in duration-200">
                    <div className="text-[9px] font-bold text-red-500 border-b border-white/10 mt-2 mb-2 pb-0.5">MOVEMENT & AI</div>
                    <PhysicsSlider label="WALK SPEED" value={enemyConfig.walkerSpeed} min={0} max={10} step={0.1} onChange={(v) => updateEnemy('walkerSpeed', v)} />
                    <PhysicsSlider label="CHASE SPEED" value={enemyConfig.walkerChaseSpeed} min={0} max={15} step={0.1} onChange={(v) => updateEnemy('walkerChaseSpeed', v)} />

                    <div className="text-[9px] font-bold text-yellow-500 border-b border-white/10 mt-2 mb-2 pb-0.5">DETECTION</div>
                    <PhysicsSlider label="VIEW DIST (PX)" value={enemyConfig.walkerViewDist} min={100} max={1000} step={10} onChange={(v) => updateEnemy('walkerViewDist', v)} />
                    <PhysicsSlider label="VIEW HEIGHT (PX)" value={enemyConfig.walkerViewHeight} min={10} max={500} step={10} onChange={(v) => updateEnemy('walkerViewHeight', v)} />
                    <PhysicsSlider label="SURPRISE TIME" value={enemyConfig.walkerSurpriseTime ?? 0.5} min={0} max={2.0} step={0.1} onChange={(v) => updateEnemy('walkerSurpriseTime', v)} />
                    <Toggle label="USE PATHFINDER" value={enemyConfig.walkerUsePathfinding ?? true} onChange={(v) => updateEnemy('walkerUsePathfinding', v)} />
                    <PhysicsSlider label="HEARING RANGE" value={enemyConfig.walkerHearingRadius ?? 100} min={10} max={500} step={10} onChange={(v) => updateEnemy('walkerHearingRadius', v)} />
                    <PhysicsSlider label="SOCIAL RANGE" value={enemyConfig.walkerSocialRange ?? 400} min={100} max={1000} step={50} onChange={(v) => updateEnemy('walkerSocialRange', v)} />

                    <div className="text-[9px] font-bold text-orange-500 border-b border-white/10 mt-2 mb-2 pb-0.5">SHOOTER / COMBAT</div>
                    <PhysicsSlider label="FIRE RATE" value={enemyConfig.walkerFireRate ?? 1.5} min={0} max={10.0} step={0.1} onChange={(v) => updateEnemy('walkerFireRate', v)} />
                    <PhysicsSlider label="TELEGRAPH (CHRG)" value={enemyConfig.walkerTelegraphTime ?? 0.5} min={0} max={2.0} step={0.1} onChange={(v) => updateEnemy('walkerTelegraphTime', v)} />
                    <PhysicsSlider label="LEAD (AIM)" value={enemyConfig.walkerPredictiveLead ?? 1.0} min={0} max={2.0} step={0.1} onChange={(v) => updateEnemy('walkerPredictiveLead', v)} />
                    <PhysicsSlider label="BULLET SPEED" value={enemyConfig.walkerBulletSpeed ?? 6.0} min={1} max={20} step={0.5} onChange={(v) => updateEnemy('walkerBulletSpeed', v)} />
                    <PhysicsSlider label="BULLET SIZE" value={enemyConfig.walkerBulletSize ?? 10} min={1} max={50} step={1} onChange={(v) => updateEnemy('walkerBulletSize', v)} />
                    <PhysicsSlider label="FIRST DELAY" value={enemyConfig.walkerFirstShotDelay ?? 0.5} min={0} max={5.0} step={0.1} onChange={(v) => updateEnemy('walkerFirstShotDelay', v)} />
                    <PhysicsSlider label="BACK IN SIGHT" value={enemyConfig.walkerBackInSightDelay ?? 0.5} min={0} max={3.0} step={0.1} onChange={(v) => updateEnemy('walkerBackInSightDelay', v)} />

                    <div className="text-[9px] font-bold text-purple-500 border-b border-white/10 mt-2 mb-2 pb-0.5">VISUALS & DEBUG</div>
                    <div className="mt-1 flex flex-col gap-1">
                        <Toggle label="SHOW CONES" value={drawConfig.showWalkerViewCones} onChange={(v) => updateDrawConfig('showWalkerViewCones', v)} />
                        <Toggle label="SHOW COLLIDERS" value={drawConfig.showWalkerColliders} onChange={(v) => updateDrawConfig('showWalkerColliders', v)} />
                        <Toggle label="SHOW HEARING" value={drawConfig.showWalkerHearingRange} onChange={(v) => updateDrawConfig('showWalkerHearingRange', v)} />
                        <Toggle label="SHOW SOCIAL" value={drawConfig.showWalkerSocialRange} onChange={(v) => updateDrawConfig('showWalkerSocialRange', v)} />
                    </div>
                </div>
            )}
            {activeEnemyTab === 'JUMPER' && (
                <div className="animate-in fade-in duration-200">
                    <div className="text-[9px] font-bold text-purple-500 border-b border-white/10 mt-2 mb-2 pb-0.5">PHYSICS & GRAPH</div>
                    <PhysicsSlider label="MAX SPEED" value={enemyConfig.jumperMaxSpeed ?? 3.5} min={1} max={10} step={0.1} onChange={(v) => updateEnemy('jumperMaxSpeed', v)} />
                    <PhysicsSlider label="JUMP FORCE" value={enemyConfig.jumperJumpForce ?? -14.0} min={-25} max={-5} step={0.5} onChange={(v) => updateEnemy('jumperJumpForce', v)} />
                    <PhysicsSlider label="GRAVITY" value={enemyConfig.jumperGravity ?? 0.8} min={0.1} max={2.0} step={0.05} onChange={(v) => updateEnemy('jumperGravity', v)} />

                    <div className="text-[9px] font-bold text-purple-500 border-b border-white/10 mt-2 mb-2 pb-0.5">PLATFORM RIDING</div>
                    <PhysicsSlider label="PRED DRAG" value={enemyConfig.jumperPredictionDrag ?? 0} min={0} max={2.0} step={0.05} onChange={(v) => updateEnemy('jumperPredictionDrag', v)} />
                    <PhysicsSlider label="PRED BUFFER" value={enemyConfig.jumperPredictionBuffer ?? 0} min={0} max={60} step={1} onChange={(v) => updateEnemy('jumperPredictionBuffer', v)} />

                    <div className="text-[9px] font-bold text-orange-500 border-b border-white/10 mt-2 mb-2 pb-0.5">WALL CLIMB</div>
                    <PhysicsSlider label="KICKOFF X" value={enemyConfig.jumperWallClimbKickOffX ?? 6.0} min={1} max={20} step={0.5} onChange={(v) => updateEnemy('jumperWallClimbKickOffX', v)} />
                    <PhysicsSlider label="KICKOFF Y" value={enemyConfig.jumperWallClimbKickOffY ?? -14.0} min={-30} max={-5} step={0.5} onChange={(v) => updateEnemy('jumperWallClimbKickOffY', v)} />
                    <PhysicsSlider label="AIR ACCEL" value={enemyConfig.jumperWallClimbAirAccel ?? 0.2} min={0} max={2.0} step={0.05} onChange={(v) => updateEnemy('jumperWallClimbAirAccel', v)} />
                    <PhysicsSlider label="RE-ENGAGE Y" value={enemyConfig.jumperWallClimbReengageY ?? -2.0} min={-15} max={5.0} step={0.5} onChange={(v) => updateEnemy('jumperWallClimbReengageY', v)} />
                </div>
            )}
        </>
    );

    const renderSection = () => {
        switch (activeDebugSection) {
            case 'ENGINE':
                return (
                    <>
                        <div className="text-[9px] font-bold text-yellow-500 border-b border-white/10 mt-2 mb-2 pb-0.5">GAME SPEED</div>
                        <PhysicsSlider label="TIME SCALE" value={timeScale} min={0} max={2.0} step={0.1} onChange={(v) => setTimeScale(v)} onShowHelp={setActiveTooltip} />
                    </>
                );
            case 'ENEMIES':
                return renderEnemySection();
            case 'PATH':
                return (
                    <>
                        <SectionSave data={pathfindingConfig} name="PATHFINDING" />
                        <div className="text-[9px] font-bold text-yellow-500 border-b border-white/10 mt-2 mb-2 pb-0.5">NODE WEIGHTS</div>
                        <PhysicsSlider label="DEFAULT COST (GREEN)" value={pathfindingConfig.defaultCost} min={1} max={10} step={1} onChange={(v) => updatePathfinding('defaultCost', v)} />
                        <PhysicsSlider label="BLOCKED COST (RED)" value={pathfindingConfig.blockedCost} min={10} max={2000} step={10} onChange={(v) => updatePathfinding('blockedCost', v)} />
                        <div className="text-[9px] font-bold text-yellow-500 border-b border-white/10 mt-2 mb-2 pb-0.5">GENERATION</div>
                        <PhysicsSlider label="NODE CLEARANCE (SIZE)" value={pathfindingConfig.nodeClearance} min={1} max={50} step={1} onChange={(v) => updatePathfinding('nodeClearance', v)} />
                        <div className="mt-2 mb-2 border-t border-white/10 pt-1 flex flex-col gap-1">
                            <Toggle label="SHOW LOGIC" value={drawConfig.showEnemyLogic} onChange={(v) => updateDrawConfig('showEnemyLogic', v)} />
                            <Toggle label="SHOW NODES" value={drawConfig.showPathfindingNodes} onChange={(v) => updateDrawConfig('showPathfindingNodes', v)} />
                        </div>
                    </>
                );
            case 'PHYSICS':
                return (
                    <>
                        <SectionSave data={physicsConfig} name="PHYSICS" />
                        <div className="flex gap-1 mb-2">
                            <select value={activeProfile} onChange={(e) => setActiveProfile(e.target.value)} className="flex-1 bg-white/10 text-white text-[10px] rounded p-1 border border-white/20 outline-none">
                                {Object.keys(physicsProfiles).map(name => (<option key={name} value={name}>{name}</option>))}
                            </select>
                            <button onClick={createProfile} className="px-2 bg-green-600/50 hover:bg-green-600 rounded text-[10px]">+</button>
                        </div>
                        <div className="text-[9px] font-bold text-yellow-500 border-b border-white/10 mt-2 mb-2 pb-0.5">MOVEMENT</div>
                        <PhysicsSlider label="GRAVITY" value={physicsConfig.GRAVITY} min={0} max={2} step={0.05} onChange={(v) => updatePhysics('GRAVITY', v)} onShowHelp={setActiveTooltip} />
                        <PhysicsSlider label="ASCENT GRAVITY MULT" value={physicsConfig.GRAVITY_ASCENT_MULTIPLIER ?? 1.0} min={0.1} max={2.0} step={0.05} onChange={(v) => updatePhysics('GRAVITY_ASCENT_MULTIPLIER', v)} onShowHelp={setActiveTooltip} />
                        <PhysicsSlider label="DESCENT GRAVITY MULT" value={physicsConfig.GRAVITY_DESCENT_MULTIPLIER ?? 1.0} min={0.1} max={3.0} step={0.05} onChange={(v) => updatePhysics('GRAVITY_DESCENT_MULTIPLIER', v)} onShowHelp={setActiveTooltip} />
                        <PhysicsSlider label="JUMP FORCE" value={physicsConfig.JUMP_FORCE} min={-30} max={-5} step={0.5} onChange={(v) => updatePhysics('JUMP_FORCE', v)} onShowHelp={setActiveTooltip} />
                        <PhysicsSlider label="DOUBLE JUMP" value={physicsConfig.DOUBLE_JUMP_FORCE} min={-30} max={-5} step={0.5} onChange={(v) => updatePhysics('DOUBLE_JUMP_FORCE', v)} onShowHelp={setActiveTooltip} />
                        <PhysicsSlider label="MAX SPEED" value={physicsConfig.MAX_SPEED} min={5} max={40} step={1} onChange={(v) => updatePhysics('MAX_SPEED', v)} onShowHelp={setActiveTooltip} />
                        <PhysicsSlider label="DIVING FORCE" value={physicsConfig.DIVING_FORCE || 1.0} min={0} max={5} step={0.1} onChange={(v) => updatePhysics('DIVING_FORCE', v)} onShowHelp={setActiveTooltip} />
                        <PhysicsSlider label="BOUNCY RESTITUTION Y" value={physicsConfig.BOUNCY_BLOCK_RESTITUTION_Y ?? 1.3} min={0} max={2.0} step={0.01} onChange={(v) => updatePhysics('BOUNCY_BLOCK_RESTITUTION_Y', v)} onShowHelp={setActiveTooltip} />
                        <PhysicsSlider label="BOUNCY RESTITUTION X" value={physicsConfig.BOUNCY_BLOCK_RESTITUTION_X ?? 1.0} min={0} max={5} step={0.01} onChange={(v) => updatePhysics('BOUNCY_BLOCK_RESTITUTION_X', v)} onShowHelp={setActiveTooltip} />
                        <PhysicsSlider label="BOUNCY MIN SPEED" value={physicsConfig.BOUNCY_MIN_SPEED ?? 20.0} min={5} max={50} step={1} onChange={(v) => updatePhysics('BOUNCY_MIN_SPEED', v)} onShowHelp={setActiveTooltip} />
                        <PhysicsSlider label="DEFLECT FORCE" value={physicsConfig.PROJECTILE_DEFLECTION_FORCE ?? 1.8} min={1.0} max={5.0} step={0.1} onChange={(v) => updatePhysics('PROJECTILE_DEFLECTION_FORCE', v)} onShowHelp={setActiveTooltip} />
                        <PhysicsSlider label="ACCEL GROUND" value={physicsConfig.ACCEL_GROUND} min={0.1} max={10} step={0.1} onChange={(v) => updatePhysics('ACCEL_GROUND', v)} onShowHelp={setActiveTooltip} />
                        <PhysicsSlider label="ACCEL GROUND EXP" value={physicsConfig.ACCEL_GROUND_EXPONENT} min={0} max={2} step={0.1} onChange={(v) => updatePhysics('ACCEL_GROUND_EXPONENT', v)} />
                        <PhysicsSlider label="ACCEL AIR" value={physicsConfig.ACCEL_AIR} min={0.1} max={2.0} step={0.01} onChange={(v) => updatePhysics('ACCEL_AIR', v)} onShowHelp={setActiveTooltip} />
                        <PhysicsSlider label="SPIN AIR ACCEL" value={physicsConfig.SPIN_AIR_ACCEL ?? 0.75} min={0.1} max={2.0} step={0.01} onChange={(v) => updatePhysics('SPIN_AIR_ACCEL', v)} />
                        
                        <PhysicsSlider label="FRICTION" value={physicsConfig.FRICTION} min={0.5} max={0.99} step={0.01} onChange={(v) => updatePhysics('FRICTION', v)} onShowHelp={setActiveTooltip} />
                        <PhysicsSlider label="AIR FRICTION (STOP)" value={physicsConfig.AIR_FRICTION} min={0.5} max={0.99} step={0.01} onChange={(v) => updatePhysics('AIR_FRICTION', v)} onShowHelp={setActiveTooltip} />
                        <PhysicsSlider label="AIR FRICTION (MOVE)" value={physicsConfig.AIR_FRICTION_ACTIVE ?? 1.0} min={0.5} max={1.0} step={0.01} onChange={(v) => updatePhysics('AIR_FRICTION_ACTIVE', v)} onShowHelp={setActiveTooltip} />
                        
                        <PhysicsSlider label="MAX FALL VEL" value={physicsConfig.MAX_FALL_VELOCITY} min={10} max={60} step={1} onChange={(v) => updatePhysics('MAX_FALL_VELOCITY', v)} onShowHelp={setActiveTooltip} />
                        <div className="text-[9px] font-bold text-yellow-500 border-b border-white/10 mt-2 mb-2 pb-0.5">TIMERS</div>
                        <PhysicsSlider label="COYOTE TIME" value={physicsConfig.COYOTE_TIME} min={0} max={20} step={1} onChange={(v) => updatePhysics('COYOTE_TIME', v)} />
                        <PhysicsSlider label="JUMP BUFFER" value={physicsConfig.JUMP_BUFFER} min={0} max={20} step={1} onChange={(v) => updatePhysics('JUMP_BUFFER', v)} />
                        <div className="text-[9px] font-bold text-yellow-500 border-b border-white/10 mt-2 mb-2 pb-0.5">WALL INTERACTIONS</div>
                        <PhysicsSlider label="SLIDE SPEED" value={physicsConfig.WALL_SLIDE_SPEED} min={0} max={4} step={0.01} onChange={(v) => updatePhysics('WALL_SLIDE_SPEED', v)} onShowHelp={setActiveTooltip} />
                        <PhysicsSlider label="WALL JUMP X" value={physicsConfig.WALL_JUMP_X} min={0} max={10} step={0.01} onChange={(v) => updatePhysics('WALL_JUMP_X', v)} onShowHelp={setActiveTooltip} />
                        <PhysicsSlider label="WALL JUMP Y" value={physicsConfig.WALL_JUMP_Y} min={-15} max={0} step={0.01} onChange={(v) => updatePhysics('WALL_JUMP_Y', v)} onShowHelp={setActiveTooltip} />
                        <PhysicsSlider label="WALL GRACE" value={physicsConfig.WALL_JUMP_GRACE_PERIOD} min={0} max={30} step={1} onChange={(v) => updatePhysics('WALL_JUMP_GRACE_PERIOD', v)} onShowHelp={setActiveTooltip} />
                        <Toggle label="LONG INPUT WALLJUMP" value={!!physicsConfig.WALL_JUMP_INPUT_INFLUENCE} onChange={(v) => updatePhysics('WALL_JUMP_INPUT_INFLUENCE', v)} />
                        <div className="text-[9px] font-bold text-yellow-500 border-b border-white/10 mt-2 mb-2 pb-0.5">CEILING TRAVERSAL</div>
                        <PhysicsSlider label="CEILING SPEED" value={physicsConfig.CEILING_SPEED ?? 6.0} min={1} max={20} step={0.5} onChange={(v) => updatePhysics('CEILING_SPEED', v)} onShowHelp={setActiveTooltip} />
                        <PhysicsSlider label="CEILING ACCEL" value={physicsConfig.CEILING_ACCEL ?? 10.0} min={1} max={20} step={0.5} onChange={(v) => updatePhysics('CEILING_ACCEL', v)} onShowHelp={setActiveTooltip} />
                        <div className="text-[9px] font-bold text-yellow-500 border-b border-white/10 mt-2 mb-2 pb-0.5">ROTATION</div>
                        <Toggle label="ACCELERATING SPIN" value={!!physicsConfig.SPIN_ACCELERATION_ENABLED} onChange={(v) => updatePhysics('SPIN_ACCELERATION_ENABLED', v)} onShowHelp={setActiveTooltip} />
                        {physicsConfig.SPIN_ACCELERATION_ENABLED && (
                            <>
                                <PhysicsSlider label="SPIN ACCEL" value={physicsConfig.SPIN_ACCELERATION_RATE || 0.005} min={0.001} max={0.1} step={0.001} onChange={(v) => updatePhysics('SPIN_ACCELERATION_RATE', v)} onShowHelp={setActiveTooltip} />
                                <PhysicsSlider label="SPIN DECEL" value={physicsConfig.SPIN_DECELERATION_RATE ?? 0.005} min={0} max={0.3} step={0.001} onChange={(v) => updatePhysics('SPIN_DECELERATION_RATE', v)} />
                                <PhysicsSlider label="MAX SPIN" value={physicsConfig.SPIN_MAX_SPEED || 0.5} min={0.1} max={2.0} step={0.05} onChange={(v) => updatePhysics('SPIN_MAX_SPEED', v)} onShowHelp={setActiveTooltip} />
                                <PhysicsSlider label="SPIN START DELAY" value={physicsConfig.SPIN_START_DELAY || 0.1} min={0} max={0.5} step={0.01} onChange={(v) => updatePhysics('SPIN_START_DELAY', v)} />
                                <div className="mt-2 border-t border-white/10 pt-2">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[9px] font-bold text-white/70 tracking-wider">SPIN ARC MODE</span>
                                        <select value={physicsConfig.SPIN_EFFECT_MODE || 0} onChange={(e) => updatePhysics('SPIN_EFFECT_MODE', parseInt(e.target.value))} className="w-24 bg-white/10 text-right text-[10px] font-mono text-cyan-400 p-1 rounded border border-white/20 outline-none focus:border-cyan-400">
                                            <option value="0">Disabled</option>
                                            <option value="1">Low Gravity</option>
                                            <option value="2">Lift Force</option>
                                            <option value="3">Apex Hang</option>
                                        </select>
                                    </div>
                                    {(physicsConfig.SPIN_EFFECT_MODE || 0) > 0 && (
                                        <>
                                            <PhysicsSlider label="SPIN ARC STRENGTH" value={physicsConfig.SPIN_EFFECT_STRENGTH || 0.5} min={0.1} max={2.0} step={0.1} onChange={(v) => updatePhysics('SPIN_EFFECT_STRENGTH', v)} onShowHelp={setActiveTooltip} />
                                            <PhysicsSlider label="SPIN ARC DECAY" value={physicsConfig.SPIN_EFFECT_DECAY || 0} min={0} max={2.0} step={0.1} onChange={(v) => updatePhysics('SPIN_EFFECT_DECAY', v)} onShowHelp={setActiveTooltip} />
                                        </>
                                    )}
                                </div>
                            </>
                        )}
                    </>
                );
            case 'DEFORM':
                return (
                    <>
                        <SectionSave data={deformationConfig} name="DEFORMATION" />
                        <div className="flex gap-1 mb-2">
                            <select value={activeDeformationProfile} onChange={(e) => setActiveDeformationProfile(e.target.value)} className="flex-1 bg-white/10 text-white text-[10px] rounded p-1 border border-white/20 outline-none">
                                {Object.keys(deformationProfiles).map(name => (<option key={name} value={name}>{name}</option>))}
                            </select>
                            <button onClick={createDeformationProfile} className="px-2 bg-green-600/50 hover:bg-green-600 rounded text-[10px]">+</button>
                        </div>
                        <div className="text-[9px] font-bold text-yellow-500 border-b border-white/10 mt-2 mb-2 pb-0.5">SPRING PHYSICS</div>
                        <NumberInput label="Stiffness" value={deformationConfig.stiffness} onChange={(v) => updateDeformation('stiffness', v)} onShowHelp={setActiveTooltip} />
                        <NumberInput label="Damping" value={deformationConfig.damping} onChange={(v) => updateDeformation('damping', v)} onShowHelp={setActiveTooltip} />
                        <NumberInput label="Max Scale" value={deformationConfig.maxScale} onChange={(v) => updateDeformation('maxScale', v)} onShowHelp={setActiveTooltip} />
                        <NumberInput label="Min Scale" value={deformationConfig.minScale} onChange={(v) => updateDeformation('minScale', v)} />
                        <div className="text-[9px] font-bold text-yellow-500 border-b border-white/10 mt-2 mb-2 pb-0.5">MOVEMENT STATES</div>
                        <NumberInput label="Run Stretch (X)" value={deformationConfig.runStretchAmount} onChange={(v) => updateDeformation('runStretchAmount', v)} onShowHelp={setActiveTooltip} />
                        <NumberInput label="Fall Stretch (Y)" value={deformationConfig.fallStretchAmount} onChange={(v) => updateDeformation('fallStretchAmount', v)} onShowHelp={setActiveTooltip} />
                        <NumberInput label="Spin Fall Stretch" value={deformationConfig.spinFallStretchAmount ?? deformationConfig.fallStretchAmount} onChange={(v) => updateDeformation('spinFallStretchAmount', v)} />
                        <div className="text-[9px] font-bold text-white/50 border-b border-white/10 mt-2 mb-1 pb-0.5">TRANSITION CONTROL</div>
                        <NumberInput label="Max Fall Stretch" value={deformationConfig.maxFallStretch ?? 10.0} onChange={(v) => updateDeformation('maxFallStretch', v)} />
                        <PhysicsSlider label="Morph Speed (Lerp)" value={deformationConfig.shapeMorphSpeed ?? 1.0} min={0.01} max={1.0} step={0.01} onChange={(v) => updateDeformation('shapeMorphSpeed', v)} onShowHelp={setActiveTooltip} />
                        <div className="text-[9px] font-bold text-white/50 border-b border-white/10 mt-2 mb-1 pb-0.5">ROTATION SNAPPING</div>
                        <NumberInput label="Snap Speed" value={deformationConfig.rotationSnapSpeed ?? 0.2} onChange={(v) => updateDeformation('rotationSnapSpeed', v)} step={0.01} onShowHelp={setActiveTooltip} />
                        <NumberInput label="Snap Interval (Deg)" value={deformationConfig.rotationSnapIntervalDeg ?? 90} onChange={(v) => updateDeformation('rotationSnapIntervalDeg', v)} step={15} />
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] font-bold text-white/70 tracking-wider">Snap Direction</span>
                            <select value={deformationConfig.rotationSnapCondition ?? 0} onChange={(e) => updateDeformation('rotationSnapCondition', parseInt(e.target.value))} className="w-16 bg-white/10 text-right text-[10px] font-mono text-cyan-400 p-1 rounded border border-white/20 outline-none focus:border-cyan-400">
                                <option value="0">Both</option>
                                <option value="1">CW</option>
                                <option value="-1">CCW</option>
                            </select>
                        </div>
                        <PhysicsSlider label="Land Rot Lerp" value={deformationConfig.rotationGroundLerp ?? 0.2} min={0.01} max={1.0} step={0.01} onChange={(v) => updateDeformation('rotationGroundLerp', v)} onShowHelp={setActiveTooltip} />
                        <div className="text-[9px] font-bold text-yellow-500 border-b border-white/10 mt-2 mb-2 pb-0.5">IMPULSES</div>
                        <NumberInput label="Jump Squash X" value={deformationConfig.jumpSquashX} onChange={(v) => updateDeformation('jumpSquashX', v)} onShowHelp={setActiveTooltip} />
                        <NumberInput label="Jump Squash Y" value={deformationConfig.jumpSquashY} onChange={(v) => updateDeformation('jumpSquashY', v)} onShowHelp={setActiveTooltip} />
                        <NumberInput label="Wall Jump Sq X" value={deformationConfig.wallJumpSquashX} onChange={(v) => updateDeformation('wallJumpSquashX', v)} />
                        <NumberInput label="Wall Jump Sq Y" value={deformationConfig.wallJumpSquashY} onChange={(v) => updateDeformation('wallJumpSquashY', v)} />
                        <div className="text-[9px] font-bold text-white/50 border-b border-white/10 mt-2 mb-1 pb-0.5">LANDING</div>
                        <NumberInput label="Squash Y (Impact)" value={deformationConfig.landSquashY ?? 0.03} onChange={(v) => updateDeformation('landSquashY', v)} step={0.001} onShowHelp={setActiveTooltip} />
                        <NumberInput label="Squash X (Expand)" value={deformationConfig.landSquashX ?? 0.015} onChange={(v) => updateDeformation('landSquashX', v)} step={0.001} />
                        <div className="text-[9px] font-bold text-yellow-500 border-b border-white/10 mt-2 mb-2 pb-0.5">ACTIONS</div>
                        <NumberInput label="Double Jump Y" value={deformationConfig.doubleJumpVelY} onChange={(v) => updateDeformation('doubleJumpVelY', v)} />
                        <NumberInput label="Double Jump XZ" value={deformationConfig.doubleJumpVelXZ} onChange={(v) => updateDeformation('doubleJumpVelXZ', v)} />
                    </>
                );
            case 'GRID':
                return (
                    <>
                        <SectionSave data={gridConfig} name="GRID" />
                        <Toggle label="VISIBLE" value={gridConfig.visible} onChange={(v) => updateGrid('visible', v)} />
                        <Toggle label="RIGID" value={gridConfig.rigid} onChange={(v) => updateGrid('rigid', v)} />
                        <div className="text-[9px] font-bold text-yellow-500 border-b border-white/10 mt-2 mb-2 pb-0.5">SETTINGS</div>
                        <PhysicsSlider label="FREQ" value={gridConfig.frequency} min={0.001} max={0.2} step={0.001} onChange={(v) => updateGrid('frequency', v)} onShowHelp={setActiveTooltip} />
                        <PhysicsSlider label="AMP" value={gridConfig.amplitude} min={0} max={20} step={0.1} onChange={(v) => updateGrid('amplitude', v)} onShowHelp={setActiveTooltip} />
                        <PhysicsSlider label="SPEED" value={gridConfig.speed} min={0} max={10} step={0.1} onChange={(v) => updateGrid('speed', v)} onShowHelp={setActiveTooltip} />
                        <div className="text-[9px] font-bold text-yellow-500 border-b border-white/10 mt-2 mb-2 pb-0.5">COLORS</div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] font-bold text-white/70 tracking-wider">LINES</span>
                            <div className="w-12 h-4"><ColorInput value={gridConfig.lineColor} onChange={(v) => updateGrid('lineColor', v)} /></div>
                        </div>
                    </>
                );
            case 'VISUALS':
                return (
                    <>
                        <div className="flex gap-2">
                            <div className="flex-1"><SectionSave data={visualConfig} name="THEME" /></div>
                            <div className="flex-1"><SectionSave data={rainbowConfig} name="RAINBOW" /></div>
                        </div>
                        <div className="text-[9px] font-bold text-yellow-500 border-b border-white/10 mt-2 mb-2 pb-0.5">DEPTHS</div>
                        <PhysicsSlider label="PLATFORM DEPTH" value={visualConfig.platformDepth} min={60} max={100} step={1} onChange={(v) => updateVisual('platformDepth', v)} />
                        <PhysicsSlider label="WALL DEPTH" value={visualConfig.wallDepth} min={60} max={100} step={1} onChange={(v) => updateVisual('wallDepth', v)} />
                        <PhysicsSlider label="CUBE DEPTH" value={visualConfig.cubeDepth} min={60} max={100} step={1} onChange={(v) => updateVisual('cubeDepth', v)} />
                        <div className="text-[9px] font-bold text-yellow-500 border-b border-white/10 mt-2 mb-2 pb-0.5">OTHER</div>
                        <PhysicsSlider label="EDGE THICKNESS" value={visualConfig.edgeThickness} min={1} max={10} step={0.5} onChange={(v) => updateVisual('edgeThickness', v)} />
                        <PhysicsSlider label="RAINBOW SPEED" value={rainbowConfig.speed} min={0} max={2} step={0.1} onChange={(v) => updateRainbow('speed', v)} />
                        <div className="text-[9px] font-bold text-yellow-500 border-b border-white/10 mt-2 mb-2 pb-0.5 flex justify-between">
                            <span>MATERIALS</span>
                            <div className="flex gap-4 mr-2 text-[8px] opacity-50"><span>FILL</span><span>EDGE</span></div>
                        </div>
                        <MaterialRow label="PLATFORM" fill={visualConfig.platform.fillColor} edge={visualConfig.platform.edgeColor} onFillChange={(v) => updateVisual('platform', 'fillColor', v)} onEdgeChange={(v) => updateVisual('platform', 'edgeColor', v)} />
                        <MaterialRow label="WALL" fill={visualConfig.wall.fillColor} edge={visualConfig.wall.edgeColor} onFillChange={(v) => updateVisual('wall', 'fillColor', v)} onEdgeChange={(v) => updateVisual('wall', 'edgeColor', v)} />
                        <MaterialRow label="FLOOR" fill={visualConfig.floor.fillColor} edge={visualConfig.floor.edgeColor} onFillChange={(v) => updateVisual('floor', 'fillColor', v)} onEdgeChange={(v) => updateVisual('floor', 'edgeColor', v)} />
                        <MaterialRow label="CUBE" fill={visualConfig.cube.fillColor} edge={visualConfig.cube.edgeColor} onFillChange={(v) => updateVisual('cube', 'fillColor', v)} onEdgeChange={(v) => updateVisual('cube', 'edgeColor', v)} />
                        <MaterialRow label="MOVING" fill={visualConfig.moving.fillColor} edge={visualConfig.moving.edgeColor} onFillChange={(v) => updateVisual('moving', 'fillColor', v)} onEdgeChange={(v) => updateVisual('moving', 'edgeColor', v)} />

                        <MaterialRow label="VANISHING" fill={visualConfig.vanishing.fillColor} edge={visualConfig.vanishing.edgeColor} onFillChange={(v) => updateVisual('vanishing', 'fillColor', v)} onEdgeChange={(v) => updateVisual('vanishing', 'edgeColor', v)} />

                        <MaterialRow label="TUNNEL" fill={visualConfig.tunnel.fillColor} edge={visualConfig.tunnel.edgeColor} onFillChange={(v) => updateVisual('tunnel', 'fillColor', v)} onEdgeChange={(v) => updateVisual('tunnel', 'edgeColor', v)} />
                        <MaterialRow label="EXTRUSION" fill={visualConfig.extrusion.fillColor} edge={visualConfig.extrusion.edgeColor} onFillChange={(v) => updateVisual('extrusion', 'fillColor', v)} onEdgeChange={(v) => updateVisual('extrusion', 'edgeColor', v)} />
                        <MaterialRow label="BOUNCY" fill={visualConfig.bouncy.fillColor} edge={visualConfig.bouncy.edgeColor} onFillChange={(v) => updateVisual('bouncy', 'fillColor', v)} onEdgeChange={(v) => updateVisual('bouncy', 'edgeColor', v)} />
                        
                        <div className="mt-2 mb-2 border-t border-white/10 pt-1 flex flex-col gap-1">
                            <Toggle label="SHOW PLATFORM IDS" value={drawConfig.showPlatformIds} onChange={(v) => updateDrawConfig('showPlatformIds', v)} />
                        </div>
                    </>
                );
            case 'POST':
                return (
                    <>
                        <SectionSave data={postProcessConfig} name="POST FX" />
                        <div className="text-[9px] font-bold text-yellow-500 border-b border-white/10 mt-2 mb-2 pb-0.5">BLOOM</div>
                        <PhysicsSlider label="STRENGTH" value={postProcessConfig.bloomStrength} min={0} max={0.5} step={0.01} onChange={(v) => updatePostProcess('bloomStrength', v)} />
                        <PhysicsSlider label="RADIUS" value={postProcessConfig.bloomRadius} min={0} max={1.5} step={0.01} onChange={(v) => updatePostProcess('bloomRadius', v)} />
                        <PhysicsSlider label="THRESHOLD" value={postProcessConfig.bloomThreshold} min={0} max={1} step={0.01} onChange={(v) => updatePostProcess('bloomThreshold', v)} />
                        <div className="text-[9px] font-bold text-yellow-500 border-b border-white/10 mt-2 mb-2 pb-0.5">GRAIN & EFFECTS</div>
                        <PhysicsSlider label="GRAIN" value={postProcessConfig.grainStrength} min={0} max={1} step={0.01} onChange={(v) => updatePostProcess('grainStrength', v)} />
                    </>
                );
            case 'LIGHT':
                return (
                    <>
                        <SectionSave data={lightConfig} name="LIGHT" />
                        <Toggle label="SHOW HELPER" value={lightConfig.showHelper} onChange={(v) => updateLight('showHelper', v)} />
                        <div className="text-[9px] font-bold text-yellow-500 border-b border-white/10 mt-2 mb-2 pb-0.5">DIRECTIONAL</div>
                        <PhysicsSlider label="INTENSITY" value={lightConfig.dirIntensity} min={0} max={5} step={0.1} onChange={(v) => updateLight('dirIntensity', v)} />
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] font-bold text-white/70 tracking-wider">COLOR</span>
                            <div className="w-12 h-4"><ColorInput value={lightConfig.dirColor} onChange={(v) => updateLight('dirColor', v)} /></div>
                        </div>
                        <PhysicsSlider label="X" value={lightConfig.dirX} min={-2000} max={2000} step={10} onChange={(v) => updateLight('dirX', v)} />
                        <PhysicsSlider label="Y" value={lightConfig.dirY} min={-2000} max={2000} step={10} onChange={(v) => updateLight('dirY', v)} />
                        <PhysicsSlider label="Z" value={lightConfig.dirZ} min={-2000} max={2000} step={10} onChange={(v) => updateLight('dirZ', v)} />
                        
                        <div className="text-[9px] font-bold text-yellow-500 border-b border-white/10 mt-2 mb-2 pb-0.5">AMBIENT</div>
                        <PhysicsSlider label="INTENSITY" value={lightConfig.ambientIntensity} min={0} max={5} step={0.1} onChange={(v) => updateLight('ambientIntensity', v)} />
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] font-bold text-white/70 tracking-wider">COLOR</span>
                            <div className="w-12 h-4"><ColorInput value={lightConfig.ambientColor} onChange={(v) => updateLight('ambientColor', v)} /></div>
                        </div>
                    </>
                );
            case 'CAMERA':
                return (
                    <>
                        <SectionSave data={cameraConfig} name="CAMERA" />
                        <div className="text-[9px] font-bold text-yellow-500 border-b border-white/10 mt-2 mb-2 pb-0.5">FOLLOW</div>
                        <PhysicsSlider label="LERP FACTOR" value={cameraConfig.lerpFactor} min={0.01} max={1.0} step={0.01} onChange={(v) => updateCamera('lerpFactor', v)} onShowHelp={setActiveTooltip} />
                        <div className="text-[9px] font-bold text-yellow-500 border-b border-white/10 mt-2 mb-2 pb-0.5">OFFSETS</div>
                        <PhysicsSlider label="ZOOM (Z)" value={cameraConfig.z} min={100} max={2000} step={10} onChange={(v) => updateCamera('z', v)} onShowHelp={setActiveTooltip} />
                        <PhysicsSlider label="FOV" value={cameraConfig.fov} min={30} max={120} step={1} onChange={(v) => updateCamera('fov', v)} />
                        <PhysicsSlider label="OFFSET X" value={cameraConfig.offsetX} min={-500} max={500} step={10} onChange={(v) => updateCamera('offsetX', v)} />
                        <PhysicsSlider label="OFFSET Y" value={cameraConfig.offsetY} min={-500} max={500} step={10} onChange={(v) => updateCamera('offsetY', v)} />
                        <div className="text-[9px] font-bold text-yellow-500 border-b border-white/10 mt-2 mb-2 pb-0.5">EFFECTS</div>
                        <PhysicsSlider label="SHAKE FORCE" value={cameraConfig.landingShakeIntensity ?? 5.0} min={0} max={20} step={0.5} onChange={(v) => updateCamera('landingShakeIntensity', v)} />
                    </>
                );
        }
    };

    return (
        <div className="bg-black/90 p-2 rounded max-h-[600px] overflow-y-auto w-64 text-left border border-white/20 font-mono shadow-2xl backdrop-blur-md select-none scrollbar-hide">
            <div className="flex flex-wrap gap-1 mb-3 border-b border-white/10 pb-2">
                {sections.map(s => (
                    <button
                        key={s.id}
                        onClick={() => setActiveDebugSection(s.id === activeDebugSection ? null : s.id)}
                        className={`px-2 py-1 text-[9px] font-bold rounded transition-colors ${activeDebugSection === s.id ? 'bg-cyan-600 text-white' : 'bg-white/10 text-white/50 hover:bg-white/20'}`}
                    >
                        {s.label}
                    </button>
                ))}
                <button
                    onClick={resetConfig}
                    className="px-2 py-1 text-[9px] font-bold rounded bg-red-900/50 text-red-400 hover:bg-red-800 ml-auto"
                    title="Reset Config"
                >
                    RESET
                </button>
            </div>

            <div className="space-y-1">
                {renderSection()}
            </div>

            {activeTooltip && TOOLTIPS[activeTooltip] && (
                <TooltipPopup 
                    title={activeTooltip} 
                    data={TOOLTIPS[activeTooltip]} 
                    onClose={() => setActiveTooltip(null)} 
                />
            )}
        </div>
    );
};
    