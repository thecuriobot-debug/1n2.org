# Curio-DID — Causal Analysis for Curio Cards

## What is Difference-in-Differences?

Difference-in-Differences (DID) is a causal inference method from econometrics. It estimates the *causal effect* of a treatment (like a marketplace listing or viral tweet) by comparing the change over time between a treatment group and a control group.

**Model:**
```
Y_it = β₀ + β₁·Treatment_i + β₂·Post_t + β₃·(Treatment_i × Post_t) + ε_it
```

- `β₃` is the DID treatment effect — the causal impact
- `Treatment_i` = 1 if card is in the treated group
- `Post_t` = 1 if the observation is after the event date
- The key assumption is **parallel trends**: without the treatment, both groups would have followed the same trajectory

## How Curio-DID Works

1. **Data**: Loads daily Curio Cards data from the Curio Data Hub (~14 days of daily snapshots with floor prices, volume, sales, holders)
2. **Panel**: Constructs a card × date panel dataset (30 cards × N days)
3. **Events**: Reads event definitions from `config/events.yaml`
4. **Analysis**: For each event, runs OLS regression with the DID specification
5. **Output**: Generates results JSON with coefficients, p-values, confidence intervals, and chart data
6. **Web**: Static HTML dashboard reads the JSON and renders interactive charts

## How to Add New Events

Edit `config/events.yaml`:

```yaml
events:
  my_new_event:
    name: "My Event Name"
    date: "2026-03-15"
    description: "What happened"
    treated_cards: [1, 2, 3]
    control_cards: [28, 29, 30]
```

Then re-run the analysis.

## How to Run Analysis Manually

```bash
cd curio-did

# Run the DID analysis
python3.12 analysis/did_model.py

# Test the data loader
python3.12 analysis/load_curio_data.py

# View results
cat data/results.json | python3 -m json.tool
```

## Project Structure

```
curio-did/
├── analysis/
│   ├── load_curio_data.py    # Connects to Curio Data Hub
│   └── did_model.py          # DID engine + event runner
├── config/
│   └── events.yaml           # Event definitions
├── data/
│   └── results.json          # Generated analysis results
├── index.html                # Web dashboard
└── README.md
```

## Interpreting Results

- **β₃ (DID coefficient)**: The estimated causal effect in ETH. Positive = price increase.
- **p-value**: Probability the effect is due to chance. < 0.05 = statistically significant.
- **95% CI**: Confidence interval. If it doesn't include 0, the effect is significant.
- **Chart**: Blue = treatment group, gold = control group, red dashed = event date.

## Data Source

All data comes from the existing **Curio Data Hub** at `~/.curio-data-hub/`. No duplicate pipelines.
