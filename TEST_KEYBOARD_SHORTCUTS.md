# 🧪 Keyboard Shortcuts Testing Guide

## Feature 5: Keyboard Shortcuts Test Plan

### Prerequisites
- Frontend dev server running on `http://localhost:5173` (or your configured port)
- Backend server running on `http://localhost:3000`
- Active database connection

---

## 🌐 Global Shortcuts (Test on any page)

### 1. Command Palette (Ctrl+K)
- [ ] Navigate to any page
- [ ] Press `Ctrl+K` (or `Cmd+K` on Mac)
- [ ] **Expected:** Command palette opens with navigation options
- [ ] Try typing to search commands
- [ ] Select "Go to Schema Browser" - should navigate to home page
- [ ] Select "Go to ER Diagram" - should navigate to diagram page
- [ ] Select "Go to Query Builder" - should navigate to query page
- [ ] Press `Escape` - should close palette

### 2. Keyboard Shortcuts Dialog (Ctrl+/ or ?)
- [ ] Press `Ctrl+/` (or `Cmd+/` on Mac)
- [ ] **Expected:** Keyboard shortcuts dialog opens
- [ ] Press `?` key (without Ctrl)
- [ ] **Expected:** Same dialog opens
- [ ] Search for "refresh" in the search box
- [ ] **Expected:** Shortcuts containing "refresh" are filtered
- [ ] Click keyboard icon in header
- [ ] **Expected:** Same dialog opens
- [ ] Press `Escape` - should close dialog

### 3. Sidebar Toggle (Ctrl+B)
- [ ] Navigate to a page with sidebar (Table Viewer, Query Builder, ER Diagram)
- [ ] Press `Ctrl+B` (or `Cmd+B` on Mac)
- [ ] **Expected:** Sidebar should collapse
- [ ] Press `Ctrl+B` again
- [ ] **Expected:** Sidebar should expand
- [ ] Verify sidebar state persists

### 4. Escape Key
- [ ] Open command palette (`Ctrl+K`)
- [ ] Press `Escape`
- [ ] **Expected:** Palette closes
- [ ] Open shortcuts dialog (`Ctrl+/`)
- [ ] Press `Escape`
- [ ] **Expected:** Dialog closes

---

## 📊 Table Viewer Shortcuts

**Navigate to:** `/table/[schema.tableName]` (any table)

### 1. Focus Search Box (Ctrl+F)
- [ ] Make sure you're on the "Data" tab
- [ ] Press `Ctrl+F` (or `Cmd+F` on Mac)
- [ ] **Expected:** Search input field is focused and text is selected
- [ ] Type some text - should work normally
- [ ] Press `Ctrl+F` again while typing - should refocus/select

### 2. Refresh Data (Ctrl+R)
- [ ] View a table with data
- [ ] Note the current row count or data
- [ ] Press `Ctrl+R` (or `Cmd+R` on Mac)
- [ ] **Expected:** 
  - Toast notification: "Data refreshed"
  - Data is refetched from server
  - Loading state appears briefly
- [ ] Verify data updates correctly

### 3. Context Awareness
- [ ] Switch to "Structure" tab
- [ ] Press `Ctrl+F`
- [ ] **Expected:** Search shortcut should NOT work (only on Data tab)

---

## 💻 Query Builder Shortcuts

**Navigate to:** `/query`

### 1. Execute Query (Ctrl+Enter)
- [ ] Type a simple query: `SELECT * FROM users LIMIT 10;`
- [ ] Press `Ctrl+Enter` (or `Cmd+Enter` on Mac)
- [ ] **Expected:**
  - Query executes
  - Results appear in Results tab
  - Success toast notification appears

### 2. Execute Query (F5)
- [ ] Type another query: `SELECT COUNT(*) FROM users;`
- [ ] Press `F5`
- [ ] **Expected:** Same as Ctrl+Enter - query executes

### 3. Save Query (Ctrl+S)
- [ ] Type a query
- [ ] Press `Ctrl+S` (or `Cmd+S` on Mac)
- [ ] **Expected:** Save query dialog opens
- [ ] Enter query name
- [ ] Press `Ctrl+S` again while dialog is open
- [ ] **Expected:** Query is saved (if name is filled)
- [ ] Verify query appears in Saved Queries tab

### 4. Clear Query (Ctrl+L)
- [ ] Type some query text
- [ ] Press `Ctrl+L` (or `Cmd+L` on Mac)
- [ ] **Expected:** Query text is cleared
- [ ] Verify editor is empty

### 5. Context Awareness
- [ ] Open Save Dialog (`Ctrl+S`)
- [ ] Try pressing `Ctrl+Enter` or `F5`
- [ ] **Expected:** Query should NOT execute while dialog is open

---

## 🐛 Edge Cases & Error Handling

### 1. No Connection
- [ ] Disconnect from database
- [ ] Try shortcuts in Query Builder
- [ ] **Expected:** Appropriate error messages appear

### 2. Empty Query
- [ ] In Query Builder, leave query empty
- [ ] Press `Ctrl+Enter` or `F5`
- [ ] **Expected:** Error toast: "Query is empty"

### 3. Multiple Dialogs
- [ ] Open command palette (`Ctrl+K`)
- [ ] Try opening shortcuts dialog (`Ctrl+/`)
- [ ] **Expected:** Command palette should close, shortcuts dialog opens

### 4. Browser Defaults
- [ ] Test `Ctrl+R` doesn't refresh the page
- [ ] Test `Ctrl+F` doesn't open browser search
- [ ] **Expected:** Our shortcuts take precedence

---

## ✅ Test Checklist Summary

### Global Shortcuts
- [ ] Ctrl+K - Command Palette
- [ ] Ctrl+/ or ? - Shortcuts Dialog
- [ ] Ctrl+B - Sidebar Toggle
- [ ] Escape - Close dialogs

### Table Viewer
- [ ] Ctrl+F - Focus search
- [ ] Ctrl+R - Refresh data
- [ ] Context awareness

### Query Builder
- [ ] Ctrl+Enter - Execute query
- [ ] F5 - Execute query
- [ ] Ctrl+S - Save query
- [ ] Ctrl+L - Clear query
- [ ] Context awareness

### Error Handling
- [ ] No connection scenarios
- [ ] Empty query handling
- [ ] Browser default override

---

## 📝 Notes

- On Mac, use `Cmd` instead of `Ctrl`
- Some shortcuts may conflict with browser extensions
- If shortcuts don't work, check browser console for errors
- Ensure focus is on the page (not in browser address bar)

---

## 🎯 Success Criteria

All shortcuts should:
- ✅ Work as described above
- ✅ Show appropriate feedback (toasts, focus, etc.)
- ✅ Respect context (only work when applicable)
- ✅ Not conflict with browser defaults
- ✅ Work consistently across browsers

---

**Test Date:** _______________  
**Tester:** _______________  
**Results:** [ ] All Passed  [ ] Some Failed  [ ] Needs Review



