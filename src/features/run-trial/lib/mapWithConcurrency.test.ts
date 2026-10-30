import { describe, expect, it } from 'vitest'

import { mapWithConcurrency } from './mapWithConcurrency'

describe('mapWithConcurrency', () => {
  it('결과 순서를 유지하고 동시 실행 수를 넘지 않는다', async () => {
    let inFlight = 0
    let maxInFlight = 0
    let started = 0
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })

    const pending = mapWithConcurrency([1, 2, 3, 4, 5], 2, async (item) => {
      started += 1
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      await gate
      inFlight -= 1
      return item * 10
    })

    await flushMicrotasks()
    expect(started).toBe(2)
    expect(maxInFlight).toBe(2)

    release()
    await expect(pending).resolves.toEqual([10, 20, 30, 40, 50])
  })
})

async function flushMicrotasks() {
  await Promise.resolve()
  await Promise.resolve()
}
