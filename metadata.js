const fs = require('fs');
const yaml = require('js-yaml');

function readFirstFiveLines(filePath) {
  return new Promise((resolve, reject) => {
    const readline = require('readline');
    const stream = require('stream');

    const instream = fs.createReadStream(filePath);
    const outstream = new stream();
    const rl = readline.createInterface(instream, outstream);

    let lineNumber = 0;
    let lines = [];

    rl.on('line', (line) => {
      lineNumber++;
      if (lineNumber <= 5) {
        lines.push(line);
      } else {
        rl.close();
      }
    });

    rl.on('close', () => {
      resolve(lines.join('\n'));
    });

    rl.on('error', (err) => {
      reject(err);
    });
  });
}

async function readMarkdownMetadata(filePath) {
  try {
    const data = await fs.promises.readFile(filePath, 'utf8');
    const lines = data.split('\n');
    let metadata = {};

    if (lines[0] === '---') {
      let metadataContent = '';
      for (let i = 1; i < Math.min(10, lines.length); i++) {
        if (lines[i] === '---') {
          break;
        }
        metadataContent += lines[i] + '\n';
      }
      metadata = yaml.load(metadataContent);
    } else {
      throw new Error('Metadata not found in the first 10 lines');
    }

    return metadata;
  } catch (err) {
    console.error(err);
  }
}

function readMarkdownMetadataSync(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const lines = data.split('\n');
    let metadata = {};

    if (lines[0] === '---') {
      let metadataContent = '';
      for (let i = 1; i < Math.min(10, lines.length); i++) {
        if (lines[i] === '---') {
          break;
        }
        metadataContent += lines[i] + '\n';
      }
      metadata = yaml.load(metadataContent);
    } else {
      throw new Error('Metadata not found in the first 10 lines');
    }

    return metadata;
  } catch (err) {
    console.error(err);
  }
}

module.exports = {
  readFirstFiveLines,
  readMarkdownMetadata,
  readMarkdownMetadataSync,
};


