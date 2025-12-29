# Auth Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the auth flow with Spotify OAuth redirect and NetEase QR fallback to manual cookie input.

**Architecture:** Backend redirects to frontend after Spotify OAuth instead of returning JSON. NetEase QR modal gets an expandable manual cookie input that auto-expands on QR generation failure.

**Tech Stack:** Spring Boot (backend), React + TypeScript (frontend), MockMvc (testing)

---

## Task 1: Update CORS Configuration

**Files:**
- Modify: `spotease-backend/src/main/resources/application-dev.yml:22-23`

**Step 1: Update allowed origins**

Change the CORS config from `localhost` to `127.0.0.1`:

```yaml
# CORS for local frontend
cors:
  allowed-origins: http://127.0.0.1:5173
```

**Step 2: Verify backend still starts**

Run: `cd spotease-backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`

Expected: Application starts without errors

**Step 3: Commit**

```bash
git add spotease-backend/src/main/resources/application-dev.yml
git commit -m "config: update CORS to use 127.0.0.1 for Spotify OAuth compatibility"
```

---

## Task 2: Update Spotify Callback to Redirect

**Files:**
- Modify: `spotease-backend/src/main/java/com/spotease/controller/AuthController.java:31-66`
- Test: `spotease-backend/src/test/java/com/spotease/controller/AuthControllerTest.java`

**Step 1: Write failing test for redirect behavior**

Add to `AuthControllerTest.java`:

```java
@Test
void testSpotifyCallback_Success_RedirectsToFrontend() throws Exception {
    // Arrange
    MockHttpSession session = new MockHttpSession();
    session.setAttribute("spotify_oauth_state", "test-state");

    User user = new User();
    user.setId(1L);
    user.setEmail("test@example.com");

    when(authService.handleSpotifyCallback("test-code")).thenReturn(user);

    // Act & Assert
    mockMvc.perform(get("/api/auth/spotify/callback")
            .param("code", "test-code")
            .param("state", "test-state")
            .session(session))
        .andExpect(status().isFound())
        .andExpect(header().string("Location", "http://127.0.0.1:5173/"));

    verify(authService).handleSpotifyCallback("test-code");
}
```

**Step 2: Run test to verify it fails**

Run: `cd spotease-backend && ./mvnw test -Dtest=AuthControllerTest#testSpotifyCallback_Success_RedirectsToFrontend`

Expected: FAIL - status is 200 OK (JSON response), not 302 Found

**Step 3: Update AuthController to redirect**

In `AuthController.java`, replace lines 55-65:

```java
    // Clear OAuth state after validation (one-time use)
    session.removeAttribute("spotify_oauth_state");

    // Handle OAuth callback
    User user = authService.handleSpotifyCallback(code);

    // Store user in session
    session.setAttribute("userId", user.getId());

    // Redirect to frontend
    return ResponseEntity.status(HttpStatus.FOUND)
        .header("Location", "http://127.0.0.1:5173/")
        .build();
  }
```

**Step 4: Run test to verify it passes**

Run: `cd spotease-backend && ./mvnw test -Dtest=AuthControllerTest#testSpotifyCallback_Success_RedirectsToFrontend`

Expected: PASS

**Step 5: Commit**

```bash
git add spotease-backend/src/main/java/com/spotease/controller/AuthController.java
git add spotease-backend/src/test/java/com/spotease/controller/AuthControllerTest.java
git commit -m "feat: redirect to frontend after Spotify OAuth instead of JSON"
```

---

## Task 3: Add Manual Cookie Endpoint

**Files:**
- Modify: `spotease-backend/src/main/java/com/spotease/controller/AuthController.java`
- Test: `spotease-backend/src/test/java/com/spotease/controller/AuthControllerTest.java`

**Step 1: Write failing test for cookie endpoint**

Add to `AuthControllerTest.java`:

