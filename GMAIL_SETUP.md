# Gmail App Password Setup Guide

## Step-by-Step Instructions to Get Gmail App Password

### Step 1: Enable 2-Factor Authentication (Required)

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Sign in with `simlabkenya@gmail.com`
3. Under "How you sign in to Google", click **2-Step Verification**
4. Follow the prompts to enable 2-Step Verification
   - You'll need to verify with your phone number
   - Choose your verification method (text/call)

### Step 2: Generate App Password

1. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
   - Or: Google Account → Security → 2-Step Verification → App passwords
2. You may need to sign in again
3. At the bottom, click **Select app** and choose "Mail"
4. Click **Select device** and choose "Other (Custom name)"
5. Enter: `SIM-Lab Shop`
6. Click **Generate**

### Step 3: Copy the App Password

1. Google will show you a **16-character password** (like: `abcd efgh ijkl mnop`)
2. **Copy this password immediately** (it will only be shown once!)
3. Remove the spaces when using it: `abcdefghijklmnop`

### Step 4: Add to Vercel Environment Variables

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your SIM-Lab project
3. Go to **Settings** → **Environment Variables**
4. Add these two variables:

| Name | Value |
|------|-------|
| `GMAIL_USER` | `simlabkenya@gmail.com` |
| `GMAIL_APP_PASSWORD` | `your16charpassword` (no spaces) |

5. Make sure to add them for **Production**, **Preview**, and **Development**
6. Click **Save**

### Step 5: Redeploy

After adding environment variables, redeploy your project for changes to take effect.

---

## Troubleshooting

### "App passwords not available"
- Make sure 2-Step Verification is enabled first

### "Invalid login" errors
- Double-check the app password has no spaces
- Verify you're using the correct Gmail account
- Try generating a new app password

### Emails not sending
- Check Vercel logs for error messages
- Verify environment variables are set correctly
- Make sure the email API endpoint is deployed

---

## Security Notes

⚠️ **Never commit app passwords to Git!**

The app password is stored securely in Vercel environment variables and is never exposed in client-side code.
