import { useEffect, useRef } from "react";
import Phaser from "phaser";
import Pets from "./scenes/Pets";
import { useSettingStore } from "./hooks/useSettingStore";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
const appWindow = getCurrentWebviewWindow()

function PhaserWrapper() {
    const phaserDom = useRef<HTMLDivElement>(null);
    const gameRef = useRef<Phaser.Game | null>(null);
    const { pets } = useSettingStore();

    useEffect(() => {
        if (!phaserDom.current) return;

        const handleResize = () => {
            gameRef.current?.scale.resize(window.innerWidth, window.innerHeight);
        };

        window.addEventListener("resize", handleResize);

        // ensure that if component remount user will still be able to touch their screen
        appWindow.setIgnoreCursorEvents(true);

        const phaserConfig: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            parent: phaserDom.current,
            backgroundColor: '#ffffff0',
            transparent: true,
            roundPixels: true,
            antialias: true,
            scale: {
                mode: Phaser.Scale.ScaleModes.RESIZE,
                width: window.innerWidth,
                height: window.innerHeight,
            },
            physics: {
                default: 'arcade',
                arcade: {
                    debug: false,
                    gravity: { y: 200, x: 0},
                },
            },
            fps: {
                target: 30,
                min: 30,
                smoothStep: true,
            },
            scene: [Pets],
            audio: {
                noAudio: true,
            },
            callbacks: {
                preBoot: (game) => {
                    game.registry.set('spriteConfig', pets);
                }
            }
        }

        const game = new Phaser.Game(phaserConfig);
        gameRef.current = game;

        return () => {
            game.destroy(true);
            gameRef.current = null;
            if (phaserDom.current !== null) phaserDom.current.innerHTML = '';
            window.removeEventListener("resize", handleResize);
        }

    }, [pets]);

    return <div ref={phaserDom} />;
}

export default PhaserWrapper;
