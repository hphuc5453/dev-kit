---
name: write-plan
description: Viết implementation plan từ design doc hoặc file spec-check — chia task nhỏ, mỗi task có file cần sửa, các bước dạng checkbox, lệnh verify và kết quả mong đợi, commit cuối task; mặc định TDD (test fail trước), thêm --skip-test khi task không cần hoặc không muốn viết file test (verify bằng lint/typecheck/test đang có + bước kiểm tra tay). Lưu vào docs/plans/. Không code. Dùng khi user nói "viết plan", "lập kế hoạch", "chia task", sau khi design doc được duyệt, hoặc spec-check đã chốt cho task lớn. Bước tiếp là dev-kit:execute-plan.
argument-hint: "<design doc / file spec-check / yêu cầu> [--skip-test]"
---

# dev-kit:write-plan

Viết plan cho một dev chưa từng thấy codebase và spec này. Họ viết code tốt bằng ngôn ngữ của project khi biết đúng interface và đúng test, và sẽ tự chọn hợp lý ở chỗ plan để ngỏ. Điều họ **không thể biết** là những gì đã được quyết: file nào, tên và chữ ký hàm nào, giá trị nào từ spec, test nào chứng minh mỗi task. Ghi đúng những điều đó. Nguyên tắc: DRY, YAGNI, commit thường xuyên; TDD trừ khi `--skip-test`.

Output: `docs/plans/YYYY-MM-DD-<slug>.md` (repo có quy ước khác → theo repo). Không code trong skill này.

## 1. Input
- `$ARGUMENTS`: design doc (`docs/specs/*-design.md`), file spec-check, hoặc mô tả yêu cầu; cờ `--skip-test`.
- Đọc nguồn đó **và** mọi thứ nó trỏ tới (spec-check, spec gốc). Design doc là nguồn đúng cho cách làm; spec-check là nguồn đúng cho yêu cầu.
- Chỉ có mô tả ngắn, còn phải chọn cách làm → đề xuất chạy `dev-kit:brainstorm` trước. Mô tả đủ rõ, một cách làm hợp lý → viết plan luôn.
- Đọc CLAUDE.md, `docs/code-standards.md`, `.claude/verify.json` (lệnh verify), quy ước test của repo (thư mục, tên file, framework).

## 2. Chế độ test
- **TDD** (mặc định): mỗi thay đổi hành vi có test viết trước, chạy thấy fail đúng lý do, rồi mới code.
- **skip-test** (`--skip-test`): không có bước viết test mới. Mỗi task verify bằng:
  1. lệnh trong `.claude/verify.json` (hoặc lint + typecheck + test đang có của repo theo CLAUDE.md), và
  2. mục **Kiểm tra tay** cụ thể: thao tác gì (mở trang nào, gọi API nào với input nào, chạy lệnh nào), mong đợi thấy gì. Không viết "kiểm tra hoạt động đúng".
- Dòng đầu plan ghi đúng một trong hai: `**Chế độ test:** TDD` hoặc `**Chế độ test:** skip-test`. `dev-kit:execute-plan` đọc dòng này.
- TDD nhưng có task không test tự động được (config, UI thuần, hạ tầng) → task đó ghi `(không test tự động: <lý do>)` và dùng bước Kiểm tra tay như skip-test.

## 3. Phạm vi
Spec gồm nhiều hệ thống con độc lập → đề xuất tách thành nhiều plan, mỗi plan ra được phần mềm chạy và kiểm tra được riêng.

## 4. Map file trước khi chia task
Liệt kê file sẽ tạo/sửa và trách nhiệm của từng file. Quyết định tách module khoá ở đây.
- Mỗi file một trách nhiệm rõ, interface rõ. Ưu tiên file nhỏ, tập trung; tuân ngưỡng độ phức tạp của repo (mặc định dev-kit: hàm ≤ 50 dòng, file ≤ 300 dòng).
- File thay đổi cùng nhau thì để cạnh nhau. Tách theo trách nhiệm, không theo tầng kỹ thuật.
- Codebase có sẵn → theo pattern đang có. File sắp sửa đã quá lớn → có thể thêm bước tách vào plan, không tự ý tái cấu trúc rộng.

