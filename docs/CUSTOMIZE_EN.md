# Make it yours

[한국어](커스터마이즈.md) | **English**

Everything is at the top of `apps-script/Code.gs`. After editing, **save → Deploy → Manage deployments → ✏️ → Version: New version → Deploy** so guests see the change.

## 1. Cafe name

```js
const CAFE_NAME = '우리 카페';
```

Change only the text inside the quotes. It appears as the page title and the browser tab name.

## 2. Seat layout

```js
const ZONES = [
  { name: '창가 바', note: '조용함',    from: 1,  to: 10, outlet: [1, 10] },
  { name: '2인석',   note: '보통',      from: 11, to: 26, outlet: [11, 18] },
  { name: '4인석',   note: '대화 많음', from: 27, to: 38, outlet: [27, 30] },
  { name: '소파',    note: '대화 많음', from: 39, to: 40, outlet: [0, 0] }
];
```

| Field | Meaning |
| --- | --- |
| `name` | Zone name, shown in bold (e.g. window bar, 2-seat tables) |
| `note` | One short note about the zone (e.g. quiet, laptops welcome) |
| `from`, `to` | Seat number range in this zone. Match the numbers on your tables |
| `outlet` | Range of seats with a power outlet. `[0, 0]` if none |

- Add or remove zones by copying or deleting lines. No comma after the last line.
- Number seats **from 1 with no gaps** (e.g. 1–8, 9–20, 21–24). The total seat count is calculated for you.
- If outlet seats are scattered, it is easiest to number the outlet seats consecutively.

Example, a 20-seat cafe:

```js
const ZONES = [
  { name: 'Bar',    note: 'Solo study', from: 1, to: 8,  outlet: [1, 8] },
  { name: 'Tables', note: '2-4 people', from: 9, to: 20, outlet: [9, 12] }
];
```

## 3. Auto check-out time

```js
const STAY_MIN = 90;
```

Minutes after which a seat frees itself if the guest did not check out. For a study cafe where people stay long, use 180–240.

## 4. Calm / moderate / busy thresholds

```js
const CALM = 0.4, BUSY = 0.75;
```

Under 40% of seats taken is **calm (한산)**, 75% or more is **busy (혼잡)**, in between is **moderate (보통)**.

## 5. Page text, language and colors

The page HTML is inside `const PAGE = ...` near the bottom of `Code.gs`. You can find and replace any Korean text there to translate the guest pages, for example `빈자리(흰색)를 눌러 앉을 자리를 고르세요.` ("Tap a white seat to pick where to sit."). The crowd labels are in `var LV = { calm: '한산', mid: '보통', busy: '혼잡' };`. Colors are in the `:root{--accent:#1F6B57; ...}` line.

## 6. View and erase the log

- The **좌석기록** tab gets one row per action: `time · seat · 입장 (in) / 퇴장 (out)`. You can analyse busy hours from it.
- To erase everything: Apps Script editor → function dropdown → `clearLog` → ▷ Run.
- Keep the tab name `좌석기록`. If you rename it, the script creates a new empty one.
