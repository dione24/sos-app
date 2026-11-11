package expo.modules.bleadvertiser

import java.util.concurrent.atomic.AtomicLong

/** No Android dependencies: owns exactly one pending start and rejects stale generations. */
internal class AdvertisingSessionState<P> {
  companion object { private val nextGeneration = AtomicLong() }
  data class Ended<P>(val generation: Long, val pending: P?)
  private data class Session<P>(val generation: Long, val requestId: String, var pending: P?)
  private var current: Session<P>? = null

  @Synchronized fun isStarting(): Boolean = current?.pending != null
  @Synchronized fun generationFor(requestId: String? = null): Long? =
    current?.takeIf { requestId == null || it.requestId == requestId }?.generation

  @Synchronized fun begin(requestId: String, pending: P): Long {
    check(current == null) { "Previous advertising session must be ended first" }
    val generation = nextGeneration.incrementAndGet()
    current = Session(generation, requestId, pending)
    return generation
  }

  @Synchronized fun isCurrent(generation: Long): Boolean = current?.generation == generation

  @Synchronized fun complete(generation: Long): P? {
    val session = current?.takeIf { it.generation == generation } ?: return null
    val pending = session.pending
    session.pending = null
    return pending
  }

  @Synchronized fun end(generation: Long): Ended<P>? {
    val session = current?.takeIf { it.generation == generation } ?: return null
    current = null
    return Ended(generation, session.pending)
  }
}

/** Android service bookkeeping, kept pure so delivered START/STOP races are testable. */
internal class ForegroundSessionState {
  var generation = 0L
    private set
  private var startId = 0

  fun started(generation: Long, startId: Int) {
    this.generation = generation
    this.startId = startId
  }

  fun stop(generation: Long): Int? {
    if (this.generation != generation) return null
    val stopId = startId
    this.generation = 0L
    startId = 0
    return stopId
  }

  fun rejectStart(deliveredStartId: Int, isActive: (Long) -> Boolean): Int? {
    if (isActive(generation)) return null
    generation = 0L
    startId = 0
    // Android may already know a later startId than the session being stopped.
    return deliveredStartId
  }
}
