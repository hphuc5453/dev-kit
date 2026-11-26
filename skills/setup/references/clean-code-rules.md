# Clean code — quy tắc mặc định

Áp dụng khi chuẩn của repo **không** quy định khác. Ví dụ viết bằng TypeScript nhưng ý áp dụng cho mọi ngôn ngữ.

## 1. Giới hạn độ phức tạp (cứng — lint enforce, xem `lint-presets.md`)

Một bộ số duy nhất cho mọi stack. Repo có thể siết chặt hơn, không nới lỏng nếu không có lý do ghi trong code-standards.

| Chỉ số | Giới hạn | Vượt thì |
|---|---|---|
| Độ dài hàm/method | ≤ 50 dòng (bỏ dòng trống/comment); mục tiêu thường ≤ 30 | Tách bước con thành hàm có tên |
| Cyclomatic complexity | ≤ 10 | Lookup table, strategy map, tách hàm theo từng trường hợp |
| Cognitive complexity | ≤ 15 | Early return, tách hàm |
| Độ sâu lồng (`if`/`for`/`try`/callback) | ≤ 3 cấp | Early return, tách hàm, đổi sang lookup map |
| Tham số | ≤ 4 | Gom thành 1 object/DTO có type |
| File | ≤ 300 dòng | Tách theo trách nhiệm |
| Component UI | ≤ ~150 dòng JSX+logic | Tách sub-component; tách logic ra hook |
| Ternary lồng | 0 | `if` / map / hàm riêng |
| Boolean param đổi hành vi (`fn(x, true)`) | 0 | Hai hàm riêng, hoặc option object có tên |

**Không lách:** không thêm `eslint-disable` / `# noqa` / `//nolint` để qua ngưỡng. Trường hợp thật sự cần (vd bảng mapping dài, code sinh tự động) → loại trừ theo file trong config lint, kèm lý do trong code-standards.

Một hàm làm **một việc**, mô tả được bằng một câu không có chữ "và".

```ts
// ❌ lồng sâu, nhiều việc
function getLabel(order) {
  if (order) {
    if (order.status === 'paid') {
      if (order.shipped) return 'Đang giao';
      else return 'Đã thanh toán';
    } else if (order.status === 'cancel') return 'Đã huỷ';
  }
  return '';
}

// ✅ early return + lookup
const STATUS_LABEL: Record<OrderStatus, string> = { paid: 'Đã thanh toán', cancel: 'Đã huỷ', pending: 'Chờ' };

function getOrderLabel(order?: Order): string {
  if (!order) return '';
  if (order.status === 'paid' && order.shipped) return 'Đang giao';
  return STATUS_LABEL[order.status];
}
```

## 2. Đặt tên

- Tên nói **ý định**, không nói cách làm: `activeUsers` thay vì `filteredArr`; `isExpired` thay vì `check`.
- Boolean: `is/has/can/should…`. Hàm: động từ (`fetchCart`, `buildQuery`, `formatPrice`). Handler UI: `handle<Sự kiện>` / prop `on<Sự kiện>`.
- Không viết tắt khó hiểu (`usr`, `cfg`, `tmp2`); ngoại lệ phổ biến: `id`, `url`, `i` trong vòng lặp ngắn.
- Không magic number/string: đặt hằng có tên (`MAX_RETRY = 3`, `PAGE_SIZE`). Hằng dùng 1 file → đầu file đó; dùng nhiều nơi → nơi chuẩn repo quy định.
- Cùng khái niệm dùng cùng một từ trong toàn bộ code (không lẫn `remove`/`delete`/`destroy` cho cùng thao tác).

## 3. Tách trách nhiệm

- **Logic thuần tách khỏi side effect & UI.** Tính toán, map, validate, format → hàm thuần (dễ test). Component/controller chỉ nối dữ liệu với hiển thị/IO.
- UI: component trình bày nhận props, không tự gọi API; data fetching nằm ở hook. Hook không trả về JSX.
- Backend: controller/handler mỏng (nhận, validate, gọi service, trả); business logic ở service; truy cập DB ở repository/ORM layer.
- Dữ liệu biến đổi qua pipeline rõ ràng (`parse → validate → transform → persist`), mỗi bước một hàm.
- Ưu tiên bất biến: trả object mới thay vì mutate tham số.

## 4. Xử lý lỗi & trường hợp biên

- Xử lý lỗi ở **biên** (gọi API, IO, parse input), theo cơ chế chuẩn của repo — không tự chế hệ thông báo/log riêng.
- Không nuốt lỗi (`catch {}` rỗng). Không catch chỉ để log rồi ném lại nếu tầng trên đã log.
- Thông điệp cho user: thân thiện, qua i18n, không lộ chi tiết kỹ thuật.
- Validate input từ ngoài (user, API, URL param) một lần ở cửa vào, bên trong tin type.
- UI luôn có đủ trạng thái: loading, rỗng, lỗi, thành công.

## 5. Type & contract

- Type rõ ràng ở ranh giới (props, tham số public, response API). Không `any`; chưa biết → `unknown` rồi thu hẹp.
- Union/enum cho tập giá trị hữu hạn thay vì `string` tự do.
- Type dùng ≥ 2 nơi đặt ở chỗ dùng chung theo chuẩn repo; dùng 1 nơi thì để cạnh code dùng nó.

## 6. Scalable mà không over-engineer

- Scalable = **dễ thêm trường hợp mới bằng cách thêm, không phải sửa**: dùng map/config/registry cho danh sách biến thể (status, loại, tab, permission) thay cho chuỗi `if/else`.
- Tôn trọng ranh giới module: feature/module chỉ dùng nhau qua public API (export index, interface); không import ruột.
- Không hardcode thứ sẽ đổi theo môi trường (URL, key, giới hạn) → config/env.
- Danh sách có thể lớn → phân trang / virtual list / giới hạn query ngay từ đầu.
- **Không** tạo abstraction, generic, factory, base class "cho sau này" khi mới có 1–2 chỗ dùng (rule of three). Ba chỗ giống nhau thật sự → mới gom.
- Không thêm tham số/option chưa ai dùng.

## 7. Comment & tài liệu

- Code tự giải thích bằng tên; comment chỉ để nói **vì sao** (ràng buộc BE, quirk trình duyệt, quyết định UX/nghiệp vụ). Ngôn ngữ comment theo chuẩn repo.
- Không comment diễn giải từng dòng, không để code comment-out, không TODO không có ngữ cảnh (TODO phải có lý do/ticket).
- Hàm public phức tạp hoặc có hành vi bất ngờ → doc comment ngắn (1–3 dòng).

## 8. Hiệu năng hợp lý

- Không tối ưu sớm, nhưng tránh lỗi hiển nhiên: gọi API trong vòng lặp (N+1), tạo lại object/hàm nặng mỗi render khi truyền cho child memo, query không giới hạn.
- Memo (`useMemo`/`useCallback`/cache) chỉ khi có lý do đo được hoặc là dependency của effect/child memo.
- Lazy load route/màn hình nặng nếu repo đang làm vậy.
