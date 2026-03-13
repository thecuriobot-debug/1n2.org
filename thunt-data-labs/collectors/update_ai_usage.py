#!/usr/bin/env python3.12
"""
AI Usage Daily Tracker
Tracks usage across Claude, ChatGPT, Codex, Gemini, OpenClaw.
For other AIs: generates structured self-report prompts via their APIs,
then parses and stores the responses.

State stored in ~/.ai-usage-state.json
Output: ai-usage/data.json
"""
import os, json, sys, requests
from datetime import datetime, date
from pathlib import Path

BASE       = Path("/Users/curiobot/Sites/1n2.org/ai-usage")
STATE_FILE = Path.home() / ".ai-usage-state.json"
TODAY      = date.today().isoformat()
NOW        = datetime.now().isoformat()

# ── State management ──────────────────────────────────────────────────────
def load_state():
    try:    return json.loads(STATE_FILE.read_text())
    except: return {"history": [], "providers": {}}

def save_state(s):
    STATE_FILE.write_text(json.dumps(s, indent=2))

# ── Claude: count from prompts.json + known baseline ─────────────────────
def count_claude(state):
    BASELINE = 15000  # Known from project history (Feb 7 – Mar 8: 36 sessions ~8.5M tokens)
    try:
        p = BASE / "claude-usage/prompts.json"
        if p.exists():
            data = json.loads(p.read_text())
            tracked = len(data) if isinstance(data, list) else data.get("total", 0)
            return max(tracked, BASELINE)
    except: pass
    return BASELINE

# ── OpenClaw: count from gateway log + cron runs ─────────────────────────
def count_openclaw(state):
    # Each master-run.sh invocation = ~22 jobs
    log = Path("/Users/curiobot/.openclaw/logs/gateway.log")
    runs = 0
    if log.exists():
        for line in log.read_text().splitlines():
            if "listening on ws://" in line:
                runs += 1
    # Also count cron master-run.sh executions
    cron_log = Path("/tmp/cron-master.log")
    if cron_log.exists():
        cron_runs = cron_log.read_text().count("1n2.org Ecosystem Master Run")
        runs += cron_runs
    return max(runs, 1)

# ── ChatGPT: call API for usage report ───────────────────────────────────
def poll_chatgpt(state):
    """Poll ChatGPT API for a self-reported usage summary."""
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        print("  ℹ️  ChatGPT: no OPENAI_API_KEY — skipping API poll")
        return state.get("providers", {}).get("chatgpt", {})

    models_to_try = ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"]
    for model in models_to_try:
        try:
            r = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model": model,
                    "max_tokens": 150,
                    "messages": [{"role": "user", "content":
                        f"Today is {TODAY}. Reply with ONLY valid JSON, no markdown fences: "
                        f"{{\"model\":\"{model}\",\"primary_use\":\"one sentence about AI assistance\",\"session_count\":1,\"notes\":\"brief note\"}}"
                    }]
                },
                timeout=20
            )
            data = r.json()
            if r.status_code == 429:
                err = data.get("error", {})
                if "insufficient_quota" in err.get("code", ""):
                    print(f"  ⚠️  ChatGPT: no billing set up — key configured but quota empty")
                    print(f"     → Add payment at platform.openai.com/account/billing")
                else:
                    print(f"  ⚠️  ChatGPT {model}: rate limited, trying next")
                continue
            if r.status_code != 200:
                print(f"  ⚠️  ChatGPT {model}: HTTP {r.status_code}")
                continue

            text = data["choices"][0]["message"]["content"].strip()
            if "```" in text:
                text = text.split("```")[1].strip()
                if text.startswith("json"): text = text[4:].strip()
            try:
                report = json.loads(text)
            except json.JSONDecodeError:
                report = {"model": model, "primary_use": "Code + research assistance", "session_count": 1, "notes": "Active"}

            print(f"  ✅ ChatGPT ({model}): {report.get('primary_use','')[:60]}")
            return {
                "name": "ChatGPT (OpenAI)",
                "model": report.get("model", model),
                "primary_use": report.get("primary_use", "Code + research assistance"),
                "color": "#19c37d", "icon": "💬",
                "total_prompts": state.get("providers",{}).get("chatgpt",{}).get("total_prompts", 0) + report.get("session_count", 1),
                "last_polled": TODAY,
                "notes": report.get("notes", ""),
                "status": "active",
            }
        except Exception as e:
            print(f"  ⚠️  ChatGPT {model}: {e}")
            continue

    # Key exists but no quota — still record it as configured
    print(f"  ℹ️  ChatGPT: key configured, needs billing at platform.openai.com")
    existing = state.get("providers", {}).get("chatgpt", {})
    return {**existing,
        "name": "ChatGPT (OpenAI)", "color": "#19c37d", "icon": "💬",
        "status": "needs_billing", "last_polled": TODAY,
        "notes": "Key set — add billing at platform.openai.com/account/billing",
    }

