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

import * as path from 'path'
import { DebugToolbar, VSBrowser, Workbench } from 'vscode-extension-tester'
import { pickFile } from './pages/workbench'
import { closeEverything, resetForNextTest, WORKSPACE_DIR } from './support'

// Starting the debugger and compiling the schema is slow
const DEBUG_START_TIMEOUT = 120_000

describe('Debugger', () => {
  beforeEach(resetForNextTest)
  after(closeEverything)

  it('pauses on entry when debugging a schema', async () => {
    // The "Debug File" command debugs the open file, so open the schema first
    await VSBrowser.instance.openResources(
      path.join(WORKSPACE_DIR, 'test.dfdl.xsd')
    )
    await new Workbench().executeCommand('Daffodil Debug: Debug File')

    // The command asks for the data file to parse with the schema
    await pickFile(path.join(WORKSPACE_DIR, 'test.txt'))

    // The extension now does several things, which this waits for:
    //  1. Compiles the schema with the Daffodil CLI
    //     (validateSchemaWithDaffodilCLI in src/daffodilDebugger/utils.ts)
    //  2. Starts the debugger (runDebugger in the same file)
    //  3. Connects to the debugger, and pauses on entry
    const toolbar = await DebugToolbar.create(DEBUG_START_TIMEOUT)
    await toolbar.waitForBreakPoint(DEBUG_START_TIMEOUT)

    // End the session before the test's workspace is closed
    await toolbar.stop()
  })
})
