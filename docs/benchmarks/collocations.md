# Collocation Feature: reference and thresholds

> **Read this first.** Thresholds were chosen on the same probes and Gold Scripts they
> are reported on, so these rates are optimistic. The probes are author-written learner
> errors (29 pairs), and the 7 strong Gold
> Scripts are author-written too. The rates show the check behaves sensibly, not how it
> performs on real candidates.

Reference: WikiText-103 (raw), train split (CC BY-SA 3.0 (text from English Wikipedia)), first 25,000,000 words, parsed with spaCy `en_core_web_sm`. 225,363 pairs stored (seen at least 2 times).

Chosen: flag a pairing seen at most **2** times when chance alone predicts at least **2**. 

| Probe errors caught | Correct probes flagged | Flags per 100 words, strong essays |
|---|---|---|
| 31% | 3% | 0.48 |

Constraints: correct probes flagged at most 10%, at most 0.5 flags per 100 words on Gold Scripts banded 7 or above (1,673 words).
