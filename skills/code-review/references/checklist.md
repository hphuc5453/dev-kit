# Checklist review

Đi qua theo nhóm thay đổi. Không phải mục nào cũng áp dụng; bỏ qua mục không liên quan, không ghi "N/A".

## Logic và edge case
- Điều kiện biên: rỗng, null/undefined, 0, số âm, rất lớn, chuỗi có khoảng trắng/Unicode, mảng một phần tử.
- Off-by-one, so sánh `<` / `<=`, làm tròn tiền tệ, múi giờ, định dạng ngày.
- Nhánh `else` / `default` bị quên; `switch` thiếu case mới thêm vào enum.
- Async: thiếu `await`, promise không bắt lỗi, race condition khi hai request song song, retry gây trùng.
- Trạng thái: cập nhật một nửa rồi lỗi (cần transaction hoặc rollback), cache không bị xoá khi dữ liệu đổi.
- Hành vi cũ bị đổi mà không có lý do trong plan/PR.

## Bảo mật
- Injection: SQL/NoSQL ghép chuỗi, shell command từ input, path traversal (`../`), template/HTML không escape (XSS).
- Authn/authz: endpoint mới có kiểm tra quyền chưa; kiểm tra quyền theo field client gửi lên (`role`, `userId`, header tự đặt); truy cập tài nguyên của user khác (IDOR).
- Secret: key/token/mật khẩu trong code, log, error message, response trả về client.
- Dữ liệu cá nhân (PII) bị log hoặc trả thừa.
- SSRF: URL do user cung cấp được server gọi tới.
- Upload: không giới hạn kích thước/loại file.
- Dependency mới: có cần thiết không, có bị bỏ bảo trì không.

## Breaking change
- Đổi chữ ký hàm/API công khai, đổi tên field response, đổi mã lỗi, đổi format event/message.
- Client khác (app mobile bản cũ, service khác, job) còn gọi kiểu cũ không.
- Config/env mới bắt buộc mà chưa có mặc định hoặc chưa ghi tài liệu.

## Dữ liệu và migration
- Migration có đảo ngược được không, chạy trên bảng lớn có khoá lâu không.
- Cột mới NOT NULL không có default trên bảng đã có dữ liệu.
- Dữ liệu cũ không khớp format mới.
- Index cho query mới.

## Hiệu năng
- N+1 query (query trong vòng lặp), gọi API/IO trong vòng lặp.
- Tải toàn bộ bảng/danh sách thay vì phân trang.
- Thuật toán O(n²) trên dữ liệu có thể lớn.
- Render lại không cần thiết (FE), thiếu memo ở chỗ nặng.

## Xử lý lỗi
- `try/catch` nuốt lỗi im lặng, `catch` trả giá trị mặc định che lỗi thật.
- Thông báo lỗi cho user có đúng text spec yêu cầu không.
- Lỗi từ dịch vụ ngoài: timeout, retry, fallback.

## Test
- Logic nghiệp vụ / rule quan trọng mới có test không.
- Test kiểm tra hành vi thật hay chỉ kiểm tra mock được gọi.
- Test có thể pass kể cả khi code sai không (assertion quá lỏng).
- Test phụ thuộc thời gian/thứ tự/mạng (flaky).

## Rule của repo và độ phức tạp
- Vi phạm quy tắc trong CLAUDE.md / code-standards (cấu trúc thư mục, đặt tên, chiều phụ thuộc giữa module).
- Ngưỡng: hàm ≤ 50 dòng · cyclomatic ≤ 10 · lồng ≤ 3 · tham số ≤ 4 · file ≤ 300 dòng (hoặc ngưỡng chặt hơn của repo).
- Lint đã bị tắt bằng comment (`eslint-disable`, `# noqa`, `@ts-ignore`) không có lý do.

## Code thừa
- Thay đổi không thuộc mục đích của PR (scope creep).
- Code chết, log debug, comment code cũ, TODO không có ticket.
- Trùng lặp với hàm/component đã có sẵn trong repo (Grep trước khi báo).
- Abstraction chỉ dùng một chỗ.
