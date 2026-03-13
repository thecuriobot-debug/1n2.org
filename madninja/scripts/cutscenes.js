import { drawPixelText, drawWrappedPixelText } from "./pixel_text.js";

export class CutscenePlayer {
  constructor() {
    this.active = false;
    this.panels = [];
    this.index = 0;
    this.minPanelTime = 0.15;
    this.panelTimer = 0;
  }

  start(panels) {
    this.active = true;
    this.panels = panels;
    this.index = 0;
    this.panelTimer = 0;
  }

  stop() {
    this.active = false;
    this.panels = [];
    this.index = 0;
    this.panelTimer = 0;
  }

  update(dt, input) {
    if (!this.active) {
      return;
    }

    this.panelTimer += dt;

    if (input.pressed("attack") || input.pressed("jump") || input.pressed("sub")) {
      if (this.panelTimer < this.minPanelTime) {
        return;
      }
      this.panelTimer = 0;
      this.index += 1;
      if (this.index >= this.panels.length) {
        this.stop();
      }
    }
  }

  draw(ctx, width, height) {
    if (!this.active) {
      return;
    }

    const panel = this.panels[this.index];
    if (!panel) {
      return;
    }

    ctx.save();
    ctx.globalAlpha = 0.88;
    ctx.fillStyle = "#05070e";
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    ctx.fillStyle = panel.color || "#222a49";
    ctx.fillRect(20, 30, width - 40, height - 80);
    ctx.strokeStyle = "#e6c36d";
    ctx.strokeRect(20, 30, width - 40, height - 80);

    drawPixelText(ctx, panel.title || "Panel", 28, 38, {
      color: "#f6f3de",
      shadow: true,
    });

    ctx.fillStyle = "#10131f";
    ctx.fillRect(18, height - 50, width - 36, 34);
    ctx.strokeStyle = "#465377";
    ctx.strokeRect(18, height - 50, width - 36, 34);

    const speaker = panel.speaker ? `${panel.speaker}: ` : "";
    const text = `${speaker}${panel.text || "..."}`;
    drawWrappedPixelText(ctx, text, 24, height - 42, width - 48, {
      color: "#f5f7ff",
      shadow: true,
      lineHeight: 8,
    });

    drawPixelText(ctx, "PRESS X/Z/C TO CONTINUE", 112, height - 24, {
      color: "#ffcc33",
      shadow: true,
    });
  }
}

export function getStageIntroCutscene() {
  return [
    {
      title: "Panel 1",
      text: "City skyline. Neon flickers over Wall Street rooftops.",
      color: "#1a2445",
    },
    {
      title: "Panel 2",
      text: "MadNinja lands on a rooftop, cane sword ready.",
      color: "#202b51",
    },
    {
      title: "Panel 3",
      speaker: "BANKER",
      text: "Bitcoin must be stopped.",
      color: "#3a1f2f",
    },
    {
      title: "Panel 4",
      speaker: "MADNINJA",
      text: "Buy Bitcoin.",
      color: "#152330",
    },
  ];
}
