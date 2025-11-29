# Integration Test Checklist

Quick reference checklist for integration testing.

## ✅ Pre-Test Checklist

- [ ] Backend server running
- [ ] Frontend server running
- [ ] At least one database connection configured
- [ ] Browser DevTools open
- [ ] Network tab open for monitoring

---

## 🔌 Connection Management

- [ ] Create new connection
- [ ] Test connection
- [ ] Save connection
- [ ] Connect to database
- [ ] Disconnect from database
- [ ] Edit connection
- [ ] Delete connection
- [ ] Search connections
- [ ] Refresh connections list

---

## 📊 Schema & Metadata

- [ ] View schemas list
- [ ] View tables list
- [ ] Search tables
- [ ] Navigate to table
- [ ] View database statistics
- [ ] Refresh schema cache
- [ ] Handle empty schemas
- [ ] Handle empty tables

---

## 📋 Table Data Operations

- [ ] View table data
- [ ] Pagination (next/previous)
- [ ] Change page size
- [ ] Search table data
- [ ] Filter table data
- [ ] Sort columns
- [ ] View table structure
- [ ] View indexes
- [ ] View relationships
- [ ] Navigate via foreign keys
- [ ] Export table data (CSV)
- [ ] Export table data (JSON)
- [ ] Export with filters applied

---

## 🔍 Query Execution

- [ ] Execute simple SELECT query
- [ ] Execute JOIN query
- [ ] Execute INSERT query
- [ ] Execute UPDATE query
- [ ] Execute DELETE query
- [ ] Handle query errors
- [ ] View explain plan
- [ ] Cancel long-running query
- [ ] View query history
- [ ] Load query from history
- [ ] Save query
- [ ] Load saved query
- [ ] Delete saved query
- [ ] Clear query history
- [ ] Export query results

---

## 🗺️ ER Diagram

- [ ] View ER diagram
- [ ] Filter by schema
- [ ] Toggle isolated tables
- [ ] Change layout algorithm
- [ ] Zoom in/out
- [ ] Pan diagram
- [ ] Export as PNG
- [ ] Export as SVG
- [ ] Refresh diagram
- [ ] Handle empty diagram

---

## ⚠️ Error Handling

- [ ] No connection selected
- [ ] Connection lost
- [ ] Invalid query
- [ ] Network error
- [ ] Timeout error
- [ ] Permission denied
- [ ] Table not found
- [ ] Schema not found

---

## 📱 Responsive Design

- [ ] Mobile viewport (< 768px)
- [ ] Tablet viewport (768-1024px)
- [ ] Desktop viewport (> 1024px)
- [ ] Sidebar on mobile
- [ ] Tables scroll on mobile
- [ ] Touch interactions work

---

## 🔄 State Management

- [ ] Connection state persists
- [ ] Cache invalidation works
- [ ] Query cache works
- [ ] State updates correctly
- [ ] No stale data
- [ ] Refresh updates data

---

## 🎨 UI/UX

- [ ] Empty states display
- [ ] Loading states display
- [ ] Error messages clear
- [ ] Success notifications
- [ ] Error notifications
- [ ] Loading notifications
- [ ] Tooltips work
- [ ] Breadcrumbs work
- [ ] Navigation works

---

## 🚀 Performance

- [ ] Fast initial load
- [ ] Fast data fetching
- [ ] Smooth scrolling
- [ ] Responsive UI
- [ ] No lag on interactions
- [ ] Efficient caching

---

## 📝 Notes

**Date:** ___________
**Tester:** ___________
**Issues Found:**
1. ___________
2. ___________
3. ___________

**Overall Status:** [ ] PASS / [ ] FAIL

