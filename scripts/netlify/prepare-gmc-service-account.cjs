const fs = require("node:fs");
const path = require("node:path");

const OUT_DIR = path.join(process.cwd(), ".netlify", "secrets");
const OUT_FILE = path.join(OUT_DIR, "gmc-service-account.json");

function parseServiceAccountJson(raw, label) {
  if (!raw || typeof raw !== "string") return null;
  let text = raw.trim();
  if (!text) return null;

  if (!text.startsWith("{")) {
    try {
      text = Buffer.from(text, "base64").toString("utf8");
    } catch (err) {
      console.warn(`[prepare-gmc-service-account] Failed to decode ${label} as base64.`);
      return null;
    }
  }

  try {
    const parsed = JSON.parse(text);
    if (parsed?.client_email && parsed?.private_key) return parsed;
    console.warn(
      `[prepare-gmc-service-account] ${label} parsed but missing client_email/private_key.`
    );
    return null;
  } catch {
    console.warn(`[prepare-gmc-service-account] Failed to parse ${label} as JSON.`);
    return null;
  }
}

async function loadFromAwsSecretsManager() {
  const secretId = process.env.GMC_SERVICE_ACCOUNT_SECRET_ID?.trim();
  if (!secretId) return null;

  const region =
    process.env.AWS_REGION ||
    process.env.AWS_DEFAULT_REGION ||
    process.env.AWS_SECRETS_MANAGER_REGION ||
    "us-east-1";

  let awsSdk;
  try {
    awsSdk = require("@aws-sdk/client-secrets-manager");
  } catch {
    console.warn(
      "[prepare-gmc-service-account] @aws-sdk/client-secrets-manager is not installed; skipping AWS fetch."
    );
    return null;
  }

  const { SecretsManagerClient, GetSecretValueCommand } = awsSdk;
  const client = new SecretsManagerClient({ region });

  try {
    const result = await client.send(new GetSecretValueCommand({ SecretId: secretId }));
    const secretString =
      typeof result.SecretString === "string"
        ? result.SecretString
        : Buffer.from(result.SecretBinary || "", "base64").toString("utf8");

    // Accept either full JSON key or object wrapper like {"GMC_SERVICE_ACCOUNT_KEY": "{...}"}
    const direct = parseServiceAccountJson(secretString, "AWS SecretString");
    if (direct) return direct;

    try {
      const wrapper = JSON.parse(secretString);
      const candidates = [
        wrapper.GMC_SERVICE_ACCOUNT_KEY,
        wrapper.GMC_SERVICE_ACCOUNT_KEY_BASE64,
        wrapper.gmc_service_account_key,
        wrapper.gmc_service_account_key_base64,
      ];
      for (const candidate of candidates) {
        const parsed = parseServiceAccountJson(
          typeof candidate === "string" ? candidate : "",
          "AWS wrapped secret field"
        );
        if (parsed) return parsed;
      }
    } catch {
      // ignored: already attempted direct parse
    }
  } catch (err) {
    console.warn(
      `[prepare-gmc-service-account] Failed to fetch GMC secret from AWS (${secretId}): ${err?.message || err}`
    );
  }

  return null;
}

async function resolveServiceAccount() {
  // 0) Netlify Secrets Manager plugin-prefixed env vars
  // Example: NETLIFY_AWS_SECRET_GMC_SERVICE_ACCOUNT_KEY
  const prefixedCandidates = [
    process.env.NETLIFY_AWS_SECRET_GMC_SERVICE_ACCOUNT_KEY,
    process.env.NETLIFY_AWS_SECRET_GMC_SERVICE_ACCOUNT_KEY_BASE64,
    process.env.NETLIFY_AWS_SECRET_GMC_SERVICE_ACCOUNT_SECRET_JSON,
    process.env.NETLIFY_AWS_SECRET_GMC_SERVICE_ACCOUNT_SECRET_JSON_BASE64,
  ];
  for (const candidate of prefixedCandidates) {
    const parsed = parseServiceAccountJson(
      typeof candidate === "string" ? candidate : "",
      "NETLIFY_AWS_SECRET_*"
    );
    if (parsed) return parsed;
  }

  // 1) Existing file path (if already set and valid)
  const keyFilePath = process.env.GMC_SERVICE_ACCOUNT_KEY_FILE?.trim();
  if (keyFilePath && fs.existsSync(keyFilePath)) {
    const fileText = fs.readFileSync(keyFilePath, "utf8");
    const parsed = parseServiceAccountJson(fileText, "GMC_SERVICE_ACCOUNT_KEY_FILE");
    if (parsed) {
      console.info(
        `[prepare-gmc-service-account] Using existing key file: ${keyFilePath}`
      );
      return null;
    }
  }

  // 2) Direct env key JSON
  const directEnv = parseServiceAccountJson(
    process.env.GMC_SERVICE_ACCOUNT_KEY,
    "GMC_SERVICE_ACCOUNT_KEY"
  );
  if (directEnv) return directEnv;

  // 3) Direct env key base64
  const base64Env = parseServiceAccountJson(
    process.env.GMC_SERVICE_ACCOUNT_KEY_BASE64,
    "GMC_SERVICE_ACCOUNT_KEY_BASE64"
  );
  if (base64Env) return base64Env;

  // 4) Secret-manager-injected env (JSON/base64)
  const injectedJson = parseServiceAccountJson(
    process.env.GMC_SERVICE_ACCOUNT_SECRET_JSON,
    "GMC_SERVICE_ACCOUNT_SECRET_JSON"
  );
  if (injectedJson) return injectedJson;

  const injectedB64 = parseServiceAccountJson(
    process.env.GMC_SERVICE_ACCOUNT_SECRET_JSON_BASE64,
    "GMC_SERVICE_ACCOUNT_SECRET_JSON_BASE64"
  );
  if (injectedB64) return injectedB64;

  // 5) AWS Secrets Manager fetch by SecretId
  return loadFromAwsSecretsManager();
}

async function main() {
  const account = await resolveServiceAccount();
  if (!account) {
    console.info(
      "[prepare-gmc-service-account] No service-account payload resolved. Build will continue."
    );
    return;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(account, null, 2)}\n`, {
    mode: 0o600,
  });

  console.info(
    `[prepare-gmc-service-account] Wrote service-account file to ${OUT_FILE}`
  );
  console.info(
    "[prepare-gmc-service-account] Set GMC_SERVICE_ACCOUNT_KEY_FILE to this path in Netlify env for runtime scripts if needed."
  );
}

main().catch((err) => {
  console.warn(
    `[prepare-gmc-service-account] Non-fatal setup warning: ${err?.message || err}`
  );
});
