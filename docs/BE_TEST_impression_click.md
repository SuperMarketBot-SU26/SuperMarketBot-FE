# 🧪 Test Script: Impression & Click Tracking

**Context:**
- Campaign ID: `17` (status `Active`, có gắn zone + sản phẩm)
- Zone ID: `2` (zone đang gắn cho campaign 17)
- Product ID: `5` (sản phẩm thuộc campaign 17)
- Member ID: `1` (hoặc bất kỳ member nào trong DB)
- BE base URL: `http://localhost:5000`
- FE base URL: `http://localhost:5173` (chỉ để BE config CORS)

**Yêu cầu trước khi test:**
- BE đã implement 2 endpoint:
  - `POST /api/v1/ad-campaigns/{id}/impression`
  - `POST /api/v1/ad-campaigns/{id}/click`
- Campaign 17 đang `Active`, có gắn zone 2, có sản phẩm 5.
- DB đã có member id = 1.

---

## 1. Test Impression (User xem banner)

### 1.1. Impression thường (member xem banner)

```bash
curl -X POST http://localhost:5000/api/v1/ad-campaigns/17/impression \
  -H "Content-Type: application/json" \
  -d '{
    "memberId": 1,
    "zoneId": 2,
    "productId": 5
  }'
```

**Expected response:** `200 OK` hoặc `204 No Content`

---

### 1.2. Impression không có productId (campaign không có sản phẩm cụ thể)

```bash
curl -X POST http://localhost:5000/api/v1/ad-campaigns/17/impression \
  -H "Content-Type: application/json" \
  -d '{
    "memberId": 1,
    "zoneId": 2
  }'
```

**Expected:** `200 OK`

---

### 1.3. Impression member chưa đăng nhập (guest)

```bash
curl -X POST http://localhost:5000/api/v1/ad-campaigns/17/impression \
  -H "Content-Type: application/json" \
  -d '{
    "memberId": null,
    "zoneId": 2,
    "productId": 5
  }'
```

**Expected:** `200 OK` (memberId = null vẫn ghi log được)

---

### 1.4. Impression không gửi body (anonymous)

```bash
curl -X POST http://localhost:5000/api/v1/ad-campaigns/17/impression \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected:** `200 OK` (tất cả field = null, vẫn ghi log)

---

## 2. Test Click (User click vào banner)

### 2.1. Click thường (member click banner → trừ phí CPC nếu có)

```bash
curl -X POST http://localhost:5000/api/v1/ad-campaigns/17/click \
  -H "Content-Type: application/json" \
  -d '{
    "memberId": 1,
    "zoneId": 2,
    "productId": 5
  }'
```

**Expected:** `200 OK` (hoặc `201 Created`)

---

### 2.2. Click không có productId

```bash
curl -X POST http://localhost:5000/api/v1/ad-campaigns/17/click \
  -H "Content-Type: application/json" \
  -d '{
    "memberId": 1,
    "zoneId": 2
  }'
```

**Expected:** `200 OK`

---

### 2.3. Click guest (không có memberId)

```bash
curl -X POST http://localhost:5000/api/v1/ad-campaigns/17/click \
  -H "Content-Type: application/json" \
  -d '{
    "memberId": null,
    "zoneId": 2,
    "productId": 5
  }'
```

**Expected:** `200 OK`

---

## 3. Verify logs đã được ghi

### 3.1. Lấy toàn bộ logs của campaign 17, sort theo thời gian mới nhất

```bash
curl -s "http://localhost:5000/api/v1/ad-campaigns/17/logs?pageNumber=1&pageSize=20" \
  | jq '.items[] | {id, action, amount, robotId, zoneId, productId, memberId, performedBy, createdAt}'
