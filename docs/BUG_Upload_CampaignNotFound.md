# BE Bug Report: Upload Ad Resource → `Error_CampaignNotFound`

## Mô tả
`POST /api/v1/ad-resources/upload` luôn trả `404 Error_CampaignNotFound` dù campaign ID hợp lệ và tồn tại.

## Bằng chứng

**Campaign 17 tồn tại** — GET `/api/v1/ad-campaigns/17` trả:
```json
{
  "adCampaignId": 17,
  "campaignName": "Test Campaign QA 09-08 EDITED",
  "packageId": 1,
  "brandId": 3,
  "brandName": "Vinamilk",
  "status": "Active",
  ...
}
```

**Upload vẫn trả 404:**
```bash
curl -X POST http://localhost:5000/api/v1/ad-resources/upload \
  -H "Authorization: Bearer <valid_admin_token>" \
  -F "campaignId=17" \
  -F "resourceType=Image" \
  -F "title=test" \
  -F "file=@test.png"
# → 404 {"error":"Error_CampaignNotFound","statusCode":404}
```

## Yêu cầu debug

1. **Kiểm tra `AdResourcesController.Upload` action**:
   - In ra `campaignId` nhận được trong request
   - In ra kết quả query tìm campaign trong DB (nếu có)
   - Kiểm tra có middleware/authorization nào reject request trước khi vào action không

2. **So sánh với GET `/api/v1/ad-campaigns/{id}`**:
   - Tại sao GET trả đúng dữ liệu campaign 17, nhưng Upload báo not found?
   - 2 endpoint có đang trỏ đến **cùng database/context** không?

3. **Kiểm tra authorization logic**:
   - Upload endpoint có check `User` claims không? (brandId, role, etc.)
   - Nếu token có `brandId=0` hoặc không có claim → có thể BE filter theo brand và trả not found thay vì forbidden

4. **In logs**: Thêm `Console.WriteLine` hoặc logger để track:
   ```
   UploadResource called - campaignId: 17
   User brandId from claims: ?
   Campaign lookup result: ?
   ```

5. **Fix và test lại** — đảm bảo:
   - `GET /api/v1/ad-campaigns/17` → 200 ✅
   - `POST /api/v1/ad-resources/upload` (campaignId=17, có file) → 200 + AdResourceDto ✅

---

## Bug 2: Upload file không accessible qua URL trả về (404)

### Mô tả
Upload thành công, file được lưu vào DB với `resourceUrl`, nhưng truy cập URL đó trả 404.

### Bằng chứng

Upload response:
```json
{
  "resourceId": 6,
  "resourceUrl": "/uploads/ad-resources/c25f0038-13f0-442f-a07b-3df32c363f80.bin",
  ...
}
```

Kiểm tra file:
```bash
# Proxy (FE dev server)
curl -I http://localhost:5173/uploads/ad-resources/c25f0038-13f0-442f-a07b-3df32c363f80.bin
# → 404 Not Found

# Direct BE
curl -I http://localhost:5000/uploads/ad-resources/c25f0038-13f0-442f-a07b-3df32c363f80.bin
# → 404 Not Found
```

### Yêu cầu fix

1. **Kiểm tra static file serving**:
   - ASP.NET Core cần configure `app.UseStaticFiles()` hoặc `app.MapStaticFiles()`
   - Nếu dùng `wwwroot`: Đảm bảo thư mục `wwwroot/uploads/ad-resources/` tồn tại và có quyền đọc
   - Hoặc nếu dùng custom middleware: Đảm bảo route `/uploads/**` được serve đúng

2. **Kiểm tra file lưu ở đâu**:
   - In ra đường dẫn vật lý khi save file
   - Xác nhận file có thực sự tồn tại tại đường dẫn đó

3. **Test sau khi fix**:
   ```bash
   # Upload thành công → lấy resourceUrl từ response
   # Truy cập file bằng URL
   curl -I http://localhost:5000/uploads/ad-resources/<uuid>.ext
   # → 200 OK ✅
   ```

---

## Bug 3: `resourceUrl` trả về relative path `storage/...` không serve được (mới)

### Mô tả
API `GET /api/v1/ad-resources/campaign/17` trả về `resourceUrl` là relative path
như `storage/smartmarketbot/ad-resources/...jpg`, khi truy cập trực tiếp qua BE trả 404.

### Bằng chứng
Response hiện tại:
```json
{
  "items": [
    {
      "resourceId": 11,
      "adCampaignId": 17,
      "resourceType": "Image",
      "resourceUrl": "storage/smartmarketbot/ad-resources/a921de8c-..._...jpg"
    }
  ],
  "totalCount": 2
}
```

Kiểm tra:
```bash
curl -I http://localhost:5000/storage/smartmarketbot/ad-resources/a921de8c-...jpg
# → 404 Not Found (Server: Kestrel)
```

→ File không tồn tại ở path Laravel public storage symbolic link trỏ tới (`storage/app/public/smartmarketbot/ad-resources/...`).

### Yêu cầu fix

1. **Chạy `php artisan storage:link`** trên server (nếu chưa có):
   ```bash
   cd /path/to/backend
   php artisan storage:link
   ```
   → Lệnh này tạo symlink `public/storage → storage/app/public`.

2. **Xác nhận file thực sự được lưu ở `storage/app/public/smartmarketbot/ad-resources/...`**:
   ```bash
   ls -la storage/app/public/smartmarketbot/ad-resources/
   ```
   → Phải thấy file `.jpg` đã upload.

3. **Verify serve được qua Laravel**:
   ```bash
   curl -I http://localhost:5000/storage/smartmarketbot/ad-resources/<file>.jpg
   # → 200 OK + Content-Type: image/jpeg ✅
   ```

4. **Sau khi fix, trên FE sẽ tự động hoạt động** vì đã config:
   - `MEDIA_BASE_URL = http://localhost:5000`
   - Vite proxy `/storage` → BE
   - `toMediaUrl` xử lý cả relative path lẫn absolute URL
