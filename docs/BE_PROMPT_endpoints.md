# Yêu cầu Backend (BE) — Bổ sung 2 endpoints bị thiếu/không đúng

## Tổng quan
Frontend (FE) Admin đã hoàn thiện UI cho 2 luồng nghiệp vụ, nhưng BE trả về lỗi HTTP. Cần BE kiểm tra và bổ sung/sửa 2 endpoint sau trong controller **AdCampaignsController** (route `/api/v1/ad-campaigns`):

---

## 1. `POST /api/v1/ad-campaigns/{id}/sponsored-products` → **405 Method Not Allowed**

### Request hiện tại FE đang gửi
```http
POST /api/v1/ad-campaigns/16/sponsored-products
Content-Type: application/json

{
  "productIds": [101, 102, 103]
}
```

### Response BE trả về
```
405 Method Not Allowed
```
Hoặc theo screenshot:
```
Failed to load resource: the server responded with a status of 405 (Method Not Allowed)
```

### Endpoint GET tương ứng đã có và hoạt động
```http
GET /api/v1/ad-campaigns/{id}/sponsored-products
→ 200 OK { adCampaignId, brandId, products: [{ productId, productName, sku, imageUrl, price }] }
```

### Yêu cầu
- **Bổ sung endpoint `POST`** với payload `{ productIds: number[] }`.
- Hành vi: **gắn (assign) các sản phẩm vào campaign**, **KHÔNG trừ tiền** (sản phẩm không tính phí; chỉ zone/route/shelf mới trừ tiền ví brand).
- Nếu campaign đã ở status `Active` → có thể vẫn cho phép gắn thêm (tùy business rule).
- Validate: tất cả `productIds` phải thuộc cùng `brandId` với campaign; nếu không → trả 400 với message rõ ràng (vd: `Sản phẩm #X không thuộc brand Y`).
- Response thành công 200 (hoặc 204):
  ```json
  {
    "adCampaignId": 16,
    "brandId": 3,
    "products": [
      { "productId": 101, "productName": "Tomato", "sku": "VEG-TOM", "imageUrl": "...", "price": 5000 }
    ]
  }
  ```
- Khi response trả về, hãy đảm bảo field `CampaignResponseDto.sponsoredProductCount` (của `GET /ad-campaigns/{id}`) được cập nhật đúng.

### Gợi ý C# (controller signature)
```csharp
[HttpPost("{id:int}/sponsored-products")]
public async Task<ActionResult<CampaignSponsoredProductsDto>> AssignSponsoredProducts(
    int id,
    [FromBody] AssignProductsRequest req,
    CancellationToken ct)
{
    // 1. Load campaign, kiểm tra tồn tại + status
    // 2. Validate all req.ProductIds thuộc cùng brand
    // 3. Insert/Update bảng CampaignSponsoredProducts
    // 4. Update Campaign.SponsoredProductCount
    // 5. Return CampaignSponsoredProductsDto
}

public class AssignProductsRequest {
    public List<int> ProductIds { get; set; } = new();
}
```

---

## 2. `GET /api/v1/ad-campaigns?searchTerm=...` → **400 Bad Request**

### Request hiện tại FE đang gửi
```http
GET /api/v1/ad-campaigns?searchTerm=Tomato
```
(từ ô search ở trang danh sách chiến dịch)

### Response BE trả về
```
400 Bad Request
```

### Yêu cầu
- **Hỗ trợ query param `searchTerm`** để tìm campaign theo `campaignName` (case-insensitive, contains).
- Nếu `searchTerm` rỗng hoặc null → bỏ qua filter, không trả 400.
- Nếu `searchTerm` quá ngắn (vd: 1 ký tự) → vẫn xử lý (không bắt buộc min length).
- Trả 200 với paginated response như cũ:
  ```json
  {
    "items": [ ... ],
    "pageNumber": 1,
    "pageSize": 20,
    "totalCount": 42,
    "totalPages": 3
  }
  ```

### Gợi ý DTO query
```csharp
public class AdCampaignListQuery {
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? Status { get; set; }
    public int? BrandId { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public string? SearchTerm { get; set; }   // ← đảm bảo nullable + bind được
}
```

---

## 3. (Bonus) Kiểm tra endpoint `POST /api/v1/ad-campaigns/{id}/zones`

FE đã gọi thành công và thấy response đúng (8 zones × 100.000 đ = 800.000 đ), nhưng cần xác nhận **transaction có commit và ví brand có thực sự bị trừ** không.

### Test case
1. Tạo campaign mới, status `Inactive`.
2. Gọi `POST /{id}/zones` với `{ zoneIds: [1, 2, 3, 4, 5, 6, 7, 8] }`.
3. Gọi `GET /v1/brands/{brandId}/wallet` → confirm `balance` đã giảm đúng `totalZoneCharge` (800.000 đ).
4. Gọi `GET /{id}/logs` → confirm có 1 log entry kiểu `AssignZone` (hoặc tên tương tự) với `amount = 800.000`.

