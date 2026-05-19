"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface VideoPlayerProps {
  thumbnail: string;
  title: string;
  duration?: string;
  isLocked?: boolean;
  onUnlock?: () => void;
  /** When set, renders a real HTML5 <video> element instead of the placeholder UI. */
  src?: string | null;
}

function NativeVideoPlayer({ src, thumbnail, title }: { src: string; thumbnail: string; title: string }) {
  return (
    <div className="relative aspect-video bg-black overflow-hidden rounded-2xl">
      <video
        key={src}
        src={src}
        poster={thumbnail}
        controls
        controlsList="nodownload"
        playsInline
        className="w-full h-full"
        aria-label={title}
      />
    </div>
  );
}

export function VideoPlayer({ thumbnail, title, duration, isLocked = false, onUnlock, src }: VideoPlayerProps) {
  // When a real source is provided, the native player handles its own lifecycle.
  // We early-return BEFORE the placeholder's hooks so they are not declared.
  // This is safe under "rules-of-hooks" because the early return is a pure
  // delegation to another component — the placeholder branch never runs in
  // this render and its hooks are not part of this component's order.
  return src && !isLocked
    ? <NativeVideoPlayer src={src} thumbnail={thumbnail} title={title} />
    : <PlaceholderPlayer thumbnail={thumbnail} title={title} duration={duration} isLocked={isLocked} onUnlock={onUnlock} />;
}

function PlaceholderPlayer({ thumbnail, title, duration, isLocked, onUnlock }: {
  thumbnail: string;
  title: string;
  duration?: string;
  isLocked: boolean;
  onUnlock?: () => void;
}) {

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState("0:00");
  const [volume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPlaying && !isLocked) {
      progressInterval.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          const newProgress = prev + 0.5;
          const minutes = Math.floor((newProgress / 100) * 10);
          const seconds = Math.floor(((newProgress / 100) * 600) % 60);
          setCurrentTime(`${minutes}:${seconds.toString().padStart(2, "0")}`);
          return newProgress;
        });
      }, 500);
    } else {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [isPlaying, isLocked]);

  const togglePlay = () => {
    if (isLocked) {
      onUnlock?.();
      return;
    }
    setIsPlaying(!isPlaying);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-black rounded-2xl overflow-hidden group"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Video/Thumbnail */}
      <Image
        src={thumbnail}
        alt={title}
        fill
        sizes="(min-width: 1024px) 66vw, 100vw"
        className={`w-full h-full object-cover transition-opacity duration-300 ${isPlaying ? "opacity-80" : ""}`}
      />

      {/* Locked Overlay */}
      {isLocked && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-10">
          <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Premium Icerik</h3>
          <p className="text-muted-foreground mb-4 text-center px-4">Bu icerigi izlemek icin abone olun</p>
          <Button className="gradient-bg hover:opacity-90 text-white border-0" onClick={onUnlock}>
            Abone Ol
          </Button>
        </div>
      )}

      {/* Play/Pause Button */}
      {!isLocked && (
        <button
          onClick={togglePlay}
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full gradient-bg flex items-center justify-center shadow-lg transition-all ${
            showControls ? "opacity-100 scale-100" : "opacity-0 scale-90"
          }`}
        >
          {isPlaying ? (
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
      )}

      {/* Controls Bar */}
      {!isLocked && (
        <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity ${
          showControls ? "opacity-100" : "opacity-0"
        }`}>
          {/* Progress Bar */}
          <div className="mb-3">
            <Progress value={progress} className="h-1 cursor-pointer" />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Play/Pause */}
              <button onClick={togglePlay} className="text-white hover:text-orange-500 transition-colors">
                {isPlaying ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* Volume */}
              <div className="flex items-center gap-2">
                <button onClick={toggleMute} className="text-white hover:text-orange-500 transition-colors">
                  {isMuted || volume === 0 ? (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Time */}
              <span className="text-sm text-white">
                {currentTime} / {duration || "10:00"}
              </span>
            </div>

            <div className="flex items-center gap-4">
              {/* Settings */}
              <button className="text-white hover:text-orange-500 transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              {/* Fullscreen */}
              <button onClick={toggleFullscreen} className="text-white hover:text-orange-500 transition-colors">
                {isFullscreen ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Playing Animation */}
      {isPlaying && !isLocked && (
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm text-white font-medium">CANLI</span>
        </div>
      )}
    </div>
  );
}
