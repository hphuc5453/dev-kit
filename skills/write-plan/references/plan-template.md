# Mẫu plan

Header bắt buộc ở đầu mọi plan:

```markdown
# <Tên tính năng>: Implementation Plan

> Chạy bằng `/dev-kit:execute-plan`. Các bước dùng checkbox (`- [ ]`) để theo dõi.

**Goal:** <một câu: plan này build gì>

**Architecture:** <2–3 câu về cách làm>

**Tech Stack:** <công nghệ / thư viện chính>

**Spec:** <link design doc>  ·  **Spec-check:** <link, nếu có>

**Chế độ test:** TDD | skip-test

## Ràng buộc chung
<yêu cầu toàn project lấy từ spec: version tối thiểu, giới hạn dependency, quy tắc đặt tên và text, nền tảng.
Mỗi dòng một ý, giá trị chép nguyên văn từ spec. Mọi task ngầm hiểu phải tuân mục này.>

## Điểm cần soát kỹ
<tối đa 5 dòng: input / tình huống lỗi spec ngụ ý mà chưa task nào test → hành vi người dùng mong đợi.
Dễ gây hại nhất lên trước. Mỗi dòng có test hoặc bước kiểm tra tay ở task sở hữu.>

---
```

## Mẫu task — chế độ TDD

````markdown
### Task N: <Tên phần>

**Files:**
- Create: `đường/dẫn/file.ts`
- Modify: `đường/dẫn/có-sẵn.ts:123-145`
- Test: `tests/đường/dẫn/file.test.ts`

**Interfaces:**
- Dùng: <thứ lấy từ task trước — chữ ký chính xác>
- Cung cấp: <thứ task sau dựa vào — tên hàm, tham số, kiểu trả về>

- [ ] **Bước 1: Viết test fail**

```ts
test('áp mã giảm 10% cho đơn ≥ 200.000đ', () => {
  expect(applyCoupon(order(250_000), 'SALE10').total).toBe(225_000);
});
```

- [ ] **Bước 2: Chạy, thấy fail**

Run: `npm test -- tests/coupon.test.ts`
Expected: FAIL với "applyCoupon is not defined"

- [ ] **Bước 3: Viết `applyCoupon(order: Order, code: string): Order` trong `src/coupon.ts`**

<một dòng về cách làm khi chữ ký + test còn để ngỏ lựa chọn>

- [ ] **Bước 4: Chạy, thấy pass**

Run: `npm test -- tests/coupon.test.ts`
Expected: PASS

- [ ] **Bước 5: Commit**

`git commit -m "feat(coupon): apply percentage coupons"`
````

## Mẫu task — chế độ skip-test

````markdown
### Task N: <Tên phần>

**Files:**
- Modify: `src/pages/checkout.tsx:40-80`

**Interfaces:**
- Dùng: `applyCoupon(order, code)` từ Task 2

- [ ] **Bước 1: Thêm ô nhập mã và nút "Áp dụng" vào `CheckoutSummary`**

<chữ ký component / props mới, text nguyên văn từ spec>

- [ ] **Bước 2: Verify**

Run: lần lượt các lệnh trong `.claude/verify.json` (vd `npm run typecheck`, `npm run lint:check`, `npm test`)
Expected: tất cả exit 0

- [ ] **Bước 3: Kiểm tra tay**

1. `npm run dev`, mở `/checkout` với giỏ 250.000đ.
2. Nhập `SALE10`, bấm "Áp dụng" → tổng hiện `225.000đ`, dòng "Giảm 10%".
3. Nhập `ABC` → hiện "Mã không hợp lệ", tổng không đổi.

- [ ] **Bước 4: Commit**

`git commit -m "feat(checkout): add coupon input"`
````

## Mục "Quyết định" (do execute-plan thêm vào cuối plan khi chạy)

```markdown
## Quyết định khi triển khai
- Task 3: <điều phát hiện> — <đã quyết gì và vì sao> — <cái giá nếu sai>
```
