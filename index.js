const fs = require("fs");
const { exec } = require("child_process");

const environment = `${process.env.INPUT_ENVIRONMENT || "staging"}`;
const tagFallback = `${process.env.INPUT_FALLBACK || "v0.0.1"}`;
const tagPrefix = `${process.env.INPUT_PREFIX || ""}*`;
const tagSuffix = `-${process.env.INPUT_SUFFIX || "b"}.`;
const tagVersion = `${process.env.INPUT_VERSION || ""}`;

const log = (message) => console.log("\x1b[33m%s\x1b[0m", message);

const extractNumber = (str = "") => Number(str.replace(/\D/g, ""));

const getNextTag = (prevTag = "v0.0.1") => {
  const parsedTag = prevTag.split(".");
  let version = {};

  if (tagVersion === "major") {
    version = {
      major: extractNumber(parsedTag[0]) + 1,
      minor: 0,
      patch: 0,
      beta: environment === "staging" ? 1 : 0,
    };
  } else if (tagVersion === "minor") {
    version = {
      major: extractNumber(parsedTag[0]),
      minor: extractNumber(parsedTag[0]) + 1,
      patch: 0,
      beta: environment === "staging" ? 1 : 0,
    };
  } else if (
    tagVersion === "patch" ||
    (!tagVersion && environment === "production")
  ) {
    version = {
      major: extractNumber(parsedTag[0]),
      minor: extractNumber(parsedTag[1]),
      patch: extractNumber(parsedTag[2]) + 1,
      beta: tagEnvironment === "staging" ? 1 : 0,
    };
  } else {
    version = {
      major: extractNumber(parsedTag[0]),
      minor: extractNumber(parsedTag[1]),
      patch: extractNumber(parsedTag[2]),
      beta: environment === "staging" ? extractNumber(parsedTag[3]) + 1 : 0,
    };
  }

  return `v${version.major}.${version.minor}.${version.patch}${
    version.beta ? `${tagSuffix}${version.beta}` : ""
  }`;
};

const setNextTag = (nextTag) => {
  log(`Next tag: ${nextTag}`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `tag=${nextTag}\n`);
};

exec(
  `git for-each-ref --sort=taggerdate --format="%(refname:short)" "refs/tags/${tagPrefix}" | tail -1`,
  (error, tag, stdError) => {
    if (error) {
      log("Could not find any tags because: ");
      log(stdError);

      process.exit(1);
    }

    tag = tag.trim();

    if (tag === "") {
      log("Falling back to default tag");
      log(`Found tag: ${tagFallback}`);

      const nextTag =
        environment === "staging" ? `${tagFallback}${tagSuffix}1` : tagFallback;
      setNextTag(nextTag);

      process.exit(0);
    }

    log(`Found tag: ${tag}`);

    const nextTag = getNextTag(tag);
    setNextTag(nextTag);

    process.exit(0);
  }
);