Nếu bước 3 hoặc 4 fail → bug phía BE (có thể transaction chưa commit, hoặc endpoint zone/log chưa ghi nhật ký).

---

## 4. (Bonus) Logs endpoint đã có nhưng UI FE đang hiển thị `—` ở cả 3 cột (action / amount / description)

### Response mẫu FE đang nhận được (giả định)
```json
{
  "items": [
    {
      "id": 4,
      "campaignId": 16,
      "action": "Activate",
      "description": "...",
      "createdAt": "2026-08-08T17:00:00Z"
    }
  ]
}
```

### Yêu cầu
- Xác nhận các field `id`, `action`, `description`, `createdAt` có **đúng tên camelCase** trong response (không phải PascalCase như `Action`, `Description`, `CreatedAt`).
- Đảm bảo JSON serialization dùng camelCase (default ASP.NET Core đã OK, nhưng nếu team dùng `JsonSerializerOptions` tùy chỉnh → kiểm tra lại `PropertyNamingPolicy`).
- Nếu muốn hỗ trợ `performedBy` (tên user/admin thực hiện action) → bổ sung field này trong DTO + log entity.

---

## 5. Acceptance criteria

| # | Endpoint | Method | Status trước | Status sau fix |
|---|----------|--------|--------------|----------------|
| 1 | `/ad-campaigns/{id}/sponsored-products` | POST | 405 | 200 (hoặc 204) |
| 2 | `/ad-campaigns/{id}/sponsored-products` | GET | 404 | 200 |
| 3 | `/ad-campaigns?searchTerm=Tomato` | GET | 400 | 200 |
| 4 | `/brands/{id}/wallet` sau khi assign zone | GET | OK | Confirmed balance giảm |
| 5 | `/ad-campaigns/{id}/logs` | GET | OK | Fields camelCase, đầy đủ data |

Sau khi fix xong, ping lại để FE test lại các luồng:
1. Tab Sản phẩm → "Thêm sản phẩm" → multi-select → "Xác nhận" → sản phẩm xuất hiện trong danh sách.
2. Trang danh sách chiến dịch → search "Tomato" → kết quả filter đúng.
3. Tab Lịch sử → hiển thị action badge + timestamp + amount (nếu BE có).

---

## 6. Bug nghiêm trọng: VÍ BRAND KHÔNG TRỪ TIỀN khi assign zone

### Mô tả
- Campaign "sửa tươi" (id = 16)
- Status ban đầu: `Inactive`
- Thực hiện: Mua thêm 8 zones (giá 100.000 đ/zone) → tổng 800.000 đ
- Modal Phase hiển thị: "Đã gắn 8 khu vực. Phí phát sinh: 800.000 đ" → thành công phía UI
- Brand wallet **TRƯỚC**: 3.900.000 đ
- Brand wallet **SAU** (xem ở trang Brand dashboard): **vẫn 3.900.000 đ** (không trừ)

### Yêu cầu
- **Kiểm tra logic BE tại `POST /ad-campaigns/{id}/zones`**:
  1. Có thực sự **trừ brand wallet** không, hay chỉ **insert record** và tính tổng tiền?
  2. Có thuộc tính `priceZone` chính xác từ package không?
  3. Có dùng **transaction** (DB transaction) để đảm bảo atomic không (insert zones + trừ wallet + ghi log cùng commit hoặc rollback)?
  4. Có ghi **log entry** (CampaignLog) cho action `AssignZone` với `amount = totalZoneCharge` không?
- **Nếu chưa trừ tiền** → bổ sung logic trừ `BrandWallet.Balance -= totalZoneCharge` TRƯỚC khi insert zones.
- Nếu `Balance < totalZoneCharge` → trả 400 với message "Ví brand không đủ số dư" (không insert, không trừ).

### Test case đề xuất
```bash
# 1. Snapshot wallet
WALLET_BEFORE=$(curl -s http://localhost:5000/api/v1/brands/3/wallet | jq -r .balance)
# → 3.900.000

# 2. Assign 8 zones
curl -X POST http://localhost:5000/api/v1/ad-campaigns/16/zones \
  -H "Content-Type: application/json" \
  -d '{"zoneIds":[1,2,3,4,5,6,7,8]}'
# → 200 OK với totalZoneCharge = 800.000

# 3. Re-check wallet
WALLET_AFTER=$(curl -s http://localhost:5000/api/v1/brands/3/wallet | jq -r .balance)
# → expected: 3.100.000 (3.900.000 - 800.000)
# → bug: vẫn 3.900.000

# 4. Check logs
curl -s http://localhost:5000/api/v1/ad-campaigns/16/logs | jq '.items[] | select(.action | test("Zone|Targeting"))'
# → expected: 1 entry với amount = 800.000
```

