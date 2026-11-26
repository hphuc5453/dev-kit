# Khung `docs/code-standards.md`

Copy khung dưới đây, điền theo repo. Bỏ mục không áp dụng. Mỗi quy tắc: ngắn, kiểm chứng được, có ví dụ khi dễ hiểu nhầm. Đánh dấu `(quyết định mới)` cho chỗ chọn giữa các quy ước đang lẫn lộn.

```markdown
# <Tên dự án> — Code Standards

> Bắt buộc cho code mới và code được refactor. Cập nhật: <YYYY-MM-DD>.
> Lệch chuẩn có lý do → ghi comment `// standards-exception: <lý do>`.

## 1. Stack & lệnh
- Ngôn ngữ / framework / runtime: ...
- Package manager: ... (chỉ một lock file)
- Verify trước khi push: `<typecheck>` · `<lint>` · `<test>` · `<build>`

## 2. Cấu trúc thư mục
<cây thư mục chuẩn, 1 dòng mô tả mỗi thư mục>

- Một feature/module chứa: ...
- Thứ gì được đặt ở `shared/`: chỉ code dùng ≥ 2 feature, không chứa business logic của feature cụ thể.
- Script chạy tay / seed: ...

## 3. Đặt tên
- File: `<kebab-case>.<vai-trò>.<ext>` (vd `outfit-set.service.ts`) / Python `snake_case.py` ...
- Thư mục vai trò: `dto/`, `entities/`, ... (một tên duy nhất cho mỗi vai trò)
- Class / hàm / hằng số / enum: ...
- Tên hàm phản ánh side effect (`get*` không ghi, `sync*`/`upsert*` có ghi).

## 4. Ranh giới & phụ thuộc
- Chiều phụ thuộc: ... → ... → ...
- Module khác chỉ dùng qua: <module export / index / interface>.
- Cấm: import vòng; controller/component gọi DB/API trực tiếp; đọc env ngoài module config.
- Tự động hoá bằng: <eslint boundaries / dependency-cruiser / import-linter / ArchUnit>.

## 5. Kích thước & độ phức tạp (lint enforce — vi phạm = verify fail)
- Hàm ≤ 50 dòng · cyclomatic ≤ 10 · cognitive ≤ 15 · lồng ≤ 3 cấp · tham số ≤ 4 · file ≤ 300 dòng.
- Enforce bằng: <rule lint cụ thể của repo>. Không dùng disable-comment để lách.
- Class/service inject > 6 dependency → tách trách nhiệm.
- Ngoại lệ theo file (nếu có): <file> — <lý do>.

## 6. Kiểu dữ liệu & validate
- Validate input tại boundary (DTO/schema). Không truyền `any`/dict thô qua nhiều tầng.
- Type dùng chung đặt ở ..., type riêng feature đặt trong feature.

## 7. Xử lý lỗi & logging
- Kiểu lỗi chuẩn: ... ; handler tập trung: ...
- Không nuốt lỗi im lặng. Không log secret/PII (token, OTP, mật khẩu...).

## 8. Config & secret
- Đọc env tại một nơi: ... ; validate lúc khởi động. `.env.example` đồng bộ.

## 9. Data access
- Pattern truy cập DB: ... ; migration/index: ... ; upsert idempotent.

## 10. Tích hợp bên ngoài
- Đặt sau interface/provider token; client có timeout, retry có giới hạn.

## 11. Test
- Vị trí & tên file test: ...
- Bắt buộc test cho: logic thuần, hotspot vừa refactor, bug vừa fix.
- Mock ở biên ngoài, không mock chi tiết nội bộ.

## 12. Style
- Formatter/linter: ... (lỗi format = lỗi CI). Ngôn ngữ comment/message: ...

## 13. Git & PR
- Branch: `feat/`, `fix/`, `refactor/` ... ; commit: Conventional Commits.
- PR refactor không kèm thay đổi hành vi.
```
