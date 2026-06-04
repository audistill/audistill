import { describe, it, expect } from 'vitest'
import {
  clampWidth,
  shouldSnap,
  LEFT_SIDEBAR_MIN,
  LEFT_SIDEBAR_MAX,
  RIGHT_SIDEBAR_MIN,
  RIGHT_SIDEBAR_MAX,
  SNAP_THRESHOLD,
} from '../src/renderer/src/components/ResizeHandle'

describe('clampWidth', () => {
  it('returns min when value is below min', () => {
    expect(clampWidth(100, 200, 400)).toBe(200)
  })

  it('returns max when value is above max', () => {
    expect(clampWidth(500, 200, 400)).toBe(400)
  })

  it('returns value when within range', () => {
    expect(clampWidth(300, 200, 400)).toBe(300)
  })

  it('returns min when value equals min', () => {
    expect(clampWidth(200, 200, 400)).toBe(200)
  })

  it('returns max when value equals max', () => {
    expect(clampWidth(400, 200, 400)).toBe(400)
  })
})

describe('shouldSnap', () => {
  it('returns true when value is more than SNAP_THRESHOLD below min', () => {
    expect(shouldSnap(LEFT_SIDEBAR_MIN - SNAP_THRESHOLD - 1, LEFT_SIDEBAR_MIN)).toBe(true)
  })

  it('returns false when value is exactly SNAP_THRESHOLD below min', () => {
    expect(shouldSnap(LEFT_SIDEBAR_MIN - SNAP_THRESHOLD, LEFT_SIDEBAR_MIN)).toBe(false)
  })

  it('returns false when value is above min', () => {
    expect(shouldSnap(LEFT_SIDEBAR_MIN + 10, LEFT_SIDEBAR_MIN)).toBe(false)
  })

  it('works with right sidebar values', () => {
    expect(shouldSnap(RIGHT_SIDEBAR_MIN - SNAP_THRESHOLD - 1, RIGHT_SIDEBAR_MIN)).toBe(true)
    expect(shouldSnap(RIGHT_SIDEBAR_MIN, RIGHT_SIDEBAR_MIN)).toBe(false)
  })
})

describe('constants', () => {
  it('has correct left sidebar bounds', () => {
    expect(LEFT_SIDEBAR_MIN).toBe(200)
    expect(LEFT_SIDEBAR_MAX).toBe(400)
  })

  it('has correct right sidebar bounds', () => {
    expect(RIGHT_SIDEBAR_MIN).toBe(300)
    expect(RIGHT_SIDEBAR_MAX).toBe(600)
  })

  it('snap threshold is 50px', () => {
    expect(SNAP_THRESHOLD).toBe(50)
  })
})
