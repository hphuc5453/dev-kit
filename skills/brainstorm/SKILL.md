---
name: brainstorm
description: Bàn và chốt CÁCH LÀM trước khi code — tìm hiểu user thật sự muốn gì và vì sao, đọc codebase, hỏi từng câu một, đưa 2–3 phương án kèm đánh đổi và khuyến nghị, rồi viết design doc vào docs/specs/ và chờ duyệt. Không code trong skill này. Dùng khi user nói "brainstorm", "bàn phương án", "nên làm thế nào", "thiết kế tính năng", "có ý tưởng muốn làm", khi spec-check đã chốt nhưng còn phải chọn cách làm, hoặc khi yêu cầu mới còn mơ hồ. Bước tiếp là dev-kit:write-plan.
argument-hint: "<ý tưởng / yêu cầu / file spec-check (tuỳ chọn)>"
---

# dev-kit:brainstorm

Claude rất giỏi build, nhưng hay build theo những gì *tưởng* user muốn. Skill này để tìm ra user thật sự muốn gì, vì sao, và chốt cách làm **trước khi** code. Hiểu được "vì sao" thì hàng trăm quyết định nhỏ user không nói ra sẽ được làm đúng ý.

Output: design doc `docs/specs/YYYY-MM-DD-<slug>-design.md` đã được user duyệt. Bước tiếp: `dev-kit:write-plan`.

## 0. Có cần brainstorm không?
- **Mọi thứ quan trọng đã nằm trong yêu cầu** (vd "đổi màu nút sang xanh") → không brainstorm: làm luôn rồi nói đã làm gì.
- **Thiếu điều gì đáng kể** → bắt đầu cuộc trò chuyện theo các mục dưới.
- User nói "khỏi hỏi, làm luôn" → nêu các lựa chọn lớn tự quyết (nền tảng, thư viện, chỗ đặt code) mỗi cái một dòng, rồi làm. Skill kết thúc.

## 1. Đọc trước khi hỏi
- Đọc mọi thứ user trỏ tới (spec, spec-check, ticket, file, đoạn chat trước) và code liên quan, đủ để giải thích được phần đó hiện chạy thế nào và thay đổi sẽ đụng tới đâu.
- Đọc CLAUDE.md, `docs/code-standards.md`, `docs/tech-debt.md` nếu có.
- **Có file spec-check** → đó là nguồn đúng cho yêu cầu. Không hỏi lại phần đã chốt; chỉ bàn cách làm.
- Không hỏi điều project hoặc context đã trả lời. Không mở lại điều user đã quyết.

## 2. Tin nhắn đầu tiên
- **User đã nói rõ muốn gì** (spec, yêu cầu chi tiết): khoảng 200 chữ. Nhắc lại yêu cầu bằng lời của mình (muốn gì, cho ai, vì sao) để user thấy mình hiểu đúng chưa. Thêm điều tìm được trong code ảnh hưởng tới yêu cầu: ràng buộc, xung đột, đường rẻ hơn. Kết bằng một dòng mời sửa, rồi:
  - chưa biết "vì sao" → hỏi đúng một câu mở về lý do, không kèm lựa chọn;
  - đã biết vì sao, còn một điểm mở làm thay đổi thứ được build → hỏi điểm quan trọng nhất; nếu nêu được các lựa chọn thì phác từng cái kèm đánh đổi và cái mình chọn;
  - không còn gì mở, chỉ có một cách hợp lý → kết bằng design ngắn (cách làm, một dòng vì sao các cách khác không hợp, design trong vài dòng) và xin duyệt. Duyệt = duyệt cả cách làm lẫn design → ghi design doc ngắn rồi sang plan.
- **User chưa nói rõ:** một câu hỏi mở về điều lớn nhất còn chưa rõ, kèm lý do hỏi (câu trả lời sẽ đổi điều gì).
- User không gọi skill này trực tiếp (Claude tự kích hoạt) → thêm một dòng cuối: "Hoặc nếu bạn muốn mình làm luôn thì nói nhé."

