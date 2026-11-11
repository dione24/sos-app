package expo.modules.bleadvertiser

import org.junit.Assert.*
import org.junit.Test

class AdvertisingSessionStateTest {
  @Test fun stopReturnsPendingStartExactlyOnceAndAllowsRestart() {
    val state = AdvertisingSessionState<String>()
    val generation = state.begin("first", "pending-promise")
    assertTrue(state.isStarting())
    assertEquals("pending-promise", state.end(generation)?.pending)
    assertFalse(state.isStarting())
    assertNull(state.end(generation))
    val replacement = state.begin("next", "next-promise")
    assertNotEquals(generation, replacement)
    assertEquals("next-promise", state.complete(replacement))
  }

  @Test fun lateCallbackOrTimeoutCannotResolveOrStopReplacement() {
    val state = AdvertisingSessionState<String>()
    val old = state.begin("old", "old-promise")
    state.end(old)
    val current = state.begin("current", "current-promise")
    assertNull(state.complete(old))
    assertNull(state.end(old))
    assertFalse(state.isCurrent(old))
    assertTrue(state.isCurrent(current))
    assertEquals("current-promise", state.complete(current))
    assertNull(state.complete(current))
  }

  @Test fun abortedAutomaticRequestCannotStopVoluntaryReplacement() {
    val state = AdvertisingSessionState<String>()
    val old = state.begin("automatic", "p1")
    state.complete(old)
    state.end(old)
    val voluntary = state.begin("voluntary", "p2")
    assertNull(state.generationFor("automatic"))
    assertEquals(voluntary, state.generationFor("voluntary"))
    assertEquals(voluntary, state.generationFor(null))
  }

  @Test fun generationsAreUniqueAcrossModuleInstances() {
    val first = AdvertisingSessionState<String>().begin("a", "p1")
    val second = AdvertisingSessionState<String>().begin("b", "p2")
    assertNotEquals(first, second)
  }

  @Test fun cancelledStartDeliveredBeforeOldStopStopsTheLatestAndroidStartId() {
    val service = ForegroundSessionState()
    service.started(101L, 1)
    // A ended, B was cancelled before Android delivered START B (startId 2).
    assertEquals(2, service.rejectStart(2) { false })
    assertEquals(0L, service.generation)
    assertNull(service.stop(101L))
  }

  @Test fun oldStopThatCannotStopTheAndroidServiceClearsItsSessionBeforeCancelledStart() {
    val service = ForegroundSessionState()
    service.started(101L, 1)
    assertEquals(1, service.stop(101L))
    // stopSelfResult(1) may return false because Android already queued START 2.
    assertEquals(0L, service.generation)
    assertEquals(2, service.rejectStart(2) { false })
  }

  @Test fun invalidOldStartPreservesAnotherActuallyActiveForegroundSession() {
    val service = ForegroundSessionState()
    service.started(303L, 3)
    assertNull(service.rejectStart(4) { it == 303L })
    assertEquals(303L, service.generation)
    assertNull(service.stop(101L))
    assertEquals(3, service.stop(303L))
  }
}
