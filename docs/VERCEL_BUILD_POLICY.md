# Vercel build policy

- Automatic Git deployments: main only. Feature, documentation and automation branches do not deploy automatically.
- On main, skip documentation text and the explicitly listed management files only. Mixed application/documentation changes build.
- Compare against VERCEL_GIT_PREVIOUS_SHA (the previous deployed commit), never just HEAD^, so application changes across multiple commits are retained.
- Missing/invalid baseline, failed Git diff and unknown paths build by default. Public assets and configuration always build.
- For a requested preview, deploy the reviewed branch manually with `vercel deploy --build-env FORCE_VERCEL_BUILD=1`. This explicit override bypasses the documentation filter. If preview deployments are disabled in project settings, enable them temporarily for the requested preview and restore the setting afterwards.
- Project setting `previewDeploymentsDisabled=true` also blocks previews from existing branches.
- Existing branches must incorporate main to receive vercel.json and the guard before further pushes.
- GitHub Actions tests and GitHub Pages are independent and remain enabled.
- This reduces future builds; it does not reset an existing Vercel rate limit.

Verification: npm test -- tests/vercel-build-guard.test.mjs

Caution: Ignored Build Step cancellations still count toward Vercel deployment quotas. Disabling automatic previews is the main rate-limit reduction; the documentation filter reduces build work on main.