# ── Gemini: call API for usage report ────────────────────────────────────
def poll_gemini(state):
    """Poll Gemini API for a self-reported usage summary."""
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        print("  ℹ️  Gemini: no GEMINI_API_KEY — skipping API poll")
        return state.get("providers", {}).get("gemini", {})

    # Try models in order — lite has separate quota from flash
    models_to_try = ["gemini-2.0-flash-lite", "gemini-2.0-flash", "gemini-2.5-flash"]
    for model in models_to_try:
        try:
            r = requests.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}",
                headers={"Content-Type": "application/json"},
                json={"contents": [{"parts": [{"text":
                    f"Today is {TODAY}. I am tracking AI usage for a personal project at 1n2.org. "
                    f"Reply with ONLY a JSON object, no markdown fences, no explanation. "
                    f"Format: {{\"model\":\"{model}\",\"primary_use\":\"one sentence\",\"session_count\":1,\"notes\":\"brief note\"}}"
                }]}]},
                timeout=20
            )
            if r.status_code == 429:
                print(f"  ⚠️  Gemini {model}: quota exceeded, trying next model")
                continue
            r.raise_for_status()
            data   = r.json()
            text   = data["candidates"][0]["content"]["parts"][0]["text"].strip()
            # Strip markdown fences if present
            if "```" in text:
                text = text.split("```")[1].strip()
                if text.startswith("json"): text = text[4:].strip()
            report = json.loads(text)
            print(f"  ✅ Gemini ({model}): {report.get('primary_use','')[:60]}")
            return {
                "name": "Gemini (Google)",
                "model": model,
                "primary_use": report.get("primary_use", "Research + search"),
                "color": "#4285f4", "icon": "🌐",
                "total_prompts": state.get("providers",{}).get("gemini",{}).get("total_prompts", 0) + report.get("session_count", 1),
                "last_polled": TODAY,
                "notes": report.get("notes", ""),
            }
        except json.JSONDecodeError:
            # Model responded but not pure JSON — still counts as working
            print(f"  ✅ Gemini ({model}): responded (non-JSON, using defaults)")
            return {
                "name": "Gemini (Google)", "model": model,
                "primary_use": "Research + search assistance", "color": "#4285f4", "icon": "🌐",
                "total_prompts": state.get("providers",{}).get("gemini",{}).get("total_prompts", 0) + 1,
                "last_polled": TODAY, "notes": "API active",
            }
        except Exception as e:
            print(f"  ⚠️  Gemini {model}: {e}")
            continue

    print("  ❌ Gemini: all models failed")
    return state.get("providers", {}).get("gemini", {})

# ── Codex: check for usage via OpenAI API ────────────────────────────────
def poll_codex(state):
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        print("  ℹ️  Codex: no OPENAI_API_KEY — skipping")
        return state.get("providers", {}).get("codex", {})
    # Codex is GPT-4o for code — same API, different use tracking
    existing = state.get("providers", {}).get("codex", {})
    return {
        "name": "Codex / GPT-4.1",
        "model": "gpt-4.1",
        "primary_use": existing.get("primary_use", "Code generation + debugging"),
        "color": "#a78bfa", "icon": "⚡",
        "total_prompts": existing.get("total_prompts", 0),
        "last_polled": TODAY,
    }

# ── Build daily history entry ─────────────────────────────────────────────
def build_daily_entry(claude_count, openclaw_count, providers):
    return {
        "date":    TODAY,
        "claude":  claude_count,
        "openclaw": openclaw_count,
        "chatgpt": providers.get("chatgpt", {}).get("total_prompts", 0),
        "gemini":  providers.get("gemini", {}).get("total_prompts", 0),
    }

# ── Main ──────────────────────────────────────────────────────────────────
def run():
    print(f"\n🤖 AI Usage Update — {TODAY}")
    state = load_state()

    claude_count   = count_claude(state)
    openclaw_count = count_openclaw(state)

    print(f"  Claude: {claude_count:,} prompts (baseline + tracked)")
    print(f"  OpenClaw: {openclaw_count:,} gateway sessions")

    # Poll other AIs
    chatgpt = poll_chatgpt(state)
    gemini  = poll_gemini(state)
    codex   = poll_codex(state)

    providers = {
        "claude": {
            "name": "Claude (Anthropic)",
            "model": "claude-sonnet-4",
            "primary_use": "All 1n2.org development — 36 sessions, ~8.5M tokens, Feb 7–present",
            "color": "#da7756", "icon": "🤖",
            "total_prompts": claude_count,
            "last_polled": TODAY,
        },
        "openclaw": {
            "name": "OpenClaw (Daily Automation)",
            "model": "local + claude",
            "primary_use": "Cron automation — 22 jobs/night, master pipeline orchestration",
            "color": "#7eb8f7", "icon": "🔬",
            "total_runs": openclaw_count,
            "jobs_per_run": 22,
            "last_polled": TODAY,
        },
        "chatgpt": chatgpt or {
            "name": "ChatGPT (OpenAI)", "model": "gpt-4o",
            "primary_use": "Research + comparison", "color": "#19c37d", "icon": "💬",
            "total_prompts": 0, "last_polled": None,
        },
        "codex": codex,
        "gemini": gemini or {
            "name": "Gemini (Google)", "model": "gemini-2.0-flash",
            "primary_use": "Search + research", "color": "#4285f4", "icon": "🌐",
            "total_prompts": 0, "last_polled": None,
        },
    }

    # Add to daily history (dedupe by date)
    history = state.get("history", [])
    history = [h for h in history if h.get("date") != TODAY]
    history.append(build_daily_entry(claude_count, openclaw_count, providers))
    history = history[-90:]  # keep 90 days

    # Save state
    state["providers"] = providers
    state["history"]   = history
    state["last_updated"] = NOW
    save_state(state)

    # Write output file
    output = {
        "last_updated": NOW,
        "date": TODAY,
        "providers": providers,
        "totals": {
            "all_prompts": claude_count + providers.get("chatgpt",{}).get("total_prompts",0) + providers.get("gemini",{}).get("total_prompts",0),
        },
        "history": history,
        "project_stats": {
            "sessions": 36,
            "tokens_approx": "8.5M",
            "start_date": "2026-02-07",
            "projects_built": 40,
            "lines_of_code": 105000,
        }
    }
    out_file = BASE / "data.json"
    out_file.write_text(json.dumps(output, indent=2))
    print(f"  ✅ ai-usage/data.json updated — {out_file}")

if __name__ == "__main__":
    run()
