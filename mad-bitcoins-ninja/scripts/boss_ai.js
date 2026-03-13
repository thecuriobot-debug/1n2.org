import { drawPixelText } from "./pixel_text.js";

const BOSS_NAMES = {
  stage1: "THE CENTRAL BANKER",
  stage2: "HASHRATE MONSTER",
  stage3: "SHITCOIN HYDRA",
  stage4: "LIQUIDATION ENGINE",
  stage5: "THE HACKER COLLECTIVE",
  stage6: "THE 51% ATTACKER",
};

export function createBossController(stageId) {
  return {
    stageId,
    active: false,
    bossName: BOSS_NAMES[stageId] || "UNKNOWN BOSS",
    triggerX: 230,
    update(player) {
      if (!this.active && player.x >= this.triggerX) {
        this.active = true;
      }
    },
    draw(ctx) {
      if (!this.active) {
        return;
      }

      ctx.fillStyle = "#ff5f6d";
      ctx.fillRect(8, 20, 132, 11);
      ctx.strokeStyle = "#ffe0a0";
      ctx.strokeRect(8, 20, 132, 11);
      drawPixelText(ctx, this.bossName, 10, 23, {
        color: "#0b0f1b",
      });
    },
  };
}
