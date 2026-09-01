"use client"

import { useEffect, useId, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"

type RollerDigitProps = {
  value: string | number
  className?: string
  digitClassName?: string
  "aria-label"?: string
}

type CellState = {
  char: string
  key: string
  flash: boolean
}

function padAlign(prev: string, next: string): [string, string] {
  const len = Math.max(prev.length, next.length)
  return [prev.padStart(len, " "), next.padStart(len, " ")]
}

/**
 * Digit-by-digit roller: only changed characters animate (out down, in from top).
 * Unchanged cells stay put. Brief amber flash on lock-in.
 */
export function RollerDigit({
  value,
  className,
  digitClassName,
  "aria-label": ariaLabel,
}: RollerDigitProps) {
  const reduceMotion = useReducedMotion()
  const id = useId()
  const display = String(value)
  const prevRef = useRef(display)
  const [cells, setCells] = useState<CellState[]>(() =>
    display.split("").map((char, i) => ({ char, key: `${id}-${i}-${char}`, flash: false }))
  )

  useEffect(() => {
    const next = display
    const prev = prevRef.current
    if (next === prev) return

    if (reduceMotion) {
      prevRef.current = next
      setCells(next.split("").map((char, i) => ({ char, key: `${id}-${i}-${char}`, flash: false })))
      return
    }

    const [alignedPrev, alignedNext] = padAlign(prev, next)
    const changedIndexes: number[] = []
    alignedNext.split("").forEach((char, i) => {
      if (char !== alignedPrev[i]) changedIndexes.push(i)
    })

    const nextCells: CellState[] = alignedNext.split("").map((char, i) => {
      const changed = char !== alignedPrev[i]
      return {
        char: char === " " ? "" : char,
        key: changed ? `${id}-${i}-${char}-${Date.now()}` : `${id}-${i}-stable`,
        flash: changed,
      }
    })

    // Stagger left→right ~30ms for changed columns only (handled via transition delay).
    setCells(nextCells)
    prevRef.current = next

    const clearFlash = window.setTimeout(() => {
      setCells((current) => current.map((c) => ({ ...c, flash: false })))
    }, 180)
    return () => window.clearTimeout(clearFlash)
  }, [display, id, reduceMotion])

  const visible = cells.filter((c) => c.char !== "")

  return (
    <span
      className={cn("inline-flex items-baseline tabular-nums", className)}
      aria-label={ariaLabel ?? display}
      data-testid="roller-digit"
      data-value={display}
    >
      {visible.map((cell, visualIndex) => {
        const stagger = reduceMotion ? 0 : visualIndex * 0.03
        return (
          <span
            key={`${id}-slot-${visualIndex}`}
            className={cn(
              "relative inline-block overflow-hidden h-[1.1em] min-w-[0.55em] text-center align-baseline",
              digitClassName
            )}
            data-changed={cell.flash ? "true" : "false"}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={cell.key}
                className={cn(
                  "absolute inset-0 flex items-center justify-center",
                  cell.flash && "text-[#F59E0B]"
                )}
                initial={
                  reduceMotion
                    ? false
                    : { y: "-110%", opacity: 0.6 }
                }
                animate={{
                  y: 0,
                  opacity: 1,
                  color: cell.flash ? "#F59E0B" : undefined,
                }}
                exit={
                  reduceMotion
                    ? undefined
                    : { y: "110%", opacity: 0 }
                }
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : {
                        duration: 0.25,
                        delay: stagger,
                        ease: [0.22, 1, 0.36, 1],
                      }
                }
                onAnimationComplete={() => {
                  /* color fade handled by clearing flash flag */
                }}
                style={
                  cell.flash && !reduceMotion
                    ? { transition: "color 150ms ease" }
                    : undefined
                }
              >
                {cell.char}
              </motion.span>
            </AnimatePresence>
            {/* Invisible spacer keeps width stable while absolute chars animate */}
            <span className="invisible">{cell.char}</span>
          </span>
        )
      })}
    </span>
  )
}
