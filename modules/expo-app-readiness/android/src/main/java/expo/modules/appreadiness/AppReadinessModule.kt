package expo.modules.appreadiness

import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Signal Android only after the actual route has committed and laid out. */
class AppReadinessModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SosAppReadiness")
    AsyncFunction("reportFullyDrawnAsync") {
      val activity = appContext.currentActivity
      if (activity == null || activity.isFinishing || activity.isDestroyed) {
        false
      } else {
        activity.reportFullyDrawn()
        true
      }
    }.runOnQueue(Queues.MAIN)
  }
}