## 3. Cuộc trò chuyện
- Chỉ hỏi khi câu trả lời làm thay đổi thứ được build **và** yêu cầu lẫn project đều không trả lời được. Còn lại: nêu quyết định của mình kèm lý do như một đề xuất user có thể sửa, rồi đi tiếp.
- Việc quy trình (ghi file ở đâu, đọc thêm gì, trình bày thế nào) là việc của mình: tự làm, nói ngắn.
- **Mỗi lần một câu.** Ngôn ngữ đơn giản, dùng từ của user, không dùng thuật ngữ quy trình, không trích skill này ra.
- **Để user tự mô tả** cho tới khi biết "vì sao": hỏi câu mở, không kèm ví dụ trả lời. Biết vì sao rồi, quyết định nào có lựa chọn rõ ràng thì phác từng lựa chọn kèm đánh đổi và cái mình chọn. User nói "tuỳ bạn" → đề xuất cụ thể.
- **Câu hỏi phải cụ thể** cho project này, dựa trên câu trả lời trước hoặc điều vừa tìm được, giúp user nghĩ tới hệ quả hoặc trường hợp có thể bỏ sót (vd "Mã giảm giá hết hạn giữa lúc user đang thanh toán thì đơn đó có được giảm không?").
- **Chọn cách làm (công nghệ, thư viện, chỗ đặt code):** user hỏi về cách làm → đưa lựa chọn kèm khuyến nghị; user chỉ nói về kết quả → tự quyết, mỗi quyết định một dòng. Có code sẵn → xây trên những gì project đang dùng.
- **Vùng cần phủ** (không đọc ra thành danh sách câu hỏi): đây là gì và điểm đặc biệt; vì sao làm bây giờ, thành công trông thế nào; mục tiêu, không làm, và điều gì khiến nó thất bại dù chạy đúng; tham khảo đã thấy ở đâu; hiện trạng và đã thử gì; chi tiết user quan tâm.
- **Đi tìm hiểu** khi cần: đọc sâu hơn trong codebase, dữ liệu, hoặc web. Nói đã tìm gì, thấy gì.
- **Cho xem thay vì kể:** thứ user sẽ nhìn thấy (màn hình, layout, luồng, sơ đồ) → phác bằng ASCII trong chat. Cần xem thật trên trình duyệt → đề xuất dựng một trang HTML tạm; user đồng ý mới làm.
- **Spike** (bản thử nhanh, bỏ đi sau) khi đó là cách rẻ nhất để biết thứ user muốn hoặc biết một hướng có chạy được không: đề xuất, user đồng ý mới làm. Spike không cần test, không qua plan. Mang điều học được quay lại cuộc trò chuyện; giữ lại code spike là một yêu cầu mới, phải qua lại quy trình này.

## 4. Nhắc lại từng phần
Hiểu xong một phần (nó để làm gì, phục vụ ai, một mảnh hoạt động thế nào) → mô tả lại phần đó trong khoảng 200–300 chữ, rồi quay lại hỏi phần tiếp. Nhắc lại và hỏi đan xen suốt cuộc trò chuyện.
- Chỉ điều user nói mới ghi là của user. Điều mình tự điền ghi là đề xuất, kèm lý do.
- Phần mô tả thứ user sẽ nhìn thấy → kèm phác thảo ASCII.
- Kết mỗi phần bằng câu hỏi: sai hoặc thiếu gì?

## 5. Đưa phương án (tin nhắn riêng)
Hiểu user muốn gì rồi, **trước khi viết doc**, gửi một tin nhắn riêng về cách build:
- Nghĩ ra vài phương án thật, bỏ phương án yếu, phương án đi ngược lý do user muốn, phương án code hiện có không cho phép.
- Phác 2–3 phương án còn lại đủ cụ thể để hình dung, dựa trên những gì project đang làm, kèm đánh đổi.
- Khuyến nghị một phương án và vì sao, rồi hỏi user chọn hướng nào (user đã giao cách làm → nói mình sẽ đi theo phương án đã chọn).
- Thật sự chỉ có một cách hợp lý → nói vậy và giải thích vì sao các cách khác không hợp; design gửi ở tin nhắn sau.