### Gợi ý C# (logic trừ tiền)
```csharp
public async Task<CampaignZonesDto> AssignZonesAsync(int campaignId, List<int> zoneIds, CancellationToken ct)
{
    using var tx = await _db.Database.BeginTransactionAsync(ct);
    try
    {
        // 1. Load campaign + brand wallet
        var campaign = await _db.AdCampaigns.Include(c => c.Brand).FirstAsync(c => c.Id == campaignId, ct);
        var wallet = await _db.BrandWallets.FirstAsync(w => w.BrandId == campaign.BrandId, ct);

        var pkg = await _db.AdPackages.FirstAsync(p => p.Id == campaign.PackageId, ct);
        var pricePerZone = pkg.PriceZone;

        // 2. Calculate new zones (chỉ những zone CHƯA có)
        var existingZoneIds = await _db.CampaignZones.Where(cz => cz.CampaignId == campaignId).Select(cz => cz.ZoneId).ToListAsync(ct);
        var newZoneIds = zoneIds.Except(existingZoneIds).ToList();

        if (newZoneIds.Count == 0)
        {
            // không có zone mới, return early
            return MapToDto(campaign);
        }

        var totalCharge = newZoneIds.Count * pricePerZone;

        // 3. Validate balance
        if (wallet.Balance < totalCharge)
        {
            throw new InsufficientBalanceException($"Ví brand không đủ số dư. Cần {totalCharge}, hiện có {wallet.Balance}.");
        }

        // 4. Trừ tiền
        wallet.Balance -= totalCharge;
        wallet.UpdatedAt = DateTime.UtcNow;

        // 5. Insert zones
        foreach (var zoneId in newZoneIds)
        {
            _db.CampaignZones.Add(new CampaignZone
            {
                CampaignId = campaignId,
                ZoneId = zoneId,
                ZonePriceCharged = pricePerZone,
                PurchasedAt = DateTime.UtcNow,
            });
        }

        // 6. Ghi log
        _db.CampaignLogs.Add(new CampaignLog
        {
            CampaignId = campaignId,
            Action = "AssignZone",
            Description = $"Gắn {newZoneIds.Count} khu vực mới",
            Amount = totalCharge,
            CreatedAt = DateTime.UtcNow,
            PerformedBy = _currentUser.Name, // nếu có
        });

        await _db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        return MapToDto(campaign, newZoneIds, totalCharge);
    }
    catch
    {
        await tx.RollbackAsync(ct);
        throw;
    }
}
```

---

## 7. Bug phụ: log response field camelCase

Nếu response `GET /ad-campaigns/{id}/logs` trả về PascalCase (`Id`, `Action`, `Description`, `CreatedAt`) thay vì camelCase, FE sẽ hiển thị `—` ở tất cả các cột.

### Yêu cầu
- Đảm bảo `Program.cs` đã cấu hình `PropertyNamingPolicy = JsonNamingPolicy.CamelCase` (default ASP.NET Core 6+).
- Nếu có dùng `[JsonPropertyName]` attribute → camelCase.

### Test
```bash
curl -s http://localhost:5000/api/v1/ad-campaigns/16/logs | jq '.items[0]'
# → expected: { "id": ..., "action": "...", "description": "...", "createdAt": "..." }
# → bug: { "Id": ..., "Action": "...", ... }
```

---

## 8. Vấn đề chưa giải quyết (Sau lần fix trước — vẫn còn bug)

### Kết quả test FE (curl trực tiếp tới BE local `http://localhost:5000`)

#### ✅ Đã fix tốt
| # | Endpoint | Trước | Sau test | OK |
|---|----------|-------|----------|----|
| 1 | `GET /ad-campaigns/{id}/sponsored-products` | 404 | 200 + 3 products | ✅ |
| 2 | `POST /ad-campaigns/{id}/sponsored-products` | 405 | 200 echo | ✅ |
| 3 | `GET /ad-campaigns?searchTerm=Tomato` | 400 | 200 empty | ✅ |
| 4 | `GET /ad-campaigns/{id}/logs` camelCase | OK | OK + `amount` populated | ✅ |
| 5 | `GET /ad-campaigns/{id}` trả `zoneIds:[]` | OK | OK (`[1,2,3,4,7,8,9,10]`) | ✅ |

#### 🔴 VẪN LỖI: Ví brand KHÔNG bị trừ tiền khi Activate / AssignZone

Test data hiện tại (sau khi BE nói "đã fix"):
- Brand 2 (Unilever Vietnam) → wallet **3.900.000 đ**, active campaign count = 1
- Campaign 16 (active) → `totalSpent: 1.100.000 đ`, log #51 ghi `"action":"Activation","amount":1100000.00`
- Brand 3 (Vinamilk) → wallet **800.000 đ**, nhưng có **6 lần log Activation** mỗi lần `amount: 1.200.000 đ`
  - Nếu trừ thật: 800k - (6 × 1.2M) = -6.4M (âm!) → chắc chắn wallet không bị trừ
- Endpoint `GET /v1/brands/{id}/wallet` vẫn **404 Not Found**

