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

import * as fs from 'fs'
import * as path from 'path'
import { VSBrowser } from 'vscode-extension-tester'
import { DataEditor } from './pages/dataEditor'
import { closeEverything, resetForNextTest, WORKSPACE_DIR } from './support'

// Saving replaces the file, so it can be missing for a moment. driver.wait stops
// at the first error, so that has to count as "not yet" rather than throw.
function fileMatches(file: string, expectedBytes: Buffer): boolean {
  return fs.existsSync(file) && fs.readFileSync(file).equals(expectedBytes)
}

describe('Data Editor', () => {
  const dataEditor = new DataEditor()

  // VS Code is already running when these hooks run. It's shared by every test,
  // so they stop one test from affecting the next.
  beforeEach(resetForNextTest)
  after(closeEverything)

  it('shows the bytes of the opened file', async () => {
    // Open the copy of test.txt in the Data Editor
    await dataEditor.open(path.join(WORKSPACE_DIR, 'test.txt'))

    // test.txt starts with "T", which is 54 in hex
    await dataEditor.waitForByte(0, '54')
  })

  it('saves an overwritten byte to disk', async () => {
    const file = path.join(WORKSPACE_DIR, 'test.txt')

    // The saved file should be the same, except that it starts with an "A" (0x41)
    const expectedBytes = fs.readFileSync(file)
    expectedBytes[0] = 0x41

    // Open the file and change its first byte
    await dataEditor.open(file)
    await dataEditor.overwriteByte(0, '41')

    // The new value should show on screen
    await dataEditor.waitForByte(0, '41')

    // Write the change to the file on disk
    await dataEditor.save()

    // Saving finishes some time after the click, so keep re-reading the file
    // until it matches or times out
    await VSBrowser.instance.driver.wait(
      () => fileMatches(file, expectedBytes),
      30_000,
      'The saved file never matched the expected bytes'
    )
  })
})