## 5. Cỡ task và cỡ bước
- **Task** = đơn vị nhỏ nhất có vòng kiểm tra riêng và có thể được duyệt/từ chối độc lập với task bên cạnh. Gộp bước setup, config, scaffold, docs vào task cần chúng. Mỗi task kết thúc bằng một kết quả kiểm tra được.
- **Bước** = một hành động có kết quả kiểm tra được (2–5 phút): viết test fail · chạy thấy fail · code tối thiểu · chạy thấy pass · commit.

## 6. Một bước chứa gì
Bước xong khi người làm chỉ viết ra được **một** thứ hợp lý từ nó. Rõ ràng, không cần đầy đủ:
- **Bước test:** tên test và các assertion, dạng code, với đúng giá trị trong spec.
- **Bước code:** chữ ký chính xác (tên, tham số, kiểu trả về), file chứa nó, giá trị spec quy định. Người làm tự viết thân hàm. Chỉ viết thân hàm khi đó là thuật toán mà chữ ký + test không xác định được, hoặc là text cố định spec quy định.
- **Bước verify:** lệnh cần chạy và output nghĩa là pass (`Expected: ...`).
- **Tham chiếu task khác:** khối Interfaces của task đó nói dùng gì; không chép lại code của task đó.

Plan dài hơn code nó mô tả là đã viết code thay người làm. Dòng không quyết định gì ("TBD", "xử lý edge case", "thêm validate phù hợp", "viết test cho phần trên", kiểu/hàm không task nào định nghĩa) là lỗi ngược lại. Cả hai bị bắt ở bước tự rà.

## 7. Cấu trúc plan
Theo mẫu `references/plan-template.md` (header, Ràng buộc chung, Điểm cần soát kỹ, mẫu task TDD và skip-test).

**Điểm cần soát kỹ:** tối đa 5 loại input hoặc tình huống lỗi mà spec ngụ ý nhưng không task nào test, dễ gây hại nhất cho người dùng: mỗi dòng nêu input/tình huống và hành vi người dùng hợp lý mong đợi. Spec im lặng về một input không có nghĩa input đó được phép làm hỏng chương trình. Với mỗi dòng, thêm test (TDD) hoặc bước kiểm tra tay (skip-test) vào task sở hữu phần code đó.

## 8. Tự rà
Viết xong, đọc lại spec bằng con mắt mới và soát plan (tự làm, không giao subagent):
1. **Phủ spec:** mỗi yêu cầu/mục trong spec (và mỗi ID trong spec-check) chỉ ra được task làm nó. Thiếu → thêm task.
2. **Soát bước:** mỗi bước chỉ cho ra một thứ hợp lý; dòng không quyết định gì là lỗ hổng, thân hàm mà chữ ký + test đã xác định là chép thừa. Sửa cả hai.
3. **Nhất quán tên:** kiểu, chữ ký, tên thuộc tính ở task sau khớp với task trước (`clearLayers()` ở Task 3 nhưng `clearFullLayers()` ở Task 7 là bug).
4. **Điểm cần soát kỹ:** mỗi dòng đã có test/bước kiểm tra tay ở task sở hữu. Mục rỗng nghĩa là đã soát và không thấy, không phải bỏ qua.
5. **Tỉ lệ:** plan dài gấp nhiều lần spec, hoặc phần lớn là code block → thay thân hàm bằng chữ ký, tên test và assertion.
6. **Chế độ test:** skip-test thì không còn bước "viết test" nào; mỗi task có lệnh verify và mục Kiểm tra tay cụ thể.

Thấy lỗi → sửa luôn, không cần rà lại lần nữa.

## 9. Giao lại
Đưa link plan, tóm tắt số task và chế độ test, các quyết định mình đã tự đưa ra (nếu có), rồi hỏi: "Plan đã đúng ý chưa?". User duyệt → bước tiếp `dev-kit:execute-plan <plan>`.