### Root cause dự đoán
1. **`POST /ad-campaigns/{id}/activate`** có ghi log vào `CampaignLog` nhưng KHÔNG gọi `BrandWalletService.DeductAsync`.
2. Tương tự `POST /ad-campaigns/{id}/zones` có ghi log nhưng KHÔNG trừ ví cho phần zone charge.
3. Có thể 2 transaction độc lập: 1 transaction ghi log, transaction khác (cho wallet) bị miss/swallow.

### Yêu cầu fix

#### A. Bổ sung transaction cho Activate
```csharp
[HttpPost("{id:int}/activate")]
public async Task<ActionResult<CampaignResponseDto>> Activate(int id, CancellationToken ct)
{
    using var tx = await _db.Database.BeginTransactionAsync(ct);
    try
    {
        // 1. Load campaign + package + brand wallet
        var campaign = await _db.AdCampaigns
            .Include(c => c.Package)
            .FirstAsync(c => c.Id == id, ct);
        var wallet = await _db.BrandWallets
            .FirstOrDefaultAsync(w => w.BrandId == campaign.BrandId, ct);
        
        if (wallet == null)
            throw new InvalidOperationException($"Brand #{campaign.BrandId} chưa có ví.");
        
        // 2. Tính tổng phí
        var pricePackage = campaign.Package.PricePackage;
        var routeIds = await _db.CampaignRoutes.Where(r => r.CampaignId == id).Select(r => r.RouteId).ToListAsync(ct);
        var zoneIds = await _db.CampaignZones.Where(z => z.CampaignId == id).Select(z => z.ZoneId).ToListAsync(ct);
        var shelfIds = await _db.CampaignShelves.Where(s => s.CampaignId == id).Select(s => s.ShelfId).ToListAsync(ct);
        var priceRoute = campaign.Package.PriceRoute;
        var priceZone = campaign.Package.PriceZone;
        var priceShelf = campaign.Package.PriceShelf;
        var totalCharge = pricePackage
            + routeIds.Count * priceRoute
            + zoneIds.Count * priceZone
            + shelfIds.Count * priceShelf;
        
        // 3. Validate balance
        if (wallet.Balance < totalCharge)
            throw new InsufficientBalanceException(
                $"Ví brand không đủ. Cần {totalCharge:N0}, hiện có {wallet.Balance:N0}.");
        
        // 4. TRỪ TIỀN (bắt buộc)
        wallet.Balance -= totalCharge;
        wallet.UpdatedAt = DateTime.UtcNow;
        
        // 5. Update campaign status
        campaign.Status = "Active";
        campaign.StartDate = DateTime.UtcNow;
        
        // 6. Ghi log (gộp activation)
        _db.CampaignLogs.Add(new CampaignLog
        {
            CampaignId = id,
            Action = "Activation",
            Description = $"Kích hoạt chiến dịch. Phí: {totalCharge:N0} đ",
            Amount = totalCharge,
            CreatedAt = DateTime.UtcNow,
        });
        
        await _db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        
        return Ok(MapToDto(campaign));
    }
    catch
    {
        await tx.RollbackAsync(ct);
        throw;
    }
}
```

#### B. Tương tự cho AssignZones (`POST /{id}/zones`)
Đã có logic trong prompt cũ — chỉ cần đảm bảo `BrandWalletService.DeductAsync` được gọi **trong cùng transaction** với insert CampaignZones + insert CampaignLog.

#### C. Bổ sung endpoint `GET /v1/brands/{id}/wallet`
```csharp
[HttpGet("/v1/brands/{id:int}/wallet")]
public async Task<ActionResult<BrandWalletDto>> GetWallet(int id, CancellationToken ct)
{
    var wallet = await _db.BrandWallets.FirstOrDefaultAsync(w => w.BrandId == id, ct);
    if (wallet == null) return NotFound();
    return Ok(new BrandWalletDto {
        BrandId = wallet.BrandId,
        Balance = wallet.Balance,
        Currency = "VND",
    });
}
```

### Acceptance test (sau khi fix)
```bash
# Test A: snapshot wallet trước/sau activate
WALLET_BEFORE=$(curl -s http://localhost:5000/api/v1/brands/2/wallet | jq -r .balance)
# expect: 3.900.000

# Create campaign mới (InActive) với 1 zone
NEW_CAMPAIGN=$(curl -s -X POST http://localhost:5000/api/v1/ad-campaigns \
  -H "Content-Type: application/json" \
  -d '{"campaignName":"Test trừ ví","brandId":2,"packageId":1,"startDate":"2026-08-09T00:00:00Z","endDate":"2026-09-09T00:00:00Z"}' \
  | jq -r '.adCampaignId // .id')

# Assign 1 zone
curl -s -X POST "http://localhost:5000/api/v1/ad-campaigns/$NEW_CAMPAIGN/zones" \
  -H "Content-Type: application/json" \
  -d '{"zoneIds":[1]}' > /dev/null

# Activate
curl -s -X POST "http://localhost:5000/api/v1/ad-campaigns/$NEW_CAMPAIGN/activate" \
  -H "Content-Type: application/json" \
  -d '{"confirm":true}'

# Snapshot sau
WALLET_AFTER=$(curl -s http://localhost:5000/api/v1/brands/2/wallet | jq -r .balance)
# expect: WALLET_BEFORE - (300.000 gói cơ bản + 1 × 100.000 zone) = WALLET_BEFORE - 400.000
```

