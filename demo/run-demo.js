const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Pointing to the built CLI directly to avoid Windows .bin linking issues
const cliPath = path.resolve(__dirname, '..', 'build', 'src', 'bin', 'cli.js');
const sourceDir = path.join(__dirname, 'source');

// Load .env file
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Demo Configuration (Ollama / Local AI)
const demoEnv = {
    ...process.env // Inherit existing system envs and loaded .env vars
};

// Parse command line arguments
const args = process.argv.slice(2);
const targetFormat = args.find(arg => arg.startsWith('--format='))?.split('=')[1] || args[0];

// Check for help
if (args.includes('--help') || args.includes('-h')) {
    console.log('--- Auto Translate JSON Library - Demo Script ---');
    console.log('Usage: node run-demo.js [format]');
    console.log('');
    console.log('Available formats:');
    console.log('  json       - JSON translation files');
    console.log('  xml        - Android XML files');
    console.log('  arb        - Flutter ARB files');
    console.log('  po         - GNU gettext PO files');
    console.log('  yaml       - YAML translation files');
    console.log('  properties - Java Properties files');
    console.log('  csv        - CSV files');
    console.log('  advanced   - Advanced options demo');
    console.log('');
    console.log('Examples:');
    console.log('  node run-demo.js yaml        # Run only YAML demo');
    console.log('  node run-demo.js --format=po # Run only PO demo');
    console.log('  node run-demo.js             # Run all demos');
    process.exit(0);
}

// Helper to run commands
function runCommand(desc, cmd) {
    console.log(`\n>>> ${desc}`);
    console.log(`    Command: node ${cmd}`);
    try {
        // Pass the customized environment
        // On Windows, explicitly use node to execute the CLI
        execSync(`node ${cmd}`, { encoding: 'utf8', env: demoEnv, stdio: 'inherit', cwd: __dirname });
        console.log('    ✅ Success');
    } catch (err) {
        console.log('    ❌ Failed (Check if Ollama is running at ' + (demoEnv.ATJ_OPEN_AI_BASE_URL || 'http://localhost:11434') + ')');
    }
}

// Define all demo commands
const demoCommands = {
    json: () => runCommand(
        'Basic JSON Translation: en.json -> fr.json using Local AI',
        `${cliPath} -s en -e openai -f json source\\en.json`
    ),
    xml: () => runCommand(
        'Android XML: en.xml -> fr.xml (auto-detected)',
        `${cliPath} -s en -f android-xml -e openai source\\en.xml`
    ),
    arb: () => runCommand(
        'Flutter ARB: en.arb -> fr.arb (English to French)',
        `${cliPath} -s en -f arb -e openai source\\en.arb`
    ),
    po: () => runCommand(
        'Gettext PO: en.po -> fr.po',
        `${cliPath} -s en -f po -e openai source\\en.po`
    ),
    yaml: () => runCommand(
        'YAML: en.yaml -> fr.yaml (English to French)',
        `${cliPath} -s en -f yaml -e openai source\\en.yaml`
    ),
    properties: () => runCommand(
        'Java Properties: en.properties -> fr.properties (English to French)',
        `${cliPath} -s en -f properties -e openai source\\en.properties`
    ),
    csv: () => runCommand(
        'CSV: en.csv -> fr.csv (English to French)',
        `${cliPath} -s en -f csv -e openai source\\en.csv`
    ),
    advanced: () => runCommand(
        'Advanced: Translate again keeping existing translations (Simulation)',
        `${cliPath} -s en -e openai --keepTranslations source\\en.json`
    )
};

console.log('--- Auto Translate JSON Library - Comprehensive Demo ---');
console.log('This script demonstrates the features of the CLI tool using a Local AI (Ollama).');
console.log(`Configuration: Engine=openai, Model=${demoEnv.ATJ_OPEN_AI_MODEL}, URL=${demoEnv.ATJ_OPEN_AI_BASE_URL}\n`);

if (targetFormat && demoCommands[targetFormat]) {
    console.log(`Running demo for format: ${targetFormat}\n`);
    demoCommands[targetFormat]();
} else if (targetFormat) {
    console.log(`❌ Unknown format: ${targetFormat}`);
    console.log('Available formats: ' + Object.keys(demoCommands).join(', '));
    process.exit(1);
} else {
    console.log('Running all demos...\n');
    
    // Run all demos in order
    demoCommands.json();
    demoCommands.xml();
    demoCommands.arb();
    demoCommands.po();
    demoCommands.yaml();
    demoCommands.properties();
    demoCommands.csv();
    demoCommands.advanced();
}

console.log('\n--- Demo Completed ---');
console.log('Check the demo/source folder for generated files.');

if (!targetFormat) {
    console.log('\nUsage examples:');
    console.log('  node run-demo.js yaml        # Run only YAML demo');
    console.log('  node run-demo.js --format=po # Run only PO demo');
    console.log('  node run-demo.js             # Run all demos');
}
