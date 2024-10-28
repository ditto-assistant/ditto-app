import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

const BackgroundAnimation = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    
    function createParticle() {
      const particle = document.createElement('div');
      particle.className = 'particle';
      const size = Math.random() * 5 + 2;
      
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;
      
      container.appendChild(particle);

      gsap.to(particle, {
        duration: Math.random() * 3 + 2,
        y: -100,
        opacity: 1,
        ease: "power1.out",
        onComplete: () => {
          particle.remove();
          createParticle();
        }
      });
    }

    // Create initial particles
    for (let i = 0; i < 20; i++) {
      createParticle();
    }

    return () => {
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    };
  }, []);

  return <div ref={containerRef} className="background-animation" />;
};

export default BackgroundAnimation;