Nếu cả 2 endpoint (`activate` + `assignZones`) trừ tiền đúng → ping lại FE để test lại toàn bộ luồng.

### Kết quả test FE mới nhất (qua admin2@smartmarket.local + curl)
- Login ✅ (Role: Admin, userId: 18)
- Tab Lịch sử ✅: 9 entries với badge + amount + timestamp đầy đủ
- Tab Sản phẩm ✅: 3 sản phẩm load đúng với image + price
- Tab Tổng quan ✅: Hiển thị đủ thông tin + TotalSpent 1.100.000 đ

### Tiếp tục test qua curl + browser console (token admin2)

#### ✅ XÁC NHẬN: Ví CÓ trừ khi Pause+Add zone mới
```
Token:  Bearer <admin2>
GET  /ad-campaigns/16                     → status=Active,   zoneIds=[1..10], totalSpent=1.100.000, wallet=3.900.000
POST /ad-campaigns/16/pause               → 200 (status→Paused)
POST /ad-campaigns/16/zones {zoneIds:[1..10]} → 200 (add 5,6)
GET  /ad-campaigns/16                     → status=Paused,   zoneIds=[1..10], totalSpent=1.300.000
GET  /brands                              → wallet=3.700.000 (-200k = 2×100k) ✅ TRỪ VÍ OK
POST /ad-campaigns/16/activate            → 200 amountCharged=0 (đã trừ rồi nên free) ✅
```

#### 🔴 BUG #A (user nói): "Add 7 zones xong không trừ tiền"
**Đã test**: Pause → Add 2 zones (5,6) → ví **CÓ trừ 200k**. Log tự động ghi amount=200k.
→ Nếu user test mà không thấy trừ ⇒ có thể do:
- (a) User đã add zone ở lần **Active** (không qua Pause) → 400 từ BE → nhưng FE đang gọi đúng → cần check button state
- (b) User **không nhấn "Activate"** lại → chỉ Pause → Add → ??? → cần flow: Pause → Add → **Activate** (re-activate không trừ thêm vì đã trừ ở Add)

→ **Khả năng cao**: User test không thấy trừ vì add zone **ở status Active** → 400 silent (FE không báo lỗi rõ) → không có gì xảy ra. **Yêu cầu FE**: Hiển thị toast error khi POST 400.

#### 🔴 BUG #B (user nói): "Chọn lại zones không lưu được, mặc định 8 zones cũ"
**REPRODUCED 100%** trên campaign 16:
```
Ban đầu:   zoneIds=[1,2,3,4,5,6,7,8,9,10]   totalSpent=1.300.000  wallet=3.700.000
Send:      POST /zones {zoneIds:[2,3,5,6,8]}  (5 zone, bỏ 1,4,7,9,10)
Response:  200 OK {zoneCount:10, totalZoneCharge:1.000.000}
Sau:       zoneIds=[1,2,3,4,5,6,7,8,9,10]   totalSpent=1.300.000  wallet=3.700.000
                   ^^^^^^^^^^^^^^^^^^^^^^                ^^^^^^^^^^^  ^^^^^^^^^^^
                   UNCHANGED (không bỏ zone cũ)           UNCHANGED  UNCHANGED
```

**Phân tích**:
- `zoneIds` gửi lên `[2,3,5,6,8]` (5 zones) — nhưng BE trả `zoneCount:10` — → BE chỉ **INSERT** những zone MỚI (2,3,5,6,8 đã có) → **không làm gì**
- `totalZoneCharge: 1.000.000` ← đây là **tổng charge cũ** (10 zones × 100k), KHÔNG phải charge mới (5 × 100k = 500k)
- `totalSpent` không đổi → wallet không đổi

**Root cause**: Endpoint `POST /ad-campaigns/{id}/zones` đang treat payload là **ADDITIVE** (chỉ add zone mới, không un-assign zone cũ). User expect **REPLACE** semantic (un-assign các zone không có trong list).

#### 🔴 BUG #C (liên quan): BE trả 404 khi add zone không tồn tại
```
Send: {zoneIds:[2,3,4,5,6,7,8,9,10,11,12]}  (zone 11,12 không tồn tại trong DB)
Response: 404 Not Found, body={}
```
- Chỉ có 10 zones (id 1-10) trong DB → zone 11+ không seed
- BE trả 404 thay vì 400 + message "zone 11,12 invalid" → FE không biết lỗi gì

**Yêu cầu fix**:

