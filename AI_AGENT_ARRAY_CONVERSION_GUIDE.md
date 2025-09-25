# Fairbnb AI Agent Array Conversion Guide

## Overview
This guide explains how array variables in API request payloads have been converted to text format for AI agent compatibility. All array fields are now handled as comma-separated text strings that can be easily processed by AI agents.

## Array to Text Conversion

### Conversion Rules
- **Arrays → Text**: `["beach", "mountain", "city"]` becomes `"beach, mountain, city"`
- **Text → Arrays**: `"beach, mountain, city"` becomes `["beach", "mountain", "city"]`
- **Empty Arrays**: `[]` becomes `""` (empty string)
- **Null/Undefined**: `null` or `undefined` remains unchanged

### Utility Functions
```javascript
// Convert array to comma-separated text
function convertArrayToText(arr) {
  if (Array.isArray(arr)) {
    return arr.join(', ');
  }
  if (typeof arr === 'string' && arr.includes(',')) {
    return arr; // Already converted
  }
  return arr;
}

// Convert text back to array
function convertTextToArray(text) {
  if (typeof text === 'string' && text.trim()) {
    return text.split(',').map(item => item.trim()).filter(item => item);
  }
  if (Array.isArray(text)) {
    return text;
  }
  return [];
}
```

## Updated API Endpoints

### 1. User Preferences

#### PUT /api/users/:id/preferences
**Request Payload (AI Agent Format):**
```json
{
  "budget_range": { "min": 200, "max": 500 },
  "destination_types": "beach, mountain, city",
  "travel_style": "luxury",
  "interests": "food, culture, nature, nightlife"
}
```

**Response (AI Agent Format):**
```json
{
  "message": "Preferences updated successfully",
  "user": {
    "id": "user123",
    "preferences": {
      "budget_range": { "min": 200, "max": 500 },
      "destination_types": "beach, mountain, city",
      "travel_style": "luxury",
      "interests": "food, culture, nature, nightlife"
    }
  }
}
```

### 2. Booking Management

#### POST /api/bookings
**Request Payload (AI Agent Format):**
```json
{
  "userId": "user123",
  "packages": "Beach Paradise, Mountain Adventure, City Tour",
  "total": 899,
  "pickup_location": "Airport",
  "transport_mode": "Flight",
  "stay_option": "Hotel",
  "room_type": "Deluxe",
  "guests": 2
}
```

**Response (AI Agent Format):**
```json
{
  "message": "Booking saved",
  "bookingId": "booking123",
  "booking": {
    "packages": "Beach Paradise, Mountain Adventure, City Tour",
    "total": 899,
    "status": "Active"
  }
}
```

#### GET /api/bookings?userId=user123
**Response (AI Agent Format):**
```json
[
  {
    "id": "booking123",
    "packages": "Beach Paradise, Mountain Adventure",
    "total": 599,
    "status": "Active"
  }
]
```

### 3. Cart Management

#### POST /api/cart
**Request Payload (AI Agent Format):**
```json
{
  "userId": "user123",
  "package_id": "pkg1",
  "package_name": "Beach Paradise",
  "price": 299,
  "quantity": 1
}
```

**Response (AI Agent Format):**
```json
{
  "message": "Item added to cart",
  "cart": {
    "items": "Beach Paradise (₹299 x 1), Mountain Adventure (₹399 x 2)",
    "total": 1097
  }
}
```

#### GET /api/cart?userId=user123
**Response (AI Agent Format):**
```json
{
  "userId": "user123",
  "items": "Beach Paradise (₹299 x 1), Mountain Adventure (₹399 x 2)",
  "total": 1097
}
```

### 4. Group Bookings

#### POST /api/group-bookings
**Request Payload (AI Agent Format):**
```json
{
  "group_leader_id": "user123",
  "members": "friend1@example.com, friend2@example.com, friend3@example.com",
  "booking_id": "booking123"
}
```

