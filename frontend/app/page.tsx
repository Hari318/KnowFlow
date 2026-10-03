"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFadeOut(true), 1400);
    const redirectTimer = setTimeout(() => router.push("/login"), 1850);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(redirectTimer);
    };
  }, [router]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black transition-opacity duration-500 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-5 animate-[splashIn_0.6s_ease-out]">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-[0_0_40px_rgba(255,255,255,0.15)]">
          <span className="text-3xl font-bold text-black">K</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          KnowFlow
        </h1>
        <div className="mt-1 h-1 w-40 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full w-full origin-left animate-[loadingBar_1.3s_ease-in-out_forwards] bg-white" />
        </div>
      </div>

      <style jsx>{`
        @keyframes splashIn {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
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