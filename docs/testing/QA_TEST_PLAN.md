# NETFLAT Web - QA Functional Test Plan

## 1. Overview
- **Product**: NETFLAT Web (Frontend)
- **Scope**: functional E2E testing of critical user flows.
- **Environment**: Local Development (`http://localhost:3002`)
- **Browser**: Chrome (Primary)

## 2. Test Matrix

### Module A: Global & Navigation
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|=================|==========|
| A01 | Initial Load | Open `/` | Homepage loads, Hero visible, no console errors | Critical |
| A02 | Navigation | Click 'NETFLAT' logo | Redirects to `/` | Low |
| A03 | 404 Page | Open random url `/xyz` | Shows 404 Empty State (or redirects Home) | Medium |

### Module B: Home / Browse
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|=================|==========|
| B01 | Hero Banner | Check Hero content | Title, Desc, "Play" button visible | High |
| B02 | Featured Movie | Refresh page | Featured movie might rotate/statue stable | Medium |
| B03 | Rails Display | Check "Recently Added" | Horizontal scroll works, cards loaded | High |
| B04 | Continue Watching | Check if rail appears | Visible only if logged in + have history | High |

### Module C: Catalog & Genre
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|=================|==========|
| C01 | Genre Filter | Click "Action" pills | Grid updates, URL changes to `/genre/[id]`? | High |
| C02 | Grid Layout | Resize window | Grid adapts (Mobile: 1-2 cols, Desktop: 4-6) | Medium |

### Module D: Search
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|=================|==========|
| D01 | Search Query | Enter "Matrix" | Results appear (debounced?) | High |
| D02 | Empty Search | Enter "xyz123" | "No results" message displayed | Medium |

### Module E: Detail Page
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|=================|==========|
| E01 | Movie Info | Open `/movies/[id]` | Title, Year, Desc, Rating match API | Critical |
| E02 | Similar Movies | Scroll down | "More Like This" rail visible (Mocked) | Medium |
| E03 | Favorites | Click "Add to Favorites" | Button toggles, toast/notification? | High |

### Module F: Player
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|=================|==========|
| F01 | Playback | Click "Play" on Hero/Detail | Video player opens/overlays | Critical |
| F02 | Controls | Hover player | Play/Pause/Volume controls visible | Critical |

### Module G: Auth
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|=================|==========|
| G01 | Login UI | Open `/login` | Toggle Login/Register works | High |
| G02 | Login Success | Enter valid creds | Redir to Home, Navbar shows email | Critical |
| G03 | Register | Sign up new user | Auto-login or redirect to login | High |
| G04 | Logout | Click Logout | Token cleared, redir to Login | High |

### Module H: User Data
| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|=================|==========|
| H01 | My List | Add movie -> Go `/favorites` | Movie appears in list | High |
| H02 | Remove List | Remove from `/favorites` | Card disappears | High |

## 3. Test Data (Mock/Seed)
- **User**: `viewer@NETFLAT.local` / `viewer123`
- **Movies**: Relies on existing Backend Seed or Mocked `queries.ts`.
