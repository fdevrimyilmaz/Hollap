"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ImageCropperProps = {
  open: boolean;
  file: File | null;
  /** Output aspect ratio (width / height). 1 = square, 16/9 = wide, etc. */
  aspect?: number;
  /** Output image bounding box in pixels (longest edge of the resulting square/rect). */
  outputSize?: number;
  /** Output MIME type. */
  outputMimeType?: "image/jpeg" | "image/png" | "image/webp";
  /** JPEG/WebP quality (0-1). */
  quality?: number;
  title?: string;
  onCancel: () => void;
  onConfirm: (cropped: { dataUrl: string; blob: Blob; width: number; height: number }) => void;
};

export function ImageCropper({
  open,
  file,
  aspect = 1,
  outputSize = 800,
  outputMimeType = "image/jpeg",
  quality = 0.92,
  title = "Görseli Kırp",
  onCancel,
  onConfirm,
}: ImageCropperProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  // Load file → data URL
  useEffect(() => {
    if (!file) {
      setImageUrl(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  }, [file]);

  // Measure preview container & reset when image changes
  useEffect(() => {
    if (!open || !imageUrl) return;
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    const el = previewRef.current;
    if (el) {
      setPreviewSize({ width: el.clientWidth, height: el.clientHeight });
    }
  }, [open, imageUrl]);

  // Track natural image size
  const onImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
    // Auto-fit the image so it covers the preview
    if (previewSize.width > 0 && previewSize.height > 0) {
      const coverScale = Math.max(
        previewSize.width / img.naturalWidth,
        previewSize.height / img.naturalHeight,
      );
      setZoom(coverScale);
    }
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    dragStart.current = {
      x: event.clientX,
      y: event.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    };
    (event.target as HTMLDivElement).setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setOffset({
      x: dragStart.current.offsetX + (event.clientX - dragStart.current.x),
      y: dragStart.current.offsetY + (event.clientY - dragStart.current.y),
    });
  };

  const onPointerUp = () => setIsDragging(false);

  const confirm = useCallback(async () => {
    if (!imageUrl || !imageSize) return;
    setIsProcessing(true);
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Resim yüklenemedi"));
        img.src = imageUrl;
      });

      // Compute crop window in source coordinates.
      // Preview shows the image scaled by `zoom`, centered + offset.
      // Crop window = the rectangle (size = previewSize) over the image.
      const scaledWidth = img.naturalWidth * zoom;
      const scaledHeight = img.naturalHeight * zoom;
      const cropCenterXOnScaled = scaledWidth / 2 - offset.x;
      const cropCenterYOnScaled = scaledHeight / 2 - offset.y;
      const cropXOnScaled = cropCenterXOnScaled - previewSize.width / 2;
      const cropYOnScaled = cropCenterYOnScaled - previewSize.height / 2;

      const sourceX = cropXOnScaled / zoom;
      const sourceY = cropYOnScaled / zoom;
      const sourceWidth = previewSize.width / zoom;
      const sourceHeight = previewSize.height / zoom;

      // Build target canvas with the requested output size
      const outputWidth = aspect >= 1 ? outputSize : Math.round(outputSize * aspect);
      const outputHeight = aspect >= 1 ? Math.round(outputSize / aspect) : outputSize;

      const canvas = document.createElement("canvas");
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas hazırlanamadı");

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        img,
        Math.max(0, sourceX),
        Math.max(0, sourceY),
        Math.min(sourceWidth, img.naturalWidth - Math.max(0, sourceX)),
        Math.min(sourceHeight, img.naturalHeight - Math.max(0, sourceY)),
        0,
        0,
        outputWidth,
        outputHeight,
      );

      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Görsel oluşturulamadı"))),
          outputMimeType,
          quality,
        ),
      );

      const dataUrl = canvas.toDataURL(outputMimeType, quality);
      onConfirm({ dataUrl, blob, width: outputWidth, height: outputHeight });
    } catch (error) {
      console.error("[ImageCropper]", error);
    } finally {
      setIsProcessing(false);
    }
  }, [imageUrl, imageSize, zoom, offset, previewSize, aspect, outputSize, outputMimeType, quality, onConfirm]);

  const previewAspectStyle: React.CSSProperties = {
    aspectRatio: String(aspect),
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-5 space-y-4">
          <div
            ref={previewRef}
            style={previewAspectStyle}
            className="relative w-full overflow-hidden rounded-2xl bg-black/40 ring-1 ring-white/10 select-none touch-none cursor-grab active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {imageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Kırpılacak görsel"
                  onLoad={onImageLoad}
                  draggable={false}
                  className="absolute top-1/2 left-1/2 max-w-none pointer-events-none"
                  style={{
                    transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                    transformOrigin: "center center",
                  }}
                />
                <div className="absolute inset-0 ring-2 ring-orange-500/60 ring-inset rounded-2xl pointer-events-none" />
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Görsel hazırlanıyor…
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="cropper-zoom" className="flex items-center justify-between text-xs font-medium text-white">
              <span>Yakınlaştırma</span>
              <span className="text-muted-foreground tabular-nums">{(zoom).toFixed(2)}x</span>
            </label>
            <input
              id="cropper-zoom"
              type="range"
              min={0.2}
              max={5}
              step={0.05}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="w-full h-1.5 rounded-full bg-white/10 accent-orange-500 cursor-pointer"
            />
            <p className="text-[11px] text-muted-foreground text-center">
              Yakınlaştır veya görseli sürükleyerek konumlandır.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onCancel} disabled={isProcessing} className="border-white/15 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/25">
              İptal
            </Button>
            <Button
              onClick={() => void confirm()}
              disabled={!imageUrl || isProcessing}
              className="gradient-bg text-white border-0 shadow-md shadow-orange-500/25 font-medium"
            >
              {isProcessing ? "Hazırlanıyor…" : "Kırp ve Yükle"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
