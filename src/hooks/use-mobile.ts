import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(
    () => typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT
  )

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    
    // Set initial state after mount to avoid hydration mismatch
    const currentIsMobile = window.innerWidth < MOBILE_BREAKPOINT
    if (isMobile !== currentIsMobile) {
      queueMicrotask(() => {
        setIsMobile(currentIsMobile)
      })
    }

    return () => mql.removeEventListener("change", onChange)
  }, [isMobile])

  return !!isMobile
}
