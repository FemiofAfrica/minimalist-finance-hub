# Manual Testing Checklist for Comparative Insights (PBI-2)

This document provides a comprehensive manual testing checklist to complement the automated E2E tests for the comparative insights feature.

## Pre-Test Setup

### Test Environment
- [ ] Development server running (`npm run dev`)
- [ ] Browser developer tools open
- [ ] Screen reader available (if testing accessibility)
- [ ] Multiple browsers available (Chrome, Firefox, Safari, Edge)
- [ ] Mobile device or browser dev tools for responsive testing

### Test Data Preparation
- [ ] Clean browser state (clear localStorage/sessionStorage)
- [ ] Test account with various data scenarios prepared
- [ ] Screenshots/recording tools ready for documentation

## Manual Test Scenarios

### Scenario 1: New User with No Data ✅

**Objective**: Verify graceful handling of insufficient data

**Steps**:
1. [ ] Open fresh browser session
2. [ ] Navigate to `/reports` page
3. [ ] Observe comparative insights section

**Expected Results**:
- [ ] Clear "no data" message displayed
- [ ] No broken UI elements or error states
- [ ] Helpful guidance text present
- [ ] UI remains functional and informative

**Actual Results**: ________________

**Screenshots**: ________________

---

### Scenario 2: Single Month Data ✅

**Objective**: Verify handling of insufficient comparison data

**Steps**:
1. [ ] Add transactions for current month only
2. [ ] Navigate to Reports page
3. [ ] Check comparative insights display

**Expected Results**:
- [ ] "Insufficient data" message displayed
- [ ] No calculation errors or crashes
- [ ] UI encourages adding more historical data

**Actual Results**: ________________

---

### Scenario 3: Normal Multi-Month Data ✅

**Objective**: Verify full functionality with adequate data

**Steps**:
1. [ ] Set up account with 3+ months of varied transaction data
2. [ ] Navigate to Reports page
3. [ ] Verify all comparative metrics display correctly
4. [ ] Check month-over-month calculations
5. [ ] Verify trend indicators and colors
6. [ ] Check contextual explanations

**Expected Results**:
- [ ] All metrics calculate and display correctly
- [ ] Trend arrows show appropriate direction and color
- [ ] Percentage changes are accurate
- [ ] Currency formatting is correct (₦X,XXX.XX)
- [ ] No "NGNNaN" or similar display issues
- [ ] Explanations provide meaningful insights

**Test Data Used**:
```
Current Month: Income ₦6,000, Expenses ₦3,000
Previous Month: Income ₦5,000, Expenses ₦2,500
Expected Income Change: +20%
Expected Expense Change: +20%
```

**Actual Results**:
- Income Change: ________________
- Expense Change: ________________
- Balance Change: ________________
- Trend Colors: ________________

---

### Scenario 4: Edge Case Data Testing ✅

**Objective**: Verify robust handling of problematic data

**Test 4a: Zero Income Month**
- [ ] Set current month income to ₦0
- [ ] Verify no "NGNNaN" display issues
- [ ] Check percentage calculation handling
- [ ] Confirm trend indicators work

**Test 4b: Zero Expenses Month**
- [ ] Set current month expenses to ₦0
- [ ] Verify division by zero prevention
- [ ] Check trend calculations

**Test 4c: Identical Consecutive Months**
- [ ] Set identical income/expenses for two months
- [ ] Verify 0% change displays correctly
- [ ] Check "stable" trend indicators

**Test 4d: Extreme Value Differences**
- [ ] Test with very large differences (1000%+ changes)
- [ ] Verify percentage capping works
- [ ] Check UI remains stable

**Expected Results**:
- [ ] No "NGNNaN", "NaN", "Infinity", or "undefined" text
- [ ] Division by zero handled gracefully
- [ ] Extreme percentages capped appropriately
- [ ] Missing data shows "N/A" or appropriate messaging

**Actual Results**: ________________

---

### Scenario 5: Responsive Design Testing ✅

**Test 5a: Mobile (320px - 768px)**
- [ ] Test on actual mobile device or browser dev tools
- [ ] Verify all content accessible
- [ ] Check touch targets (minimum 44px)
- [ ] Confirm no horizontal scrolling
- [ ] Test portrait and landscape orientations

**Test 5b: Tablet (768px - 1024px)**
- [ ] Test on tablet or browser dev tools
- [ ] Verify layout adaptation
- [ ] Check text readability
- [ ] Test touch interactions

**Test 5c: Desktop (1024px+)**
- [ ] Test on desktop browser
- [ ] Verify full layout functionality
- [ ] Check hover states
- [ ] Test mouse interactions

