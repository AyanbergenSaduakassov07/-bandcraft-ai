---
title: BandCraft Pronunciation
sdk: docker
app_port: 7860
private: true
license: mit
---

# Pronunciation endpoint

[OpenPronounce](https://github.com/Halleck45/OpenPronounce) 0.3.0 (MIT) behind `POST /pronunciation` (multipart `file` + `expected_text`), deployed as a **private Hugging Face Space**. `apps/speaking-api` calls it over HTTPS with a Hugging Face token. The model never runs in speaking-api or on a dev machine ([ADR-0005](../../docs/adr/0005-speaking-providers-and-hosted-pronunciation.md)).

The `pronunciation-endpoint` GitHub workflow deploys it. It needs the repo secrets `HF_TOKEN` (write access) and `HF_SPACE` (`<user>/<space>`). The free CPU tier sleeps when idle, so the first request after a pause is slow.
