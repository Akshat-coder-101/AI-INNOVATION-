"use client";

import React, { useEffect, useRef, useState } from "react";

interface AudioReactiveAvatarProps {
  audioRef?: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  isFallbackSpeaking?: boolean;
  size?: number;
  name?: string;
  subtitle?: string;
}

export default function AudioReactiveAvatar({
  audioRef,
  isPlaying,
  isFallbackSpeaking = false,
  size = 140,
  name = "Prof. Sahayak AI",
  subtitle = "Adaptive Lecture Studio",
}: AudioReactiveAvatarProps) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const [amplitude, setAmplitude] = useState<number>(0);

  // Initialize Web Audio API Analyser
  useEffect(() => {
    if (!audioRef?.current) return;

    const audioElement = audioRef.current;

    const setupAudioContext = () => {
      try {
        if (!audioCtxRef.current) {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (!AudioContextClass) return;
          audioCtxRef.current = new AudioContextClass();
        }

        if (audioCtxRef.current.state === "suspended") {
          audioCtxRef.current.resume();
        }

        if (!analyserRef.current && audioCtxRef.current) {
          const analyser = audioCtxRef.current.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.8;
          analyserRef.current = analyser;

          if (!sourceRef.current) {
            try {
              const source = audioCtxRef.current.createMediaElementSource(audioElement);
              source.connect(analyser);
              analyser.connect(audioCtxRef.current.destination);
              sourceRef.current = source;
            } catch (e) {
              // Element might already be connected
            }
          }
        }
      } catch (err) {
        console.warn("[AudioReactiveAvatar] Web Audio init error:", err);
      }
    };

    const handlePlay = () => setupAudioContext();
    audioElement.addEventListener("play", handlePlay);

    if (isPlaying) {
      setupAudioContext();
    }

    return () => {
      audioElement.removeEventListener("play", handlePlay);
    };
  }, [audioRef, isPlaying]);

  // Analyze audio frequency or simulate voice wave
  useEffect(() => {
    let fallbackPhase = 0;

    const checkAudio = () => {
      if (isPlaying) {
        if (analyserRef.current) {
          const bufferLength = analyserRef.current.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          analyserRef.current.getByteFrequencyData(dataArray);

          let sum = 0;
          const range = Math.min(32, bufferLength);
          for (let i = 4; i < range; i++) {
            sum += dataArray[i];
          }
          const amp = Math.min(1.0, (sum / (range - 4)) / 130);
          setAmplitude(amp);
        } else if (isFallbackSpeaking || isPlaying) {
          fallbackPhase += 0.22;
          const wave = (Math.sin(fallbackPhase) + Math.cos(fallbackPhase * 2.3) + 1.5) / 3.5;
          setAmplitude(0.25 + wave * 0.65);
        }
      } else {
        setAmplitude(0);
      }

      animFrameRef.current = requestAnimationFrame(checkAudio);
    };

    animFrameRef.current = requestAnimationFrame(checkAudio);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, isFallbackSpeaking]);

  const activeGlow = isPlaying ? Math.max(0.4, amplitude) : 0;

  return (
    <div className="flex flex-col items-center text-center select-none">
      {/* Outer Glow Halo & Circular Portrait */}
      <div 
        className="relative rounded-full transition-all duration-300 flex items-center justify-center"
        style={{
          width: size,
          height: size,
          boxShadow: isPlaying 
            ? `0 0 ${25 + activeGlow * 30}px rgba(0, 86, 210, ${0.4 + activeGlow * 0.4}), 0 0 ${45 + activeGlow * 20}px rgba(235, 110, 39, ${0.3 + activeGlow * 0.3})`
            : "none"
        }}
      >
        {/* Pulsing ring */}
        <div 
          className={`absolute -inset-1.5 rounded-full transition-all duration-300 ${
            isPlaying 
              ? "bg-gradient-to-tr from-primary via-accent to-highlight opacity-90 animate-pulse" 
              : "border-2 border-neutral-700 bg-neutral-800"
          }`}
          style={{
            transform: isPlaying ? `scale(${1.0 + activeGlow * 0.08})` : "scale(1)"
          }}
        />

        {/* Photorealistic Teacher Portrait */}
        <div 
          className="relative w-full h-full rounded-full overflow-hidden border-2 border-neutral-900 bg-neutral-900 z-10"
        >
          <img
            src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=400&auto=format&fit=crop"
            alt={name}
            className="w-full h-full object-cover object-center"
          />
        </div>
      </div>

      {/* Teacher Name & Subtitle */}
      {size >= 100 && (
        <div className="mt-3 space-y-0.5 z-10">
          <h4 className="text-white text-sm font-bold tracking-wide flex items-center justify-center gap-1.5 drop-shadow-sm">
            <span>{name}</span>
          </h4>
          {subtitle && (
            <p className="text-neutral-400 text-xs font-mono">
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Bouncing Audio Waveform Equalizer */}
      {isPlaying && size >= 80 && (
        <div className="flex items-center gap-1 mt-2.5 z-10">
          <span 
            className="w-1.5 bg-accent rounded-full animate-bounce transition-all duration-150"
            style={{ height: `${8 + activeGlow * 14}px` }}
          />
          <span 
            className="w-1.5 bg-highlight rounded-full animate-bounce [animation-delay:0.15s] transition-all duration-150"
            style={{ height: `${14 + activeGlow * 18}px` }}
          />
          <span 
            className="w-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.3s] transition-all duration-150"
            style={{ height: `${20 + activeGlow * 20}px` }}
          />
          <span 
            className="w-1.5 bg-accent rounded-full animate-bounce [animation-delay:0.45s] transition-all duration-150"
            style={{ height: `${12 + activeGlow * 16}px` }}
          />
          <span 
            className="w-1.5 bg-highlight rounded-full animate-bounce [animation-delay:0.6s] transition-all duration-150"
            style={{ height: `${7 + activeGlow * 10}px` }}
          />
        </div>
      )}
    </div>
  );
}
