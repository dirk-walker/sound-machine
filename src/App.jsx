import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Moon, Zap, Waves, CloudRain } from 'lucide-react';

export default function SoundMachine() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [noiseType, setNoiseType] = useState('brown'); // Default to brown noise (most popular for sleep)
  const [volume, setVolume] = useState(0.5);
  const [isReady, setIsReady] = useState(false);

  // Audio refs
  const audioContextRef = useRef(null);
  const gainNodeRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const currentTypeRef = useRef(null);

  const noiseOptions = [
    { id: 'white', name: 'White', icon: <Zap size={20} />, color: 'from-gray-100 to-gray-300', text: 'text-gray-800' },
    { id: 'pink', name: 'Pink', icon: <Waves size={20} />, color: 'from-pink-300 to-rose-400', text: 'text-rose-900' },
    { id: 'brown', name: 'Brown', icon: <CloudRain size={20} />, color: 'from-amber-700 to-amber-900', text: 'text-amber-50' }
  ];

  // Function to procedurally generate the noise buffer
  const generateNoiseBuffer = (ctx, type) => {
    const bufferSize = ctx.sampleRate * 5; // 5-second seamless loop buffer
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);

    if (type === 'white') {
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
    } else if (type === 'pink') {
      // Paul Kellet's refined method for pink noise (attenuated at 3dB per octave)
      let b0, b1, b2, b3, b4, b5, b6;
      b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        let white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        output[i] *= 0.11; // Scale to prevent clipping
        b6 = white * 0.115926;
      }
    } else if (type === 'brown') {
      // Integrated white noise for brown noise (attenuated at 6dB per octave)
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        let white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; // Scale up to match perceived volume
      }
    }
    return buffer;
  };

  const playNoise = async (type) => {
    // Initialize Web Audio API on first user interaction
    if (!audioContextRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
      
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.connect(audioContextRef.current.destination);
      setIsReady(true);
    }

    const ctx = audioContextRef.current;

    // Stop existing audio before switching
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
    }

    const buffer = generateNoiseBuffer(ctx, type);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(gainNodeRef.current);
    source.start(0);

    sourceNodeRef.current = source;
    currentTypeRef.current = type;
    
    // Ramp volume slightly to avoid popping
    gainNodeRef.current.gain.setTargetAtTime(volume, ctx.currentTime, 0.01);

    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    
    setIsPlaying(true);
  };

  const pauseNoise = async () => {
    if (audioContextRef.current && audioContextRef.current.state === 'running') {
      await audioContextRef.current.suspend();
    }
    setIsPlaying(false);
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      pauseNoise();
    } else {
      playNoise(noiseType);
    }
  };

  // Handle volume changes
  useEffect(() => {
    if (gainNodeRef.current && audioContextRef.current) {
      gainNodeRef.current.gain.setTargetAtTime(volume, audioContextRef.current.currentTime, 0.05);
    }
  }, [volume]);

  // Handle switching noise types while currently playing
  useEffect(() => {
    if (isPlaying && currentTypeRef.current !== noiseType) {
      playNoise(noiseType);
    }
  }, [noiseType, isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const activeTheme = noiseOptions.find(n => n.id === noiseType);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans selection:bg-indigo-500/30">
      {/* Mobile App Container Wrapper */}
      <div className="w-full max-w-sm bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-indigo-900/20 overflow-hidden border border-slate-800 relative flex flex-col min-h-[750px]">
        
        {/* Dynamic Background Glow */}
        <div className={`absolute inset-0 bg-gradient-to-br ${activeTheme.color} opacity-10 transition-colors duration-1000 ease-in-out pointer-events-none`} />
        
        {/* Header */}
        <div className="pt-12 pb-6 px-8 text-center relative z-10">
          <div className="inline-flex items-center justify-center p-3 bg-slate-800/50 rounded-2xl mb-4 backdrop-blur-sm border border-slate-700/50">
            <Moon className="text-indigo-400" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Sound Machine</h1>
          <p className="text-slate-400 text-sm mt-1">Focus & Sleep companion</p>
        </div>

        {/* Main Controls */}
        <div className="flex-1 flex flex-col justify-center px-8 relative z-10 gap-10">
          
          {/* Circular Play Button */}
          <div className="flex justify-center relative">
            <div className={`absolute inset-0 bg-gradient-to-tr ${activeTheme.color} rounded-full blur-3xl opacity-20 transition-all duration-1000 ${isPlaying ? 'scale-125' : 'scale-90'}`} />
            <button
              onClick={togglePlayPause}
              className={`relative flex items-center justify-center w-40 h-40 rounded-full shadow-lg transition-all duration-500 transform hover:scale-105 active:scale-95
                ${isPlaying 
                  ? 'bg-gradient-to-tr from-slate-800 to-slate-700 shadow-slate-900/50 border border-slate-600/30' 
                  : `bg-gradient-to-tr ${activeTheme.color} shadow-xl border border-white/20`}
              `}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause size={56} className="text-white fill-white" />
              ) : (
                <Play size={56} className={`ml-2 ${activeTheme.text} fill-current`} />
              )}
            </button>
          </div>

          {/* Noise Type Selector */}
          <div className="bg-slate-950/50 p-1.5 rounded-2xl flex gap-1 backdrop-blur-md border border-slate-800/50">
            {noiseOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setNoiseType(option.id)}
                className={`flex-1 flex flex-col items-center justify-center py-3 rounded-xl text-sm font-medium transition-all duration-300
                  ${noiseType === option.id 
                    ? `bg-gradient-to-br ${option.color} ${option.text} shadow-sm` 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }
                `}
              >
                <div className="mb-1">{option.icon}</div>
                {option.name}
              </button>
            ))}
          </div>

          {/* Volume Control */}
          <div className="bg-slate-950/50 p-5 rounded-3xl backdrop-blur-md border border-slate-800/50 flex items-center gap-4">
            <VolumeX size={20} className="text-slate-500 shrink-0" />
            <div className="relative flex-1 h-12 flex items-center group cursor-pointer">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full absolute opacity-0 z-20 cursor-pointer h-full"
                aria-label="Volume"
              />
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden z-10 pointer-events-none">
                <div 
                  className={`h-full bg-gradient-to-r ${activeTheme.color} transition-all duration-100`}
                  style={{ width: `${volume * 100}%` }}
                />
              </div>
            </div>
            <Volume2 size={20} className="text-slate-500 shrink-0" />
          </div>
        </div>

        {/* Footer info */}
        <div className="pb-8 pt-4 text-center relative z-10">
          <p className="text-xs text-slate-600 font-medium px-8">
            {isPlaying ? 'Synthesizing live audio buffer...' : 'Select a frequency and press play'}
          </p>
        </div>

      </div>
    </div>
  );
}