# PRD â€“ NETFLAT (Netflix Mini)

> **PhiĂªn báº£n:** 1.0  
> **NgĂ y táº¡o:** 01-01-2026  
> **TĂ¡c giáº£:** Product Manager / Tech Lead  
> **Tráº¡ng thĂ¡i:** Draft â†’ Review

---

## Má»¥c lá»¥c

1. [Tá»•ng quan sáº£n pháº©m](#1-tá»•ng-quan-sáº£n-pháº©m)
2. [Äá»‘i tÆ°á»£ng ngÆ°á»i dĂ¹ng & use cases](#2-Ä‘á»‘i-tÆ°á»£ng-ngÆ°á»i-dĂ¹ng--use-cases)
3. [Pháº¡m vi & tĂ­nh nÄƒng (MoSCoW)](#3-pháº¡m-vi--tĂ­nh-nÄƒng-moscow)
4. [Luá»“ng tráº£i nghiá»‡m (UX Flows)](#4-luá»“ng-tráº£i-nghiá»‡m-ux-flows)
5. [Danh sĂ¡ch mĂ n hĂ¬nh & yĂªu cáº§u UI](#5-danh-sĂ¡ch-mĂ n-hĂ¬nh--yĂªu-cáº§u-ui)
6. [Dá»¯ liá»‡u & quy táº¯c nghiá»‡p vá»¥](#6-dá»¯-liá»‡u--quy-táº¯c-nghiá»‡p-vá»¥)
7. [YĂªu cáº§u phi chá»©c nÄƒng (NFR)](#7-yĂªu-cáº§u-phi-chá»©c-nÄƒng-nfr)
8. [Acceptance Criteria (Definition of Done)](#8-acceptance-criteria-definition-of-done)
9. [Káº¿ hoáº¡ch 8 tuáº§n (Milestones)](#9-káº¿-hoáº¡ch-8-tuáº§n-milestones)
10. [Ká»‹ch báº£n demo cuá»‘i ká»³](#10-ká»‹ch-báº£n-demo-cuá»‘i-ká»³)
11. [TiĂªu chĂ­ cháº¥m Ä‘iá»ƒm (Scoring Rubric)](#11-tiĂªu-chĂ­-cháº¥m-Ä‘iá»ƒm-scoring-rubric)
12. [Rá»§i ro & phÆ°Æ¡ng Ă¡n giáº£m thiá»ƒu](#12-rá»§i-ro--phÆ°Æ¡ng-Ă¡n-giáº£m-thiá»ƒu)
13. [TĂ³m táº¯t & next steps](#13-tĂ³m-táº¯t--next-steps)

---

# 1. Tá»•ng quan sáº£n pháº©m

## 1.1 TĂªn sáº£n pháº©m

**NETFLAT** â€” Netflix mini cho video tá»± sáº£n xuáº¥t.

## 1.2 Váº¥n Ä‘á» & cÆ¡ há»™i

| Váº¥n Ä‘á» | CÆ¡ há»™i |
|--------|--------|
| NgÆ°á»i dĂ¹ng (content creator / sinh viĂªn) muá»‘n xem ná»™i dung video tá»± sáº£n xuáº¥t trĂªn Ä‘iá»‡n thoáº¡i nhÆ°ng thiáº¿u ná»n táº£ng streaming chuyĂªn nghiá»‡p. | XĂ¢y dá»±ng tráº£i nghiá»‡m "Netflix vibe" (tĂ¬m kiáº¿m, rails theo thá»ƒ loáº¡i, xem tiáº¿p, danh sĂ¡ch yĂªu thĂ­ch) cho video tá»± lĂ m. |
| Quáº£n lĂ½ ná»™i dung (upload, encode, publish) phá»©c táº¡p, khĂ´ng cĂ³ admin UI. | CMS web giĂºp admin upload, theo dĂµi tiáº¿n trĂ¬nh encode HLS vĂ  publish ná»™i dung dá»… dĂ ng. |
| Demo Ä‘á»“ Ă¡n thiáº¿u kiáº¿n trĂºc streaming rĂµ rĂ ng (encode â†’ HLS â†’ playback). | Triá»ƒn khai pipeline: MP4 â†’ FFmpeg encode multi-bitrate HLS â†’ lÆ°u storage â†’ playback trĂªn mobile. |

## 1.3 Má»¥c tiĂªu (Goals)

### Product goals (tráº£i nghiá»‡m)
- **PG-1:** Viewer cĂ³ thá»ƒ duyá»‡t phim theo thá»ƒ loáº¡i / collection trá»±c quan, tĂ¬m kiáº¿m, xem trailer/video, **resume** vá»‹ trĂ­ Ä‘Ă£ xem.
- **PG-2:** Viewer cĂ³ thá»ƒ lÆ°u phim vĂ o danh sĂ¡ch yĂªu thĂ­ch vĂ  xem láº¡i qua "My List".
- **PG-3:** Admin cĂ³ thá»ƒ upload video, theo dĂµi encode status, publish/unpublish mĂ  khĂ´ng cáº§n dĂ¹ng CLI.

### Technical goals (ká»¹ thuáº­t)
- **TG-1:** Streaming video chuáº©n HLS (m3u8) vá»›i â‰¥ 2 variant (360p + 720p).
- **TG-2:** Encode pipeline tá»± Ä‘á»™ng: upload MP4 â†’ job queue â†’ FFmpeg â†’ output HLS â†’ callback API.
- **TG-3:** API RESTful, phĂ¢n quyá»n JWT, database quan há»‡ vá»›i migration.
- **TG-4:** Mobile app cross-platform (Expo React Native) cháº¡y iOS & Android.

### Success metrics (demo Ä‘á»“ Ă¡n)

| Metric | Má»¥c tiĂªu |
|--------|----------|
| Time-to-first-frame (TTFF) trĂªn WiFi LAN | â‰¤ 3 giĂ¢y |
| Tá»‰ lá»‡ lá»—i playback (crash/buffer stall) trong demo | < 5 % |
| Äá»™ chĂ­nh xĂ¡c resume (sai lá»‡ch) | â‰¤ 5 giĂ¢y |
| Thá»i gian encode 1 phĂºt video (720p) | â‰¤ 2 phĂºt trĂªn mĂ¡y dev |
| Sá»‘ bÆ°á»›c demo end-to-end (upload â†’ viewer play) | â‰¤ 10 bÆ°á»›c |

## 1.4 KhĂ´ng náº±m trong pháº¡m vi (Out of scope)

- **DRM thÆ°Æ¡ng máº¡i** (Widevine, FairPlay license server) â€” chá»‰ báº£o vá»‡ nháº¹ báº±ng auth + signed URL.
- **Recommendation ML phá»©c táº¡p** (collaborative filtering, deep learning).
- **Multi-device sync cáº¥p Ä‘á»™ production** (xem trĂªn TV tiáº¿p tá»¥c trĂªn Ä‘iá»‡n thoáº¡i real-time).
- **Há»‡ thá»‘ng thanh toĂ¡n / subscription billing**.
- **Live streaming** (chá»‰ há»— trá»£ VOD).
- **Offline download** (cache local).
- **Multi-tenant** (chá»‰ 1 tenant).

---

# 2. Äá»‘i tÆ°á»£ng ngÆ°á»i dĂ¹ng & use cases

## 2.1 Persona

### Viewer (ngÆ°á»i xem)
| Thuá»™c tĂ­nh | MĂ´ táº£ |
|------------|-------|
| Vai trĂ² | Sinh viĂªn, báº¡n bĂ¨, ngÆ°á»i quan tĂ¢m ná»™i dung tá»± sáº£n xuáº¥t. |
| Thiáº¿t bá»‹ | Äiá»‡n thoáº¡i Android/iOS (chá»§ yáº¿u), cĂ³ thá»ƒ má»Ÿ rá»™ng web. |
| Má»¥c tiĂªu | Xem video nhanh, mÆ°á»£t; lÆ°u láº¡i nhá»¯ng phim thĂ­ch; tiáº¿p tá»¥c xem dá»Ÿ. |
| Pain point | KhĂ´ng muá»‘n nhá»› vá»‹ trĂ­ xem; khĂ³ tĂ¬m video trong danh sĂ¡ch dĂ i. |

### Admin / Content Manager
| Thuá»™c tĂ­nh | MĂ´ táº£ |
|------------|-------|
| Vai trĂ² | NgÆ°á»i upload, quáº£n lĂ½ ná»™i dung (thÆ°á»ng lĂ  chá»§ sáº£n pháº©m hoáº·c thĂ nh viĂªn team). |
| Thiáº¿t bá»‹ | Desktop browser (Chrome, Edge). |
| Má»¥c tiĂªu | Upload nhanh, biáº¿t khi nĂ o encode xong, publish/unpublish linh hoáº¡t. |
| Pain point | Pháº£i chá» encode lĂ¢u; khĂ´ng biáº¿t lá»—i á»Ÿ Ä‘Ă¢u náº¿u encode fail. |

## 2.2 User stories (MVP)

| # | Role | Story | Acceptance hint |
|---|------|-------|-----------------|
| US-01 | Viewer | As a viewer, I want to **register & login** with email/password so that I can access content securely. | ÄÄƒng kĂ½ thĂ nh cĂ´ng, nháº­n JWT, lÆ°u session. |
| US-02 | Viewer | As a viewer, I want to see a **Home screen with hero banner and genre rails** so that I can browse content visually. | Tá»‘i thiá»ƒu 1 hero + 3 rails (Trending, Action, Comedyâ€¦). |
| US-03 | Viewer | As a viewer, I want to **search movies by keyword** so that I can quickly find what I want. | Search tráº£ vá» káº¿t quáº£ cĂ³ title/description chá»©a keyword. |
| US-04 | Viewer | As a viewer, I want to view **movie detail** (poster, synopsis, genres, duration) so that I know if I want to watch. | Hiá»ƒn thá»‹ Ä‘áº§y Ä‘á»§ thĂ´ng tin; nĂºt Play + Add to My List. |
| US-05 | Viewer | As a viewer, I want to **play HLS video**, control play/pause/seek, and adjust quality if available, so that I can watch smoothly. | Player hiá»ƒn thá»‹ controls; seek hoáº¡t Ä‘á»™ng; quality switch (náº¿u cĂ³). |
| US-06 | Viewer | As a viewer, I want my **watch progress saved** automatically so that I can resume later. | Progress lÆ°u má»—i 5s hoáº·c khi pause/exit. |
| US-07 | Viewer | As a viewer, I want a **"Continue Watching"** rail on Home so that I can quickly resume movies. | Hiá»ƒn thá»‹ phim cĂ³ progress > 0 vĂ  chÆ°a hoĂ n thĂ nh. |
| US-08 | Viewer | As a viewer, I want to **add/remove movies to My List** so that I can save favorites. | NĂºt toggle; My List screen hiá»ƒn thá»‹ Ä‘Ăºng danh sĂ¡ch. |
| US-09 | Viewer | As a viewer, I want to see **loading, empty, and error states** clearly so that I understand what is happening. | Skeleton loader, empty message, error retry. |
| US-10 | Admin | As an admin, I want to **login** to CMS so that only authorized people manage content. | Trang login riĂªng; chá»‰ user role=admin má»›i vĂ o Ä‘Æ°á»£c CMS page. |
| US-11 | Admin | As an admin, I want to **CRUD movies** (title, description, genres, status) so that I can manage catalog. | Táº¡o, sá»­a, xĂ³a, list vá»›i pagination. |
| US-12 | Admin | As an admin, I want to **upload MP4 and thumbnail**, track **encode status** (pending/processing/ready/failed), and **publish/unpublish** so that movies become available to viewers. | Upload qua presigned URL; status cáº­p nháº­t real-time hoáº·c polling; publish toggle. |

## 2.3 User stories (Nice-to-have)

| # | Role | Story | Priority |
|---|------|-------|----------|
| US-N1 | Viewer | As a viewer, I want to switch between **multiple profiles** so that family members have their own history. | COULD |
| US-N2 | Viewer | As a viewer, I want to see **subtitles (VTT)** in my language so that I can understand foreign content. | SHOULD |
| US-N3 | Viewer | As a viewer, I want **simple recommendations** ("Because you watched X") so that I discover new content. | COULD |
| US-N4 | Admin | As an admin, I want a **dashboard with basic analytics** (views, top movies) so that I monitor content performance. | COULD |
| US-N5 | Admin | As an admin, I want to **bulk upload** subtitles (VTT files) so that multilingual content is easier. | SHOULD |
| US-N6 | Viewer | As a viewer, I want to **rate movies** (like/dislike or 1-5 stars) so that I can express my opinion. | COULD |
| US-N7 | Viewer | As a viewer, I want a **Recently Added** rail so that I see new uploads first. | SHOULD |
| US-N8 | Admin | As an admin, I want to **reorder rails / feature movies** so that I control home layout. | COULD |

---

# 3. Pháº¡m vi & tĂ­nh nÄƒng (MoSCoW)

## 3.1 MUST (báº¯t buá»™c cho demo)

### Viewer (Mobile App)

| ID | TĂ­nh nÄƒng | MĂ´ táº£ ngáº¯n |
|----|-----------|------------|
| M-V01 | Login / Register | Email + password, JWT auth. |
| M-V02 | Home â€“ Hero Banner | Slider hoáº·c random featured movie. |
| M-V03 | Home â€“ Genre Rails | Horizontal scroll rails theo genre / collection. |
| M-V04 | Search | Input keyword â†’ káº¿t quáº£ list. |
| M-V05 | Movie Detail | Poster, title, synopsis, genres, duration, Play, My List button. |
| M-V06 | HLS Player | Play/pause, seek bar, buffer indicator. |
| M-V07 | Watch History & Resume | LÆ°u progress, resume khi má»Ÿ láº¡i. |
| M-V08 | Continue Watching Rail | Hiá»ƒn thá»‹ phim Ä‘ang xem dá»Ÿ. |
| M-V09 | My List / Favorites | Add/remove, xem danh sĂ¡ch riĂªng. |
| M-V10 | Loading / Empty / Error States | Skeleton, empty illustration, retry button. |

### Admin Web (CMS)

| ID | TĂ­nh nÄƒng | MĂ´ táº£ ngáº¯n |
|----|-----------|------------|
| M-A01 | Admin Login | RiĂªng biá»‡t vá»›i viewer; role check. |
| M-A02 | Movie List | Báº£ng pagination, filter status. |
| M-A03 | Create / Edit Movie | Form: title, description, genres (multi-select), status draft/published. |
| M-A04 | Upload Thumbnail | Chá»n file áº£nh, preview. |
| M-A05 | Upload Video (MP4) | Presigned URL upload; progress bar. |
| M-A06 | Encode Status | Hiá»ƒn thá»‹ pending/processing/ready/failed; polling hoáº·c websocket. |
| M-A07 | Publish / Unpublish | Toggle publish; viewer chá»‰ tháº¥y published + ready. |

### Backend API

| ID | TĂ­nh nÄƒng | MĂ´ táº£ ngáº¯n |
|----|-----------|------------|
| M-B01 | Auth â€“ Register / Login / Refresh / Me | JWT access + refresh token. |
| M-B02 | Movies â€“ List / Search / Detail | Pagination, filter genre, search keyword. |
| M-B03 | Genres â€“ List | Tráº£ vá» danh sĂ¡ch genres. |
| M-B04 | Favorites â€“ Add / Remove / List | CRUD yĂªu thĂ­ch. |
| M-B05 | Watch History â€“ Upsert / List | LÆ°u & láº¥y progress. |
| M-B06 | Admin â€“ Movie CRUD | Chá»‰ role admin. |
| M-B07 | Upload â€“ Presigned URL | Táº¡o presigned PUT URL cho S3/MinIO. |
| M-B08 | Upload â€“ Complete callback | Trigger encode job khi client bĂ¡o upload xong. |
| M-B09 | Stream URL | Tráº£ m3u8 URL (cĂ³ thá»ƒ signed / ticket). |

### Pipeline (HLS Encode)

| ID | TĂ­nh nÄƒng | MĂ´ táº£ ngáº¯n |
|----|-----------|------------|
| M-P01 | Job Queue | BullMQ / Redis nháº­n job encode. |
| M-P02 | FFmpeg Encode | MP4 â†’ HLS master playlist + variants 360p, 720p. |
| M-P03 | Output Storage | LÆ°u segments + m3u8 lĂªn MinIO / S3. |
| M-P04 | Callback API | Cáº­p nháº­t encode_status + playback_url vá» DB. |

---

## 3.2 SHOULD (nĂªn cĂ³, náº¿u ká»‹p)

| ID | Pháº§n | TĂ­nh nÄƒng |
|----|------|-----------|
| S-01 | Mobile | Subtitles (VTT) toggle on/off. |
| S-02 | Mobile | Quality selector (360/720 switcher). |
| S-03 | Mobile | Pull-to-refresh Home. |
| S-04 | Admin | Subtitle upload (VTT). |
| S-05 | API | Stream ticket / signed URL TTL (báº£o vá»‡ nháº¹). |
| S-06 | Pipeline | ThĂªm variant 480p. |

## 3.3 COULD (nice-to-have, bonus)

| ID | Pháº§n | TĂ­nh nÄƒng |
|----|------|-----------|
| C-01 | Mobile | Multiple profiles per account. |
| C-02 | Mobile | Simple recommendation ("VĂ¬ báº¡n Ä‘Ă£ xem X"). |
| C-03 | Mobile | Rate movie (like/dislike). |
| C-04 | Admin | Dashboard analytics (views, top 10). |
| C-05 | Admin | Reorder home rails. |
| C-06 | Pipeline | Thumbnail auto-generate tá»« video. |
| C-07 | API | Push notification khi phim má»›i publish. |

## 3.4 WON'T (khĂ´ng lĂ m trong MVP)

| TĂ­nh nÄƒng | LĂ½ do |
|-----------|-------|
| DRM thÆ°Æ¡ng máº¡i (Widevine L1/L3, FairPlay) | Phá»©c táº¡p license server, chi phĂ­. |
| Live streaming | Out of scope â€“ chá»‰ VOD. |
| Offline download | Cáº§n DRM + cache phá»©c táº¡p. |
| Multi-tenant | Chá»‰ 1 tenant cho Ä‘á»“ Ă¡n. |
| Social login (Google, Facebook) | CĂ³ thá»ƒ thĂªm sau, khĂ´ng Æ°u tiĂªn MVP. |
| Payment / Subscription | KhĂ´ng cáº§n cho demo. |

---

# 4. Luá»“ng tráº£i nghiá»‡m (UX Flows)

## 4.1 Viewer flow â€“ Browse & Play (báº¯t buá»™c)

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”      â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”      â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”      â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”      â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  Login  â”‚ â”€â”€â”€â–º â”‚   Home   â”‚ â”€â”€â”€â–º â”‚ Movie Detailâ”‚ â”€â”€â”€â–º â”‚ Player â”‚ â”€â”€â”€â–º â”‚ Exit / Pause      â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜      â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜      â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜      â””â”€â”€â”€â”€â”€â”€â”€â”€â”˜      â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                                                                  â”‚
                                                                                  â–¼
                                                          â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                                                          â”‚ Home â†’ Continue Watching â†’ Resume â”‚
                                                          â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Chi tiáº¿t:**
1. Viewer má»Ÿ app â†’ Splash â†’ náº¿u chÆ°a login chuyá»ƒn Login / Register.
2. ÄÄƒng nháº­p thĂ nh cĂ´ng â†’ Home (hero + rails).
3. Chá»n poster â†’ Movie Detail (thĂ´ng tin chi tiáº¿t).
4. Nháº¥n **Play** â†’ Player (HLS stream).
5. Xem 30 giĂ¢y â†’ ThoĂ¡t (progress 30s saved).
6. Má»Ÿ app láº¡i â†’ Home â†’ rail "Continue Watching" â†’ chá»n phim â†’ Resume tá»« ~30s.

## 4.2 Viewer flow â€“ Search & My List

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”      â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”      â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”      â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  Home  â”‚ â”€â”€â”€â–º â”‚   Search    â”‚ â”€â”€â”€â–º â”‚ Movie Detailâ”‚ â”€â”€â”€â–º â”‚ Add List â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”˜      â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜      â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜      â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                                                 â”‚
                                                                 â–¼
                              â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                              â”‚ My List screen â†’ Select movie â†’ Play       â”‚
                              â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Chi tiáº¿t:**
1. Tá»« Home, nháº¥n icon Search (hoáº·c tab).
2. Nháº­p keyword â†’ káº¿t quáº£ danh sĂ¡ch.
3. Chá»n 1 phim â†’ Detail â†’ nháº¥n **Add to My List** (icon bookmark/heart).
4. VĂ o screen My List â†’ danh sĂ¡ch Ä‘Ă£ lÆ°u â†’ nháº¥n Play.

## 4.3 Admin flow â€“ Upload & Encode

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Admin Login â”‚ â”€â”€â–º â”‚ Create Movie â”‚ â”€â”€â–º â”‚ Upload MP4    â”‚ â”€â”€â–º â”‚ Processing   â”‚ â”€â”€â–º â”‚ Ready       â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                                                                            â”‚
                                                                                            â–¼
                                                                      â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                                                                      â”‚ Publish â†’ Viewer sees on Home â”‚
                                                                      â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Chi tiáº¿t:**
1. Admin login CMS (role check).
2. Nháº¥n **Create Movie** â†’ Ä‘iá»n title, description, genres â†’ Save (draft).
3. VĂ o trang edit â†’ Upload Thumbnail + Upload MP4.
4. Sau upload MP4, API trigger encode job â†’ status = `processing`.
5. Worker encode xong â†’ callback â†’ status = `ready`.
6. Admin nháº¥n **Publish** â†’ `movie_status = published`.
7. Viewer má»Ÿ app â†’ Phim hiá»ƒn thá»‹ trĂªn Home (vĂ¬ published + ready).

---

# 5. Danh sĂ¡ch mĂ n hĂ¬nh & yĂªu cáº§u UI

## 5.1 Mobile screens

| # | Screen | MĂ´ táº£ | UI Highlights |
|---|--------|-------|---------------|
| 1 | Splash | Logo + loading animation (optional). | Dark background, logo center. |
| 2 | Login / Register | Form email, password; toggle login â†” register. | Dark theme, Netflix-style red accent, input validation. |
| 3 | Home | Hero banner (carousel/auto-slide), rails (Continue Watching, Trending, Genre Xâ€¦). | Poster 2:3 hoáº·c 16:9, horizontal scroll, skeleton loading. |
| 4 | Search | Search bar, real-time hoáº·c debounce, grid/list káº¿t quáº£. | Keyboard auto-focus, empty state "KhĂ´ng tĂ¬m tháº¥y". |
| 5 | Movie Detail | Backdrop image, poster, title, meta (year, duration, genres), synopsis, buttons (Play, My List, Share). | Gradient overlay, parallax scroll (optional). |
| 6 | Player | Full-screen, controls: play/pause, seek bar, time, quality (optional), back. | Auto-hide controls sau 3s, orientation landscape. |
| 7 | My List | List / grid cĂ¡c phim Ä‘Ă£ bookmark. | Remove button, empty state. |
| 8 | Settings / Profile | Logout, version, (optional) profile switch. | Simple list. |

**YĂªu cáº§u chung:**
- **Dark theme**: background `#0d0d0d` hoáº·c tÆ°Æ¡ng Ä‘Æ°Æ¡ng; text tráº¯ng/xĂ¡m.
- **Poster rails**: horizontal `FlatList` hoáº·c `ScrollView`, poster rounded corners.
- **Skeleton loading**: placeholder shimmer khi táº£i dá»¯ liá»‡u.
- **Responsive**: hoáº¡t Ä‘á»™ng cáº£ Android & iOS (Expo managed workflow).

## 5.2 Admin screens

| # | Screen | MĂ´ táº£ |
|---|--------|-------|
| 1 | Login | Form username/password, redirect náº¿u Ä‘Ă£ cĂ³ session. |
| 2 | Movie List | Table: thumbnail nhá», title, status (draft/published), encode_status badge, actions (edit, delete). Pagination. |
| 3 | Movie Create / Edit | Form fields: title, description, genres (multi-select), status select. Sau save chuyá»ƒn qua tab Upload. |
| 4 | Upload & Status | Dropzone thumbnail, dropzone video; progress bar; badge encode_status realtime. NĂºt Publish/Unpublish. |
| 5 | Dashboard (optional) | Cards: tá»•ng phim, tá»•ng views, top 5 phim. Chart Ä‘Æ¡n giáº£n (optional). |

**YĂªu cáº§u chung:**
- **Framework**: Next.js (App Router) + shadcn/ui hoáº·c Ant Design.
- **Dark theme** preferred (hoáº·c tuá»³ chá»n).
- **Responsive** Ă­t nháº¥t tablet + desktop.

---

# 6. Dá»¯ liá»‡u & quy táº¯c nghiá»‡p vá»¥

## 6.1 Entities & fields (má»©c PRD)

> Chi tiáº¿t schema xem `DATABASE_SCHEMA.md`. DÆ°á»›i Ä‘Ă¢y lĂ  tá»•ng quan.

### User
| Field | Type | Note |
|-------|------|------|
| id | UUID | PK |
| email | string | unique |
| password_hash | string | bcrypt |
| role | enum | `viewer` / `admin` |
| created_at | timestamp | |

### Movie
| Field | Type | Note |
|-------|------|------|
| id | UUID | PK |
| title | string | |
| description | text | |
| poster_url | string | URL thumbnail |
| backdrop_url | string | optional hero image |
| duration_seconds | int | tá»•ng thá»i lÆ°á»£ng video |
| release_year | int | optional |
| movie_status | enum | `draft` / `published` |
| encode_status | enum | `pending` / `processing` / `ready` / `failed` |
| playback_url | string | m3u8 URL khi ready |
| created_at | timestamp | |
| updated_at | timestamp | |

### Genre
| Field | Type |
|-------|------|
| id | UUID |
| name | string |
| slug | string |

### MovieGenre (join table)
| Field | Type |
|-------|------|
| movie_id | UUID FK |
| genre_id | UUID FK |

### Favorite
| Field | Type |
|-------|------|
| id | UUID |
| user_id | UUID FK |
| movie_id | UUID FK |
| created_at | timestamp |

### WatchHistory
| Field | Type | Note |
|-------|------|------|
| id | UUID | |
| user_id | UUID FK | |
| movie_id | UUID FK | |
| progress_seconds | int | vá»‹ trĂ­ Ä‘Ă£ xem |
| duration_seconds | int | tá»•ng thá»i lÆ°á»£ng (denormalize) |
| completed | boolean | Ä‘Ă£ xem xong? |
| updated_at | timestamp | |

### Upload (optional tracking)
| Field | Type |
|-------|------|
| id | UUID |
| movie_id | UUID FK |
| file_key | string |
| file_type | enum | `video` / `thumbnail` |
| status | enum | `uploading` / `uploaded` / `failed` |
| created_at | timestamp |

### EncodeJob (optional)
| Field | Type |
|-------|------|
| id | UUID |
| movie_id | UUID FK |
| input_key | string |
| output_prefix | string |
| status | enum | `pending` / `processing` / `completed` / `failed` |
| started_at | timestamp |
| completed_at | timestamp |
| error_message | text |

## 6.2 Business rules

| # | Rule |
|---|------|
| BR-01 | **Viewer chá»‰ tháº¥y phim** khi `movie_status = 'published'` **AND** `encode_status = 'ready'`. |
| BR-02 | **Continue Watching** hiá»ƒn thá»‹ phim cĂ³ `progress_seconds > 0` **AND** `completed = false`. |
| BR-03 | **HoĂ n thĂ nh (completed)** khi `progress_seconds >= 0.9 * duration_seconds` (90%). |
| BR-04 | **Cáº­p nháº­t progress**: client gá»­i progress má»—i **5 giĂ¢y** hoáº·c khi **pause / exit**. |
| BR-05 | **Favorites khĂ´ng trĂ¹ng**: má»—i user + movie chá»‰ cĂ³ 1 record; thĂªm láº¡i thĂ¬ ignore hoáº·c error. |
| BR-06 | **XĂ³a phim (admin)**: soft delete hoáº·c khĂ´ng cho xĂ³a náº¿u Ä‘ang published (tuá»³ impl). |
| BR-07 | **Upload presigned URL** chá»‰ cáº¥p khi user cĂ³ role admin vĂ  movie thuá»™c quyá»n. |
| BR-08 | **Encode job** chá»‰ trigger khi upload video hoĂ n thĂ nh (client gá»i `POST /movies/:id/upload-complete`; alias deprecated: `/upload/complete/:movieId`). |

---

# 7. YĂªu cáº§u phi chá»©c nÄƒng (NFR)

## 7.1 Hiá»‡u nÄƒng

| Metric | Má»¥c tiĂªu | Ghi chĂº |
|--------|----------|---------|
| Home load time | â‰¤ 2 s (warm cache) | Sá»­ dá»¥ng React Query / SWR cache. |
| API response (list) | â‰¤ 500 ms p95 | Pagination, index DB. |
| Time-to-first-frame (TTFF) | â‰¤ 3 s WiFi | Player buffer settings. |
| Adaptive streaming | Buffer â‰¥ 10 s trÆ°á»›c khi play | Pre-buffer segment. |

**Caching:**
- Mobile: cache danh sĂ¡ch movies, genres (TTL 5 phĂºt).
- API: response cache (Redis hoáº·c in-memory) cho public endpoints.

## 7.2 Tin cáº­y & lá»—i

- **KhĂ´ng crash khi máº¥t máº¡ng**: detect network offline, hiá»ƒn thá»‹ banner "KhĂ´ng cĂ³ káº¿t ná»‘i".
- **Retry há»£p lĂ½**: API call retry 2â€“3 láº§n vá»›i exponential backoff (react-query built-in).
- **Graceful degradation**: náº¿u hero API fail, váº«n render rails; náº¿u rail fail, hiá»ƒn thá»‹ error inline.
- **Encode fail**: job retry 1 láº§n; náº¿u váº«n fail, status = `failed`, admin cĂ³ thá»ƒ re-trigger.

## 7.3 Báº£o máº­t (má»©c Ä‘á»“ Ă¡n)

| Háº¡ng má»¥c | CĂ¡ch xá»­ lĂ½ |
|----------|------------|
| Authentication | JWT access token (15â€“60 phĂºt) + refresh token (7 ngĂ y). LÆ°u secure storage trĂªn mobile. |
| Authorization | Middleware check role: `admin` má»›i gá»i Ä‘Æ°á»£c CMS endpoints. |
| Password | Hash bcrypt, khĂ´ng lÆ°u plain text. |
| Upload presigned | Validate `Content-Type` (video/mp4, image/*), max size (e.g., 2 GB video, 5 MB thumbnail). |
| Stream "báº£o vá»‡ nháº¹" | Chá»‰ user login má»›i gá»i Ä‘Æ°á»£c `/stream/:movieId`; tráº£ vá» signed URL vá»›i TTL 1â€“2 giá» hoáº·c stream ticket. |
| CORS | Chá»‰ cho phĂ©p origin CMS domain. |
| Rate limit | CÆ¡ báº£n 100 req/min per IP (optional). |

## 7.4 Logging / Observability (má»©c Ä‘á»“ Ă¡n)

| Loáº¡i | Ná»™i dung log |
|------|--------------|
| API error | requestId, userId, path, status, error message. |
| Encode job | jobId, movieId, start time, end time, duration, status, error (náº¿u cĂ³). |
| Auth events | login success/fail, refresh, logout. |
| Playback (optional) | play/pause/seek event (analytics purpose). |

CĂ´ng cá»¥ gá»£i Ă½: `pino` logger, Logto/Seq/CloudWatch (deploy), hoáº·c Ä‘Æ¡n giáº£n console JSON log.

---

# 8. Acceptance Criteria (Definition of Done)

## 8.1 Viewer â€“ Auth

| AC | TiĂªu chĂ­ |
|----|----------|
| AC-AUTH-01 | ÄÄƒng kĂ½ vá»›i email há»£p lá»‡ + password â‰¥ 6 kĂ½ tá»± thĂ nh cĂ´ng; lÆ°u JWT. |
| AC-AUTH-02 | ÄÄƒng nháº­p sai password â†’ hiá»ƒn thá»‹ lá»—i, khĂ´ng crash. |
| AC-AUTH-03 | Token háº¿t háº¡n â†’ tá»± refresh; náº¿u refresh fail â†’ logout vá» Login screen. |

## 8.2 Viewer â€“ Home & Browse

| AC | TiĂªu chĂ­ |
|----|----------|
| AC-HOME-01 | Home hiá»ƒn thá»‹ hero banner láº¥y tá»« featured movie. |
| AC-HOME-02 | CĂ³ tá»‘i thiá»ƒu 3 rails (Continue Watching náº¿u cĂ³, Trending / Genre X / Genre Y). |
| AC-HOME-03 | Nháº¥n poster â†’ chuyá»ƒn Detail screen, dá»¯ liá»‡u Ä‘Ăºng. |

## 8.3 Viewer â€“ Search

| AC | TiĂªu chĂ­ |
|----|----------|
| AC-SEARCH-01 | Nháº­p keyword â†’ káº¿t quáº£ hiá»ƒn thá»‹ trong 1 s (hoáº·c loading state). |
| AC-SEARCH-02 | Káº¿t quáº£ = 0 â†’ hiá»ƒn thá»‹ "KhĂ´ng tĂ¬m tháº¥y phim nĂ o". |

## 8.4 Viewer â€“ Detail & Play

| AC | TiĂªu chĂ­ |
|----|----------|
| AC-DETAIL-01 | Hiá»ƒn thá»‹ poster, title, synopsis, genres, duration, Play button. |
| AC-DETAIL-02 | Nháº¥n Play â†’ Player má»Ÿ, stream báº¯t Ä‘áº§u trong â‰¤ 3 s (WiFi). |
| AC-PLAY-01 | Play/pause/seek hoáº¡t Ä‘á»™ng chĂ­nh xĂ¡c. |
| AC-PLAY-02 | Xem 30 s â†’ thoĂ¡t â†’ má»Ÿ láº¡i â†’ resume gáº§n Ä‘Ăºng vá»‹ trĂ­ (sai lá»‡ch â‰¤ 5 s). |

## 8.5 Viewer â€“ Continue Watching & My List

| AC | TiĂªu chĂ­ |
|----|----------|
| AC-CW-01 | Phim xem dá»Ÿ (progress > 0 & chÆ°a complete) xuáº¥t hiá»‡n trong rail "Continue Watching". |
| AC-CW-02 | Phim xem xong (â‰¥ 90 %) khĂ´ng xuáº¥t hiá»‡n á»Ÿ Continue Watching. |
| AC-LIST-01 | Add movie vĂ o My List â†’ danh sĂ¡ch My List cĂ³ phim Ä‘Ă³. |
| AC-LIST-02 | Remove movie khá»i My List â†’ biáº¿n máº¥t khá»i danh sĂ¡ch, khĂ´ng lá»—i. |
| AC-LIST-03 | Add trĂ¹ng movie â†’ khĂ´ng duplicate, cĂ³ thá»ƒ toast "ÄĂ£ cĂ³ trong danh sĂ¡ch". |

## 8.6 Viewer â€“ Error / Loading

| AC | TiĂªu chĂ­ |
|----|----------|
| AC-ERR-01 | Máº¥t máº¡ng khi load Home â†’ hiá»ƒn thá»‹ error state + Retry button. |
| AC-ERR-02 | Playback lá»—i (404 m3u8) â†’ hiá»ƒn thá»‹ lá»—i, khĂ´ng crash. |

## 8.7 Admin â€“ Movie Management

| AC | TiĂªu chĂ­ |
|----|----------|
| AC-ADMIN-01 | Login vá»›i role viewer â†’ redirect hoáº·c 403. |
| AC-ADMIN-02 | Táº¡o movie draft thĂ nh cĂ´ng, xuáº¥t hiá»‡n trong list. |
| AC-ADMIN-03 | Edit movie â†’ save â†’ dá»¯ liá»‡u update Ä‘Ăºng. |
| AC-ADMIN-04 | Delete movie â†’ xoĂ¡ / áº©n khá»i list (tuá»³ soft delete). |

## 8.8 Admin â€“ Upload & Encode

| AC | TiĂªu chĂ­ |
|----|----------|
| AC-UPLOAD-01 | Upload video â†’ progress bar hiá»ƒn thá»‹ â†’ hoĂ n thĂ nh â†’ encode_status = `pending` rá»“i `processing`. |
| AC-UPLOAD-02 | Encode xong â†’ encode_status = `ready`, playback_url cĂ³ giĂ¡ trá»‹. |
| AC-UPLOAD-03 | Encode fail â†’ encode_status = `failed`, hiá»ƒn thá»‹ message. |
| AC-PUB-01 | Publish movie (draft + ready) â†’ viewer tháº¥y trĂªn Home. |
| AC-PUB-02 | Unpublish â†’ viewer khĂ´ng tháº¥y ná»¯a (filter láº¡i). |

---

# 9. Káº¿ hoáº¡ch 8 tuáº§n (Milestones)

| Tuáº§n | Má»¥c tiĂªu | Deliverables | Checkpoint |
|------|----------|--------------|------------|
| **1** | Khá»Ÿi táº¡o repo, thiáº¿t káº¿ DB, setup CI | Monorepo (pnpm + Turborepo), Prisma schema, migration cháº¡y. ERD hoĂ n chá»‰nh. | DB migrate thĂ nh cĂ´ng, seed data. |
| **2** | API core + Admin UI skeleton | Auth endpoints, Movie CRUD API, Admin login + list page. | Postman test API, Admin list hiá»ƒn thá»‹ dá»¯ liá»‡u seed. |
| **3** | Upload flow + Encode worker skeleton | Presigned URL API, MinIO setup, Worker consume job (chÆ°a encode tháº­t). | Upload file thĂ nh cĂ´ng lĂªn MinIO, job log nháº­n. |
| **4** | FFmpeg encode + HLS output | Worker encode MP4 â†’ HLS (360p, 720p), lÆ°u output, callback status. | Encode 1 file demo, copy m3u8 link má»Ÿ Ä‘Æ°á»£c trĂªn browser. |
| **5** | Mobile app â€“ Auth + Home + Search | Expo setup, Login/Register, Home (hero + rails), Search. | App cháº¡y Expo Go, login, tháº¥y danh sĂ¡ch rails, search hoáº¡t Ä‘á»™ng. |
| **6** | Mobile â€“ Detail + Player + Resume | Detail screen, HLS player (expo-av hoáº·c react-native-video), progress save & resume. | Play video, thoĂ¡t, resume Ä‘Ăºng vá»‹ trĂ­. |
| **7** | My List + Polish UI/UX + Bug fix | Favorites, Continue Watching rail sáº¯p xáº¿p láº¡i, skeleton loaders, error states. | Flow hoĂ n chá»‰nh end-to-end: upload â†’ encode â†’ publish â†’ viewer play + resume. |
| **8** | á»”n Ä‘á»‹nh, deploy, docs, demo | Deploy (Railway / Render / VPS), README, ARCHITECTURE.md, video demo, bĂ¡o cĂ¡o. | Demo 5 phĂºt thĂ nh cĂ´ng, bĂ¡o cĂ¡o ná»™p. |

---

# 10. Ká»‹ch báº£n demo cuá»‘i ká»³ (3â€“5 phĂºt)

> Má»¥c tiĂªu: Chá»©ng minh luá»“ng **upload â†’ encode â†’ publish â†’ viewer play â†’ resume**.

### Pháº§n 1: Admin táº¡o & upload (1.5 phĂºt)

1. Má»Ÿ browser â†’ CMS login (admin@NETFLAT.local).
2. Nháº¥n **Create Movie** â†’ Ä‘iá»n title "Demo Video", description, chá»n genres.
3. Save â†’ chuyá»ƒn tab Upload.
4. Chá»n file `demo_video.mp4` (30 giĂ¢y), upload â†’ progress bar â†’ xong.
5. MĂ n hĂ¬nh hiá»ƒn thá»‹ `encode_status = processing` (hoáº·c chá» vĂ i giĂ¢y tháº¥y chuyá»ƒn `ready`).
6. Nháº¥n **Publish**.

### Pháº§n 2: Viewer xem & resume (2 phĂºt)

1. Má»Ÿ app Expo Go trĂªn Ä‘iá»‡n thoáº¡i (hoáº·c simulator).
2. Login (`viewer@NETFLAT.local`).
3. Home â†’ tháº¥y "Demo Video" xuáº¥t hiá»‡n á»Ÿ rail Trending (hoáº·c hero).
4. Nháº¥n â†’ Detail â†’ nháº¥n **Play**.
5. Xem ~15 giĂ¢y â†’ nháº¥n **Back**.
6. Vá» Home â†’ rail **Continue Watching** xuáº¥t hiá»‡n "Demo Video".
7. Nháº¥n láº¡i â†’ Player resume tá»« ~15 s.

### Pháº§n 3: Bonus (náº¿u cĂ²n thá»i gian)

- Search "Demo" â†’ káº¿t quáº£ hiá»ƒn thá»‹.
- Add to My List â†’ vĂ o My List xĂ¡c nháº­n.
- Hiá»ƒn thá»‹ subtitles (náº¿u cĂ³).

---

# 11. TiĂªu chĂ­ cháº¥m Ä‘iá»ƒm (Scoring Rubric)

## Rubric chĂ­nh â€“ Tá»•ng 100 Ä‘iá»ƒm

| Háº¡ng má»¥c | Äiá»ƒm | TiĂªu chĂ­ chi tiáº¿t |
|----------|------|-------------------|
| **UX/UI "Netflix vibe"** | 20 | Dark theme, poster rails, skeleton loaders, hero banner, chuyá»ƒn cáº£nh mÆ°á»£t mĂ , error/empty states Ä‘áº¹p. |
| **TĂ­nh nÄƒng cá»‘t lĂµi MVP** | 30 | Login, Home, Search, Detail, Play, Resume, Continue Watching, My List hoáº¡t Ä‘á»™ng Ä‘áº§y Ä‘á»§ theo AC. |
| **Streaming HLS + Encode Pipeline** | 25 | Encode MP4 â†’ HLS multi-bitrate thĂ nh cĂ´ng, playback mÆ°á»£t, buffer há»£p lĂ½, quality switch (náº¿u cĂ³). |
| **Backend API + DB + PhĂ¢n quyá»n** | 15 | RESTful chuáº©n, JWT auth, RBAC admin/viewer, migration, seed data, logging cÆ¡ báº£n. |
| **Cháº¥t lÆ°á»£ng triá»ƒn khai** | 10 | Error handling, logging, docs (README, ARCHITECTURE), deploy (local hoáº·c cloud), code sáº¡ch. |
| **Tá»•ng** | **100** | |

## Bonus â€“ Tá»‘i Ä‘a +10 Ä‘iá»ƒm

| Bonus | Äiá»ƒm | Äiá»u kiá»‡n |
|-------|------|-----------|
| Subtitles (VTT) | +2 | Upload VTT, hiá»ƒn thá»‹ toggle on/off trong player. |
| Multiple profiles | +2 | Switch profile, history/favorites tĂ¡ch biá»‡t. |
| Simple recommendation | +2 | Rail "VĂ¬ báº¡n Ä‘Ă£ xem X" dá»±a trĂªn genre. |
| Analytics dashboard | +2 | Admin xem views, top 10 movies. |
| CI/CD pipeline | +2 | GitHub Actions build + test + deploy tá»± Ä‘á»™ng. |
| **Tá»•ng bonus** | **+10 max** | |

---

# 12. Rá»§i ro & phÆ°Æ¡ng Ă¡n giáº£m thiá»ƒu

| # | Rá»§i ro | Kháº£ nÄƒng | áº¢nh hÆ°á»Ÿng | PhÆ°Æ¡ng Ă¡n giáº£m thiá»ƒu |
|---|--------|----------|-----------|----------------------|
| R-01 | **FFmpeg encode lá»—i / lĂ¢u** | Trung bĂ¬nh | Cao â€“ khĂ´ng cĂ³ video Ä‘á»ƒ play | Sá»­ dá»¥ng preset `fast` hoáº·c `veryfast`, giáº£m bitrate. Test video ngáº¯n 30 s. ThĂªm retry job 1 láº§n. |
| R-02 | **HLS playback khĂ¡c nhau iOS/Android** | Trung bĂ¬nh | Trung bĂ¬nh | DĂ¹ng thÆ° viá»‡n cross-platform (`expo-av` hoáº·c `react-native-video`). Test cáº£ 2 platform sá»›m. |
| R-03 | **Networking Expo â€“ localhost vs IP LAN** | Cao (dev) | Tháº¥p | DĂ¹ng `EXPO_PUBLIC_API_URL` env, cháº¡y API trĂªn IP LAN hoáº·c tunnel (ngrok). |
| R-04 | **Storage permissions (Android)** | Tháº¥p | Tháº¥p | Streaming khĂ´ng cáº§n quyá»n storage; náº¿u download thĂ¬ xin permission. |
| R-05 | **Presigned URL háº¿t háº¡n giá»¯a upload** | Tháº¥p | Trung bĂ¬nh | TTL presigned = 15â€“30 phĂºt Ä‘á»§ cho file â‰¤ 2 GB. Retry presigned náº¿u fail. |
| R-06 | **Team nhá» (1â€“3 ngÆ°á»i), deadline gáº¥p** | Cao | Cao | TuĂ¢n thá»§ MoSCoW; cut SHOULD/COULD náº¿u thiáº¿u thá»i gian. Daily sync 15 phĂºt. |
| R-07 | **MinIO / Redis crash local** | Tháº¥p | Trung bĂ¬nh | Docker compose restart policy; dev test docker-compose up trÆ°á»›c. |

---

# 13. TĂ³m táº¯t & next steps

## TĂ³m táº¯t

**NETFLAT** lĂ  á»©ng dá»¥ng xem video tá»± sáº£n xuáº¥t vá»›i tráº£i nghiá»‡m "Netflix vibe" dĂ nh cho demo Ä‘á»“ Ă¡n tá»‘t nghiá»‡p.  
MVP bao gá»“m:
- **Mobile app** (Expo React Native): login, home rails, search, detail, HLS player, resume, continue watching, my list.
- **Admin CMS** (Next.js): movie CRUD, upload, theo dĂµi encode, publish.
- **Backend API** (NestJS + Prisma + PostgreSQL): RESTful, JWT, RBAC.
- **Encode pipeline** (BullMQ + FFmpeg): MP4 â†’ HLS 360p/720p, lÆ°u MinIO.

Thá»i gian triá»ƒn khai 8 tuáº§n vá»›i checkpoint rĂµ rĂ ng. Scoring rubric 100 Ä‘iá»ƒm + 10 bonus Ä‘áº£m báº£o Ä‘Ă¡nh giĂ¡ khĂ¡ch quan.

## Next steps

1. **Táº¡o `ARCHITECTURE.md`**: sÆ¡ Ä‘á»“ há»‡ thá»‘ng, tech stack chi tiáº¿t, luá»“ng encode.
2. **Táº¡o `DATABASE_SCHEMA.md`**: ERD, Prisma schema.
3. **Táº¡o `OPENAPI.yaml`**: spec API endpoints.
4. **Khá»Ÿi táº¡o monorepo**: `pnpm init`, Turborepo config, workspace packages.
5. **Thiáº¿t láº­p CI**: lint + typecheck + test (GitHub Actions).

---

> **Ghi chĂº:** TĂ i liá»‡u nĂ y lĂ  phiĂªn báº£n 1.0, cĂ³ thá»ƒ cáº­p nháº­t khi cĂ³ feedback tá»« giáº£ng viĂªn hoáº·c thay Ä‘á»•i scope.
