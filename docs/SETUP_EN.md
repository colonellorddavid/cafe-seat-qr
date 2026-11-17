# Setup guide

[한국어 그림 안내](설치가이드.html) | **English**

You need one Google account (ideally the cafe owner's) and about 20 minutes. Google menu names below are the English UI; the Korean UI name is in brackets.

## 1. Create a Google Sheet

1. In Chrome, signed in to the owner's Google account, open [sheets.new](https://sheets.new).
2. Rename it at the top left, for example "Our cafe seats".

You do not need a Google Form. The code creates a tab called **좌석기록** (seat log) inside this sheet and records check-ins there.

## 2. Paste the code

1. In the sheet, open **Extensions → Apps Script** (확장 프로그램 → Apps Script).
2. A code editor opens with `function myFunction() {}`. Select everything (**Ctrl+A**) and delete it.
3. Copy the whole of [`apps-script/Code.gs`](../apps-script/Code.gs) and paste it (**Ctrl+V**).
4. Change `CAFE_NAME` at the top to your cafe's name (optional; you can do it later).
5. Click the **💾 Save** icon (or **Ctrl+S**).

## 3. Deploy as a web app

1. Click the blue **Deploy** button (배포) at the top right → **New deployment** (새 배포).
2. Next to *Select type*, click the **⚙ gear** → **Web app** (웹 앱).
3. Set:
   - **Execute as**: **Me** (나)
   - **Who has access**: **Anyone** (모든 사용자). Not "Anyone with Google account", not "Only myself". Otherwise guests' phones cannot open it.
4. Click **Deploy**.
5. The first time, click **Authorize access**, choose your account. You will see *"Google hasn't verified this app"*. This is normal for your own script: click **Advanced → Go to (project name) (unsafe) → Allow**. The script only reads and writes the 좌석기록 tab of this sheet.
6. Copy the **Web app URL**. It looks like `https://script.google.com/macros/s/…/exec`.
7. Open the URL in a new tab. If you see the seat map with "한산 · 0명", it works.

## 4. Make the QR codes

1. Open [`tools/qr-maker.html`](../tools/qr-maker.html) by double-clicking it (it works offline; the URL never leaves your computer).
2. Paste the web app URL, optionally add the cafe name, and click **QR 만들기** (Make QR).
3. Click **인쇄하기** (Print) → *Save as PDF* or print.

| QR | URL | Where to put it |
| --- | --- | --- |
| 입장 (check in) | `…/exec?p=in` | Tables, entrance |
| 퇴장 (check out) | `…/exec?p=out` | Exit, tray return |
| 좌석 현황 (live map) | `…/exec` | Website, social media, a sign outside |

## 5. Test and run it

- Scan the check-in QR with a phone, tap a white seat, then tap **앉기** (Sit). Your seat turns blue, and within 5 seconds it turns gray on the live map.
- Tap **퇴장하기** (Leave), or scan the check-out QR, to free the seat.
- **Erase test data**: in the Apps Script editor, pick `clearLog` in the function dropdown → **▷ Run**.
- **After changing the code**: saving is not enough. Use **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**. This keeps the same URL, so your QR codes keep working.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| "Sorry, unable to open the file" on other phones | Manage deployments → ✏️ → access must be **Anyone** |
| Fails only in one browser | Several Google accounts are signed in there. Use a private / incognito tab |
| Old page after editing | Redeploy with **New version** |
