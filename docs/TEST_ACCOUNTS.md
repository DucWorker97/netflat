# Tài Khoản Test Netflat

Cập nhật theo snapshot seed hiện tại trong `apps/api/scripts/seed-shared.ts`.

Lưu ý:
- Danh sách này chỉ phản ánh các tài khoản đang được seed ở thời điểm hiện tại.
- Đây là tài liệu theo dõi nhanh cho đồ án, không cam kết cho các lần thay đổi sau.
- Khu vực đăng nhập của admin và web cũng đang hiển thị trực tiếp các tài khoản này để thao tác nhanh.

## Tài khoản quản trị

| Email | Mật khẩu | Vai trò | Ghi chú |
| --- | --- | --- | --- |
| `admin@netflat.local` | `admin123` | `admin` | Tài khoản quản trị chính |
| `moderator@netflat.local` | `moderator123` | `admin` | Tài khoản quản trị phụ |
| `qa.admin@netflat.local` | `qaadmin123` | `admin` | Tài khoản QA quản trị |

## Tài khoản người xem

| Email | Mật khẩu | Vai trò | Ghi chú |
| --- | --- | --- | --- |
| `viewer@netflat.local` | `viewer123` | `viewer` | Tài khoản người xem mặc định |
| `viewer1@netflat.local` | `viewer123` | `viewer` | Tài khoản test người xem |
| `viewer2@netflat.local` | `viewer123` | `viewer` | Tài khoản test người xem |
| `viewer3@netflat.local` | `viewer123` | `viewer` | Tài khoản test người xem |
| `viewer4@netflat.local` | `viewer123` | `viewer` | Tài khoản test người xem |
| `qa.viewer@netflat.local` | `qaviewer123` | `viewer` | Tài khoản QA người xem |
| `loadtest.viewer@netflat.local` | `viewer123` | `viewer` | Tài khoản phục vụ test tải |

## Gợi ý sử dụng nhanh

- Đăng nhập admin: dùng nhóm `admin` ở `http://localhost:3001/vi/login`.
- Đăng nhập web: dùng cả `admin` hoặc `viewer` ở `http://localhost:3002/login`.
- Nếu seed lại DB, cần đối chiếu lại file này với `apps/api/scripts/seed-shared.ts`.