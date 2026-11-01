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

// Setup and cleanup for each test. ExTester starts one VS Code for the whole
// run, so tests share its window and its open folder. These functions stop one
// test's files and editors from reaching the next.
//
// Specs call these from Mocha's beforeEach and after hooks.

import { stopProcessUsingPID } from '@omega-edit/client'
import { EditorView } from 'vscode-extension-tester'
import * as fs from 'fs'
import * as path from 'path'
import XDGAppPaths from 'xdg-app-paths'

// This file runs from e2e/out
const PROJECT_ROOT = path.resolve(__dirname, '../..')
const TEST_DATA_DIR = path.join(PROJECT_ROOT, 'src/tests/data')

// Matches dataEditor.port in settings.json. Not the default of 9000, so that
// tests can't reuse or stop the server of a Data Editor that a developer has
// open.
const DATA_EDITOR_PORT = 9100

/** The folder open in VS Code: a copy of src/tests/data, made by run.ts */
export const WORKSPACE_DIR = process.env.DAFFODIL_E2E_WORKSPACE as string

// The server keeps running for a while after its editor closes. Stopping it
// gives each test its own server, and releases the files it holds.
async function stopDataEditorServer() {
  // The server's process ID is kept in this file
  const pidFile = path.join(
    XDGAppPaths({ name: 'omega_edit' }).data(),
    `serv-${DATA_EDITOR_PORT}.pid`
  )

  // No file means that this test never started a server
  if (!fs.existsSync(pidFile)) return

  // Stop the server, then remove its file so that the next test starts clean
  await stopProcessUsingPID(parseInt(fs.readFileSync(pidFile).toString()))
  fs.rmSync(pidFile, { force: true })
}

/** Closes everything that the last test opened. */
export async function closeEverything() {
  await new EditorView().closeAllEditors()
  await stopDataEditorServer()
}

/**
 * Clears up after the last test, and restores the test data. This runs before
 * each test rather than after it, because ExTester takes its screenshot of a
 * failed test after a spec's afterEach hooks, which would have closed everything.
 */
export async function resetForNextTest() {
  await closeEverything()
  fs.cpSync(TEST_DATA_DIR, WORKSPACE_DIR, { recursive: true })
}
