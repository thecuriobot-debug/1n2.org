#!/usr/bin/env python3.12
"""
Curio-DID: Difference-in-Differences Engine
Estimates causal effects of events on Curio Cards prices/volume.

Model: Y_it = β0 + β1·Treatment_i + β2·Post_t + β3·(Treatment_i × Post_t) + ε_it
β3 is the DID treatment effect.
"""
import json
import numpy as np
import pandas as pd
import yaml
from pathlib import Path
from datetime import datetime

# Try statsmodels, fall back to manual OLS
try:
    import statsmodels.api as sm
    import statsmodels.formula.api as smf
    HAS_STATSMODELS = True
except ImportError:
    HAS_STATSMODELS = False

BASE = Path(__file__).parent.parent
CONFIG = BASE / "config" / "events.yaml"
DATA_DIR = BASE / "data"

# Import loader
import sys
sys.path.insert(0, str(Path(__file__).parent))
from load_curio_data import build_panel_data, load_daily_snapshots


def load_events():
    """Load events from YAML config."""
    if not CONFIG.exists():
        return {}
    with open(CONFIG) as f:
        data = yaml.safe_load(f)
    return data.get("events", {})


def run_did(panel, event_date, treated_cards, control_cards=None, outcome="price"):
    """
    Run Difference-in-Differences analysis.

    Args:
        panel: DataFrame with columns [card_id, date, price, volume]
        event_date: str or datetime, the treatment date
        treated_cards: list of card_ids that received treatment
        control_cards: list of card_ids for control group (default: all others)
        outcome: 'price' or 'volume'

    Returns:
        dict with coefficient, p_value, ci_lower, ci_upper, summary
    """
    event_date = pd.to_datetime(event_date)

    if control_cards is None:
        all_cards = panel["card_id"].unique()
        control_cards = [c for c in all_cards if c not in treated_cards]

    # Filter to treated + control cards
    df = panel[panel["card_id"].isin(treated_cards + control_cards)].copy()

    if df.empty:
        return {"error": "No data for specified cards"}

    # Create DID variables
    df["treatment"] = df["card_id"].isin(treated_cards).astype(int)
    df["post"] = (df["date"] >= event_date).astype(int)
    df["did"] = df["treatment"] * df["post"]

    y = df[outcome].values

    if HAS_STATSMODELS:
        # Use statsmodels for proper inference
        formula = f"{outcome} ~ treatment + post + did"
        try:
            model = smf.ols(formula, data=df).fit()
            did_coef = model.params.get("did", 0)
            did_pval = model.pvalues.get("did", 1)
            ci = model.conf_int().loc["did"] if "did" in model.conf_int().index else [0, 0]

            return {
                "coefficient": round(float(did_coef), 6),
                "p_value": round(float(did_pval), 4),
                "ci_lower": round(float(ci[0]), 6),
                "ci_upper": round(float(ci[1]), 6),
                "r_squared": round(float(model.rsquared), 4),
                "n_obs": int(model.nobs),
                "summary": str(model.summary()),
            }
        except Exception as e:
            return {"error": f"statsmodels failed: {e}"}
    else:
        # Manual OLS fallback
        X = np.column_stack([
            np.ones(len(df)),
            df["treatment"].values,
            df["post"].values,
            df["did"].values,
        ])
        try:
            beta = np.linalg.lstsq(X, y, rcond=None)[0]
            residuals = y - X @ beta
            n, k = X.shape
            sigma2 = np.sum(residuals**2) / (n - k)
            var_beta = sigma2 * np.linalg.inv(X.T @ X)
            se = np.sqrt(np.diag(var_beta))

            did_coef = beta[3]
            did_se = se[3]
            t_stat = did_coef / did_se if did_se > 0 else 0
            # Approximate p-value (two-tailed, normal approx)
            from scipy import stats as sp_stats
            p_val = 2 * (1 - sp_stats.norm.cdf(abs(t_stat)))

            return {
                "coefficient": round(float(did_coef), 6),
                "p_value": round(float(p_val), 4),
                "ci_lower": round(float(did_coef - 1.96 * did_se), 6),
                "ci_upper": round(float(did_coef + 1.96 * did_se), 6),
                "r_squared": round(float(1 - np.sum(residuals**2) / np.sum((y - y.mean())**2)), 4),
                "n_obs": n,
                "summary": f"β3(DID)={did_coef:.6f}, SE={did_se:.6f}, t={t_stat:.3f}, p={p_val:.4f}",
            }
        except Exception as e:
            return {"error": f"Manual OLS failed: {e}"}


def compute_group_means(panel, event_date, treated_cards, control_cards=None, outcome="price"):
    """Compute group means for charting: treatment vs control, pre vs post."""
    event_date = pd.to_datetime(event_date)
    if control_cards is None:
        all_cards = panel["card_id"].unique()
        control_cards = [c for c in all_cards if c not in treated_cards]

    df = panel[panel["card_id"].isin(treated_cards + control_cards)].copy()
    df["group"] = df["card_id"].apply(lambda x: "treatment" if x in treated_cards else "control")

    # Daily group means
    daily = df.groupby(["date", "group"])[outcome].mean().reset_index()
    daily_pivot = daily.pivot(index="date", columns="group", values=outcome).reset_index()

    return {
        "dates": [d.strftime("%Y-%m-%d") for d in daily_pivot["date"]],
        "treatment": [round(float(v), 4) if pd.notna(v) else None for v in daily_pivot.get("treatment", [])],
        "control": [round(float(v), 4) if pd.notna(v) else None for v in daily_pivot.get("control", [])],
        "event_date": event_date.strftime("%Y-%m-%d"),
    }


def run_all_events():
    """Run DID for all configured events. Returns results dict."""
    events = load_events()
    panel = build_panel_data()

    if panel.empty:
        return {"error": "No panel data available"}

    results = {}
    for event_id, event in events.items():
        treated = event.get("treated_cards", [])
        control = event.get("control_cards", None)
        event_date = event.get("date", "")

        did_result = run_did(panel, event_date, treated, control)
        chart_data = compute_group_means(panel, event_date, treated, control)

        results[event_id] = {
            "name": event.get("name", event_id),
            "description": event.get("description", ""),
            "hypothesis": event.get("hypothesis", ""),
            "date": event_date,
            "treated_cards": treated,
            "control_cards": control or [],
            "did": did_result,
            "chart": chart_data,
        }

    return results


if __name__ == "__main__":
    print("=== Curio-DID Analysis ===\n")
    results = run_all_events()

    if "error" in results:
        print(f"Error: {results['error']}")
    else:
        for eid, r in results.items():
            did = r["did"]
            sig = "***" if did.get("p_value", 1) < 0.01 else "**" if did.get("p_value", 1) < 0.05 else "*" if did.get("p_value", 1) < 0.1 else ""
            print(f"{r['name']} ({r['date']})")
            print(f"  DID coeff: {did.get('coefficient', '?')} {sig}")
            print(f"  p-value:   {did.get('p_value', '?')}")
            print(f"  95% CI:    [{did.get('ci_lower', '?')}, {did.get('ci_upper', '?')}]")
            print(f"  N:         {did.get('n_obs', '?')}")
            print()

    # Save results as JSON for the web interface
    DATA_DIR.mkdir(exist_ok=True)
    (DATA_DIR / "results.json").write_text(
        json.dumps(results, indent=2, default=str), encoding="utf-8")
    print(f"Results saved to {DATA_DIR / 'results.json'}")
