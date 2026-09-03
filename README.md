# ReflectAI — User-Authenticated Multi-Turn Journaling with Gemini & Cloud Firestore

ReflectAI is a production-grade, privacy-first AI journaling and reflection web application. Built with **Firebase Authentication (Google Sign-In)**, **Cloud Firestore**, and **Gemini 3.6 Flash**, ReflectAI provides a grounded reflection partner for brainstorming, emotional clarity, and automated executive synthesis—with strict user data isolation.

---

## 🏛️ System Architecture & Threat Model Summary

| Threat Zone | Identified Risk | Production Countermeasures |
| :--- | :--- | :--- |
| **Input Surfaces** | Malicious injection in journal entries, oversized inputs, script tags. | Defensive schema parsing, string length limits, zero undefined values passed to Firestore driver. |
| **Planning & Reasoning** | Indirect prompt injection within reflections attempting prompt exfiltration. | Untrusted user data is strictly separated from system instructions in server-side API handlers. |
| **Tool Execution & API Layer** | Secret key leakage, unauthenticated API abuse. | Server-side proxy (`/api/reflect`, `/api/summarize`) with backend environment variable access and resilient 4-stage model fallback ladder (`gemini-3.6-flash` &rarr; `gemini-3.1-flash-lite` &rarr; `gemini-flash-latest` &rarr; `gemini-3.7-flash`). |
| **Memory & State** | Cross-user data leakage, unauthorized read/write access. | Owner-bound Firestore security rules (`/users/{userId}/interactions/{interactionId}` with `request.auth.uid == userId`). |
| **Inter-System Communication** | Insecure token handling, hardcoded API keys. | Federated Google Sign-In via Firebase Auth (no raw password storage), GCP Secret Manager integration. |

---

## 🚀 Step-by-Step Google Cloud Run Deployment Guide

### 1. Prerequisites & GCP API Enablement
Ensure you have the `gcloud` CLI installed and authenticated:
```bash
# Log in to Google Cloud
gcloud auth login

# Set active project
gcloud config set project YOUR_PROJECT_ID

# Enable required Google Cloud services
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  cloudbuild.googleapis.com
```

---

### 2. Secret Management Setup (Google Cloud Secret Manager)
Store the Gemini API Key securely in Secret Manager and grant Cloud Run runtime permissions:

```bash
# Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant the Cloud Run compute service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

### 3. Database Security Configuration (Cloud Firestore)
Deploy the owner-isolated security rules to Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /interactions/{interactionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Deploy the rules via Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

### 4. Cloud Run Build & Deployment Flow (Single-Step Deployment + Labeling)

You can deploy the container and apply the challenge verification label in **one single command**, avoiding errors from updating a service before it exists:

```bash
# Set your active project
gcloud config set project awesome-visitor-6dzmz

# Deploy and automatically apply verification label in one step
gcloud run deploy reflectai-journal \
  --source . \
  --region asia-southeast1 \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --port 3000