## 6. Định cỡ
User chọn xong phương án → nói cỡ việc bằng lời thường (user có thể đổi):

| Cỡ | Design doc |
|---|---|
| Thay đổi nhỏ | ngắn: những gì đã bàn, mỗi mục 1–2 dòng |
| Một dự án | đầy đủ (mục 7) |

Làm giữa chừng thấy to ra → dừng, nói rõ, nâng cỡ. Thực chất là nhiều dự án độc lập → nói vậy, thống nhất thứ tự, brainstorm từng cái.

## 7. Design doc
Viết sao cho một dev giỏi trong lĩnh vực đó lập plan được mà không cần hỏi lại user:
- mục đích và vì sao;
- mục tiêu, không làm, coi là thất bại nếu…;
- ràng buộc (version, dependency, nền tảng, chuẩn code của repo);
- **Phương án**: 2–3 cách đã cân nhắc, đánh đổi, cách được chọn và vì sao;
- thiết kế: phần user đã quyết, ghi đúng như user quyết; phần mình quyết, ghi rõ là đề xuất của mình;
- phần để lại cho người làm tự quyết;
- yêu cầu lấy từ spec-check (nếu có): chỉ dẫn link và ID, không chép lại.

Lưu vào `docs/specs/YYYY-MM-DD-<slug>-design.md` (repo có quy ước khác → theo repo). Tiếng Việt có dấu, giữ thuật ngữ kỹ thuật.

**Tự rà trước khi đưa** (dự án lớn): đọc lại doc như người sẽ build nó.
- Còn chỗ "TBD", "xử lý phù hợp", mâu thuẫn giữa các mục, phạm vi lẫn nhau → sửa luôn.
- Câu hỏi mà người build sẽ hỏi, chia ba nhóm: **đã có câu trả lời** trong cuộc trò chuyện/project → ghi vào doc; **nhỏ**, người build tự quyết được mà không đổi thứ được build → tự quyết, ghi là quyết định của mình; **của user**, chỉ user trả lời được và câu trả lời đổi thứ được build → gom vào **một** tin nhắn, quan trọng nhất trước.
- Cập nhật doc theo câu trả lời, rồi đưa link kèm danh sách ngắn các quyết định mình đã tự đưa ra để user soát khi đọc.

## Cổng cứng
**Không build gì cho tới khi user duyệt design doc** (ngắn hay đầy đủ). Build gồm: viết code sản phẩm, scaffold, cài dependency, tạo project, gọi skill triển khai. Đọc và tìm hiểu thì được.

Hai ngoại lệ: user đã bỏ qua phần hỏi (mục 0); spike user đã đồng ý.

Doc được duyệt → bước tiếp duy nhất là `dev-kit:write-plan <design doc>`. Thay đổi nhỏ đã có design ngắn được duyệt và user muốn làm luôn → làm luôn (test trước), xong chạy `dev-kit:recheck-spec` nếu có spec-check.

## Dấu hiệu đang làm sai
| Ý nghĩ | Thực tế |
|---|---|
| "Đưa một menu những thứ user có thể muốn" | Lựa chọn dẫn dắt user. Để user tự mô tả trước. |
| "Điền mặc định hợp lý là được" | Được, nhưng nói ra. Mặc định user không nghe thấy thì không thể bác. |
| "Trả lời xong câu hỏi rồi, viết doc thôi" | Đưa phương án trước, trong tin nhắn riêng. |
| "Giải thích quy trình trước đã" | Hỏi câu của mình. Quy trình tự hiện ra. |
| "User nói 'nghe ổn' với ý tưởng" | Duyệt chỉ cho những gì đã cho xem. Doc chưa viết thì chưa được duyệt. |
| "Spike chạy rồi, build tiếp trên nó" | Giữ spike là yêu cầu mới. Quay lại cổng. |
