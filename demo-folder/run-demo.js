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
    console.log('--- Auto Translate JSON Library - Folder Mode Demo Script ---');
    console.log('Usage: node run-demo.js [format]');
    console.log('');
    console.log('Available formats:');
    console.log('  json       - JSON translation files in folders');
    console.log('  xml        - Android XML files in folders');
    console.log('  arb        - Flutter ARB files in folders');
    console.log('  po         - GNU gettext PO files in folders');
    console.log('  yaml       - YAML translation files in folders');
    console.log('  properties - Java Properties files in folders');
    console.log('  csv        - CSV files in folders');
    console.log('  all        - All formats in folder structure');
    console.log('');
    console.log('Examples:');
    console.log('  node run-demo.js yaml        # Run only YAML folder demo');
    console.log('  node run-demo.js --format=po # Run only PO folder demo');
    console.log('  node run-demo.js all         # Run all folder demos');
    console.log('  node run-demo.js             # Run all folder demos');
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

// Define all demo commands for folder mode
const demoCommands = {
    json: () => {
        runCommand(
            'JSON Folder Translation: common.json (en/ -> fr/)',
            `${cliPath} -s en -e openai -f json -m folder source\\en\\common.json`
        );
        runCommand(
            'JSON Folder Translation: ui.json (en/ -> fr/)',
            `${cliPath} -s en -e openai -f json -m folder source\\en\\ui.json`
        );
    },
    xml: () => {
        runCommand(
            'XML Folder Translation: app.xml (en/ -> fr/)',
            `${cliPath} -s en -f android-xml -e openai -m folder source\\en\\app.xml`
        );
        runCommand(
            'XML Folder Translation: errors.xml (en/ -> fr/)',
            `${cliPath} -s en -f android-xml -e openai -m folder source\\en\\errors.xml`
        );
    },
    arb: () => {
        runCommand(
            'ARB Folder Translation: app.arb (en/ -> fr/)',
            `${cliPath} -s en -f arb -e openai -m folder source\\en\\app.arb`
        );
        runCommand(
            'ARB Folder Translation: welcome.arb (en/ -> fr/)',
            `${cliPath} -s en -f arb -e openai -m folder source\\en\\welcome.arb`
        );
    },
    po: () => {
        runCommand(
            'PO Folder Translation: main.po (en/ -> fr/)',
            `${cliPath} -s en -f po -e openai -m folder source\\en\\main.po`
        );
        runCommand(
            'PO Folder Translation: user.po (en/ -> fr/)',
            `${cliPath} -s en -f po -e openai -m folder source\\en\\user.po`
        );
    },
    yaml: () => {
        runCommand(
            'YAML Folder Translation: config.yaml (en/ -> fr/)',
            `${cliPath} -s en -f yaml -e openai -m folder source\\en\\config.yaml`
        );
        runCommand(
            'YAML Folder Translation: messages.yaml (en/ -> fr/)',
            `${cliPath} -s en -f yaml -e openai -m folder source\\en\\messages.yaml`
        );
    },
    properties: () => {
        runCommand(
            'Properties Folder Translation: site.properties (en/ -> fr/)',
            `${cliPath} -s en -f properties -e openai -m folder source\\en\\site.properties`
        );
        runCommand(
            'Properties Folder Translation: buttons.properties (en/ -> fr/)',
            `${cliPath} -s en -f properties -e openai -m folder source\\en\\buttons.properties`
        );
    },
    csv: () => {
        runCommand(
            'CSV Folder Translation: content.csv (en/ -> fr/)',
            `${cliPath} -s en -f csv -e openai -m folder source\\en\\content.csv`
        );
        runCommand(
            'CSV Folder Translation: layout.csv (en/ -> fr/)',
            `${cliPath} -s en -f csv -e openai -m folder source\\en\\layout.csv`
        );
    },
    all: () => {
        console.log('\n>>> Running all folder mode translations...');
        demoCommands.json();
        demoCommands.xml();
        demoCommands.arb();
        demoCommands.po();
        demoCommands.yaml();
        demoCommands.properties();
        demoCommands.csv();
    }
};

console.log('--- Auto Translate JSON Library - Folder Mode Demo ---');
console.log('This script demonstrates folder-based translation where files are organized by language folders.');
console.log(`Configuration: Engine=openai, Model=${demoEnv.ATJ_OPEN_AI_MODEL}, URL=${demoEnv.ATJ_OPEN_AI_BASE_URL}, Mode=folder\n`);

if (targetFormat && demoCommands[targetFormat]) {
    console.log(`Running folder demo for format: ${targetFormat}\n`);
    demoCommands[targetFormat]();
} else if (targetFormat) {
    console.log(`❌ Unknown format: ${targetFormat}`);
    console.log('Available formats: ' + Object.keys(demoCommands).join(', '));
    process.exit(1);
} else {
    console.log('Running all folder demos...\n');
    
    // Run all demos in order
    demoCommands.json();
    demoCommands.xml();
    demoCommands.arb();
    demoCommands.po();
    demoCommands.yaml();
    demoCommands.properties();
    demoCommands.csv();
    demoCommands.all();
}

console.log('\n--- Folder Mode Demo Completed ---');
console.log('Check the demo-folder/source/fr/ folder for generated translation files.');

if (!targetFormat) {
    console.log('\nUsage examples:');
    console.log('  node run-demo.js yaml        # Run only YAML folder demo');
    console.log('  node run-demo.js --format=po # Run only PO folder demo');
    console.log('  node run-demo.js all         # Run all folder demos');
}