```

> **Note:** If deploying to a different region (such as `us-central1`), replace `asia-southeast1` consistently across all commands.

---

### 5. Applying the Verification Resource Label (Existing Service)

If your service `reflectai-journal` is already deployed and running, update its resource label with:

```bash
gcloud run services update reflectai-journal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=asia-southeast1
```

---

### 🔧 Troubleshooting: `Permission 'run.services.update' denied (or resource may not exist)`

If you encounter the error:
`Permission 'run.services.update' denied on resource 'namespaces/awesome-visitor-6dzmz/services/reflectai-journal' (or resource may not exist)`

This occurs due to one of three common causes:

1. **The service does not exist yet:** `gcloud run services update` can only update an *already existing* service. If you have not run `gcloud run deploy reflectai-journal` first, Cloud Run returns `permission denied (or resource may not exist)`. 
   - **Fix:** Use the single-step deploy command in Section 4 above, which passes `--update-labels=dev-tutorial=cloud-run-ai-challenge` directly during `gcloud run deploy`.

2. **Region mismatch:** If the service was deployed in `asia-southeast1` (or another region) and the update command was run without `--region` or with a different region (e.g., `us-central1`), Cloud Run cannot find the service.
   - **Fix:** Explicitly pass `--region asia-southeast1` (or your chosen region) to match your service location.

3. **Missing IAM Permissions for your account (`ss736956@gmail.com`):**
   - Grant Cloud Run Admin and Service Account User permissions on project `awesome-visitor-6dzmz`:
   ```bash
   # Grant Cloud Run Admin to your user
   gcloud projects add-iam-policy-binding awesome-visitor-6dzmz \
     --member="user:ss736956@gmail.com" \
     --role="roles/run.admin"

   # Grant Service Account User to act as the runtime service account
   gcloud projects add-iam-policy-binding awesome-visitor-6dzmz \
     --member="user:ss736956@gmail.com" \
     --role="roles/iam.serviceAccountUser"
   ```

---

## 🧪 Comprehensive Functional Stability & Walkthrough Test Suite

This section outlines every user interaction and system process so it can be verified manually or automated into end-to-end test suites.

### Test Case 1: Unauthenticated Landing & Google Sign-In
* **Step 1.1**: Open the root URL (`/`). Verify the unauthenticated landing page renders with the value proposition, security badges, and "Continue with Google Account" button.
* **Step 1.2**: Click the "Continue with Google Account" button.
* **Step 1.3**: Complete the Google authentication popup.
* **Expected Outcome**: The user state updates, avatar and display name render in the navigation header, and the user is routed to their private journal workspace.

### Test Case 2: Multi-Turn Journaling & Gemini Reflection
* **Step 2.1**: In the editor, select a reflection lens (e.g., *Self-Reflection* or *Brainstorming*).
* **Step 2.2**: Click one of the starter prompt chips (e.g., *"What has been occupying my mental energy today, and why?"*).
* **Step 2.3**: Add additional custom reflection text in the textarea and click **"Reflect with Gemini"** (or press `Cmd/Ctrl + Enter`).
* **Expected Outcome**:
  - The user message appears immediately in the message log.
  - The animated AI thinking bubble activates.
  - Gemini responds with a structured, empathetic, non-judgmental response.
  - The save indicator updates to *"Saving to Firestore..."* and transitions to *"Saved"*.

### Test Case 3: Conversational Multi-Turn Follow-Up
* **Step 3.1**: Enter a follow-up response addressing Gemini's question or expanding on the topic.
* **Step 3.2**: Send the message.
* **Expected Outcome**: Both user and AI messages are preserved in chronological order. Word count updates in real time.

### Test Case 4: AI Synthesis & Key Takeaways Extraction
* **Step 4.1**: In an active reflection with at least one exchange, click the **"Summarize & Insights"** button.
* **Expected Outcome**:
  - Gemini synthesizes the conversation into an Executive Summary, Key Action Takeaways, Mood tag, and thematic hashtags (`#tags`).
  - The synthesis card renders above the conversation thread and persists in Firestore.

### Test Case 5: Cloud Firestore User Isolation Verification
* **Step 5.1**: Log in as User A (`user_a@example.com`). Create reflection entries "Goal Review 2026".
* **Step 5.2**: Log out and log in as User B (`user_b@example.com`).
* **Expected Outcome**: User B's archive is completely empty. User B cannot see or query User A's documents under `/users/{UserA_UID}/interactions/*`.

### Test Case 6: Archive Search, Filter, and Resume
* **Step 6.1**: Navigate to **"Past Entries"** in the top navigation.
* **Step 6.2**: Type a keyword in the search bar or filter by lens/mood.
* **Step 6.3**: Click on a reflection card from the grid.
* **Expected Outcome**: The app opens the selected interaction in the editor with all historical multi-turn dialogue, title, and synthesis intact.

### Test Case 7: Transaction Integrity & Error Recovery
* **Step 7.1**: If network connectivity drops during a save, verify the error badge *"Save Error"* is displayed with a **"Retry"** button.
* **Step 7.2**: User input text is retained and not cleared until the save is successful.

### Test Case 8: Secure Sign Out
* **Step 8.1**: Click the Sign Out icon in the user profile header.
* **Expected Outcome**: Auth tokens are cleared, state resets to unauthenticated, and the user is returned to the landing page.

### Test Case 9: In-App Deletion with Inline Confirmation
* **Step 9.1**: From the Editor or Past Entries view, click the trash can icon on a reflection.
* **Step 9.2**: Verify that an inline confirmation prompt appears (*"Delete entry? Yes / Cancel"*) without blocking browser alert modals.
* **Step 9.3**: Clicking "Yes" removes the reflection from Firestore and shows an accessible in-app toast banner confirmation. Clicking "Cancel" dismisses the prompt without deleting.

### Test Case 10: Export Reflection Dialogue as Markdown
* **Step 10.1**: In an active reflection with messages, click the **"Copy"** button in the header toolbar.
* **Expected Outcome**: The full reflection (title, date, lens, synthesis summary, takeaways, and complete multi-turn dialogue formatted in Markdown) is copied to the system clipboard, and the button displays a checkmark *"Copied"*.
