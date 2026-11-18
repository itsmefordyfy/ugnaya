'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog, Icon, buttonClasses } from '@ugnaya/web-ui';

type DetectedCode = { rawValue: string };
type Detector = { detect: (source: HTMLVideoElement) => Promise<DetectedCode[]> };
type DetectorConstructor = new (options: { formats: string[] }) => Detector;

/** The browser's BarcodeDetector (Chrome and Edge on Android, ChromeOS and macOS; not Safari or Firefox yet). */
function barcodeDetector(): DetectorConstructor | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { BarcodeDetector?: DetectorConstructor }).BarcodeDetector ?? null;
}

export type CameraScanProps = {
  /** "Scan member QR", "Scan voucher QR". */
  label: string;
  /** What the camera is looking for, in a sentence ("the customer’s member QR"). */
  target: string;
  /** Only codes this accepts fill the field; anything else (a store QR, a voucher in the award form) is ignored. */
  accept: (raw: string) => boolean;
  onCode: (raw: string) => void;
};

/**
 * Scans a QR code with the device camera where the browser can (BarcodeDetector), and says so plainly where it can't;
 * typing the code always works. The camera is stopped as soon as a code is read, the dialog closes, or the page goes.
 */
export function CameraScan({ label, target, accept, onCode }: CameraScanProps) {
  const [open, setOpen] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  // The latest callbacks, without restarting the camera when the parent re-renders.
  const latest = useRef({ accept, onCode });
  useEffect(() => {
    latest.current = { accept, onCode };
  });

  useEffect(() => {
    if (!open) return;
    const Detector = barcodeDetector();
    const el = video.current;
    if (!Detector || !el) return;
    let cancelled = false;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      } catch (error) {
        if (cancelled) return;
        const denied = error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError');
        setProblem(denied
          ? 'The camera is blocked for this site. Allow it in the browser’s site settings, or type the code instead.'
          : 'No camera could be opened on this device. Type the code instead.');
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      el.srcObject = stream;
      try {
        await el.play();
      } catch {
        // Autoplay of a muted inline video is allowed everywhere BarcodeDetector exists; keep scanning frames anyway.
      }
      const detector = new Detector({ formats: ['qr_code'] });
      const tick = async () => {
        if (cancelled) return;
        try {
          const codes = await detector.detect(el);
          const hit = codes.find((c) => latest.current.accept(c.rawValue));
          if (hit) {
            latest.current.onCode(hit.rawValue);
            setOpen(false);
            return;
          }
          if (codes.length > 0) setHint(`That QR isn’t ${target}. Point the camera at ${target}.`);
        } catch {
          // A frame that couldn't be read (the video is still starting); try the next one.
        }
        timer = setTimeout(tick, 200);
      };
      void tick();
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
      el.srcObject = null;
    };
  }, [open, target]);

  function start() {
    setHint(null);
    if (!barcodeDetector() || !navigator.mediaDevices?.getUserMedia) {
      setProblem('This browser can’t scan QR codes with the camera. Type the code shown under the QR instead (Chrome on Android and Edge can scan).');
      return;
    }
    setProblem(null);
    setOpen(true);
  }

  return (
    <>
      <button type="button" onClick={start} className={`${buttonClasses('secondary', 'lg')} min-h-14 w-full`}>
        <Icon name="qr_code_scanner" />{label}
      </button>
      {problem && !open && <p role="status" className="mt-2 text-sm text-warning-text">{problem}</p>}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        description={`Hold ${target} inside the frame. It fills in by itself.`}
        footer={<button type="button" onClick={() => setOpen(false)} className={buttonClasses('secondary', 'lg')}>Type it instead</button>}
      >
        {problem ? (
          <p role="alert" className="rounded-md bg-warning-soft p-4 text-warning-text">{problem}</p>
        ) : (
          <div className="relative overflow-hidden rounded-lg bg-ink">
            <video ref={video} muted playsInline aria-label="Camera preview" className="aspect-square w-full object-cover" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-[15%] rounded-lg border-4 border-on-primary/80" />
          </div>
        )}
        <p role="status" className="mt-3 min-h-5 text-sm text-ink-muted">{hint ?? ''}</p>
      </Dialog>
    </>
  );
}
