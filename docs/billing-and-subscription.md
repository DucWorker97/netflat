# Tổng hợp chức năng Thanh toán & Gói cước — Netflat

> Cập nhật: 2026-04-26

---

## Mục lục

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Cấu trúc Database](#2-cấu-trúc-database)
3. [Các gói cước](#3-các-gói-cước)
4. [API Backend](#4-api-backend)
5. [Luồng thanh toán](#5-luồng-thanh-toán)
6. [Theo dõi sử dụng (Usage Tracking)](#6-theo-dõi-sử-dụng-usage-tracking)
7. [Giao diện người dùng (Frontend)](#7-giao-diện-người-dùng-frontend)
8. [Hạn chế hiện tại](#8-hạn-chế-hiện-tại)

---

## 1. Tổng quan kiến trúc

```
apps/
├── api/
│   ├── src/
│   │   ├── payments/           # Module thanh toán
│   │   │   ├── payments.controller.ts
│   │   │   ├── payments.service.ts
│   │   │   ├── payments.module.ts
│   │   │   └── dto/
│   │   │       └── create-checkout.dto.ts
│   │   ├── subscriptions/      # Module gói cước
│   │   │   ├── subscriptions.controller.ts
│   │   │   ├── subscriptions.service.ts
│   │   │   ├── subscriptions.module.ts
│   │   │   └── dto/
│   │   │       └── upgrade-plan.dto.ts
│   │   └── usage/              # Module theo dõi sử dụng
│   │       └── usage.service.ts
│   └── prisma/
│       ├── schema.prisma       # Định nghĩa models DB
│       └── seed.ts             # Dữ liệu khởi tạo
└── web/
    └── src/
        ├── app/
        │   ├── pricing/
        │   │   ├── page.tsx            # Trang chọn gói cước
        │   │   └── pricing.module.css
        │   └── profile/billing/
        │       ├── page.tsx            # Trang lịch sử thanh toán
        │       └── billing.module.css
        └── lib/
            └── queries.ts      # React Query hooks cho billing/subscription
```

**Stack công nghệ:**
- Backend: NestJS + Prisma ORM + PostgreSQL
- Frontend: Next.js 14 (App Router) + React Query (TanStack Query)
- Thanh toán: Mock payment (chưa tích hợp cổng thật)
- Tiền tệ: VNĐ

---

## 2. Cấu trúc Database

### 2.1 Enums

```prisma
enum SubscriptionStatus {
  active     // Đang hoạt động
  canceled   // Đã hủy
  expired    // Đã hết hạn
}

enum PaymentStatus {
  pending    // Đang chờ xử lý
  completed  // Hoàn thành
  failed     // Thất bại
  refunded   // Đã hoàn tiền
}
```

### 2.2 Model `SubscriptionPlan` — Định nghĩa gói cước

```prisma
model SubscriptionPlan {
  id                   String   @id @default(uuid())
  name                 String   @unique          // "free" | "pro" | "premium"
  displayName          String                    // "Free" | "Pro" | "Premium"
  description          String?
  maxMoviesPerMonth    Int      @default(5)       // Giới hạn phim/tháng
  maxQualityResolution String   @default("480p") // "480p" | "1080p" | "4K"
  maxFavorites         Int      @default(10)      // Số phim yêu thích tối đa
  maxDevices           Int      @default(1)       // Số thiết bị đồng thời
  showAds              Boolean  @default(true)    // Có quảng cáo không
  monthlyPrice         Float    @default(0)       // Giá theo tháng (VNĐ)
  annualPrice          Float?                    // Giá theo năm (VNĐ), nullable
  isActive             Boolean  @default(true)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  subscriptions Subscription[]
}
```

### 2.3 Model `Subscription` — Gói cước của user

```prisma
model Subscription {
  id        String             @id @default(uuid())
  userId    String   @unique                      // 1 user chỉ có 1 subscription
  planId    String
  status    SubscriptionStatus @default(active)
  startDate DateTime           @default(now())
  endDate   DateTime                              // Ngày hết hạn
  autoRenew Boolean            @default(true)
  createdAt DateTime           @default(now())
  updatedAt DateTime           @updatedAt

  user     User             @relation(...)
  plan     SubscriptionPlan @relation(...)
  payments Payment[]
}
```

### 2.4 Model `Payment` — Lịch sử giao dịch

```prisma
model Payment {
  id             String        @id @default(uuid())
  userId         String
  subscriptionId String
  transactionId  String?       @unique             // ID giao dịch (mock_<paymentId>)
  paymentMethod  String        @default("mock")    // Phương thức thanh toán
  amount         Float                             // Số tiền (VNĐ)
  currency       String        @default("VND")
  status         PaymentStatus @default(pending)
  invoiceUrl     String?                           // URL hóa đơn (chưa dùng)
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  user         User         @relation(...)
  subscription Subscription @relation(...)
}
```

### 2.5 Model `MonthlyUsage` — Theo dõi sử dụng hàng tháng

```prisma
model MonthlyUsage {
  id            String   @id @default(uuid())
  userId        String
  year          Int
  month         Int                              // 1–12
  moviesWatched Int      @default(0)             // Số phim đã xem trong tháng
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([userId, year, month])
}
```

### 2.6 Quan hệ giữa các bảng

```
User (1) ──────── (1) Subscription ──── (N) Payment
                        │
                        └──── (N-1) SubscriptionPlan

User (1) ──────── (N) MonthlyUsage
User (1) ──────── (N) Payment
```

---

## 3. Các gói cước

Dữ liệu được seed vào database qua `apps/api/prisma/seed.ts`.

| Thuộc tính              | Free          | Pro              | Premium          |
|-------------------------|---------------|------------------|------------------|
| `name`                  | `free`        | `pro`            | `premium`        |
| `displayName`           | Free          | Pro              | Premium          |
| **Giá tháng**           | 0 VNĐ         | 139,000 VNĐ      | 299,000 VNĐ      |
| **Giá năm**             | 0 VNĐ         | 1,390,000 VNĐ    | 2,990,000 VNĐ    |
| `maxMoviesPerMonth`     | 5             | 9,999 (∞)        | 9,999 (∞)        |
| `maxQualityResolution`  | 480p          | 1080p            | 4K               |
| `maxFavorites`          | 10            | 100              | 200              |
| `maxDevices`            | 1             | 2                | 4                |
| `showAds`               | ✅ Có          | ❌ Không          | ❌ Không          |

> **Lưu ý:** Giá trị `9999` cho `maxMoviesPerMonth` được dùng để biểu thị "không giới hạn". Frontend kiểm tra `>= 9999` để hiển thị ký hiệu `∞`.

---

## 4. API Backend

### 4.1 Module Subscriptions — `/api/subscriptions`

| Method | Endpoint                  | Auth | Mô tả                                          |
|--------|---------------------------|------|------------------------------------------------|
| GET    | `/subscriptions/plans`    | ❌    | Lấy danh sách tất cả gói đang active           |
| GET    | `/subscriptions/me`       | ✅    | Lấy gói cước hiện tại + usage tháng của user   |
| POST   | `/subscriptions/upgrade`  | ✅    | Nâng cấp/thay đổi gói cước                     |

**`GET /subscriptions/plans`** — Response:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "free",
      "displayName": "Free",
      "monthlyPrice": 0,
      "annualPrice": 0,
      "maxMoviesPerMonth": 5,
      "maxQualityResolution": "480p",
      "maxFavorites": 10,
      "maxDevices": 1,
      "showAds": true,
      "isActive": true
    }
  ]
}
```

**`GET /subscriptions/me`** — Response:
```json
{
  "data": {
    "id": "uuid",
    "status": "active",
    "startDate": "2026-01-01T00:00:00Z",
    "endDate": "2027-01-01T00:00:00Z",
    "autoRenew": true,
    "plan": { "name": "pro", "displayName": "Pro", ... },
    "usage": {
      "year": 2026,
      "month": 4,
      "moviesWatched": 3
    }
  }
}
```

**`POST /subscriptions/upgrade`** — Request body:
```json
{
  "planName": "pro",        // "free" | "pro" | "premium"
  "billingCycle": "monthly" // "monthly" | "annual"
}
```

---

### 4.2 Module Payments — `/api/payments`

Tất cả endpoints đều yêu cầu JWT Auth.

| Method | Endpoint                  | Mô tả                                              |
|--------|---------------------------|----------------------------------------------------|
| POST   | `/payments/checkout`      | Tạo phiên thanh toán mới (status: pending)         |
| POST   | `/payments/mock-complete` | Hoàn tất thanh toán mock (pending → completed)     |
| POST   | `/payments/mock-webhook`  | Webhook giả lập: hoàn tất + nâng cấp gói           |
| GET    | `/payments/history`       | Lấy lịch sử giao dịch (phân trang)                 |

**`POST /payments/checkout`** — Request:
```json
{
  "planName": "pro",
  "billingCycle": "annual"
}
```
Response:
```json
{
  "data": {
    "paymentId": "uuid",
    "amount": 1390000,
    "currency": "VND",
    "status": "pending",
    "checkoutUrl": "/billing/mock-checkout?paymentId=uuid"
  }
}
```

**`POST /payments/mock-webhook`** — Request:
```json
{
  "paymentId": "uuid",
  "planName": "pro",
  "billingCycle": "annual"
}
```

**`GET /payments/history`** — Query params: `page`, `limit` (default: 1, 20)

Response:
```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

---

## 5. Luồng thanh toán

### 5.1 Luồng nâng cấp gói (có thanh toán)

```
User chọn gói Pro/Premium
        │
        ▼
POST /payments/checkout
  → Tạo Payment (status: pending)
  → Trả về paymentId
        │
        ▼
POST /payments/mock-webhook
  → completeMockPayment(): pending → completed
  → upgradePlan(): cập nhật Subscription
        │
        ▼
Subscription được cập nhật
  → planId = gói mới
  → startDate = now()
  → endDate = now() + 1 tháng/năm
  → status = active
```

### 5.2 Luồng chuyển về gói Free (không thanh toán)

```
User chọn gói Free
        │
        ▼
POST /subscriptions/upgrade
  → Trực tiếp cập nhật Subscription
  → Không tạo Payment record
```

### 5.3 Tính toán `endDate`

```typescript
// billingCycle = 'annual'  → endDate = baseDate + 1 năm
// billingCycle = 'monthly' → endDate = baseDate + 1 tháng
private computeEndDate(cycle: 'monthly' | 'annual', baseDate = new Date()) {
    const date = new Date(baseDate);
    if (cycle === 'annual') {
        date.setUTCFullYear(date.getUTCFullYear() + 1);
    } else {
        date.setUTCMonth(date.getUTCMonth() + 1);
    }
    return date;
}
```

### 5.4 Tính toán `amount`

```typescript
// Nếu annualPrice không có → fallback = monthlyPrice * 12
const amount = billingCycle === 'annual'
    ? (plan.annualPrice ?? plan.monthlyPrice * 12)
    : plan.monthlyPrice;
```

### 5.5 Tự động tạo subscription khi user mới

Khi user chưa có subscription (ví dụ: vừa đăng ký), hệ thống tự động tạo subscription với gói Free:

```typescript
// ensureUserSubscription() trong SubscriptionsService
// Được gọi trước khi tạo checkout
const subscription = await this.subscriptionsService.ensureUserSubscription(userId);
```

---

## 6. Theo dõi sử dụng (Usage Tracking)

### 6.1 Cơ chế

- Mỗi user có 1 record `MonthlyUsage` cho mỗi tháng
- Record được tạo tự động (upsert) khi cần
- `moviesWatched` tăng dần khi user xem phim

### 6.2 Các hàm chính trong `UsageService`

| Hàm | Mô tả |
|-----|-------|
| `getCurrentMonthUsage(userId)` | Lấy/tạo usage tháng hiện tại |
| `canWatchMovie(userId, maxMoviesPerMonth)` | Kiểm tra còn quota xem phim không |
| `incrementMoviesWatched(userId)` | Tăng số phim đã xem lên 1 |

### 6.3 Logic kiểm tra quota

```typescript
async canWatchMovie(userId: string, maxMoviesPerMonth: number): Promise<boolean> {
    if (maxMoviesPerMonth <= 0) return false;
    const usage = await this.getCurrentMonthUsage(userId);
    return usage.moviesWatched < maxMoviesPerMonth;
}
```

---

## 7. Giao diện người dùng (Frontend)

### 7.1 Trang Pricing — `/pricing`

**File:** `apps/web/src/app/pricing/page.tsx`

**Chức năng:**
- Hiển thị 3 gói cước dạng card (3 cột, responsive về 2 cột / 1 cột)
- Toggle chọn chu kỳ thanh toán: **Theo tháng** / **Theo năm**
- Highlight gói đang sử dụng (badge "Gói hiện tại" + border accent)
- Nút "Chọn gói" → thực hiện luồng checkout + webhook mock
- Nút "Đang sử dụng" (disabled) cho gói hiện tại
- Hiển thị thông báo thành công/lỗi inline
- Nếu chưa đăng nhập → hiển thị link "Đăng nhập để chọn gói"

**React Query hooks sử dụng:**
```typescript
useSubscriptionPlans()    // Lấy danh sách gói
useMySubscription()       // Lấy gói hiện tại của user
useCreateCheckout()       // Tạo checkout
useMockPaymentWebhook()   // Gọi webhook mock
useUpgradeSubscription()  // Nâng cấp trực tiếp (dùng cho gói Free)
```

**Luồng xử lý khi chọn gói:**
```typescript
// Gói Free → upgrade trực tiếp (không qua payment)
if (planName === 'free') {
    await upgradeSubscription.mutateAsync({ planName, billingCycle: 'monthly' });
    return;
}

// Gói Pro/Premium → tạo checkout → gọi webhook
const checkout = await createCheckout.mutateAsync({ planName, billingCycle });
await mockWebhook.mutateAsync({ paymentId: checkout.paymentId, planName, billingCycle });
```

---

### 7.2 Trang Billing — `/profile/billing`

**File:** `apps/web/src/app/profile/billing/page.tsx`

**Chức năng:**

**Phần 1 — Gói hiện tại:**
- Tên gói, trạng thái subscription
- Ngày hết hạn (gia hạn tới)
- Usage: Số phim đã xem / giới hạn tháng hiện tại
- Độ phân giải tối đa, số thiết bị đồng thời
- Nút "Nâng cấp gói" → link đến `/pricing`

**Phần 2 — Lịch sử thanh toán:**
- Bảng danh sách giao dịch (20 records/page)
- Các cột: Thời gian, Gói, Số tiền, Phương thức, Trạng thái
- Trạng thái được style theo màu (pending/completed/failed/refunded)
- Empty state khi chưa có giao dịch

**React Query hooks sử dụng:**
```typescript
useMySubscription()       // Lấy gói hiện tại
useBillingHistory(1, 20)  // Lấy lịch sử thanh toán
```

---

### 7.3 Navbar

**File:** `apps/web/src/components/navbar.tsx`

- Link "Thanh toán" trong menu profile → `/profile/billing`
- Chỉ hiển thị khi đã đăng nhập

---

### 7.4 Trang Profile — `/profile`

**File:** `apps/web/src/app/profile/page.tsx`

- Hiển thị card tóm tắt gói cước hiện tại
- Nút "Mở trang thanh toán" → link đến `/profile/billing`

---

## 8. Hạn chế hiện tại

| # | Hạn chế | Mô tả |
|---|---------|-------|
| 1 | **Mock payment only** | Chưa tích hợp cổng thanh toán thật (VNPay, MoMo, Stripe...) |
| 2 | **Không có downgrade logic** | Chuyển về gói thấp hơn không hoàn tiền, không tính pro-rata |
| 3 | **Không có refund** | Trường `invoiceUrl` và trạng thái `refunded` tồn tại trong DB nhưng chưa có logic xử lý |
| 4 | **Không có invoice** | Trường `invoiceUrl` trong Payment chưa được sử dụng |
| 5 | **Không có email notification** | Không gửi email xác nhận sau khi thanh toán thành công |
| 6 | **Không có auto-renewal** | Trường `autoRenew = true` nhưng không có cron job/scheduler xử lý |
| 7 | **Không có trial period** | Không có gói dùng thử cho Pro/Premium |
| 8 | **Không có promo/coupon** | Không có mã giảm giá |
| 9 | **Không có cancel subscription** | Không có API hủy gói, chỉ có downgrade về Free |
| 10 | **Không kiểm tra endDate** | Subscription hết hạn không tự động chuyển về Free |
| 11 | **mock-complete không bảo mật** | Endpoint `POST /payments/mock-complete` không kiểm tra ownership (ai cũng có thể complete payment của người khác nếu biết paymentId) |
| 12 | **Không có webhook signature** | Endpoint `mock-webhook` không xác thực nguồn gốc request |