#### A. Fix semantic `POST /ad-campaigns/{id}/zones` → REPLACE
```csharp
[HttpPost("{id:int}/zones")]
public async Task<ActionResult<CampaignZonesDto>> AssignZones(int id, [FromBody] AssignZonesRequest req, CancellationToken ct)
{
    using var tx = await _db.Database.BeginTransactionAsync(ct);
    try
    {
        var campaign = await _db.AdCampaigns
            .Include(c => c.Package)
            .FirstAsync(c => c.Id == id, ct);
        if (campaign.Status == "Active" && !req.ForceReplace)
            return BadRequest("Phải Pause campaign trước khi thay đổi zones. Dùng forceReplace=true nếu admin cần.");

        var wallet = await _db.BrandWallets.FirstAsync(w => w.BrandId == campaign.BrandId, ct);
        var priceZone = campaign.Package.PriceZone;

        // Validate tất cả zoneIds phải tồn tại
        var existingZoneIds = await _db.Zones
            .Where(z => req.ZoneIds.Contains(z.Id))
            .Select(z => z.Id)
            .ToListAsync(ct);
        var invalidZones = req.ZoneIds.Except(existingZoneIds).ToList();
        if (invalidZones.Any())
            return BadRequest($"Zone không tồn tại: {string.Join(", ", invalidZones)}");

        // Lấy zone hiện tại
        var currentZoneIds = await _db.CampaignZones
            .Where(cz => cz.CampaignId == id)
            .Select(cz => cz.ZoneId)
            .ToListAsync(ct);

        // 1. Tính diff
        var toAdd   = req.ZoneIds.Except(currentZoneIds).ToList();   // zone mới → trừ tiền
        var toRemove = currentZoneIds.Except(req.ZoneIds).ToList(); // zone cũ bị bỏ → refund

        var newCharge = toAdd.Count * priceZone;
        var refund    = toRemove.Count * priceZone;

        // 2. Validate balance (chỉ cần check charge mới)
        if (wallet.Balance < newCharge)
            return BadRequest($"Ví brand không đủ. Cần {newCharge:N0}, hiện có {wallet.Balance:N0}.");

        // 3. Trừ tiền (add) + refund (remove)
        wallet.Balance -= newCharge;
        wallet.Balance += refund;
        wallet.UpdatedAt = DateTime.UtcNow;

        // 4. Delete zone bị bỏ
        if (toRemove.Any())
        {
            var toRemoveEntities = await _db.CampaignZones
                .Where(cz => cz.CampaignId == id && toRemove.Contains(cz.ZoneId))
                .ToListAsync(ct);
            _db.CampaignZones.RemoveRange(toRemoveEntities);
        }

        // 5. Insert zone mới
        foreach (var zoneId in toAdd)
        {
            _db.CampaignZones.Add(new CampaignZone
            {
                CampaignId = id,
                ZoneId = zoneId,
                ZonePriceCharged = priceZone,
                PurchasedAt = DateTime.UtcNow,
            });
        }

        // 6. Update campaign.TotalSpent
        campaign.TotalSpent = (campaign.TotalSpent ?? 0) + newCharge - refund;

        // 7. Ghi log
        if (toAdd.Any())
            _db.CampaignLogs.Add(new CampaignLog { ..., Action = "AssignZone", Amount = newCharge, ... });
        if (toRemove.Any())
            _db.CampaignLogs.Add(new CampaignLog { ..., Action = "UnassignZone", Amount = -refund, ... });

        await _db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        return Ok(MapToDto(campaign));
    }
    catch
    {
        await tx.RollbackAsync(ct);
        throw;
    }
}
```

#### B. Validate zoneIds trước khi insert (tránh 404)
```csharp
if (invalidZones.Any())
    return BadRequest(new { error = $"Zone không tồn tại: {string.Join(", ", invalidZones)}" });
```

#### C. FE cần update
1. Khi POST `/zones` trả 400 → hiển thị toast error message cho user (không chỉ setstate error)
2. Khi user mở modal MultiSelectModal Zones:
   - Pre-select zone đã gán
   - Allow user **bỏ chọn** zone cũ (đã làm)
   - Submit gọi REPLACE endpoint (đã làm)
   - **Hiển thị breakdown**: "X zone sẽ thêm (+Y đ), Z zone sẽ bỏ (-W đ)"

#### D. Endpoint `GET /brands/{id}/wallet` (vẫn 404) — vẫn cần fix

### Acceptance test (sau khi fix A+B)
```bash
# Setup: campaign 16, paused, zoneIds=[1..10], totalSpent=1.300.000, wallet=3.700.000

# Test 1: User REPLACE với 5 zones khác
curl -X POST http://localhost:5000/api/v1/ad-campaigns/16/zones \
  -H "Content-Type: application/json" \
  -d '{"zoneIds":[2,3,5,6,8]}'
# expect: 200, zoneIds=[2,3,5,6,8], totalSpent=500.000, wallet=4.500.000 (refund 5×100k=500k)

# Test 2: User add zone không tồn tại
curl -X POST http://localhost:5000/api/v1/ad-campaigns/16/zones \
  -H "Content-Type: application/json" \
  -d '{"zoneIds":[2,3,5,6,8,11,12]}'
# expect: 400 "Zone không tồn tại: 11, 12"

# Test 3: User add 1 zone hợp lệ
curl -X POST http://localhost:5000/api/v1/ad-campaigns/16/zones \
  -H "Content-Type: application/json" \
  -d '{"zoneIds":[2,3,5,6,8,9]}'
# expect: 200, zoneIds=[2,3,5,6,8,9], totalSpent=600.000, wallet=4.400.000 (+100k)
```

