// --- 图标数据 (保持你原本的数据) ---
// 1. 维修中心 (工具箱图标 - 更直观地表示维修)
// 维修中心图标 (方案3：MT核心芯片 - 四面引脚，精密主控感)
const iconRepair = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48IS0tIExpbmVzIChQaW5zKSA6IFVwL0Rvd24gLS0+PHBhdGggZD0iTTE2IDVWMTFNMjQgNVYxMU0zMiA1VjExTTE2IDM3VjQzTTI0IDM3VjQzTTMyIDM3VjQzIiBzdHJva2U9IiM1NDZFN0EiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PCEtLSBMaW5lcyAoUGlucykgOiBMZWZ0L1JpZ2h0IC0tPjxwYXRoIGQ9Ik01IDE2SDExTTUgMjRIMTFNNSAzMkgxMU0zNyAxNkg0M00zNyAyNEg0M00zNyAzMkg0MyIgc3Ryb2tlPSIjNTQ2RTdBIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjwhLS0gQ2hpcCBCb2R5IC0tPjxyZWN0IHg9IjExIiB5PSIxMSIgd2lkdGg9IjI2IiBoZWlnaHQ9IjI2IiByeD0iNCIgZmlsbD0iIzI2MzIzOCIvPjwhLS0gTVQgTG9nbyAoV2hpdGUpIC0tPjx0ZXh0IHg9IjI0IiB5PSIyOSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmb250LXdlaWdodD0iOTAwIiBmaWxsPSIjRkZGRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5NVDwvdGV4dD48L3N2Zz4=";
// 2. 附近门店 (方案 A: 标准雷达 - 扫描扇区+红点定位)
const iconStore = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyNCIgY3k9IjI0IiByPSIyMiIgZmlsbD0iI0U4RjVFOSIvPjxjaXJjbGUgY3g9IjI0IiBjeT0iMjQiIHI9IjE0IiBzdHJva2U9IiM4MUM3ODQiIHN0cm9rZS13aWR0aD0iMS41IiBvcGFjaXR5PSIwLjUiLz48Y2lyY2xlIGN4PSIyNCIgY3k9IjI0IiByPSI2IiBzdHJva2U9IiM4MUM3ODQiIHN0cm9rZS13aWR0aD0iMS41IiBvcGFjaXR5PSIwLjUiLz48cGF0aCBkPSJNMjQgNFY0NCIgc3Ryb2tlPSIjODFDNzg0IiBzdHJva2Utd2lkdGg9IjEiIG9wYWNpdHk9IjAuMyIvPjxwYXRoIGQ9Ik00IDI0SDQ0IiBzdHJva2U9IiM4MUM3ODQiIHN0cm9rZS13aWR0aD0iMSIgb3BhY2l0eT0iMC4zIi8+PHBhdGggZD0iTTI0IDI0TDQ2IDI0QTIyIDIyIDAgMCAwIDI0IDJWMjRaIiBmaWxsPSIjNjZCQjZBIiBvcGFjaXR5PSIwLjMiLz48Y2lyY2xlIGN4PSIzNiIgY3k9IjE0IiByPSIzIiBmaWxsPSIjRkY1MjUyIi8+PGNpcmNsZSBjeD0iMzYiIGN5PSIxNCIgcj0iNSIgc3Ryb2tlPSIjRkY1MjUyIiBzdHJva2Utd2lkdGg9IjEiIG9wYWNpdHk9IjAuNCIvPjwvc3ZnPg==";
// 3. 安装教程 (方案 B: 专业蓝 - 科技/精密感)
const iconInstall = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNyAxMEM3IDguODkgNy44OSA4IDkgOEgyN0MyOC4xIDggMjkgOC44OSAyOSAxMFYyMEg3VjEwWiIgZmlsbD0iIzY0QjVGNSIvPjxwYXRoIGQ9Ik0yNSAyMEwyMiAzOEgxMEwxMyAyMEgyNVoiIGZpbGw9IiMxRTg4RTUiLz48cmVjdCB4PSI4IiB5PSIzOCIgd2lkdGg9IjE2IiBoZWlnaHQ9IjYiIHJ4PSIyIiBmaWxsPSIjMTU2NUMwIi8+PHBhdGggZD0iTTI5IDExSDMyVjE5SDI5VjExWiIgZmlsbD0iIzI2MzIzOCIvPjxwYXRoIGQ9Ik0zMiAxMkgzNFYxOEgzMlYxMloiIGZpbGw9IiMzNzQ3NEYiLz48cGF0aCBkPSJNMzQgMTVINDUiIHN0cm9rZT0iIzE1NjVDMCIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48cmVjdCB4PSIxMSIgeT0iMTIiIHdpZHRoPSIxMCIgaGVpZ2h0PSIyIiByeD0iMSIgZmlsbD0id2hpdGUiIGZpbGwtb3BhY2l0eT0iMC40Ii8+PHJlY3QgeD0iMTEiIHk9IjE2IiB3aWR0aD0iOCIgaGVpZ2h0PSIyIiByeD0iMSIgZmlsbD0id2hpdGUiIGZpbGwtb3BhY2l0eT0iMC40Ii8+PC9zdmc+";
const iconOTA = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTEyLjAyMyA0QzE1LjU0NiA0IDE4LjUwOCA2LjY0MyAxOS4xMjUgMTAuMTE5QzIxLjM2NiAxMC43NDIgMjMgMTIuNzkzIDIzIDE1LjI1QzIzIDE4LjI4OCAyMC41MzggMjAuNzUgMTcuNSAyMC43NUg2LjVDMy40NjIgMjAuNzUgMSAxOC4yODggMSAxNS4yNUMxIDEyLjMzOCAzLjI1NiA5Ljk1NSA2LjExOSA5Ljc3MUM2LjcwOSA2LjQ4OCA5LjU2MyA0IDEyLjAyMyA0Wk0xMiAxNy41TDggMTMuNUgxMC41VjkuNUgxMy41VjEzLjVIMTZMMTIgMTcuNVoiIGZpbGw9IiMzOEJERjgiLz48L3N2Zz4=";
const iconControl = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImJsYWNrS25vYiIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzU1NSIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzAwMCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxwYXRoIGQ9Ik04IDE0SDQyIiBzdHJva2U9IiNkZGQiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PHBhdGggZD0iTTggMjRINDIiIHN0cm9rZT0iI2RkZCIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48cGF0aCBkPSJNOCAzNEg0MiIgc3Ryb2tlPSIjZGRkIiBzdHJva2Utd2lkdGg9IjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjxjaXJjbGUgY3g9IjMyIiBjeT0iMTQiIHI9IjQiIGZpbGw9InVybCgjYmxhY2tLbm9iKSIvPjxjaXJjbGUgY3g9IjE2IiBjeT0iMjQiIHI9IjQiIGZpbGw9InVybCgjYmxhY2tLbm9iKSIvPjxjaXJjbGUgY3g9IjM2IiBjeT0iMzQiIHI9IjQiIGZpbGw9InVybCgjYmxhY2tLbm9iKSIvPjwvc3ZnPg==";
// 6. 联系方式 (方案 A: 微信绿色气泡 - 带MT文字，使用微信官方绿色 #07C160)
const iconContact = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNDQgMjRDNDQgMzUuMDQ1NyAzNS4wNDU3IDQ0IDI0IDQ0QzE5Ljk3OTEgNDQgMTYuMjIzIDQyLjgxMjMgMTMuMDY1MiA0MC43NzY2TDQgNDRMNy41NDA0OSAzNS41MDk3QzUuMjg5NDEgMzIuMTgxOCA0IDI4LjI0MzYgNCAyNEM0IDEyLjk1NDMgMTIuOTU0MyA0IDI0IDRDMzUuMDQ1NyA0IDQ0IDEyLjk1NDMgNDQgMjRaIiBmaWxsPSIjMDdDMTYwIi8+PHRleHQgeD0iMjQiIHk9IjMwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+TVQ8L3RleHQ+PC9zdmc+";
// 11. 使用手册 (打开的书本图标)
const iconManual = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNOCA4QzggNi44OTU0MyA4Ljg5NTQzIDYgMTAgNkgyMEMyMS4xMDQ2IDYgMjIgNi44OTU0MyAyMiA4VjQwQzIyIDQxLjEwNDYgMjEuMTA0NiA0MiAyMCA0MkgxMEM4Ljg5NTQzIDQyIDggNDEuMTA0NiA4IDQwVjhaIiBmaWxsPSIjRkZCMDIwIiBmaWxsLW9wYWNpdHk9IjAuOSIvPjxwYXRoIGQ9Ik0yNiA4QzI2IDYuODk1NDMgMjYuODk1NCA2IDI4IDZIMzhDMzkuMTA0NiA2IDQwIDYuODk1NDMgNDAgOFY0MEM0MCA0MS4xMDQ2IDM5LjEwNDYgNDIgMzggNDJIMjhDMjYuODk1NCA0MiAyNiA0MS4xMDQ2IDI2IDQwVjhaIiBmaWxsPSIjRkY2QjAwIi8+PHBhdGggZD0iTTIwIDZIMjhWNDJIMjBWNloiIGZpbGw9IiNFNjU1MTEiLz48bGluZSB4MT0iMTIiIHkxPSIxNCIgeDI9IjE4IiB5Mj0iMTQiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2Utb3BhY2l0eT0iMC42Ii8+PGxpbmUgeDE9IjEyIiB5MT0iMTgiIHgyPSIxOCIgeTI9IjE4IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLW9wYWNpdHk9IjAuNiIvPjxsaW5lIHgxPSIxMiIgeTE9IjIyIiB4Mj0iMTYiIHkyPSIyMiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1vcGFjaXR5PSIwLjYiLz48bGluZSB4MT0iMzAiIHkxPSIxNCIgeDI9IjM2IiB5Mj0iMTQiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2Utb3BhY2l0eT0iMC42Ii8+PGxpbmUgeDE9IjMwIiB5MT0iMTgiIHgyPSIzNiIgeTI9IjE4IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLW9wYWNpdHk9IjAuNiIvPjxsaW5lIHgxPSIzMCIgeTE9IjIyIiB4Mj0iMzQiIHkyPSIyMiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1vcGFjaXR5PSIwLjYiLz48L3N2Zz4=";
const iconShowcase = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkMyIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzk1NTBCQiIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzZFNDhBQSIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxwYXRoIGZpbGw9InVybCgjZ3JhZDMpIiBkPSJNOCw1djE0bDExLTdMOCw1eiIvPjwvc3ZnPg==";
const iconProfile = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkOCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzRGQUNGZSIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzAwRjJGRSIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxwYXRoIGZpbGw9InVybCgjZ3JhZDgpIiBkPSJNMTIsMTkuMkM5LjUsMTkuMiA3LjI5LDE3LjkyIDYsMTZDNi4wMywxNCAxMCwxMi45IDEyLDEyLjlDMTQsMTIuOSAxNy45NywxNCAxOCwxNkMxNi43MSwxNy45MiAxNC41LDE5LjIgMTIsMTkuMk0xMiw1QTMsMyAwIDAsMSAxNSw4QTMsMyAwIDAsMSAxMiwxMUEzLDMgMCAwLDEgOSw4QTMsMyAwIDAsMSAxMiw1TTEyLDJBMTAsMTAgMCAwLDAgMiwxMkExMCwxMCAwIDAsMCAxMiwyMkExMCwxMCAwIDAsMCAyMiwxMkExMCwxMCAwIDAsMCAxMiwyWiIvPjwvc3ZnPg==";
// 3. 产品上新 (打开的礼盒 - 方正盒子，飘逸的丝带)
// ================== 3. 产品上新 (粉色礼盒 + 金色炸裂丝带) ==================
// 惊喜感强，丝带向外喷射，盒子改为粉色
const iconNew = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9InBpbmtCb3giIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNGRjkzQUMiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNGRjRCN0QiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0icmliYm9uR29sZCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI0ZGRDU0RiIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI0ZGNkYwMCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjwhLS0gQm94IEJvZHkgKFBpbmspIC0tPjxwYXRoIGQ9Ik0xMCAyNEwyNCAzMEwzOCAyNFYzOEwyNCA0NEwxMCAzOFYyNFoiIGZpbGw9InVybCgjcGlua0JveCkiLz48IS0tIFRvcCBmYWNlIChEYXJrZXIgUGluaykgLS0+PHBhdGggZD0iTTEwIDI0TDI0IDE4TDM4IDI0IiBmaWxsPSIjRDMzRTY2Ii8+PCEtLSBCdXJzdGluZyBSaWJib25zIChHb2xkKSAtLT48cGF0aCBkPSJNMjQgMjRDMjQgMTggMjAgMTQgMTYgMTgiIHN0cm9rZT0idXJsKCNyaWJib25Hb2xkKSIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48cGF0aCBkPSJNMjQgMjRDMjYgMTggMzIgMTQgMzYgMTgiIHN0cm9rZT0idXJsKCNyaWJib25Hb2xkKSIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48cGF0aCBkPSJNMjQgMjRDMjQgMTYgMjggMTAgMzIgMTIiIHN0cm9rZT0idXJsKCNyaWJib25Hb2xkKSIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48cGF0aCBkPSJNMjQgMjRDMjQgMTggMjAgMTAgMTYgMTAiIHN0cm9rZT0idXJsKCNyaWJib25Hb2xkKSIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48cGF0aCBkPSJNMjQgMzBWNDQiIHN0cm9rZT0idXJsKCNyaWJib25Hb2xkKSIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48Y2lyY2xlIGN4PSIxNCIgY3k9IjEyIiByPSIyIiBmaWxsPSIjRkZDMTA3Ii8+PGNpcmNsZSBjeD0iMzYiIGN5PSIxMCIgcj0iMiIgZmlsbD0iI0ZGQzEwNyIvPjwvc3ZnPg==";
const iconRank = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkNiIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2ZhNzA5YSIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2ZlZTE0MCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxwYXRoIGZpbGw9InVybCgjZ3JhZDYpIiBkPSJNNCwxOFYxM0g5VjE4SDRNMTAsMThWOUgxNVYxOEgxME0xNiwxOFYxNEgyMVYxOEgxNloiLz48L3N2Zz4=";
const iconShop = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkNyIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzY2N2VlYSIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzc2NGJhMiIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxwYXRoIGZpbGw9InVybCgjZ3JhZDcpIiBkPSJNMTcsMThBMiwyIDAgMCwxIDE5LDIwQTIsMiAwIDAsMSAxNywyMkMxNS44OSwyMiAxNSwyMS4xIDE1LDIwQzE1LDE4Ljg5IDE1Ljg5LDE4IDE3LDE4TTEsMlY0SDJMNi42LDExLjU5TDUuMjQsMTQuMDRDNS4wOSwxNC4zMiA1LDE0LjY1IDUsMTVBMiwyIDAgMCwwIDcsMTdIMTlWMTVINy40MkEwLjI1LDAuMjUgMCAwLDEgNy4xNywxNC43NUM3LjE3LDE0LjcgNy4xOCwxNC42NiA3LjIsMTQuNjNMOC4xLDEzSDE1LjU1QzE2LjMsMTMgMTYuOTYsMTIuNTggMTcuMywxMS45N0wyMC44OCw1LjVDMjAuOTUsNS4zNCAyMSw1LjE3IDIxLDVBMSwxIDAgMCwwIDIwLDRINS4yMUw0LjI3LDJNNywxOEEyLDIgMCAwLDEgOSwyMEEyLDIgMCAwLDEgNywyMkM1Ljg5LDIyIDUsMjEuMSA1LDIwQzUsMTguODkgNS44OSwxOCA3LDE4WiIvPjwvc3ZnPg==";

