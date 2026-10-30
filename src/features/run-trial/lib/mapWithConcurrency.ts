export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (limit < 1) {
    throw new Error('동시 실행 수는 1 이상이어야 합니다.')
  }

  const results = new Array<R>(items.length)
  let next = 0

  async function runWorker() {
    while (next < items.length) {
      const index = next
      next += 1
      const item = items[index]

      if (item === undefined) return

      results[index] = await worker(item, index)
    }
  }

  const workerCount = Math.min(limit, items.length)
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()))

  return results
}
