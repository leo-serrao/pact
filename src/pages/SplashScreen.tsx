import React from 'react'
import Lottie from 'lottie-react'
import loadingAnimation from '../assets/loading.json'
export default function SplashScreen() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-[var(--background)]">
      
      {/* Lottie animation */}
      <div className="w-[180px] h-[180px]">
        <Lottie
          animationData={loadingAnimation}
          loop
          autoplay
        />
      </div>

      {/* Logo */}
      <img
        src="/dark_text_logo.png"
        alt="App Logo"
        className="mt-6 w-[140px] opacity-90"
      />

      {/* Optional subtle loading text */}
      <p className="mt-6 text-sm text-[var(--text-secondary)]">
        Carregando...
      </p>
    </div>
  )
}