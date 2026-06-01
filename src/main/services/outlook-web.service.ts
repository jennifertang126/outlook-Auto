import { BrowserWindow } from 'electron'

interface SendResult {
  index: number
  subject: string
  success: boolean
  error?: string
}

export class OutlookWebService {
  private win: BrowserWindow | null = null

  private mailReadyCheck(): string {
    return `
      !!(document.querySelector('[data-convid]') ||
         document.querySelector('[role="option"]') ||
         document.querySelector('[role="listbox"]') ||
         document.querySelector('[aria-label*="Message list"]') ||
         document.querySelector('[aria-label*="邮件列表"]'))
    `
  }

  async sendAllDrafts(
    subjects: string[],
    onProgress: (current: number, total: number) => void
  ): Promise<SendResult[]> {
    const results: SendResult[] = []
    const draftsUrl = 'https://outlook.office.com/mail/drafts'

    this.win = new BrowserWindow({
      width: 1100,
      height: 750,
      show: true,
      center: true,
      title: 'Outlook-Auto - Loading...',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    try {
      // Load drafts page ONCE
      await this.win.loadURL(draftsUrl)
      await this.waitForMailUI()

      // Send each draft without reloading the page
      for (let i = 0; i < subjects.length; i++) {
        try {
          await this.sendOneDraft(subjects[i])
          results.push({ index: i, subject: subjects[i], success: true })
        } catch (err: any) {
          results.push({ index: i, subject: subjects[i], success: false, error: err.message })
        }
        onProgress(i + 1, subjects.length)
      }

      await this.sleep(2000)
    } finally {
      if (this.win && !this.win.isDestroyed()) {
        this.win.close()
      }
      this.win = null
    }

    return results
  }

  private async waitForMailUI(): Promise<void> {
    if (!this.win) throw new Error('No window')

    for (let i = 0; i < 60; i++) {
      await this.sleep(1000)

      if (this.win.isDestroyed()) throw new Error('Window closed')

      const ready = await this.execJS(this.mailReadyCheck())
      if (ready) {
        await this.sleep(2000)
        return
      }
    }

    throw new Error('Outlook Web did not load within 1 minute.')
  }

  // Navigate back to drafts by clicking the sidebar link (no page reload)
  private async goBackToDrafts(): Promise<void> {
    // Click the drafts folder in sidebar
    await this.execJS(`
      (function() {
        // Strategy 1: find <a> with href containing 'draft'
        var anchors = document.querySelectorAll('a[href*="draft" i]');
        for (var i = 0; i < anchors.length; i++) {
          var href = anchors[i].getAttribute('href') || '';
          // Make sure it's a mail folder link, not some random link
          if (href.includes('/mail') || href.includes('/drafts')) {
            anchors[i].click();
            return;
          }
        }
        // Strategy 2: find sidebar treeitem
        var items = document.querySelectorAll('[role="treeitem"]');
        var names = ['Drafts', '草稿', '草稿箱', 'Brouillons', 'Entwürfe', 'Borradores'];
        for (var j = 0; j < items.length; j++) {
          var t = (items[j].textContent || '').replace(/[0-9]/g, '').trim();
          for (var k = 0; k < names.length; k++) {
            if (t === names[k]) { items[j].click(); return; }
          }
        }
      })()
    `)

    // Wait for the draft list to appear
    for (let i = 0; i < 20; i++) {
      await this.sleep(500)
      const ready = await this.execJS(this.mailReadyCheck())
      if (ready) {
        await this.sleep(1000)
        return
      }
    }
  }

  private async sendOneDraft(subject: string): Promise<void> {
    if (!this.win) throw new Error('No window')

    const escaped = subject
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, ' ')

    // Step 1: Find and click the draft
    const clickResult = await this.execJS(`
      (function() {
        var target = '${escaped}';
        var bestMatch = null;
        var bestLen = Infinity;

        var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
        while (walker.nextNode()) {
          var el = walker.currentNode;
          var directText = '';
          for (var c of el.childNodes) {
            if (c.nodeType === 3) directText += c.textContent;
          }
          directText = directText.trim();

          if (directText === target) {
            var clickable = el.closest('[role="option"], [role="listitem"], [role="treeitem"], [data-convid], [tabindex]');
            if (clickable) { clickable.click(); return 'exact'; }
            el.click();
            return 'exact-direct';
          }

          if (directText.includes(target) && directText.length < bestLen) {
            bestMatch = el;
            bestLen = directText.length;
          }
        }

        if (bestMatch) {
          var clickable = bestMatch.closest('[role="option"], [role="listitem"], [role="treeitem"], [data-convid], [tabindex]');
          if (clickable) { clickable.click(); return 'substring'; }
          bestMatch.click();
          return 'substring-direct';
        }

        return 'not-found';
      })()
    `)

    if (clickResult === 'not-found') {
      throw new Error('Draft not found in Outlook')
    }

    // Step 2: Poll for Send button to appear and click it
    let sendClicked = false
    for (let attempt = 0; attempt < 20; attempt++) {
      await this.sleep(1000)

      const result = await this.execJS(`
        (function() {
          var all = document.querySelectorAll('button, [role="button"], [role="menuitem"]');
          var sendKeywords = ['Send', 'send', '发送', '發送', 'Senden', 'Envoyer', 'Enviar'];

          for (var i = 0; i < all.length; i++) {
            var el = all[i];
            if (el.children.length > 5) continue;

            var text = (el.textContent || '').trim();
            var label = el.getAttribute('aria-label') || '';
            var title = el.getAttribute('title') || '';

            if (text.length > 20) continue;

            for (var k = 0; k < sendKeywords.length; k++) {
              if (text === sendKeywords[k] || label === sendKeywords[k] || title === sendKeywords[k]) {
                el.click();
                return 'sent';
              }
            }
          }
          return 'waiting';
        })()
      `)

      if (result === 'sent') {
        sendClicked = true
        break
      }
    }

    if (!sendClicked) {
      throw new Error('Send button did not appear after 20 seconds')
    }

    // Step 3: Wait for send to finish, then go back to drafts for next one
    await this.sleep(2000)
    await this.goBackToDrafts()
  }

  private async execJS(code: string): Promise<any> {
    if (!this.win || this.win.isDestroyed()) throw new Error('Window closed')
    return this.win.webContents.executeJavaScript(code)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
