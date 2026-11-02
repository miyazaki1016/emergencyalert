# Vercel build reduction policy

Keep production behavior safe: build application and unknown changes, skip only known GitHub-management-only changes. Compare against the last successfully deployed revision; missing revision or GitHub metadata must result in a build, not a skip. Keep GitHub Actions CI enabled. Verify preview and production behavior before enabling any ignore-build setting. No changes to deployment settings are authorized by this document.
