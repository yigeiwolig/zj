// patched by assistant
// pages/scan/scan.js

// ==========================================
// 1. 定义 Base64 图标资源 (确保稳定显示)
// ==========================================
const iconLock = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxQzFDMUUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSIzIiB5PSIxMSIgd2lkdGg9IjE4IiBoZWlnaHQ9IjExIiByeD0iMiIgcnk9IjIiPjwvcmVjdD48cGF0aCBkPSJNNyAxMVY3YTUgNSAwIDAgMSAxMCAwdjQiPjwvcGF0aD48L3N2Zz4=';

// 箭头 (打开角度)
const iconArrowUp = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxQzFDMUUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTggMTUgMTIgOSA2IDE1Ii8+PC9zdmc+';

// 翻开（牌面下放）
const iconFlapOpen = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxQzFDMUUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNNSA3aDE0Ii8+PHBhdGggZD0iTTggN2wyIDExaDRsMi0xMSIvPjxwYXRoIGQ9Ik0xMiAxOHY0Ii8+PC9zdmc+';

// 收起（牌面收回贴合）
const iconFlapFold = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaZWlnaHQ9IjI0IiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzFDMUMxRSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik01IDdoMTQiLz48cGF0aCBkPSJNMTIgNHY0Ii8+PHBhdGggZD0ibTkgNi41IDMgLTMgMyAzIi8+PHBhdGggZD0iTTggN2g4djEyaC04eiIvPjwvc3ZnPg==';

// 校准 (水平线+箭头)
const iconCali = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxRDFEMUYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjEgMTJhOSA5IDAgMCAwLTktOSA5Ljc1IDkuNzUgMCAwIDAtNi43NCAyLjc0TDMgOCIvPjxwYXRoIGQ9Ik0zIDN2NWg1Ii8+PHBhdGggZD0iTTMgMTJhOSA5IDAgMCAwIDkgOSA5Ljc1IDkuNzUgMCAwIDAgNi43NC0yLjc0TDIxIDE2Ii8+PHBhdGggZD0iTTE2IDIxaDV2LTUiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIyIiBmaWxsPSIjMUQxRDFGIiBzdHJva2U9Im5vbmUiLz48L3N2Zz4=';

// 设置 (简约齿轮)
const iconGear = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxRDFEMUYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTIuMjIgMkgxMS43OEEyIDIgMCAwIDAgOS43OCA0LjE4VjQuMzZBMiAyIDAgMCAxIDguNzggNi4wOUw4LjM1IDYuMzRBMiAyIDAgMCAxIDYuMzUgNi4zNEw2LjIgNi4yNkEyIDIgMCAwIDAgMy40NyA2Ljk5TDMuMjUgNy4zN0EyIDIgMCAwIDAgMy45OCAxMC4xTDQuMTMgMTAuMkEyIDIgMCAwIDEgNS4xMyAxMS45MlYxMi40M0EyIDIgMCAwIDEgNC4xMyAxNC4xNUwzLjk4IDE0LjI1QTIgMiAwIDAgMCAzLjI1IDE2Ljk4TDMuNDcgMTcuMzZBMiAyIDAgMCAwIDYuMiAxOC4wOUw2LjM1IDE4LjAxQTIgMiAwIDAgMSA4LjM1IDE4LjAxTDguNzggMTguMjZBMiAyIDAgMCAxIDkuNzggMTkuOThWMjAuMTZBMiAyIDAgMCAwIDExLjc4IDIySDEyLjIyQTIgMiAwIDAgMCAxNC4yMiAxOS44MlYxOS42NGEyIDIgMCAwIDEgMS0xLjczTDE1LjY1IDE3LjY2QTIgMiAwIDAgMSAxNy42NSAxNy42NkwxNy44IDE3Ljc0QTIgMiAwIDAgMCAyMC41MyAxNy4wMUwyMC43NSAxNi42M0EyIDIgMCAwIDAgMjAuMDIgMTMuOUwyMC43NSAxNi42M0EyIDIgMCAwIDAgMjAuMDIgMTMuOUwyMC4xMyAxMy44QTIgMiAwIDAgMSAxOS4xMyAxMi4wOFYxMS41N0EyIDIgMCAwIDEgMjAuMTMgOS44NUwyMC4yOCA5Ljc1QTIgMiAwIDAgMCAyMS4wMSA3LjAyTDIwLjc5IDYuNjRBMiAyIDAgMCAwIDE4LjA2IDUuOTFMMTcuOTEgNi4wMUEyIDIgMCAwIDEgMTUuOTEgNC4yOUwxNS40OCA0LjA0QTIgMiAwIDAgMSAxNC40OCAyLjMyVjIuMTRBMiAyIDAgMCAwIDEyLjIyIDJaIi8+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMyIvPjwvc3ZnPg==';

// 蓝牙小图标 (白色)
const iconBtSmall = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cG9seWxpbmUgcG9pbnRzPSI2LjUgNi41IDE3LjUgMTcuNSAxMiAyMyAxMiAxIDE3LjUgNi41IDYuNSAxNy41Ij48L3BvbHlsaW5lPjwvc3ZnPg==';

// 麦克风 (语音控制)
const iconMic = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxQzFDMUUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTIgMmEzIDMgMCAwIDAtMyAzdjdhMyAzIDAgMCAwIDYgMFY1YTMzIDAgMCAwLTEyLTNaIi8+PHBhdGggZD0iTTE5IDEwdjJhNyA3IDAgMCAxLTE0IDB2LTIiLz48bGluZSB4MT0iMTIiIHgyPSIxMiIgeTE9IjE5IiB5Mj0iMjIiLz48L3N2Zz4=';

// 重置图标 (圆形箭头)
const iconReset = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxQzFDMUUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMyAxMkExMiAxMiAwIDAgMSAxNSA0LjA0VjFhMSAxIDAgMCAxIDEuNzA3LS43MDdsNCA0YTEgMSAwIDAgMSAwIDEuNDE0bC00IDRhMSAxIDAgMCAxLTEuNzA3LS43MDdWOC4wNEE5IDkgMCAwIDAgMyAxMkgzWiIvPjxwYXRoIGQ9Ik0yMSAxMkE5IDkgMCAwIDAgOSA4LjA0VjExYTEgMSAwIDAgMS0xLjcwNy43MDdsLTQtNGExIDEgMCAwIDEgMC0xLjQxNGw0LTRhMSAxIDAgMCAxIDEuNzA3LjcwN1Y0LjA0QTEyIDEyIDAgMCAxIDIxIDEySDIxWiIvPjwvc3ZnPg==';

// 小齿轮图标 (用于高级设置)
const iconGearSmall = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxQzFDMUUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIyLjUiLz48cGF0aCBkPSJNMTIuNzUgNS41YTEuNzUgMS43NSAwIDAgMSAxLjUgMHYxLjVhMS43NSAxLjc1IDAgMCAxLTEuNSAwdi0xLjVaIi8+PHBhdGggZD0iTTE4LjUgMTJhMS43NSAxLjc1IDAgMCAxLTEuNSAxLjV2MS41YTEuNzUgMS43NSAwIDAgMSAxLjUgMHYtMS41WiIvPjxwYXRoIGQ9Ik0xMS4yNSAxOC41YTEuNzUgMS43NSAwIDAgMSAxLjUgMHYxLjVhMS43NSAxLjc1IDAgMCAxLTEuNSAwdi0xLjVaIi8+PHBhdGggZD0iTTUuNSAxMmExLjc1IDEuNzUgMCAwIDEgMS41LTEuNVY5YTEuNzUgMS43NSAwIDAgMS0xLjUgMHYxLjVaIi8+PHBhdGggZD0iTTEyLjc1IDE4LjVhMS43NSAxLjc1IDAgMCAxIDEuNSAwdjEuNWExLjc1IDEuNzUgMCAwIDEtMS41IDB2LTEuNVoiLz48cGF0aCBkPSJNNS41IDEyYTEuNzUgMS43NSAwIDAgMSAxLjUgMS41VjE1YTEuNzUgMS43NSAwIDAgMS0xLjUgMHYtMS41WiIvPjxwYXRoIGQ9Ik0xOC41IDEyYTEuNzUgMS43NSAwIDAgMS0xLjUtMS41VjlhMS43NSAxLjc1IDAgMCAxIDEuNSAwdjEuNVoiLz48L3N2Zz4=';

// 连接图标 (主页大胶囊用)
const iconConnect = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTUgN0gxN0MyMC4zMTM3IDcgMjMgOS42ODYyOSAyMyAxM0MyMyAxNi4zMTM3IDIwLjMxMzcgMTkgMTcgMTlIMTVNOCAxN0g2QzIuNjg2MjkgMTcgMCAxNC4zMTM3IDAgMTNDMCA5LjY4NjI5IDIuNjg2MjkgNyA2IDdIOE04IDEzSDE2IiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMi41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48L3N2Zz4=';

// 侧边图标 (折叠动画用)
const iconSide = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE0MCIgdmlld0JveD0iMCAwIDIwMCAxNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgICA8IS0tIExlZnQgU3RpY2sgLS0+CiAgICA8cmVjdCB4PSI4NSIgeT0iMjAiIHdpZHRoPSIxMiIgaGVpZ2h0PSIxMDAiIHJ4PSI2IiBmaWxsPSIjMUMxQzFFIiAvPgogICAgPCEtLSBSaWdodCBTdGljayAtLT4KICAgIDxyZWN0IHg9IjEwNSIgeT0iMjAiIHdpZHRoPSIxMiIgaGVpZ2h0PSIxMDAiIHJ4PSI2IiBmaWxsPSIjMUMxQzFFIiAvPgo8L3N2Zz4=';

// ==========================================
// 2. 设备模型资源 (F1/F2 Pro/Max)
// ==========================================
const iconF1Pro = '/images/mt-f1-pro.svg';
const iconF1Max = '/images/mt-f1-max.svg';
const iconF1ProMax = '/images/mt-f1-pro-max.svg';
const iconF2Pro = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE0MCIgdmlld0JveD0iMCAwIDIwMCAxNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTE1IDMwIEgxOTAgQzE5NSAzMCAxOTUgMzUgMTk1IDM1IFY0OCBDMTk1IDUzIDE5MCA1MyAxOTAgNTMgSDEyMSBWNjkgSDEyMi41IEMxMjcuNSA2OSAxMjcuNSA3NCAxMjcuNSA3NCBWOTQgQzEyNy41IDk5IDEyMi41IDk5IDEyMi41IDk5IEg4Mi41IEM3Ny41IDk5IDc3LjUgOTQgNzcuNSA5NCBWNzQgQzc3LjUgNjkgODIuNSA2OSA4Mi41IDY5IEg4NCBWNTMgSDE1IEMxMCA1MyAxMCA0OCAxMCA0OCBWMzUgQzEwIDMwIDE1IDMwIDE1IDMwIFoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzFDMUMxRSIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHJlY3QgeD0iMzYiIHk9IjM3IiB3aWR0aD0iMjYiIGhlaWdodD0iOCIgcng9IjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzFDMUMxRSIgc3Ryb2tlLXdpZHRoPSIzIi8+PHJlY3QgeD0iMTQ1IiB5PSIzOCIgd2lkdGg9IjI1IiBoZWlnaHQ9IjgiIHJ4PSI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxQzFDMUUiIHN0cm9rZS13aWR0aD0iMyIvPjx0ZXh0IHg9IjEwMi41IiB5PSI3MiIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iOTAwIiBmb250LXNpemU9IjE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMUMxQzFFIj48dHNwYW4geD0iMTAyLjUiIGR5PSIwIj5NPC90c3Bhbj48dHNwYW4geD0iMTAyLjUiIGR5PSIxNiI+VDwvdHNwYW4+PC90ZXh0Pjwvc3ZnPg==';
const iconF2Max = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE0MCIgdmlld0JveD0iMCAwIDIwMCAxNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTE1IDMwIEgxOTAgQzE5NSAzMCAxOTUgMzUgMTk1IDM1IFY0OCBDMTk1IDUzIDE5MCA1MyAxOTAgNTMgSDEyMSBWNjkgSDEyMi41IEMxMjcuNSA2OSAxMjcuNSA3NCAxMjcuNSA3NCBWOTQgQzEyNy41IDk5IDEyMi41IDk5IDEyMi41IDk5IEg4Mi41IEM3Ny41IDk5IDc3LjUgOTQgNzcuNSA5NCBWNzQgQzc3LjUgNjkgODIuNSA2OSA4Mi41IDY5IEg4NCBWNTMgSDE1IEMxMCA1MyAxMCA0OCAxMCA0OCBWMzUgQzEwIDMwIDE1IDMwIDE1IDMwIFoiIGZpbGw9IiMxQzFDMUUiLz48cmVjdCB4PSIzNiIgeT0iMzciIHdpZHRoPSIyNiIgaGVpZ2h0PSI4IiByeD0iNSIgZmlsbD0iI0ZGRkZGRiIvPjxyZWN0IHg9IjE0NSIgeT0iMzgiIHdpZHRoPSIyNSIgaGVpZ2h0PSI4IiByeD0iNCIgZmlsbD0iI0ZGRkZGRiIvPjx0ZXh0IHg9IjEwMi41IiB5PSI3MiIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iOTAwIiBmb250LXNpemU9IjE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjRkZGRkZGIj48dHNwYW4geD0iMTAyLjUiIGR5PSIwIj5NPC90c3Bhbj48dHNwYW4geD0iMTAyLjUiIGR5PSIxNiI+VDwvdHNwYW4+PC90ZXh0Pjwvc3ZnPg==';
// F2 MAX Long 图标（独立）
const iconF2MaxLong = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTE1IDI5SDE5MEMxOTUgMjkgMTk1IDM0LjE0NjQgMTk1IDM0LjE0NjRWNDcuNTI2OUMxOTUgNTIuNjczMiAxOTAgNTIuNjczMiAxOTAgNTIuNjczMkgxMjFWMTEwLjVIMTIyLjVDMTMwLjg0NSAxMTAuNSAxMzAuODQ1IDExNy40NiAxMzAuODQ1IDExNy40NlYxMzcuNzI5QzEzMC44NDUgMTQ0LjUgMTIyLjUgMTQ0LjUgMTIyLjUgMTQ0LjVIODIuNUM3NC4xNTQ1IDE0NC41IDc0LjE1NDUgMTM3LjcyOSA3NC4xNTQ1IDEzNy43MjlWMTE3LjQ2Qzc0LjE1NDUgMTEwLjUgODIuNSAxMTAuNSA4Mi41IDExMC41VjUyLjY3MzJIMTVDMTAgNTIuNjczMiAxMCA0Ny41MjY5IDEwIDQ3LjUyNjlWMzQuMTQ2NEMxMCAyOSAxNSAyOSAxNSAyOVoiIGZpbGw9IiMxQzFDMUUiLz48cGF0aCBkPSJNNTYgMzdINDBDMzcuMjM4NiAzNyAzNSAzOC43OTA5IDM1IDQxQzM1IDQzLjIwOTEgMzcuMjM4NiA0NSA0MCA0NUg1NkM1OC43NjE0IDQ1IDYxIDQzLjIwOTEgNjEgNDFDNjEgMzguNzkwOSA1OC43NjE0IDM3IDU2IDM3WiIgZmlsbD0id2hpdGUiLz48cGF0aCBkPSJNMTY1IDM3SDE0OUMxNDYuMjM5IDM3IDE0NCAzOC43OTA5IDE0NCA0MUMxNDQgNDMuMjA5MSAxNDYuMjM5IDQ1IDE0OSA0NUgxNjVDMTY3Ljc2MSA0NSAxNzAgNDMuMjA5MSAxNzAgNDFDMTcwIDM4Ljc5MDkgMTY3Ljc2MSAzNyAxNjUgMzdaIiBmaWxsPSJ3aGl0ZSIvPjxwYXRoIGQ9Ik04NCA4N0gxMjEiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMi41IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48cGF0aCBkPSJNMTAyLjUgNjRDMTA0LjQzMyA2NCAxMDYgNjIuNDMzIDEwNiA2MC41QzEwNiA1OC41NjcgMTA0LjQzMyA1NyAxMDIuNSA1N0MxMDAuNTY3IDU3IDk5IDU4LjU2NyA5OSA2MC41Qzk5IDYyLjQzMyAxMDAuNTY3IDY0IDEwMi41IDY0WiIgZmlsbD0id2hpdGUiLz48cGF0aCBkPSJNMTAyLjUgODJDMTA0LjQzMyA4MiAxMDYgODAuNDMzIDEwNiA3OC41QzEwNiA3Ni41NjcgMTA0LjQzMyA3NSAxMDIuNSA3NUMxMDAuNTY3IDc1IDk5IDc2LjU2NyA5OSA3OC41Qzk5IDgwLjQzMyAxMDAuNTY3IDgyIDEwMi41IDgyWiIgZmlsbD0id2hpdGUiLz48cGF0aCBkPSJNMTAyLjUgMTAxQzEwNC40MzMgMTAxIDEwNiA5OS40MzMgMTA2IDk3LjVDMTA2IDk1LjU2NyAxMDQuNDMzIDk0IDEwMi41IDk0QzEwMC41NjcgOTQgOTkgOTUuNTY3IDk5IDk3LjVDOTkgOTkuNDMzIDEwMC41NjcgMTAxIDEwMi41IDEwMVoiIGZpbGw9IndoaXRlIi8+PHBhdGggZD0iTTkwLjMzOTggMTE5LjA5MUg5My4xODQyTDk2LjE4ODUgMTI2LjQySDk2LjMxNjNMOTkuMzIwNiAxMTkuMDkxSDEwMi4xNjVWMTMwSDk5LjkyNzhWMTIyLjlIOTkuODM3M0w5Ny4wMTQxIDEyOS45NDdIOTUuNDkwN0w5Mi42Njc1IDEyMi44NzNIOTIuNTc3VjEzMEg5MC4zMzk4VjExOS4wOTFaTTEwNy4xMjIgMTIwLjk5M1YxMTkuMDkxSDExNi4wODFWMTIwLjk5M0gxMTIuNzQxVjEzMEgxMTAuNDYxVjEyMC45OTNIMTA3LjEyMloiIGZpbGw9IndoaXRlIi8+PC9zdmc+';
// F2 Ultra 图标（与 MAX 同款视觉，可后续替换独立 SVG）
const iconF2Ultra = iconF2Max;
// F3 横版 MT 整机标：Max 实心 / Pro 线条（源文件 images/mt-f3-machine-*.svg，可直接替换为你的原 SVG）
const iconF3Pro = '/images/mt-f3-machine-pro.svg';
const iconF3Max = '/images/mt-f3-machine-max.svg';
const iconCanLearn = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE0MCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3QgeD0iMjAiIHk9IjMwIiB3aWR0aD0iMTYwIiBoZWlnaHQ9IjEwMCIgcng9IjE2IiBzdHJva2U9IiMxQzFDMUUiIHN0cm9rZS13aWR0aD0iNCIvPjx0ZXh0IHg9IjEwMCIgeT0iNzAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIzNiIgZm9udC13ZWlnaHQ9IjcwMCIgZmlsbD0iIzFEMDFDRiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Q0FOPC90ZXh0Pjx0ZXh0IHg9IjEwMCIgeT0iMTA4IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZTdiviIgZmlsbD0iIzZCNzI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+T0JEPC90ZXh0Pjwvc3ZnPg==';

// 小幽灵图标（睁眼 - 开启隐蔽模式）
const iconGhostOpen = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjAgMTFWMTlDMjAgMjAuNiAxOCAyMS41IDE3IDIwLjVMMTYgMTkuNUwxNCAyMS41QzEzLjIgMjIuMyAxMiAyMS44IDEyIDIwLjhWMjAuOEMxMiAyMS44IDEwLjggMjIuMyAxMCAyMS41TDggMTkuNUw3IDIwLjVDNiAyMS41IDQgMjAuNiA0IDE5VjExQzQgNi41OCA3LjU4IDMgMTIgM0MxNi40MiAzIDIwIDYuNTggMjAgMTFaIiBmaWxsPSJ3aGl0ZSIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48Y2lyY2xlIGN4PSI5IiBjeT0iMTEiIHI9IjEuNSIgZmlsbD0iYmxhY2siLz48Y2lyY2xlIGN4PSIxNSIgY3k9IjExIiByPSIxLjUiIGZpbGw9ImJsYWNrIi8+PC9zdmc+';

// 小幽灵图标（闭眼 - 退出隐蔽模式）
const iconGhostClose = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjAgMTFWMTlDMjAgMjAuNiAxOCAyMS41IDE3IDIwLjVMMTYgMTkuNUwxNCAyMS41QzEzLjIgMjIuMyAxMiAyMS44IDEyIDIwLjhWMjAuOEMxMiAyMS44IDEwLjggMjIuMyAxMCAyMS41TDggMTkuNUw3IDIwLjVDNiAyMS41IDQgMjAuNiA0IDE5VjExQzQgNi41OCA3LjU4IDMgMTIgM0MxNi40MiAzIDIwIDYuNTggMjAgMTFaIiBmaWxsPSJ3aGl0ZSIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48bGluZSB4MT0iNy41IiB5MT0iMTEiIHgyPSIxMC41IiB5Mj0iMTEiIHN0cm9rZT0iYmxhY2siIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PGxpbmUgeDE9IjEzLjUiIHkxPSIxMSIgeDI9IjE2LjUiIHkyPSIxMSIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48L3N2Zz4=';

// ==========================================
// 蓝牙连接工具类 (你提供的代码融合)
// ==========================================
class BLEHelper {
  constructor(api = wx) {
    this.api = api; 
    this.bleList = [];
    this.hasConnected = false;
    this.isScanning = false;
    this.autoScanInterval = null;
    this.openTimer = null;
    this.openCandidate = null;
    
    // 设备信息
    this.device = null;
    this.lastConnectedDevice = null;
    this._manualDisconnect = false;
    this._connListenerSetup = false;
    this.serviceId = '';
    this.characteristicId = '';      
    this.characteristicId2 = '';     
    this.serviceIdf0 = '';
    this.characteristicId01 = '';    
    this.characteristicId02 = '';    
    
    // 回调函数
    this.onDeviceFound = null;       
    this.onConnecting = null;        // 新增：连接中回调
    this.onLinkEstablished = null;   // BLE 物理链路已建立（早于服务发现）
    this.onConnected = null;
    this.onConnectFailed = null;         
    this.onDisconnected = null;      
    this.onDataReceived = null;      
    this.onError = null;             
  }

  initBluetoothAdapter() {
    return new Promise((resolve, reject) => {
      // 先检查系统蓝牙是否开启
      this.api.getBluetoothAdapterState({
        success: (res) => {
          if (!res.available) {
            reject(new Error('系统蓝牙未开启，请先开启系统蓝牙'));
            return;
          }
          // 蓝牙已开启，初始化适配器
          this.api.openBluetoothAdapter({
            success: (res) => {
              this.api.onBluetoothAdapterStateChange((res) => {
                console.log('蓝牙适配器状态变化', res);
              });
              resolve(res);
            },
            fail: (err) => {
            // 如果用户拒绝蓝牙授权，提示去设置中开启
            if (err && err.errMsg && err.errMsg.includes('auth deny')) {
              // 🔴 使用回调方式，让Page层处理弹窗
              if (this.onError) {
                this.onError({ 
                  type: 'auth_deny',
                  message: '蓝牙权限被拒绝',
                  detail: '请在系统设置中开启蓝牙，并允许小程序使用蓝牙功能。'
              });
              }
            }
              if (this.onError) this.onError(err);
              reject(err);
            }
          });
        },
        fail: (err) => {
          // 如果getBluetoothAdapterState失败，直接尝试openBluetoothAdapter
          // 这可能是因为适配器还未初始化
          this.api.openBluetoothAdapter({
            success: (res) => {
              this.api.onBluetoothAdapterStateChange((res) => {
                console.log('蓝牙适配器状态变化', res);
              });
              resolve(res);
            },
            fail: (err) => {
              // 如果是权限错误，提供更友好的提示
              if (err.errMsg && err.errMsg.includes('auth deny')) {
                // 🔴 使用回调方式，让Page层处理弹窗
                if (this.onError) {
                  this.onError({ 
                    type: 'auth_deny',
                    message: '蓝牙功能不可用',
                    detail: '请确保：\n1. 系统蓝牙已开启\n2. 已授权小程序使用蓝牙功能\n\n可在手机设置中检查权限'
                });
                }
              }
              if (this.onError) this.onError(err);
              reject(err);
            }
          });
        }
      });
    });
  }

  startScan(options = {}) {
    const { powerLevel = 'high', allowDuplicatesKey = true } = options;
    this.isScanning = true;
    this.hasConnected = false;
    this.bleList = [];

    this.api.startBluetoothDevicesDiscovery({
      powerLevel: powerLevel,
      allowDuplicatesKey: allowDuplicatesKey,
      success: (res) => {
        this.setupDeviceFoundListener();
      },
      fail: (err) => {
        this.isScanning = false;
        if (this.onError) this.onError(err);
      }
    });
  }

  stopScan() {
    this.api.stopBluetoothDevicesDiscovery();
    this.isScanning = false;
    if (this.autoScanInterval) {
      clearInterval(this.autoScanInterval);
      this.autoScanInterval = null;
    }
  }

  setupDeviceFoundListener() {
    this.api.onBluetoothDeviceFound((res) => {
      const device = res.devices[0];
      if (!device) return;

      const index = this.bleList.findIndex(item => item.deviceId === device.deviceId);
      if (index === -1) {
        this.bleList.push(device);
      } else {
        this.bleList.splice(index, 1, device);
      }
      
      if (this.onDeviceFound) {
        this.onDeviceFound(this.bleList);
      }

      // 自动连接逻辑：NB开头优先
      if (!this.hasConnected && device.name && device.name.startsWith('NB')) {
        if (this.openTimer) {
          clearTimeout(this.openTimer);
          this.openTimer = null;
        }
        this.hasConnected = true;
        // 设置连接中状态
        if (this.onConnecting) this.onConnecting(device);
        this.connectDevice(device); // 内部会stopScan
        return;
      }
    });
  }

  connectDevice(device) {
    // UI Loading 已经在 Page 层面处理了，这里只处理逻辑
    this.stopScan();
    
    return new Promise((resolve, reject) => {
      this.api.createBLEConnection({
        deviceId: device.deviceId,
        success: (res) => {
          this.device = device;
          this.lastConnectedDevice = device;
          this.isScanning = false;
          this._ensureConnectionStateListener();
          if (this.onLinkEstablished) this.onLinkEstablished(device);

          setTimeout(() => {
            this.discoverServices().then(() => {
              if (this.onConnected) this.onConnected(device);
              resolve(device);
            }).catch((err) => {
              console.warn('[BLE] discoverServices failed', err);
              const manual = !!this._manualDisconnect;
              this._manualDisconnect = false;
              if (this.onConnectFailed) this.onConnectFailed(err, device, { manual });
              reject(err);
            });
          }, 800);
        },
        fail: (err) => {
          this.isScanning = false;
          if (this.onConnectFailed) this.onConnectFailed(err, device, { manual: false });
          if (this.onError) this.onError(err);
          reject(err);
        }
      });
    });
  }

  _ensureConnectionStateListener() {
    if (this._connListenerSetup) return;
    this._connListenerSetup = true;
    this.api.onBLEConnectionStateChange((res) => {
      const activeId = (this.device && this.device.deviceId)
        || (this.lastConnectedDevice && this.lastConnectedDevice.deviceId);
      if (!activeId || res.deviceId !== activeId) return;
      if (res.connected) return;
      const disconnectedDevice = this.device
        ? { ...this.device }
        : (this.lastConnectedDevice ? { ...this.lastConnectedDevice } : null);
      const wasManual = this._manualDisconnect;
      this._manualDisconnect = false;
      this.device = null;
      this.hasConnected = false;
      if (this.onDisconnected) {
        this.onDisconnected({ unexpected: !wasManual, device: disconnectedDevice, source: 'state_change' });
      }
    });
  }

  probeLinkAlive(deviceId) {
    if (!deviceId) return Promise.resolve(false);
    if (typeof this.api.getBLEConnectionState === 'function') {
      return new Promise((resolve) => {
        this.api.getBLEConnectionState({
          deviceId,
          success: (res) => resolve(!!res.connected),
          fail: () => resolve(false)
        });
      });
    }
    return new Promise((resolve) => {
      this.api.getConnectedBluetoothDevices({
        services: this.serviceId ? [this.serviceId] : ['0000FFF0-0000-1000-8000-00805F9B34FB'],
        success: (res) => {
          const list = (res && res.devices) || [];
          resolve(list.some((d) => d.deviceId === deviceId));
        },
        fail: () => resolve(false)
      });
    });
  }

  disconnect(manual = true) {
    this._manualDisconnect = !!manual;
    const device = this.device || this.lastConnectedDevice;
    const deviceId = device && device.deviceId;
    const finish = () => {
      const disconnectedDevice = device ? { ...device } : null;
      this.device = null;
      this.hasConnected = false;
      if (this.onDisconnected) {
        this.onDisconnected({ unexpected: false, device: disconnectedDevice });
      }
    };
    if (deviceId) {
      this.api.closeBLEConnection({
        deviceId,
        complete: finish
      });
    } else {
      finish();
    }
  }

  discoverServices() {
    return new Promise((resolve, reject) => {
      if (!this.device) {
        reject(new Error('设备未连接'));
        return;
      }
      this.api.getBLEDeviceServices({
        deviceId: this.device.deviceId,
        success: (res) => {
          const services = res.services || [];
          for (let i = 0; i < services.length; i++) {
            const service = services[i];
            const serviceUuid = service.uuid.toString().toUpperCase();
            if (serviceUuid.includes('FFF0')) {
              this.serviceId = service.uuid;
              this.discoverCharacteristics(this.serviceId).then(resolve).catch(reject);
              return;
            }
          }
          resolve();
        },
        fail: reject
      });
    });
  }

