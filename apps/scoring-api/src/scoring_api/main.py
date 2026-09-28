from fastapi import FastAPI

app = FastAPI(title="BandCraft AI Scoring API")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
