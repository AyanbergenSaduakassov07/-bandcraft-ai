# All model calls go through the Gemini API free tier

Every language-model call in BandCraft AI, whether for scoring, consistency checks or feedback, goes through the Gemini API on the free tier. There are no other providers and no self-hosted inference. This keeps running costs at zero during development and validation. The free tier's rate and daily-request limits cap how many Scoring Runs a Script can get, so the pipeline has to hit its accuracy targets within that budget and can't just buy more runs.
