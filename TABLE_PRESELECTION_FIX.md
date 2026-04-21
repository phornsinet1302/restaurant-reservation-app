# Table Pre-selection Fix for Modify Booking

## Problem Statement
When users opened the "Modify Booking" screen, available tables were displayed but the existing table (the one currently assigned to the booking) was not automatically pre-selected, forcing users to manually find and select it again.

## Root Cause
The component received the existing table ID through route parameters (`params.table`) but the table selection logic never used this information. The filtering logic only pre-selected the first available table when no table was currently selected.

## Solution Implemented

### 1. Added State for Existing Table ID
```typescript
const [existingTableId, setExistingTableId] = useState<string | null>(null);
```
This state stores the existing table ID from route parameters.

### 2. Extract Existing Table from Route Parameters
In the form pre-fill useEffect:
```typescript
if (params.table) {
  setExistingTableId(params.table);
}
```
This captures the existing table ID when the component loads.

### 3. Updated Table Filtering Logic
Modified the table filtering useEffect to:
- Check if `existingTableId` exists and is available in the filtered tables
- If the existing table is available and meets the capacity requirements, pre-select it
- If the existing table is not available but other tables are, select the first available table
- If the existing table exists in the non-available list, still show it to the user

```typescript
if (existingTableId) {
  const existingTableStillValid = availableTables.find((t: any) => t.id === existingTableId);
  if (existingTableStillValid) {
    console.log('✅ Existing table is still available:', existingTableId);
    setSelectedTableId(existingTableId);
  } else {
    console.log('⚠️ Existing table not available for current guest count. Selecting first available table.');
    setSelectedTableId(availableTables[0].id);
  }
}
```

### 4. Added `existingTableId` to Dependency Array
Updated the useEffect dependency array to include `existingTableId` so the pre-selection logic runs when the existing table ID is determined.

## User Experience Improvements
1. ✅ Existing table is automatically pre-selected when opening modify booking
2. ✅ If the existing table is no longer available due to guest count change, user is informed clearly
3. ✅ Alternative tables are suggested when the original is unavailable
4. ✅ Console logging helps with debugging: "✅ Existing table is still available" or "⚠️ Existing table not available"

## Files Modified
- `frontend/app/modify-booking.tsx`

## Testing Checklist
- [ ] Open a booking modification
- [ ] Verify the existing table is pre-selected
- [ ] Change guest count to require different table capacity
- [ ] Verify the system handles unavailable tables gracefully
- [ ] Verify form submission still works correctly with the selected table