  discoverCharacteristics(serviceId) {
    return new Promise((resolve, reject) => {
      if (!this.device) {
        reject(new Error('设备未连接'));
        return;
      }
      this.api.getBLEDeviceCharacteristics({
        deviceId: this.device.deviceId,
        serviceId: serviceId,
        success: (res) => {
          res.characteristics.forEach(char => {
            const charUuid = char.uuid.toUpperCase();
            if (charUuid.includes('FF1')) this.characteristicId = char.uuid;
            if (charUuid.includes('FF2')) this.characteristicId2 = char.uuid;
          });
          if (serviceId === this.serviceId) {
            this.enableNotify().then(resolve).catch(reject);
          } else {
            resolve();
          }
        },
        fail: reject
      });
    });
  }

  enableNotify() {
    return new Promise((resolve, reject) => {
      if (!this.device || !this.serviceId || !this.characteristicId) {
        // 如果没有特征值，静默失败即可，不中断流程
        resolve(); 
        return;
      }
      this.api.notifyBLECharacteristicValueChange({
        state: true,
        deviceId: this.device.deviceId,
        serviceId: this.serviceId,
        characteristicId: this.characteristicId,
        success: (res) => {
          this.api.onBLECharacteristicValueChange((res) => {
             // 接收数据逻辑
             if (this.onDataReceived) this.onDataReceived(res.value);
          });
          resolve(res);
        },
        fail: reject
      });
    });
  }
}

function isF2LongType(type) {
  return type === 'Long' || type === 'Max Long';
}

function isF1UltraType(type) {
  return type === 'Ultra' || type === 'ultra' || type === 'Pro Max';
}

function isF1UltraModel(model) {
  return !!(model && model.name === 'F1' && isF1UltraType(model.type));
}

function isMaxControlLayoutType(type) {
  return type === 'Max' || isF2LongType(type) || isF1UltraType(type) || type === 'Ultra';
}

function isF2MaxModel(model) {
  if (!model) return false;
  return model.name === 'F2' && (model.type === 'Max' || isF2LongType(model.type));
}

function isF2UltraModel(model) {
  if (!model) return false;
  return model.name === 'F2' && model.type === 'Ultra';
}

function isF3MaxModel(model) {
  return !!(model && model.name === 'F3' && model.type === 'Max');
}

/** Pin2/Pin5 硬件实时监测：仅 F1 Ultra、F2 Ultra、F3 MAX */
function isHwPinMonitorModel(model) {
  return isF1UltraModel(model) || isF2UltraModel(model) || isF3MaxModel(model);
}

function buildF2ServoSpeedUi(rawSpeed) {
  const v = Math.min(100, Math.max(10, Math.round(Number(rawSpeed))));
  return { f2ServoSpeed: v };
}

function f2ServoSpeedFromTouchX(touchX, sliderLeft, sliderWidth) {
  if (!sliderWidth) return null;
  const relativeX = touchX - sliderLeft;
  const v = Math.round(10 + (relativeX / sliderWidth) * 90);
  return Math.min(100, Math.max(10, v));
}

function isF2MaxSeriesModel(model) {
  return isF2MaxModel(model) || isF2UltraModel(model);
}

/** F1 Ultra / F2 MAX 系固件：预设与微调走「自定义功能 / 完全打开 / 往上收 / 往下」 */
function usesF2StyleOpenAngleBle(model) {
  if (!model) return false;
  if (isF1UltraModel(model)) return true;
  if (model.name === 'F2') return true;
  return false;
}

function openAngleInternalToDisplayDeg(model, internal) {
  const v = parseInt(internal, 10);
  if (isNaN(v)) return 0;
  if (!model || !usesF2StyleOpenAngleBle(model)) {
    return Math.max(0, Math.min(180, v));
  }
  if (v <= 90) return Math.round(v * 30 / 90);
  return Math.round(30 + (v - 90) * 60 / 70);
}

function openAngleStickRotateDeg(model, internal) {
  return 180 - openAngleInternalToDisplayDeg(model, internal);
}

function openAnglePresetBleCommand(model, angle) {
  if (!model) return '';
  if (usesF2StyleOpenAngleBle(model)) {
    if (angle === 90) return '自定义功能';
    if (angle === 160 || angle === 180) return '完全打开';
    return '';
  }
  if (model.name === 'F1') {
    if (angle === 90) return '90度';
    if (angle === 180) return '180度';
  }
  return '';
}

function openAngleSlideBleCommands(model) {
  if (usesF2StyleOpenAngleBle(model)) {
    return { increase: '往上收', decrease: '往下' };
  }
  if (model.name === 'F1') {
    return { increase: '往上收', decrease: '往下放' };
  }
  return null;
}

function isF2MaxLikeControl(model) {
  if (!model) return false;
  return isF2MaxSeriesModel(model)
    || isF1UltraModel(model);
}

function isF2MaxDelayPowerModel(model) {
  return isF2UltraModel(model);
}

function isF2MaxStatusBleModel(model) {
  // 状态包监听：F2 MAX 系故障/高级配置 + 需硬件监测的 Ultra / F3 MAX
  return isF2MaxSeriesModel(model) || isF1UltraModel(model) || isF3MaxModel(model);
}

const F2_DELAY_POWER_RISK_MINUTES = 240; // 超过 4 小时才提示可能亏电
const F2_DELAY_POWER_RISK_SUFFIX = '　可能有亏电风险';

function buildF2DelayPowerOffOption(label, minutes) {
  const risk = minutes > F2_DELAY_POWER_RISK_MINUTES;
  return {
    label,
    minutes,
    risk,
    pickerLabel: risk ? `${label}${F2_DELAY_POWER_RISK_SUFFIX}` : label
  };
}

const F2_DELAY_POWER_OFF_OPTIONS = [
  buildF2DelayPowerOffOption('关闭（关钥匙仅保持10秒）', 0),
  buildF2DelayPowerOffOption('5分钟（系统默认）', 5),
  buildF2DelayPowerOffOption('30分钟', 30),
  buildF2DelayPowerOffOption('1小时', 60),
  buildF2DelayPowerOffOption('2小时', 120),
  buildF2DelayPowerOffOption('4小时', 240),
  buildF2DelayPowerOffOption('12小时', 720),
  buildF2DelayPowerOffOption('48小时', 2880)
];

function f2DelayPowerOffIndexByMinutes(minutes) {
  const idx = F2_DELAY_POWER_OFF_OPTIONS.findIndex((o) => o.minutes === minutes);
  return idx >= 0 ? idx : 0;
}

// 蓝牙写入队列：上一条写成功后再等 gap 才发下一条，避免串口粘包导致指令乱码
const BLE_SEND_GAP_MS = 320;
const BLE_ANGLE_STEP_GAP_MS = 380;
const OPEN_ANGLE_TICKS_PER_GESTURE = 3;
const OPEN_ANGLE_RAPID_SWIPE_WINDOW_MS = 2500;
/** 波轮：手指移动多少 px 才算拨过 1 格（1 格 = 2°，对应 tickWidthPx） */
const OPEN_ANGLE_RULER_SENSITIVITY = 1;


const { PRODUCT_DETAIL_OPTIONS } = require('../../../utils/productModels.js');

const ADMIN_BIND_MODEL_OPTIONS = PRODUCT_DETAIL_OPTIONS;

const {
  loadStoredNumLeds,
  saveStoredNumLeds,
  DEFAULT_NUM_LEDS
} = require('../../../utils/canRuntimeConfig.js');
const screenshotExempt = require('../../../utils/screenshotAdminExempt.js');
const { parseF2StatusLine, buildF2FaultModalPayload, buildF2AdvUiUpdates, buildFlapPanelStateFromItm, buildF2ConnectModalQueue, buildF2HwMonitorUpdates } = require('../../../utils/f2FaultReport.js');
const { createVoiceRecognizer, warmupVoicePlugin } = require('../../../utils/voiceControl.js');
const {
  scanModelToProductKey,
  isRemoteAssistProduct,
  callRemoteAssist,
  collectDeviceState,
  buildStatePatch
} = require('../../../utils/remoteAssist.js');

const REMOTE_ASSIST_STORAGE_KEY = 'remote_assist_local_v1';


