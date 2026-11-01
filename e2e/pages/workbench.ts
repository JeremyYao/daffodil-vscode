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

import { InputBox, VSBrowser } from 'vscode-extension-tester'

const DIALOG_TIMEOUT = 30_000

/** Answers a file dialog, which ExTester's settings show as an input box. */
export async function pickFile(filePath: string) {
  // Not InputBox.create(), which only waits 5 seconds for the box to be visible.
  // The extension may still be starting, and the palette has already put the
  // box in the page.
  const input = await new InputBox().wait(DIALOG_TIMEOUT)

  // The command palette uses the same input box. Wait for the dialog to fill it
  // with the current folder, as typing while the palette is still closing sends
  // the text to wherever VS Code returns the focus. A folder's path ends in a
  // slash, which is what this pattern looks for.
  await VSBrowser.instance.driver.wait(
    async () => /[\\/]$/.test(await input.getText()),
    DIALOG_TIMEOUT,
    'The file dialog never showed a folder path'
  )

  // Type the file's path and confirm it, which closes the dialog. confirmPath()
  // is needed, as a file dialog can take two steps to accept a path.
  await input.setText(filePath)
  await input.confirmPath()
}
