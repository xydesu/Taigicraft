import { createTranslationClient } from "./module.ts";

const DATA_DIR = "data";
const OUTPUT_DIR = "output";
const SOURCE_FILE = `${DATA_DIR}/zh_tw.json`;
const TRANSLATED_FILE = `${DATA_DIR}/translated.txt`;

type TranslationMap = Record<string, string>;

function isChineseText(value: string) {
  return /.*\p{Unified_Ideograph}.*/gv.test(value);
}

async function fetchLatestZhTwFile() {
  return await (
    await fetch(
      "https://assets.mcasset.cloud/latest/assets/minecraft/lang/zh_tw.json",
    )
  ).text();
}

async function ensureWorkspace() {
  try {
    await Deno.mkdir(DATA_DIR);
    await Deno.mkdir(OUTPUT_DIR);
    // deno-lint-ignore no-empty
  } catch (_) {}
}

async function ensureFile(path: string) {
  try {
    await Deno.lstat(path);
    return true;
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) {
      throw err;
    }
    await Deno.create(path);
    return false;
  }
}

async function loadTranslationMap(path: string, exists: boolean) {
  return JSON.parse(
    exists ? await Deno.readTextFile(path) : "{\n}",
  ) as TranslationMap;
}

function getNewLines(oldFile: string, newFile: string) {
  const oldFileLines = oldFile.split("\n");
  const newFileLines = newFile.split("\n");
  return newFileLines.filter((line) => !oldFileLines.includes(line));
}

function parseKeyValue(line: string) {
  const processedLine = line.endsWith(",")
    ? line.trim().slice(0, -1)
    : line.trim();
  const obj = JSON.parse(`{${processedLine}}`) as Record<string, string>;
  const key = Object.keys(obj)[0];
  return { key, value: obj[key] };
}

async function saveTranslationMap(translated: TranslationMap) {
  await Deno.writeTextFile(
    TRANSLATED_FILE,
    JSON.stringify(translated, null, 2),
  );
}

async function main() {
  await ensureWorkspace();

  const oldExists = await ensureFile(SOURCE_FILE);
  const translatedExists = await ensureFile(TRANSLATED_FILE);
  const translate = await createTranslationClient();
  const translated = await loadTranslationMap(
    TRANSLATED_FILE,
    translatedExists,
  );
  const oldFile = oldExists ? await Deno.readTextFile(SOURCE_FILE) : "{\n}";
  const newFile = await fetchLatestZhTwFile();

  if (oldFile == newFile) {
    console.log("No updates, exiting...");
    Deno.exit(0);
  }

  await Deno.writeTextFile(SOURCE_FILE, newFile);

  const newLines = getNewLines(oldFile, newFile);
  const totalItems = newLines.length;
  let processedItems = 0;

  for await (const line of newLines) {
    processedItems++;
    const progressPercentage = Math.floor((processedItems / totalItems) * 100);
    const { key, value } = parseKeyValue(line);

    console.log(
      `[${processedItems}/${totalItems} ${progressPercentage}%] Translating ${value} (${key})...`,
    );

    if (isChineseText(value)) {
      try {
        const translatedValue = await translate(value);
        console.log(`Result: ${translatedValue}`);
        translated[key] = translatedValue;
        await saveTranslationMap(translated);
      } catch (err) {
        console.error(`Translate failed for ${key}:`, err);
        // Preserve original text so the file remains usable, then continue.
        translated[key] = value;
        await saveTranslationMap(translated);
        continue;
      }
    } else {
      translated[key] = value;
      await saveTranslationMap(translated);
    }
  }

  console.log(`[${totalItems}/${totalItems} 100%] Translation complete.`);
}

await main();
