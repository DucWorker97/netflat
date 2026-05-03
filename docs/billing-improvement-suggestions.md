# Gợi ý hoàn thiện chức năng Thanh toán & Gói cước — Netflat

> Tài liệu này liệt kê các cải tiến được đề xuất, sắp xếp theo mức độ ưu tiên.
> Mỗi mục bao gồm: mô tả vấn đề, hướng giải quyết cụ thể, và vị trí code cần thay đổi.

---

## Mục lục

1. [Bảo mật — Ưu tiên cao](#1-bảo-mật--ưu-tiên-cao)
2. [Tích hợp cổng thanh toán thật](#2-tích-hợp-cổng-thanh-toán-thật)
3. [Email thông báo](#3-email-thông-báo)
4. [Auto-renewal & Scheduler](#4-auto-renewal--scheduler)
5. [Quản lý vòng đời subscription](#5-quản-lý-vòng-đời-subscription)
6. [Admin dashboard billing](#6-admin-dashboard-billing)
7. [Cải thiện UX Frontend](#7-cải-thiện-ux-frontend)
8. [Tóm tắt theo độ ưu tiên](#8-tóm-tắt-theo-độ-ưu-tiên)

---

## 1. Bảo mật — Ưu tiên cao

### 1.1 Endpoint `mock-complete` không kiểm tra ownership

**Vấn đề:**
`POST /payments/mock-complete` chỉ nhận `paymentId` và hoàn tất thanh toán mà không kiểm tra payment đó có thuộc về user đang gọi không. Bất kỳ user đã đăng nhập nào cũng có thể complete payment của người khác nếu biết `paymentId`.

**Hiện tại:**
```typescript
// payments.controller.ts
@Post('mock-complete')
async completeMockPayment(@Body() dto: { paymentId: string }) {
    const payment = await this.paymentsService.completeMockPayment(dto.paymentId);
    return { data: payment };
}
```

**Đề xuất sửa:**
```typescript
// payments.service.ts — thêm kiểm tra userId
async completeMockPayment(paymentId: string, requestingUserId: string) {
    const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
    });

    if (!payment) throw new NotFoundException({ code: 'PAYMENT_NOT_FOUND' });

    // Kiểm tra ownership
    if (payment.userId !== requestingUserId) {
        throw new ForbiddenException({ code: 'PAYMENT_ACCESS_DENIED' });
    }
    // ... phần còn lại giữ nguyên
}

// payments.controller.ts — truyền user vào
@Post('mock-complete')
async completeMockPayment(@CurrentUser() user: User, @Body() dto: { paymentId: string }) {
    const payment = await this.paymentsService.completeMockPayment(dto.paymentId, user.id);
    return { data: payment };
}
```

---

### 1.2 Endpoint `mock-webhook` không xác thực nguồn gốc

**Vấn đề:**
`POST /payments/mock-webhook` có thể bị gọi tùy ý để nâng cấp gói bất kỳ user nào mà không cần thanh toán thật.

**Đề xuất:**
- Ngắn hạn: Chỉ cho phép gọi từ internal (thêm guard kiểm tra IP nội bộ hoặc secret header).
- Dài hạn: Khi tích hợp cổng thật, xác thực webhook signature (HMAC) từ provider.

```typescript
// Thêm header secret cho mock webhook
@Post('mock-webhook')
async processMockWebhook(
    @Headers('x-webhook-secret') secret: string,
    @Body() dto: { ... }
) {
    const expectedSecret = this.configService.get('MOCK_WEBHOOK_SECRET');
    if (secret !== expectedSecret) {
        throw new UnauthorizedException('Invalid webhook secret');
    }
    // ...
}
```

---

### 1.3 Console.log trong JwtAuthGuard

**Vấn đề:**
`jwt-auth.guard.ts` đang log `Authorization header` ra console — rò rỉ token trong log production.

```typescript
// Xóa 2 dòng này trong jwt-auth.guard.ts
console.log('[JwtAuthGuard] Guard triggered');
console.log('[JwtAuthGuard] Authorization header:', request.headers.authorization);
```

---

## 2. Tích hợp cổng thanh toán thật

**Vấn đề:** Toàn bộ luồng thanh toán hiện là mock, không thể dùng cho production.

**Kiến trúc đề xuất** — tách biệt provider qua interface:

```
apps/api/src/payments/
├── payments.controller.ts
├── payments.service.ts          ← orchestrator, không đổi nhiều
├── payments.module.ts
├── dto/
└── providers/
    ├── payment-provider.interface.ts   ← interface chung
    ├── mock/
    │   └── mock-payment.provider.ts    ← giữ lại để dev/test
    ├── vnpay/
    │   └── vnpay-payment.provider.ts   ← tích hợp VNPay
    └── stripe/
        └── stripe-payment.provider.ts  ← tích hợp Stripe (quốc tế)
```

### 2.1 Định nghĩa interface chung

```typescript
// payment-provider.interface.ts
export interface PaymentProvider {
    createCheckoutSession(params: {
        paymentId: string;
        amount: number;
        currency: string;
        planName: string;
        billingCycle: 'monthly' | 'annual';
        userId: string;
        returnUrl: string;
    }): Promise<{ checkoutUrl: string; providerRef: string }>;

    verifyWebhookSignature(payload: Buffer, signature: string): boolean;
    parseWebhookEvent(payload: Buffer): Promise<WebhookEvent>;
}
```

### 2.2 Cấu hình chọn provider qua env

```bash
# .env
PAYMENT_PROVIDER=mock   # mock | vnpay | stripe

# VNPay
VNPAY_TMN_CODE=your_tmn_code
VNPAY_HASH_SECRET=your_hash_secret
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=https://yourdomain.com/billing/vnpay-return

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2.3 Thêm return URL handler

Khi thanh toán thật, cần có trang redirect sau khi user hoàn tất:

```
apps/web/src/app/billing/
├── vnpay-return/page.tsx    ← VNPay redirect về đây sau thanh toán
└── success/page.tsx         ← Trang thông báo thành công chung
```

---

## 3. Email thông báo

**Hiện trạng:** `MailService` đã có sẵn với `nodemailer` và hỗ trợ SMTP. Chỉ cần thêm các template email cho billing.

**File cần thêm:** `apps/api/src/mail/mail.service.ts`

### 3.1 Email xác nhận thanh toán thành công

```typescript
async sendPaymentSuccessEmail(params: {
    to: string;
    displayName: string;
    planName: string;
    amount: number;
    billingCycle: 'monthly' | 'annual';
    endDate: Date;
    transactionId: string;
}): Promise<void> {
    const formattedAmount = new Intl.NumberFormat('vi-VN', {
        style: 'currency', currency: 'VND'
    }).format(params.amount);

    const html = `
        <h2>Thanh toán thành công!</h2>
        <p>Xin chào ${params.displayName},</p>
        <p>Gói <strong>${params.planName}</strong> của bạn đã được kích hoạt.</p>
        <table>
            <tr><td>Số tiền:</td><td>${formattedAmount}</td></tr>
            <tr><td>Chu kỳ:</td><td>${params.billingCycle === 'annual' ? 'Hàng năm' : 'Hàng tháng'}</td></tr>
            <tr><td>Hiệu lực đến:</td><td>${params.endDate.toLocaleDateString('vi-VN')}</td></tr>
            <tr><td>Mã giao dịch:</td><td>${params.transactionId}</td></tr>
        </table>
    `;
    await this.sendMail(params.to, 'Netflat - Xác nhận thanh toán', html);
}
```

### 3.2 Email sắp hết hạn (7 ngày trước)

```typescript
async sendSubscriptionExpiringEmail(params: {
    to: string;
    displayName: string;
    planName: string;
    endDate: Date;
    renewUrl: string;
}): Promise<void> {
    const html = `
        <h2>Gói cước sắp hết hạn</h2>
        <p>Xin chào ${params.displayName},</p>
        <p>Gói <strong>${params.planName}</strong> của bạn sẽ hết hạn vào
           <strong>${params.endDate.toLocaleDateString('vi-VN')}</strong>.</p>
        <p><a href="${params.renewUrl}">Gia hạn ngay</a></p>
    `;
    await this.sendMail(params.to, 'Netflat - Gói cước sắp hết hạn', html);
}
```

### 3.3 Email sau khi hết hạn / downgrade

```typescript
async sendSubscriptionExpiredEmail(params: {
    to: string;
    displayName: string;
    upgradeUrl: string;
}): Promise<void> {
    const html = `
        <h2>Gói cước đã hết hạn</h2>
        <p>Xin chào ${params.displayName},</p>
        <p>Tài khoản của bạn đã được chuyển về gói <strong>Free</strong>.</p>
        <p><a href="${params.upgradeUrl}">Nâng cấp lại</a></p>
    `;
    await this.sendMail(params.to, 'Netflat - Gói cước đã hết hạn', html);
}
```

**Nơi gọi:** Inject `MailService` vào `PaymentsService` và `SubscriptionsService`, gọi sau khi xử lý thành công.

---

## 4. Auto-renewal & Scheduler

**Vấn đề:** Trường `autoRenew = true` tồn tại trong DB nhưng không có gì xử lý nó. Subscription hết hạn không tự động gia hạn hay chuyển về Free.

**Đề xuất:** Dùng `@nestjs/schedule` (đã có BullMQ, có thể dùng cron job).

### 4.1 Cài đặt

```bash
npm install @nestjs/schedule
```

### 4.2 Tạo Scheduler Service

```typescript
// apps/api/src/subscriptions/subscription-scheduler.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class SubscriptionSchedulerService {
    private readonly logger = new Logger(SubscriptionSchedulerService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly mailService: MailService,
    ) {}

    // Chạy mỗi ngày lúc 8:00 sáng
    @Cron(CronExpression.EVERY_DAY_AT_8AM)
    async handleExpiringSubscriptions() {
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        // Tìm subscription sắp hết hạn trong 7 ngày
        const expiring = await this.prisma.subscription.findMany({
            where: {
                status: 'active',
                endDate: {
                    gte: new Date(),
                    lte: sevenDaysFromNow,
                },
            },
            include: { user: true, plan: true },
        });

        for (const sub of expiring) {
            await this.mailService.sendSubscriptionExpiringEmail({
                to: sub.user.email,
                displayName: sub.user.displayName ?? sub.user.email,
                planName: sub.plan.displayName,
                endDate: sub.endDate,
                renewUrl: `${process.env.FRONTEND_URL}/pricing`,
            });
            this.logger.log(`Expiring notice sent to ${sub.user.email}`);
        }
    }

    // Chạy mỗi ngày lúc 0:00 — xử lý subscription đã hết hạn
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleExpiredSubscriptions() {
        const freePlan = await this.prisma.subscriptionPlan.findUnique({
            where: { name: 'free' },
        });
        if (!freePlan) return;

        // Tìm subscription đã hết hạn nhưng vẫn còn status active
        const expired = await this.prisma.subscription.findMany({
            where: {
                status: 'active',
                endDate: { lt: new Date() },
                plan: { name: { not: 'free' } },
            },
            include: { user: true, plan: true },
        });

        for (const sub of expired) {
            // Downgrade về Free
            await this.prisma.subscription.update({
                where: { id: sub.id },
                data: {
                    planId: freePlan.id,
                    status: 'active',
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                },
            });

            await this.mailService.sendSubscriptionExpiredEmail({
                to: sub.user.email,
                displayName: sub.user.displayName ?? sub.user.email,
                upgradeUrl: `${process.env.FRONTEND_URL}/pricing`,
            });

            this.logger.log(`Subscription expired, downgraded to Free: ${sub.user.email}`);
        }
    }
}
```

### 4.3 Đăng ký trong module

```typescript
// subscriptions.module.ts
import { ScheduleModule } from '@nestjs/schedule';

@Module({
    imports: [PrismaModule, UsageModule, ScheduleModule.forRoot()],
    providers: [SubscriptionsService, SubscriptionSchedulerService],
    // ...
})
```

---

## 5. Quản lý vòng đời subscription

### 5.1 Kiểm tra endDate khi user xem phim

**Vấn đề:** `getStreamUrl()` trong `MoviesService` chỉ kiểm tra quota phim/tháng, không kiểm tra subscription có còn hạn không.

**Đề xuất — thêm vào `SubscriptionsService`:**

```typescript
async getActiveSubscription(userId: string) {
    const subscription = await this.ensureUserSubscription(userId);

    // Nếu subscription đã hết hạn → trả về gói Free
    if (subscription.status === 'active' && subscription.endDate < new Date()) {
        const freePlan = await this.prisma.subscriptionPlan.findUnique({
            where: { name: 'free' },
        });
        // Tạm thời trả về free plan cho request này
        // Scheduler sẽ cập nhật DB sau
        return { ...subscription, plan: freePlan };
    }

    return subscription;
}
```

---

### 5.2 API hủy subscription

**Hiện tại:** Không có API hủy. User chỉ có thể downgrade về Free.

**Đề xuất thêm endpoint:**

```typescript
// subscriptions.controller.ts
@Post('cancel')
@UseGuards(JwtAuthGuard)
async cancelSubscription(@CurrentUser() user: User) {
    return this.subscriptionsService.cancelSubscription(user.id);
}
```

```typescript
// subscriptions.service.ts
async cancelSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
        where: { userId },
        include: { plan: true },
    });

    if (!subscription || subscription.plan.name === 'free') {
        throw new BadRequestException({ code: 'CANNOT_CANCEL_FREE_PLAN' });
    }

    // Đánh dấu sẽ không gia hạn, vẫn dùng được đến endDate
    return this.prisma.subscription.update({
        where: { userId },
        data: {
            autoRenew: false,
            status: 'canceled',
        },
    });
}
```

---

### 5.3 Tính pro-rata khi downgrade

**Vấn đề:** Khi user đang dùng gói Pro (còn 15 ngày) chuyển về Free, không có logic hoàn tiền hay tính phần dư.

**Đề xuất — thêm logic tính số ngày còn lại:**

```typescript
// subscriptions.service.ts
private calculateRemainingDays(endDate: Date): number {
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

// Khi downgrade, lưu lại thông tin để xử lý hoàn tiền sau
async downgradePlan(userId: string) {
    const current = await this.prisma.subscription.findUnique({
        where: { userId },
        include: { plan: true },
    });

    const remainingDays = this.calculateRemainingDays(current.endDate);
    // TODO: Tạo refund record nếu remainingDays > 0
    // ...
}
```

---

## 6. Admin dashboard billing

**Hiện trạng:** `AdminController` chỉ có diagnostics và quản lý user. Không có gì về subscription/payment.

**Đề xuất thêm vào `AdminService` và `AdminController`:**

### 6.1 Thống kê doanh thu

```typescript
// admin.service.ts
async getBillingStats() {
    const [totalRevenue, revenueByPlan, recentPayments, activeSubs] =
        await Promise.all([
            // Tổng doanh thu (chỉ completed)
            this.prisma.payment.aggregate({
                where: { status: 'completed' },
                _sum: { amount: true },
            }),

            // Doanh thu theo gói
            this.prisma.payment.groupBy({
                by: ['subscriptionId'],
                where: { status: 'completed' },
                _sum: { amount: true },
            }),

            // 10 giao dịch gần nhất
            this.prisma.payment.findMany({
                where: { status: 'completed' },
                include: { user: true, subscription: { include: { plan: true } } },
                orderBy: { createdAt: 'desc' },
                take: 10,
            }),

            // Số subscription đang active theo gói
            this.prisma.subscription.groupBy({
                by: ['planId'],
                where: { status: 'active' },
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
            }),
        ]);

    return { totalRevenue, revenueByPlan, recentPayments, activeSubs };
}
```

### 6.2 Quản lý subscription của user

```typescript
// admin.controller.ts
@Get('subscriptions')
async getSubscriptions(
    @Query('page') page?: string,
    @Query('planName') planName?: string,
    @Query('status') status?: string,
) {
    return this.adminService.getSubscriptions({ page, planName, status });
}

@Patch('subscriptions/:userId/plan')
async overridePlan(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: { planName: string; reason: string },
) {
    return this.adminService.overrideUserPlan(userId, body.planName, body.reason);
}
```

---

## 7. Cải thiện UX Frontend

### 7.1 Hiển thị cảnh báo khi subscription sắp hết hạn

**File:** `apps/web/src/app/profile/billing/page.tsx`

```tsx
// Thêm banner cảnh báo nếu còn <= 7 ngày
function ExpiryWarning({ endDate }: { endDate: string }) {
    const daysLeft = Math.ceil(
        (new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    if (daysLeft > 7) return null;

    return (
        <div className={styles.warningBanner}>
            ⚠️ Gói cước của bạn còn <strong>{daysLeft} ngày</strong>.
            <Link href="/pricing">Gia hạn ngay</Link>
        </div>
    );
}
```

---

### 7.2 Phân trang lịch sử thanh toán

**Vấn đề:** `BillingPage` hiện load cứng `page=1, limit=20` và không có nút phân trang.

**Đề xuất:**

```tsx
// billing/page.tsx
const [page, setPage] = useState(1);
const payments = useBillingHistory(page, 20, isAuthenticated);

// Thêm pagination controls
{payments.data?.meta && (
    <div className={styles.pagination}>
        <button
            disabled={!payments.data.meta.hasPrev}
            onClick={() => setPage(p => p - 1)}
        >
            ← Trước
        </button>
        <span>Trang {page} / {payments.data.meta.totalPages}</span>
        <button
            disabled={!payments.data.meta.hasNext}
            onClick={() => setPage(p => p + 1)}
        >
            Sau →
        </button>
    </div>
)}
```

---

### 7.3 Hiển thị tiết kiệm khi chọn gói năm

**Vấn đề:** Trang Pricing không cho user thấy họ tiết kiệm bao nhiêu khi chọn gói năm.

```tsx
// pricing/page.tsx
function SavingsBadge({ monthlyPrice, annualPrice }: {
    monthlyPrice: number;
    annualPrice: number | null;
}) {
    if (!annualPrice || monthlyPrice === 0) return null;
    const annualEquivalent = monthlyPrice * 12;
    const savings = annualEquivalent - annualPrice;
    const pct = Math.round((savings / annualEquivalent) * 100);
    if (pct <= 0) return null;
    return <span className={styles.savingsBadge}>Tiết kiệm {pct}%</span>;
}
```

---

### 7.4 Trang `/pricing` cho user chưa đăng nhập

**Vấn đề:** User chưa đăng nhập vẫn thấy trang pricing nhưng không biết mình đang ở gói nào.

**Đề xuất:** Thêm banner hướng dẫn:

```tsx
{!isAuthenticated && (
    <div className={styles.guestBanner}>
        <p>Đăng nhập để xem gói hiện tại và nâng cấp ngay.</p>
        <Link href="/login?redirect=/pricing" className="btn btn-primary">
            Đăng nhập
        </Link>
    </div>
)}
```

---

## 8. Tóm tắt theo độ ưu tiên

| # | Hạng mục | Độ ưu tiên | Effort | Ghi chú |
|---|----------|-----------|--------|---------|
| 1.1 | Fix ownership check `mock-complete` | 🔴 Cao | Thấp | Sửa 5 dòng code |
| 1.3 | Xóa console.log token trong JwtAuthGuard | 🔴 Cao | Thấp | Xóa 2 dòng |
| 1.2 | Bảo mật mock-webhook | 🔴 Cao | Thấp | Thêm secret header |
| 3 | Email thông báo thanh toán | 🟡 Trung bình | Trung bình | MailService đã có sẵn |
| 4 | Auto-renewal & Scheduler | 🟡 Trung bình | Trung bình | Cần cài @nestjs/schedule |
| 5.1 | Kiểm tra endDate khi stream | 🟡 Trung bình | Thấp | Thêm 1 hàm |
| 5.2 | API hủy subscription | 🟡 Trung bình | Thấp | Thêm 1 endpoint |
| 6 | Admin dashboard billing | 🟡 Trung bình | Cao | Nhiều query thống kê |
| 7.1 | Banner cảnh báo sắp hết hạn | 🟢 Thấp | Thấp | Component nhỏ |
| 7.2 | Phân trang lịch sử | 🟢 Thấp | Thấp | Thêm state + UI |
| 7.3 | Hiển thị % tiết kiệm gói năm | 🟢 Thấp | Thấp | Component nhỏ |
| 2 | Tích hợp cổng thanh toán thật | 🔵 Dài hạn | Rất cao | Cần đăng ký VNPay/Stripe |
| 5.3 | Pro-rata khi downgrade | 🔵 Dài hạn | Cao | Cần logic hoàn tiền |
