# Notification API Testing Guide

## Prerequisites
1. You need a valid authentication token
2. The backend must be deployed to Render

## Get Authentication Token

First, login to get a token:

```bash
# Login as a fan user
curl -X POST https://podm.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-fan-email@example.com",
    "password": "your-password"
  }'
```

Save the `token` from the response.

## Test Notification Endpoints

### 1. Get Unread Count
```bash
curl -X GET https://podm.onrender.com/api/v1/notifications/unread-count \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "count": 0
  }
}
```

### 2. Get All Notifications
```bash
curl -X GET https://podm.onrender.com/api/v1/notifications \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "success": true,
  "data": []
}
```

### 3. Create a Test Notification (Manual Database Insert)

Since notifications are created automatically when creators post content, you can either:

**Option A:** Post new content as a creator you're subscribed to

**Option B:** Manually insert a test notification in Supabase:

```sql
INSERT INTO notifications (user_id, type, title, message, related_content_id, related_user_id, is_read)
VALUES (
  'YOUR_FAN_USER_ID',
  'new_content',
  'Test Creator posted new content',
  'Test Content Title',
  1,
  'CREATOR_USER_ID',
  false
);
```

### 4. Mark Notification as Read
```bash
curl -X PUT https://podm.onrender.com/api/v1/notifications/NOTIFICATION_ID/read \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

### 5. Mark All as Read
```bash
curl -X PUT https://podm.onrender.com/api/v1/notifications/read-all \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "All notifications marked as read"
}
```

### 6. Delete a Notification
```bash
curl -X DELETE https://podm.onrender.com/api/v1/notifications/NOTIFICATION_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Notification deleted"
}
```

## Testing the Full Flow

### Step 1: Subscribe to a Creator
As a fan, subscribe to a creator.

### Step 2: Creator Posts Content
As the creator, post new content (photo, video, or audio).

### Step 3: Check Notifications
As the fan, check for notifications:

```bash
# Get unread count (should be 1 or more)
curl -X GET https://podm.onrender.com/api/v1/notifications/unread-count \
  -H "Authorization: Bearer YOUR_FAN_TOKEN"

# Get all notifications (should see the new content notification)
curl -X GET https://podm.onrender.com/api/v1/notifications \
  -H "Authorization: Bearer YOUR_FAN_TOKEN"
```

### Step 4: Verify Notification Content
The notification should include:
- `type`: "new_content"
- `title`: "[Creator Name] posted new content"
- `message`: The content title
- `related_content_id`: The content ID
- `related_user_id`: The creator's user ID
- `creator`: Object with creator details
- `content`: Object with content details and thumbnail URL

## Troubleshooting

### Error: "Not allowed by CORS"
Make sure you're using the correct origin or testing from the deployed frontend.

### Error: "Unauthorized"
Your token may have expired. Login again to get a new token.

### Error: "Notification not found"
Make sure you're using a valid notification ID that belongs to your user.

### No Notifications Created
Check that:
1. You're subscribed to the creator
2. The creator successfully posted content
3. Check Render logs for any errors in `notifySubscribersOfNewContent`

## PowerShell Testing (Windows)

If using PowerShell, use `Invoke-RestMethod`:

```powershell
# Get unread count
$headers = @{
    "Authorization" = "Bearer YOUR_TOKEN_HERE"
}

Invoke-RestMethod -Uri "https://podm.onrender.com/api/v1/notifications/unread-count" `
    -Method GET `
    -Headers $headers
```

## Next Steps

Once backend testing is complete:
1. ✅ Verify all endpoints work correctly
2. ✅ Test notification creation when content is posted
3. 🔄 Implement frontend notification UI
4. 🔄 Add real-time updates via Socket.IO