---

## 9. Tóm tắt ưu tiên cập nhật

| Ưu tiên | Item | Lý do | Status |
|---------|------|-------|--------|
| 🔴 P0 | `POST /zones` không support REPLACE (un-assign) | User không thể bỏ zone đã gán | **BUG B** |
| 🔴 P0 | `POST /zones` trả 404 khi zone không tồn tại | FE không báo lỗi rõ → user confused | **BUG C** |
| 🟡 P1 | `POST /zones` không refund khi un-assign | Wallet không đúng khi bỏ zone | **BUG B phụ** |
| 🟡 P1 | `GET /brands/{id}/wallet` 404 | FE cần để hiển thị wallet | **VẪN LỖI** |
| 🟢 P2 | FE hiển thị 400 error khi POST fail | UX | **FE tự fix** |
| ✅ Done | Ví trừ khi Pause+Add zone mới | Logic add mới OK | OK |
| ✅ Done | POST /sponsored-products | 405 → 200 | OK |
| ✅ Done | GET /sponsored-products | 404 → 200 | OK |
| ✅ Done | searchTerm | 400 → 200 | OK |
| ✅ Done | Logs camelCase + amount | OK | OK |

Anh/chị BE confirm đã fix phần REPLACE + validate chưa để team FE test lại flow un-assign.

---

## 7. (Bug mới) `GET /api/v1/ad-campaigns/{id}/logs` trả về `null` cho toàn bộ các field context (robotId, zoneId, productId, memberId, performedBy)

### Mô tả
FE đã fix xong phần hiển thị action label / amount / description (xem §4), nhưng cột **Sản Phẩm** và **Ngữ Cảnh** vẫn là `—` cho **TẤT CẢ** log entries, vì BE đang populate `null` cho mọi field liên quan đến context.

### Response thực tế BE trả về (campaign id = 17, totalCount = 13)
```json
{
  "items": [
    { "id": 88, "action": "Resumed",    "amount": 0,       "description": "Resumed",                                "robotId": null, "zoneId": null, "productId": null, "memberId": null, "performedBy": null },
    { "id": 87, "action": "Paused",     "amount": 0,       "description": "Paused",                                 "robotId": null, "zoneId": null, "productId": null, "memberId": null, "performedBy": null },
    { "id": 85, "action": "AssignZone", "amount": -200000, "description": "Hoàn tiền bỏ khu vực: 200,000 đ",        "robotId": null, "zoneId": null, "productId": null, "memberId": null, "performedBy": null },
    { "id": 84, "action": "AssignZone", "amount": 100000,  "description": "Gắn/bổ sung khu vực. Phát sinh: 100,000 đ","robotId": null, "zoneId": null, "productId": null, "memberId": null, "performedBy": null },
    { "id": 75, "action": "Activation", "amount": 1100000, "description": "Kích hoạt chiến dịch. Phí: 1,100,000 đ",  "robotId": null, "zoneId": null, "productId": null, "memberId": null, "performedBy": null }
  ]
}
```

### Vấn đề (FE đã verify bằng curl, không phải lỗi FE)

| Field | Đáng lẽ phải có | BE đang trả |
|---|---|---|
| `zoneId` | Không null cho `AssignZone` / `UnassignZone` | `null` cho tất cả |
| `productId` | Không null cho log liên quan sản phẩm | `null` cho tất cả |
| `memberId` | Không null cho log click/impression (ai click) | `null` cho tất cả |
| `performedBy` | Tên user/admin thực hiện action (vd. `"admin@x.com"` hoặc userId) | `null` cho tất cả |
| `robotId` | Không null cho `RoutePass` event (robot nào đi qua) | `null` (chưa có event này) |

### Yêu cầu BE
1. **`performedBy` (ưu tiên cao nhất)**: khi admin gọi `POST /ad-campaigns/{id}/activate`, `POST .../pause`, `POST .../resume`, `POST .../zones`, `POST .../sponsored-products`, … → service phải lấy `User.Identity.Name` (hoặc `HttpContext.User.FindFirst("sub")?.Value`) rồi set vào `CampaignLog.PerformedBy` và `CampaignLog.PerformedByUserId` trước khi `_dbContext.SaveChanges()`.
2. **`zoneId`**: khi ghi log `AssignZone` / `UnassignZone`, set `CampaignLog.ZoneId = zone.Id` tương ứng.
3. **`productId`**: khi ghi log `AssignSponsoredProduct` / `UnassignSponsoredProduct` / `Click` / `Impression`, set `CampaignLog.ProductId = product.Id`.
4. **`memberId`**: khi ghi log `Click` / `Impression` / `RoutePass`, set `CampaignLog.MemberId = member.Id` (member nào tương tác).
5. **`robotId`**: khi robot đi ngang khu vực của campaign, BE event consumer nên ghi log `RoutePass` với `CampaignLog.RobotId = robot.Id`.

