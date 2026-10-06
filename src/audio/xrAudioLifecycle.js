import { sharedAudioRuntime, unlockAudioContext } from "./audioManager.js";

// XR session lifetime controls playback independently of saved audio preferences.
export function createXRAudioLifecycle(xrStore, {
  runtime = sharedAudioRuntime,
  unlock = unlockAudioContext,
  warn = (...args) => console.warn(...args),
} = {}) {
  let pendingEntry = null;
  let disconnectCurrent = null;
  const retiredSessions = new WeakSet();

  function connect() {
    disconnectCurrent?.();
    let connected = true;
    let currentSession = null;
    let cleanupSession = null;

    function bindSession(session) {
      if (session === currentSession) return;
      const resetPosition = currentSession != null;
      if (currentSession != null) retiredSessions.add(currentSession);
      cleanupSession?.();
      cleanupSession = null;
      currentSession = null;
      // The XR store may clear the session before our own end listener runs.
      runtime.stop({ resetPosition });
      if (session == null || retiredSessions.has(session)) return;

      currentSession = session;
      const canContinue = () => connected && currentSession === session &&
        xrStore.getState().session === session && !retiredSessions.has(session) &&
        session.visibilityState === "visible";
      const onVisibilityChange = () => {
        if (!connected || currentSession !== session || retiredSessions.has(session)) return;
        if (canContinue()) runtime.start(canContinue);
        else runtime.stop();
      };
      const onEnd = () => {
        if (!connected || currentSession !== session) return;
        retiredSessions.add(session);
        currentSession = null;
        runtime.stop({ resetPosition: true });
        cleanupSession?.();
        cleanupSession = null;
      };
      session.addEventListener("end", onEnd);
      session.addEventListener("visibilitychange", onVisibilityChange);
      cleanupSession = () => {
        session.removeEventListener("end", onEnd);
        session.removeEventListener("visibilitychange", onVisibilityChange);
      };
      onVisibilityChange();
    }

    runtime.stop();
    bindSession(xrStore.getState().session);

    const unsubscribe = xrStore.subscribe((state, previousState) => {
      if (state.session === previousState.session) return;
      bindSession(state.session);
    });
    const disconnect = () => {
      if (!connected) return;
      connected = false;
      unsubscribe();
      cleanupSession?.();
      cleanupSession = null;
      currentSession = null;
      runtime.stop();
      if (disconnectCurrent === disconnect) disconnectCurrent = null;
    };
    disconnectCurrent = disconnect;
    return disconnect;
  }

  function enterVR() {
    if (pendingEntry != null) return pendingEntry;
    const session = xrStore.getState().session;
    if (session != null && !retiredSessions.has(session)) return Promise.resolve(session);

    const handleFailure = (error) => {
      if (xrStore.getState().session == null) runtime.stop();
      warn("VR could not start", error);
    };

    try {
      // Only unlock the context here; actual session/visibility events enable BGM.
      void unlock();
      pendingEntry = Promise.resolve(xrStore.enterVR())
        .catch(handleFailure)
        .finally(() => { pendingEntry = null; });
      return pendingEntry;
    } catch (error) {
      handleFailure(error);
      return Promise.resolve();
    }
  }

  return { connect, enterVR };
}
