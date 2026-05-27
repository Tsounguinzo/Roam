export const isTauriRuntime = () =>
    typeof window !== "undefined" && Boolean((window as any).__TAURI_INTERNALS__);