Page({
  data: {
    // 状态控制
    hasEntered: false,      // 控制入场动画启动
    
    isDragging: false,
    dragOffset: 0,
    currentIndex: 0, // 默认选中第0个，即"产品上新"
    
    // 按照你的要求 1-12 顺序排列
    // === 在这里单独调整每个图标的大小 ===
    list: [
      { 
        id: 3, 
        title: '产品上新', 
        en: 'NEW ARRIVALS', 
        iconSvg: iconNew, 
        iconSize: '110rpx' // <---【在这里改】因为是发散的丝带，给最大
      },
      { 
        id: 4, 
        title: '产品选购', 
        en: 'SHOPPING', 
        iconSvg: iconShop, 
        iconSize: '72rpx'  // <---【在这里改】实心购物车，稍微改小显得精致
      },
      { 
        id: 10, 
        title: '案例展示', 
        en: 'SHOWCASE', 
        iconSvg: iconShowcase, 
        iconSize: '80rpx'  // <---【在这里改】标准大小
      },
      { 
        id: 5, 
        title: '排行榜单', 
        en: 'RANKING LIST', 
        iconSvg: iconRank, 
        iconSize: '80rpx' 
      },
      { 
        id: 9, 
        title: 'OTA升级', 
        en: 'SYSTEM UPDATE', 
        iconSvg: iconOTA, 
        iconSize: '80rpx' 
      },
      { 
        id: 8, 
        title: '联系方式', 
        en: 'CONTACT US', 
        iconSvg: iconContact, 
        iconSize: '80rpx' 
      },
      { 
        id: 1, 
        title: '控制中心', 
        en: 'CONTROL CENTER', 
        iconSvg: iconControl, 
        iconSize: '80rpx' 
      },
      { 
        id: 7, 
        title: '安装教程', 
        en: 'VIDEO GUIDE', 
        iconSvg: iconInstall, 
        iconSize: '80rpx' 
      },
      { 
        id: 11, 
        title: '使用手册', 
        en: 'USER MANUAL', 
        iconSvg: iconManual, 
        iconSize: '80rpx' 
      },
      { 
        id: 6, 
        title: '维修中心', 
        en: 'SERVICE & REPAIR', 
        iconSvg: iconRepair, 
        iconSize: '80rpx' 
      },
      { 
        id: 12, 
        title: '附近门店', 
        en: 'NEARBY STORES', 
        iconSvg: iconStore, 
        iconSize: '80rpx' 
      },
      { 
        id: 2, 
        title: '我的信息', 
        en: 'MY PROFILE', 
        iconSvg: iconProfile, 
        iconSize: '80rpx' 
      }
    ]
  },

  onLoad() {
    // 1. 进页面 300ms 后触发入场
    setTimeout(() => {
      this.setData({ hasEntered: true });
    }, 300);
  },

  // === 1:1 跟手滑动 ===
  touchStartY: 0,

  onTouchStart(e) {
    this.touchStartY = e.changedTouches[0].clientY;
    this.setData({ isDragging: true });
  },

  onTouchMove(e) {
    if (!this.data.isDragging) return;
    const currentY = e.changedTouches[0].clientY;
    const diff = currentY - this.touchStartY;
    
    // 1:1 跟手，限制最大滑动距离 ±300px 防止拖太远
    let restrictedDiff = diff;
    if (restrictedDiff > 300) restrictedDiff = 300;
    if (restrictedDiff < -300) restrictedDiff = -300;

    // 直接 1:1 跟手，方向与手指保持一致
    this.setData({ dragOffset: restrictedDiff });
  },

  onTouchEnd(e) {
    if (!this.data.isDragging) return;
    
    const endY = e.changedTouches[0].clientY;
    const diff = endY - this.touchStartY;
    const threshold = 80; // 滑过约 1/3 卡片高度即切换
    
    const len = this.data.list.length;
    let newIndex = this.data.currentIndex;

    // 往上滑 (diff < 0) -> 看下面的卡片 (index变大，循环)
    if (diff < -threshold) {
      newIndex = (newIndex + 1) % len;
    } 
    // 往下滑 (diff > 0) -> 看上面的卡片 (index变小，循环)
    else if (diff > threshold) {
      newIndex = (newIndex - 1 + len) % len;
    }

    this.setData({
      isDragging: false,
      dragOffset: 0,
      currentIndex: newIndex
    });

    if (newIndex !== this.data.currentIndex) {
      wx.vibrateShort({ type: 'light' });
    }
  },

  onCardTap(e) {
    const { index, id, title } = e.currentTarget.dataset;
    const idx = parseInt(index);

    if (this.data.currentIndex !== idx) {
      // 如果点的不是当前中间的，就切换过去
      this.setData({ currentIndex: idx });
    } else {
      // 如果点的是中间的，就跳转
      wx.vibrateShort({ type: 'light' });
      this.executeNavigation(id);
    }
  },

  // 跳转逻辑
  executeNavigation(id) {
    console.log('点击的ID:', id);
    
    // 联系方式直接跳转
    if (id === 8) {
      wx.navigateTo({ 
        url: '/pages/call/call',
        success: function() {
          console.log('联系方式跳转成功');
        },
        fail: function(err) {
          console.log('联系方式跳转失败:', err);
          wx.showToast({ title: '跳转失败: ' + JSON.stringify(err), icon: 'none' });
        }
      });
      return;
    }

    let target = '';
    // 根据 ID 匹配跳转路径
    switch (id) {
      case 3: target = '/pages/pagenew/pagenew'; break; // 产品上新
      case 4: target = '/pages/shop/shop'; break;        // 产品选购
      case 10: target = '/pages/case/case'; break;      // 案例展示
      case 5: target = '/pages/paihang/paihang'; break; // 排行榜单
      case 1: target = '/pages/scan/scan'; break;       // 控制中心
      case 9: target = '/pages/ota/ota'; break;         // OTA升级
      case 6: target = '/pages/shouhou/shouhou'; break; // 维修中心
      case 7: target = '/pages/azjc/azjc'; break;       // 安装教程
      case 12: target = '/pages/home/home'; break;       // 附近门店
      // 其他待开发...
      default: target = ''; break;
    }
    
    if (target) {
      wx.navigateTo({ url: target });
    } else {
      wx.showToast({ title: '功能开发中', icon: 'none' });
    }
  },
  
  goBack() { 
    wx.reLaunch({ url: '/pages/index/index' }); 
  }
});
