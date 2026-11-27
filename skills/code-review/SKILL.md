---
name: code-review
description: Review thay đổi code trước khi tạo PR — mặc định diff của branch hiện tại so với main (kể cả chưa commit), hoặc một PR theo số/URL; tìm bug logic, edge case, lỗ hổng bảo mật, breaking change, vi phạm CLAUDE.md/code-standards, ngưỡng độ phức tạp, test thiếu, code thừa; kiểm chứng từng lỗi trước khi báo, xếp theo mức nghiêm trọng kèm file:line. Thêm --fix để sửa các lỗi đã kiểm chứng. Cũng dùng khi nhận góp ý review từ người khác. Dùng khi user nói "review", "code review", "xem lại code", "soát trước khi merge", "code này ổn chưa", "--fix".
argument-hint: "[số PR | URL PR | branch] [--fix]"
---

# dev-kit:code-review

Mục tiêu: tìm lỗi **thật** trong thay đổi, đủ chính xác để sửa ngay. Một lỗi đúng có bằng chứng giá trị hơn mười lỗi đoán.

## 1. Xác định target
- `$ARGUMENTS` có số PR / URL → `gh pr view <pr> --json title,body,baseRefName,headRefName,files` + `gh pr diff <pr>`. Có `--fix` mà PR không phải branch đang checkout → hỏi trước khi checkout.
- Có tên branch → diff `<main>...<branch>`.
- Mặc định → branch hiện tại: `git diff <main>...HEAD` **cộng** working tree (`git diff HEAD`, file untracked liên quan). Main = `git symbolic-ref refs/remotes/origin/HEAD`, không có thì `main`/`master`.
- Diff rỗng → báo không có gì để review, dừng.
- Diff lớn (> ~1500 dòng) → review theo từng nhóm file, nói rõ đã chia lượt.

## 2. Đọc ngữ cảnh
- CLAUDE.md, `docs/code-standards.md`, `docs/tech-debt.md`, `.claude/verify.json`.
- Mục đích thay đổi: mô tả PR, commit message, plan (`docs/plans/`), spec-check (`*-spec-check.md`) nếu có.
- Với mỗi file đổi: đọc **cả hàm/khối bao quanh** chỗ đổi, không chỉ dòng `+`. Theo người gọi và người được gọi của hàm đổi chữ ký hoặc hành vi (Grep tên hàm).

## 3. Soát
Đi qua `references/checklist.md` cho từng nhóm thay đổi. Tập trung theo thứ tự:
1. Đúng logic và edge case (thứ người dùng sẽ gặp).
2. Bảo mật và dữ liệu.
3. Breaking change với code/client khác.
4. Rule của repo và ngưỡng độ phức tạp.
5. Test.
6. Code thừa, trùng lặp, dọn dẹp.

Spec là tầm nhìn, không liệt kê mọi input. Hành vi spec không nói tới → chấm theo điều một người dùng hợp lý mong đợi.

## 4. Kiểm chứng từng lỗi
Trước khi báo, mỗi lỗi phải qua:
- Đọc lại đúng đoạn code (số dòng hiện tại, không theo trí nhớ).
- Viết được **kịch bản cụ thể**: input / trạng thái nào → kết quả sai gì / crash ở đâu.
- Kiểm tra code ở chỗ khác chưa xử lý giùm (middleware, validate tầng trên, constraint DB, type đã chặn).
- Rẻ thì chạy thử (test sẵn có, script nhỏ trong scratchpad, gọi hàm).

Kịch bản không đứng được → bỏ. Có lý do nhưng chưa chứng minh được → giữ với nhãn `nghi ngờ`.

## 5. Phân loại và báo cáo
Nhãn:
- **quan trọng**: bug do thay đổi này gây ra hoặc làm tệ hơn, lỗ hổng bảo mật, mất/hỏng dữ liệu, breaking change không chủ ý, vi phạm rule bắt buộc của repo.
- **có sẵn từ trước**: bug thật nhưng đã có trước thay đổi này.
- **nhỏ**: không gây sai hành vi (đặt tên, trùng lặp nhỏ, dọn dẹp, log).

Output trong chat, xếp quan trọng → có sẵn từ trước → nhỏ:

```
## Kết quả review: <target>  (<n> quan trọng · <n> có sẵn · <n> nhỏ)

### quan trọng
1. [file.ts:42](path/file.ts#L42) — <lỗi là gì, một câu>
   Kịch bản: <input/trạng thái> → <kết quả sai>
   Sửa: <cách sửa cụ thể>
   (nghi ngờ: <còn thiếu bằng chứng gì>)   ← chỉ khi chưa chứng minh được

### có sẵn từ trước
### nhỏ

**Kết luận:** sẵn sàng tạo PR | sửa xong mục quan trọng rồi tạo PR | cần bàn lại thiết kế
```

- Không khen chung chung, không "nhìn chung ổn" khi chưa soát hết. Không có lỗi nào → nói rõ đã soát những gì.
- Không báo lỗi trên code chưa đọc.

## 6. `--fix`
- Sửa các lỗi **quan trọng** và **nhỏ** đã kiểm chứng (bỏ qua mục `nghi ngờ`, liệt kê lại để user quyết).
- Lỗi đổi hành vi → có test tái hiện fail trước rồi pass, nếu repo có test cho vùng đó; không thì nêu bước kiểm tra tay.
- Mỗi sửa đổi tối thiểu, đúng phạm vi lỗi; không refactor kèm.
- **có sẵn từ trước** → không sửa, ghi vào `docs/tech-debt.md` (tạo nếu chưa có).
- Chạy toàn bộ lệnh verify, đọc output. Fail → sửa tiếp tới khi sạch hoặc báo rõ lệnh nào còn fail.
- Báo lại từng lỗi: `đã sửa` (file:line) · `bỏ qua` (lý do) · `không cần sửa` (vì sao kiểm chứng lại thấy không phải lỗi).
- Không commit; gợi ý `dev-kit:commit` hoặc `dev-kit:create-pr`.

## 7. Khi nhận góp ý review (từ user, đồng nghiệp, bot)
1. Đọc hết góp ý. Mục nào chưa rõ → hỏi lại **trước khi sửa bất kỳ mục nào** (các mục có thể liên quan nhau).
2. Mỗi mục: kiểm tra trên code thật — đúng với codebase này không, có làm hỏng chỗ khác không, có lý do cho cách viết hiện tại không, có đúng trên mọi nền tảng/version repo hỗ trợ không.
3. Góp ý sai → phản biện bằng bằng chứng kỹ thuật (file:line, test, tài liệu). Góp ý đề nghị "làm cho chuẩn" một tính năng → Grep xem có ai dùng không; không ai dùng → đề xuất bỏ (YAGNI).
4. Góp ý mâu thuẫn quyết định user đã đưa ra → dừng, hỏi user.
5. Sửa theo thứ tự: chặn (bug, bảo mật) → đơn giản → phức tạp; mỗi mục kiểm tra riêng; chạy verify ở cuối.
6. Không trả lời kiểu "Bạn nói đúng quá!", "Góp ý tuyệt vời!". Nêu lại yêu cầu kỹ thuật, hoặc cứ làm.

## Bước tiếp
Sạch hoặc đã sửa xong → `dev-kit:create-pr` (hoặc `dev-kit:commit` nếu chỉ muốn commit).
