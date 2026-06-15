// Example module template.
// Use any translation provider you want here: HTTP API, SDK, local model,
// CLI tool, database-backed service, or something else.

const TRANSLATION_PROVIDER_NAME = "your-provider";
const TRANSLATION_RATE_LIMIT_MESSAGE = "rate limited";

type TranslationClient = (value: string) => Promise<string>;

export function createTranslationClient(): Promise<TranslationClient> {
  async function translateRawWithRetry(value: string): Promise<string> {
    const translatedValue = await translateWithAnyProvider(value);

    if (translatedValue.includes(TRANSLATION_RATE_LIMIT_MESSAGE)) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return await translateRawWithRetry(value);
    }

    return translatedValue;
  }

  function escapeTranslatedValue(value: string) {
    return value
      .replaceAll("\\", "\\\\")
      .replaceAll("\n", "\\n")
      .replaceAll('"', '\\"');
  }

  return Promise.resolve(async (value: string) =>
    escapeTranslatedValue(await translateRawWithRetry(value)));
}

function translateWithAnyProvider(value: string): Promise<string> {
  void value;
  return Promise.reject(
    new Error(
      `Replace ${TRANSLATION_PROVIDER_NAME} with your translation implementation.`,
    ),
  );
}

// Suggested structure for a real module:
// 1. connect to the provider once
// 2. keep retry logic private inside the module
// 3. normalize escaping before returning text
// 4. export a single callable translation client
