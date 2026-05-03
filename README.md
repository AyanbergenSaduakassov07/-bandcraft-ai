BandCraftAI
Automated IELTS Writing evaluator built for Central Asian learners.
BandCraftAI scores IELTS Writing Task 1 and Task 2 responses against official Cambridge marking criteria and returns structured, actionable feedback — instantly. Built with n8n automation workflows and deployed via Netlify.

🟡 Live deployment temporarily unavailable (domain renewal pending). Previously live at bandcraftaii.netlify.app.


What it does

Accepts a user-submitted IELTS Writing Task 1 or Task 2 essay
Evaluates across all 4 official Cambridge band descriptors:

Task Achievement / Task Response
Coherence & Cohesion
Lexical Resource
Grammatical Range & Accuracy


Returns a band score (0–9) per criterion + overall estimated band
Generates personalised, criterion-specific feedback in plain English
Calibrated specifically for Central Asian learner writing patterns

Accuracy: 95% alignment with official Cambridge examiner scores across 500+ test essays.
Users: 100+ active learners via Elevate Academy, deployed across 10+ partner schools in Kazakhstan.

Tech stack
LayerToolAutomation & logicn8n (self-hosted / cloud)AI scoring engineLLM via n8n AI nodes (prompt-engineered against Cambridge criteria)FrontendHTML / CSS / JS (static, Netlify-hosted)DeploymentNetlify

Repo structure
bandcraftai/
├── workflows/
│   ├── task1_evaluator.json       # n8n workflow — Task 1 scoring
│   └── task2_evaluator.json       # n8n workflow — Task 2 scoring
├── frontend/
│   ├── index.html                 # Submission form
│   ├── result.html                # Feedback display page
│   └── style.css
├── prompts/
│   ├── task1_system_prompt.txt    # Cambridge criteria prompt — Task 1
│   └── task2_system_prompt.txt    # Cambridge criteria prompt — Task 2
├── samples/
│   └── sample_essays.md          # Example inputs + expected outputs
├── .gitignore
├── LICENSE
└── README.md

Getting started
Prerequisites

n8n (cloud or self-hosted)
An API key for your chosen LLM provider (OpenAI, Anthropic, etc.)
A static hosting account (Netlify free tier works)

Setup

Clone the repo

bash   git clone https://github.com/ayansaduakassov/bandcraftai.git
   cd bandcraftai

Import n8n workflows

Open your n8n instance
Go to Workflows → Import from file
Import workflows/task1_evaluator.json and workflows/task2_evaluator.json


Configure credentials

In n8n, add your LLM API key under Credentials
Set your n8n webhook URL as the form action in frontend/index.html


Deploy frontend

Connect the frontend/ folder to Netlify (drag-and-drop or GitHub integration)
Set your n8n webhook URL as an environment variable or directly in the HTML


Activate workflows

In n8n, activate both workflows
Test with a sample essay from samples/sample_essays.md




How the scoring works
The evaluation engine uses a structured prompt chain built around the official Cambridge IELTS band descriptors. Each essay is passed through four independent scoring passes — one per criterion — and results are aggregated into a final band estimate.
The system prompt encodes examiner-level rubric logic and was iteratively refined against 500+ manually scored essays to reach 95% agreement with official Cambridge scores.
Prompt files are in /prompts/ — you can inspect and modify the scoring logic directly.

Sample output
Essay: Task 2 — "Some people believe that universities should focus on 
providing academic skills rather than preparing students for employment..."

Task Response:        7.0  — Addresses the task clearly. Position is sustained 
                             throughout. Some ideas underdeveloped in body 2.
Coherence & Cohesion: 6.5  — Logical progression overall. Overuse of "however" 
                             and "furthermore" reduces cohesive variety.
Lexical Resource:     6.5  — Adequate range. Some imprecise word choices 
                             (e.g., "do job" → "perform tasks / pursue careers").
Grammatical Range:    7.0  — Mix of complex structures used accurately. 
                             Minor article errors throughout.

Estimated Band:       6.5

Roadmap

 Add Task 1 Academic (graph/chart description) support
 Band 9 exemplar comparison feature
 Kazakh language interface
 Export feedback as PDF report
 Webhook-based integration with Telegram bot for mobile access


About
Built by Ayanbergen Saduakassov — civil engineering student, founder of Elevate Academy, and AI developer based in Astana, Kazakhstan.
BandCraftAI was developed to address a specific gap: generic IELTS tools are not calibrated for the writing patterns and common errors of Central Asian learners. This tool is.

License
MIT — see LICENSE for details.
