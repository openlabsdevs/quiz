# Quiz_OS Setup Guide

## 1. Firebase Configuration

1.  Go to [Firebase Console](https://console.firebase.google.com/).
2.  Create a new project (e.g., `quiz-os`).
3.  **Authentication**:
    *   Go to **Build** > **Authentication**.
    *   Click **Get Started**.
    *   Enable **Google** Sign-in provider.
    *   Go to **Settings** > **Authorized domains**.
    *   Add `quiz.openlabsdevs.com` and `quiz-ol.vercel.app` to the list.
4.  **Firestore Database**:
    *   Go to **Build** > **Firestore Database**.
    *   Click **Create Database**.
    *   Choose a location.
    *   Start in **Test mode** (or Production, provided rules handle security).
    *   Go to the **Rules** tab and paste the contents of `firestore.rules` found in this project.
5.  **Project Settings**:
    *   Click the Gear icon > **Project settings**.
    *   Scroll to **Your apps**.
    *   Click the `</>` (Web) icon to register a web app.
    *   Copy the `firebaseConfig` object (keys and values).

## 2. Connecting the App

1.  Open the application in your browser.
2.  On the Login screen, click **"Configure Connection"** (bottom text).
3.  Paste the **JSON** content of your `firebaseConfig` object.
    *   *Format:*
        ```json
        {
          "apiKey": "AIzaSy...",
          "authDomain": "project-id.firebaseapp.com",
          "projectId": "project-id",
          "storageBucket": "project-id.appspot.com",
          "messagingSenderId": "...",
          "appId": "..."
        }
        ```
4.  Click **Save & Reload**.
5.  Sign in with Google.

## 3. Creating an Admin Account

By default, all new users are assigned the `user` role. To access the Admin Dashboard:

1.  Sign in to the app once to create your user record in Firestore.
2.  Go to **Firebase Console** > **Firestore Database**.
3.  Navigate to the `users` collection.
4.  Find your user document (the ID matches your Authentication UID).
5.  Change the `role` field from `"user"` to `"admin"`.
6.  Refresh the app. You will now see an **"Admin Panel"** button on the Dashboard.

## 4. Troubleshooting

*   **API Key Error**: Ensure you copied the full config object correctly. You can reset it by clearing your browser's Local Storage or clicking "Configure Connection" again.
*   **Permission Denied**: Ensure `firestore.rules` are published in the console.

## 5. Deployment

To deploy the application in production using Vercel with your specific domains:

1.  Deploy your project to [Vercel](https://vercel.com) (via GitHub integration or the Vercel CLI).
2.  In your Vercel Project Dashboard, navigate to **Settings** > **Domains**.
3.  Add the following domains:
    *   `quiz-ol.vercel.app`
    *   `quiz.openlabsdevs.com`
4.  For `quiz.openlabsdevs.com`, configure your DNS provider with the records (CNAME/A) provided by Vercel.
5.  **Important**: Ensure both domains are added to Firebase Authentication **Authorized domains** (as described in section 1) so that Google Sign-in functions correctly in production.