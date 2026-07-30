# UAT Log

- Desktop Models：9 个默认列、组合筛选器、列选择、重置筛选和分页布局正常；无全局横向溢出。
- Mobile Models：筛选面板保持在 390px viewport 内；列选择 fixed panel、sticky actions、滚动和 44px coarse target 正常。
- Desktop Compare：50 行、5 个来源卡片、无顶部证据栏、footer 与分页正常；无全局横向溢出。
- Mobile Compare：50 行；table-scroll 为 356px client / 1688px scroll，本地横向滚动正常，document 宽度等于 viewport。
- 交互测量：Compare RSC 首响应 34-70ms，UI commit 254-294ms。
- Browser console、pageerror、hydration：0。

结论：通过。
