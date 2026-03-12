# NETFLAT Upload & Playback Flow (Web + Mobile)

> **TĂ i liá»‡u tá»•ng há»£p**: Chi tiáº¿t luá»“ng xá»­ lĂ½ video tá»« lĂºc Admin upload Ä‘áº¿n lĂºc Viewer xem song song trĂªn Web vĂ  Mobile App.

---

## 1. Tá»•ng quan há»‡ thá»‘ng (Parallel Architecture)

Há»‡ thá»‘ng NETFLAT cho phĂ©p xem phim Ä‘á»“ng bá»™ trĂªn cáº£ **Web** vĂ  **Mobile** nhá» vĂ o kiáº¿n trĂºc API táº­p trung vĂ  Streaming chuáº©n HLS.

```mermaid
graph TD
    Admin[Admin Web] -->|Upload MP4| S3[MinIO Storage]
    S3 -->|Encode Job| Worker[Encode Worker]
    Worker -->|HLS Output| S3
    
    API[Back-end API] -->|Presigned URL| Admin
    Admin -->|Upload Complete| API
    Worker -->|Status Callback| API
    
    ViewerW[Web Viewer] -->|Get Stream URL| API
    ViewerM[Mobile Viewer] -->|Get Stream URL| API
    
    API -->|Playback URL (public or signed)| ViewerW
    API -->|Playback URL (public or signed)| ViewerM
    
    ViewerW -->|Stream HLS| S3
    ViewerM -->|Stream HLS| S3
```

---

## 2. Quy trĂ¬nh Upload (Admin Side)

**Má»¥c tiĂªu**: ÄÆ°a file `mp4` gá»‘c lĂªn storage vĂ  kĂ­ch hoáº¡t encode.

### B1. Láº¥y Presigned URL
Admin Web gá»i API Ä‘á»ƒ xin quyá»n upload trá»±c tiáº¿p lĂªn Storage, trĂ¡nh táº¯c ngháº½n API server.

- **Endpoint**: `GET /api/upload/presigned-url`
- **Request**:
  ```json
  { 
    "movieId": "uuid", 
    "fileName": "avatar.mp4", 
    "contentType": "video/mp4",
    "sizeBytes": 1024000
  }
  ```
- **Response**:
  ```json
  {
    "uploadUrl": "http://localhost:9000/NETFLAT/originals/...?signature=...",
    "objectKey": "originals/uuid/avatar.mp4"
  }
  ```
  - Host cá»§a `uploadUrl` láº¥y tá»« `S3_PRESIGN_BASE_URL`.

### B2. Upload Binary
Browser gá»­i `PUT` request trá»±c tiáº¿p tá»›i `uploadUrl` vá»›i body lĂ  file binary.

### B3. XĂ¡c nháº­n hoĂ n táº¥t (Trigger Encode)
Sau khi upload xong 100%, Admin Web bĂ¡o cho API biáº¿t Ä‘á»ƒ báº¯t Ä‘áº§u xá»­ lĂ½.
- **Endpoint**: `POST /api/movies/:id/upload-complete` (alias deprecated: `/api/upload/complete/:movieId`)
- **Body**: `{ "objectKey": "...", "fileType": "video" }`
- **Há»‡ thá»‘ng xá»­ lĂ½**:
  1. Cáº­p nháº­t `movie.original_key`.
  2. Chuyá»ƒn `encode_status` -> `pending`.
  3. Äáº©y job vĂ o hĂ ng Ä‘á»£i `encode` (Redis BullMQ).

---

## 3. Quy trĂ¬nh Xá»­ lĂ½ (Encode Worker)

Worker cháº¡y ngáº§m (background) Ä‘á»ƒ chuyá»ƒn Ä‘á»•i video.

1. **Nháº­n Job**: Worker nháº­n task tá»« Redis. `encode_status` -> `processing`.
2. **Download**: Táº£i file gá»‘c tá»« MinIO vá» mĂ¡y.
3. **Transcode (FFmpeg)**:
   - Táº¡o cĂ¡c báº£n `360p`, `720p` (HLS format).
   - Tá»± Ä‘á»™ng cáº¯t video thĂ nh cĂ¡c file nhá» (`.ts`) dĂ i 6s.
   - Táº¡o file `master.m3u8` chá»©a danh sĂ¡ch cĂ¡c Ä‘á»™ phĂ¢n giáº£i.
4. **Upload Output**: Äáº©y toĂ n bá»™ folder HLS ngÆ°á»£c láº¡i MinIO (`hls/{movieId}/*`).
5. **Callback**: Gá»i API Ä‘á»ƒ bĂ¡o xong. `encode_status` -> `ready`.

---

## 4. Quy trĂ¬nh Playback (Parallel Viewing)

