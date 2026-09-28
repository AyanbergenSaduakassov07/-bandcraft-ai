# Fine-tuning runs on Kaggle only, never locally

Any model fine-tuning or training, including Calibration models heavy enough to need a GPU, runs in Kaggle notebooks. Nothing is trained on a developer machine. Kaggle gives free GPU quota and a reproducible, shareable environment. As a result, training code ships as notebooks or scripts that run on Kaggle, and the app only ever loads their exported artifacts.
