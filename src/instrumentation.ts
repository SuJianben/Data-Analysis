export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { prepareRuntimeSnapshot } = await import("@/services/database/runtime-snapshot");
    await prepareRuntimeSnapshot();
  } catch (error) {
    console.error("analytics_snapshot_restore_failed", error instanceof Error ? error.message : String(error));
  }
}