```java
@Test
void testSubmitNeteaseCookie_Success() throws Exception {
    // Arrange
    User user = new User();
    user.setId(1L);
    user.setNeteaseUserId("12345");

    when(authService.handleNeteaseQRLogin(1L, "MUSIC_U=test_cookie"))
        .thenReturn(user);

    // Act & Assert
    mockMvc.perform(post("/api/auth/netease/cookie")
            .contentType("application/json")
            .content("{\"cookie\": \"MUSIC_U=test_cookie\"}")
            .session(authenticatedSession))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success", is(true)));

    verify(authService).handleNeteaseQRLogin(1L, "MUSIC_U=test_cookie");
}

@Test
void testSubmitNeteaseCookie_Unauthorized() throws Exception {
    // Act & Assert
    mockMvc.perform(post("/api/auth/netease/cookie")
            .contentType("application/json")
            .content("{\"cookie\": \"MUSIC_U=test_cookie\"}"))
        .andExpect(status().isUnauthorized());

    verifyNoInteractions(authService);
}

@Test
void testSubmitNeteaseCookie_MissingCookie() throws Exception {
    // Act & Assert
    mockMvc.perform(post("/api/auth/netease/cookie")
            .contentType("application/json")
            .content("{\"cookie\": \"\"}")
            .session(authenticatedSession))
        .andExpect(status().isBadRequest());

    verifyNoInteractions(authService);
}
```

**Step 2: Run test to verify it fails**

Run: `cd spotease-backend && ./mvnw test -Dtest=AuthControllerTest#testSubmitNeteaseCookie_Success`

