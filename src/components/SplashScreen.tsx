import { useEffect, useState, useRef } from 'react';
import minsaLogo from '@/assets/minsa-logo.png';

interface SplashScreenProps {
  onFinish: () => void;
}

// 7 loading steps
const LOAD_STEPS = [
  'Memuat komponen...',
  'Memindai data...',
  'Mempersiapkan data...',
  'Mengonfigurasi template...',
  'Memuat pengaturan...',
  'Menyiapkan antarmuka...',
  'Hampir selesai...',
  'Siap!',
];

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const [phase, setPhase] = useState<'logo' | 'loading' | 'done'>('logo');
  const [progress, setProgress] = useState(0);
  const [label, setLabel] = useState(LOAD_STEPS[0]);
  const [fadeOut, setFadeOut] = useState(false);
  const [glitchActive, setGlitchActive] = useState(false);

  useEffect(() => {
    // Phase 1: Logo only with glitch (0-2 seconds)
    const glitchTimer = setTimeout(() => setGlitchActive(true), 100);
    const glitchTimeout = setTimeout(() => setGlitchActive(false), 600);

    // After 2 seconds, switch to loading phase
    const phaseTimer = setTimeout(() => {
      setPhase('loading');
    }, 2000);

    return () => {
      clearTimeout(glitchTimer);
      clearTimeout(glitchTimeout);
      clearTimeout(phaseTimer);
    };
  }, []);

  useEffect(() => {
    if (phase !== 'loading') return;

    let current = 0;
    const interval = setInterval(() => {
      current = Math.min(current + (Math.random() * 4 + 2), 100);
      setProgress(current);

      // Map progress to loading steps (7 steps + final)
      if (current < 15) setLabel(LOAD_STEPS[0]);
      else if (current < 30) setLabel(LOAD_STEPS[1]);
      else if (current < 45) setLabel(LOAD_STEPS[2]);
      else if (current < 60) setLabel(LOAD_STEPS[3]);
      else if (current < 75) setLabel(LOAD_STEPS[4]);
      else if (current < 90) setLabel(LOAD_STEPS[5]);
      else if (current < 98) setLabel(LOAD_STEPS[6]);
      else setLabel(LOAD_STEPS[7]);

      if (current >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setFadeOut(true);
          setTimeout(onFinish, 500);
        }, 300); // Show "Siap!" for 300ms
      }
    }, 55);

    return () => clearInterval(interval);
  }, [phase, onFinish]);

  const isLogoPhase = phase === 'logo';

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: isLogoPhase
          ? 'transparent'
          : 'linear-gradient(135deg, #0f0a1f 0%, #1a103c 30%, #2d1b69 60%, #1a103c 100%)',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        transition: 'background 0.5s ease, opacity 0.5s ease',
        opacity: fadeOut ? 0 : 1,
        pointerEvents: fadeOut ? 'none' : 'all',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Phase 1: Logo only - no background */}
      {isLogoPhase && (
        <>
          {/* Animated background grid */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `
                linear-gradient(rgba(130, 90, 240, 0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(130, 90, 240, 0.03) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px',
              animation: 'gridMove 20s linear infinite',
              pointerEvents: 'none',
            }}
          />

          {/* Glow effect */}
          <div
            style={{
              position: 'absolute',
              width: '600px',
              height: '600px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(130,90,240,0.25) 0%, transparent 70%)',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              animation: 'pulse 3s ease-in-out infinite',
            }}
          />

          {/* Main Logo with glitch effect */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Glitch layers */}
            <img
              src={minsaLogo}
              alt=""
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '260px',
                height: 'auto',
                objectFit: 'contain',
                opacity: glitchActive ? 0.8 : 0,
                transform: 'translate(-4px, 0)',
                filter: 'hue-rotate(90deg)',
                animation: glitchActive ? 'glitchLeft 0.3s infinite' : 'none',
                pointerEvents: 'none',
              }}
            />
            <img
              src={minsaLogo}
              alt=""
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '260px',
                height: 'auto',
                objectFit: 'contain',
                opacity: glitchActive ? 0.8 : 0,
                transform: 'translate(4px, 0)',
                filter: 'hue-rotate(-90deg)',
                animation: glitchActive ? 'glitchRight 0.3s infinite' : 'none',
                pointerEvents: 'none',
              }}
            />
            {/* Main logo */}
            <img
              src={minsaLogo}
              alt="MINSA"
              style={{
                width: '260px',
                height: 'auto',
                objectFit: 'contain',
                filter: 'drop-shadow(0 8px 32px rgba(130,90,240,0.75))',
                animation: 'splashLogoIn 0.65s cubic-bezier(0.34,1.56,0.64,1) both',
              }}
            />
          </div>
        </>
      )}

      {/* Phase 2: Loading screen with progress bar */}
      {!isLogoPhase && (
        <>
          {/* Animated background grid */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `
                linear-gradient(rgba(130, 90, 240, 0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(130, 90, 240, 0.03) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px',
              animation: 'gridMove 20s linear infinite',
              pointerEvents: 'none',
            }}
          />

          {/* Logo as background watermark */}
          <img
            src={minsaLogo}
            alt=""
            aria-hidden="true"
            style={{
              position: 'absolute',
              width: '420px',
              height: 'auto',
              objectFit: 'contain',
              opacity: 0.05,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
            }}
          />

          {/* Glow effect */}
          <div
            style={{
              position: 'absolute',
              width: '600px',
              height: '600px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(130,90,240,0.25) 0%, transparent 70%)',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              animation: 'pulse 3s ease-in-out infinite',
            }}
          />

          {/* Main Logo */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <img
              src={minsaLogo}
              alt="MINSA"
              style={{
                width: '260px',
                height: 'auto',
                objectFit: 'contain',
                filter: 'drop-shadow(0 8px 32px rgba(130,90,240,0.75))',
                animation: 'splashLogoIn 0.65s cubic-bezier(0.34,1.56,0.64,1) both',
              }}
            />
          </div>

          {/* App subtitle */}
          <div
            style={{
              marginTop: '12px',
              color: 'rgba(255,255,255,0.7)',
              fontSize: '13px',
              letterSpacing: '0.18em',
              fontWeight: 500,
              animation: 'splashFadeUp 0.6s ease-out 0.3s both',
              position: 'relative',
              zIndex: 1,
            }}
          >
            MINSA Surat Manager
          </div>

          {/* Progress bar - CENTERED below logo */}
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              marginTop: '24px',
              width: '300px',
              animation: 'splashFadeUp 0.5s ease-out 0.5s both',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '5px',
                color: 'rgba(255,255,255,0.38)',
                fontSize: '10.5px',
              }}
            >
              <span>{label}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div
              style={{
                height: '4px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '2px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #7c3aed, #a78bfa, #7c3aed)',
                  backgroundSize: '200% 100%',
                  borderRadius: '2px',
                  transition: 'width 0.06s linear',
                  animation: 'progressShine 2s ease-in-out infinite',
                }}
              />
            </div>
          </div>

          {/* Version */}
          <div
            style={{
              position: 'absolute',
              bottom: '16px',
              right: '20px',
              color: 'rgba(255,255,255,0.2)',
              fontSize: '10px',
              letterSpacing: '0.05em',
            }}
          >
            © Copyright 2025 AZSTRAL · v1.0.0
          </div>
        </>
      )}

      <style>{`
        @keyframes splashLogoIn {
          from { opacity: 0; transform: scale(0.78) translateY(16px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes splashFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
        @keyframes pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.3; }
          50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.5; }
        }
        @keyframes progressShine {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes glitchLeft {
          0%, 100% { transform: translate(-4px, 0); }
          25% { transform: translate(-6px, -2px); }
          50% { transform: translate(-2px, 2px); }
          75% { transform: translate(-5px, 0); }
        }
        @keyframes glitchRight {
          0%, 100% { transform: translate(4px, 0); }
          25% { transform: translate(6px, 2px); }
          50% { transform: translate(2px, -2px); }
          75% { transform: translate(5px, 0); }
        }
      `}</style>
    </div>
  );
}
