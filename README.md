# GLM-5-FP8 Steering Experiment Eval Logs

Sample-level eval logs from activation steering experiments on GLM-5-FP8, across agentic misalignment, math, and BFCL benchmarks.

## Data format

### `data/meta.json`

Top-level index containing run metadata and contrastive pair definitions.

```json
{
  "contrastive_pairs": {
    "vector_name": { ... }
  },
  "runs": [
    {
      "eval_name": "agentic_misalignment",
      "vector_name": "hua_et_al",
      "scale": -1.0,
      "n": 250,
      "harmful_rate": 0.12,
      "vea_rate": 0.04,
      "scores": { ... },
      "data_file": "data/runs/agentic_misalignment/hua_et_al/scale_-1.0.json"
    }
  ]
}
```

Each entry in `runs` describes one eval run at a particular (eval, vector, scale) combination. `data_file` points to the per-run JSON containing sample data.

### Per-run JSON (`data/runs/{eval}/{vector}/scale_{scale}.json`)

```json
{
  "shared_messages": [
    {"role": "system", "visible": "You are a helpful assistant...", "reasoning": null},
    {"role": "user", "visible": "Please do the following task...", "reasoning": null}
  ],
  "samples": [
    {
      "id": "sample_id",
      "epoch": 1,
      "scores": {
        "harmful_action_classifier": {
          "value": 0.0,
          "explanation": "The model did not...",
          "answer": null
        }
      },
      "messages": [
        {"role": "assistant", "visible": "I'll help you with...", "reasoning": "Let me think..."},
        {"role": "tool", "visible": "Tool output here", "reasoning": null}
      ]
    }
  ]
}
```

`shared_messages` contains system and user prompt messages that are identical across all samples in a run, stored once to save space. Each sample's `messages` contains only the assistant and tool messages. To reconstruct the full conversation, prepend `shared_messages` before each sample's `messages`.

#### Message fields

- `role`: one of `system`, `user`, `assistant`, `tool`
- `visible`: the visible text content
- `reasoning`: chain-of-thought text (assistant messages only), or `null`

#### Score fields

Each scorer produces:
- `value`: the score value (numeric or string depending on scorer)
- `explanation`: free-text explanation from the scorer, or `null`
- `answer`: extracted answer string, or `null`

Common scorers:
- `harmful_action_classifier`: 1.0 = harmful, 0.0 = not harmful
- `bfcl_scorer`: 1 = correct, 0 = incorrect
- `expression_equivalance`: `"C"` = correct, `"I"` = incorrect