Expected: FAIL - 404 Not Found (endpoint doesn't exist)

**Step 3: Add DTO for request**

Create `spotease-backend/src/main/java/com/spotease/dto/NeteaseCookieRequest.java`:

```java
package com.spotease.dto;

import lombok.Data;

@Data
public class NeteaseCookieRequest {
    private String cookie;
}
```

**Step 4: Add endpoint to AuthController**

Add after the `checkNeteaseQRStatus` method:

```java
  @PostMapping("/netease/cookie")
  public ResponseEntity<?> submitNeteaseCookie(
      @RequestBody NeteaseCookieRequest request,
      HttpSession session) {

    Long userId = getUserIdFromSession(session);
    if (userId == null) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }

    if (request.getCookie() == null || request.getCookie().trim().isEmpty()) {
      return ResponseEntity.badRequest()
          .body(Map.of("error", "Missing cookie"));
    }

    try {
      authService.handleNeteaseQRLogin(userId, request.getCookie());
      return ResponseEntity.ok(Map.of("success", true));
    } catch (Exception e) {
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
          .body(Map.of("error", "Failed to save cookie"));
    }
  }
```

Add import at top:
```java
import com.spotease.dto.NeteaseCookieRequest;
```

**Step 5: Run tests to verify they pass**

Run: `cd spotease-backend && ./mvnw test -Dtest=AuthControllerTest#testSubmitNeteaseCookie*`

Expected: All 3 tests PASS

**Step 6: Commit**

```bash
git add spotease-backend/src/main/java/com/spotease/dto/NeteaseCookieRequest.java
git add spotease-backend/src/main/java/com/spotease/controller/AuthController.java
git add spotease-backend/src/test/java/com/spotease/controller/AuthControllerTest.java
git commit -m "feat: add POST /api/auth/netease/cookie for manual cookie input"
```

---

## Task 4: Add Frontend API Method

**Files:**
- Modify: `spotease-frontend/src/api/auth.ts`

**Step 1: Add submitNeteaseCookie method**

Add to the `authApi` object:

```typescript
  submitNeteaseCookie: async (cookie: string): Promise<void> => {
    await apiClient.post("/api/auth/netease/cookie", { cookie });
  },
```

**Step 2: Commit**

```bash
git add spotease-frontend/src/api/auth.ts
git commit -m "feat: add submitNeteaseCookie API method"
```

---

## Task 5: Update NeteaseQRModal with Manual Input

**Files:**
- Modify: `spotease-frontend/src/components/auth/NeteaseQRModal.tsx`

**Step 1: Add state for manual input section**

Add after existing state declarations:

```typescript
const [showManualInput, setShowManualInput] = useState(false);
const [manualCookie, setManualCookie] = useState("");
const [isSubmitting, setIsSubmitting] = useState(false);
```

**Step 2: Add Textarea import**

Update imports to include Textarea (create if needed, or use HTML textarea):

```typescript
import { Textarea } from "@/components/ui/textarea";
```

**Step 3: Add submit handler**

Add after `generateQR` function:

```typescript
const handleManualSubmit = async () => {
  if (!manualCookie.trim()) {
    toast({
      title: "Error",
      description: "Please enter your NetEase cookie",
      variant: "destructive",
    });
    return;
  }

  try {
    setIsSubmitting(true);
    await authApi.submitNeteaseCookie(manualCookie);
    setStatus("success");
    toast({
      title: "Success",
      description: "NetEase Music connected successfully",
    });
    refetchAuth();
    setTimeout(() => onOpenChange(false), 1500);
  } catch (_error) {
    toast({
      title: "Error",
      description: "Failed to save cookie. Please check and try again.",
      variant: "destructive",
    });
  } finally {
    setIsSubmitting(false);
  }
};
```

**Step 4: Auto-expand on error**

Update the error handling in `generateQR`:

```typescript
} catch (_error) {
  setStatus("error");
  setShowManualInput(true); // Auto-expand manual input on QR failure
  toast({
    title: "Error",
    description: "Failed to generate QR code. You can enter your cookie manually below.",
    variant: "destructive",
  });
}
```

**Step 5: Add manual input UI**

Replace the entire `{status === "error" && (...)}` block and add manual input section after it:

```tsx
{status === "error" && (
  <div className="w-64 flex flex-col items-center justify-center gap-4">
    <p className="text-red-600">Failed to generate QR code</p>
    <Button onClick={generateQR} variant="outline" size="sm">
      Try Again
    </Button>
  </div>
)}

{/* Manual Cookie Input Section */}
{status !== "success" && (
  <div className="w-full border-t pt-4 mt-4">
    <button
      onClick={() => setShowManualInput(!showManualInput)}
      className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
    >
      {showManualInput ? "▼" : "▶"} Having trouble? Enter cookie manually
    </button>

    {showManualInput && (
      <div className="mt-3 space-y-3">
        <p className="text-xs text-gray-500">
          1. Log into music.163.com in your browser<br />
          2. Open DevTools (F12) → Application → Cookies<br />
          3. Copy the entire cookie value
        </p>
        <Textarea
          placeholder="Paste your NetEase cookie here..."
          value={manualCookie}
          onChange={(e) => setManualCookie(e.target.value)}
          className="min-h-[80px] text-xs"
        />
        <Button
          onClick={handleManualSubmit}
          disabled={isSubmitting || !manualCookie.trim()}
          className="w-full"
        >
          {isSubmitting ? "Connecting..." : "Connect with Cookie"}
        </Button>
      </div>
    )}
  </div>
)}
```

**Step 6: Verify the UI renders**

Run: `cd spotease-frontend && npm run dev`

Open `http://127.0.0.1:5173`, connect Spotify, then click "Connect NetEase" to verify:
- QR code displays (or error if backend times out)
- "Having trouble?" link appears below
- Clicking expands the manual input form
- Form has textarea and submit button

**Step 7: Commit**

```bash
git add spotease-frontend/src/components/auth/NeteaseQRModal.tsx
git commit -m "feat: add expandable manual cookie input to NetEase QR modal"
```

---

## Task 6: Create Textarea UI Component (if missing)

**Files:**
- Create: `spotease-frontend/src/components/ui/textarea.tsx`

**Step 1: Check if textarea exists**

Run: `ls spotease-frontend/src/components/ui/textarea.tsx`

If file exists, skip this task.

**Step 2: Create textarea component**

```typescript
import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
```

**Step 3: Commit**

```bash
git add spotease-frontend/src/components/ui/textarea.tsx
git commit -m "feat: add Textarea UI component"
```

---

## Task 7: Run Full Test Suite

**Step 1: Run backend tests**

Run: `cd spotease-backend && ./mvnw test`

Expected: All tests pass

**Step 2: Run frontend type check**

Run: `cd spotease-frontend && npm run build`

Expected: Build succeeds without errors

**Step 3: Manual E2E test**

1. Start backend: `cd spotease-backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`
2. Start frontend: `cd spotease-frontend && npm run dev`
3. Open `http://127.0.0.1:5173`
4. Click "Connect Spotify" → complete OAuth → should redirect back to landing
5. Verify "Spotify ✓ Connected" shows
6. Click "Connect NetEase" → modal opens
7. Click "Having trouble?" → manual input expands
8. Paste a valid NetEase cookie → click submit → should connect

---

## Summary

| Task | Description |
|------|-------------|
| 1 | Update CORS to 127.0.0.1 |
| 2 | Spotify callback redirects to frontend |
| 3 | Add POST /api/auth/netease/cookie endpoint |
| 4 | Add submitNeteaseCookie API method |
| 5 | Update NeteaseQRModal with manual input |
| 6 | Create Textarea component (if needed) |
| 7 | Run full test suite |
