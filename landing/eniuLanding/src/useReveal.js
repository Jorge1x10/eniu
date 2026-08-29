import { useEffect, useState } from 'react'

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Descubre los elementos con `data-reveal` y los anima al entrar en pantalla. */
export function useReveal(routeKey) {
  useEffect(() => {
    const items = document.querySelectorAll('[data-reveal]:not([data-reveal-in])')
    if (reducedMotion() || !('IntersectionObserver' in window)) {
      items.forEach((item) => item.setAttribute('data-reveal-in', ''))
      return undefined
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.setAttribute('data-reveal-in', '')
        observer.unobserve(entry.target)
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' })

    items.forEach((item) => observer.observe(item))
    return () => observer.disconnect()
  }, [routeKey])
}

/** True cuando la página ya se desplazó, para la sombra de la barra pegajosa. */
export function useScrolled(offset = 12) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > offset)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [offset])

  return scrolled
}