Page({
  data: {
    models: [
      { id: 1, name: 'F1', type: 'Pro', tag: 'SERIES 1', icon: iconF1Pro, status: 'active' },
      { id: 2, name: 'F1', type: 'Max', tag: 'SERIES 1', icon: iconF1Max, status: 'next' },
      { id: 8, name: 'F1', type: 'Ultra', tag: 'SERIES 1', icon: iconF1ProMax, status: 'hidden' },
      { id: 3, name: 'F2', type: 'Pro', tag: 'SERIES 2', icon: iconF2Pro, status: 'hidden' },
      { id: 4, name: 'F2', type: 'Max', tag: 'SERIES 2', icon: iconF2Max, status: 'hidden' },
      { id: 9, name: 'F2', type: 'Ultra', tag: 'SERIES 2', icon: iconF2Ultra, status: 'hidden' },
      { id: 5, name: 'F2', type: 'Long', tag: 'SERIES 2', icon: iconF2MaxLong, status: 'hidden' },
      { id: 6, name: 'F3', type: 'Pro', tag: 'SERIES 3', icon: iconF3Pro, status: 'hidden' },
      { id: 7, name: 'F3', type: 'Max', tag: 'SERIES 3', icon: iconF3Max, status: 'hidden' },
      { id: 100, name: 'CAN', type: 'Learn', tag: 'OBD DEBUG', icon: iconCanLearn, status: 'hidden', canLearn: true },
    ],
    currentIndex: 0,
    
    // 🔴 设备切换滑动相关
    isDraggingModel: false,      // 是否正在拖动设备卡片
    modelDragOffset: 0,         // 设备卡片的拖动偏移量（px）
    nextCardOffsetPercent: 85,   // 下一个卡片的偏移百分比
    prevCardOffsetPercent: -85,  // 上一个卡片的偏移百分比
    modelActiveScale: 1.08,      // 当前卡片缩放
    modelSideScale: 0.86,        // 侧边卡片缩放
    nextModelScale: 0.86,        // 右侧卡片独立缩放
    prevModelScale: 0.86,        // 左侧卡片独立缩放
    activeCardOpacity: 1,        // 当前卡片透明度
    nextCardOpacity: 0.9,        // 右侧卡片透明度
    prevCardOpacity: 0.9,        // 左侧卡片透明度

    showDetail: false,
    detailEnterAnim: false,
    detailMode: 'main',
    currentModel: null,
    sideIcon: iconSide,
    connectIcon: iconConnect,
    editType: 'fold', 

    // === 权限控制 ===
    isAuthorized: false, // 密码验证一次后有效
    isAdmin: false, // 管理员身份

    // === 远程协助 ===
    uiBleConnected: false,
    remoteAssistCardEnabled: true,
    remoteAssistPendingForCard: false,
    remoteAssistPendingSessionId: '',
    remoteAssistSessionId: '',
    remoteAssistSessionStatus: '',
    remoteAssistSessionProductKey: '',
    remoteAssistRole: '',
    remoteAssistUserAccepted: false,
    remoteSessionBleConnected: false,
    remoteAssistCapsuleActive: false,
    remoteAssistPendingSessions: [],
    remoteAssistPendingCount: 0,
    showRemoteAssistPickModal: false,
    remoteAssistLastCmdAt: 0,
    remoteAssistDebugLogs: [],
    remoteAssistConsentVisible: false,

    screenshotHourlyCount: 0,
    screenshotDailyCount: 0,

    // === 弹窗控制 ===
    showPasswordModal: false, 
    showTutorialModal: false, 
    showKeyModal: false,     
    showDisconnectTip: false,
    showApproachTip: false,  // 新增：靠近车辆提示
    
    // 新增：蓝牙未开启提示弹窗
    showBluetoothAlert: false,
    bluetoothAlertClosing: false, // 蓝牙提示弹窗退出动画中

    // 管理员 SN 预登记弹窗
    showAdminSnModal: false,
    adminSnModalClosing: false,
    adminSnModalMode: '', // confirm_new | change_model
    adminSnModalSn: '',
    adminSnModalTargetModel: '',
    adminSnModalExistingModel: '',
    adminSnRegisterSubmitting: false,
    adminSnShowModelPicker: false,
    adminBindModelOptions: ADMIN_BIND_MODEL_OPTIONS,
    /** 管理员本会话已绑定 SN（与当前卡片型号无关） */
    adminRegisteredSn: '',
    adminRegisteredModel: '',
    currentConnectedRawSn: '',
    /** 售后换机：待选工单列表与选中项 */
    showAdminRepairPicker: false,
    adminRepairPickerClosing: false,
    adminAwaitingRepairs: [],
    adminSelectedRepairId: '',
    adminSelectedRepair: null,
    /** 蓝牙意外断开后自动重连 */
    isBleAutoReconnecting: false,
    bleReconnectAttempt: 0,
    /** CAN Learn 测试：灯带总灯珠数 */
    canLearnNumLeds: String(DEFAULT_NUM_LEDS),
    
    // 新增：自动校准中弹窗
    showCalibratingModal: false,
    calibratingModalClosing: false, // 校准弹窗退出动画中
    calibratingBtnDisabled: true, // 校准弹窗按钮禁用状态

    // 打开角度：快速连滑时提示蓝牙仍在发送
    showOpenAngleSendingModal: false,
    openAngleSendingModalClosing: false,
    openAngleSendingBtnDisabled: true,
    /** 打开角度：非阻塞提示条（仅 UI 提示，不挡操作） */
    showOpenAngleSendHint: false,
    
    // 弹窗退出动画状态
    passwordModalClosing: false, // 密码弹窗退出动画中
    tutorialModalClosing: false, // 教程弹窗退出动画中
    keyModalClosing: false, // 钥匙弹窗退出动画中
    
    // 新增：请先连接蓝牙提示（小胶囊样式）
    showConnectBluetoothTip: false,
    
    // 🔴 新增：OTA提示
    showOtaTip: false,
    
    // 新增：连接状态
    isConnecting: false,      // 正在连接中
    isNavigatingToOta: false, // 正在跳转到OTA页面（防止重复跳转）

    // 【新增】弹窗按钮锁定状态（防误触）
    modalBtnDisabled: false,
    
    // 🔴 新增：所有弹窗的倒计时相关数据
    passwordBtnLocked: true,
    passwordBtnText: '确认 (2s)',
    tutorialBtnLocked: true,
    tutorialBtnText: '知道了 (2s)',
    keyBtnLocked: true,
    keyBtnText: '确认 (2s)',
    angleHintBtnLocked: true,
    angleHintBtnText: '知道了 (2s)',
    
    passwordInput: '',        
    pendingEditType: '',      

    // === 动画状态 (红环教程) ===
    animLightOn: true,        
    animIsPressing: false,    
    animText: '',             
    tutorialTimer: null,
    
    // === 折叠页引导状态 ===
    isLightOn: true,          // 折叠页指示灯状态（true=红，false=黑）
    showFoldInlineHint: false, // 🔴 折叠页上滑提示显示状态
    foldHintOffset: 0,         // 🔴 折叠页提示偏移量（用于动画）
    showFoldFineTuneHint: false, // 🔴 上滑演示结束后：调大/调小多击提示
    
    // === 打开角度页引导状态 ===
    openAngleTutorialTimer: null,
    openAngleAnimLightOn: false,    // 打开角度动画：指示灯状态（false=灰，true=红）
    openAngleAnimIsPressing: false, // 打开角度动画：是否正在按下
    openAngleAnimText: '点击车把按键\n使指示灯亮', // 打开角度动画：提示文字
    openAngleLightOn: false,        // 打开角度页面：指示灯按钮状态（false=灰，true=红）      

    // === 动画状态 (关钥匙) ===
    keyAnimState: 'red',      // 'red' | 'grey'
    keyLoopTimer: null,       // 关钥匙动画循环定时器

    isConnected: false,
    isScanning: false, // 是否正在扫描
    connectedDeviceName: '',
    touchStartX: 0,
    detailSwipeStartX: 0,
    detailSwipeStartY: 0,
    detailSwipeTracking: false,
    detailOpenGuardUntil: 0,
    blockDetailTouch: false,
    
    // 角度控制（旧旋转臂仍保留给折叠逻辑使用）
    angleMode: '90', 
    angleRotation: 180, 

    // 折叠间距
    foldGap: 20, 
    
    // 🔴 调整按钮滑动相关（折叠角度页）
    adjustSlideOffset: 0,        // 滑块的垂直偏移量（px）
    adjustSlideActive: false,    // 是否激活（滑动后显示归零）
    adjustTouchStartY: 0,        // 触摸开始时的 Y 坐标
    adjustHasMoved: false,       // 是否发生了滑动（用于区分点击和滑动）
    adjustSnap: false,           // 手动模式：松手后回弹/贴合时，给一个顺滑过渡动画
    foldDemoPlaying: false,      // 是否正在播放"自动上滑调整"演示（播放时禁用手动滑动）
    isAdjustDemo: false,         // 调整按钮当前是否处在"演示动画"模式（有过渡），手动滑动时为 false

    angleBtnText: '90°', // F1=180°，F2 系列 UI 显示 90°（内部仍 160）

    // 打开角度：标尺 & 数值显示相关
    isCalibrated: false,          // 是否已通过 90/160(180) 按钮激活校准
    openAngleUiActive: false,     // 是否已点预设：未激活时棍子/数字不动，波轮仍可发蓝牙
    statusText: '等待校准',      // 状态文字
    currentAngle: 0,              // 当前角度数值 (0~maxAngle)
    ticks: [],                    // 波浪尺刻度数组
    activeIndex: 0,               // 当前高亮刻度索引
    translateX: 0,                // 波浪尺位移 (px)
    transition: 'none',           // 波浪尺过渡动画
    lastEmitTime: 0,              // 波浪尺滑动节流时间戳

    // ★★★ 引导弹窗相关数据
    hasShownF1Guide: false, // 专门用于记忆 F1 系列是否已经弹窗过
    showAngleHint: false,   // 控制弹窗显示

    // 【新增】控制全新产品提示弹窗
    showNewProductHint: false, // 控制弹窗显示
    newProductBtnLocked: true, // 按钮是否锁定
    newProductBtnText: '知道了 (2s)', // 按钮文案

    // === 新增：高级设置相关数据 ===
    showSettingsModal: false, // 控制高级设置弹窗
    toastClass: '',           // 控制 Toast 动画
    
    // 图标数据绑定
    icons: {
      lock: iconLock,
      arrowUp: iconArrowUp,
      cali: iconCali,
      gear: iconGear,
      reset: iconReset,
      gearSmall: iconGearSmall,
      ghostOpen: iconGhostOpen,
      ghostClose: iconGhostClose,
      flapOpen: iconFlapOpen,
      flapFold: iconFlapFold,
      btSmall: iconBtSmall,
      mic: iconMic
    },

    voiceListening: false,
    voiceHint: '',
    voiceLastCmd: '',
    voiceHearing: false,
    voiceStatusClass: 'dormant',
    voiceStatusText: '点击开启语音控制',
    f2ControlPanelOpen: false,
    flapPanelState: 'unknown',
    flapPanelStateText: '状态未知',
    showF2DemoModal: false,
    f2DemoRunning: false,
    f2DemoStatusText: '',
    
    // 滑块状态（连接后由设备状态包覆盖）
    settingState: {
      faultDetect: 'left',
      selfRepair: 'left',
      powerOn: 'left',
      shutdown: 'left',
      travelMode: 'left',
      smoothMode: 'right'
    },

    delayPowerOffOptions: F2_DELAY_POWER_OFF_OPTIONS,
    delayPowerOffIndex: 0,
    delayPowerOffTip: '请根据电瓶容量选择',
    f2TravelModeOn: false,
    travelModeTip: '关钥匙保持供电3分钟，24小时内可反复自动放牌',
    f2TravelReadbackText: '读取中…',
    f2DelayPowerReadbackText: '读取中…',
    f2HwMonitorVisible: false,
    f2KeyOn: null,
    f2BtnPressed: null,
    f2KeyStatusText: '监测中…',
    f2BtnStatusText: '监测中…',
    ...buildF2ServoSpeedUi(100),
    f2SpeedSliderWidth: 0,
    f2SpeedSliderLeft: 0,
    
    // === 指示灯确认弹窗（调整按钮用）===
    showIndicatorCheckModal: false,      // 是否显示指示灯检查弹窗
    indicatorCheckModalClosing: false,   // 弹窗关闭动画状态
    pendingSendData: null,               // 待发送的数据 { sendText, type }
    hasShownSettingsIndicatorModal: false, // 🔴 标记是否已经显示过高级设置的指示灯弹窗（每次打开高级设置重置）
    
    // === 隐蔽模式相关 ===
    showStealthTutorial: false, // 是否显示隐蔽模式教学
    stealthTutorialMode: 'enter', // 教学模式：'enter'=进入, 'exit'=退出
    
    // === 出厂设置相关 ===
    showFactoryResetModal: false, // 是否显示出厂设置弹窗
    factoryResetStep: 0, // 当前步骤：0=打开收回, 1=开启自检, 2=开机上翻, 3=自动调平
    factoryResetSteps: [
      { text: '正在打开自动收回', data: '打开收回', sendTimes: 2, interval: 500, delayNext: 2000 },
      { text: '正在开启自检', data: '开启自检', sendTimes: 2, interval: 500, delayNext: 2000 },
      { text: '正在打开开机牌上翻', data: '开机上翻', sendTimes: 2, interval: 500, delayNext: 2000 },
      { text: '正在自动调平，请用手进行阻挡', data: '自动调平', sendTimes: 2, interval: 500, delayNext: 0, isLeveling: true }
    ],
    stealthAnimPressing: false, // 按钮是否按下
    stealthAnimLight: false,    // 灯光状态（用于闪烁）
    stealthAnimText: '请在车把上\n长按按键 3 秒', // 提示文字
    stealthAnimTextColor: 'black', // 文字颜色
    stealthAnimTextScale: 1, // 文字缩放（用于动画）
    stealthTutorialBtnDisabled: true, // 按钮是否禁用
    stealthTutorialTimer: null, // 动画定时器
    stealthBlinkInterval: null, // 闪烁定时器
    stealthTextBlinkInterval: null, // 文字闪烁定时器（用于退出模式后5次）
  },

  onLoad(options) {
    // 🔴 计算导航栏高度（适配所有机型）
    this.calcNavBarInfo();
    const app = getApp();
    if (app && app.globalData && app.globalData.updatePageVisit) {
      app.globalData.updatePageVisit('scan');
    }
    
    // 初始化当前模型（支持从 products 兜底恢复到指定卡片）
    this._scanPerfDebug = false;
    this._scanPerf = {
      moveEvents: 0,
      moveSetDataCostTotal: 0,
      moveSetDataCostMax: 0,
      moveLastLogAt: 0
    };
    let restoreIndex = 0;
    if (options && options.restoreIndex !== undefined) {
      const parsed = parseInt(options.restoreIndex, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed < this.data.models.length) {
        restoreIndex = parsed;
      }
    }
    const currentModel = this.data.models[restoreIndex] || this.data.models[0];
    this.setData({
      canLearnNumLeds: String(loadStoredNumLeds())
    });
    this.setData({ currentModel });
    // 确保首屏状态：active/next/prev，且不循环
    this.updateCardStatus(restoreIndex);
    if (this._scanPerfDebug) {
      console.log('[scan-perf] onLoad init done', {
        restoreIndex,
        modelCount: this.data.models.length
      });
    }

    this.ble = new BLEHelper(wx);
    this.initScreenshotProtection();
    warmupVoicePlugin();
    this.initVoiceRecognizer();
    
    // 重置跳转标记
    this.setData({ isNavigatingToOta: false });
    
    this.ble.onConnecting = (device) => {
      if (device) this._lastBleDevice = device;
      this.setData({
        isScanning: false,
        isConnecting: true
      });
    };

    this.ble.onLinkEstablished = (device) => {
      if (device) this._lastBleDevice = device;
      const rawName = device.name || device.localName || '';
      const numMatch = rawName.replace(/[^0-9]/g, '');
      const finalName = numMatch ? `MT-ID:${numMatch}` : rawName;
      // 物理链路已建立，但特征值尚未发现完毕，保持「正在连接」
      this.setData({
        isConnecting: true,
        isScanning: false,
        connectedDeviceName: finalName || this.data.connectedDeviceName
      });
      this._startBleLinkWatch();
    };

    this.ble.onConnected = async (device) => {
      const rawName = device.name || device.localName || '';
      const normalizedSn = this.normalizeSnFromBluetoothName(rawName);
      this._lastBleDevice = device;
      this._activeBleDeviceId = device.deviceId || '';
      this._bleReconnectStoppedByUser = false;
      this._clearBleReconnectTimers();

      const numMatch = rawName.replace(/[^0-9]/g, '');
      const finalName = numMatch ? `MT-ID:${numMatch}` : rawName;

      // 系统 BLE 已连通：先更新 UI，避免云函数/OTA 校验期间一直卡在「正在连接」
      this._applyBleLinkUi({
        isConnected: true,
        isScanning: false,
        isConnecting: false,
        isBleAutoReconnecting: false,
        bleReconnectAttempt: 0,
        connectedDeviceName: finalName,
        currentConnectedRawSn: normalizedSn || ''
      }, () => {
        this._scheduleRemoteStatePush();
      });

      try {
        if (normalizedSn) {
          await this.ensureAdminPrivilegeForSnFlow();
        }

        if (normalizedSn && !this.data.isAdmin) {
          const snOk = await this._checkConnectedSnAllowed(normalizedSn);
          if (!snOk) {
            this.ble.disconnect(true);
            this._activeBleDeviceId = '';
            this._applyBleLinkUi({
              isConnected: false,
              isScanning: false,
              isConnecting: false,
              isBleAutoReconnecting: false
            });
            return;
          }
        }

        const hasOtaRecord = await this.checkOtaConnection(device.deviceId);

        if (!hasOtaRecord) {
          console.log('❌ [onConnected] 设备未进行OTA升级，断开连接');
          this.ble.disconnect(true);
          this._activeBleDeviceId = '';
          this._applyBleLinkUi({
            isConnected: false,
            isScanning: false,
            isConnecting: false,
            isBleAutoReconnecting: false
          });
          this.showOtaRequiredTip();
          return;
        }

        if (normalizedSn && this.data.isAdmin) {
          await this._maybeShowAdminRepairPickerThenSn(normalizedSn);
        }

        if (isF2MaxStatusBleModel(this.data.currentModel)) {
          this._setupF2FaultBleListener();
        }
        this._resumeVoiceAfterBleReconnect();
      } catch (err) {
        console.error('❌ [onConnected] 连接后校验失败', err);
        this.ble.disconnect(true);
        this._activeBleDeviceId = '';
        this._applyBleLinkUi({
          isConnected: false,
          isScanning: false,
          isConnecting: false,
          isBleAutoReconnecting: false
        });
        this._showCustomToast('连接校验失败，请重试', 'none', 2200);
      }
    };
    this.ble.onConnectFailed = (err, device, opts) => {
      const manual = !!(opts && opts.manual);
      if (device) this._lastBleDevice = device;
      const shouldReconnect = !manual && !this._bleReconnectStoppedByUser && this._lastBleDevice;
      this._applyBleLinkUi({
        isConnected: false,
        isScanning: false,
        isConnecting: false,
        ...(shouldReconnect ? {} : { isBleAutoReconnecting: false })
      }, () => {
        if (shouldReconnect) this._requestBleAutoReconnect('connect_failed');
      });
    };
    this.ble.onError = (err) => {
      this.setData({ isScanning: false, isConnecting: false });
      
      // 🔴 处理蓝牙权限错误，使用自定义弹窗
      if (err && err.type === 'auth_deny') {
        this._showCustomModal({
          title: err.message || '蓝牙权限被拒绝',
          content: err.detail || '请在系统设置中开启蓝牙，并允许小程序使用蓝牙功能。',
          showCancel: false,
          confirmText: '知道了'
        });
      }
      // 可以在这里做必要的错误上报或静默处理
    };
    this.ble.onDisconnected = (meta) => {
      this._stopBleLinkWatch();
      this.onBleDisconnected(meta);
    };

    this.ble._ensureConnectionStateListener();
    if (!this._bleAdapterListenerSetup) {
      this._bleAdapterListenerSetup = true;
      wx.onBluetoothAdapterStateChange((res) => {
        if (!res.available && this.data.isConnected) {
          this._handleBleLinkLost('adapter_off');
        }
      });
    }
    this._adminSessionRegisteredSn = '';
    this._adminSessionRegisteredModel = '';
    this._adminSnMismatchHintShown = false;
    this._lastBleDevice = null;
    this._activeBleDeviceId = '';
    this._bleReconnectTimer = null;
    this._bleReconnectStoppedByUser = false;
    this._bleScanTimeoutTimer = null;
    this._voiceResumeAfterBle = false;
    this._voiceHintLastAt = 0;
    this._bleSendQueue = [];
    this._bleSendDraining = false;
    this._openAngleFullSwipeTimes = [];

    // 计算 px 比例 (CSS bar宽度6px + 间距14px = 20px)
    // 🔴 获取状态栏高度（已在 onLoad 中设置过，这里无需重复声明 winInfo）
    // 直接复用 onLoad 中写入的 statusBarHeight，避免重复声明变量
    // const winInfo2 = wx.getWindowInfo();
    // this.setData({ statusBarHeight: winInfo2.statusBarHeight || 44 });
    
    const sys = wx.getSystemInfoSync();
    // 注意：CSS中使用的是px单位，所以直接计算px
    this.tickWidthPx = 20; // 每个刻度总宽度20px

    // 初始化位置 (根据当前机型)
    const isF1 = currentModel.name.includes('F1');
    this.maxAngle = isF1 ? 180 : 160;

    // 生成刻度数据
    const count = (this.maxAngle - 0) / 2 + 1;
    const ticks = new Array(Math.floor(count)).fill(0);
    this.setData({ ticks });

    // 强制更新一次视图到 0度
    this.updateRuler(0, false);
    
    // 🔴 管理员检查延后到首帧后，避免首屏进入卡顿
    setTimeout(() => {
      this.checkAdminPrivilege();
      this._refreshRemoteAssistCardFlags();
    }, 80);
  },

  // ================== 管理员权限检查 ==================
  async checkAdminPrivilege() {
    const ADMIN_CACHE_KEY = '__scan_admin_privilege_cache__';
    const ADMIN_CACHE_TTL = 10 * 60 * 1000; // 10分钟缓存，减少反复进页请求

    // 先用本地缓存秒回填，避免首屏等待云端查询
    try {
      const cache = wx.getStorageSync(ADMIN_CACHE_KEY);
      if (cache && typeof cache.isAdmin === 'boolean' && cache.ts && (Date.now() - cache.ts < ADMIN_CACHE_TTL)) {
        if (this.data.isAdmin !== cache.isAdmin) {
          this.setData({ isAdmin: cache.isAdmin });
        }
        return;
      }
    } catch (e) {}

    try {
      const res = await wx.cloud.callFunction({ name: 'login' });
      const myOpenid = res.result.openid;
      const db = wx.cloud.database();
      let adminCheck = await db.collection('guanliyuan').where({ openid: myOpenid }).get();
      // 如果集合里并没有手动保存 openid 字段，则使用系统字段 _openid 再查一次
      if (adminCheck.data.length === 0) {
        adminCheck = await db.collection('guanliyuan').where({ _openid: myOpenid }).get();
      }
      if (adminCheck.data.length > 0) {
        this.setData({ isAdmin: true }, () => {
          this._refreshRemoteAssistCardFlags();
          this._startRemoteAssistPendingPoll();
        });
        screenshotExempt.markGuanliyuanCache(true);
        screenshotExempt.allowScreenCaptureIfExempt();
        try {
          wx.setStorageSync(ADMIN_CACHE_KEY, { isAdmin: true, ts: Date.now() });
        } catch (e) {}
        console.log('[scan.js] 身份验证成功：合法管理员');
      } else {
        this.setData({ isAdmin: false });
        try {
          wx.setStorageSync(ADMIN_CACHE_KEY, { isAdmin: false, ts: Date.now() });
        } catch (e) {}
        console.log('[scan.js] 未在管理员白名单中');
      }
    } catch (err) {
      console.error('[scan.js] 权限检查失败', err);
      // 请求失败时不强制改为 false，优先维持当前态，避免网络抖动导致权限闪烁
    }
  },

  onShow() {
    // 🔴 修复：从 OTA 页面返回后，按需关闭不应该显示的弹窗并恢复页面状态
    // 只重置当前为 true 的状态，减少首帧 setData 负载
    const resetPatch = {};
    const closeFlags = [
      'showPasswordModal',
      'showTutorialModal',
      'showKeyModal',
      'showDisconnectTip',
      'showApproachTip',
      'showCalibratingModal',
      'showOpenAngleSendingModal',
      'showConnectBluetoothTip',
      'showOtaTip',
      'showIndicatorCheckModal',
      'showStealthTutorial',
      'showFactoryResetModal',
      'showAngleHint',
      'showNewProductHint',
      'showBluetoothAlert',
      'isNavigatingToOta',
      'passwordModalClosing',
      'tutorialModalClosing',
      'keyModalClosing',
      'indicatorCheckModalClosing',
      'calibratingModalClosing',
      'openAngleSendingModalClosing',
      'bluetoothAlertClosing',
      // 兜底：防止 detail-touch-guard 偶发残留导致整页无法触摸
      'blockDetailTouch',
      'locked'
    ];
    closeFlags.forEach((k) => {
      if (this.data[k]) resetPatch[k] = false;
    });
    if (Object.keys(resetPatch).length) {
      this.setData(resetPatch);
    }
    
    // 确保页面处于正常状态（不是编辑模式，除非用户正在编辑）
    // 如果当前在编辑模式，保持编辑模式；否则确保是主模式
    if (this.data.detailMode === 'edit' && !this.data.currentModel) {
      // 如果编辑模式但没有当前模型，可能是状态异常，重置为主模式
      this.setData({ detailMode: 'main' });
    }
    
    // 🔴 如果高级设置弹窗是打开的，重新显示提示 Toast
    if (this.data.showSettingsModal) {
      this.showToast();
    }
    
    // 🔴 把非首屏关键任务延后，避免“点进控制中心卡一下”
    setTimeout(() => {
      const app = getApp();
      if (app && app.startQiangliCheck) {
        app.startQiangliCheck();
      }
      if (wx.getScreenRecordingState) {
        wx.getScreenRecordingState({
          success: (res) => {
            if (res.state === 'on' || res.recording) {
              if (!screenshotExempt.isScreenshotBanExempt(this)) {
                this.handleIntercept('record');
              }
            }
          }
        });
      }
    }, 120);

    if (this.data.isConnected) {
      this._tickBleLinkWatch();
      if (!this._bleLinkWatchTimer) this._startBleLinkWatch();
    }

    this._resumeRemoteAssistPollers();
    this._restoreRemoteAssistLocal();

    console.log('✅ [onShow] 页面状态已恢复');
  },

  initScreenshotProtection() {
    if (screenshotExempt.isScreenshotBanExempt(this)) {
      screenshotExempt.allowScreenCaptureIfExempt();
      return;
    }
    try {
      if (wx.setVisualEffectOnCapture) {
        wx.setVisualEffectOnCapture({
          visualEffect: 'hidden',
          success: () => console.log('[scan] 🛡️ setVisualEffectOnCapture 已开启')
        });
      }
    } catch (e) {
      console.warn('[scan] setVisualEffectOnCapture 不可用:', e);
    }

    try {
      this._onCaptureScreenHandler = () => this.handleIntercept('screenshot');
      wx.onUserCaptureScreen(this._onCaptureScreenHandler);
    } catch (e) {
      console.warn('[scan] onUserCaptureScreen 不可用:', e);
    }

    try {
      if (wx.onUserScreenRecord) {
        this._onScreenRecordHandler = () => this.handleIntercept('record');
        wx.onUserScreenRecord(this._onScreenRecordHandler);
      }
    } catch (e) {
      console.warn('[scan] onUserScreenRecord 不可用:', e);
    }
  },

  _teardownScreenshotProtection() {
    if (this._onCaptureScreenHandler && wx.offUserCaptureScreen) {
      try { wx.offUserCaptureScreen(this._onCaptureScreenHandler); } catch (e) {}
      this._onCaptureScreenHandler = null;
    }
    if (this._onScreenRecordHandler && wx.offUserScreenRecord) {
      try { wx.offUserScreenRecord(this._onScreenRecordHandler); } catch (e) {}
      this._onScreenRecordHandler = null;
    }
  },

  _getScreenshotEvents() {
    try {
      const events = wx.getStorageSync('__scan_screenshot_events__');
      return Array.isArray(events) ? events : [];
    } catch (e) {
      return [];
    }
  },

  _saveScreenshotEvents(events) {
    try {
      wx.setStorageSync('__scan_screenshot_events__', events);
    } catch (e) {}
  },

  _recordScreenshotEvent() {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const events = this._getScreenshotEvents().filter((ts) => typeof ts === 'number' && ts >= oneDayAgo);
    events.push(now);
    this._saveScreenshotEvents(events);
    const hourlyCount = events.filter((ts) => ts >= oneHourAgo).length;
    const dailyCount = events.length;
    this.setData({
      screenshotHourlyCount: hourlyCount,
      screenshotDailyCount: dailyCount
    });
    return { now, hourlyCount, dailyCount };
  },

  async _reportScreenshotRisk(stats) {
    try {
      await wx.cloud.callFunction({
        name: 'reportScreenshotRisk',
        data: {
          page: 'scan',
          hourlyCount: stats.hourlyCount,
          dailyCount: stats.dailyCount
        }
      });
      console.log('[scan] 已上报截图风险待审核队列', stats);
    } catch (e) {
      console.warn('[scan] 上报截图风险失败:', e);
    }
  },

  async _banForCapture(type) {
    wx.setStorageSync('is_user_banned', true);
    if (type === 'screenshot') {
      wx.setStorageSync('is_screenshot_banned', true);
    }
    const sysInfo = wx.getSystemInfoSync();
    wx.cloud.callFunction({
      name: 'banUserByScreenshot',
      data: {
        type,
        banPage: 'scan',
        deviceInfo: sysInfo.system || '',
        phoneModel: sysInfo.model || ''
      }
    }).catch((err) => {
      console.error('[scan] 封禁云函数调用失败:', err);
    });
    wx.reLaunch({ url: `/pages/blocked/blocked?type=${type === 'record' ? 'record' : 'screenshot'}` });
  },

  async handleIntercept(type) {
    if (screenshotExempt.isScreenshotBanExempt(this)) return;

    if (type === 'record') {
      await this._banForCapture('record');
      return;
    }

    const stats = this._recordScreenshotEvent();
    // 截图发生即上报可疑队列，供管理员在“可疑人员处理”里手动无视/封禁
    await this._reportScreenshotRisk(stats);
    // 1小时内前2次允许，第3次起直接封禁
    if (stats.hourlyCount > 2) {
      await this._banForCapture('screenshot');
      return;
    }

    // 日累计信息仍更新在队列中，便于管理员判断风险程度
    if (stats.dailyCount >= 3) return;
  },

  onHide() {
    this._stopRemoteAssistPollers();
    this._stopF2DemoMode(false);
    // 兜底：若详情主层被系统手势带走，记录恢复信息给 products onShow 使用
    try {
      if (this.data.showDetail && this.data.detailMode === 'main') {
        wx.setStorageSync('__scan_recover_payload__', {
          ts: Date.now(),
          index: this.data.currentIndex || 0
        });
      }
    } catch (e) {}

    // 🔴 停止定时检查
    const app = getApp();
    if (app && app.stopQiangliCheck) {
      app.stopQiangliCheck();
    }

    if (this._foldFineTuneHintTimer) {
      clearTimeout(this._foldFineTuneHintTimer);
      this._foldFineTuneHintTimer = null;
    }
  },

  onUnload() {
    // 🔴 停止定时检查
    const app = getApp();
    if (app && app.stopQiangliCheck) {
      app.stopQiangliCheck();
    }
    
    // 停止所有动画循环
    this.stopTutorialLoop();
    this.stopOpenAngleTutorialLoop();
    this.stopStealthAnim();
    if (this._detailBlockTimer) {
      clearTimeout(this._detailBlockTimer);
      this._detailBlockTimer = null;
    }
    // 释放弹窗延迟定时器
    if (this.modalDelayTimer) clearTimeout(this.modalDelayTimer);
    if (this._foldFineTuneHintTimer) {
      clearTimeout(this._foldFineTuneHintTimer);
      this._foldFineTuneHintTimer = null;
    }
    if (this.ble) {
      this._stopBleLinkWatch();
      this.stopBleAutoReconnect(false);
      this.ble.disconnect(true);
    }
    if (typeof this._teardownScreenshotProtection === 'function') {
      this._teardownScreenshotProtection();
    }
    this._stopVoiceRecognizer();
    this._stopF2DemoMode(false);
    this._stopRemoteAssistPollers();
  },

  preventBubble() { return; },

  // ===============================================
  // 远程协助
  // ===============================================
  _getRemoteAssistModel() {
    if (this.data.showDetail && this.data.currentModel) {
      return this.data.currentModel;
    }
    return this.data.models[this.data.currentIndex] || null;
  },

  _remoteStatePatchChanged(patch) {
    const data = this.data;
    return Object.keys(patch).some((k) => {
      const next = patch[k];
      const cur = data[k];
      if (next && typeof next === 'object') {
        try {
          return JSON.stringify(cur) !== JSON.stringify(next);
        } catch (e) {
          return cur !== next;
        }
      }
      return cur !== next;
    });
  },

  _isRemoteAssistAdminActive() {
    return this.data.remoteAssistRole === 'admin' &&
      !!this.data.remoteAssistSessionId &&
      this.data.remoteAssistSessionStatus === 'active';
  },

  _formatRemoteAssistLogTime(ts) {
    const d = new Date(ts || Date.now());
    const p = (n) => (n < 10 ? `0${n}` : `${n}`);
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  },

  _remoteAssistLogLabel(status) {
    const map = {
      sending: '发送中',
      ok: '已送达',
      fail: '送达失败',
      enqueue_fail: '入队失败',
      coalesced: '已合并',
      timeout: '未收到回传'
    };
    return map[status] || status;
  },

  _getRemoteAssistDebugLogs() {
    if (this._raDebugLogsMem && this._raDebugLogsMem.length) return this._raDebugLogsMem;
    return this.data.remoteAssistDebugLogs || [];
  },

  _setRemoteAssistDebugLogs(logs) {
    this._raDebugLogsMem = logs;
    this.setData({ remoteAssistDebugLogs: logs });
  },

  _resetRemoteAssistDebugLogsMem() {
    this._raDebugLogsMem = null;
  },

  _remoteAssistLogCmdMatch(logCmd, rawCmd) {
    if (!logCmd || !rawCmd) return false;
    const base = String(logCmd).split(' ×')[0].trim();
    return base === rawCmd || logCmd === rawCmd;
  },

  _syncRemoteAssistDebugLogsFromSession(session) {
    if (!session) return null;
    const commands = session.commands || [];
    const fb = session.lastCmdFeedback;
    let logs = [...this._getRemoteAssistDebugLogs()];
    let changed = false;
    let lastAt = this.data.remoteAssistLastCmdAt || 0;
    const now = Date.now();

    const touch = (commandId, cmd, ok, at) => {
      if (!commandId) return;
      const ts = at || now;
      const status = ok ? 'ok' : 'fail';
      const label = this._remoteAssistLogLabel(status);
      let idx = logs.findIndex((l) => l.id === commandId);
      if (idx < 0 && cmd) {
        idx = logs.findIndex((l) => l.status === 'sending' && this._remoteAssistLogCmdMatch(l.cmd, cmd));
      }
      if (idx < 0) return;
      if (logs[idx].status === status && logs[idx].id === commandId) return;
      logs[idx] = {
        ...logs[idx],
        id: commandId,
        status,
        label,
        time: this._formatRemoteAssistLogTime(ts)
      };
      changed = true;
      if (ts > lastAt) lastAt = ts;
    };

    if (fb && fb.commandId) touch(fb.commandId, fb.cmd, fb.ok !== false, fb.at);
    commands.forEach((c) => {
      if (!c || !c.id) return;
      if (c.status === 'done') touch(c.id, c.cmd, true, c.ackAt);
      else if (c.status === 'failed') touch(c.id, c.cmd, false, c.ackAt);
    });

    logs = logs.map((l) => {
      if (l.status !== 'sending' || !l.enqueueAt) return l;
      if (now - l.enqueueAt < 8000) return l;
      changed = true;
      return {
        ...l,
        status: 'timeout',
        label: this._remoteAssistLogLabel('timeout')
      };
    });

    if (!changed) return null;
    this._raDebugLogsMem = logs;
    return { remoteAssistDebugLogs: logs, remoteAssistLastCmdAt: lastAt };
  },

  _pushRemoteAssistDebugLog(entry) {
    const logs = [entry, ...this._getRemoteAssistDebugLogs()];
    if (logs.length > 30) logs.length = 30;
    this._setRemoteAssistDebugLogs(logs);
  },

  _patchRemoteAssistDebugLog(findId, updates) {
    const logs = this._getRemoteAssistDebugLogs().map((l) => (
      l.id === findId ? { ...l, ...updates } : l
    ));
    this._setRemoteAssistDebugLogs(logs);
  },

  _mergeRemoteAssistCmdFeedback(fb) {
    if (!fb || !fb.at) return this._getRemoteAssistDebugLogs();
    const patch = this._syncRemoteAssistDebugLogsFromSession({ lastCmdFeedback: fb, commands: [] });
    if (patch && patch.remoteAssistDebugLogs) return patch.remoteAssistDebugLogs;
    return this._getRemoteAssistDebugLogs();
  },

  _canControlDevice() {
    if (this._isRemoteAssistAdminActive()) return true;
    if (this.data.isConnected) return true;
    // 兜底：胶囊已显示连接且 GATT 就绪时，避免 UI/逻辑标志短暂不同步导致无法操控
    const ble = this.ble;
    const liveId = ble && ble.device && ble.device.deviceId;
    if (liveId && liveId === this._activeBleDeviceId && ble.serviceId && this._getBleWriteCharacteristicId()) {
      return true;
    }
    return false;
  },

  _shouldSkipIndicatorModal() {
    return this._isRemoteAssistAdminActive();
  },

  _buildRemoteStatePatch(deviceState, options) {
    return buildStatePatch(deviceState, {
      models: this.data.models,
      currentModel: this.data.currentModel,
      ...(options || {})
    });
  },

  _applyRemoteStatePatch(patch, callback) {
    if (!patch || !Object.keys(patch).length) {
      if (callback) callback();
      return;
    }
    if (!this._remoteStatePatchChanged(patch)) {
      if (callback) callback();
      return;
    }
    this.setData(patch, callback);
  },

  _saveRemoteAssistLocal() {
    const {
      remoteAssistRole,
      remoteAssistSessionId,
      remoteAssistSessionStatus,
      remoteAssistSessionProductKey,
      remoteAssistUserAccepted
    } = this.data;
    if (!remoteAssistSessionId || !remoteAssistRole) {
      try { wx.removeStorageSync(REMOTE_ASSIST_STORAGE_KEY); } catch (e) { /* ignore */ }
      return;
    }
    try {
      wx.setStorageSync(REMOTE_ASSIST_STORAGE_KEY, {
        remoteAssistRole,
        remoteAssistSessionId,
        remoteAssistSessionStatus,
        remoteAssistSessionProductKey,
        remoteAssistUserAccepted: !!remoteAssistUserAccepted
      });
    } catch (e) { /* ignore */ }
  },

  async _restoreRemoteAssistLocal() {
    if (this.data.remoteAssistSessionId && this.data.remoteAssistRole) return;
    let saved;
    try {
      saved = wx.getStorageSync(REMOTE_ASSIST_STORAGE_KEY);
    } catch (e) {
      return;
    }
    if (!saved || !saved.remoteAssistSessionId || !saved.remoteAssistRole) return;
    try {
      const r = await callRemoteAssist({
        action: 'getSession',
        sessionId: saved.remoteAssistSessionId
      });
      const session = r.session;
      if (!session || session.status === 'ended') {
        try { wx.removeStorageSync(REMOTE_ASSIST_STORAGE_KEY); } catch (e) { /* ignore */ }
        return;
      }
      const productKey = saved.remoteAssistSessionProductKey || session.productKey || '';
      const userAccepted = !!saved.remoteAssistUserAccepted;

      // 用户端：仅恢复「已同意且进行中」的会话，避免未点击就弹出远协界面
      if (saved.remoteAssistRole === 'user') {
        if (!(session.status === 'active' && userAccepted)) {
          try { wx.removeStorageSync(REMOTE_ASSIST_STORAGE_KEY); } catch (e) { /* ignore */ }
          return;
        }
      }

      const patch = {
        remoteAssistRole: saved.remoteAssistRole,
        remoteAssistSessionId: saved.remoteAssistSessionId,
        remoteAssistSessionStatus: session.status,
        remoteAssistSessionProductKey: productKey,
        remoteAssistUserAccepted: userAccepted,
        remoteSessionBleConnected: !!session.bleConnected,
        remoteAssistConsentVisible: false
      };
      if (saved.remoteAssistRole === 'admin') {
        let idx = this.data.models.findIndex((m) => scanModelToProductKey(m) === productKey);
        if (idx < 0) idx = this.data.currentIndex;
        const currentModel = this.data.models[idx];
        if (currentModel) patch.currentModel = currentModel;
        if (session.deviceSn) patch.currentConnectedRawSn = session.deviceSn;
      }
      this.setData(patch, () => {
        this._syncUiBleConnected();
        if (session.deviceState) this._applyRemoteDeviceState(session.deviceState);
        if (saved.remoteAssistRole === 'user') {
          if (userAccepted) wx.setKeepScreenOn({ keepScreenOn: true });
          this._startRemoteAssistUserPoll();
        } else if (saved.remoteAssistRole === 'admin') {
          this._startRemoteAssistAdminPoll();
        }
      });
    } catch (e) {
      console.warn('[远协] 恢复会话失败', e);
    }
  },

  _executeRemoteAssistCommands(cmds) {
    const list = cmds || [];
    if (!list.length) return Promise.resolve(true);
    let chain = Promise.resolve(true);
    list.forEach((item) => {
      if (!item || !item.cmd) return;
      chain = chain.then((prevOk) => {
        if (!prevOk) return false;
        return this._executeRemoteAssistCommand(item);
      });
    });
    return chain;
  },

  _executeRemoteAssistCommand(item) {
    const times = Math.min(5, Math.max(1, Number(item.times) || 1));
    const interval = Math.max(0, Number(item.interval) || 0);
    const cmd = item.cmd;
    return new Promise((resolve) => {
      if (this.data.remoteAssistRole !== 'user') {
        resolve(false);
        return;
      }
      if (!this._isBleWriteReady()) {
        console.warn('[远协] 用户端蓝牙未就绪，无法发送:', cmd,
          'isConnected=', this.data.isConnected,
          'device=', !!(this.ble && this.ble.device),
          'char=', !!(this.ble && (this.ble.characteristicId2 || this.ble.characteristicId)));
        resolve(false);
        return;
      }
      let sent = 0;
      const sendNext = () => {
        if (this.data.remoteAssistRole !== 'user' || !this._isBleWriteReady()) {
          resolve(false);
          return;
        }
        const arrayBuffer = this.stringToArrayBuffer(cmd);
        this.writeBleDataPromise(arrayBuffer).then((ok) => {
          if (!ok) {
            resolve(false);
            return;
          }
          sent += 1;
          if (sent >= times) {
            resolve(true);
            return;
          }
          setTimeout(sendNext, interval > 0 ? interval : 300);
        });
      };
      sendNext();
    });
  },

  _refreshRemoteAssistCardFlags() {
    const model = this._getRemoteAssistModel();
    const enabled = isRemoteAssistProduct(model);
    const patch = { remoteAssistCardEnabled: enabled };
    if (!enabled) {
      patch.remoteAssistPendingForCard = false;
      patch.remoteAssistPendingSessionId = '';
    }
    this.setData(patch, () => {
      if (this.data.isAdmin && enabled) this._pollRemoteAssistPending();
    });
  },

  _syncUiBleConnected() {
    const isAdminAssist = this.data.remoteAssistRole === 'admin' &&
      this.data.remoteAssistSessionStatus === 'active';
    const connected = !!this.data.isConnected;
    const ui = isAdminAssist ? false : connected;
    const patch = {};
    if (ui !== this.data.uiBleConnected) patch.uiBleConnected = ui;
    // 已稳定连接时，强制清除重连/扫描 UI，避免与「已连接」叠在一起
    if (connected) {
      if (this.data.isBleAutoReconnecting) patch.isBleAutoReconnecting = false;
      if (this.data.isScanning) patch.isScanning = false;
      if (this.data.isConnecting) patch.isConnecting = false;
    }
    const capsuleActive = isAdminAssist;
    if (capsuleActive !== this.data.remoteAssistCapsuleActive) {
      patch.remoteAssistCapsuleActive = capsuleActive;
    }
    if (Object.keys(patch).length) this.setData(patch);
  },

  _applyBleLinkUi(patch, callback) {
    this.setData(patch, () => {
      this._syncUiBleConnected();
      if (callback) callback();
    });
  },

  _isStaleBleDisconnect(meta) {
    const lostId = meta && meta.device && meta.device.deviceId;
    const activeId = this._activeBleDeviceId ||
      (this.ble && this.ble.device && this.ble.device.deviceId) || '';
    if (!lostId || !activeId) return false;
    return lostId !== activeId;
  },

  _formatRemoteAssistSessionLabel(session) {
    if (!session) return '';
    const sn = session.deviceSn ||
      (session.deviceState && session.deviceState.connectedDeviceName) || '未知设备';
    const ble = session.bleConnected ? '已连蓝牙' : '未连蓝牙';
    return `${sn} · ${ble}`;
  },

  _stopRemoteAssistPollers() {
    this._remoteAssistUserPollActive = false;
    this._remoteAssistAdminPollActive = false;
    if (this._remoteAssistUserPollTimer) {
      clearTimeout(this._remoteAssistUserPollTimer);
      this._remoteAssistUserPollTimer = null;
    }
    if (this._remoteAssistAdminPollTimer) {
      clearTimeout(this._remoteAssistAdminPollTimer);
      this._remoteAssistAdminPollTimer = null;
    }
    if (this._remoteAssistPendingPollTimer) {
      clearInterval(this._remoteAssistPendingPollTimer);
      this._remoteAssistPendingPollTimer = null;
    }
    if (this._remoteStatePushTimer) {
      clearTimeout(this._remoteStatePushTimer);
      this._remoteStatePushTimer = null;
    }
  },

  _resumeRemoteAssistPollers() {
    if (this.data.remoteAssistSessionId && this.data.remoteAssistRole === 'user') {
      this._startRemoteAssistUserPoll();
    }
    if (this.data.remoteAssistSessionId && this.data.remoteAssistRole === 'admin') {
      this._startRemoteAssistAdminPoll();
    }
    if (this.data.isAdmin && this.data.remoteAssistCardEnabled) {
      this._startRemoteAssistPendingPoll();
    }
  },

  _startRemoteAssistPendingPoll() {
    if (this._remoteAssistPendingPollTimer) return;
    this._pollRemoteAssistPending();
    this._remoteAssistPendingPollTimer = setInterval(() => {
      this._pollRemoteAssistPending();
    }, 2500);
  },

  async _pollRemoteAssistPending() {
    if (!this.data.isAdmin || !this.data.remoteAssistCardEnabled) return;
    if (this.data.remoteAssistRole === 'admin' && this.data.remoteAssistSessionId) return;
    const model = this._getRemoteAssistModel();
    const productKey = scanModelToProductKey(model);
    if (!productKey) return;
    try {
      const r = await callRemoteAssist({ action: 'hasPending', productKey });
      const sessions = r.sessions || (r.session ? [r.session] : []);
      const has = sessions.length > 0;
      const firstId = sessions[0] ? sessions[0]._id : '';
      if (has !== this.data.remoteAssistPendingForCard ||
          firstId !== (this.data.remoteAssistPendingSessionId || '') ||
          sessions.length !== (this.data.remoteAssistPendingSessions || []).length) {
        this.setData({
          remoteAssistPendingForCard: has,
          remoteAssistPendingSessionId: firstId,
          remoteAssistPendingSessions: sessions,
          remoteAssistPendingCount: sessions.length
        });
      }
    } catch (e) { /* ignore */ }
  },

  async onUserRemoteAssistTap(e) {
    const ds = e && e.currentTarget && e.currentTarget.dataset;
    const cardModel = (ds && ds.index !== undefined && this.data.models[ds.index])
      ? this.data.models[ds.index]
      : this._getRemoteAssistModel();
    const productKey = scanModelToProductKey(cardModel);
    if (!productKey) return;

    if (this.data.remoteAssistSessionId &&
        this.data.remoteAssistSessionProductKey === productKey) {
      if (this.data.remoteAssistSessionStatus === 'pending') {
        wx.showModal({
          title: '取消远协',
          content: '确定取消远程协助请求吗？',
          success: async (res) => {
            if (res.confirm) await this._endRemoteAssistSession('cancel');
          }
        });
      } else {
        if (this.data.remoteAssistSessionStatus === 'active' && !this.data.remoteAssistUserAccepted) {
          this.setData({ remoteAssistConsentVisible: true });
          return;
        }
        this._showCustomToast('协助进行中，可点下方结束', 'none', 2000);
      }
      return;
    }
    if (!this.data.isConnected) {
      this.setData({ showConnectBluetoothTip: true });
      setTimeout(() => this.setData({ showConnectBluetoothTip: false }), 2000);
      return;
    }
    const model = cardModel;
    try {
      const r = await callRemoteAssist({
        action: 'request',
        productKey,
        productName: model.name,
        productType: model.type,
        bleConnected: this.data.isConnected,
        deviceSn: this.data.currentConnectedRawSn || '',
        deviceState: collectDeviceState(this)
      });
      const status = r.status || 'pending';
      this.setData({
        remoteAssistRole: 'user',
        remoteAssistSessionId: r.sessionId,
        remoteAssistSessionStatus: status,
        remoteAssistSessionProductKey: productKey,
        remoteAssistUserAccepted: false,
        remoteAssistConsentVisible: status === 'active'
      });
      this._saveRemoteAssistLocal();
      wx.setKeepScreenOn({ keepScreenOn: true });
      this._startRemoteAssistUserPoll();
      this._showCustomToast('已发起远程协助', 'success', 1800);
    } catch (err) {
      let msg = err.message || '发起失败';
      if (msg.includes('FUNCTION_NOT_FOUND')) {
        msg = '远协功能暂未开放(云函数未部署)';
      } else if (msg.length > 30) {
        msg = msg.substring(0, 30) + '...';
      }
      this._showCustomToast(msg, 'none', 2500);
    }
  },

  async onAdminRemoteAssistTap() {
    if (!this.data.isAdmin) return;
    if (this.data.remoteAssistRole === 'admin' && this.data.remoteAssistSessionId) {
      this._showCustomToast('已在远协中', 'none', 2000);
      return;
    }
    const sessions = this.data.remoteAssistPendingSessions || [];
    if (!sessions.length) {
      this._showCustomToast('当前型号暂无远协请求', 'none', 2000);
      await this._pollRemoteAssistPending();
      return;
    }
    if (sessions.length === 1) {
      await this._acceptRemoteAssistSession(sessions[0]._id);
      return;
    }
    this.setData({ showRemoteAssistPickModal: true });
  },

  onCloseRemoteAssistPickModal() {
    this.setData({ showRemoteAssistPickModal: false });
  },

  async onPickRemoteAssistSession(e) {
    const sessionId = e && e.currentTarget && e.currentTarget.dataset &&
      e.currentTarget.dataset.sessionId;
    if (!sessionId) return;
    this.setData({ showRemoteAssistPickModal: false });
    await this._acceptRemoteAssistSession(sessionId);
  },

  async _acceptRemoteAssistSession(sessionId) {
    if (!sessionId) return;
    try {
      const r = await callRemoteAssist({ action: 'accept', sessionId });
      this._enterRemoteAssistAdmin(r.session);
    } catch (err) {
      this._showCustomToast(err.message || '接入失败', 'none', 2200);
      this._pollRemoteAssistPending();
    }
  },

  _enterRemoteAssistAdmin(session) {
    if (!session) return;
    const productKey = session.productKey;
    let idx = this.data.models.findIndex((m) => scanModelToProductKey(m) === productKey);
    if (idx < 0) idx = this.data.currentIndex;
    const currentModel = this.data.models[idx];
    const isF1 = currentModel && currentModel.name.includes('F1');
    this.updateCardStatus(idx);
    this._resetRemoteAssistDebugLogsMem();
    const patch = {
      remoteAssistRole: 'admin',
      remoteAssistSessionId: session._id,
      remoteAssistSessionStatus: session.status || 'active',
      remoteAssistSessionProductKey: productKey,
      remoteAssistPendingForCard: false,
      remoteAssistPendingSessionId: '',
      remoteAssistPendingSessions: [],
      currentModel,
      remoteSessionBleConnected: !!session.bleConnected,
      remoteAssistLastCmdAt: 0,
      remoteAssistDebugLogs: [],
      angleBtnText: isF1 ? '180°' : '90°'
    };
    this.setData(patch, () => {
      this._saveRemoteAssistLocal();
      this._applyRemoteDeviceState(session.deviceState);
      this._syncUiBleConnected();
      if (!this.data.showDetail) {
        this._openDetailAnimated({
          currentModel,
          angleBtnText: isF1 ? '180°' : '90°'
        });
      }
      this._startRemoteAssistAdminPoll();
    });
  },

  _startRemoteAssistUserPoll() {
    if (this._remoteAssistUserPollActive) return;
    this._remoteAssistUserPollActive = true;
    this._scheduleRemoteAssistUserPoll(0);
  },

  _scheduleRemoteAssistUserPoll(delayMs) {
    if (!this._remoteAssistUserPollActive) return;
    if (this._remoteAssistUserPollTimer) {
      clearTimeout(this._remoteAssistUserPollTimer);
    }
    this._remoteAssistUserPollTimer = setTimeout(() => {
      this._remoteAssistUserPollTimer = null;
      if (!this._remoteAssistUserPollActive) return;
      this._tickRemoteAssistUserPoll().finally(() => {
        if (!this._remoteAssistUserPollActive) return;
        const active = this.data.remoteAssistSessionStatus === 'active' &&
          this.data.remoteAssistUserAccepted;
        this._scheduleRemoteAssistUserPoll(active ? 160 : 700);
      });
    }, delayMs);
  },

  _startRemoteAssistAdminPoll() {
    if (this._remoteAssistAdminPollActive) return;
    this._remoteAssistAdminPollActive = true;
    this._scheduleRemoteAssistAdminPoll(0);
  },

  _scheduleRemoteAssistAdminPoll(delayMs) {
    if (!this._remoteAssistAdminPollActive) return;
    if (this._remoteAssistAdminPollTimer) {
      clearTimeout(this._remoteAssistAdminPollTimer);
    }
    this._remoteAssistAdminPollTimer = setTimeout(() => {
      this._remoteAssistAdminPollTimer = null;
      if (!this._remoteAssistAdminPollActive) return;
      this._tickRemoteAssistAdminPoll().finally(() => {
        if (!this._remoteAssistAdminPollActive) return;
        const hasSending = this._getRemoteAssistDebugLogs().some((l) => l.status === 'sending');
        this._scheduleRemoteAssistAdminPoll(hasSending ? 100 : 280);
      });
    }, delayMs);
  },

  async _tickRemoteAssistUserPoll() {
    const sessionId = this.data.remoteAssistSessionId;
    if (!sessionId || this.data.remoteAssistRole !== 'user') return;
    if (this._remoteAssistUserPollBusy) return;
    this._remoteAssistUserPollBusy = true;
    try {
      const pull = await callRemoteAssist({ action: 'pullCommands', sessionId });

      if (this.data.remoteAssistSessionId !== sessionId) return;

      const session = pull.session;
      if (!session || session.status === 'ended') {
        this._clearRemoteAssistLocal('ended');
        return;
      }

      // 技师已接入但用户尚未同意：只更新状态，不自动弹全屏确认
      if (session.status === 'active' && !this.data.remoteAssistUserAccepted) {
        const wasPending = this.data.remoteAssistSessionStatus === 'pending';
        const patch = {};
        if (this.data.remoteAssistSessionStatus !== 'active') {
          patch.remoteAssistSessionStatus = 'active';
          patch.blockDetailTouch = false;
        }
        if (wasPending) {
          patch.remoteAssistConsentVisible = true;
        }
        if (Object.keys(patch).length) {
          this.setData(patch);
          this._saveRemoteAssistLocal();
        }
        return;
      }

      if (session.status !== this.data.remoteAssistSessionStatus) {
        this.setData({
          remoteAssistSessionStatus: session.status,
          blockDetailTouch: session.status === 'active' ? false : this.data.blockDetailTouch
        });
        this._saveRemoteAssistLocal();
        if (session.status === 'active' && this.data.remoteAssistUserAccepted) {
          wx.setKeepScreenOn({ keepScreenOn: true });
        }
      }
      const cmds = pull.commands || [];
      if (cmds.length > 0) {
        const item = cmds[0];
        const execOk = await this._executeRemoteAssistCommand(item);
        if (item && item.id) {
          const feedback = {
            commandId: item.id,
            cmd: item.cmd || '',
            ok: execOk,
            at: Date.now()
          };
          let acked = false;
          for (let i = 0; i < 3 && !acked; i++) {
            try {
              await callRemoteAssist({
                action: 'ackCommand',
                sessionId,
                commandIds: [item.id],
                ok: execOk
              });
              acked = true;
            } catch (e) {
              console.warn('[远协] ackCommand 失败', i + 1, e);
              if (i < 2) await new Promise((r) => setTimeout(r, 180));
            }
          }
          if (!acked) {
            try {
              await callRemoteAssist({
                action: 'pushState',
                sessionId,
                lastCmdFeedback: feedback,
                bleConnected: this.data.isConnected,
                deviceSn: this.data.currentConnectedRawSn || '',
                deviceState: collectDeviceState(this)
              });
            } catch (e) {
              console.warn('[远协] pushState 回传执行结果失败', e);
            }
          }
        }
        await this._pushRemoteDeviceState(true);
      } else {
        await this._pushRemoteDeviceState(false);
      }
    } catch (e) {
      console.warn('[远协] 用户端轮询失败', e);
    } finally {
      this._remoteAssistUserPollBusy = false;
    }
  },

  async _tickRemoteAssistAdminPoll() {
    const sessionId = this.data.remoteAssistSessionId;
    if (!sessionId || this.data.remoteAssistRole !== 'admin') return;
    if (this._remoteAssistAdminPollBusy) return;
    this._remoteAssistAdminPollBusy = true;
    try {
      const r = await callRemoteAssist({ action: 'getSession', sessionId });
      
      if (this.data.remoteAssistSessionId !== sessionId) return;
      
      const session = r.session;
      if (!session || session.status === 'ended') {
        this._clearRemoteAssistLocal('ended');
        this._showCustomToast('远协已结束', 'none', 2000);
        return;
      }
      const patch = {
        remoteSessionBleConnected: !!session.bleConnected
      };
      if (session.deviceSn) patch.currentConnectedRawSn = session.deviceSn;
      const logPatch = this._syncRemoteAssistDebugLogsFromSession(session);
      if (logPatch) Object.assign(patch, logPatch);
      const statePatch = this.data.detailMode === 'edit'
        ? {}
        : this._buildRemoteStatePatch(session.deviceState, { forAdmin: true });
      this._applyRemoteStatePatch({ ...patch, ...statePatch }, () => {
        this._syncUiBleConnected();
      });
    } catch (e) {
      console.warn('[远协] 技师端轮询失败', e);
    } finally {
      this._remoteAssistAdminPollBusy = false;
    }
  },

  _applyRemoteDeviceState(deviceState) {
    const forAdmin = this.data.remoteAssistRole === 'admin';
    const patch = this._buildRemoteStatePatch(deviceState, { forAdmin });
    this._applyRemoteStatePatch(patch);
  },

  _scheduleRemoteStatePush() {
    if (this.data.remoteAssistRole !== 'user' || !this.data.remoteAssistSessionId) return;
    if (this._remoteStatePushTimer) return;
    this._remoteStatePushTimer = setTimeout(() => {
      this._remoteStatePushTimer = null;
      this._pushRemoteDeviceState(true);
    }, 250);
  },

  async _pushRemoteDeviceState(force) {
    if (this.data.remoteAssistRole !== 'user' || !this.data.remoteAssistSessionId) return;
    if (this.data.remoteAssistSessionStatus === 'active' && !this.data.remoteAssistUserAccepted) return;
    const ts = Date.now();
    if (!force && this._lastRemoteStatePushMs && ts - this._lastRemoteStatePushMs < 1500) return;
    this._lastRemoteStatePushMs = ts;
    try {
      await callRemoteAssist({
        action: 'pushState',
        sessionId: this.data.remoteAssistSessionId,
        bleConnected: this.data.isConnected,
        deviceSn: this.data.currentConnectedRawSn || '',
        deviceState: {
          ...collectDeviceState(this),
          bleWriteReady: this._isBleWriteReady()
        }
      });
    } catch (e) {
      console.warn('[远协] pushState 失败', e);
    }
  },

  async _remoteAssistEnqueueCommand(text, times, interval) {
    if (!this.data.remoteAssistSessionId) return;

    const safeTimes = times || 1;
    const safeInterval = Number.isFinite(Number(interval)) ? Number(interval) : 0;

    const finalTimes = Math.min(5, Math.max(1, safeTimes));
    const dedupeKey = `${text}|${finalTimes}|${safeInterval}`;
    const now = Date.now();
    if (this._lastRemoteEnqueueKey === dedupeKey &&
        now - (this._lastRemoteEnqueueMs || 0) < 350) {
      return;
    }
    this._lastRemoteEnqueueKey = dedupeKey;
    this._lastRemoteEnqueueMs = now;

    const pendingId = `pending_${now}`;
    const cmdLabel = finalTimes > 1 ? `${text} ×${finalTimes}` : text;
    this._pushRemoteAssistDebugLog({
      id: pendingId,
      time: this._formatRemoteAssistLogTime(now),
      cmd: cmdLabel,
      status: 'sending',
      label: this._remoteAssistLogLabel('sending'),
      enqueueAt: now
    });

    try {
      const r = await callRemoteAssist({
        action: 'enqueueCommand',
        sessionId: this.data.remoteAssistSessionId,
        cmd: text,
        times: finalTimes,
        interval: safeInterval
      });
      const commandId = r.commandId || pendingId;
      if (r.coalesced) {
        this._patchRemoteAssistDebugLog(pendingId, {
          id: commandId,
          status: 'coalesced',
          label: this._remoteAssistLogLabel('coalesced')
        });
      } else {
        this._patchRemoteAssistDebugLog(pendingId, { id: commandId });
      }
      console.log('[远协] 指令已入队:', text, finalTimes, safeInterval);
    } catch (err) {
      console.warn('[远协] 入队失败', err);
      this._patchRemoteAssistDebugLog(pendingId, {
        status: 'enqueue_fail',
        label: this._remoteAssistLogLabel('enqueue_fail')
      });
      this._showCustomToast(err.message || '远协发送失败', 'none', 2200);
    }
  },

  onAcceptRemoteAssist() {
    if (this.data.remoteAssistRole !== 'user') return;
    if (this.data.remoteAssistUserAccepted) return;
    this.setData({
      remoteAssistUserAccepted: true,
      remoteAssistConsentVisible: false,
      blockDetailTouch: false
    }, () => {
      this._saveRemoteAssistLocal();
      wx.setKeepScreenOn({ keepScreenOn: true });
      this._pushRemoteDeviceState(true);
      this._showCustomToast('已同意远程协助', 'success', 1500);
    });
  },

  onRejectRemoteAssist() {
    this.onEndRemoteAssistSession();
  },

  async onEndRemoteAssistSession() {
    if (this._endingRemoteAssist) return;
    this._endingRemoteAssist = true;
    const sessionId = this.data.remoteAssistSessionId;
    // 先关本地遮罩，避免云函数失败时用户被困住
    this._clearRemoteAssistLocal('end');
    this._endingRemoteAssist = false;
    if (!sessionId) return;
    try {
      await callRemoteAssist({ action: 'end', sessionId });
    } catch (e) {
      console.warn('[远协] 结束会话云端失败，本地已退出', e);
      this._showCustomToast('已结束协助', 'none', 1800);
    }
  },

  async _endRemoteAssistSession(action) {
    if (this._endingRemoteAssist) return;
    this._endingRemoteAssist = true;
    const sessionId = this.data.remoteAssistSessionId;
    const act = action || 'end';
    this._clearRemoteAssistLocal(act);
    this._endingRemoteAssist = false;
    if (!sessionId) return;
    try {
      await callRemoteAssist({ action: act, sessionId });
    } catch (e) {
      console.warn('[远协] 结束会话云端失败，本地已退出', e);
    }
  },

  _clearRemoteAssistLocal(reason) {
    const wasAdmin = this.data.remoteAssistRole === 'admin';
    this._stopRemoteAssistPollers();
    this._resetRemoteAssistDebugLogsMem();
    try { wx.removeStorageSync(REMOTE_ASSIST_STORAGE_KEY); } catch (e) { /* ignore */ }
    wx.setKeepScreenOn({ keepScreenOn: false });
    this.setData({
      remoteAssistRole: '',
      remoteAssistSessionId: '',
      remoteAssistSessionStatus: '',
      remoteAssistSessionProductKey: '',
      remoteAssistUserAccepted: false,
      remoteSessionBleConnected: false,
      remoteAssistCapsuleActive: false,
      remoteAssistConsentVisible: false,
      remoteAssistLastCmdAt: 0,
      remoteAssistDebugLogs: [],
      uiBleConnected: false
    }, () => {
      this._syncUiBleConnected();
      if (wasAdmin) this._pollRemoteAssistPending();
      if (reason === 'ended' && wasAdmin && this.data.showDetail) {
        this._closeDetailAnimated();
      }
    });
  },

  // ===============================================
  // 隐蔽模式教学逻辑
  // ===============================================
  
  // 1. 点击入口：显示教学弹窗（进入模式）
  openStealthTutorial() {
    this.openStealthTutorialWithMode('enter');
  },

  // 1-1. 显示退出隐蔽模式教学弹窗
  openExitStealthTutorial() {
    this.openStealthTutorialWithMode('exit');
  },

  // 1-2. 通用打开教学弹窗函数
  openStealthTutorialWithMode(mode) {
    // 防止“点击进入控制台”后出现点击透传，误打开教学弹窗
    if (Date.now() < (this._controlTapLockUntil || this.data.detailOpenGuardUntil || 0)) return;
    const isEnter = mode === 'enter';
    // 步骤1：第一帧（初始状态）
    this.setData({ 
      showStealthTutorial: true,
      stealthTutorialMode: mode,
      stealthAnimPressing: false,  // 按钮：未按下
      stealthAnimLight: false,     // 灯光：红色（不亮）
      stealthAnimText: isEnter ? '请在车把上\n长按按键 3 秒' : '长按车把按钮\n8 秒',
      stealthAnimTextColor: 'black', // 文字颜色：黑色
      stealthAnimTextScale: 1, // 文字缩放：正常
      stealthTutorialBtnDisabled: true // 按钮禁用
    });
    
    // 第一帧停留时间：进入模式5秒，退出模式2秒
    const firstFrameDuration = isEnter ? 5000 : 2000;
    setTimeout(() => {
      this.step2_ButtonPress();
    }, firstFrameDuration);
  },

  // 2. 关闭教学弹窗
  closeStealthTutorial() {
    this.stopStealthAnim();
    this.setData({ 
      showStealthTutorial: false,
      stealthTutorialMode: 'enter',
      stealthAnimPressing: false,
      stealthAnimLight: false,
      stealthAnimText: '请在车把上\n长按按键 3 秒',
      stealthAnimTextColor: 'black',
      stealthAnimTextScale: 1,
      stealthTutorialBtnDisabled: true
    });
  },

  // ===============================================
  // 🔴 出厂设置功能（F1 MAX / F2 PRO / F2 MAX 系列）
  // ===============================================
  handleFactoryReset() {
    if (Date.now() < (this._controlTapLockUntil || 0)) return;
    console.log('🔧 [管理员] 点击出厂设置按钮');
    
    // 检查是否为管理员
    if (!this.data.isAdmin) {
      this._showCustomToast('需要管理员权限', 'none', 2000);
      return;
    }
    
    // 检查是否为支持出厂设置的机型
    const currentModel = this.data.currentModel || {};
    const name = currentModel.name || '';
    const type = currentModel.type || '';

    const isF2MaxSeries = isF2MaxSeriesModel(currentModel);
    const isF2ProSeries = name.includes('F2') && type === 'Pro';
    const isF1Max = name.includes('F1') && type === 'Max';
    const isF1Pro = name.includes('F1') && type === 'Pro';
    const isSupported = isF2MaxSeries || isF2ProSeries || isF1Max || isF1Pro;
    
    if (!isSupported) {
      this._showCustomToast('仅支持 F1 MAX / F2 PRO / F2 MAX / F2 ULTRA 系列', 'none', 2000);
      return;
    }
    
    // 震动反馈
    wx.vibrateShort({ type: 'light' });
    
    // 开始出厂设置流程
    this.startFactoryReset();
  },

  // 开始出厂设置流程
  startFactoryReset() {
    const currentModel = this.data.currentModel || {};
    const name = currentModel.name || '';
    const type = currentModel.type || '';

    const isF2MaxSeries = isF2MaxSeriesModel(currentModel);
    const isF2ProSeries = name.includes('F2') && type === 'Pro';
    const isF1Max = name.includes('F1') && type === 'Max';
    const isF1Pro = name.includes('F1') && type === 'Pro';

    let steps = [];

    if (isF2MaxSeries) {
      // F2 MAX 系列：原来的四步流程（最后一步带自动调平动画 + 确认键）
      // 全程自动播放，用户只在最后一步点击确认结束
      steps = [
        { text: '正在打开自动收回', data: '打开收回', sendTimes: 2, interval: 500, delayNext: 2000 },
        { text: '正在开启自检', data: '开启自检', sendTimes: 2, interval: 500, delayNext: 2000 },
        { text: '正在打开开机牌上翻', data: '开机上翻', sendTimes: 2, interval: 500, delayNext: 2000 },
        { text: '正在自动调平，请用手进行阻挡', data: '自动调平', sendTimes: 2, interval: 500, delayNext: 0, isLeveling: true, isFinal: true }
      ];
    } else if (isF1Max) {
      // F1 MAX：
      // 在“初始化角度（折叠点归零）”之前，先设置“关机位置=收回”（发送“打开收回”）
      // 之后再进入原有初始化流程，第一步仍需用户点击确认
      steps = [
        {
          text: '正在设置关机位置为收回',
          data: '打开收回',
          sendTimes: 2,
          interval: 500,
          delayNext: 2000
        },
        {
          text: '初始化角度中',
          data: '初始化角度',
          sendTimes: 2,
          interval: 500,
          delayNext: 0,          // 等待用户点击确认
          showConfirm: true
        },
        {
          text: '请长按按钮3秒',
          data: null,
          sendTimes: 0,
          interval: 0,
          delayNext: 3000
        },
        {
          text: '断开细红线',
          data: null,
          sendTimes: 0,
          interval: 0,
          delayNext: 3000
        },
        {
          text: '请观察主板是不是还继续亮灯',
          data: null,
          sendTimes: 0,
          interval: 0,
          delayNext: 0,
          isFinal: true
        }
      ];
    } else if (isF2ProSeries) {
      // F2 PRO：
      // 文案拆成多句，每句单独显示 3 秒，
      // 第一步发送“初始化角度”，并且需要用户点击“确认”后才进入下一步
      steps = [
        { 
          text: '初始化角度中',
          data: '初始化角度',
          sendTimes: 2,
          interval: 500,
          delayNext: 0,          // 🔴 不自动跳到下一步，等待用户点击确认
          showConfirm: true      // 初始化角度阶段也需要确认键
        },
        { 
          text: '请长按按钮3秒',
          data: null,
          sendTimes: 0,
          interval: 0,
          delayNext: 3000
        },
        { 
          text: '断开细红线',
          data: null,
          sendTimes: 0,
          interval: 0,
          delayNext: 3000
        },
        { 
          text: '请观察主板是不是还继续亮灯',
          data: null,
          sendTimes: 0,
          interval: 0,
          delayNext: 0,
          isFinal: true
        }
      ];
    } else if (isF1Pro) {
      // F1 PRO：只发送一次“初始化角度”，并立即显示带确认键
      steps = [
        {
          text: '初始化角度中',
          data: '初始化角度',
          sendTimes: 2,
          interval: 500,
          delayNext: 0,
          isFinal: true
        }
      ];
    } else {
      // 兜底：使用默认步骤（不太可能走到这里）
      steps = this.data.factoryResetSteps || [];
    }

    // 重置步骤并显示弹窗
    this.setData({
      showFactoryResetModal: true,
      factoryResetStep: 0,
      factoryResetSteps: steps
    });

    // 执行所有步骤
    this.executeFactoryResetStep(0);
  },

  // 执行出厂设置步骤
  executeFactoryResetStep(stepIndex) {
    // 如果用户已经手动中断（关闭弹窗），不再继续后续步骤
    if (!this.data.showFactoryResetModal) {
      console.log('⏹ [出厂设置] 弹窗已关闭，中断后续步骤');
      return;
    }
    const steps = this.data.factoryResetSteps || [];
    if (stepIndex >= steps.length) {
      // 所有步骤完成，保持弹窗显示，等待用户点击确认
      console.log('✅ [出厂设置] 所有步骤完成');
      return;
    }

    const step = steps[stepIndex] || {};
    
    // 更新当前步骤
    this.setData({
      factoryResetStep: stepIndex
    });

    this.setData({
      factoryResetStep: stepIndex
    });

    const data = step.data;
    const sendTimes = step.sendTimes != null ? step.sendTimes : 2;
    const interval = step.interval != null ? step.interval : 500;
    const delayNext = step.delayNext != null ? step.delayNext : 2000;

    if (data) {
      console.log(`📤 [出厂设置] 步骤 ${stepIndex + 1}: ${data}（连续${sendTimes}次，间隔${interval}ms）`);
      this.sendDataMultiple(data, sendTimes, interval);
    } else {
      console.log(`ℹ️ [出厂设置] 步骤 ${stepIndex + 1}: 仅提示，无需发送数据`);
    }

    // 如果是 F1 MAX / F2 PRO 系列的第一步（需要确认），或标记为 isFinal 的步骤：
    // 不自动进入下一步，等待用户点击“确认”
    if (step.showConfirm || step.isFinal || delayNext <= 0 || stepIndex >= steps.length - 1) {
      console.log('ℹ️ [出厂设置] 当前步骤等待用户确认或已是最后一步');
      return;
    }

    // 其他步骤：延迟后自动执行下一步
    setTimeout(() => {
      this.executeFactoryResetStep(stepIndex + 1);
    }, delayNext);
  },

  // 确认出厂设置完成
  confirmFactoryReset() {
    const steps = this.data.factoryResetSteps || [];
    const currentIndex = this.data.factoryResetStep || 0;
    const currentStep = steps[currentIndex] || {};

    // 如果是最终步骤（isFinal），点击确认关闭弹窗
    if (currentStep.isFinal || currentIndex >= steps.length - 1) {
      this.setData({
        showFactoryResetModal: false,
        factoryResetStep: 0
      });
      console.log('✅ [出厂设置] 用户确认完成，关闭弹窗');
      return;
    }

    // 其他带确认键的步骤（例如：初始化角度中）：
    // 点击确认后进入下一步
    const nextIndex = currentIndex + 1;
    console.log(`ℹ️ [出厂设置] 用户确认步骤 ${currentIndex + 1}，进入步骤 ${nextIndex + 1}`);
    this.executeFactoryResetStep(nextIndex);
  },

  // 🔴 新增：用户主动中断出厂设置（右上角 X）
  cancelFactoryReset() {
    console.log('⏹ [出厂设置] 用户点击关闭，立即中断所有步骤');
    this.setData({
      showFactoryResetModal: false,
      factoryResetStep: 0
    });
    // 不需要额外清理定时器：executeFactoryResetStep 会在下次检查到 showFactoryResetModal=false 后自动停止
  },

  // 步骤2：按钮按下
  step2_ButtonPress() {
    this.stopStealthAnim();
    
    const isEnter = this.data.stealthTutorialMode === 'enter';
    const pressDuration = isEnter ? 3000 : 8000; // 进入3秒，退出8秒
    const pressText = isEnter ? '长按按钮3秒' : '长按车把按钮8秒';
    
    this.setData({
      stealthAnimPressing: true,  // 按钮：按下
      stealthAnimLight: true,     // 灯光：红色（亮）
      stealthAnimText: pressText
    });
    
    // 根据模式使用不同的时间后进入步骤4（闪烁）
    this.stealthTutorialTimer = setTimeout(() => {
      this.step4_StartBlinking();
    }, pressDuration);
  },

  // 步骤4：灯闪烁
  step4_StartBlinking() {
    const isEnter = this.data.stealthTutorialMode === 'enter';
    const blinkTimes = isEnter ? 3 : 5; // 进入闪烁3次，退出闪烁5次
    const totalBlinks = blinkTimes * 2; // 每次闪烁需要2次切换（亮→灭）
    const blinkInterval = isEnter ? 200 : 500; // 进入0.2秒，退出0.5秒
    const halfPoint = isEnter ? 3 : 5; // 闪烁一半的点：进入3次切换，退出5次切换
    
    // 按钮回到第一帧状态，设置闪烁文字
    this.setData({
      stealthAnimPressing: false, // 按钮：未按下（回到第一帧）
      stealthAnimLight: false,     // 灯光：红色（不亮）
      stealthAnimText: `按钮闪烁${blinkTimes}次`
    });
    
    let blinkCount = 0;
    
    // 灯光闪烁定时器（一直保持0.5秒间隔）
    this.stealthBlinkInterval = setInterval(() => {
      blinkCount++;
      
      // 切换灯光状态
      this.setData({ 
        stealthAnimLight: !this.data.stealthAnimLight 
      });
      
      // 退出模式：闪烁一半时，文字改成红色"请松开手指！！"，并开始文字闪烁
      if (!isEnter && blinkCount === halfPoint) {
        this.setData({
          stealthAnimText: '请松开手指！！',
          stealthAnimTextColor: 'red'
        });
        // 开始文字闪烁（爆闪，0.1秒间隔）
        this.stealthTextBlinkInterval = setInterval(() => {
          this.setData({
            stealthAnimTextColor: this.data.stealthAnimTextColor === 'red' ? 'transparent' : 'red'
          });
        }, 100); // 文字闪烁间隔0.1秒
      }
      
      // 闪烁完成后
      if (blinkCount >= totalBlinks) {
        clearInterval(this.stealthBlinkInterval);
        this.stealthBlinkInterval = null;
        // 停止文字闪烁
        if (this.stealthTextBlinkInterval) {
          clearInterval(this.stealthTextBlinkInterval);
          this.stealthTextBlinkInterval = null;
        }
        // 恢复文字颜色为红色
        if (!isEnter) {
          this.setData({
            stealthAnimTextColor: 'red'
          });
        }
        // 步骤5：闪烁完成
        this.step5_Complete();
      }
    }, blinkInterval);
  },

  // 步骤5：闪烁完成
  step5_Complete() {
    const isEnter = this.data.stealthTutorialMode === 'enter';
    
    this.setData({
      stealthAnimPressing: false, // 按钮：未按下
      stealthAnimLight: false,    // 灯光：红色（不亮）
      stealthAnimText: isEnter ? '已进入隐蔽模式' : '此时退出',
      stealthAnimTextColor: 'black', // 保持黑色
      stealthAnimTextScale: 1 // 正常大小
    });
    
    if (isEnter) {
      // 进入模式：3秒后进入步骤6（警告）
      this.stealthTutorialTimer = setTimeout(() => {
        this.step6_Warning();
      }, 3000);
    } else {
      // 退出模式：4秒后直接启用按钮
      this.stealthTutorialTimer = setTimeout(() => {
        this.setData({
          stealthTutorialBtnDisabled: false
        });
      }, 4000);
    }
  },

  // 步骤6：警告提示（红色文字，放大缩小2次）
  step6_Warning() {
    // 更新文字为警告，颜色改为红色
    this.setData({
      stealthAnimText: '请注意\n不能开启该模式长时间停放！！',
      stealthAnimTextColor: 'red'
    });
    
    // 放大缩小动画（2次）
    let scaleCount = 0;
    const animateScale = () => {
      // 放大到1.2倍
      this.setData({ stealthAnimTextScale: 1.2 });
      
      setTimeout(() => {
        // 缩小回1倍
        this.setData({ stealthAnimTextScale: 1 });
        scaleCount++;
        
        if (scaleCount < 2) {
          // 如果还没完成2次，继续下一次
          setTimeout(() => {
            animateScale();
          }, 300); // 间隔300ms
        } else {
          // 动画完成，启用按钮
          this.setData({
            stealthTutorialBtnDisabled: false
          });
        }
      }, 300); // 放大持续时间300ms
    };
    
    // 开始第一次动画
    setTimeout(() => {
      animateScale();
    }, 200);
  },

  // 停止动画
  stopStealthAnim() {
    if (this.stealthTutorialTimer) {
      clearTimeout(this.stealthTutorialTimer);
      this.stealthTutorialTimer = null;
    }
    if (this.stealthBlinkInterval) {
      clearInterval(this.stealthBlinkInterval);
      this.stealthBlinkInterval = null;
    }
    if (this.stealthTextBlinkInterval) {
      clearInterval(this.stealthTextBlinkInterval);
      this.stealthTextBlinkInterval = null;
    }
  },

  // ===============================================
  // 【新增】弹窗防误触核心逻辑
  // ===============================================
  setModalDelay() {
    // 1. 立即锁定
    this.setData({ modalBtnDisabled: true });
    
    // 2. 清除旧定时器 (防止频繁触发冲突)
    if (this.modalDelayTimer) clearTimeout(this.modalDelayTimer);

    // 3. 1.5 秒后解锁
    this.modalDelayTimer = setTimeout(() => {
      this.setData({ modalBtnDisabled: false });
    }, 1500);
  },

  scanModelToProductModel(model) {
    if (!model) return '';
    const name = model.name || '';
    const type = model.type || '';
    if (name === 'F1' && type === 'Pro') return 'F1 PRO';
    if (name === 'F1' && type === 'Max') return 'F1 MAX';
    if (name === 'F1' && isF1UltraType(type)) return 'F1 ULTRA';
    if (name === 'F2' && type === 'Pro') return 'F2 PRO';
    if (name === 'F2' && type === 'Max') return 'F2 MAX';
    if (name === 'F2' && isF2LongType(type)) return 'F2 Long';
    if (name === 'F2' && type === 'Ultra') return 'F2 ULTRA';
    if (name === 'F3' && type === 'Pro') return 'F3 PRO';
    if (name === 'F3' && type === 'Max') return 'F3 MAX';
    return `${name} ${type}`.trim();
  },

  normalizeSnFromBluetoothName(rawName) {
    const upper = String(rawName || '').trim().toUpperCase();
    if (!upper.startsWith('NB')) return '';
    const suffix = upper.replace(/^NB-?/, '').replace(/\s+/g, '');
    if (!suffix) return '';
    return `MT-${suffix}`;
  },

  async ensureAdminPrivilegeForSnFlow() {
    const ADMIN_CACHE_KEY = '__scan_admin_privilege_cache__';
    const ADMIN_CACHE_TTL = 10 * 60 * 1000;
    try {
      const cache = wx.getStorageSync(ADMIN_CACHE_KEY);
      if (cache && typeof cache.isAdmin === 'boolean' && cache.ts && (Date.now() - cache.ts < ADMIN_CACHE_TTL)) {
        if (this.data.isAdmin !== cache.isAdmin) {
          this.setData({ isAdmin: cache.isAdmin });
        }
        return;
      }
    } catch (e) {}
    await this.checkAdminPrivilege();
  },

  _markAdminDeviceRegistered(sn, registeredModel) {
    const model = String(registeredModel || '').trim();
    this._adminSessionRegisteredSn = sn || '';
    this._adminSessionRegisteredModel = model;
    const patch = { adminRegisteredSn: sn || '' };
    if (model) patch.adminRegisteredModel = model;
    this.setData(patch);
  },

  async maybeShowAdminSnRegisterModal(normalizedSn) {
    const model =
      this.data.currentModel ||
      this.data.models[this.data.currentIndex] ||
      null;
    const productModel = this.scanModelToProductModel(model);
    if (!productModel) {
      console.warn('[scan] 无法解析产品型号，跳过绑定弹窗', model);
      return;
    }

    if (this._adminSessionRegisteredSn && this._adminSessionRegisteredSn === normalizedSn) {
      return;
    }

    try {
      const res = await wx.cloud.callFunction({
        name: 'adminRegisterSn',
        data: {
          action: 'check',
          sn: normalizedSn,
          productModel
        }
      });
      const r = res.result || {};
      if (!r.success) return;

      if (!r.showDialog) {
        if (r.reason === 'already_registered' && r.sn) {
          this._markAdminDeviceRegistered(r.sn, r.registeredModel);
        }
        return;
      }

      this.setData({
        showAdminSnModal: true,
        adminSnModalClosing: false,
        adminSnModalMode: r.mode || 'confirm_new',
        adminSnModalSn: r.sn || normalizedSn,
        adminSnModalTargetModel: r.targetModel || productModel,
        adminSnModalExistingModel: r.existingModel || '',
        adminSnRegisterSubmitting: false,
        adminSnShowModelPicker: false
      });
    } catch (err) {
      console.error('[scan] adminRegisterSn check failed', err);
    }
  },

  closeAdminSnModal() {
    this.setData({ adminSnModalClosing: true, adminSnRegisterSubmitting: false });
    setTimeout(() => {
      this.setData({
        showAdminSnModal: false,
        adminSnModalClosing: false,
        adminSnModalMode: '',
        adminSnModalSn: '',
        adminSnModalTargetModel: '',
        adminSnModalExistingModel: '',
        adminSnRegisterSubmitting: false,
        adminSnShowModelPicker: false
      });
    }, 420);
  },

  cancelAdminSnModal() {
    if (this.data.adminSnRegisterSubmitting) return;
    this.closeAdminSnModal();
  },

  /** 已绑定其他型号时：沿用原绑定，不随当前卡片改型号 */
  confirmAdminSnKeepBinding() {
    if (this.data.adminSnRegisterSubmitting) return;
    const sn = this.data.currentConnectedRawSn || this.data.adminSnModalSn;
    const model = this.data.adminSnModalExistingModel || this.data.adminRegisteredModel;
    if (sn) this._markAdminDeviceRegistered(sn, model);
    this.closeAdminSnModal();
    this._showCustomToast(`已沿用 ${model || '原'} 绑定`, 'none', 2000);
  },

  /** 型号不一致：切换为当前卡片型号 */
  confirmAdminSnSwitchBinding() {
    if (this.data.adminSnRegisterSubmitting) return;
    const target = this.data.adminSnModalTargetModel;
    if (!target) return;
    this._submitAdminSnRegister(target, true);
  },

  openAdminSnOtherModelPicker() {
    if (this.data.adminSnRegisterSubmitting) return;
    this.setData({ adminSnShowModelPicker: true });
  },

  closeAdminSnModelPicker() {
    if (this.data.adminSnRegisterSubmitting) return;
    this.setData({ adminSnShowModelPicker: false });
  },

  onAdminSnPickOtherModel(e) {
    if (this.data.adminSnRegisterSubmitting) return;
    const picked = e.currentTarget.dataset.model;
    if (!picked) return;
    this.setData({ adminSnShowModelPicker: false });
    this._submitAdminSnRegister(picked, this.data.adminSnModalMode === 'change_model');
  },

  async confirmAdminSnRegister() {
    if (this.data.adminSnRegisterSubmitting) return;
    const { adminSnModalTargetModel } = this.data;
    if (!adminSnModalTargetModel) return;
    await this._submitAdminSnRegister(adminSnModalTargetModel, false);
  },

  async _submitAdminSnRegister(productModel, isUpdate) {
    if (this.data.adminSnRegisterSubmitting) return;
    const { adminSnModalSn, adminSnModalMode, currentConnectedRawSn, adminSelectedRepairId } = this.data;
    const sn = currentConnectedRawSn || adminSnModalSn;
    if (!sn || !productModel) return;

    // 已选售后工单：走换机 SN 替换（继承质保，旧机报废）
    if (adminSelectedRepairId) {
      await this._completeDeviceReplacementIfNeeded(sn, productModel);
      return;
    }

    const needUpdate =
      isUpdate || adminSnModalMode === 'change_model';

    this.setData({ adminSnRegisterSubmitting: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'adminRegisterSn',
        data: {
          action: needUpdate ? 'update_model' : 'register',
          sn,
          productModel,
          deviceName: sn
        }
      });
      const r = res.result || {};
      if (r.success) {
        this._markAdminDeviceRegistered(sn, productModel);
        this._showCustomToast(r.msg || '绑定成功', 'success', 2000);
        this.closeAdminSnModal();
      } else {
        this._showCustomToast(r.msg || '操作失败', 'none', 2500);
        this.setData({ adminSnRegisterSubmitting: false });
      }
    } catch (err) {
      console.error('[scan] adminRegisterSn register failed', err);
      this._showCustomToast('网络异常，请重试', 'none', 2500);
      this.setData({ adminSnRegisterSubmitting: false });
    }
  },

  onAdminSnSwitchDevice() {
    if (this.data.adminSnRegisterSubmitting) return;
    this.closeAdminSnModal();
    this.handleDisconnect();
    setTimeout(() => {
      this.handleConnect();
    }, 500);
  },

  // ===============================================
  // 蓝牙连接交互 (修改版)
  // ===============================================
  async handleConnect() {
    if (Date.now() < (this._controlTapLockUntil || 0)) return;

    // 自动重连中：点击胶囊 → 停止重连并立即进入手动扫描（无需再点第二次）
    if (this.data.isBleAutoReconnecting) {
      this.stopBleAutoReconnect(false);
    }

    // 防止重复点击：如果已连接、正在连接、正在跳转到OTA页面，则直接返回
    if (this.data.remoteAssistCapsuleActive) {
      this._showCustomToast('远协中，请通过上方结束远协', 'none', 2000);
      return;
    }
    if (this.data.isConnected || this.data.isConnecting || this.data.isNavigatingToOta) {
      return;
    }

    // 用户主动连接：扫描期间不自动重连上一台设备，避免换机后仍卡在「正在重连」
    this._bleReconnectStoppedByUser = true;
    this._clearBleReconnectTimers();
    this._startBleScanSession();
  },

  _startBleScanSession() {
    if (this._bleScanTimeoutTimer) {
      clearTimeout(this._bleScanTimeoutTimer);
      this._bleScanTimeoutTimer = null;
    }

    const isAutoReconnect = !!this.data.isBleAutoReconnecting;

    // 自动重连时跳过「靠近车辆」提示，立即扫描
    if (!isAutoReconnect) {
      this.setData({ showApproachTip: true });
      setTimeout(() => { this.setData({ showApproachTip: false }); }, 2000);
    }

    this.setData({ isScanning: true, isConnecting: false });

    // 3. 初始化蓝牙适配器
    this.ble.initBluetoothAdapter()
      .then(() => { 
        this.ble.startScan(); 
        
        this._bleScanTimeoutTimer = setTimeout(() => {
          if (!this.data.isConnected && this.data.isScanning) {
            this.ble.stopScan();
            if (this.data.isBleAutoReconnecting) {
              this.setData({ isScanning: false, isConnecting: false });
              this.startBleAutoReconnect();
              return;
            }
            if (!this.data.isBleAutoReconnecting) {
              this.setData({ isScanning: false, isConnecting: false });
            }
          }
        }, isAutoReconnect ? 8000 : 15000);
      })
      .catch((err) => {
        console.error("蓝牙初始化失败", err);
        
        this.setData({ 
          isScanning: false,
          isConnecting: false,
          isBleAutoReconnecting: false,
          showBluetoothAlert: true
        });
        
        this.setModalDelay();
        wx.vibrateLong(); 
      });
  },

  stopBleAutoReconnect(showTip) {
    this._clearBleReconnectTimers();
    this._bleReconnectStoppedByUser = true;
    if (this.ble) this.ble.stopScan();
    this._applyBleLinkUi({
      isBleAutoReconnecting: false,
      isScanning: false,
      isConnecting: false,
      bleReconnectAttempt: 0
    });
    if (showTip) {
      this._showCustomToast('已停止重连', 'none', 1500);
    }
  },

  _clearBleReconnectTimers() {
    if (this._bleReconnectTimer) {
      clearTimeout(this._bleReconnectTimer);
      this._bleReconnectTimer = null;
    }
    if (this._bleScanTimeoutTimer) {
      clearTimeout(this._bleScanTimeoutTimer);
      this._bleScanTimeoutTimer = null;
    }
  },

  startBleAutoReconnect() {
    this._requestBleAutoReconnect('start');
  },

  _requestBleAutoReconnect(reason) {
    if (this._bleReconnectStoppedByUser || !this._lastBleDevice) return;
    if (this.data.isConnected || this.data.uiBleConnected) return;

    if (this._bleReconnectTimer) {
      clearTimeout(this._bleReconnectTimer);
      this._bleReconnectTimer = null;
    }

    const attempt = (this.data.bleReconnectAttempt || 0) + 1;
    if (attempt > 8) {
      this.stopBleAutoReconnect(false);
      this.setData({ showDisconnectTip: true });
      setTimeout(() => this.setData({ showDisconnectTip: false }), 2000);
      return;
    }

    console.log('[BLE] schedule auto reconnect', { reason, attempt });

    this.setData({
      isBleAutoReconnecting: true,
      isScanning: true,
      isConnecting: false,
      showDisconnectTip: false,
      bleReconnectAttempt: attempt
    });

    const delayMs = attempt === 1 ? 0 : Math.min(1000, 120 + (attempt - 1) * 180);
    this._bleReconnectTimer = setTimeout(() => {
      this._bleReconnectTimer = null;
      if (this._bleReconnectStoppedByUser || this.data.isConnected) return;
      this._attemptBleReconnect();
    }, delayMs);
  },

  _attemptBleReconnect() {
    const dev = this._lastBleDevice;
    this.ble.initBluetoothAdapter()
      .then(() => {
        if (this._bleReconnectStoppedByUser || this.data.isConnected) return;
        if (!dev || !dev.deviceId) {
          this._startBleScanSession();
          return;
        }
        this.setData({ isConnecting: true, isScanning: false });
        return this.ble.connectDevice(dev).catch((err) => {
          console.warn('[BLE] direct reconnect connect failed', err);
          this.setData({ isConnecting: false });
        });
      })
      .catch((err) => {
        console.warn('[BLE] direct reconnect init failed', err);
        if (!this._bleReconnectStoppedByUser && !this.data.isConnected) {
          this.setData({ isConnecting: false });
          this._requestBleAutoReconnect('init_failed');
        }
      });
  },

  async _checkConnectedSnAllowed(normalizedSn) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'deviceReplacement',
        data: { action: 'checkSn', sn: normalizedSn }
      });
      const r = res.result || {};
      if (r.success && r.ok === false) {
        this._showCustomToast(r.msg || '该设备不可用', 'none', 2800);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[scan] checkSn failed', err);
      return true;
    }
  },

  async _loadAwaitingReplacementRepairs() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'deviceReplacement',
        data: { action: 'listAwaiting' }
      });
      const r = res.result || {};
      if (r.success && Array.isArray(r.data)) return r.data;
    } catch (err) {
      console.warn('[scan] listAwaiting failed', err);
    }
    return [];
  },

  async _maybeShowAdminRepairPickerThenSn(normalizedSn) {
    const awaiting = await this._loadAwaitingReplacementRepairs();
    if (awaiting.length > 0) {
      this.setData({
        showAdminRepairPicker: true,
        adminRepairPickerClosing: false,
        adminAwaitingRepairs: awaiting,
        adminSelectedRepairId: '',
        adminSelectedRepair: null
      });
      this._pendingAdminSnAfterRepair = normalizedSn;
      return;
    }
    await this.maybeShowAdminSnRegisterModal(normalizedSn);
  },

  closeAdminRepairPicker() {
    this.setData({ adminRepairPickerClosing: true });
    setTimeout(() => {
      this.setData({
        showAdminRepairPicker: false,
        adminRepairPickerClosing: false,
        adminAwaitingRepairs: []
      });
      const pendingSn = this._pendingAdminSnAfterRepair;
      this._pendingAdminSnAfterRepair = '';
      if (pendingSn) this.maybeShowAdminSnRegisterModal(pendingSn);
    }, 320);
  },

  onPickAdminRepair(e) {
    const id = e.currentTarget.dataset.id;
    const item = (this.data.adminAwaitingRepairs || []).find((r) => r._id === id);
    if (!item) return;
    this.setData({
      adminSelectedRepairId: id,
      adminSelectedRepair: item
    });
  },

  confirmAdminRepairPick() {
    const { adminSelectedRepairId, adminSelectedRepair } = this.data;
    if (!adminSelectedRepairId || !adminSelectedRepair) {
      this._showCustomToast('请选择售后工单', 'none', 2000);
      return;
    }
    const pendingSn = this._pendingAdminSnAfterRepair;
    this._pendingAdminSnAfterRepair = '';
    this.setData({
      showAdminRepairPicker: false,
      adminRepairPickerClosing: false
    });
    if (pendingSn) {
      this.maybeShowAdminSnRegisterModal(pendingSn);
    }
  },

  skipAdminRepairPick() {
    this.setData({
      adminSelectedRepairId: '',
      adminSelectedRepair: null
    });
    this.closeAdminRepairPicker();
  },

  async _completeDeviceReplacementIfNeeded(sn, productModel) {
    const repairId = this.data.adminSelectedRepairId;
    if (!repairId) return false;

    this.setData({ adminSnRegisterSubmitting: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'deviceReplacement',
        data: {
          action: 'complete',
          repairId,
          newSn: sn,
          productModel
        }
      });
      const r = res.result || {};
      if (r.success) {
        this._markAdminDeviceRegistered(sn, r.productModel || productModel);
        this.setData({
          adminSelectedRepairId: '',
          adminSelectedRepair: null
        });
        this._showCustomToast(r.msg || '换机完成，用户 SN 已更新', 'success', 2500);
        this.closeAdminSnModal();
        return true;
      }
      this._showCustomToast(r.msg || '换机失败', 'none', 2800);
      this.setData({ adminSnRegisterSubmitting: false });
      return false;
    } catch (err) {
      console.error('[scan] complete replacement failed', err);
      this._showCustomToast('换机失败，请重试', 'none', 2500);
      this.setData({ adminSnRegisterSubmitting: false });
      return false;
    }
  },

  handleDisconnect() {
    if (this.data.remoteAssistRole === 'admin' && this.data.remoteAssistSessionId) {
      this.onEndRemoteAssistSession();
      return;
    }
    this.stopBleAutoReconnect(false);
    this._bleReconnectStoppedByUser = true;
    this._activeBleDeviceId = '';
    this._stopBleLinkWatch();
    if (this.ble) {
      this.ble.stopScan();
      this.ble.disconnect(true);
    } else if (this.data.isConnected) {
      this.onBleDisconnected({ unexpected: false, device: this._lastBleDevice });
    }
  },

  // 新增：关闭蓝牙提示弹窗（带收缩退出动画）
  closeBluetoothAlert() {
    if (this.data.modalBtnDisabled) return; // 防误触：还在锁定中
    this.setData({ bluetoothAlertClosing: true });
    setTimeout(() => {
      this.setData({ 
        showBluetoothAlert: false,
        bluetoothAlertClosing: false
      });
    }, 420);
  },


  // 监听断开 (修改：增加 UI 反馈 + 自动重连)
  _startBleLinkWatch() {
    this._stopBleLinkWatch();
    this._f2LastBleRxAt = Date.now();
    this._bleLinkWatchTick = 0;
    this._tickBleLinkWatch();
    this._bleLinkWatchTimer = setInterval(() => {
      this._tickBleLinkWatch();
    }, 250);
  },

  _stopBleLinkWatch() {
    if (this._bleLinkWatchTimer) {
      clearInterval(this._bleLinkWatchTimer);
      this._bleLinkWatchTimer = null;
    }
  },

  _tickBleLinkWatch() {
    if (!this.data.isConnected) {
      this._stopBleLinkWatch();
      return;
    }
    const ble = this.ble;
    const deviceId = ble && ble.device && ble.device.deviceId;
    if (!deviceId) return;

    this._bleLinkWatchTick = (this._bleLinkWatchTick || 0) + 1;

    if (typeof wx.getBLEConnectionState === 'function') {
      wx.getBLEConnectionState({
        deviceId,
        success: (res) => {
          if (!res.connected) this._handleBleLinkLost('connection_state');
        },
        fail: () => {
          this._handleBleLinkLost('connection_state_fail');
        }
      });
    } else {
      wx.getConnectedBluetoothDevices({
        services: ble.serviceId ? [ble.serviceId] : ['0000FFF0-0000-1000-8000-00805F9B34FB'],
        success: (res) => {
          const list = (res && res.devices) || [];
          if (!list.some((d) => d.deviceId === deviceId)) {
            this._handleBleLinkLost('connected_list');
          }
        },
        fail: () => {
          this._handleBleLinkLost('connected_list_fail');
        }
      });
    }

    if (isF2MaxDelayPowerModel(this.data.currentModel) && this._f2LastBleRxAt) {
      const staleMs = Date.now() - this._f2LastBleRxAt;
      if (staleMs > 650) {
        wx.getBLEDeviceServices({
          deviceId,
          fail: () => {
            this._handleBleLinkLost('gatt_probe');
          }
        });
      }
    } else if (this._bleLinkWatchTick % 2 === 0) {
      wx.getBLEDeviceServices({
        deviceId,
        fail: () => {
          this._handleBleLinkLost('gatt_probe');
        }
      });
    }
  },

  _handleBleLinkLost(source) {
    if (this._bleLinkLostPending) return;
    if (!this.data.isConnected && !(this.ble && this.ble.device)) return;

    const dev = (this.ble && this.ble.device) || this._lastBleDevice;
    const deviceId = dev && dev.deviceId;
    if (!deviceId) return;

    const activeId = this._activeBleDeviceId || deviceId;
    if (deviceId !== activeId) return;

    this._bleLinkLostPending = true;
    const finishLost = () => {
      console.warn('[BLE] link lost:', source);

      if (this.ble) {
        this.ble._manualDisconnect = false;
        this.ble.device = null;
        this.ble.hasConnected = false;
      }
      this._activeBleDeviceId = '';
      wx.closeBLEConnection({ deviceId, complete: () => {} });
      this._stopBleLinkWatch();
      this.onBleDisconnected({ unexpected: true, device: dev, source });
      setTimeout(() => {
        this._bleLinkLostPending = false;
      }, 300);
    };

    if (this.ble && typeof this.ble.probeLinkAlive === 'function') {
      this.ble.probeLinkAlive(deviceId).then((alive) => {
        if (alive) {
          this._bleLinkLostPending = false;
          return;
        }
        finishLost();
      });
      return;
    }
    finishLost();
  },

  onBleDisconnected(meta) {
    const info = meta || {};
    if (this._isStaleBleDisconnect(info)) {
      console.log('[BLE] ignore stale disconnect', info.device && info.device.deviceId);
      return;
    }

    const unexpected = !!info.unexpected;
    if (info.device) this._lastBleDevice = info.device;
    this._activeBleDeviceId = '';

    this._voiceResumeAfterBle = !!this._voiceSessionWanted;
    if (this.data.voiceListening && this._voice) {
      try { this._voice.stop(); } catch (e) { /* ignore */ }
      this.setData(this._syncVoiceUiPatch({
        voiceListening: false,
        voiceHint: ''
      }));
    }

    this._teardownF2FaultBleListener();
    this._clearBleSendQueue();

    const shouldReconnect = unexpected && !this._bleReconnectStoppedByUser && this._lastBleDevice;

    this._applyBleLinkUi({
      isConnected: false,
      isConnecting: false,
      isScanning: false,
      showDisconnectTip: !unexpected && !this.data.isBleAutoReconnecting
    }, () => {
      this._scheduleRemoteStatePush();
      if (shouldReconnect) this._requestBleAutoReconnect('disconnected');
      else if (!this.data.isBleAutoReconnecting) {
        setTimeout(() => {
          this.setData({ showDisconnectTip: false });
        }, 1500);
      }
    });
  },

  // 🔴 检查指定设备是否有OTA连接记录（根据设备ID判断）
  async checkOtaConnection(deviceId) {
    try {
      // 🔴 管理员跳过 OTA 检查，直接放行
      if (this.data.isAdmin) {
        console.log('🔍 [checkOtaConnection] 管理员模式，跳过 OTA 校验');
        return true;
      }
      
      // 对于 F2 LONG 系列设备（F2 Max Long），无需强制OTA，直接放行
      const cur = this.data.currentModel || {};
      const isF2Long = cur.name === 'F2' && cur.type && cur.type.indexOf('Long') !== -1;
      if (isF2Long) {
        console.log('🔍 [checkOtaConnection] 当前为 F2 LONG 系列，跳过 OTA 校验');
        return true;
      }
      
      if (!deviceId) {
        console.warn('⚠️ [checkOtaConnection] 设备ID不存在');
        return false;
      }
      
      console.log('🔍 [checkOtaConnection] 检查设备ID:', deviceId);
      
      // 查询云端数据库：查找该设备是否有OTA记录
      const db = wx.cloud.database();
      const res = await db.collection('ota_connections')
        .where({ deviceId: deviceId })
        .get();
      
      console.log('🔍 [checkOtaConnection] 查询结果:', {
        deviceId: deviceId,
        count: res.data.length,
        records: res.data
      });
      
      // 如果有记录，返回true；否则返回false
      const hasRecord = res.data.length > 0;
      console.log('🔍 [checkOtaConnection] 设备是否有OTA记录:', hasRecord);
      return hasRecord;
    } catch (err) {
      console.error('❌ [checkOtaConnection] 检查失败:', err);
      // 如果查询失败，为了安全起见，返回false拒绝连接
      return false;
    }
  },

  // 🔴 显示需要OTA升级的提示（使用toast样式）
  showOtaRequiredTip() {
    // 如果已经在跳转中，直接返回，防止重复跳转
    if (this.data.isNavigatingToOta) {
      return;
    }
    
    // 设置跳转标记，防止重复点击
    this.setData({ isNavigatingToOta: true });
    
    // 显示提示（使用toast样式）
    this.setData({ showOtaTip: true });
    
    // 2.5秒后自动跳转到OTA页面
    setTimeout(() => {
      this.setData({ showOtaTip: false });
      wx.navigateTo({ 
        url: '/package-biz/pages/ota/ota',
        success: () => {
          // 跳转成功后，重置标记（在页面返回时会重新设置）
          console.log('✅ 已跳转到OTA页面');
        },
        fail: (err) => {
          console.error('跳转失败:', err);
          // 跳转失败时重置标记，允许重试
          this.setData({ isNavigatingToOta: false });
          this._showCustomToast('请先进行OTA升级', 'none');
        }
      });
    }, 2500);
  },

  // ===============================================
  // 页面交互
  // ===============================================
  onTouchStartMain(e) {
    if (this._isSwipeAnimating) return;
    if (e.changedTouches.length > 0) {
      if (this._scanPerfDebug) {
        this._scanPerf.moveEvents = 0;
        this._scanPerf.moveSetDataCostTotal = 0;
        this._scanPerf.moveSetDataCostMax = 0;
        this._scanPerf.moveLastLogAt = Date.now();
        console.log('[scan-perf] touchStart', {
          x: e.changedTouches[0].clientX,
          currentIndex: this.data.currentIndex
        });
      }
      this.setData({
        touchStartX: e.changedTouches[0].clientX,
        isDraggingModel: true,
        modelDragOffset: 0
      });
    }
  },

  // 🔴 新增：滑动过程中的跟手效果
  onTouchMoveMain(e) {
    if (this._isSwipeAnimating) return;
    if (!this.data.isDraggingModel) return;
    if (!e.touches || !e.touches.length) return;

    const touchCurrentX = e.touches[0].clientX;
    const startX = this.data.touchStartX;
    let diff = touchCurrentX - startX;

    const maxDrag = 250;
    if (diff > maxDrag) diff = maxDrag;
    if (diff < -maxDrag) diff = -maxDrag;

    const dragRatio = Math.min(1, Math.abs(diff) / maxDrag);
    let nextCardOffset = 85;
    let prevCardOffset = -85;
    let activeScale = 1.08;
    let nextModelScale = 0.86;
    let prevModelScale = 0.86;
    let activeCardOpacity = 1;
    let nextCardOpacity = 0.9;
    let prevCardOpacity = 0.9;
    if (diff < 0) {
      nextCardOffset = 85 - dragRatio * 85;
      activeScale = 1.08 - dragRatio * 0.2;
      nextModelScale = 0.86 + dragRatio * 0.2;
      activeCardOpacity = 1 - dragRatio * 0.34;
      nextCardOpacity = 0.86 + dragRatio * 0.14;
      prevCardOffset = -108;
      prevCardOpacity = 0;
    } else if (diff > 0) {
      prevCardOffset = -85 + dragRatio * 85;
      activeScale = 1.08 - dragRatio * 0.2;
      prevModelScale = 0.86 + dragRatio * 0.2;
      activeCardOpacity = 1 - dragRatio * 0.34;
      prevCardOpacity = 0.86 + dragRatio * 0.14;
      nextCardOffset = 108;
      nextCardOpacity = 0;
    }

    const setDataStart = Date.now();
    this.setData({
      modelDragOffset: diff,
      nextCardOffsetPercent: nextCardOffset,
      prevCardOffsetPercent: prevCardOffset,
      modelActiveScale: activeScale,
      modelSideScale: 0.86,
      nextModelScale,
      prevModelScale,
      activeCardOpacity,
      nextCardOpacity,
      prevCardOpacity
    }, () => {
      if (!this._scanPerfDebug) return;
      const cost = Date.now() - setDataStart;
      const perf = this._scanPerf;
      perf.moveEvents += 1;
      perf.moveSetDataCostTotal += cost;
      if (cost > perf.moveSetDataCostMax) perf.moveSetDataCostMax = cost;

      const now = Date.now();
      if (now - perf.moveLastLogAt >= 350) {
        const avg = perf.moveEvents ? (perf.moveSetDataCostTotal / perf.moveEvents).toFixed(2) : '0.00';
        console.log('[scan-perf] move window', {
          events: perf.moveEvents,
          avgSetDataCostMs: Number(avg),
          maxSetDataCostMs: perf.moveSetDataCostMax,
          dragOffset: diff,
          nextCardOffset: Number(nextCardOffset.toFixed(2)),
          prevCardOffset: Number(prevCardOffset.toFixed(2))
        });
        perf.moveEvents = 0;
        perf.moveSetDataCostTotal = 0;
        perf.moveSetDataCostMax = 0;
        perf.moveLastLogAt = now;
      }
    });
  },

  onTouchEnd(e) {
    if (this._isSwipeAnimating) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - this.data.touchStartX;
    const threshold = 80;

    const needSwipe = Math.abs(diff) >= threshold;
    const direction = diff > 0 ? 'prev' : 'next';
    const total = this.data.models.length;
    const canSwipe = direction === 'next'
      ? this.data.currentIndex < total - 1
      : this.data.currentIndex > 0;

    this.setData({ isDraggingModel: false });

    if (!needSwipe || !canSwipe) {
      this.setData({
        modelDragOffset: 0,
        nextCardOffsetPercent: 85,
        prevCardOffsetPercent: -85,
        modelActiveScale: 1.08,
        modelSideScale: 0.86,
        nextModelScale: 0.86,
        prevModelScale: 0.86,
        activeCardOpacity: 1,
        nextCardOpacity: 0.9,
        prevCardOpacity: 0.9
      });
      if (this._scanPerfDebug) {
        console.log('[scan-perf] touchEnd(no-swipe)', { diff, threshold });
      }
      return;
    }

    this._animateSwipeOutAndSwitch(direction);
    if (this._scanPerfDebug) {
      console.log('[scan-perf] touchEnd(swipe)', {
        diff,
        direction
      });
    }
  },

  _animateSwipeOutAndSwitch(direction) {
    if (this._isSwipeAnimating) return;
    this._isSwipeAnimating = true;

    const isNext = direction === 'next';
    this.setData({
      modelDragOffset: isNext ? -420 : 420,
      nextCardOffsetPercent: isNext ? 0 : 108,
      prevCardOffsetPercent: isNext ? -108 : 0,
      modelActiveScale: 0.82,
      nextModelScale: isNext ? 1.08 : 0.86,
      prevModelScale: isNext ? 0.86 : 1.08,
      activeCardOpacity: 0.06,
      nextCardOpacity: isNext ? 1 : 0,
      prevCardOpacity: isNext ? 0 : 1
    });

    setTimeout(() => {
      this.swipe(direction);
      this._isSwipeAnimating = false;
    }, 110);
  },

  // 详情页主层：右滑返回到卡片页（图二）
  onDetailSwipeStart(e) {
    if (!this.data.showDetail || this.data.detailMode !== 'main') return;
    if (!e.touches || !e.touches.length) return;
    const t = e.touches[0];
    this.setData({
      detailSwipeStartX: t.clientX,
      detailSwipeStartY: t.clientY,
      detailSwipeTracking: true
    });
  },

  onDetailSwipeMove(e) {
    if (!this.data.detailSwipeTracking) return;
    if (!this.data.showDetail || this.data.detailMode !== 'main') return;
    if (!e.touches || !e.touches.length) return;
    const t = e.touches[0];
    const dx = t.clientX - this.data.detailSwipeStartX;
    const dy = t.clientY - this.data.detailSwipeStartY;
    // 垂直滑动明显时，取消本次返回手势，避免与页面内部交互冲突
    if (Math.abs(dy) > 40 && Math.abs(dy) > Math.abs(dx)) {
      this.setData({ detailSwipeTracking: false });
    }
  },

  onDetailSwipeEnd(e) {
    if (!this.data.detailSwipeTracking) return;
    this.setData({ detailSwipeTracking: false });
    if (!this.data.showDetail || this.data.detailMode !== 'main') return;
    if (!e.changedTouches || !e.changedTouches.length) return;
    const t = e.changedTouches[0];
    const startX = this.data.detailSwipeStartX;
    const dx = t.clientX - this.data.detailSwipeStartX;
    const dy = t.clientY - this.data.detailSwipeStartY;
    // 左边缘优先：从屏幕最左侧轻扫时，降低触发阈值，更贴近系统返回手势
    const isEdgeSwipe = startX <= 28;
    const threshold = isEdgeSwipe ? 40 : 70;
    // 详情层支持左右横滑返回图二（你习惯左滑也可触发）
    if (Math.abs(dx) > threshold && Math.abs(dy) < 50) {
      this._closeDetailAnimated();
    }
  },

  swipe(direction) {
    let current = this.data.currentIndex;
    const total = this.data.models.length;
    if (direction === 'next') {
      if (current < total - 1) current = current + 1;
    } else {
      if (current > 0) current = current - 1;
    }
    this.updateCardStatus(current);
  },

  updateCardStatus(current) {
    const updateStart = Date.now();
    const total = this.data.models.length;
    const prevCurrent = this.data.currentIndex;
    const safeCurrent = Math.max(0, Math.min(total - 1, current));
    const getStatus = (index, cur) => {
      if (index === cur) return 'active';
      if (index === cur + 1 && cur + 1 < total) return 'next';
      if (index === cur - 1 && cur - 1 >= 0) return 'prev';
      return 'hidden';
    };

    const affected = new Set([prevCurrent, prevCurrent - 1, prevCurrent + 1, safeCurrent, safeCurrent - 1, safeCurrent + 1]);
    const patch = {
      currentIndex: safeCurrent,
      modelDragOffset: 0,
      nextCardOffsetPercent: 85,
      prevCardOffsetPercent: -85,
      modelActiveScale: 1.08,
      modelSideScale: 0.86,
      nextModelScale: 0.86,
      prevModelScale: 0.86,
      activeCardOpacity: 1,
      nextCardOpacity: 0.9,
      prevCardOpacity: 0.9
    };
    affected.forEach((idx) => {
      if (idx < 0 || idx >= total) return;
      patch[`models[${idx}].status`] = getStatus(idx, safeCurrent);
    });
    this.setData(patch, () => {
      if (!this._scanPerfDebug) return;
      console.log('[scan-perf] updateCardStatus', {
        from: prevCurrent,
        to: safeCurrent,
        affectedCount: Object.keys(patch).filter(k => k.startsWith('models[')).length,
        setDataCostMs: Date.now() - updateStart
      });
      this._refreshRemoteAssistCardFlags();
    });
  },

  onTapCard(e) {
    if (Date.now() < (this._controlTapLockUntil || 0)) return;
    const index = parseInt(e.currentTarget.dataset.index, 10);
    if (index !== this.data.currentIndex) {
      this.updateCardStatus(index);
    }
  },

  _openDetailAnimated(patch = {}) {
    const guardMs = 480;
    this._controlTapLockUntil = Date.now() + guardMs;
    if (this._detailEnterTimer) clearTimeout(this._detailEnterTimer);
    if (this._detailCloseTimer) clearTimeout(this._detailCloseTimer);
    if (this._detailBlockTimer) clearTimeout(this._detailBlockTimer);
    this.setData({
      detailEnterAnim: false,
      showDetail: true,
      detailMode: 'main',
      showStealthTutorial: false,
      f2ControlPanelOpen: false,
      detailOpenGuardUntil: Date.now() + guardMs,
      blockDetailTouch: true,
      ...patch,
      ...(patch.currentModel && this.data.isConnected
        ? this._resetF2HwMonitorState(true, patch.currentModel)
        : {})
    });
    wx.nextTick(() => {
      this._detailEnterTimer = setTimeout(() => {
        this._detailEnterTimer = null;
        if (this.data.showDetail) {
          this.setData({ detailEnterAnim: true });
        }
      }, 24);
    });
    this._detailBlockTimer = setTimeout(() => {
      this.setData({ blockDetailTouch: false });
      this._detailBlockTimer = null;
    }, guardMs);
    this._refreshRemoteAssistCardFlags();
    if (this.data.isAdmin) this._startRemoteAssistPendingPoll();
  },

  _closeDetailAnimated(extraPatch = {}) {
    const guardMs = 400;
    this._controlTapLockUntil = Date.now() + guardMs;
    if (this._detailEnterTimer) clearTimeout(this._detailEnterTimer);
    if (this._detailCloseTimer) clearTimeout(this._detailCloseTimer);
    this.setData({ detailEnterAnim: false, blockDetailTouch: false });
    this._detailCloseTimer = setTimeout(() => {
      this._detailCloseTimer = null;
      this.setData({
        showDetail: false,
        detailMode: 'main',
        f2ControlPanelOpen: false,
        ...extraPatch
      });
    }, guardMs);
  },

  openDetail(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    const currentModel = this.data.models[index];
    if (currentModel && currentModel.canLearn) {
      wx.navigateTo({ url: '/package-app/pages/can-learn/can-learn' });
      return;
    }
    this.updateCardStatus(index);
    const isF1 = currentModel && currentModel.name.includes('F1');
    this._openDetailAnimated({
      currentModel,
      angleBtnText: isF1 ? '180°' : '90°'
    });
  },

  // 🔴 计算导航栏高度（标准方法，适配所有机型）
  calcNavBarInfo() {
    try {
      const menuButton = wx.getMenuButtonBoundingClientRect();
      const windowInfo = wx.getWindowInfo();
      const statusBarHeight = windowInfo.statusBarHeight || 44;
      const gap = menuButton.top - statusBarHeight;
      const navBarHeight = (gap * 2) + menuButton.height;
      this.setData({ statusBarHeight, navBarHeight });
    } catch (e) {
      // 降级方案：使用默认值
      this.setData({ statusBarHeight: 44, navBarHeight: 44 });
    }
  },

  goBack() {
    if (this.data.showDetail) {
      if (this.data.detailMode === 'edit') {
        this.setData({ detailMode: 'main' });
      } else {
        this._closeDetailAnimated();
        // 断开连接可选
        // if (this.data.isConnected) this.ble.disconnect(); 
      }
    } else {
      const pageBack = require('../../../utils/pageBack.js');
      pageBack.popOrHub();
    }
  },

  onBackPress() {
    this.goBack();
    return true;
  },

  // ===============================================
  // 进入编辑模式 (入口分发)
  // ===============================================
  enterEdit(e) {
    if (Date.now() < (this._controlTapLockUntil || 0)) return;
    // 未连接且非远协技师时不可进入编辑
    if (!this._canControlDevice()) {
      // 显示"请先连接蓝牙"小胶囊提示
      this.setData({ showConnectBluetoothTip: true });
      // 2秒后自动隐藏
      setTimeout(() => {
        this.setData({ showConnectBluetoothTip: false });
      }, 2000);
      return;
    }
    
    const type = e.currentTarget.dataset.type;
    this.setData({ pendingEditType: type });

    if (type === 'fold') {
      // 管理员无需输入密码，直接放行（并顺带标记授权，避免后续重复判断）
      if (this.data.isAdmin) {
        if (!this.data.isAuthorized) {
          this.setData({ isAuthorized: true });
        }
        this.showTutorial('fold');
      } else if (!this.data.isAuthorized) {
        // 普通用户：密码 -> 教程 -> 界面
        this.openPasswordModal();
      } else {
        this.showTutorial('fold');
      }
    } else if (type === 'open') {
      // 打开角度：直接初始化（避免重复 setData 触发双重层切换导致闪屏）
      this.initOpenMode();
    }
  },

  showTutorial(type) {
    // 如果密码弹窗还在显示，先关闭它（带退出动画）
    if (this.data.showPasswordModal) {
      this.setData({ passwordModalClosing: true });
      setTimeout(() => {
        this.setData({ 
          showPasswordModal: false,
          passwordModalClosing: false,
          showTutorialModal: true
        });
        this.startTutorialLoop(type);
        this.startTutorialCountdown();
      }, 420);
    } else {
      this.setData({
        showTutorialModal: true
      });
      this.startTutorialLoop(type);
      this.startTutorialCountdown();
    }
  },

  // ===============================================
  // 密码逻辑
  // ===============================================
  onPasswordInput(e) {
    this.setData({ passwordInput: e.detail.value });
  },

  confirmPassword() {
    if (this.data.passwordBtnLocked) return; // 🔴 倒计时锁定中

    if (this.data.passwordInput === '1234') {
      this.setData({ 
        isAuthorized: true, // 授权成功，下次不用密码
        passwordModalClosing: true 
      });
      // 密码正确后，等待退出动画完成再进入折叠教程
      setTimeout(() => {
        this.setData({ 
          showPasswordModal: false,
          passwordModalClosing: false
        });
        this.showTutorial('fold');
      }, 420);
    } else {
      this._showCustomToast('密码错误', 'none');
      this.setData({ passwordInput: '' });
    }
  },

  cancelPassword() {
    this.setData({ passwordModalClosing: true });
    setTimeout(() => {
      this.setData({ 
        showPasswordModal: false,
        passwordModalClosing: false
      });
    }, 420);
  },

  // ===============================================
  // 教程动画循环 (红环)
  // ===============================================
  startTutorialLoop(type) {
    this.stopTutorialLoop();

    let startState, endState;

    if (type === 'fold') {
      // 折叠：灯亮 -> 按下 -> 灯灭
      startState = { light: true, text: '点击车把按键\n使指示灯灭' };
      endState = { light: false, text: '指示灯灭' };
    } else {
      // 打开：灯灭 -> 按下 -> 灯亮
      startState = { light: false, text: '点击车把按键\n使指示灯亮' };
      endState = { light: true, text: '指示灯亮' };
    }

    // 第一帧
    this.setData({
      animLightOn: startState.light,
      animIsPressing: false,
      animText: startState.text
    });

    const loop = () => {
      // 1. 等待1秒
      const timer1 = setTimeout(() => {
        this.setData({ animIsPressing: true }); // 模拟按下

        // 2. 按下0.3秒后变化
        const timer2 = setTimeout(() => {
          this.setData({
            animLightOn: endState.light,
            animText: endState.text,
            animIsPressing: false
          });

          // 3. 保持结果 2秒
          const timer3 = setTimeout(() => {
            // 重置
            this.setData({
              animLightOn: startState.light,
              animText: startState.text
            });
            // 4. 重置后等待1秒循环
            const timer4 = setTimeout(loop, 1000);
            this.data.tutorialTimer = timer4;
          }, 2000);
          this.data.tutorialTimer = timer3;

        }, 300);
        this.data.tutorialTimer = timer2;

      }, 1000);
      this.data.tutorialTimer = timer1;
    };

    loop();
  },

  stopTutorialLoop() {
    if (this.data.tutorialTimer) {
      clearTimeout(this.data.tutorialTimer);
      this.data.tutorialTimer = null;
    }
  },

  // 教程确认按钮（带收缩退出动画）
  finishTutorial() {
    if (this.data.tutorialBtnLocked) return; // 🔴 倒计时锁定中

    this.stopTutorialLoop();
    const type = this.data.pendingEditType || 'fold';
    this.setData({ tutorialModalClosing: true });
    setTimeout(() => {
      this.setData({
        showTutorialModal: false,
        detailMode: 'edit',
        editType: type,
        tutorialModalClosing: false
      });

      // 🔴 如果是折叠模式，启动上滑提示动画
      if (type === 'fold') {
        this.startFoldInlineHint();
      }
    }, 420);

    // 教程结束后，如果是"打开角度"，初始化新的刻度模式
    if (type === 'open') {
      this.initOpenMode();
    }
  },

  // ===============================================
  // 完成设置 & 关钥匙动画
  // ===============================================
  // ===============================================
  // 完成设置 & 关钥匙动画 (修改：循环播放)
  // ===============================================
  exitEdit() {
    this.stopOpenAngleTutorialLoop();
    if (this._foldFineTuneHintTimer) {
      clearTimeout(this._foldFineTuneHintTimer);
      this._foldFineTuneHintTimer = null;
    }
    // 打开角度场景：直接退出编辑，避免“关钥匙倒计时弹窗”导致卡住感
    if (this.data.editType === 'open') {
      if (this.data.keyLoopTimer) {
        clearTimeout(this.data.keyLoopTimer);
      }
      this.setData({
        showKeyModal: false,
        keyModalClosing: false,
        keyBtnLocked: false,
        showFoldFineTuneHint: false,
        showAngleHint: false,
        showOpenAngleSendingModal: false,
        openAngleSendingModalClosing: false,
        openAngleSendingBtnDisabled: true,
        detailMode: 'main'
      });
      this._openAngleFullSwipeTimes = [];
      return;
    }

    // 折叠场景保持原有流程：完成设置 -> 关钥匙提示
    this.setData({ showKeyModal: true, showFoldFineTuneHint: false });
    this.startKeyAnimLoop();
    this.startKeyCountdown();
  },

  startKeyAnimLoop() {
    // 清除旧定时器
    if (this.data.keyLoopTimer) clearTimeout(this.data.keyLoopTimer);

    const loop = () => {
      // 1. 关钥匙 (红 -> 灰)
      this.setData({ keyAnimState: 'red' });
      
      // 1秒后变灰
      this.data.keyLoopTimer = setTimeout(() => {
        this.setData({ keyAnimState: 'grey' });
        
        // 再过1秒，重置为红，开始下一次循环
        this.data.keyLoopTimer = setTimeout(() => {
          loop();
        }, 1500); // 灰状态停留1.5秒
        
      }, 1000); // 红状态停留1秒
    };

    loop();
  },

  confirmKeyOff() {
    if (this.data.keyBtnLocked) return; // 🔴 倒计时锁定中

    // 停止循环
    if (this.data.keyLoopTimer) clearTimeout(this.data.keyLoopTimer);
    this.setData({ keyModalClosing: true });
    setTimeout(() => {
      this.setData({ 
        showKeyModal: false, 
        detailMode: 'main',
        keyModalClosing: false
      });
    }, 420);
  },

  // ===============================================
  // 打开角度：新刻度 & 棍子控制逻辑
  // ===============================================

  // 初始化打开角度模式
  // ===============================================
  // 初始化打开角度模式 (强制每次都弹窗)
  // ===============================================
  initOpenMode() {
    const model = this.data.currentModel || {};
    const isF1 = model.name && model.name.includes('F1');
    const isF2MaxSeries = isF2MaxSeriesModel(model);
    
    // F1系列上限180，F2系列上限170
    this.maxAngle = isF1 ? 180 : 170;
    
    // 生成刻度数据
    const count = (this.maxAngle - 0) / 2 + 1;
    const ticks = new Array(Math.floor(count)).fill(0);
    
    // 🔴 修复：一次性设置所有状态，并确保 transition 为 'none'，防止残留动画
    // 这样棍子会立即显示为 0 度（水平状态），不会有从之前状态跳转的动画
    this.setData({
      detailMode: 'edit',
      editType: 'open',
      // 清理折叠页提示/滑块残留状态，避免切到打开角度时短暂露出上一页元素
      showFoldInlineHint: false,
      showFoldFineTuneHint: false,
      foldHintOffset: 0,
      adjustSlideOffset: 0,
      adjustSlideActive: false,
      isAdjustDemo: false,
      foldDemoPlaying: false,
      ticks: ticks,
      statusText: '点击180度或90度同步画面',
      openAngleUiActive: false,
      currentAngle: 0,
      angleMode: '', // 保持为空，让棍子显示为 0 度（水平状态）
      angleRotation: 180, 
      activeIndex: 0,
      translateX: 0,
      transition: 'none' // 🔴 关键：禁用动画，防止残留的 transition 导致闪烁
    });
    this._openAngleFullSwipeTimes = [];
    
    // 修改：F1 系列 & F2 MAX 系列【每次】进入都弹出打开角度引导弹窗
    if (isF1 || isF2MaxSeries) {
       this.setData({ showAngleHint: true });
       this.startOpenAngleTutorialLoop();
       // 🔴 启动倒计时
       this.startAngleHintCountdown();
    } else {
       this.setData({ showAngleHint: false });
    }
  },

  // ===============================================
  // 切换预设角度 (F2 点击160跳转，但能滑到170)
  // ===============================================
  switchAngle(e) {
    if (!this._canControlDevice()) {
      this._showCustomToast('未连接蓝牙', 'none', 2000);
      return;
    }
    
    const angle = parseInt(e.currentTarget.dataset.angle);
    
    // 默认目标就是点击的角度
    let targetDeg = angle;

    // 特殊逻辑：如果是 F2机型 (maxAngle=170)，点击的是 160 按钮
    // 此时目标是 160，而不是 maxAngle(170)
    // 已经在 wxml 传参 data-angle="160" 了，所以这里直接用 angle 即可

    this.data.openAngleUiActive = true;
    this.setData({
      statusText: '已校准',
      angleMode: angle.toString(),
      openAngleUiActive: true
    });

    const currentModel = this.data.currentModel;
    const presetCmd = openAnglePresetBleCommand(currentModel, angle);
    if (presetCmd && this._canControlDevice()) {
      if (usesF2StyleOpenAngleBle(currentModel)) {
        console.log(`📤 [蓝牙] 打开角度预设 ${angle}° → "${presetCmd}" x2`);
        this.sendDataMultiple(presetCmd, 2, 500);
      } else {
        console.log(`📤 [蓝牙] 打开角度预设 ${angle}° → "${presetCmd}"`);
        this.sendData(presetCmd);
      }
    }

    // 跳转到目标角度
    this.updateRuler(targetDeg, true);
    wx.vibrateShort({ type: 'light' });
  },

  // ===============================================
  // 更新标尺与视图 (修复 Bug：确保传递正确角度给按钮逻辑)
  // ===============================================
  updateRuler(deg, animate) {
    if (deg < 0) deg = 0;
    if (deg > this.maxAngle) deg = this.maxAngle;

    // 计算波轮位置
    const index = deg / 2;
    const trans = -(index * this.tickWidthPx);
    this._rulerTranslateX = trans;

    // 棍子视觉：F2 按 UI 显示角度算夹角（90° 预设 → 两棍夹角 90°）
    const visualRot = openAngleStickRotateDeg(this.data.currentModel, deg);

    this.setData({
      currentAngle: deg,
      activeIndex: Math.round(index),
      translateX: trans,
      transition: animate ? 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none',
      angleRotation: visualRot
    });
    
    // 关键修复：将当前的真实角度 (deg) 传给按钮判断逻辑
    // 之前可能传了 visualRot 导致逻辑反了
    this.updateAngleText(deg);
  },

  // ===============================================
  // 触摸交互核心修复 (物理驱动动画)
  // ===============================================

  _openAngleRulerMinTranslate() {
    const maxIdx = (this.maxAngle || 180) / 2;
    return -(maxIdx * this.tickWidthPx);
  },

  _clampOpenAngleTranslate(trans) {
    const minT = this._openAngleRulerMinTranslate();
    if (trans > 0) return 0;
    if (trans < minT) return minT;
    return trans;
  },

  // ===============================================
  // 触摸开始
  // ===============================================
  onTouchStart(e) {
    const touchX = e.touches[0].clientX;
    this._rulerLastTouchX = touchX;
    this._rulerTranslateX = this.data.translateX || 0;

    const startIndex = Math.round(-this._rulerTranslateX / this.tickWidthPx);
    this.lastVibrateIndex = startIndex;
    this._rulerGestureStartIndex = startIndex;
    this._rulerGestureEndIndex = startIndex;
    this._rulerGestureMinIndex = startIndex - OPEN_ANGLE_TICKS_PER_GESTURE;
    this._rulerGestureMaxIndex = startIndex + OPEN_ANGLE_TICKS_PER_GESTURE;
  },

  // ===============================================
  // 触摸移动：增量跟手；单次手势最多 ±3 格；无需先点预设也可发蓝牙
  // 从右往左拨 = 角度增大；从左往右拨 = 角度减小
  // ===============================================
  onTouchMove(e) {
    const touchX = e.touches[0].clientX;
    if (this._rulerLastTouchX == null) {
      this.onTouchStart(e);
      return;
    }

    const delta = (touchX - this._rulerLastTouchX) * OPEN_ANGLE_RULER_SENSITIVITY;
    this._rulerLastTouchX = touchX;

    if (Math.abs(delta) < 0.5) return;

    let newTranslateX = this._clampOpenAngleTranslate(this._rulerTranslateX + delta);

    let rawIndex = Math.round(-newTranslateX / this.tickWidthPx);
    if (this._rulerGestureMinIndex != null && this._rulerGestureMaxIndex != null) {
      if (rawIndex < this._rulerGestureMinIndex) rawIndex = this._rulerGestureMinIndex;
      if (rawIndex > this._rulerGestureMaxIndex) rawIndex = this._rulerGestureMaxIndex;
      newTranslateX = -rawIndex * this.tickWidthPx;
    }

    this._rulerTranslateX = newTranslateX;

    this.setData({
      translateX: newTranslateX,
      transition: 'none'
    });

    if (rawIndex === this.lastVibrateIndex) return;

    wx.vibrateShort({ type: 'light' });

    const currentModel = this.data.currentModel;
    const isOpenMode = this.data.editType === 'open';
    const canSend = this._canControlDevice();
    const slideCmds = openAngleSlideBleCommands(currentModel);

    if (slideCmds && isOpenMode && canSend) {
      // 从右往左（index 增大）= 调大；从左往右 = 调小（与原先映射相反）
      if (rawIndex > this.lastVibrateIndex) {
        const step = rawIndex - this.lastVibrateIndex;
        console.log(`📤 [蓝牙] 角度增大 ${step} 格 → "${slideCmds.decrease}" x${step}`);
        this._enqueueBleSendBurst(slideCmds.decrease, step, BLE_ANGLE_STEP_GAP_MS);
      } else {
        const step = this.lastVibrateIndex - rawIndex;
        console.log(`📤 [蓝牙] 角度减小 ${step} 格 → "${slideCmds.increase}" x${step}`);
        this._enqueueBleSendBurst(slideCmds.increase, step, BLE_ANGLE_STEP_GAP_MS);
      }
    }

    this.lastVibrateIndex = rawIndex;
    this._rulerGestureEndIndex = rawIndex;

    if (this.data.editType !== 'open') return;

    // 未点预设：波轮可动、可发蓝牙，但棍子/数字 UI 不更新
    if (!this.data.openAngleUiActive) return;

    let rawAngle = (-newTranslateX / this.tickWidthPx) * 2;
    if (rawAngle < 0) rawAngle = 0;
    if (rawAngle > this.maxAngle) rawAngle = this.maxAngle;
    const displayAngle = Math.round(rawAngle);

    this.setData({
      currentAngle: displayAngle,
      activeIndex: Math.round(rawAngle / 2)
    });
    this.updateAngleText(displayAngle);
  },

  onRulerTouchEnd() {
    if (this.data.editType !== 'open') return;
    this._rulerLastTouchX = null;
    this._rulerGestureMinIndex = null;
    this._rulerGestureMaxIndex = null;
    const startIndex = this._rulerGestureStartIndex;
    const endIndex = this._rulerGestureEndIndex != null
      ? this._rulerGestureEndIndex
      : Math.round(-(this.data.translateX || 0) / this.tickWidthPx);
    if (startIndex == null) return;
    const tickMoved = Math.abs(endIndex - startIndex);
    if (tickMoved >= OPEN_ANGLE_TICKS_PER_GESTURE) {
      this._recordOpenAngleFullSwipe();
    }
    this._rulerGestureStartIndex = null;
    this._rulerGestureEndIndex = null;
  },

  _recordOpenAngleFullSwipe() {
    const now = Date.now();
    if (!this._openAngleFullSwipeTimes) this._openAngleFullSwipeTimes = [];
    this._openAngleFullSwipeTimes.push(now);
    this._openAngleFullSwipeTimes = this._openAngleFullSwipeTimes.filter(
      (t) => now - t <= OPEN_ANGLE_RAPID_SWIPE_WINDOW_MS
    );
    if (this._openAngleFullSwipeTimes.length >= 2) {
      this._openAngleFullSwipeTimes = [];
      this._showOpenAngleSendingModal();
    }
  },

  _showOpenAngleSendingModal() {
    if (this._openAngleSendHintTimer) {
      clearTimeout(this._openAngleSendHintTimer);
      this._openAngleSendHintTimer = null;
    }
    this.setData({ showOpenAngleSendHint: true });
    this._openAngleSendHintTimer = setTimeout(() => {
      this._openAngleSendHintTimer = null;
      this.setData({ showOpenAngleSendHint: false });
    }, 2200);
  },

  closeOpenAngleSendingModal() {
    if (this._openAngleSendHintTimer) {
      clearTimeout(this._openAngleSendHintTimer);
      this._openAngleSendHintTimer = null;
    }
    this.setData({ showOpenAngleSendHint: false });
  },

  _onBleSendQueueIdle() {
    // 打开角度发送提示为非阻塞 UI，无需等待队列空闲
  },

  // ===============================================
  // 3. 微调逻辑 (核心修正)
  // ===============================================
  handleAdjust(e) {
    if (!this._canControlDevice()) {
      this._showCustomToast('未连接蓝牙', 'none', 2000);
      return;
    }
    
    const action = e.currentTarget.dataset.action; 
    const editType = this.data.editType || (this.data.detailMode === 'edit' ? this.data.editType : 'open');

    wx.vibrateShort({ type: 'light' });

    // --- A. 折叠模式 (保持不变) ---
    if (editType === 'fold' || e.currentTarget.dataset.mode === 'fold') {
      let gap = this.data.foldGap;
      const step = 2; 

      // 🔴 F1/F2 PRO/MAX：折叠模式时发送对应数据
      const currentModel = this.data.currentModel;
      const isF1 = currentModel && currentModel.name && currentModel.name.includes('F1');
      const isF2 = currentModel && currentModel.name && currentModel.name.includes('F2');
      const isF1OrF2 = isF1 || isF2;
      
      // 调试日志
      console.log('🔍 [调试] 折叠模式按钮:', {
        action,
        editType,
        isF1,
        isF2,
        isF1OrF2,
        isConnected: this.data.isConnected,
        modelName: currentModel?.name
      });
      
      if (action === 'left' || action === 'fine-tune-up') {
        gap += step;
        if (isF1OrF2 && this._canControlDevice()) {
          console.log('📤 [蓝牙] 发送"调大"');
          this.sendData('调大');
        }
      } else if (action === 'right' || action === 'fine-tune-down') {
        gap -= step;
        if (isF1OrF2 && this._canControlDevice()) {
          console.log('📤 [蓝牙] 发送"调小"');
          this.sendData('调小');
        }
      } else if (action === 'adjust') {
        // 🔴 调整按钮：发送"调整折叠角度"
        console.log('🔍 [调试] 调整按钮被点击', {
          isF1,
          isF2,
          isF1OrF2,
          isConnected: this.data.isConnected,
          modelName: currentModel?.name
        });
        if (isF1OrF2) {
          if (this._shouldSkipIndicatorModal()) {
            console.log('📤 [远协] 发送"调整折叠角度"');
            this.sendDataMultiple('调整折叠角度', 2, 500);
          } else if (this._canControlDevice()) {
            this.setData({
              showIndicatorCheckModal: true,
              indicatorCheckModalClosing: false,
              pendingSendData: {
                type: 'adjust',
                sendText: '调整折叠角度'
              }
            });
            console.log('🔍 [蓝牙] 准备发送"调整折叠角度"，等待用户确认');
          } else {
            console.log('❌ [蓝牙] 未连接，无法发送"调整折叠角度"');
            this._showCustomToast('蓝牙未连接', 'none', 2000);
          }
        } else {
          console.log('❌ [调试] 不是 F1/F2 机型，不发送');
          this._showCustomToast('当前机型不支持', 'none', 2000);
        }
      } else if (action === 'zero') {
        gap = 20;
        // 🔴 归零按钮：发送"初始化角度"
        console.log('🔍 [调试] 归零按钮被点击', {
          isF1,
          isF2,
          isF1OrF2,
          isConnected: this.data.isConnected,
          isAdmin: this.data.isAdmin,
          modelName: currentModel?.name
        });
        if (isF1OrF2) {
          if (this._canControlDevice()) {
            // 🔴 按你的要求：归零也发送 2 次，间隔 0.5 秒
            console.log('📤 [蓝牙] 发送"初始化角度"（连续2次，间隔0.5秒）');
            this.sendDataMultiple('初始化角度', 2, 500);
          } else {
            console.log('❌ [蓝牙] 未连接，无法发送"初始化角度"');
            this._showCustomToast('蓝牙未连接', 'none', 2000);
          }
        } else {
          console.log('❌ [调试] 不是 F1/F2 机型，不发送');
          this._showCustomToast('当前机型不支持', 'none', 2000);
        }
        // 🔴 点击归零后，重置滑动状态（带 snap 回弹动画）
        this.resetAdjustSlider(false);
      } 

      if (gap < 0) gap = 0;
      if (gap > 400) gap = 400;

      this.setData({ foldGap: gap });
      return;
    }

    // --- B. 打开模式 (90~270 左侧区域) ---
    let currentRot = this.data.angleRotation;
    let newRot = currentRot;
    const degStep = 3; 

    // 左键: 增加角度 (往左/上抬) -> 逐渐靠近 180 (90度预设)
    if (action === 'fine-tune-down') {
      newRot += degStep;
    } 
    // 右键: 减小角度 (往右/下放) -> 逐渐靠近 90 (180度预设)
    else if (action === 'fine-tune-up') {
      newRot -= degStep;
    }

    // 范围限制
    if (newRot < 90) newRot = 90;
    if (newRot > 270) newRot = 270;

    // 将 CSS 旋转角度转换为实际角度
    const actualAngle = 180 - newRot;

    this.setData({ angleRotation: newRot });
    
    // 关键：每次微调都检查一次角度，决定哪个按钮亮
    // 传入实际角度，而不是 CSS 旋转角度
    this.updateAngleText(actualAngle); 
  },

  // ===============================================
  // 实时更新按钮状态 (修改：只有刚好90/180/160才亮)
  // ===============================================
  updateAngleText(currentAngle) {
    if (!this.data.openAngleUiActive) return;

    const isF1 = this.data.currentModel && this.data.currentModel.name.includes('F1');
    let activeMode = '';

    const tolerance = 2;

    if (Math.abs(currentAngle - 90) <= tolerance) {
      activeMode = '90';
    } else {
      if (isF1) {
        if (Math.abs(currentAngle - 180) <= tolerance) activeMode = '180';
      } else {
        if (Math.abs(currentAngle - 160) <= tolerance) activeMode = '160';
      }
    }

    if (this.data.angleMode !== activeMode) {
      this.setData({ angleMode: activeMode });
    }
  },


  // 关闭第一个提示（180度提示）
  dismissHint() {
    if (this.data.angleHintBtnLocked) return; // 🔴 倒计时锁定中
    this.stopOpenAngleTutorialLoop();
    this.setData({ showAngleHint: false }); 

    // ==========================================
    // 【接力逻辑】如果机型是 F1PRO/MAX，紧接着显示第二个弹窗
    // 🔴 修改：只弹一次，使用本地存储记录
    // ==========================================
    const currentModel = this.data.currentModel;
    const currentName = currentModel.name || '';
    const currentType = currentModel.type || '';
    
    // 判断是否包含 F1PRO 或 F1MAX (转大写比较更稳妥)
    const nameUpper = currentName.toUpperCase();
    const typeUpper = currentType.toUpperCase();
    
    if (nameUpper.includes('F1') && (typeUpper.includes('PRO') || typeUpper.includes('MAX'))) {
      // 🔴 检查本地存储，如果已经弹过就不弹了
      const hasShown = wx.getStorageSync('hasShownNewProductHint_F1');
      if (!hasShown) {
        // 延迟 200ms 让第一个弹窗消失动画播完，再弹第二个
        setTimeout(() => {
          this.openNewProductHint();
        }, 200);
      }
    }
  },

  // ===============================================
  // 打开角度教程动画循环（灰色 -> 点击 -> 红色亮起）
  // ===============================================
  startOpenAngleTutorialLoop() {
    this.stopOpenAngleTutorialLoop();

    // 打开角度：灰色 -> 按下 -> 红色亮起
    const startState = { light: false, text: '点击车把按键\n使指示灯亮' };
    const endState = { light: true, text: '指示灯亮' };

    // 第一帧：灰色状态
    this.setData({
      openAngleAnimLightOn: startState.light,
      openAngleAnimIsPressing: false,
      openAngleAnimText: startState.text
    });

    const loop = () => {
      // 1. 等待1秒
      const timer1 = setTimeout(() => {
        this.setData({ openAngleAnimIsPressing: true }); // 模拟按下

        // 2. 按下0.3秒后变化
        const timer2 = setTimeout(() => {
          this.setData({
            openAngleAnimLightOn: endState.light,
            openAngleAnimText: endState.text,
            openAngleAnimIsPressing: false
          });

          // 3. 保持结果 2秒
          const timer3 = setTimeout(() => {
            // 重置
            this.setData({
              openAngleAnimLightOn: startState.light,
              openAngleAnimText: startState.text
            });
            // 4. 重置后等待1秒循环
            const timer4 = setTimeout(loop, 1000);
            this.data.openAngleTutorialTimer = timer4;
          }, 2000);
          this.data.openAngleTutorialTimer = timer3;

        }, 300);
        this.data.openAngleTutorialTimer = timer2;

      }, 1000);
      this.data.openAngleTutorialTimer = timer1;
    };

    loop();
  },

  stopOpenAngleTutorialLoop() {
    if (this.data.openAngleTutorialTimer) {
      clearTimeout(this.data.openAngleTutorialTimer);
      this.data.openAngleTutorialTimer = null;
    }
  },

  // ===============================================
  // 打开角度页面：切换指示灯状态
  // ===============================================
  toggleOpenAngleLight() {
    // 停止动画循环，避免干扰用户操作
    this.stopOpenAngleTutorialLoop();
    
    const newState = !this.data.openAngleLightOn;
    this.setData({
      openAngleLightOn: newState,
      // 同时更新动画状态，确保视觉一致
      openAngleAnimLightOn: newState,
      openAngleAnimText: newState ? '指示灯已亮' : '点击使指示灯亮'
    });
    // 添加震动反馈
    wx.vibrateShort({ type: 'light' });
  },

  // ===============================================
  // 🔴 自动校准功能
  // ===============================================
  handleAutoCalibrate() {
    if (Date.now() < (this._controlTapLockUntil || 0)) return;
    // 🔴 检查蓝牙连接状态：未连接时不允许使用（管理员除外）
    if (!this._canControlDevice()) {
      // 显示"请先连接蓝牙"小胶囊提示
      this.setData({ showConnectBluetoothTip: true });
      // 2秒后自动隐藏
      setTimeout(() => {
        this.setData({ showConnectBluetoothTip: false });
      }, 2000);
      return;
    }
    
    const currentModel = this.data.currentModel;
    const isF2 = currentModel && currentModel.name && currentModel.name.includes('F2');
    const isF1ProMax = isF1UltraModel(currentModel);

    // F2 MAX 系列 & F1 Ultra 可点击
    if (!isF2 && !isF1ProMax) return;

    if (!this._isBleWriteReady() && !this._canControlDevice()) {
      this._showCustomToast('蓝牙初始化中，请稍候', 'none', 2000);
      return;
    }
    
    console.log('📤 [蓝牙] 发送"自动调平"');
    this.sendDataMultiple('自动调平', 2, 500);
    
    // 🔴 显示校准中弹窗，并禁用按钮
    this.setData({ 
      showCalibratingModal: true,
      calibratingBtnDisabled: true
    });
    
    // 3秒后启用按钮
    setTimeout(() => {
      this.setData({ calibratingBtnDisabled: false });
    }, 3000);
  },
  
  // 🔴 关闭校准弹窗（带收缩退出动画）
  closeCalibratingModal() {
    // 如果按钮禁用，不允许关闭
    if (this.data.calibratingBtnDisabled) {
      return;
    }
    
    this.setData({ calibratingModalClosing: true });
    setTimeout(() => {
      this.setData({ 
        showCalibratingModal: false,
        calibratingModalClosing: false,
        calibratingBtnDisabled: true // 重置按钮状态
      });
    }, 420);
  },
  
  // 🔴 阻止背景滚动（空函数，用于 catchtouchmove）
  preventMove() {
    return false;
  },
  noop() {},

  onCanLearnNumLedsInput(e) {
    const raw = e.detail.value;
    this.setData({ canLearnNumLeds: raw });
    if (String(raw).trim() === '' || !Number.isFinite(Number(raw))) return;
    saveStoredNumLeds(raw);
  },

  onCanLearnNumLedsBlur() {
    const n = saveStoredNumLeds(this.data.canLearnNumLeds);
    this.setData({ canLearnNumLeds: String(n) });
  },


  // ===============================================
  // 新增：高级设置交互逻辑
  // ===============================================

  // F2 ULTRA 蓝牙远程控制 + 语音（仅打开/关闭）
  _buildVoiceUiState(listening, hearing, hint) {
    if (listening && hearing) {
      return {
        voiceStatusClass: 'speaking',
        voiceStatusText: hint || '识别中…'
      };
    }
    if (listening) {
      return {
        voiceStatusClass: 'quiet',
        voiceStatusText: hint || '正在聆听…'
      };
    }
    return {
      voiceStatusClass: 'dormant',
      voiceStatusText: '点击开启语音控制'
    };
  },

  _syncVoiceUiPatch(extra = {}) {
    const listening = extra.voiceListening !== undefined
      ? extra.voiceListening
      : this.data.voiceListening;
    const hearing = extra.voiceHearing !== undefined
      ? extra.voiceHearing
      : this.data.voiceHearing;
    const hint = extra.voiceHint !== undefined
      ? extra.voiceHint
      : this.data.voiceHint;
    return {
      ...extra,
      ...this._buildVoiceUiState(listening, hearing, hint)
    };
  },

  initVoiceRecognizer() {
    this._voiceSessionWanted = false;
    this._voiceResumeAfterBle = false;
    this._voiceHintLastAt = 0;
    this._voice = createVoiceRecognizer({
      onStart: () => {
        this.setData(this._syncVoiceUiPatch({
          voiceListening: true,
          voiceHint: '说 打开 / 关闭 / 开 / 关',
          voiceHearing: false
        }));
      },
      onRecognize: (res) => {
        if (!res || !res.result) return;
        const now = Date.now();
        if (this._voiceHearTimer) clearTimeout(this._voiceHearTimer);
        const patch = { voiceHearing: true };
        if (!this._voiceHintLastAt || now - this._voiceHintLastAt > 280) {
          this._voiceHintLastAt = now;
          const raw = res.result;
          const hint = raw.length > 14 ? `…${raw.slice(-14)}` : raw;
          const nextHint = hint ? `识别：${hint}` : '聆听中…';
          if (nextHint !== this.data.voiceHint) {
            patch.voiceHint = nextHint;
          }
        }
        this.setData(this._syncVoiceUiPatch(patch));
        this._voiceHearTimer = setTimeout(() => {
          this._voiceHearTimer = null;
          if (this.data.voiceListening && this.data.voiceHearing) {
            this.setData(this._syncVoiceUiPatch({ voiceHearing: false }));
          }
        }, 1200);
      },
      onCommand: (cmd, text, source) => {
        this._sendF2VoiceCommand(cmd, { continuous: true, source, text });
      },
      onStop: () => {
        if (this._voiceSessionWanted) {
          this.setData(this._syncVoiceUiPatch({ voiceHint: '说 打开 / 关闭 / 开 / 关' }));
        }
      },
      onError: (res, meta) => {
        if (!meta || !meta.sessionActive || !this._voiceSessionWanted) {
          this._resetVoiceUi();
          const msg = (res && (res.msg || res.errMsg)) || '语音识别失败';
          this._showCustomToast(msg, 'none', 2000);
          return;
        }
        this.setData(this._syncVoiceUiPatch({ voiceHint: '重新聆听中…' }));
      }
    });
  },

  _resetVoiceUi() {
    if (this._voiceHearTimer) {
      clearTimeout(this._voiceHearTimer);
      this._voiceHearTimer = null;
    }
    this._voiceSessionWanted = false;
    this.setData(this._syncVoiceUiPatch({
      voiceListening: false,
      voiceHint: '',
      voiceLastCmd: '',
      voiceHearing: false
    }));
  },

  _setFlapPanelStateOptimistic(cmd) {
    if (!isF2UltraModel(this.data.currentModel)) return;
    if (cmd === '打开') {
      this.setData({ flapPanelState: 'moving', flapPanelStateText: '打开中' });
    } else if (cmd === '关闭') {
      this.setData({ flapPanelState: 'moving', flapPanelStateText: '关闭中' });
    }
  },

  _resetFlapPanelState() {
    this.setData({
      flapPanelState: 'unknown',
      flapPanelStateText: '状态未知'
    });
  },

  _stopVoiceRecognizer() {
    this._voiceSessionWanted = false;
    if (this._voice && this._voice.supported) {
      try {
        this._voice.stop();
      } catch (e) {
        // ignore
      }
    }
    this._resetVoiceUi();
  },

  _sendF2VoiceCommand(cmd, options = {}) {
    const { continuous = false, source = 'final', text = '' } = options;
    console.log(`📤 [语音${source}] F2 ULTRA 发送"${cmd}"`, text);

    if (continuous) {
      this._voiceHintLastAt = Date.now();
      this.setData(this._syncVoiceUiPatch({
        voiceLastCmd: cmd,
        voiceHint: `已执行：${cmd}`
      }));
    } else {
      this._showCustomToast(`已识别：${cmd}`, 'success', 1200);
    }

    if (!this.data.isConnected) return;
    this._setFlapPanelStateOptimistic(cmd);
    this.sendData(cmd);
    wx.vibrateShort({ type: 'light' });
  },

  _resumeVoiceAfterBleReconnect() {
    if (!this._voiceResumeAfterBle) return;
    if (!this._voice || !this._voice.supported) {
      this._voiceResumeAfterBle = false;
      return;
    }
    this._voiceResumeAfterBle = false;
    this._voiceSessionWanted = true;
    setTimeout(() => {
      if (!this.data.isConnected || !this._voiceSessionWanted) return;
      try {
        this._voice.start({ continuous: true, duration: 60000 });
        this.setData(this._syncVoiceUiPatch({
          voiceListening: true,
          voiceHint: '说 打开 / 关闭 / 开 / 关',
          voiceHearing: false
        }));
      } catch (e) {
        console.warn('[语音] 重连后恢复聆听失败', e);
      }
    }, 200);
  },

  handleVoiceControl() {
    if (Date.now() < (this._controlTapLockUntil || 0)) return;
    if (this._f2DemoActive) {
      this._showCustomToast('演示进行中，请先停止', 'none', 1800);
      return;
    }

    const model = this.data.currentModel;
    if (!isF2UltraModel(model)) {
      return;
    }
    if (!this._canControlDevice()) {
      this.setData({ showConnectBluetoothTip: true });
      setTimeout(() => this.setData({ showConnectBluetoothTip: false }), 2000);
      return;
    }
    if (!this._voice || !this._voice.supported) {
      this._showCustomToast('语音插件未就绪，请在小程序后台添加同声传译插件', 'none', 2500);
      return;
    }

    if (this.data.voiceListening) {
      this._stopVoiceRecognizer();
      return;
    }

    const startVoice = () => {
      this._voiceSessionWanted = true;
      wx.vibrateShort({ type: 'light' });
      this._voice.start({ continuous: true, duration: 60000 });
    };

    wx.getSetting({
      success: (res) => {
        const auth = res.authSetting || {};
        if (auth['scope.record']) {
          startVoice();
          return;
        }
        wx.authorize({
          scope: 'scope.record',
          success: startVoice,
          fail: () => {
            wx.showModal({
              title: '需要麦克风权限',
              content: '请允许使用麦克风，以便语音控制翻板',
              confirmText: '去设置',
              success: (r) => {
                if (r.confirm) wx.openSetting();
              }
            });
          }
        });
      },
      fail: startVoice
    });
  },

  toggleF2ControlPanel() {
    const nextOpen = !this.data.f2ControlPanelOpen;
    this.setData({ f2ControlPanelOpen: nextOpen }, () => {
      if (nextOpen && isF2UltraModel(this.data.currentModel)) {
        setTimeout(() => this._measureF2SpeedSlider(), 120);
      }
    });
  },

  handleF2RemoteControl(e) {
    if (Date.now() < (this._controlTapLockUntil || 0)) return;
    if (this._f2DemoActive) {
      this._showCustomToast('演示进行中，请先停止', 'none', 1800);
      return;
    }
    const cmd = e.currentTarget.dataset.cmd;
    if (!cmd) return;

    const model = this.data.currentModel;
    if (!isF2UltraModel(model)) {
      return;
    }
    if (!this._canControlDevice()) {
      this.setData({ showConnectBluetoothTip: true });
      setTimeout(() => this.setData({ showConnectBluetoothTip: false }), 2000);
      return;
    }
    if ((cmd === '打开' || cmd === '关闭') && this.data.flapPanelState === 'stealth') {
      this._showCustomToast('隐蔽模式中，请先退出', 'none', 2000);
      return;
    }

    console.log(`📤 [蓝牙] F2 ULTRA 远程控制发送"${cmd}"`);
    if (cmd === '打开' || cmd === '关闭') {
      this._setFlapPanelStateOptimistic(cmd);
    }
    this.sendDataMultiple(cmd, 2, 500);
    wx.vibrateShort({ type: 'light' });
  },

  openF2DemoModal() {
    if (!isF2UltraModel(this.data.currentModel)) return;
    if (!this._canControlDevice()) {
      this.setData({ showConnectBluetoothTip: true });
      setTimeout(() => this.setData({ showConnectBluetoothTip: false }), 2000);
      return;
    }
    this.setData({
      showF2DemoModal: true,
      f2DemoRunning: false,
      f2DemoStatusText: ''
    });
  },

  closeF2DemoModal() {
    if (this._f2DemoActive) return;
    this.setData({ showF2DemoModal: false });
  },

  startF2DemoMode() {
    if (!isF2UltraModel(this.data.currentModel) || !this._canControlDevice()) return;
    this._stopVoiceRecognizer();
    this._f2DemoActive = true;
    this._f2DemoAwaitStable = null;
    this.setData({
      f2DemoRunning: true,
      f2DemoStatusText: '演示进行中，翻板将自动循环开关…'
    });
    const state = this.data.flapPanelState;
    const firstCmd = state === 'open' ? '关闭' : '打开';
    this._sendF2DemoCommand(firstCmd);
    const target = firstCmd === '打开' ? 'open' : 'closed';
    if (state === target) {
      this._onF2DemoFlapStable(state);
    }
  },

  stopF2DemoMode() {
    this._stopF2DemoMode(true);
  },

  _stopF2DemoMode(homeFold) {
    const wasActive = this._f2DemoActive;
    this._f2DemoActive = false;
    this._f2DemoAwaitStable = null;
    this.setData({
      showF2DemoModal: false,
      f2DemoRunning: false,
      f2DemoStatusText: ''
    });
    if (homeFold && wasActive && this.data.isConnected && isF2UltraModel(this.data.currentModel)) {
      this._setFlapPanelStateOptimistic('关闭');
      this.sendDataMultiple('关闭', 2, 500);
      wx.vibrateShort({ type: 'light' });
    }
  },

  _sendF2DemoCommand(cmd) {
    if (!this._f2DemoActive || !this.data.isConnected) return;
    this._f2DemoAwaitStable = cmd === '打开' ? 'open' : 'closed';
    this._setFlapPanelStateOptimistic(cmd);
    this.sendDataMultiple(cmd, 2, 500);
    this.setData({
      f2DemoStatusText: cmd === '打开' ? '正在打开…' : '正在关闭…'
    });
  },

  _onF2DemoFlapStable(state) {
    if (!this._f2DemoActive) return;
    if (state === 'stealth') {
      this._stopF2DemoMode(true);
      return;
    }
    if (state !== 'open' && state !== 'closed') return;
    if (!this._f2DemoAwaitStable || state !== this._f2DemoAwaitStable) return;
    const nextCmd = state === 'open' ? '关闭' : '打开';
    this._f2DemoAwaitStable = null;
    this._sendF2DemoCommand(nextCmd);
  },

  _measureF2SpeedSlider() {
    const query = wx.createSelectorQuery().in(this);
    query.select('#f2SpeedSliderTrack').boundingClientRect((rect) => {
      if (rect && rect.width) {
        this.setData({
          f2SpeedSliderWidth: rect.width,
          f2SpeedSliderLeft: rect.left
        });
      }
    }).exec();
  },

  onF2ServoSpeedTouchStart(e) {
    if (Date.now() < (this._controlTapLockUntil || 0)) return;
    this._f2SpeedDragFrom = this.data.f2ServoSpeed;
    this.onF2ServoSpeedTouch(e);
  },

  onF2ServoSpeedTouch(e) {
    if (Date.now() < (this._controlTapLockUntil || 0)) return;
    const touchX = e.touches[0].clientX;
    const { f2SpeedSliderWidth, f2SpeedSliderLeft } = this.data;
    if (!f2SpeedSliderWidth) {
      this._measureF2SpeedSlider();
      return;
    }
    const v = f2ServoSpeedFromTouchX(touchX, f2SpeedSliderLeft, f2SpeedSliderWidth);
    if (v == null || v === this.data.f2ServoSpeed) return;
    this.setData(buildF2ServoSpeedUi(v));
    if (v % 5 === 0) {
      wx.vibrateShort({ type: 'light' });
    }
  },

  onF2ServoSpeedTouchEnd(e) {
    if (Date.now() < (this._controlTapLockUntil || 0)) return;
    const touch = e.changedTouches && e.changedTouches[0];
    const { f2SpeedSliderWidth, f2SpeedSliderLeft } = this.data;
    let v = this.data.f2ServoSpeed;
    if (touch && f2SpeedSliderWidth) {
      const fromTouch = f2ServoSpeedFromTouchX(touch.clientX, f2SpeedSliderLeft, f2SpeedSliderWidth);
      if (fromTouch != null) {
        v = fromTouch;
        this.setData(buildF2ServoSpeedUi(v));
      }
    }
    if (v === this._f2SpeedDragFrom) return;
    this._commitF2ServoSpeed(v);
  },

  _applyF2ServoSpeed(rawValue) {
    const model = this.data.currentModel;
    if (!isF2UltraModel(model)) return;

    const v = Math.min(100, Math.max(10, Math.round(Number(rawValue))));
    if (!Number.isFinite(v)) return;
    if (v === this.data.f2ServoSpeed) return;

    this.setData(buildF2ServoSpeedUi(v));
    this._commitF2ServoSpeed(v);
  },

  _commitF2ServoSpeed(v) {
    const model = this.data.currentModel;
    if (!isF2UltraModel(model)) return;

    const speed = Math.min(100, Math.max(10, Math.round(Number(v))));
    if (!Number.isFinite(speed)) return;

    try {
      wx.setStorageSync('f2_servo_speed', speed);
    } catch (err) { /* ignore */ }

    if (!this._canControlDevice()) {
      this.setData({ showConnectBluetoothTip: true });
      setTimeout(() => this.setData({ showConnectBluetoothTip: false }), 2000);
      return;
    }

    console.log(`📤 [蓝牙] F2 ULTRA 调速 ${speed}%`);
    this.sendDataMultiple(`调速${speed}`, 2, 400);
    wx.vibrateShort({ type: 'light' });
  },

  // 打开设置弹窗
  openSettings() {
    if (Date.now() < (this._controlTapLockUntil || 0)) return;
    // 🔴 检查蓝牙连接状态：未连接时不允许使用（管理员除外）
    if (!this._canControlDevice()) {
      // 显示"请先连接蓝牙"小胶囊提示
      this.setData({ showConnectBluetoothTip: true });
      // 2秒后自动隐藏
      setTimeout(() => {
        this.setData({ showConnectBluetoothTip: false });
      }, 2000);
      return;
    }
    
    // 权限校验：只有 Max 机型可以打开
    // F1 Max: 可以打开，但部分功能隐藏
    // F2 Max: 可以打开，全功能
    // F2 Max Long: 可以打开，全功能
    const model = this.data.currentModel;
    if (!model || !isMaxControlLayoutType(model.type)) {
      return; // Pro 机型点击无效
    }

    const storedMinutes = wx.getStorageSync('f2_delayPowerOffMinutes');
    let delayPowerOffIndex = this.data.delayPowerOffIndex;
    if (!this.data.isConnected) {
      if (Number.isFinite(Number(storedMinutes))) {
        delayPowerOffIndex = f2DelayPowerOffIndexByMinutes(Number(storedMinutes));
      } else {
        const storedIdx = wx.getStorageSync('f2_delayPowerOffIndex');
        if (Number.isFinite(Number(storedIdx))) {
          delayPowerOffIndex = Math.min(Number(storedIdx), F2_DELAY_POWER_OFF_OPTIONS.length - 1);
        }
      }
    }

    // 🔴 重置指示灯弹窗标记，每次打开高级设置都重置
    this.setData({
      showSettingsModal: true,
      hasShownSettingsIndicatorModal: false,
      delayPowerOffIndex
    });
    this.showToast();
  },

  onDelayPowerOffChange(e) {
    if (this.data.f2TravelModeOn) {
      this._showCustomToast('出行模式已开启，请先关闭出行模式', 'none', 2200);
      return;
    }
    const model = this.data.currentModel;
    if (!isF2MaxDelayPowerModel(model)) return;
    if (!this._canControlDevice()) {
      this.setData({ showConnectBluetoothTip: true });
      setTimeout(() => this.setData({ showConnectBluetoothTip: false }), 2000);
      return;
    }

    const idx = Number(e.detail.value);
    const opt = this.data.delayPowerOffOptions[idx];
    if (!opt) return;

    const sendText = `延时断电${opt.minutes}`;
    console.log(`📤 [蓝牙] F2 ULTRA 设置延时断电: ${sendText}`);
    this.sendDataMultiple(sendText, 2, 500);
    wx.setStorageSync('f2_delayPowerOffIndex', idx);
    wx.setStorageSync('f2_delayPowerOffMinutes', opt.minutes);
    this.setData({ delayPowerOffIndex: idx });
    wx.vibrateShort({ type: 'light' });
  },

  closeSettings() {
    this.setData({ showSettingsModal: false });
    // 关闭时清除 Toast
    this.setData({ toastClass: '' });
  },

  // 🔴 新增：确认发送数据（指示灯确认弹窗）
  confirmSendData() {
    if (!this.data.pendingSendData) {
      console.warn('⚠️ [蓝牙] 没有待发送的数据');
      return;
    }

    const { type, sendText } = this.data.pendingSendData;
    const currentModel = this.data.currentModel;
    const isF2Ble = isF2MaxLikeControl(currentModel);
    
    // 关闭弹窗
    this.setData({ 
      showIndicatorCheckModal: false,
      indicatorCheckModalClosing: true
    });

    // 延迟一下再发送，让弹窗关闭动画完成
    setTimeout(() => {
      this.setData({ 
        indicatorCheckModalClosing: false,
        pendingSendData: null
      });

      // 发送数据
      if (type === 'adjust') {
        // 调整按钮：发送2次，间隔0.5秒
        console.log(`📤 [蓝牙] 发送"${sendText}"（连续2次，间隔0.5秒）`);
        this.sendDataMultiple(sendText, 2, 500);
      } else if (type === 'settings') {
        // 高级设置：发送3次，间隔0.5秒
        const modelName = isF2Ble
          ? (isF1UltraModel(currentModel)
            ? 'F1 ULTRA'
            : (currentModel.type === 'Ultra'
              ? 'F2 ULTRA'
              : (isF2LongType(currentModel.type) ? 'F2 Long' : 'F2 MAX')))
          : 'F1 MAX';
        console.log(`📤 [蓝牙] ${modelName} 发送"${sendText}"（连续3次，间隔0.5秒）`);
        this.sendDataMultiple(sendText, 3, 500);
      }
    }, 300);
  },

  // Toast 动画控制
  showToast() {
    // 重置动画
    this.setData({ toastClass: '' }, () => {
      setTimeout(() => {
        this.setData({ toastClass: 'pop' });
      }, 300);
      
      // 3.5秒后自动消失
      setTimeout(() => {
        this.setData({ toastClass: '' });
      }, 3800);
    });
  },

  // ===============================================
  // 修复：滑块点击逻辑 (点左去左，点右去右)
  // ===============================================
  handleMagClick(e) {
    const key = e.currentTarget.dataset.key;
    // 获取用户点的是左边还是右边 (通过 wxml data-val 传入)
    // 注意：使用 e.target 因为点击的是子元素 click-pad
    const targetVal = e.target.dataset.val;

    // 如果没点到热区，或者没有 targetVal，则忽略
    if (!targetVal) return;

    let newState = { ...this.data.settingState };
    newState[key] = targetVal;

    const currentModel = this.data.currentModel;
    const isF2Ble = isF2MaxSeriesModel(currentModel);
    const isF2Ultra = isF2UltraModel(currentModel);
    const isF1Max = currentModel &&
                    currentModel.name && currentModel.name.includes('F1') &&
                    currentModel.type === 'Max';

    this.setData({ settingState: newState });
    if (isF2Ultra) {
      try {
        wx.setStorageSync('f2_ultra_adv_settingState', newState);
      } catch (e) { /* ignore */ }
    }

    // 🔴 F2 MAX / ULTRA：高级配置发送对应数据
    if (isF2Ble && this._canControlDevice()) {
      let sendText = '';
      
      if (key === 'faultDetect') {
        // 主动故障检测
        if (targetVal === 'left') {
          sendText = '开启自检';
        } else if (targetVal === 'right') {
          sendText = '关闭自检';
        }
      } else if (key === 'powerOn') {
        // 开机位置
        if (targetVal === 'left') {
          sendText = '开机上翻';
        } else if (targetVal === 'right') {
          sendText = '开机下翻';
        }
      } else if (key === 'shutdown') {
        // 关机位置
        if (targetVal === 'left') {
          sendText = '打开收回';
        } else if (targetVal === 'right') {
          sendText = '关闭收回';
        }
      } else if (key === 'travelMode' && isF2Ultra) {
        if (targetVal === 'left') {
          sendText = '关闭出行';
        } else if (targetVal === 'right') {
          sendText = '开启出行';
        }
      } else if (key === 'smoothMode' && isF2Ultra) {
        if (targetVal === 'left') {
          sendText = '开启平滑';
        } else if (targetVal === 'right') {
          sendText = '关闭平滑';
        }
      }
      
      if (sendText) {
        if (!this.data.hasShownSettingsIndicatorModal && !this._shouldSkipIndicatorModal()) {
          this.setData({
            showIndicatorCheckModal: true,
            indicatorCheckModalClosing: false,
            hasShownSettingsIndicatorModal: true,
            pendingSendData: {
              type: 'settings',
              sendText: sendText,
              key: key,
              targetVal: targetVal
            }
          });
          console.log(`🔍 [蓝牙] 准备发送"${sendText}"，等待用户确认`);
        } else {
          const label = isF2Ultra ? 'F2 ULTRA' : 'F2 MAX';
          console.log(`📤 [蓝牙] ${label} 发送"${sendText}"（连续3次，间隔0.5秒）`);
          this.sendDataMultiple(sendText, 3, 500);
        }
      }
    }
    
    // 🔴 F1 MAX：高级配置发送对应数据
    if (isF1Max && this._canControlDevice()) {
      let sendText = '';
      
      if (key === 'powerOn') {
        // 开机位置
        if (targetVal === 'left') {
          sendText = '开机上翻';
        } else if (targetVal === 'right') {
          sendText = '开机下翻';
        }
      } else if (key === 'shutdown') {
        // 关机位置
        if (targetVal === 'left') {
          sendText = '打开收回'; // 用户要求"收回"=打开收回
        } else if (targetVal === 'right') {
          sendText = '关闭收回'; // 用户要求"保持"=关闭收回
        }
      }
      
      if (sendText) {
        if (!this.data.hasShownSettingsIndicatorModal && !this._shouldSkipIndicatorModal()) {
          this.setData({
            showIndicatorCheckModal: true,
            indicatorCheckModalClosing: false,
            hasShownSettingsIndicatorModal: true,
            pendingSendData: {
              type: 'settings',
              sendText: sendText,
              key: key,
              targetVal: targetVal
            }
          });
          console.log(`🔍 [蓝牙] 准备发送"${sendText}"，等待用户确认`);
        } else {
          console.log(`📤 [蓝牙] F1 MAX 发送"${sendText}"（连续3次，间隔0.5秒）`);
          this.sendDataMultiple(sendText, 3, 500);
        }
      }
    }
    
    // 震动反馈
    wx.vibrateShort({ type: 'light' });
    console.log(`Setting ${key} set to: ${targetVal}`);
  },

  // 【新增】打开全新产品提示 & 开始倒计时
  openNewProductHint() {
    this.setData({ 
      showNewProductHint: true,
      newProductBtnLocked: true,
      newProductBtnText: '知道了 (2s)'
    });

    let timeLeft = 2;
    const timer = setInterval(() => {
      timeLeft--;
      if (timeLeft > 0) {
        this.setData({ newProductBtnText: `知道了 (${timeLeft}s)` });
      } else {
        clearInterval(timer);
        this.setData({ 
          newProductBtnLocked: false,
          newProductBtnText: '知道了'
        });
      }
    }, 1000);
  },

  // 【新增】关闭全新产品提示
  closeNewProductHint() {
    if (this.data.newProductBtnLocked) return; // 锁定中不可点
    this.setData({ showNewProductHint: false });
    // 🔴 记录到本地存储，表示已经弹过，下次不再弹
    wx.setStorageSync('hasShownNewProductHint_F1', true);
  },

  // ===============================================
  // 🔴 所有弹窗的倒计时函数
  // ===============================================

  // 密码弹窗倒计时
  openPasswordModal() {
    // 兜底：管理员不弹密码，直接进入教程
    if (this.data.isAdmin) {
      if (!this.data.isAuthorized) {
        this.setData({ isAuthorized: true });
      }
      this.showTutorial('fold');
      return;
    }

    this.setData({ 
      showPasswordModal: true, 
      passwordInput: '',
      passwordBtnLocked: true,
      passwordBtnText: '确认 (2s)'
    });
    
    let timeLeft = 2;
    const timer = setInterval(() => {
      timeLeft--;
      if (timeLeft > 0) {
        this.setData({ passwordBtnText: `确认 (${timeLeft}s)` });
      } else {
        clearInterval(timer);
        this.setData({ 
          passwordBtnLocked: false,
          passwordBtnText: '确认'
        });
      }
    }, 1000);
  },

  // 教程弹窗倒计时
  startTutorialCountdown() {
    this.setData({ 
      tutorialBtnLocked: true,
      tutorialBtnText: '知道了 (2s)'
    });
    
    let timeLeft = 2;
    const timer = setInterval(() => {
      timeLeft--;
      if (timeLeft > 0) {
        this.setData({ tutorialBtnText: `知道了 (${timeLeft}s)` });
      } else {
        clearInterval(timer);
        this.setData({ 
          tutorialBtnLocked: false,
          tutorialBtnText: '知道了'
        });
      }
    }, 1000);
  },

  // 关钥匙弹窗倒计时
  startKeyCountdown() {
    this.setData({ 
      keyBtnLocked: true,
      keyBtnText: '确认 (2s)'
    });
    
    let timeLeft = 2;
    const timer = setInterval(() => {
      timeLeft--;
      if (timeLeft > 0) {
        this.setData({ keyBtnText: `确认 (${timeLeft}s)` });
      } else {
        clearInterval(timer);
        this.setData({ 
          keyBtnLocked: false,
          keyBtnText: '确认'
        });
      }
    }, 1000);
  },

  // 打开角度提示弹窗倒计时
  startAngleHintCountdown() {
    this.setData({ 
      angleHintBtnLocked: true,
      angleHintBtnText: '知道了 (2s)'
    });
    
    let timeLeft = 2;
    const timer = setInterval(() => {
      timeLeft--;
      if (timeLeft > 0) {
        this.setData({ angleHintBtnText: `知道了 (${timeLeft}s)` });
      } else {
        clearInterval(timer);
        this.setData({ 
          angleHintBtnLocked: false,
          angleHintBtnText: '知道了'
        });
      }
    }, 1000);
  },

  // ===============================================
  // 🔴 折叠页上滑提示动画
  // ===============================================
  
  startFoldInlineHint() {
    if (this._foldFineTuneHintTimer) {
      clearTimeout(this._foldFineTuneHintTimer);
      this._foldFineTuneHintTimer = null;
    }

    // 开始播放自动演示：提示 + 调整按钮自动上滑
    // 播放期间只锁定"调整"这个滑块，页面其它区域仍可点击
    this.setData({
      showFoldInlineHint: true,
      foldDemoPlaying: true,
      isAdjustDemo: true,        // 开启演示模式 → 有过渡动画
      adjustSlideOffset: 0,
      adjustSlideActive: false,
      foldHintOffset: 0,
      showFoldFineTuneHint: false
    });

    // 1）短暂展示提示后立刻演示上滑（原 2s 偏久，改为约 0.65s）
    setTimeout(() => {
      // 2）让"调整"按钮自动上滑到锁定位置，露出下面的"归零"
      this.setData({
        adjustSlideOffset: -80,   // 与手动锁定高度一致，行程略短更顺畅
        adjustSlideActive: true,
        foldHintOffset: -50       // 提示条也一起往上提一些，让文字和箭头跟着"调整"走
      });

      // 3）再停留约 2.5 秒，然后按钮回到底部、提示淡出、解除锁定
      setTimeout(() => {
        // 先让按钮带动画落回到底部
        this.resetAdjustSlider(true);

        // 同时淡出提示 & 关闭演示模式
        this.setData({
          showFoldInlineHint: false,
          foldDemoPlaying: false,
          foldHintOffset: 0
        });

        // 4）演示完全结束后再出现第二段提示（在「调整」按钮行上方），带入场动画
        setTimeout(() => {
          this.setData({ showFoldFineTuneHint: true });

          // 5）补充提示显示 3 秒后自动消失
          this._foldFineTuneHintTimer = setTimeout(() => {
            this.setData({ showFoldFineTuneHint: false });
            this._foldFineTuneHintTimer = null;
          }, 3000);
        }, 400);
      }, 2500);
    }, 650);
  },

  // ===============================================
  // 🔴 调整按钮滑动逻辑
  // ===============================================
  
  // 滑动开始
  onAdjustSlideStart(e) {
    // 只在折叠模式下生效
    if (this.data.editType !== 'fold') return;

    this.setData({
      adjustTouchStartY: e.touches[0].clientY,
      adjustHasMoved: false // 标记是否发生了滑动
    });
  },

  // 滑动移动
  onAdjustSlideMove(e) {
    // 只在折叠模式下生效
    if (this.data.editType !== 'fold') return;

    const currentY = e.touches[0].clientY;
    const startY = this.data.adjustTouchStartY;
    let moveY = currentY - startY;

    // 标记已发生滑动（移动超过 5px 才算滑动）
    if (Math.abs(moveY) > 5) {
      this.setData({ adjustHasMoved: true });
    }

    // 1. 只有往上滑才生效 (moveY < 0)
    // 如果往下滑，强制归0
    if (moveY > 0) moveY = 0;

    // 2. 限制最大上滑距离 (比如 120px)
    if (moveY < -120) moveY = -120;

    // 3. 激活阈值：滑过 -60px 就显示归零
    const isActive = moveY < -60;

    this.setData({
      adjustSlideOffset: moveY,
      adjustSlideActive: isActive
    });
  },

  // 滑动结束
  onAdjustSlideEnd(e) {
    // 只在折叠模式下生效
    if (this.data.editType !== 'fold') return;
    
    const currentOffset = this.data.adjustSlideOffset;
    const hasMoved = this.data.adjustHasMoved;
    
    // 如果没滑动（只是点击），不处理，让点击事件触发
    if (!hasMoved) {
      this.setData({ adjustHasMoved: false });
      return;
    }
    
    // 锁定阈值：松手时，如果滑过了 -60px，就停在空中显示归零
    const lockThreshold = -60;
    const lockPosition = -100; // 停在 -100px 的高度

    if (currentOffset < lockThreshold) {
      // 停住，显示归零（带 snap 动画）
      this.setData({
        adjustSnap: true,
        adjustSlideOffset: lockPosition,
        adjustSlideActive: true
      });
      
      // 动画结束后关闭 snap 类
      setTimeout(() => {
        this.setData({ adjustSnap: false });
      }, 200);
    } else {
      // 没滑到位，弹回去（带 snap 动画）
      this.setData({
        adjustSnap: true,
        adjustSlideOffset: 0,
        adjustSlideActive: false
      });
    
      // 动画结束后关闭 snap 类
    setTimeout(() => {
      this.setData({ adjustSnap: false });
      }, 200);
    }

    // 重置滑动标记
    this.setData({ adjustHasMoved: false });
  },

  // 🔴 调整按钮点击事件（当没有滑动时触发）
  onAdjustClick(e) {
    // 只在折叠模式下生效
    if (this.data.editType !== 'fold') return;
    
    // 如果发生了滑动，不触发点击
    if (this.data.adjustHasMoved) {
      return;
    }
    
    // 🔴 直接调用 handleAdjust，发送"调整折叠角度"
    this.handleAdjust({ currentTarget: { dataset: { action: 'adjust', mode: 'fold' } } });
  },

  // 重置滑动状态（点击归零后调用）
  resetAdjustSlider(fromDemo = false) {
    if (fromDemo) {
      // 🔴 从演示模式回落：保持 isAdjustDemo 类，让动画平滑
    this.setData({
      adjustSlideOffset: 0,
      adjustSlideActive: false
    });

      // 等动画结束后再关闭 demo class，避免中途卡顿
      setTimeout(() => {
        this.setData({ isAdjustDemo: false });
      }, 300);
    } else {
      // 🔴 从手动上滑/点击归零回落：启用 snap 类（快速回弹）
    this.setData({
        adjustSnap: true,
      adjustSlideOffset: 0,
        adjustSlideActive: false
    });

      // 动画结束后关闭 snap 类
    setTimeout(() => {
        this.setData({ adjustSnap: false });
      }, 200); // snap 动画是 0.18s
    }
  },

  // ===============================================
  // 蓝牙发送数据方法（基于你提供的逻辑）
  // ===============================================
  
  // 字符串转ArrayBuffer（UTF-8编码）
  stringToArrayBuffer(str) {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      const charCode = str.charCodeAt(i);
      if (charCode < 0x80) {
        bytes.push(charCode);
      } else if (charCode < 0x800) {
        bytes.push(0xc0 | (charCode >> 6));
        bytes.push(0x80 | (charCode & 0x3f));
      } else if (charCode < 0xd800 || charCode >= 0xe000) {
        bytes.push(0xe0 | (charCode >> 12));
        bytes.push(0x80 | ((charCode >> 6) & 0x3f));
        bytes.push(0x80 | (charCode & 0x3f));
      } else {
        i++;
        const charCode2 = str.charCodeAt(i);
        const codePoint = 0x10000 + (((charCode & 0x3ff) << 10) | (charCode2 & 0x3ff));
        bytes.push(0xf0 | (codePoint >> 18));
        bytes.push(0x80 | ((codePoint >> 12) & 0x3f));
        bytes.push(0x80 | ((codePoint >> 6) & 0x3f));
        bytes.push(0x80 | (codePoint & 0x3f));
      }
    }
    return new Uint8Array(bytes).buffer;
  },

  _getBleWriteCharacteristicId() {
    const ble = this.ble;
    if (!ble) return '';
    return ble.characteristicId2 || ble.characteristicId || '';
  },

  _isBleWriteReady() {
    const ble = this.ble;
    if (!ble || !ble.device || !ble.serviceId) return false;
    if (!this.data.isConnected && this.data.remoteAssistRole === 'user') return false;
    return !!this._getBleWriteCharacteristicId();
  },

  writeBleDataPromise(arrayBuffer) {
    const ble = this.ble;
    const charId = this._getBleWriteCharacteristicId();
    if (!ble || !ble.device || !ble.serviceId || !charId) {
      return Promise.resolve(false);
    }
    return new Promise((resolve) => {
      wx.writeBLECharacteristicValue({
        deviceId: ble.device.deviceId,
        serviceId: ble.serviceId,
        characteristicId: charId,
        value: arrayBuffer,
        success: () => resolve(true),
        fail: (err) => {
          console.log('❌ [蓝牙] 发送失败:', err.errMsg);
          resolve(false);
        }
      });
    });
  },

  _clearBleSendQueue() {
    this._bleSendQueue = [];
    this._bleSendDraining = false;
    this._onBleSendQueueIdle();
  },

  _enqueueBleSend(text, gapAfterMs = BLE_SEND_GAP_MS) {
    if (!text) return;
    if (!this._bleSendQueue) this._bleSendQueue = [];
    this._bleSendQueue.push({ text, gapAfterMs });
    this._drainBleSendQueue();
  },

  _enqueueBleSendBurst(text, count, gapAfterMs = BLE_ANGLE_STEP_GAP_MS) {
    const n = Math.max(0, Math.min(8, Number(count) || 0));
    for (let i = 0; i < n; i++) {
      this._enqueueBleSend(text, gapAfterMs);
    }
  },

  _drainBleSendQueue() {
    if (this._bleSendDraining) return;
    if (!this._bleSendQueue || !this._bleSendQueue.length) return;

    const runNext = () => {
      if (!this._bleSendQueue || !this._bleSendQueue.length) {
        this._bleSendDraining = false;
        this._onBleSendQueueIdle();
        return;
      }
      if (!this._isBleWriteReady()) {
        this._clearBleSendQueue();
        return;
      }
      const item = this._bleSendQueue.shift();
      const arrayBuffer = this.stringToArrayBuffer(item.text);
      this.writeBleDataPromise(arrayBuffer).then((ok) => {
        if (!ok) {
          this._clearBleSendQueue();
          return;
        }
        if (this._bleSendQueue.length) {
          setTimeout(runNext, item.gapAfterMs || BLE_SEND_GAP_MS);
        } else {
          this._bleSendDraining = false;
          this._onBleSendQueueIdle();
        }
      });
    };

    this._bleSendDraining = true;
    runNext();
  },

  // 核心发送方法
  writeBleData(arrayBuffer) {
    if (!this._isBleWriteReady()) {
      console.log('❌ [蓝牙] 设备未连接或特征值未找到');
      return false;
    }
    const ble = this.ble;
    wx.writeBLECharacteristicValue({
      deviceId: ble.device.deviceId,
      serviceId: ble.serviceId,
      characteristicId: this._getBleWriteCharacteristicId(),
      value: arrayBuffer,
      success: (res) => {
        console.log('✅ [蓝牙] 发送成功:', res.errMsg);
      },
      fail: (err) => {
        console.log('❌ [蓝牙] 发送失败:', err.errMsg);
        this._handleBleLinkLost('write_fail');
      }
    });
    return true;
  },

  // 发送字符串数据（经队列串行写出，避免 BLE 连发粘包）
  sendData(text, gapAfterMs) {
    if (this.data.remoteAssistRole === 'admin' && this.data.remoteAssistSessionId) {
      // 通过 _remoteAssistEnqueueCommand 中继发送
      // 防止如果调用方自身已经有循环或重试，这里再排队会堆积
      this._remoteAssistEnqueueCommand(text, 1, 0);
      return;
    }
    this._enqueueBleSend(text, gapAfterMs != null ? gapAfterMs : BLE_SEND_GAP_MS);
  },

  // 连续发送多次（用于 Max 版本），同样走队列间隔发送
  sendDataMultiple(text, times = 3, interval = 300) {
    if (this.data.remoteAssistRole === 'admin' && this.data.remoteAssistSessionId) {
      // 避免 enqueueCommand 和 timeout 嵌套导致指令乘方爆炸
      // 直接交给远协云端队列去循环发送
      this._remoteAssistEnqueueCommand(text, times, interval);
      return;
    }
    const gap = Math.max(interval, BLE_SEND_GAP_MS);
    for (let i = 0; i < times; i++) {
      this._enqueueBleSend(text, gap);
    }
  },

  // ===============================================
  // 🔴 统一的自定义弹窗方法（替换所有 wx.showModal 和 wx.showToast）
  // ===============================================
  
  // 🔴 统一的自定义 Toast 方法（替换所有 wx.showToast）
  _showCustomToast(title, icon = 'none', duration = 2000) {
    // 尝试获取组件，最多重试3次
    const tryShow = (attempt = 0) => {
      const toast = this.selectComponent('#custom-toast');
      if (toast && toast.showToast) {
        toast.showToast({ title, icon, duration });
      } else if (attempt < 3) {
        // 延迟重试
        setTimeout(() => tryShow(attempt + 1), 100 * (attempt + 1));
      } else {
        // 最终降级
        console.warn('[scan] custom-toast 组件未找到，使用降级方案');
        wx.showToast({ title, icon, duration });
      }
    };
    tryShow();
  },

  // 🔴 统一的自定义 Modal 方法（替换所有 wx.showModal）
  _showCustomModal(options) {
    // 尝试获取组件，最多重试3次
    const tryShow = (attempt = 0) => {
      const toast = this.selectComponent('#custom-toast');
      if (toast && toast.showModal) {
        toast.showModal({
          title: options.title || '提示',
          content: options.content || '',
          showCancel: options.showCancel !== false,
          confirmText: options.confirmText || '确定',
          cancelText: options.cancelText || '取消',
          titleClass: options.titleClass || '',
          success: options.success
        });
      } else if (attempt < 3) {
        // 延迟重试
        setTimeout(() => tryShow(attempt + 1), 100 * (attempt + 1));
      } else {
        // 最终降级
        console.warn('[scan] custom-toast 组件未找到，使用降级方案');
        wx.showModal(options);
      }
    };
    tryShow();
  },

  _arrayBufferToUtf8(buffer) {
    const arr = new Uint8Array(buffer);
    let out = '';
    for (let i = 0; i < arr.length; i++) {
      out += String.fromCharCode(arr[i]);
    }
    return out;
  },

  _resetF2HwMonitorState(connected, model) {
    const m = model || this.data.currentModel;
    return {
      f2HwMonitorVisible: connected && isHwPinMonitorModel(m),
      f2KeyOn: null,
      f2BtnPressed: null,
      f2KeyStatusText: connected ? '监测中…' : '未连接',
      f2BtnStatusText: connected ? '监测中…' : '未连接'
    };
  },

  _setupF2FaultBleListener() {
    this._f2BleRxLine = '';
    this._f2LastFaultKey = '';
    this._f2FaultConnectPending = true;
    this._f2AdvSyncPending = true;
    if (!this.ble) return;
    this.ble.onDataReceived = (buffer) => this._onF2BleDataReceived(buffer);
    this.setData({
      f2TravelReadbackText: '读取中…',
      f2DelayPowerReadbackText: '读取中…',
      ...this._resetF2HwMonitorState(true)
    });
  },

  _teardownF2FaultBleListener() {
    this._stopF2DemoMode(false);
    this._f2BleRxLine = '';
    this._f2LastFaultKey = '';
    this._f2FaultConnectPending = false;
    this._f2AdvSyncPending = false;
    if (this.ble) this.ble.onDataReceived = null;
    this._resetFlapPanelState();
    this.setData({
      f2TravelReadbackText: '读取中…',
      f2DelayPowerReadbackText: '读取中…',
      ...this._resetF2HwMonitorState(false)
    });
  },

  _onF2BleDataReceived(buffer) {
    if (!buffer || !isF2MaxStatusBleModel(this.data.currentModel)) return;
    this._f2LastBleRxAt = Date.now();
    this._f2BleRxLine += this._arrayBufferToUtf8(buffer);
    const parts = this._f2BleRxLine.split('\n');
    this._f2BleRxLine = parts.pop() || '';
    parts.forEach((line) => {
      const trimmed = (line || '').trim();
      if (trimmed) this._handleF2BleStatusLine(trimmed);
    });
  },

  _handleF2BleStatusLine(line) {
    const parsed = parseF2StatusLine(line);
    if (!parsed) return;
    const forcePopup = !!this._f2FaultConnectPending;
    if (forcePopup) this._f2FaultConnectPending = false;
    if (forcePopup) {
      this._showF2ConnectModalQueue(buildF2ConnectModalQueue(parsed));
      this._f2LastFaultKey = `${parsed.err}:${parsed.wrn}`;
    } else {
      this._maybeShowF2FaultPopup(parsed.err, parsed.wrn, false);
    }
    this._syncF2StatusFromPacket(parsed);
  },

  _syncF2StatusFromPacket(parsed) {
    if (!isF2MaxStatusBleModel(this.data.currentModel)) return;
    const forceAdv = !!this._f2AdvSyncPending;
    const updates = buildF2AdvUiUpdates(parsed, {
      currentState: this.data.settingState,
      delayPowerOffOptions: this.data.delayPowerOffOptions,
      force: forceAdv,
      currentUi: {
        f2TravelModeOn: this.data.f2TravelModeOn,
        delayPowerOffIndex: this.data.delayPowerOffIndex,
        f2TravelReadbackText: this.data.f2TravelReadbackText,
        f2DelayPowerReadbackText: this.data.f2DelayPowerReadbackText
      }
    });

    if (forceAdv) {
      this._f2AdvSyncPending = false;
    }

    if (parsed.itm !== null && parsed.itm !== undefined) {
      const flap = buildFlapPanelStateFromItm(parsed.itm, parsed.stm);
      if (flap) {
        if (flap.flapPanelState !== this.data.flapPanelState) {
          updates.flapPanelState = flap.flapPanelState;
        }
        if (flap.flapPanelStateText !== this.data.flapPanelStateText) {
          updates.flapPanelStateText = flap.flapPanelStateText;
        }
        if (this._f2DemoActive) {
          this._onF2DemoFlapStable(flap.flapPanelState);
        }
      }
    }

    if (parsed.spd !== null && parsed.spd >= 10 && parsed.spd <= 100) {
      if (forceAdv || parsed.spd !== this.data.f2ServoSpeed) {
        Object.assign(updates, buildF2ServoSpeedUi(parsed.spd));
        try {
          wx.setStorageSync('f2_servo_speed', parsed.spd);
        } catch (e) { /* ignore */ }
      }
    }

    Object.assign(updates, buildF2HwMonitorUpdates(parsed, {
      f2KeyOn: this.data.f2KeyOn,
      f2BtnPressed: this.data.f2BtnPressed
    }));

    if (!isHwPinMonitorModel(this.data.currentModel)) {
      delete updates.f2KeyOn;
      delete updates.f2BtnPressed;
      delete updates.f2KeyStatusText;
      delete updates.f2BtnStatusText;
      delete updates.f2HwMonitorVisible;
    }

    if (Object.keys(updates).length) {
      this.setData(updates);
      this._scheduleRemoteStatePush();
      if (updates.settingState) {
        try {
          wx.setStorageSync('f2_ultra_adv_settingState', updates.settingState);
        } catch (e) { /* ignore */ }
      }
      if (updates.delayPowerOffIndex !== undefined) {
        const opt = this.data.delayPowerOffOptions[updates.delayPowerOffIndex];
        if (opt) {
          try {
            wx.setStorageSync('f2_delayPowerOffIndex', updates.delayPowerOffIndex);
            wx.setStorageSync('f2_delayPowerOffMinutes', opt.minutes);
          } catch (e) { /* ignore */ }
        }
      }
    }
  },

  _maybeShowF2FaultPopup(err, wrn, forcePopup) {
    const key = `${err}:${wrn}`;
    if (!err && !wrn) {
      this._f2LastFaultKey = key;
      return;
    }
    if (!forcePopup && key === this._f2LastFaultKey) return;
    this._f2LastFaultKey = key;

    const showWarn = () => {
      const warnPayload = buildF2FaultModalPayload(0, wrn);
      if (warnPayload) this._showF2FaultModal(warnPayload);
    };

    const errPayload = buildF2FaultModalPayload(err, 0);
    if (errPayload) {
      this._showF2FaultModal(errPayload, () => {
        if (wrn > 0) showWarn();
      });
    } else if (wrn > 0) {
      showWarn();
    }
  },

  _showF2ConnectModalQueue(queue) {
    const list = Array.isArray(queue) ? queue : [];
    const showNext = (idx) => {
      if (idx >= list.length) return;
      this._showF2FaultModal(list[idx], () => showNext(idx + 1));
    };
    showNext(0);
  },

  _showF2FaultModal(payload, afterClose) {
    this._showCustomModal({
      title: payload.title,
      content: payload.content,
      showCancel: false,
      confirmText: '知道了',
      titleClass: payload.kind === 'warn' ? 'warn' : (payload.kind === 'error' ? 'error' : (payload.kind === 'info' ? 'info' : '')),
      success: () => {
        if (typeof afterClose === 'function') afterClose();
      }
    });
  },
});