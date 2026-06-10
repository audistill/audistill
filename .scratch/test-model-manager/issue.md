---
title: "Integration test: ModelManager with mocked HTTP"
status: done
created: 2026-06-02
---

## Parent

[PRD: Audistill — Minimum Prototype](.scratch/podscribe-prototype-prd/issue.md)

## What to build

An integration test suite for the ModelManager module. Tests run without the real 670MB model by mocking HTTP responses. Verify the full lifecycle: detects missing model, initiates download, writes files to the correct directory, and subsequent calls return immediately without network requests. Also verify the failure case: a partial/interrupted download leaves no corrupted files on disk.

## Acceptance criteria

- [ ] Test: first call triggers download when model directory is empty
- [ ] Test: progress events fire during download with increasing percentages
- [ ] Test: files are written to the expected model directory
- [ ] Test: second call resolves immediately without HTTP requests
- [ ] Test: interrupted download leaves no partial files (clean state for retry)
- [ ] Tests run without network access (mocked HTTP)
- [ ] Tests run in under 5 seconds

## Blocked by

- [ModelManager: download & cache Parakeet ONNX model](../model-manager/issue.md)
