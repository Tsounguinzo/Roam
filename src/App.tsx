import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import React, { Suspense } from "react";
import Loading from "./Loading";
import { useSettings } from "./hooks/useSettings";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useDefaultPets, usePets } from "./hooks/usePets";
import { confirm } from "@tauri-apps/plugin-dialog";
import { MantineProvider } from "@mantine/core";
import { PrimaryColor } from "./utils";
import { isTauriRuntime } from "./utils/runtime";

const PhaserWrapper = React.lazy(() => import("./PhaserWrapper"));
const SettingsWindow = React.lazy(() => import("./SettingsWindow"));

function App() {
  useSettings();
  useDefaultPets();
  const { isError, error } = usePets();

  if (isError && isTauriRuntime()) {
    confirm(`Error: ${error.message}`, {
      title: 'Roam',
      kind: 'error',
    }).then((ok) => {
      if (ok !== undefined) {
        getCurrentWebviewWindow().close();
      }
    });
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <Suspense fallback={<Loading />}>
            <PhaserWrapper />
          </Suspense>
        } />
        <Route path="/setting" element={
          <Suspense fallback={<Loading />}>
            <MantineProvider
              defaultColorScheme="light"
              forceColorScheme="light"
              theme={{
                fontFamily: '"Nunito", ui-rounded, "SF Pro Rounded", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, "Siemreap", sans-serif',
                colors: {
                  brand: [
                    "#fff5ef",
                    "#ffe6d8",
                    "#ffd4bd",
                    "#f9bf9a",
                    "#f2aa82",
                    "#e89467",
                    "#c77b55",
                    "#a9674e",
                    "#6f3f32",
                    "#151b2d",
                  ],
                },
                primaryColor: PrimaryColor,
              }} >
              <SettingsWindow />
            </MantineProvider>
          </Suspense>
        } />
      </Routes>
    </Router>
  );
}

export default App;