Cáº£ Web vĂ  Mobile Ä‘á»u sá»­ dá»¥ng chung má»™t cÆ¡ cháº¿ láº¥y link, nhÆ°ng khĂ¡c nhau vá» player vĂ  cáº¥u hĂ¬nh máº¡ng (Ä‘áº·c biá»‡t khi cháº¡y local/dev).

### B1. Authenticate & Get Stream URL
Client gá»i API Ä‘á»ƒ láº¥y link xem phim. Link nĂ y cĂ³ thá»ƒ lĂ  **public URL** (dev/staging) hoáº·c **Signed URL** (cĂ³ thá»i háº¡n) Ä‘á»ƒ báº£o vá»‡ ná»™i dung.

- **Endpoint**: `GET /api/movies/:id/stream`
- **Auth**: Header `Authorization: Bearer <token>`
- **Response**:
  ```json
  {
    "data": {
      "playbackUrl": "http://192.168.1.5:9000/NETFLAT/hls/uuid/master.m3u8?signature=..."
    }
  }
  ```

### B2. Client Implementation

| Äáº·c Ä‘iá»ƒm | **Web App** (`apps/web`) | **Mobile App** (`apps/mobile`) |
|----------|--------------------------|--------------------------------|
| **Player Lib** | `hls.js` (hoáº·c Safari native) | `expo-av` (`Video` component) |
| **File** | `VideoPlayer.tsx` | `app/player/[id].tsx` |
| **Network** | `localhost:3000` | **IP LAN** (vd: `10.0.2.2` hoáº·c `192.168.x.x`) |
| **LÆ°u Progress** | Má»—i 10 giĂ¢y (`timeupdate`) | Má»—i 5 giĂ¢y + khi App background |
| **Quality** | `hls.js` tá»± Ä‘á»™ng (ABR) | Auto hoáº·c chá»n thá»§ cĂ´ng (UI custom) |

### â ï¸ LÆ°u Ă½ quan trá»ng vá» MĂ´i trÆ°á»ng (Parallel Dev)

Äá»ƒ xem Ä‘Æ°á»£c song song trĂªn Web vĂ  Mobile Emulator/Physical Device:

1. **Host Configuration**:
   - File `.env` gá»‘c pháº£i set `DEV_PUBLIC_HOST` lĂ  **IP LAN** mĂ¡y báº¡n (hoáº·c `10.0.2.2` náº¿u chá»‰ dĂ¹ng emulator), **KHĂ”NG DĂ™NG** `localhost`.
   - VĂ­ dá»¥: `DEV_PUBLIC_HOST=192.168.1.10`.

2. **Táº¡i sao?**
   - **Web**: Cháº¡y trĂªn mĂ¡y tĂ­nh, hiá»ƒu `localhost`.
   - **Mobile**: LĂ  thiáº¿t bá»‹ riĂªng biá»‡t. Náº¿u API tráº£ vá» link `http://localhost:9000/...`, Ä‘iá»‡n thoáº¡i sáº½ tĂ¬m server "trĂªn chĂ­nh nĂ³" vĂ  lá»—i káº¿t ná»‘i.
   - **Giáº£i phĂ¡p**: API sáº½ tráº£ vá» link dá»±a trĂªn `DEV_PUBLIC_HOST` Ä‘á»ƒ cáº£ 2 thiáº¿t bá»‹ Ä‘á»u truy cáº­p Ä‘Æ°á»£c MinIO.

---

## 5. Dá»¯ liá»‡u Ä‘á»“ng bá»™ (Sync)

Do dĂ¹ng chung Backend, tráº¡ng thĂ¡i xem Ä‘Æ°á»£c Ä‘á»“ng bá»™ giá»¯a 2 ná»n táº£ng:

1. **Watch History**:
   - Web xem Ä‘áº¿n phĂºt 10 -> API lÆ°u `progressSeconds: 600`.
   - Má»Ÿ Mobile -> App gá»i `GET /progress` -> Nháº­n `600` -> Player seek tá»›i phĂºt 10.
   - **Káº¿t quáº£**: Seamless experience (tráº£i nghiá»‡m liá»n máº¡ch).

2. **My List (YĂªu thĂ­ch)**:
   - Web thĂªm vĂ o "My List".
   - Mobile reload -> Tháº¥y phim Ä‘Ă³ trong danh sĂ¡ch yĂªu thĂ­ch.

---

## TĂ³m táº¯t ká»¹ thuáº­t

- **Upload**: Direct-to-S3 (Presigned URL) -> High Performance.
- **Encode**: Async Queue -> Non-blocking API.
- **Stream**: HLS (Adaptive Bitrate) -> Tá»‘i Æ°u bÄƒng thĂ´ng cho Mobile/Web.
- **Sync**: Centralized DB (Postgres) -> Dá»¯ liá»‡u xem liĂªn thĂ´ng.
