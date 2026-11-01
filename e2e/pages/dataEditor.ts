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
import {
  By,
  EditorView,
  until,
  VSBrowser,
  WebView,
  Workbench,
} from 'vscode-extension-tester'
import { pickFile } from './workbench'

const WAIT_TIMEOUT = 30_000

/**
 * Drives the Data Editor. This class is a "page object": it keeps selectors out
 * of the tests, so that they can say what they do rather than how.
 *
 * The Data Editor is a webview, which is a separate page inside VS Code. WebDriver
 * can only see one page at a time, so every action here has to switch into the
 * webview, and back out again before the test can use the rest of VS Code.
 */
export class DataEditor {
  /**
   * Opens a file. The extension then starts the Data Editor's server, and shows
   * the editor in a webview.
   */
  async open(filePath: string) {
    // The command asks which file to open
    await new Workbench().executeCommand('Daffodil Debug: Data Editor')
    await pickFile(filePath)

    // The editor takes a few seconds to appear, while its server starts. A
    // WebView object only finds its editor once, when it's created, so one made
    // too early can never work, and reports that the webview's iframe is missing.
    await VSBrowser.instance.driver.wait(
      async () =>
        (await new EditorView().getOpenEditorTitles()).includes(
          path.basename(filePath)
        ),
      WAIT_TIMEOUT,
      `The Data Editor never opened ${filePath}`
    )
  }

  /** Runs an action inside the webview, and always switches back afterwards. */
  private async inWebview(action: (webview: WebView) => Promise<void>) {
    const webview = new WebView()
    await webview.switchToFrame(WAIT_TIMEOUT)
    try {
      await action(webview)
    } finally {
      await webview.switchBack()
    }
  }

  /** Waits for a byte in the physical (hex) view to show the given value. */
  async waitForByte(offset: number, hexValue: string) {
    await this.inWebview(async () => {
      const { driver } = VSBrowser.instance
      const byte = await driver.wait(
        until.elementLocated(By.id(`physical-${offset}`)),
        WAIT_TIMEOUT
      )
      await driver.wait(until.elementTextIs(byte, hexValue), WAIT_TIMEOUT)
    })
  }

  /** Changes one byte. The new value is two hex digits, such as '41'. */
  async overwriteByte(offset: number, hexValue: string) {
    await this.inWebview(async () => {
      const { driver } = VSBrowser.instance

      // Clicking a byte selects it and shows a box for editing it
      const byte = await driver.wait(
        until.elementLocated(By.id(`physical-${offset}`)),
        WAIT_TIMEOUT
      )
      await byte.click()

      // Type the new value, and press Enter to apply it
      const editBox = await driver.wait(
        until.elementLocated(By.id('binary-action-input')),
        WAIT_TIMEOUT
      )
      await editBox.clear()
      await editBox.sendKeys(hexValue, '\n')
    })
  }

  /** Saving takes two clicks, as "Save..." first reveals the save options. */
  async save() {
    await this.inWebview(async () => {
      const { driver } = VSBrowser.instance
      const saveOptions = By.css('[data-testid="save-options"]')
      const save = By.css('[data-testid="save"]')

      const saveOptionsButton = await driver.wait(
        until.elementLocated(saveOptions),
        WAIT_TIMEOUT
      )
      await saveOptionsButton.click()

      const saveButton = await driver.wait(
        until.elementLocated(save),
        WAIT_TIMEOUT
      )
      await saveButton.click()
    })
  }
}
