const fs = require('fs');
const yaml = require('js-yaml');

async function read(filePath) {
  try {
    const fileText = await fs.promises.readFile(filePath, 'utf8');
    return extractMetadataFrom(fileText);
  } catch (err) {
    console.error(err);
  }
}

function readSync(filePath) {
  try {
    const fileText = fs.readFileSync(filePath, 'utf8');
    return extractMetadataFrom(fileText);
  } catch (err) {
    console.error(err);
  }
}

function extractMetadataFrom(fileText) {
  const lines = fileText.split('\n');

  if (lines[0] === '---') {
    let metadataContent = '';
    for (let i = 1; i < Math.min(10, lines.length); i++) {
      if (lines[i] === '---') {
        break;
      }
      metadataContent += lines[i] + '\n';
    }
    return yaml.load(metadataContent);
  } else {
    throw new Error('Metadata not found in the first 10 lines');
  }
}

module.exports = {
  read,
  readSync,
};