```

**Expected:** Phải thấy các log mới với:

| Field | Value |
|---|---|
| `action` | `"Impression"` hoặc `"Click"` |
| `zoneId` | `2` (không null) |
| `productId` | `5` (không null nếu có) |
| `memberId` | `1` (không null) |
| `robotId` | `null` (OK, vì đây là human event) |
| `performedBy` | `null` (OK, vì member là end-user, không phải admin) |
| `amount` | `0` (impression) hoặc `> 0` (click nếu có CPC) |

---

### 3.2. Filter chỉ lấy logs do user tương tác (không phải admin)

```bash
curl -s "http://localhost:5000/api/v1/ad-campaigns/17/logs?pageNumber=1&pageSize=50" \
  | jq '.items[] | select(.action == "Impression" or .action == "Click") | {id, action, memberId, productId, zoneId, createdAt}'
```

**Expected:** Chỉ thấy các log `Impression` / `Click` với `memberId` và `productId` không null.

---

## 4. Test edge cases (validation)

### 4.1. Campaign không tồn tại

```bash
curl -X POST http://localhost:5000/api/v1/ad-campaigns/99999/impression \
  -H "Content-Type: application/json" \
  -d '{
    "memberId": 1,
    "zoneId": 2
  }'
```

**Expected:** `404 Not Found`

---

### 4.2. Campaign chưa Active (status = Inactive)

```bash
# Giả sử campaign 18 đang Inactive
curl -X POST http://localhost:5000/api/v1/ad-campaigns/18/impression \
  -H "Content-Type: application/json" \
  -d '{
    "memberId": 1,
    "zoneId": 2
  }'
```

**Expected:** `400 Bad Request` với message `"Campaign is not active"`

---

### 4.3. Zone không thuộc campaign

```bash
curl -X POST http://localhost:5000/api/v1/ad-campaigns/17/impression \
  -H "Content-Type: application/json" \
  -d '{
    "memberId": 1,
    "zoneId": 999
  }'
```

**Expected:** `400 Bad Request` với message `"Zone is not assigned to this campaign"`

---

### 4.4. Product không thuộc campaign

```bash
curl -X POST http://localhost:5000/api/v1/ad-campaigns/17/click \
  -H "Content-Type: application/json" \
  -d '{
    "memberId": 1,
    "zoneId": 2,
    "productId": 99999
  }'
```

**Expected:** `400 Bad Request`

---

### 4.5. Member không tồn tại

```bash
curl -X POST http://localhost:5000/api/v1/ad-campaigns/17/impression \
  -H "Content-Type: application/json" \
  -d '{
    "memberId": 99999,
    "zoneId": 2,
    "productId": 5
  }'
