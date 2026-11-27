---
name: execute-plan
description: Triển khai một plan (docs/plans/*.md) tuần tự trong phiên hiện tại — làm từng task theo đúng thứ tự bước, TDD hoặc skip-test theo dòng "Chế độ test" của plan, chạy và đọc output mọi lệnh verify, tick checkbox trong file plan, commit cuối mỗi task, ghi lại quyết định khi plan sai, tự review toàn branch ở cuối. Dùng khi user nói "chạy plan", "làm theo plan", "execute plan", "triển khai plan", hoặc sau khi dev-kit:write-plan được duyệt.
argument-hint: "<đường dẫn plan>"
---

# dev-kit:execute-plan

Tự làm plan, từng task một, trong phiên này. Plan đã làm phần suy nghĩ: làm đúng theo plan, chứng minh mỗi bước bằng lệnh đã chạy và output đã đọc, và để lại dấu vết sống sót qua việc chính mình quên (compact context).

**Làm liên tục:** không dừng hỏi "làm tiếp không?" giữa các task. Giữa các tool call chỉ ghi tối đa một dòng ngắn.

**Quyết định, không đứng chờ.** Xung đột, chỗ mơ hồ, plan sai → tự quyết. Spec là căn cứ cao nhất, plan là lập luận của nó, phán đoán của mình giải quyết phần cả hai không trả lời. Mọi lệch khỏi plan phải ghi lại (mục 4). Lệch mà không ghi là quyết định giấu.

**Chỉ dừng hỏi user khi:**
1. thao tác không đảo ngược được hoặc phá huỷ (xoá dữ liệu, migration trên DB thật, `reset --hard`);
2. thao tác nhạy cảm bảo mật (secret, quyền, auth);
3. tác động ra ngoài repo cần hỏi trước theo thông lệ (push, merge, publish, gọi dịch vụ ngoài);
4. plan hỏng tới mức mọi hướng đi tiếp đều là đoán.

## 1. Chuẩn bị
- Đọc plan **một lần đầy đủ**. Plan có link Spec / Spec-check → đọc cả hai. Không tìm thấy spec → ghi vào mục Quyết định: "không có spec, các quyết định là tạm".
- Đọc dòng `**Chế độ test:**` → `TDD` hoặc `skip-test`. Không có dòng đó → coi là TDD.
- Đọc CLAUDE.md, `docs/code-standards.md`, `.claude/verify.json`.
- **Branch:** đang ở main/master → tạo branch mới theo quy ước của repo (mặc định `feat/<slug>`) trước khi sửa code; user đã nói rõ được làm trên main thì thôi. Working tree có thay đổi không thuộc plan → hỏi user trước khi bắt đầu.
- **Tiến độ:** nguồn đúng là checkbox trong file plan + `git log`. Có bước đã tick `- [x]` hoặc có commit của task → task đó đã xong, **không làm lại**; tiếp từ bước chưa tick đầu tiên. Sau khi bị compact, tin hai nguồn này hơn trí nhớ.
- **Soát xung đột một lần** trước Task 1: mỗi task dùng thứ task trước cung cấp (khối Interfaces) → tên, chữ ký, kiểu có khớp không. Không khớp → quyết theo spec, ghi vào mục Quyết định, rồi bắt đầu.
- Tạo todo cho mỗi task.

## 2. Vòng lặp mỗi task
1. Đánh dấu todo của task là đang làm. Đọc lại **đúng đoạn của task đó** trong plan (không làm theo trí nhớ: trí nhớ chỉ là bản tóm tắt, plan có giá trị chính xác).
2. Làm từng bước theo thứ tự. Bước có lệnh và `Expected:` → chạy lệnh, đọc output, so sánh:
   - **Khớp** → tick `- [x]` bước đó trong file plan, sang bước tiếp.
   - **Code sai** → tìm nguyên nhân gốc theo bước 2 của `dev-kit:fix-bug` (lần ngược, mỗi lần một giả thuyết). Không vá triệu chứng cho khớp output.
   - **Plan sai** (bước mâu thuẫn spec, interface không khớp, lệnh không thể chạy) → thay đổi nhỏ nhất thoả spec, ghi vào mục Quyết định, làm tiếp.
3. Output dài (test suite, build) → ghi ra file trong scratchpad, đọc phần cuối; không đổ cả vào context.
4. Commit theo bước commit của plan. Một task nhiều commit cũng được. Ghi tick checkbox vào file plan trong cùng lượt với commit, không để dồn.

### Chế độ TDD
- **Không có code sản phẩm khi chưa có test fail trước.** Viết test → chạy → thấy fail **đúng lý do** (không phải lỗi cú pháp, import sai) → code tối thiểu → chạy thấy pass → dọn code, vẫn pass.
- Test pass ngay khi chưa có code → test chưa bắt được hành vi: sửa test, không đi tiếp.
- Lỡ viết code trước test → bỏ đoạn code đó, viết test, xem fail, rồi viết lại.
- Test kiểm tra hành vi thật; chỉ mock khi không tránh được (mạng, thời gian, dịch vụ ngoài).
- Task ghi `(không test tự động: ...)` → làm như chế độ skip-test cho task đó.

### Chế độ skip-test
- Không viết file test mới (trừ khi user yêu cầu).
- Bước verify: chạy **toàn bộ** lệnh trong `.claude/verify.json` (hoặc lint + typecheck + test đang có theo CLAUDE.md). Test cũ fail vì thay đổi của task → sửa code, không sửa/tắt test để cho pass (trừ khi spec đổi hành vi đó, khi ấy ghi vào mục Quyết định).
- Bước kiểm tra tay: làm được bằng công cụ trong phiên (gọi API local, chạy CLI, chạy script) → tự làm và ghi kết quả; cần người (UI, thiết bị thật) → gom vào danh sách Kiểm tra tay để đưa user ở cuối.

## 3. Hợp đồng hoàn thành task
Trước khi coi task là xong, mọi điều sau phải đúng, có bằng chứng trong phiên này (không suy ra từ việc diff trông đúng):
- Mọi lệnh trong task đã chạy và đã đọc output; mọi `Expected:` đã so với output thật.
- Lần chạy verify cuối của task pass (TDD: test của task + test liên quan; skip-test: toàn bộ verify).
- Mọi lệch khỏi plan đã có dòng trong mục Quyết định.
- Mọi checkbox của task đã tick, commit đã tạo.

**Không nói "xong", "pass", "chạy được" khi chưa chạy lệnh chứng minh trong lượt đó.** Tránh "chắc là", "có vẻ", "nên sẽ pass". Thiếu một điều → task chưa xong: làm nốt.

## 4. Mục Quyết định
Thêm (hoặc nối vào) cuối file plan:

```markdown
## Quyết định khi triển khai
- Task <N>: <điều phát hiện> — <đã quyết gì và vì sao> — <cái giá nếu sai>
```

Task sau đụng cùng interface → đọc lại mục này, không dựa vào trí nhớ.

## 5. Review cuối
Xong task cuối:
1. Chạy toàn bộ verify của repo một lần nữa, đọc output.
2. Tự review toàn branch (`git diff <main>...HEAD`) theo `dev-kit:code-review` (checklist trong `references/checklist.md` của skill đó), kèm "Điểm cần soát kỹ" của plan: kiểm tra từng dòng có thật sự được xử lý.
3. Lỗi `quan trọng` → sửa trong **một** lượt: mỗi lỗi có test tái hiện fail trước rồi pass (TDD) hoặc bước kiểm tra lại cụ thể (skip-test), rồi chạy lại toàn bộ verify. Lỗi `nhỏ` → không sửa, liệt kê cho user. Lỗi `có sẵn từ trước` → ghi `docs/tech-debt.md`.
4. Ghi rõ với user đây là **tự review của chính người viết code**, yếu hơn một lượt review độc lập; đề xuất chạy `dev-kit:code-review` trong phiên mới nếu thay đổi lớn hoặc rủi ro.

## 6. Báo cáo
- Task đã xong (commit đầu..cuối), kết quả verify cuối (lệnh + kết quả).
- **Quyết định đã đưa ra**: chép đủ mục Quyết định, theo thứ tự, mỗi dòng kèm cái giá nếu sai.
- **Kiểm tra tay cần user làm** (skip-test hoặc task không test tự động được).
- **Lỗi nhỏ để lại** (nếu có).
- Bước tiếp: có spec-check → `dev-kit:recheck-spec`; không có → `dev-kit:code-review`; rồi `dev-kit:create-pr`.

## Ngụy biện thường gặp
| Ý nghĩ | Thực tế |
|---|---|
| "Nhớ Task N nói gì rồi" | Nhớ bản tóm tắt. Đọc lại đoạn của task. |
| "Code trong plan đúng rồi, khỏi xem test fail" | Test chưa thấy fail thì chưa chứng minh gì. Chạy đi. |
| "Chạy hết test ở cuối cho nhanh" | Chạy theo từng bước mới biết bước nào làm hỏng. |
| "Plan sai chỗ này, cứ làm đúng là được" | Làm đúng, và ghi vào mục Quyết định. |
| "Vài task nữa mới tick checkbox" | Compact không chờ lúc thuận tiện. Tick cùng lượt commit. |
| "Hỏi user xem có làm tiếp không" | Chỉ 4 trường hợp ở đầu mới dừng. |
| "Thay đổi nhỏ, chắc pass" | "Chắc" không phải bằng chứng. Chạy lệnh. |
| "Sửa luôn mấy lỗi nhỏ cho gọn" | Mỗi lỗi nhỏ là thêm việc user không yêu cầu. Liệt kê, user quyết. |