**Expected Results**:
- [ ] All content accessible at every screen size
- [ ] Touch targets meet 44px minimum on mobile
- [ ] Text remains readable at all sizes
- [ ] No horizontal scrolling required
- [ ] Layouts stack appropriately on smaller screens

**Device Test Results**:
- iPhone (375px): ________________
- iPad (768px): ________________
- Desktop (1280px): ________________

---

### Scenario 6: Accessibility Testing ✅

**Test 6a: Keyboard Navigation**
- [ ] Navigate using only Tab, Shift+Tab, Enter, Space
- [ ] Verify all interactive elements accessible
- [ ] Check focus indicators visible
- [ ] Test logical tab order

**Test 6b: Screen Reader Testing**
- [ ] Use NVDA, JAWS, or VoiceOver
- [ ] Verify all content announced meaningfully
- [ ] Check ARIA labels and descriptions
- [ ] Test heading hierarchy

**Test 6c: Color Contrast**
- [ ] Use browser accessibility tools
- [ ] Verify 4.5:1 contrast ratio minimum
- [ ] Test with high contrast mode
- [ ] Check color blindness simulation

**Expected Results**:
- [ ] All interactive elements keyboard accessible
- [ ] Screen reader announces all content meaningfully
- [ ] Color contrast meets WCAG 2.1 AA standards
- [ ] High contrast mode works properly
- [ ] ARIA attributes provide proper context

**Accessibility Tool Results**:
- Lighthouse Score: ________________
- axe-core Issues: ________________
- Screen Reader Test: ________________

---

### Scenario 7: Performance Testing ✅

**Test 7a: Load Time**
- [ ] Clear browser cache
- [ ] Measure page load time with dev tools
- [ ] Test with slow 3G simulation
- [ ] Verify acceptable performance

**Test 7b: Large Dataset**
- [ ] Create account with 12+ months of data
- [ ] Add 100+ transactions per month
- [ ] Measure calculation performance
- [ ] Verify UI responsiveness

**Expected Results**:
- [ ] Page loads within 3 seconds
- [ ] Calculations complete quickly
- [ ] No UI lag or freezing
- [ ] Smooth animations and transitions

**Performance Results**:
- Initial Load Time: ________________
- Time to Interactive: ________________
- Large Dataset Load: ________________

---

### Scenario 8: Integration Testing ✅

**Test 8a: Reports Page Integration**
- [ ] Navigate to Reports page
- [ ] Verify comparative insights section integrates seamlessly
- [ ] Check interaction with other report components
- [ ] Test navigation flow

**Test 8b: Cross-Browser Compatibility**
- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari
- [ ] Test in Edge

**Expected Results**:
- [ ] Comparative insights fit naturally in Reports layout
- [ ] No conflicts with existing components
- [ ] Consistent styling and behavior
- [ ] Works across all major browsers

**Browser Test Results**:
- Chrome: ________________
- Firefox: ________________
- Safari: ________________
- Edge: ________________

---

## Bug Tracking

### Critical Issues Found
| Issue | Severity | Description | Steps to Reproduce | Status |
|-------|----------|-------------|-------------------|--------|
|       |          |             |                   |        |

### Minor Issues Found
| Issue | Severity | Description | Steps to Reproduce | Status |
|-------|----------|-------------|-------------------|--------|
|       |          |             |                   |        |

## Test Summary

### Overall Results
- [ ] All critical functionality works as expected
- [ ] No "NGNNaN" or similar display issues found
- [ ] Responsive design works across all devices
- [ ] Accessibility requirements met
- [ ] Performance within acceptable limits
- [ ] Cross-browser compatibility confirmed

### Recommendations
- [ ] Ready for production deployment
- [ ] Minor issues need addressing first
- [ ] Major issues require additional development

### Sign-off
- **Tester**: ________________
- **Date**: ________________
- **Environment**: ________________
- **Overall Assessment**: ________________

---

## Appendix: Test Data Templates

### Multi-Month Test Data
```javascript
// Current Month (January 2024)
Income: ₦6,000
Expenses: ₦3,000
Net: ₦3,000

// Previous Month (December 2023)
Income: ₦5,000
Expenses: ₦2,500
Net: ₦2,500

// Expected Results
Income Change: +20% (green up arrow)
Expense Change: +20% (red up arrow - bad for expenses)
Net Change: +20% (green up arrow)
```

### Edge Case Test Data
```javascript
// Zero Income Scenario
Current: Income ₦0, Expenses ₦1,000
Previous: Income ₦5,000, Expenses ₦2,000
Expected: Income shows "N/A" or safe percentage

// Zero Expenses Scenario
Current: Income ₦5,000, Expenses ₦0
Previous: Income ₦4,000, Expenses ₦2,000
Expected: Expenses show safe percentage calculation
``` 