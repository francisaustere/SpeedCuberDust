
import React, { useRef, useEffect, useState } from 'react';

interface MenuButtonProps {
    text: string;
    onClick: () => void;
    subText?: string;
    className?: string;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
}

export const MenuButton: React.FC<MenuButtonProps> = ({ text, onClick, subText, className, onMouseEnter, onMouseLeave }) => {
    const lettersRef = useRef<(HTMLSpanElement | null)[]>([]);
    const [isHovering, setIsHovering] = useState(false);

    useEffect(() => {
        let animationId: number;

        const animate = () => {
            const time = performance.now();

            lettersRef.current.forEach((letter, index) => {
                if (!letter) return;
                
                // Wavy Text
                const xOff = Math.sin((time * 0.1 + index * 50) * 0.02) * 3; 
                const yOff = Math.cos((time * 0.1) * 0.02) * 3;
                
                letter.style.transform = `translate(${xOff}px, ${yOff}px)`;
                
                // Hover Color Logic
                if (isHovering) {
                    const letterHue = (time * 0.1 + index * 30) % 360;
                    const color = `hsl(${letterHue}, 100%, 70%)`;
                    letter.style.color = color;
                    letter.style.textShadow = `0 0 20px ${color}`;
                } else {
                    letter.style.color = 'white';
                    letter.style.textShadow = 'none';
                }
            });

            animationId = requestAnimationFrame(animate);
        };

        animationId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationId);
    }, [isHovering]);

    return (
        <div className="flex flex-col items-center gap-0">
            <button 
                onClick={onClick}
                onMouseEnter={() => { setIsHovering(true); onMouseEnter?.(); }}
                onMouseLeave={() => { setIsHovering(false); onMouseLeave?.(); }}
                className={`relative group pointer-events-auto h-16 ${className || 'w-64'}`}
            >
                {/* Text Container */}
                <div className="absolute inset-0 flex items-center justify-center gap-4 overflow-visible">
                    {text.split('').map((char, i) => (
                        <span 
                            key={i} 
                            ref={(el) => { lettersRef.current[i] = el; }}
                            className="text-4xl font-bold font-mono pointer-events-none transition-colors duration-200 leading-none"
                        >
                            {char}
                        </span>
                    ))}
                </div>
            </button>
            {subText && (
                <span className="text-white/50 text-xs tracking-widest font-mono -mt-2">{subText}</span>
            )}
        </div>
    );
};
