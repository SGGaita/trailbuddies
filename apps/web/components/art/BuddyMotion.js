"use client";

import { useEffect, useRef } from "react";
import { buddySrc } from "@/lib/art";
import { buddyGait } from "@/lib/buddyGait";
import { onBuddySpeech } from "@/lib/speech";

const rigs = new Map();
const DURATION = { walk: 2000, wave: 1550 };
const BLINK = 165;

/** One rig per picture: the same buddy at two sizes uses two pictures. */
function loadRig(id, src) {
  if (!rigs.has(src)) {
    const image = new Image();
    image.src = src;
    rigs.set(
      src,
      image
        .decode()
        .then(() => buddyGait(image, id))
        .catch(() => {
          rigs.delete(src);
          return null;
        }),
    );
  }
  return rigs.get(src);
}

function mouthShape(speech, now) {
  if (!speech) return 1;
  const { text, index, speed, media, at } = speech;
  // Browser voices supply word boundaries. Between them, approximate the sounds
  // from the current text. For recorded clips, use the audio player's actual clock.
  const elapsed = media
    ? (media.currentTime / (media.duration || 1)) * text.length
    : index + ((now - at) * speed) / 83;
  const character = text[Math.min(text.length - 1, Math.floor(elapsed))]?.toLowerCase();
  if (!character || /[\s.,!?;:bmp]/.test(character)) return 0.24;
  const open = /[aeiou]/.test(character) ? 1.14 : 0.66;
  return 0.3 + (open - 0.3) * Math.sin(Math.PI * (elapsed % 1));
}

/**
 * @param {{ id: string, src?: string, gesture?: string, replay?: number, stage?: boolean }} props
 *   `src` is the picture already drawn underneath, so it downloads once (default: the full one)
 */
export default function BuddyMotion({ id, src: given, gesture, replay, stage = false }) {
  const src = given || buddySrc(id);
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const context = canvas.getContext("2d");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const calm = () => reduced.matches || document.documentElement.dataset.calm === "1";
    const visible = () =>
      !calm() && document.visibilityState !== "hidden" && canvas.getBoundingClientRect().width > 0;
    if (!context) return;
    let active = true;
    let raf = 0;
    let timer;
    let paint;
    let motion;
    let gestureStart = null;
    let blinkAt = -Infinity;
    let preparing = false;
    const duration = DURATION[gesture];

    const request = () => {
      if (!raf && active) raf = requestAnimationFrame(tick);
    };
    function tick(now) {
      raf = 0;
      if (!visible()) {
        delete canvas.dataset.motionReady;
        return;
      }
      if (!paint) {
        if (!preparing) {
          preparing = true;
          loadRig(id, src).then((renderer) => {
            preparing = false;
            if (!active || !renderer) return;
            paint = renderer;
            request();
          });
        }
        return;
      }
      if (duration && gestureStart === null) gestureStart = now;
      const progress = duration ? Math.min(1, (now - gestureStart) / duration) : 1;
      const blinking = now - blinkAt < BLINK;
      if (progress < 1 || (stage && gesture === "walk") || motion || blinking) {
        paint(context, {
          stage,
          walk: gesture === "walk" ? progress : 0,
          wave: gesture === "wave" ? progress : 0,
          mouth: mouthShape(motion, now),
          blink: blinking ? Math.sin((Math.PI * (now - blinkAt)) / BLINK) : 0,
        });
        canvas.dataset.motionReady = "true";
      } else {
        delete canvas.dataset.motionReady;
      }
      if (motion) canvas.dataset.speaking = "true";
      else delete canvas.dataset.speaking;
      if (blinking) canvas.dataset.blinking = "true";
      else delete canvas.dataset.blinking;
      if (progress < 1 || motion || blinking) request();
    }

    function planBlink(delay) {
      timer = setTimeout(() => {
        if (visible()) {
          loadRig(id, src).then((renderer) => {
            if (!active || !renderer) return;
            paint = renderer;
            blinkAt = performance.now();
            request();
          });
        }
        planBlink(4000 + Math.random() * 1600);
      }, delay);
    }

    const unsubscribe = onBuddySpeech((speech) => {
      motion = speech?.speaker === id ? speech : null;
      if (motion || canvas.dataset.motionReady) request();
    });
    if (duration && replay !== null) request();
    planBlink(1500 + Math.random() * 1700);
    return () => {
      active = false;
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      unsubscribe();
      delete canvas.dataset.motionReady;
      delete canvas.dataset.speaking;
      delete canvas.dataset.blinking;
    };
  }, [id, src, gesture, replay, stage]);

  return (
    <canvas
      ref={ref}
      width={stage ? 480 : 212}
      height={stage ? 320 : 218}
      aria-hidden="true"
      className={`buddy-motion${stage ? " buddy-motion-stage" : ""}`}
      data-action={gesture}
    />
  );
}
