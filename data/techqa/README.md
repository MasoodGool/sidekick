# TechQA public benchmark

Sidekick's evals run on the dev split of **IBM TechQA**: real user questions from IBM's developer forums, answered from IBM's published support articles (Technotes). 160 of the 310 dev questions are answerable from the documents and 150 are labelled unanswerable, so refusal accuracy is measured on real cases.

TechQA is IT product support, not a small business. The bakery documents in `data/sample-bakery/` are the demo corpus; TechQA is where the eval numbers come from. Results are reported as "TechQA dev, n=310".

## Reproduce

```bash
npm run techqa:fetch   # streams the official 2.96 GB archive, verifies its SHA-256, keeps ~290 MB
npm run techqa:build   # writes data/techqa/docs/*.md (12,355 technotes) and evals/techqa-dev.jsonl
BUSINESS_ID=techqa DATA_DIR=data/techqa/docs npm run ingest
BUSINESS_ID=techqa npm run eval -- --dataset evals/techqa-dev.jsonl
```

- **Corpus:** every technote that any dev question lists among its 50 candidates (12,355 documents). The candidates are on the same products as the question, so they are hard distractors.
- **Labels:** questions, gold answers, gold documents and the answerable flag all come from TechQA. Nothing is written or edited by hand.
- **Caveat:** TechQA marks a question unanswerable when the answer isn't in *its own* 50 candidates. A candidate of another question could, rarely, answer it; judge verdicts on refusals get a hand-checked sample.
- The raw files and generated documents are gitignored. `evals/techqa-dev.jsonl` is committed.

## Source and licence

- Source: [PrimeQA/TechQA](https://huggingface.co/datasets/PrimeQA/TechQA) on Hugging Face, IBM's current home for the dataset ([IBM/techqa](https://github.com/IBM/techqa)).
- Paper: Castelli et al., "The TechQA Dataset", ACL 2020, [arXiv:1911.02984](https://arxiv.org/abs/1911.02984).
- Licence: [Community Data License Agreement – Permissive 1.0](https://cdla.dev/permissive-1-0/). The full text ships in the archive as `CDLA-Permissive-v1.0.pdf`.
- Modified: `evals/techqa-dev.jsonl` is derived from `training_and_dev/dev_Q_A.json`, reformatted to Sidekick's eval format (question title and body joined; answers trimmed; fields renamed). Data © IBM.
