# 題庫不納入版本控制

`public/data/` 已從 git 移除並加入 `.gitignore`。理由是題庫被視為產出物（見 [ADR-0001](./0001-bank-is-generated-upstream.md)），不是原始碼。檔案留在磁碟上，`bafd6ad` 之前的 commit 仍保有當時的內容。

## Consequences

三件事會因此不成立，決定當下已知：

1. **git 不再是題庫的備份。** 早先把「匯出全部題庫」功能從設計中砍掉時，理由正是「git 本身就是備份」—— 那個理由現在沒了。題庫目前只有磁碟上這一份。

2. **乾淨 clone 建不出可用的站。** `vite build` 會把 `public/` 複製進 `dist/`，而 `public/data/` 不在 repo 裡，所以 CI 或新機器上建出來的站沒有任何資料，每個 `/data/*` 請求都會 404，畫面上只剩朱批報錯。任何託管建置都得另外把題庫送進去。

3. **`git checkout public/data/...` 不再能還原手動改壞的檔案。**
