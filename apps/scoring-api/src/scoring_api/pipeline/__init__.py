"""The scoring pipeline, one module per SPEC stage.

draft.py        stage 1 (ingestion) and the parallel run of stages 2 and 3
features.py     stage 2: deterministic features
rubric.py       stage 3: Gemini rubric scoring (prompts.py holds its prompt text)
calibration.py  stage 4: calibration
ensemble.py     stage 5: ensemble, cross-check and margin of error
final.py        stages 4-5 on top of a draft, behind POST /score/final
"""
