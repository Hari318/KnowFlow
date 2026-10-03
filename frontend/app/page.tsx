"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFadeOut(true), 1400);
    const redirectTimer = setTimeout(() => router.push("/login"), 1800);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(redirectTimer);
    };
  }, [router]);

  return (
    <div
      className={`flex flex-1 flex-col items-center justify-center bg-zinc-50 transition-opacity duration-500 dark:bg-black ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-black dark:bg-white animate-[pulse_1.6s_ease-in-out_infinite]">
          <span className="text-2xl font-bold text-white dark:text-black">K</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          KnowFlow
        </h1>
        <div className="mt-2 h-1 w-32 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div className="h-full w-full origin-left animate-[loadingBar_1.4s_ease-in-out_forwards] bg-black dark:bg-white" />
        </div>
      </div>

      <style jsx>{`
        @keyframes loadingBar {
          from {
            transform: scaleX(0);
          }
          to {
            transform: scaleX(1);
          }
        }
      `}</style>
    </div>
  );
}