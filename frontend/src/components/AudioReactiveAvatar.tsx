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
  subtitle = "Adaptive Lecture Presenter",
}: AudioReactiveAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
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

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let blinkTimer = 0;
    let isBlinking = false;
    let fallbackPhase = 0;

    const render = () => {
      let currentAmp = 0;

      if (isPlaying) {
        if (analyserRef.current) {
          const bufferLength = analyserRef.current.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          analyserRef.current.getByteFrequencyData(dataArray);

          // Calculate average energy in voice frequency range (index 4 to 32)
          let sum = 0;
          const range = Math.min(32, bufferLength);
          for (let i = 4; i < range; i++) {
            sum += dataArray[i];
          }
          currentAmp = Math.min(1.0, (sum / (range - 4)) / 140);
        } else if (isFallbackSpeaking || isPlaying) {
          // Simulated phoneme oscillation for speech synthesis fallback
          fallbackPhase += 0.22;
          const wave = (Math.sin(fallbackPhase) + Math.cos(fallbackPhase * 2.3) + 1.5) / 3.5;
          currentAmp = 0.2 + (wave * 0.65);
        }
      } else {
        currentAmp = 0;
      }

      setAmplitude(currentAmp);

      // Blinking timer logic
      blinkTimer += 1;
      if (blinkTimer > 180) {
        isBlinking = true;
        if (blinkTimer > 192) {
          isBlinking = false;
          blinkTimer = 0;
        }
      }

      // Draw avatar on canvas
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2 - 4;

      ctx.clearRect(0, 0, w, h);

      // 1. Audio-reactive pulsating outer aura rings
      if (currentAmp > 0.05) {
        const auraRadius = (w * 0.44) + (currentAmp * 16);
        const auraGrad = ctx.createRadialGradient(cx, cy, w * 0.3, cx, cy, auraRadius);
        auraGrad.addColorStop(0, "rgba(99, 102, 241, 0.4)");
        auraGrad.addColorStop(0.7, "rgba(56, 189, 248, 0.2)");
        auraGrad.addColorStop(1, "rgba(99, 102, 241, 0)");

        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, auraRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Base Border Ring
      ctx.beginPath();
      ctx.arc(cx, cy, w * 0.44, 0, Math.PI * 2);
      ctx.fillStyle = "#0f172a";
      ctx.fill();
      ctx.lineWidth = currentAmp > 0.1 ? 3.5 : 2.5;
      ctx.strokeStyle = currentAmp > 0.1 ? "#6366f1" : "#334155";
      ctx.stroke();

      // 3. Torso / Collar
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, w * 0.43, 0, Math.PI * 2);
      ctx.clip();

      // Dark Academic Blazer
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.ellipse(cx, cy + (h * 0.44), w * 0.42, h * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Shirt / Neck tie
      ctx.fillStyle = "#38bdf8";
      ctx.beginPath();
      ctx.moveTo(cx - 16, cy + (h * 0.28));
      ctx.lineTo(cx + 16, cy + (h * 0.28));
      ctx.lineTo(cx, cy + (h * 0.46));
      ctx.closePath();
      ctx.fill();

      // Neck
      ctx.fillStyle = "#fed7aa";
      ctx.fillRect(cx - 14, cy + (h * 0.14), 28, 26);

      // 4. Head / Face Shape
      const headRadiusX = w * 0.25;
      const headRadiusY = h * 0.28;
      const faceGrad = ctx.createLinearGradient(cx - headRadiusX, cy - headRadiusY, cx + headRadiusX, cy + headRadiusY);
      faceGrad.addColorStop(0, "#ffedd5");
      faceGrad.addColorStop(1, "#fed7aa");

      ctx.fillStyle = faceGrad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, headRadiusX, headRadiusY, 0, 0, Math.PI * 2);
      ctx.fill();

      // 5. Stylized Hair
      ctx.fillStyle = "#1e1b4b";
      ctx.beginPath();
      ctx.arc(cx, cy - (headRadiusY * 0.4), headRadiusX * 1.06, Math.PI, 0, false);
      ctx.fill();

      // 6. Eyes (with blinking)
      const eyeOffsetX = 18;
      const eyeY = cy - 4;

      if (isBlinking) {
        // Closed eye line
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(cx - eyeOffsetX - 7, eyeY);
        ctx.lineTo(cx - eyeOffsetX + 7, eyeY);
        ctx.moveTo(cx + eyeOffsetX - 7, eyeY);
        ctx.lineTo(cx + eyeOffsetX + 7, eyeY);
        ctx.stroke();
      } else {
        // Open eyes with sparkle
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.ellipse(cx - eyeOffsetX, eyeY, 5.5, 6, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + eyeOffsetX, eyeY, 5.5, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eye highlights
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(cx - eyeOffsetX - 1.5, eyeY - 2, 2, 0, Math.PI * 2);
        ctx.arc(cx + eyeOffsetX - 1.5, eyeY - 2, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // 7. Academic Glasses
      ctx.strokeStyle = "#4338ca";
      ctx.lineWidth = 2.2;
      // Left rim
      ctx.beginPath();
      ctx.roundRect(cx - eyeOffsetX - 11, eyeY - 9, 22, 17, [4]);
      ctx.stroke();
      // Right rim
      ctx.beginPath();
      ctx.roundRect(cx + eyeOffsetX - 11, eyeY - 9, 22, 17, [4]);
      ctx.stroke();
      // Bridge
      ctx.beginPath();
      ctx.moveTo(cx - eyeOffsetX + 11, eyeY);
      ctx.lineTo(cx + eyeOffsetX - 11, eyeY);
      ctx.stroke();

      // 8. Dynamic Audio-Reactive Mouth
      const mouthY = cy + (headRadiusY * 0.48);
      const mouthWidth = 14 + (currentAmp * 12);
      const mouthHeight = Math.max(2, currentAmp * 18);

      if (currentAmp > 0.08) {
        // Open talking mouth with inner oral cavity & teeth
        ctx.fillStyle = "#881337";
        ctx.beginPath();
        ctx.ellipse(cx, mouthY, mouthWidth, mouthHeight, 0, 0, Math.PI * 2);
        ctx.fill();

        // Upper teeth
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.roundRect(cx - (mouthWidth * 0.65), mouthY - mouthHeight, mouthWidth * 1.3, Math.min(5, mouthHeight), [2]);
        ctx.fill();

        // Tongue highlight
        if (mouthHeight > 6) {
          ctx.fillStyle = "#f43f5e";
          ctx.beginPath();
          ctx.ellipse(cx, mouthY + (mouthHeight * 0.4), mouthWidth * 0.5, mouthHeight * 0.45, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Resting gentle smile
        ctx.strokeStyle = "#991b1b";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, mouthY - 4, 11, 0.2 * Math.PI, 0.8 * Math.PI, false);
        ctx.stroke();
      }

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, isFallbackSpeaking]);

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className="rounded-full shadow-2xl transition-transform duration-300 hover:scale-105"
        />

        {/* Live Speaking Badge */}
        {isPlaying && (
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-emerald-500/90 text-white font-mono text-[9px] font-bold shadow-md border border-white/20 flex items-center gap-1 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            <span>Speaking</span>
          </div>
        )}
      </div>

      <span className="text-white text-sm font-bold tracking-wide mt-3">
        {name}
      </span>
      <span className="text-neutral-400 text-xs font-mono mt-0.5">
        {subtitle}
      </span>

      {/* Audio Reactive Frequency Bars */}
      {isPlaying && (
        <div className="flex items-center gap-1 mt-2.5 h-5">
          {[0.4, 0.8, 1.2, 0.7, 1.0, 0.5].map((delay, i) => (
            <span
              key={i}
              className="w-1 bg-gradient-to-t from-primary to-accent rounded-full transition-all duration-75"
              style={{
                height: `${Math.max(4, Math.min(20, (amplitude * 24 * (0.6 + (i * 0.15)))))}px`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