```

**Expected:** `400 Bad Request` với message `"Member not found"`

---

## 5. Test race condition (spam click)

### 5.1. Click 10 lần liên tiếp trong 1 giây (test rate limiting)

**PowerShell (Windows):**

```powershell
1..10 | ForEach-Object -Parallel {
    curl -X POST http://localhost:5000/api/v1/ad-campaigns/17/click `
      -H "Content-Type: application/json" `
      -d '{"memberId": 1, "zoneId": 2, "productId": 5}'
} -ThrottleLimit 10
```

**Bash (Git Bash / WSL):**

```bash
for i in {1..10}; do
  curl -X POST http://localhost:5000/api/v1/ad-campaigns/17/click \
    -H "Content-Type: application/json" \
    -d '{
      "memberId": 1,
      "zoneId": 2,
      "productId": 5
    }' &
done
wait
```

**Expected:**
- Nếu có rate limit: `429 Too Many Requests` sau 5-10 requests
- Nếu không có rate limit: tất cả `200 OK` → BE cần bổ sung rate limiting

---

## 6. Cron job fallback (nếu không có robot thật)

### 6.1. Trigger cron manually (nếu BE có endpoint debug)

```bash
curl -X POST http://localhost:5000/api/v1/admin/cron/impression-sweep \
  -H "Authorization: Bearer <admin_token>"
```

**Expected:** `200 OK`, response chứa số log đã ghi

```json
{
  "sweptZones": 5,
  "impressionsLogged": 12,
  "campaignsAffected": 3
}
```

---

### 6.2. Verify cron đã ghi log Impression

```bash
curl -s "http://localhost:5000/api/v1/ad-campaigns/17/logs?pageNumber=1&pageSize=20" \
  | jq '.items[] | select(.action == "Impression") | {id, zoneId, memberId, createdAt}'
```

**Expected:** Thấy nhiều log `Impression` với `memberId = null` (vì cron không biết member nào).

---

## 7. Test với curl chi tiết (verbose)

```bash
curl -v -X POST http://localhost:5000/api/v1/ad-campaigns/17/impression \
  -H "Content-Type: application/json" \
  -d '{
    "memberId": 1,
    "zoneId": 2,
    "productId": 5
  }' 2>&1 | tee impression.log
```

**Expected output:**
```
> POST /api/v1/ad-campaigns/17/impression HTTP/1.1
> Host: localhost:5000
> Content-Type: application/json
>
< HTTP/1.1 200 OK
< Content-Type: application/json
<
{"success":true,"message":"Impression logged"}
```

---

## 8. Test CORS (nếu FE gọi từ browser)

```bash
curl -X OPTIONS http://localhost:5000/api/v1/ad-campaigns/17/impression \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v
```

**Expected:**
```
< HTTP/1.1 200 OK
< Access-Control-Allow-Origin: http://localhost:5173
< Access-Control-Allow-Methods: POST, OPTIONS
< Access-Control-Allow-Headers: Content-Type
```

---

## 🔍 Acceptance Criteria

| # | Test | Expected | Status |
|---|------|----------|--------|
| 1 | Impression có memberId | 200 OK, log có memberId | ⬜ |
| 2 | Impression không có memberId (guest) | 200 OK, log có memberId = null | ⬜ |
| 3 | Impression không có productId | 200 OK, log có productId = null | ⬜ |
| 4 | Click có memberId | 200 OK, log có memberId | ⬜ |
| 5 | Click có trừ phí CPC (nếu có) | amount > 0, wallet giảm | ⬜ |
| 6 | Logs response có zoneId, productId, memberId | Không null | ⬜ |
| 7 | Logs response có performedBy | null cho Impression/Click | ⬜ |
| 8 | Campaign không tồn tại | 404 | ⬜ |
| 9 | Campaign Inactive | 400 | ⬜ |
| 10 | Zone không thuộc campaign | 400 | ⬜ |
| 11 | Product không thuộc campaign | 400 | ⬜ |
| 12 | Member không tồn tại | 400 | ⬜ |
| 13 | Rate limiting (spam click) | 429 sau 10 req/s | ⬜ |
| 14 | Cron fallback (không có robot) | Logs được ghi tự động | ⬜ |
| 15 | CORS cho FE (localhost:5173) | Headers đầy đủ | ⬜ |

---

## 📋 Lưu ý quan trọng cho BE

1. **Logs phải có** `zoneId`, `productId`, `memberId` populate đúng (xem §7 trong `BE_PROMPT_endpoints.md`).
2. **`performedBy` = null** cho Impression/Click (vì đây là end-user/robot event, không phải admin action).
3. **`robotId` = null** cho Impression/Click (chỉ `RoutePass` mới có robotId).
4. **CORS**: FE chạy ở `http://localhost:5173` (Vite dev), cần allow origin này.
5. **Rate limiting**: nên có để chống spam (5-10 req/s per member).
6. **Cron fallback**: nếu không có robot thật, viết cron quét zone có traffic mỗi 5 phút → ghi log Impression giả lập.
7. **Transaction**: nếu click trừ phí CPC, đảm bảo atomic (insert log + trừ wallet cùng commit/rollback).

---

## 🔗 Liên kết

- Xem context đầy đủ: `docs/BE_PROMPT_endpoints.md` (section §7, §8)
- Endpoint liên quan: `GET /api/v1/ad-campaigns/{id}/logs` (xem response shape trong §7)
