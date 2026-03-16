# LUỒNG HOẠT ĐỘNG: QUÁ TRÌNH XEM PHIM (VIDEO STREAMING)

Tất cả những gì kỳ công thiết kế đều chỉ xoay quanh một mục đích cốt lõi là phục vụ cho Khách hàng cuối ấn nút "Bắt đầu phát" êm ru, mượt mà mà không có cảm giác đang tải một file nặng. Dưới đây là kiến trúc Stream giải quyết bài toán băng thông.

---

## 1. KHÁI NIỆM TRUYỀN PHÁT QUA MẠNG

Để truyền phim 1GB từ Internet xuống Web người xem có 2 cách truyền thống:
*   **Cách Lấy cả (Download):** Client gửi yêu cầu Server 1GB, kéo đủ 1GB về rồi mới mở Player ra được, đợi mất 1 tiếng rưỡi (Cách người ta hay gọi là cắm Torrent - không dành cho việc bấm là xem).
*   **Cách Truyền phát trực tiếp (Live Stream/VOD Stream):** Xem tới đâu, lấy tới đó. Muốn thế phải nhờ vào công nghệ **HTTP Range Requests** và đây chính là sức mạnh của Object Storage MinIO.

## 2. CÁC BƯỚC CỦA LUỒNG XEM PHIM QUA NEXT.JS WEB

### Bước 1: Render Màn hình Giao diện 
*   **Hành động User:** Nhấn xem chi tiết một bộ phim có tên `Phim 123` trên trình duyệt màn hình chính. 
*   **Next.js Server Side:** Next.js Server App (Port 3002) sẽ chạy gửi đi một lệnh gọi cục bộ bên trong cổng máy qua `NestJS API` để tải hết mọi dữ liệu Poster, Review, Đạo diễn về -> Biến đổi thành chuỗi dữ liệu giao diện HTML.
*   **Trả về Website:** User chỉ mất tích tắc màn hình đã load ra được đầy đủ thông tin chuẩn SEO vào trình duyệt. Lúc này thẻ HTML5 `<video>` rỗng xuất hiện kèm theo thuộc tính URL liên kết với nguồn Storage như sau: `<video src="http://localhost:9002/media/phim123.mp4" controls preload="metadata" />`.

### Bước 2: Kích hoạt Lệnh kéo phim (Kéo phần Header)
*   Thẻ Video HTML5 không cần API ra tay nữa. Nó mở thẳng kết nối với kho lưu trữ File gốc qua đường dẫn cổng 9002 của **MinIO**. 
*   **Fetch Byte Đầu:** Thuộc tính `preload="metadata"` chỉ nạp 1 mớ byte đầu tiên với Header HTTP báo cho Thẻ Video biết (Độ phân giải bản MP4 này là bao nhiêu, Phim dài 120 phút). Trình duyệt nhờ byte đó mà định hình được "Thanh trượt Thời lượng" (Timeline dài bao nhiêu cm) dù cục phim nặng 1GB chưa tới.

### Bước 3: Thuật toán HTTP Range Requests (Giao thức Stream dữ liệu)
Thuật toán phân đoạn của máy chủ **MinIO** bắt đầu thể hiện thế mạnh tuyệt đối ở đây. 

*   Khách ấn **PLAY**. Thẻ báo: "Hãy gửi cho tao đoạn Range Bytes từ 0 đến 500.000!" (Tương đương khoàng 10 giây đầu phim).
*   MinIO dùng tính năng Stream chia 500.000 Byte đó thành các mảnh nhỏ trôi tuột xuống trình duyệt client qua luồng `Partial Content (HTTP 206)`.  
*   Cục Code giải mã (Codec) trong trình duyệt ngay lập tức nhận byte, xếp ghép lại và thả hình ảnh lên màn hình cho Khách xem, mượt mà và không giật lag.

### Bước 4: Tua phim Thần thánh (Scrubbing / Seeking)
*   Đây là tác vụ sát thủ đối với các lập trình sinh viên viết web đơn giản, nhưng lại quá dễ dàng đối với hệ thống của Netflat. 
*   Nếu Khách hàng không buồn xem nữa, bấm thẳng lên **phút 60** của cuộn dây Video.
*   Trình duyệt hủy đi yêu cầu Stream ở byte hiện tại, nó gửi một lệnh Request thay đổi Header lên **MinIO**: *"Ê, cho tao xin Range Bytes từ 2.000.000 (Vị trí byte tương ứng phút 60) đến 2.500.000!"*.  
*   **MinIO:** Lập tức bỏ qua các phần trước, nhảy thẳng tới vị trí byte phim tương ứng và phát tiếp `Partial Content 206` đoạn đó về.

---

## 3. LỢI ÍCH TRONG MẶT KIẾN TRÚC TỔNG CỦA LUỒNG TẢI NÀY
*   **Tách Bạch Vai Trò:** Bạn để ý trong toàn bộ quá trình User xem phim (Giúp Video Play) hoàn toàn **KHÔNG CÓ sự nhúng tay nào của Cổng máy chủ API NestJS hay Database PostgreSQL**. 
    *   Máy chủ Web HTML giao diện. 
    *   Hàng rào MinIO chứa File (Nó chạy trên ngõ mạng Port riêng).
    *   Nhờ cách cấu trúc này, CPU và RAM của máy chủ chạy luồng code Logic (NestJS) không bị chiếm dụng một bit nào để phục vụ luồng kéo phim. Nó rảnh tay đi phục vụ việc Đăng nhập, Viết comment cho người khác!
*   **Băng thông (Bandwidth Capped):** Client không kéo full 1GB một lúc (Chỉ kéo cỡ vài MB rồi ngưng đợi xem hết kéo tiếp). Do đó rất tiết kiệm lưu lượng Data truyền tải mạng của Server (nhất là mạng bị giới hạn cước trả theo Byte lưu lượng đi nếu dùng thực tế). Cực kì tiết kiệm tiền cho công ty Cloud cung cấp dịch vụ!