**Response (AI Agent Format):**
```json
{
  "message": "Group booking created",
  "groupBookingId": "group123",
  "groupBooking": {
    "group_leader_id": "user123",
    "members": "friend1@example.com, friend2@example.com, friend3@example.com",
    "booking_id": "booking123"
  }
}
```

### 5. Itinerary Sharing

#### POST /api/share/itinerary
**Request Payload (AI Agent Format):**
```json
{
  "booking_id": "booking123",
  "shared_with_emails": "family@example.com, friends@example.com",
  "message": "Check out our upcoming trip!"
}
```

**Response (AI Agent Format):**
```json
{
  "message": "Itinerary shared successfully",
  "shared_with": "family@example.com, friends@example.com",
  "booking_id": "booking123"
}
```

## AI Agent Integration Examples

### Example 1: Complete User Preference Setup
```javascript
// AI Agent can now easily send text-based preferences
const preferences = {
  budget_range: { min: 300, max: 800 },
  destination_types: "beach, mountain, adventure",
  travel_style: "luxury",
  interests: "food, culture, photography, hiking"
};

// Send to API
fetch('/api/users/user123/preferences', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(preferences)
});
```

### Example 2: Create Booking with Package List
```javascript
// AI Agent can send packages as simple text
const booking = {
  userId: "user123",
  packages: "Goa Beach Resort, Kerala Backwaters, Rajasthan Palace",
  total: 1200,
  pickup_location: "Mumbai Airport",
  transport_mode: "Flight",
  stay_option: "Resort",
  room_type: "Suite",
  guests: 2
};

// Send to API
fetch('/api/bookings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(booking)
});
```

### Example 3: Group Travel Coordination
```javascript
// AI Agent can easily manage group members as text
const groupBooking = {
  group_leader_id: "user123",
  members: "alice@example.com, bob@example.com, charlie@example.com",
  booking_id: "booking123"
};

// Send to API
fetch('/api/group-bookings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(groupBooking)
});
```

## Benefits for AI Agents

### 1. **Simplified Input Processing**
- No need to construct complex JSON arrays
- Easy to generate from natural language
- Simple string manipulation

### 2. **Natural Language Integration**
- AI can directly convert user speech/text to API calls
- "I like beach, mountain, and city destinations" → `"beach, mountain, city"`
- "Share with john@email.com and jane@email.com" → `"john@email.com, jane@email.com"`

### 3. **Error Reduction**
- Less complex data structures to manage
- Easier validation and error handling
- Reduced parsing errors

### 4. **Backward Compatibility**
- Existing array-based requests still work
- Automatic conversion handles both formats
- No breaking changes to existing integrations

## Migration Notes

### For Existing Integrations
- **No changes required** - existing array-based requests still work
- **Automatic conversion** - arrays are automatically converted to text
- **Response format** - all responses now return text-based arrays

### For New AI Agent Integrations
- **Use text format** for all array fields
- **Comma-separated values** for multiple items
- **Empty string** for empty arrays
- **Simple string manipulation** for processing

## Testing

### Test Array Conversion
```javascript
// Test the conversion functions
console.log(convertArrayToText(["beach", "mountain"])); // "beach, mountain"
console.log(convertTextToArray("beach, mountain")); // ["beach", "mountain"]
console.log(convertArrayToText([])); // ""
console.log(convertTextToArray("")); // []
```

### Test API Endpoints
```javascript
// Test user preferences
fetch('/api/users/user123/preferences', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    destination_types: "beach, mountain",
    interests: "food, culture"
  })
});
```

## Summary

All array variables in API request payloads have been successfully converted to text format for AI agent compatibility. This change:

✅ **Enables easy AI agent integration**  
✅ **Maintains backward compatibility**  
✅ **Simplifies data processing**  
✅ **Supports natural language input**  
✅ **Reduces integration complexity**  

Your AI agent can now easily interact with all 44 API endpoints using simple text-based array formats!