### Expected response sau fix
```json
{
  "id": 84,
  "action": "AssignZone",
  "amount": 100000,
  "description": "Gắn khu vực #2. Phát sinh: 100,000 đ",
  "performedBy": "admin2@supermarket.vn",
  "zoneId": 2,
  "productId": null,
  "robotId": null,
  "memberId": null,
  "createdAt": "2026-08-09T07:11:19.6154764"
}
```

### Tại sao FE không tự sửa được
- BE là nguồn duy nhất biết ai thực hiện action nào, zone nào bị gắn, sản phẩm nào bị click.
- FE chỉ render data BE trả; không có cách nào "đoán" hay "fake" `performedBy`/`zoneId` mà không làm sai lệch audit log.
- Nếu BE tiếp tục trả `null` thì cột Ngữ Cảnh và Sản Phẩm sẽ vĩnh viễn là `—`.

---

## 8. (Bug mới) Thiếu hoàn toàn các event log do robot / member tương tác

### Bối cảnh
Hiện tại 13 log entries của campaign #17 chỉ toàn là admin actions:
- `Activation` × 1
- `Paused` × 4
- `Resumed` × 4
- `AssignZone` × 4 (trong đó 1 là hoàn tiền)

→ **Không có** event nào do robot hay member sinh ra, vì 2 flow dưới đây chưa được BE wire-up:

### Flow 1 — Robot đi qua khu vực phát quảng cáo
```
[Robot vật lý] → đi vào Zone X
        ↓
[Robot firmware] gọi POST /api/v1/robot-events  (hoặc publish MQTT/SignalR)
        body: { robotId: 7, zoneId: 2, lat: ..., lng: ..., timestamp: "..." }
        ↓
[BE] check Zone 2 có campaign nào status = Active không
        ↓ có
[BE] insert CampaignLog:
   - action    = "RoutePass"
   - robotId   = 7
   - zoneId    = 2
   - campaignId = ...
   - productId = (random 1 sp thuộc campaign, optional)
   - amount    = 0
```

### Flow 2 — Member click / xem banner quảng cáo trên app
```
[Member] mở app, thấy banner campaign C ở khu vực K
        ↓
[FE] gọi POST /api/v1/ad-campaigns/{id}/impression
        body: { memberId: 123, zoneId: 2, productId: 5 }
        ↓
[BE] insert CampaignLog:
   - action    = "Impression"
   - memberId  = 123
   - zoneId    = 2
   - productId = 5
   - campaignId = ...
   - amount    = 0

[Member] click banner
        ↓
[FE] gọi POST /api/v1/ad-campaigns/{id}/click
        body: { memberId: 123, zoneId: 2, productId: 5 }
        ↓
[BE] insert CampaignLog:
   - action    = "Click"
   - memberId  = 123
   - zoneId    = 2
   - productId = 5
   - campaignId = ...
   - amount    = (nếu click trừ phí CPC thì amount > 0)
```

### Yêu cầu BE

| # | Endpoint mới | Method | Mục đích |
|---|---|---|---|
| 1 | `/api/v1/robot-events` | POST | Robot firmware push vị trí về. BE tự lookup campaign active trong zone và ghi log `RoutePass`. |
| 2 | `/api/v1/ad-campaigns/{id}/impression` | POST | FE tracking pixel. Ghi log `Impression` với memberId + zoneId + productId. |
| 3 | `/api/v1/ad-campaigns/{id}/click` | POST | FE tracking khi user click. Ghi log `Click` với memberId + zoneId + productId. |

Ngoài ra:
- Nếu không có hardware robot đang chạy, BE có thể tạm thời viết **1 cron job mỗi 5 phút** quét các zone có traffic (`SELECT zone_id FROM robot_locations WHERE last_seen > NOW() - 5min`) → tự ghi log `Impression` giả lập để FE có data hiển thị.
- Trong DTO response `GET /ad-campaigns/{id}/logs`, các field `robotId`, `zoneId`, `productId`, `memberId` PHẢI được populate cho các event tương ứng (xem §7).

### Phía FE đã sẵn sàng
- ✅ Bảng `CampaignLogsTab` đã có 4 cột: Thời gian / Action / Sản phẩm / Ngữ cảnh / Số tiền / Mô tả.
- ✅ Logic render fallback `—` cho field null đã viết.
- 🟡 Chỉ thiếu 2 dòng `fetch` trong component banner/ads khi user xem/click — sẽ wire ngay khi BE confirm endpoint trên.
