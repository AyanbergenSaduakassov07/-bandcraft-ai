# n8n workflows

`template-index-refresh.json` keeps the originality template index fresh. Every Monday at 03:00 it dispatches the `template-index` GitHub Actions workflow, which generates 60 new templated Task 2 essays with Gemini, embeds them and appends them to pgvector. When that succeeds, `calibrate` refits the classifier and opens a PR with the new artifact.

n8n only schedules the run. The work happens on GitHub's machines, and the Gemini and Supabase keys stay in GitHub secrets.

## Setup

1. In n8n, go to **Workflows → Import from file** and choose `template-index-refresh.json`.
2. Create a **GitHub API** credential from a fine-grained personal access token scoped to this repository, with **Actions: Read and write** and nothing else. Attach it to the HTTP Request node.
3. In the repository settings, add the secrets `GEMINI_API_KEY`, `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (the service-role secret key for the `bandcraft` project).
4. Activate the workflow. To test it once, run the workflow manually in n8n, or run `gh workflow run template-index`.
