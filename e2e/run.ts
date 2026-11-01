/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// What happens when you run `yarn test:e2e`:
//
//  1. pretest:e2e in package.json installs ExTester, compiles these tests to
//     out/, and packages the extension into a .vsix file.
//  2. This file gets a copy of VS Code and a matching ChromeDriver, installs the
//     .vsix into that VS Code, and makes a temporary copy of the test data.
//  3. ExTester starts one VS Code on that copy, which all the tests share.
//  4. Mocha runs the *.spec.ts files. For each test:
//     a. support.ts closes what the last test opened, stops the Data Editor's
//        server and restores the test data.
//     b. The test runs, using ExTester's page objects to control VS Code.
//  5. ExTester closes VS Code. It keeps a screenshot of each failed test.
//  6. This file deletes the temporary copy.

import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { DEFAULT_STORAGE_FOLDER, ExTester } from 'vscode-extension-tester'

// This file runs from e2e/out
const E2E_DIR = path.resolve(__dirname, '..')
const PROJECT_ROOT = path.resolve(E2E_DIR, '..')
const TEST_DATA_DIR = path.join(PROJECT_ROOT, 'src/tests/data')
const EXTENSIONS_DIR = path.join(DEFAULT_STORAGE_FOLDER, 'extensions')

// The oldest version the extension supports, from package.json engines/vscode
const OLDEST_SUPPORTED_VSCODE =
  require('../../package.json').engines.vscode.replace('^', '')

function vscodeVersion(): string {
  const version =
    process.env.DAFFODIL_TEST_VSCODE_VERSION || OLDEST_SUPPORTED_VSCODE

  // ExTester calls the newest release "latest" rather than "stable"
  return version === 'stable' ? 'latest' : version
}

async function runTests() {
  const version = vscodeVersion()

  // Without its own extensions folder, the test's VS Code would load the
  // developer's extensions
  const tester = new ExTester(undefined, undefined, EXTENSIONS_DIR)
  await tester.downloadCode(version)
  await tester.downloadChromeDriver(version)

  // Install the extension that yarn package built. ExTester can't load it from
  // this repo instead: on Windows, ChromeDriver lowercases the option that VS
  // Code needs for that, so VS Code ignores it.
  await tester.installVsix({ vsixFile: 'apache-daffodil-vscode-*.vsix' })

  // Copy the test data, so that tests can't change the originals. Mocha runs in
  // this process, so the tests can read this variable.
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'dfdl-e2e-'))
  const workspaceDir = path.join(sandbox, 'workspace')
  fs.cpSync(TEST_DATA_DIR, workspaceDir, { recursive: true })
  process.env.DAFFODIL_E2E_WORKSPACE = workspaceDir

  try {
    return await tester.runTests('e2e/out/*.spec.js', {
      vscodeVersion: version,
      settings: path.join(E2E_DIR, 'settings.json'),
      config: path.join(E2E_DIR, '.mocharc.js'),
      resources: [workspaceDir],
    })
  } finally {
    // Retries, as Windows can take a moment to release a closed program's files
    fs.rmSync(sandbox, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 500,
    })
  }
}

runTests().then(
  (exitCode) => process.exit(exitCode),
  (error) => {
    console.error(error)
    process.exit(1)
  }
)
