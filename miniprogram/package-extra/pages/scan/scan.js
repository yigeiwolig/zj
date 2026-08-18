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
// F2 Ultra 图标（SVG 矢量，任意缩放清晰）
const iconF2Ultra = '/images/mt-f2-ultra.svg';
// F3 横版 MT 整机标：Max 实心 / Pro 线条（源文件 images/mt-f3-machine-*.svg，可直接替换为你的原 SVG）
const iconF3Pro = '/images/mt-f3-machine-pro.svg';
const iconF3Max = '/images/mt-f3-machine-max.svg';
const iconCanLearn = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE0MCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3QgeD0iMjAiIHk9IjMwIiB3aWR0aD0iMTYwIiBoZWlnaHQ9IjEwMCIgcng9IjE2IiBzdHJva2U9IiMxQzFDMUUiIHN0cm9rZS13aWR0aD0iNCIvPjx0ZXh0IHg9IjEwMCIgeT0iNzAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIzNiIgZm9udC13ZWlnaHQ9IjcwMCIgZmlsbD0iIzFEMDFDRiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Q0FOPC90ZXh0Pjx0ZXh0IHg9IjEwMCIgeT0iMTA4IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZTdiviIgZmlsbD0iIzZCNzI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+T0JEPC90ZXh0Pjwvc3ZnPg==';

// 小幽灵图标（睁眼 - 开启隐蔽模式）
const iconGhostOpen = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjAgMTFWMTlDMjAgMjAuNiAxOCAyMS41IDE3IDIwLjVMMTYgMTkuNUwxNCAyMS41QzEzLjIgMjIuMyAxMiAyMS44IDEyIDIwLjhWMjAuOEMxMiAyMS44IDEwLjggMjIuMyAxMCAyMS41TDggMTkuNUw3IDIwLjVDNiAyMS41IDQgMjAuNiA0IDE5VjExQzQgNi41OCA3LjU4IDMgMTIgM0MxNi40MiAzIDIwIDYuNTggMjAgMTFaIiBmaWxsPSJ3aGl0ZSIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48Y2lyY2xlIGN4PSI5IiBjeT0iMTEiIHI9IjEuNSIgZmlsbD0iYmxhY2siLz48Y2lyY2xlIGN4PSIxNSIgY3k9IjExIiByPSIxLjUiIGZpbGw9ImJsYWNrIi8+PC9zdmc+';

// 小幽灵图标（闭眼 - 退出隐蔽模式）
const iconGhostClose = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjAgMTFWMTlDMjAgMjAuNiAxOCAyMS41IDE3IDIwLjVMMTYgMTkuNUwxNCAyMS41QzEzLjIgMjIuMyAxMiAyMS44IDEyIDIwLjhWMjAuOEMxMiAyMS44IDEwLjggMjIuMyAxMCAyMS41TDggMTkuNUw3IDIwLjVDNiAyMS41IDQgMjAuNiA0IDE5VjExQzQgNi41OCA3LjU4IDMgMTIgM0MxNi40MiAzIDIwIDYuNTggMjAgMTFaIiBmaWxsPSJ3aGl0ZSIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48bGluZSB4MT0iNy41IiB5MT0iMTEiIHgyPSIxMC41IiB5Mj0iMTEiIHN0cm9rZT0iYmxhY2siIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PGxpbmUgeDE9IjEzLjUiIHkxPSIxMSIgeDI9IjE2LjUiIHkyPSIxMSIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48L3N2Zz4=';

/** 工厂调试机蓝牙名，禁止用户连接（见 utils/blockedDebugBle.js） */
const {
  isBlockedDebugBleDevice,
  normalizeBleAdvertiseName: normalizeBlockedBleName
} = require('../../../utils/blockedDebugBle.js');

function normalizeBleAdvertiseName(name) {
  return normalizeBlockedBleName(name);
}

function getBleDeviceAdvertiseName(device) {
  if (!device) return '';
  return device.name || device.localName || '';
}

function isConnectableMtBleDevice(device) {
  const advName = getBleDeviceAdvertiseName(device);
  return !!advName && advName.startsWith('NB') && !isBlockedDebugBleDevice(device);
}

function bleErrMsg(err) {
  if (!err) return '';
  if (typeof err === 'string') return err;
  return String(err.errMsg || err.message || '');
}

function isBleAlreadyOpenError(err) {
  const msg = bleErrMsg(err).toLowerCase();
  return msg.includes('already open');
}

function classifyBleError(err) {
  if (!err) return 'generic';
  if (err._bleKind) return err._bleKind;
  if (err.type === 'auth_deny') return 'auth';
  if (err.type === 'location_deny') return 'location';
  const msg = bleErrMsg(err).toLowerCase();
  const errno = err.errno;
  const errCode = err.errCode;
  // errno 3：系统级权限未授予「微信」本身（不是小程序 scope）
  if (errno === 3 || msg.includes('system permission denied')) {
    return 'system_auth';
  }
  if (
    msg.includes('auth deny') ||
    msg.includes('authorize') ||
    msg.includes('privacy') ||
    errno === 103 ||
    errno === 104 ||
    errCode === 103 ||
    errCode === 104
  ) {
    return 'auth';
  }
  if (msg.includes('location') || msg.includes('定位') || errCode === 10002) {
    return 'location';
  }
  if (
    errCode === 10001 ||
    errno === 1500102 ||
    msg.includes('not available') ||
    msg.includes('未开启') ||
    msg.includes('未打开') ||
    msg.includes('adapter not available')
  ) {
    return 'off';
  }
  if (isBleAlreadyOpenError(err)) return 'ok';
  return 'generic';
}

function isAndroidBleScanPlatform() {
  try {
    const info = wx.getDeviceInfo ? wx.getDeviceInfo() : wx.getSystemInfoSync();
    return String(info.platform || '').toLowerCase() === 'android';
  } catch (e) {
    return false;
  }
}

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
    this._disconnectIntentManual = false;
    this._closingConnection = false;
    this._disconnectNotified = false;
    this._closeSuppressedAt = {};
    this._connListenerSetup = false;
    this._suppressDisconnectUntil = 0;
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
    this.onDebugDeviceBlocked = null;
    this.onDataReceived = null;      
    this.onError = null;
    this._autoConnectDelayMs = 400;
    this.preferredDeviceId = '';
  }

  initBluetoothAdapter() {
    return new Promise((resolve, reject) => {
      const onReady = (res) => {
        this.api.onBluetoothAdapterStateChange((state) => {
          console.log('蓝牙适配器状态变化', state);
        });
        resolve(res || {});
      };
      // 微信要求先 openBluetoothAdapter；getBluetoothAdapterState 在适配器未开时会误报
      this.api.openBluetoothAdapter({
        success: onReady,
        fail: (err) => {
          if (isBleAlreadyOpenError(err)) {
            onReady({});
            return;
          }
          reject(Object.assign({}, err || {}, { _bleKind: classifyBleError(err) }));
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
    this._clearAutoConnectTimer();
  }

  _clearAutoConnectTimer() {
    if (this.openTimer) {
      clearTimeout(this.openTimer);
      this.openTimer = null;
    }
  }

  _pickAutoConnectCandidate() {
    const allowed = (this.bleList || []).filter(isConnectableMtBleDevice);
    if (!allowed.length) return null;
    if (this.preferredDeviceId) {
      const preferred = allowed.find((d) => d.deviceId === this.preferredDeviceId);
      if (preferred) return preferred;
    }
    allowed.sort((a, b) => (b.RSSI || -999) - (a.RSSI || -999));
    return allowed[0];
  }

  _scheduleAutoConnect() {
    if (this.hasConnected) return;
    this._clearAutoConnectTimer();
    this.openTimer = setTimeout(() => {
      this.openTimer = null;
      if (this.hasConnected) return;
      const candidate = this._pickAutoConnectCandidate();
      if (!candidate) return;
      this.hasConnected = true;
      if (this.onConnecting) this.onConnecting(candidate);
      this.connectDevice(candidate);
    }, this._autoConnectDelayMs);
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

      // 自动连接：略作聚合，优先连非调试机（见 blockedDebugBle）
      if (!this.hasConnected && isConnectableMtBleDevice(device)) {
        this._scheduleAutoConnect();
      }
    });
  }

  _withTimeout(promise, ms, tag) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(tag || 'timeout')), ms);
      promise.then(
        (v) => { clearTimeout(timer); resolve(v); },
        (e) => { clearTimeout(timer); reject(e); }
      );
    });
  }

  /**
   * 强制释放系统层 BLE 连接。
   * 关键：连接卡死时系统层链路仍被微信占用，设备不再广播，
   * 不 close 的话重新扫描永远扫不到，只能重启小程序。
   */
  _forceCloseConnection(deviceId) {
    if (!deviceId) return;
    this._suppressCloseForDevice(deviceId);
    try {
      this.api.closeBLEConnection({ deviceId, fail: () => {} });
    } catch (e) { /* ignore */ }
  }

  _clearConnectWatchdog() {
    if (this._connectWatchdogTimer) {
      clearTimeout(this._connectWatchdogTimer);
      this._connectWatchdogTimer = null;
    }
  }

  cancelPendingConnect() {
    const pendingId = this._pendingConnectDeviceId;
    if (!pendingId) return false;
    this._pendingConnectDeviceId = '';
    this._clearConnectWatchdog();
    this.hasConnected = false;
    this._forceCloseConnection(pendingId);
    return true;
  }

  connectDevice(device) {
    if (isBlockedDebugBleDevice(device)) {
      this.hasConnected = false;
      this._clearAutoConnectTimer();
      if (this.onDebugDeviceBlocked) this.onDebugDeviceBlocked(device);
      return Promise.reject(new Error('blocked_debug_device'));
    }
    // UI Loading 已经在 Page 层面处理了，这里只处理逻辑
    this.stopScan();
    const deviceId = device.deviceId;
    this._pendingConnectDeviceId = deviceId;

    return new Promise((resolve, reject) => {
      let settled = false;

      const succeed = () => {
        if (settled) return;
        settled = true;
        this._clearConnectWatchdog();
        this._pendingConnectDeviceId = '';
        if (this.onConnected) this.onConnected(device);
        resolve(device);
      };

      const fail = (err, opts) => {
        if (settled) return;
        settled = true;
        this._clearConnectWatchdog();
        this._pendingConnectDeviceId = '';
        this.hasConnected = false;
        if (this.device && this.device.deviceId === deviceId) this.device = null;
        // 无论卡在哪一步都强制释放系统层连接，否则设备不广播、无法重连
        this._forceCloseConnection(deviceId);
        const manual = !!(opts && opts.manual);
        if (this.onConnectFailed) this.onConnectFailed(err, device, { manual });
        if (opts && opts.notifyError && this.onError) this.onError(err);
        reject(err);
      };

      // 总兜底：部分机型 createBLEConnection 会 success/fail 都不回调
      this._connectWatchdogTimer = setTimeout(() => {
        console.warn('[BLE] connect watchdog timeout', deviceId);
        fail(new Error('connect_timeout'));
      }, 25000);

      this.api.createBLEConnection({
        deviceId,
        timeout: 20000,
        success: (res) => {
          if (settled) {
            // 已按超时处理过，这里补一次 close 防止链路残留
            this._forceCloseConnection(deviceId);
            return;
          }
          this.device = device;
          this.lastConnectedDevice = device;
          if (deviceId && this._closeSuppressedAt) {
            delete this._closeSuppressedAt[deviceId];
          }
          this.isScanning = false;
          this._ensureConnectionStateListener();
          this._lastBleWriteOk = null;
          if (this.onLinkEstablished) this.onLinkEstablished(device);

          setTimeout(() => {
            if (settled) return;
            this._withTimeout(this.discoverServices(), 12000, 'gatt_timeout').then(() => {
              succeed();
            }).catch((err) => {
              console.warn('[BLE] discoverServices failed', err);
              const manual = !!this._manualDisconnect;
              this._manualDisconnect = false;
              fail(err, { manual });
            });
          }, 800);
        },
        fail: (err) => {
          this.isScanning = false;
          fail(err, { notifyError: true });
        }
      });
    });
  }

  _suppressCloseForDevice(deviceId) {
    if (!deviceId) return;
    this._closeSuppressedAt[deviceId] = Date.now();
  }

  _isCloseSuppressed(deviceId) {
    const t = deviceId && this._closeSuppressedAt[deviceId];
    return !!(t && (Date.now() - t) < 5000);
  }

  _notifyDisconnected(payload) {
    if (this._disconnectNotified) return;
    this._disconnectNotified = true;
    setTimeout(() => {
      this._disconnectNotified = false;
    }, 400);
    if (this.onDisconnected) this.onDisconnected(payload);
  }

  _ensureConnectionStateListener() {
    if (this._connListenerSetup) return;
    this._connListenerSetup = true;
    this.api.onBLEConnectionStateChange((res) => {
      const activeId = (this.device && this.device.deviceId)
        || (this.lastConnectedDevice && this.lastConnectedDevice.deviceId);
      if (!activeId || res.deviceId !== activeId) return;
      if (res.connected) {
        if (this._bleStateDropTimer) {
          clearTimeout(this._bleStateDropTimer);
          this._bleStateDropTimer = null;
        }
        return;
      }
      if (this._suppressDisconnectUntil && Date.now() < this._suppressDisconnectUntil) {
        return;
      }
      if (this._bleStateDropTimer) return;
      const disconnectedDevice = this.device
        ? { ...this.device }
        : (this.lastConnectedDevice ? { ...this.lastConnectedDevice } : null);
      const deviceId = res.deviceId;
      this._bleStateDropTimer = setTimeout(() => {
        this._bleStateDropTimer = null;
        const initiatedByUs = this._disconnectIntentManual || this._manualDisconnect;
        if (initiatedByUs || this._closingConnection || this._isCloseSuppressed(deviceId)) {
          return;
        }
        if (this._suppressDisconnectUntil && Date.now() < this._suppressDisconnectUntil) {
          return;
        }
        this.probeLinkAlive(deviceId).then((alive) => {
          if (alive) return;
          this._manualDisconnect = false;
          this.device = null;
          this.hasConnected = false;
          this._notifyDisconnected({
            unexpected: true,
            device: disconnectedDevice,
            source: 'state_change'
          });
        });
      }, 2800);
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
    const wasManual = !!manual;
    this._manualDisconnect = wasManual;
    this._disconnectIntentManual = wasManual;
    const device = this.device || this.lastConnectedDevice;
    const deviceId = device && device.deviceId;
    const disconnectedDevice = device ? { ...device } : null;
    const finish = () => {
      this._closingConnection = false;
      this._disconnectIntentManual = false;
      this.device = null;
      this.hasConnected = false;
      this._manualDisconnect = false;
      this._notifyDisconnected({
        unexpected: !wasManual,
        device: disconnectedDevice,
        source: 'disconnect'
      });
    };
    if (!deviceId) {
      finish();
      return;
    }
    if (this._closingConnection) return;
    if (this._isCloseSuppressed(deviceId)) {
      finish();
      return;
    }
    this._closingConnection = true;
    this.probeLinkAlive(deviceId).then((alive) => {
      if (!alive) {
        this._suppressCloseForDevice(deviceId);
        finish();
        return;
      }
      this._suppressCloseForDevice(deviceId);
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        finish();
      };
      this.api.closeBLEConnection({
        deviceId,
        success: done,
        fail: done
      });
    });
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
          reject(new Error('未找到 FFF0 蓝牙服务'));
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

/** F2 Max / Long（非 Ultra）：固件有状态包但无 Ultra 级回读校验，滑块仍应随点击/状态包更新 */
function isF2UltraModel(model) {
  if (!model) return false;
  return model.name === 'F2' && model.type === 'Ultra';
}

function isF3MaxModel(model) {
  return !!(model && model.name === 'F3' && model.type === 'Max');
}

function isF1MaxModel(model) {
  return !!(model && model.name === 'F1' && model.type === 'Max');
}

/** F3 固件解析前会剥掉尾部 #；F2 Ultra / F1 Ultra 固件必须精确匹配「打开」「关闭」 */
function flapBleUsesHashSuffix(model) {
  return isF3MaxModel(model);
}

function flapBleWireText(model, cmd) {
  const base = String(cmd || '').replace(/#$/, '');
  if (!base) return '';
  return flapBleUsesHashSuffix(model) ? `${base}#` : base;
}

function flapBleSendTimes(model, cmd) {
  if (isF3MaxModel(model)) {
    return cmd === '关闭' ? 5 : 3;
  }
  return 2;
}

function flapBleSendInterval(model) {
  return isF3MaxModel(model) ? FLAP_BLE_SEND_GAP_MS : 500;
}

function isF2UltraFirmwareModel(model) {
  return isF1UltraModel(model) || isF2UltraModel(model);
}

/** F1 Ultra / F2 Ultra / F3 Max：同款控制中心卡片（状态圆环、直控、出行模式等；F1/F2 Ultra 共用 F2 Ultra 固件逻辑） */
function isMtUltraCardModel(model) {
  return isF2UltraFirmwareModel(model) || isF3MaxModel(model);
}

function mtUltraCardLabel(model) {
  if (isF1UltraModel(model)) return 'F1 ULTRA';
  if (isF2UltraModel(model)) return 'F2 ULTRA';
  if (isF3MaxModel(model)) return 'F3 MAX';
  return '';
}

/** Pin2/Pin5 硬件实时监测：仅 F1 Ultra、F2 Ultra、F3 MAX */
function isHwPinMonitorModel(model) {
  return isMtUltraCardModel(model);
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

/** F2 自动校准：除 PRO 外（Max / Long / Ultra） */
function isF2AutoCalibrateModel(model) {
  if (!model || model.name !== 'F2') return false;
  if (model.type === 'Pro') return false;
  return model.type === 'Max' || isF2LongType(model.type) || model.type === 'Ultra';
}

/** 自动校准入口：F2(非PRO) + F1 Ultra + F3 MAX（陀螺仪向导） */
function modelSupportsAutoCalibrate(model) {
  if (!model) return false;
  if (isF3MaxModel(model)) return true;
  if (isF1UltraModel(model)) return true;
  return isF2AutoCalibrateModel(model);
}

function buildF2StealthUiFlags(model, settingState, bleLinked) {
  if (!isMtUltraCardModel(model)) {
    return {
      f2StealthStatusVisible: false,
      f2StealthBleControlVisible: false
    };
  }
  const linked = !!bleLinked;
  return {
    f2StealthStatusVisible: linked,
    f2StealthBleControlVisible: linked
  };
}

function buildRemoteAssistAdminExtras(model, settingState, bleLinked) {
  const linked = !!bleLinked;
  const patch = {};
  if (isMtUltraCardModel(model)) {
    Object.assign(patch, buildF2StealthUiFlags(model, settingState || {}, linked));
  }
  if (isF3MaxModel(model)) {
    // 远协初始跟会话 UI 走；未判明前默认 TOF
    // 具体显隐由页面 f3SensorUi 控制，这里只补姿态默认文案
    if (!linked) {
      patch.f3AttitudeHint = '请先连接蓝牙';
      patch.f3AttitudeRollDeg = 0;
      patch.f3ImuLiveDegText = '—';
      patch.f3MpuOk = false;
    }
  }
  if (isHwPinMonitorModel(model)) {
    patch.f2HwMonitorVisible = linked;
  }
  return patch;
}

function resolveF2BleLinkedForUi(pageData) {
  const d = pageData || {};
  if (d.remoteAssistRole === 'admin' && d.remoteAssistSessionStatus === 'active') {
    return !!d.remoteSessionBleConnected;
  }
  return !!d.isConnected;
}

/** F1/F2 Ultra、F3 MAX（同款固件）及 F2 系：打开角度走自定义功能 / 完全打开 / 往上收 / 往下 */
function usesF2StyleOpenAngleBle(model) {
  if (!model) return false;
  return isMtUltraCardModel(model) || model.name === 'F2';
}

function resolveOpenAngleBtnText(model) {
  if (!model) return '90°';
  if (isMtUltraCardModel(model)) return '90°';
  if (model.name && model.name.includes('F1')) return '180°';
  return '90°';
}

function openAngleInternalToDisplayDeg(model, internal) {
  const v = Math.max(0, parseInt(internal, 10) || 0);
  const maxInternal = openAngleMaxDeg(model, 170);
  if (maxInternal >= 180) {
    return Math.min(180, v);
  }
  // F2 等内部上限 170：UI 仍显示 0~180°，90 对 90，完全打开对 180
  if (v <= 90) return v;
  if (v >= 160) return 180;
  return Math.round(90 + ((v - 90) * 90) / 70);
}

function openAngleVisualIndexFromInternal(model, internalDeg) {
  const display = openAngleInternalToDisplayDeg(model, internalDeg);
  return Math.max(0, Math.min(90, Math.round(display / 2)));
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
  // F1 全系、F3 PRO：预设 90° / 180°
  if (model.name === 'F1' || (model.name === 'F3' && !isF3MaxModel(model))) {
    if (angle === 90) return '90度';
    if (angle === 180) return '180度';
  }
  return '';
}

function openAngleMaxDeg(model, fallbackMax) {
  if (isF3MaxModel(model)) return F3_MAX_OPEN_ANGLE_MAX_DEG;
  if (isMtUltraCardModel(model)) return OPEN_ANGLE_ULTRA_MAX_DEG;
  return fallbackMax != null ? fallbackMax : 180;
}

function openAngleBleStepGapMs(model) {
  return isF3MaxModel(model) ? F3_OPEN_ANGLE_BLE_STEP_GAP_MS : BLE_ANGLE_STEP_GAP_MS;
}

function openAngleSlideBleCommands(model) {
  if (!model) return null;
  if (usesF2StyleOpenAngleBle(model)) {
    // F3 MAX 与 F2 MAX 同款：左拨增大 UI 角度时发「往下」，右拨减小时发「往上收」
    if (isF3MaxModel(model) || (model.name === 'F2' && !isMtUltraCardModel(model))) {
      return { increase: '往上收', decrease: '往下' };
    }
    if (isMtUltraCardModel(model)) {
      // F1 Ultra 机械方向与 F2 Ultra 相反：同一拨向发对面指令
      if (isF1UltraModel(model)) {
        return { increase: '往上收', decrease: '往下' };
      }
      return { increase: '往下', decrease: '往上收' };
    }
    return { increase: '往上收', decrease: '往下' };
  }
  // F1 全系、F3 PRO：同款增量指令
  if (model.name === 'F1' || model.name === 'F3') {
    return { increase: '往上收', decrease: '往下放' };
  }
  return null;
}

function isF2MaxLikeControl(model) {
  if (!model) return false;
  return isF2MaxSeriesModel(model) || isMtUltraCardModel(model);
}

function isF2MaxDelayPowerModel(model) {
  return isMtUltraCardModel(model) && !isF3MaxModel(model);
}

function isF2MaxStatusBleModel(model) {
  // 状态包监听：F2 MAX 系 + F1/F2 Ultra / F3 MAX（F1 Ultra 与 F2 Ultra 同款）
  return isF2MaxSeriesModel(model) || isMtUltraCardModel(model);
}

/** 高级设置滑块是否支持状态包回读校验（仅 Ultra / F3 MAX；F2 MAX / Long 无回读） */
function modelSupportsSettingBleVerify(model) {
  return isMtUltraCardModel(model);
}

/** F1/F2 部分机型无状态回读：滑块初始居中，点击即发送 */
function modelUsesSettingClickOnly(model) {
  if (!model || isMtUltraCardModel(model)) return false;
  const name = model.name || '';
  const type = model.type || '';
  if (name === 'F1' && (type === 'Pro' || type === 'Max')) return true;
  if (name === 'F2' && (type === 'Pro' || type === 'Max' || isF2LongType(type))) return true;
  return false;
}

/** Ultra / F3 MAX：高级设置切换成功后的提示文案 */
function buildSettingChangeResultText(model, key, targetVal) {
  if (!model || !key || !targetVal) return '设置已更新';
  const isMtUltra = isMtUltraCardModel(model);
  switch (key) {
    case 'faultDetect':
      if (isMtUltra) {
        return targetVal === 'left' ? '堵转检测已开启' : '堵转检测已关闭';
      }
      return targetVal === 'left' ? '主动故障检测已开启' : '主动故障检测已关闭';
    case 'bootPinDetect':
      return targetVal === 'left' ? '开机插销检测已开启' : '开机插销检测已关闭';
    case 'selfRepair':
      if (isMtUltra) {
        return targetVal === 'left' ? '电机工作检测已开启' : '电机工作检测已关闭';
      }
      return targetVal === 'left' ? '故障自修复已执行' : '故障自修复已关闭';
    case 'powerOn':
      if (isMtUltra) {
        return targetVal === 'left' ? '开机位置已设为下翻' : '开机位置已设为上翻';
      }
      return targetVal === 'left' ? '开机位置已设为上翻' : '开机位置已设为下翻';
    case 'shutdown':
      return targetVal === 'left' ? '关机位置已设为收回' : '关机位置已设为保持';
    case 'travelMode':
      return targetVal === 'right' ? '出行模式已开启' : '出行模式已关闭';
    case 'smoothMode':
      return targetVal === 'left' ? '平滑模式已开启' : '平滑模式已关闭';
    case 'stealthBtnExit':
      return targetVal === 'left' ? '隐蔽模式退出已允许按钮' : '隐蔽模式退出已设为仅小程序';
    case 'powerOffLock':
      return targetVal === 'left' ? '断电锁死已开启' : '断电锁死已关闭';
    case 'multiRetry':
      return targetVal === 'left' ? '已发送多次重试' : '多次重试待命';
    case 'heightMon':
      return targetVal === 'left' ? '高度检测已开启' : '高度检测已关闭';
    default:
      return '设置已更新';
  }
}

const NEUTRAL_SETTING_STATE = {
  faultDetect: 'center',
  selfRepair: 'center',
  powerOn: 'center',
  shutdown: 'center',
  travelMode: 'center',
  smoothMode: 'center',
  stealthBtnExit: 'center',
  powerOffLock: 'center',
  bootPinDetect: 'center',
  multiRetry: 'center',
  heightMon: 'center'
};

function buildNeutralSettingState() {
  return { ...NEUTRAL_SETTING_STATE };
}

function modelNeedsCalGuide(model) {
  return modelSupportsAutoCalibrate(model);
}

function modelNeedsSettingsGuide(model) {
  return modelNeedsCalGuide(model) || isF1MaxModel(model);
}

function modelHasStealthGuideButtons(model) {
  if (!model) return false;
  if (model.name === 'F1' && model.type === 'Pro') return false;
  if (model.type !== 'Max' && model.type !== 'Long' && model.type !== 'Ultra') return true;
  return model.type === 'Max' || model.type === 'Long' || model.type === 'Ultra';
}

function modelUsesDirectStealthControl(model) {
  return isMtUltraCardModel(model);
}

function buildOnboardingGuideSteps(model) {
  const steps = [
    {
      key: 'foldAngle',
      anchor: '#foldAngleGuideAnchor',
      title: '设置「折叠角度」',
      desc: '这里用于调整设备收回后的折叠位置。为避免误操作，进入设置时需要管理员权限。'
    },
    {
      key: 'openAngle',
      anchor: '#openAngleGuideAnchor',
      title: '设置「打开角度」',
      desc: '这里用于调整设备展开后的角度，可根据实际安装位置进行设置。'
    }
  ];
  if (modelNeedsCalGuide(model)) {
    steps.push({
      key: 'cal',
      anchor: '#calGuideAnchor',
      title: '先点击「自动校准」',
      desc: '首次使用请先完成自动校准，让设备完成初始标定。',
      scrollCenterRatio: 0.50
    });
  }
  if (modelNeedsSettingsGuide(model)) {
    steps.push(isF1MaxModel(model) ? {
      key: 'settings',
      anchor: '#settingsGuideAnchor',
      title: '打开「高级设置」',
      desc: '可在此按需调整设备参数。',
      scrollCenterRatio: 0.50
    } : {
      key: 'settings',
      anchor: '#settingsGuideAnchor',
      title: '再打开「高级设置」',
      desc: '校准完成后，可在高级设置中按需调整参数。',
      scrollCenterRatio: 0.50
    });
  }
  if (isMtUltraCardModel(model)) {
    const ultraControlSteps = [
      {
        key: 'f2ControlPanel',
        anchor: '#f2ControlPanelGuideAnchor',
        title: '展开「控制」面板',
        desc: '点击这里展开控制面板，可进行远程翻开、收起等操作。',
        scrollCenterRatio: 0.50,
        controlPanelOpen: false
      },
      {
        key: 'f2Flap',
        anchor: '#f2FlapControlGuideAnchor',
        title: '「收起」与「翻开」',
        desc: '连接蓝牙后，可在此远程控制牌照架收起或翻开。',
        scrollCenterRatio: 0.50,
        controlPanelOpen: true
      },
      {
        key: 'f2Speed',
        anchor: '#f2SpeedGuideAnchor',
        title: '调节「运行速度」',
        desc: '拖动滑块可调整翻板运行速度，数值越高动作越快。',
        scrollCenterRatio: 0.50,
        controlPanelOpen: true
      },
      {
        key: 'f2Voice',
        anchor: '#f2VoiceGuideAnchor',
        title: '「语音控制」',
        desc: '点击进入语音控制页，可通过语音指令远程操作设备。',
        scrollCenterRatio: 0.50,
        controlPanelOpen: true
      }
    ];
    // 插在折叠/打开角度之后、自动校准之前
    const calIdx = steps.findIndex((s) => s.key === 'cal');
    if (calIdx >= 0) {
      steps.splice(calIdx, 0, ...ultraControlSteps);
    } else {
      const settingsIdx = steps.findIndex((s) => s.key === 'settings');
      if (settingsIdx >= 0) {
        steps.splice(settingsIdx, 0, ...ultraControlSteps);
      } else {
        steps.push(...ultraControlSteps);
      }
    }
  }
  if (modelHasStealthGuideButtons(model)) {
    const direct = modelUsesDirectStealthControl(model);
    steps.push({
      key: 'stealthEnter',
      anchor: '#stealthEnterGuideAnchor',
      title: '点击「开启隐蔽模式」',
      desc: direct
        ? '可直接点击按钮，通过蓝牙远程开启隐蔽模式。'
        : '这里是教学入口，点击可查看如何在车把上开启隐蔽模式。',
      scrollCenterRatio: 0.50
    });
    steps.push({
      key: 'stealthExit',
      anchor: '#stealthExitGuideAnchor',
      title: '点击「退出隐蔽模式」',
      desc: direct
        ? '可直接点击按钮退出隐蔽模式，无需再到车把操作。'
        : '这里是教学入口，点击可查看如何在车把上退出隐蔽模式。',
      scrollCenterRatio: 0.50
    });
  }
  if (isRemoteAssistProduct(scanModelToProductKey(model))) {
    steps.push({
      key: 'remoteAssist',
      anchor: '#remoteAssistGuideAnchor',
      title: '远程协助',
      desc: '遇到不会设置或设备异常时，可以点这里请求技师远程接入。用户确认后，技师可协助查看状态并操作设备。'
    });
  }
  return steps.map((step, idx) => ({
    ...step,
    tag: `第 ${idx + 1} 步`,
    stepNo: idx + 1,
    total: 0
  })).map((step, _idx, arr) => ({ ...step, total: arr.length }));
}

function modelNeedsOnboardingGuide(model) {
  return buildOnboardingGuideSteps(model).length > 0;
}

/** 控制中心：任意型号首次成功连接蓝牙后写入，之后不再自动弹教程（可手动点「教程」） */
const SCAN_BLE_CONNECTED_ONCE_KEY = 'mt_scan_ble_connected_once_v1';
/** @deprecated 仅 migrateLegacyOnboardingGuideFlags 兼容旧数据，不再用于控制自动教程 */
const APP_FIRST_VISIT_GUIDE_DONE_KEY = 'mt_scan_first_visit_guide_done_v1';
const LEGACY_ONBOARDING_GUIDE_KEY_PREFIX = 'hasShownOnboardingGuide_';

function hasScanBleConnectedOnce() {
  try {
    return !!wx.getStorageSync(SCAN_BLE_CONNECTED_ONCE_KEY);
  } catch (e) {
    return false;
  }
}

function markScanBleConnectedOnceStorage() {
  try {
    wx.setStorageSync(SCAN_BLE_CONNECTED_ONCE_KEY, true);
  } catch (e) { /* ignore */ }
}

function migrateLegacyOnboardingGuideFlags() {
  try {
    if (wx.getStorageSync(APP_FIRST_VISIT_GUIDE_DONE_KEY)) return;
    const info = wx.getStorageInfoSync();
    const keys = (info && info.keys) || [];
    if (keys.some((k) => String(k).indexOf(LEGACY_ONBOARDING_GUIDE_KEY_PREFIX) === 0)) {
      wx.setStorageSync(APP_FIRST_VISIT_GUIDE_DONE_KEY, true);
    }
  } catch (e) { /* ignore */ }
}

function enrichScanCardModel(raw) {
  const m = enrichScanGalleryModel(raw);
  m.hasUsageGuide = !m.canLearn && modelNeedsOnboardingGuide(m);
  return m;
}

function resolveMtUltraMagSettingSendText(key, targetVal, model) {
  if (!key || !targetVal) return '';
  if (key === 'faultDetect') {
    return targetVal === 'left' ? '开启堵转检测' : (targetVal === 'right' ? '关闭堵转检测' : '');
  }
  if (key === 'selfRepair') {
    return targetVal === 'left' ? '开启电机检测' : (targetVal === 'right' ? '关闭电机检测' : '');
  }
  if (key === 'powerOn') {
    return targetVal === 'left' ? '开机下翻' : (targetVal === 'right' ? '开机上翻' : '');
  }
  if (key === 'shutdown') {
    return targetVal === 'left' ? '打开收回' : (targetVal === 'right' ? '关闭收回' : '');
  }
  if (key === 'travelMode') {
    return targetVal === 'left' ? '关闭出行' : (targetVal === 'right' ? '开启出行' : '');
  }
  if (key === 'smoothMode') {
    return targetVal === 'left' ? '开启平滑' : (targetVal === 'right' ? '关闭平滑' : '');
  }
  if (key === 'stealthBtnExit') {
    return targetVal === 'left' ? '允许按钮退出' : (targetVal === 'right' ? '禁止按钮退出' : '');
  }
  if (key === 'powerOffLock') {
    return targetVal === 'left' ? 'P1' : (targetVal === 'right' ? 'P0' : '');
  }
  if (key === 'bootPinDetect') {
    return targetVal === 'left' ? '开启自检' : (targetVal === 'right' ? '关闭自检' : '');
  }
  if (key === 'multiRetry') {
    return targetVal === 'left' ? 'UR' : '';
  }
  if (key === 'heightMon' && isF3MaxModel(model)) {
    // 旧测高开关已废弃
    return '';
  }
  return '';
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

const F2_ULTRA_FACTORY_RESET_STEPS = [
  { text: '正在开启堵转检测', data: '开启堵转检测', sendTimes: 2, interval: 500, delayNext: 2000 },
  { text: '正在关闭电机检测', data: '关闭电机检测', sendTimes: 2, interval: 500, delayNext: 2000 },
  { text: '正在设置开机位置上翻', data: '开机下翻', sendTimes: 2, interval: 500, delayNext: 2000 },
  { text: '正在设置关机位置收回', data: '打开收回', sendTimes: 2, interval: 500, delayNext: 2000 },
  { text: '正在设置隐蔽模式允许按钮', data: '允许按钮退出', sendTimes: 2, interval: 500, delayNext: 2000 },
  { text: '正在开启平滑模式', data: '开启平滑', sendTimes: 2, interval: 500, delayNext: 2000 },
  { text: '正在关闭出行模式', data: '关闭出行', sendTimes: 2, interval: 500, delayNext: 2000 },
  { text: '正在设置延时断电为关闭', data: '延时断电0', sendTimes: 2, interval: 500, delayNext: 2000 },
  { text: '正在自动调平，请用手进行阻挡', data: '自动调平', sendTimes: 2, interval: 500, delayNext: 0, isLeveling: true, isFinal: true }
];

/** F3 MAX 无平滑模式、无延时断电，出厂设置跳过对应步骤 */
const F3_MAX_FACTORY_RESET_STEPS = F2_ULTRA_FACTORY_RESET_STEPS.filter(
  (step) => step.data !== '开启平滑' && step.data !== '延时断电0'
);

/** F1 PRO 管理员出厂设置：初始化 → 断线重连 → 按钮动画 → 打开角度 → 折叠校准 */
const F1_PRO_FACTORY_RESET_STEPS = [
  {
    text: '初始化角度中',
    data: '初始化角度',
    sendTimes: 2,
    interval: 500,
    delayNext: 0,
    showConfirm: true
  },
  {
    kind: 'waitBleReconnect',
    text: '去掉负极',
    data: null
  },
  {
    kind: 'buttonAnimOnce',
    text: '请点击按钮，使按钮变红',
    data: null
  },
  {
    kind: 'embedOpenAngle',
    text: '请从左往右边波动，调整到170°左右的预设角度',
    data: null,
    showConfirm: true
  },
  {
    kind: 'textAutoSend',
    text: '正在进入折叠间隙校准…',
    data: '调整折叠角度',
    sendTimes: 1,
    interval: 300,
    delayNext: 1500
  },
  {
    kind: 'foldFineTune',
    text: '请调节折叠间隙',
    subText: '调大间隙直到电机没声音',
    data: null,
    showConfirm: true,
    isFinal: true
  }
];

/** F1 ULTRA 管理员出厂设置：8 步初始化 → 初始化角度 → 断线重连 → 按钮变红 → 确认 */
const F1_ULTRA_FACTORY_RESET_STEPS = [
  { text: '正在开启堵转检测', data: '开启堵转检测', sendTimes: 2, interval: 500, delayNext: 2000 },
  { text: '正在设置电机工作检测为执行', data: '开启电机检测', sendTimes: 2, interval: 500, delayNext: 2000 },
  { text: '正在设置开机位置为上翻', data: '开机上翻', sendTimes: 2, interval: 500, delayNext: 2000 },
  { text: '正在设置关机位置为收回', data: '打开收回', sendTimes: 2, interval: 500, delayNext: 2000 },
  { text: '正在设置隐蔽模式允许按钮', data: '允许按钮退出', sendTimes: 2, interval: 500, delayNext: 2000 },
  { text: '正在开启平滑模式', data: '开启平滑', sendTimes: 2, interval: 500, delayNext: 2000 },
  { text: '正在关闭出行模式', data: '关闭出行', sendTimes: 2, interval: 500, delayNext: 2000 },
  { text: '正在设置延时断电为关闭', data: '延时断电0', sendTimes: 2, interval: 500, delayNext: 2000 },
  { text: '正在自动校准，请用手进行阻挡', data: '自动调平', sendTimes: 2, interval: 500, delayNext: 0, isLeveling: true, showConfirm: true },
  {
    kind: 'buttonAnimOnce',
    text: '点击按钮时，按钮变红',
    data: null
  },
  {
    text: '断开细红线',
    data: null,
    sendTimes: 0,
    interval: 0,
    delayNext: 3000
  },
  {
    text: '是否有自动折回面板，自动断电',
    data: null,
    sendTimes: 0,
    interval: 0,
    delayNext: 0,
    isFinal: true
  }
];

/** F1 MAX 管理员出厂设置：收回 → 初始化 → 断线重连 → 角度/折叠校准 → 再次断线重连 → 按钮变红 → 细红线 → 确认 */
const F1_MAX_FACTORY_RESET_STEPS = [
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
    delayNext: 0,
    showConfirm: true
  },
  {
    kind: 'waitBleReconnect',
    text: '去掉负极',
    data: null
  },
  {
    kind: 'buttonAnimOnce',
    text: '请点击按钮，使按钮变红',
    data: null
  },
  {
    kind: 'embedOpenAngle',
    text: '请从左往右边波动，调整到170°左右的预设角度',
    data: null,
    showConfirm: true
  },
  {
    kind: 'textAutoSend',
    text: '正在进入折叠间隙校准…',
    data: '调整折叠角度',
    sendTimes: 1,
    interval: 300,
    delayNext: 1500
  },
  {
    kind: 'foldFineTune',
    text: '请调节折叠间隙',
    subText: '调大间隙直到电机没声音',
    data: null,
    showConfirm: true
  },
  {
    kind: 'waitBleReconnect',
    text: '去掉负极',
    data: null
  },
  {
    kind: 'buttonAnimOnce',
    text: '点击按钮时，按钮变红',
    data: null
  },
  {
    text: '去掉细红线',
    data: null,
    sendTimes: 0,
    interval: 0,
    delayNext: 3000
  },
  {
    text: '是否有自动折回面板，自动断电',
    data: null,
    sendTimes: 0,
    interval: 0,
    delayNext: 0,
    isFinal: true
  }
];

function f2DelayPowerOffIndexByMinutes(minutes) {
  const idx = F2_DELAY_POWER_OFF_OPTIONS.findIndex((o) => o.minutes === minutes);
  return idx >= 0 ? idx : 0;
}

const F2_TRAVEL_HOLD_OPTIONS = [
  { label: '1 分钟', minutes: 1 },
  { label: '2 分钟', minutes: 2 },
  { label: '3 分钟（默认）', minutes: 3 },
  { label: '5 分钟', minutes: 5 },
  { label: '7 分钟', minutes: 7 },
  { label: '10 分钟', minutes: 10 },
  { label: '15 分钟', minutes: 15 },
  { label: '20 分钟', minutes: 20 },
  { label: '30 分钟', minutes: 30 }
];

const F2_TRAVEL_DURATION_OPTIONS = [
  { label: '3 小时', hours: 3 },
  { label: '6 小时', hours: 6 },
  { label: '12 小时（默认）', hours: 12 },
  { label: '24 小时', hours: 24 },
  { label: '48 小时', hours: 48 }
];

const F2_TRAVEL_KEYOFF_OPTIONS = [
  { label: '保持（关钥匙不动，开钥匙下翻）', retract: false, cmd: '出行钥匙保持' },
  { label: '收回（关钥匙收起，开钥匙下翻）', retract: true, cmd: '出行钥匙收回' }
];

function f2TravelKeyOffIndexByRetract(retract) {
  const idx = F2_TRAVEL_KEYOFF_OPTIONS.findIndex((o) => o.retract === !!retract);
  return idx >= 0 ? idx : 0;
}

function f2TravelHoldIndexByMin(minutes) {
  const idx = F2_TRAVEL_HOLD_OPTIONS.findIndex((o) => o.minutes === minutes);
  return idx >= 0 ? idx : 2;
}

function f2TravelDurationIndexByHours(hours) {
  const idx = F2_TRAVEL_DURATION_OPTIONS.findIndex((o) => o.hours === hours);
  return idx >= 0 ? idx : 2;
}

// 蓝牙写入队列：上一条写成功后再等 gap 才发下一条，避免串口粘包导致指令乱码
const BLE_SEND_GAP_MS = 320;
/** 翻板打开/关闭：更短间隔、优先出队，提高点击响应 */
const FLAP_BLE_SEND_GAP_MS = 200;
const BLE_ANGLE_STEP_GAP_MS = 380;
/** 演示模式：到位后切换下一步前的等待 */
const F2_DEMO_STEP_GAP_MS = 2000;
/** 演示模式：未到位时补发间隔（缩短至2秒，提高远距离成功率） */
const F2_DEMO_RESEND_INTERVAL_MS = 2000;
/** F3 MAX：翻板指令未回读到位时持续补发（须留足间隔，避免 SoftSerial/BLE 队列堵死） */
const F3_FLAP_RESEND_INTERVAL_MS = 1200;
const F3_FLAP_SEND_TIMEOUT_MS = 20000;
/** 连发循环里每次只发 1 包，不再叠 sendDataMultiple 突发 */
const F3_FLAP_LOOP_SEND_TIMES = 1;
/** 牌照仪表：关=-130° 开=45°；关→开顺时针，开→关逆时针 */
const FLAP_GAUGE_CLOSED_DEG = -130;
const FLAP_GAUGE_OPEN_DEG = 45;
const FLAP_GAUGE_CYCLE_MS = 900;
/** 到位前至少转过的圈数（保证有可见的「转动中」过程） */
const FLAP_GAUGE_MIN_LAPS = 0.75;
/** 原 32ms 约 30Hz setData，中低端机滚动时易掉帧；CSS transition 可补间 */
const FLAP_GAUGE_TICK_MS = 80;
const FLAP_GAUGE_EASE_MS = 520;
const FLAP_GAUGE_SPIN_WATCHDOG_MS = 10000;

/**
 * F3 过坑/碰胎：用户只选三档；调参改本表后发小程序即可。
 *
 * 过坑：改 needPct（越大越钝）。标准=260（原 BS1），灵敏=220，钝=380。
 *   连蓝牙时小程序按 needPct 精确判定并 BK；同步车端发最近 BS0..10。
 * 碰胎：改 open/close/ho/hc，点选发 SP（与碰胎一致，可任意数值）。
 *   固件判定 a0 < 门槛 才算堵转，门槛越低越钝；固件限幅 门槛600~1023、次数1~8。
 */
const F3_BUMP_GEAR = [
  { label: '钝', needPct: 380 },
  { label: '标准', needPct: 260 },
  { label: '灵敏', needPct: 220 }
];
const F3_STALL_GEAR = [
  { label: '钝', open: 800, close: 825, ho: 4, hc: 3 },
  { label: '标准', open: 845, close: 870, ho: 3, hc: 3 },
  { label: '灵敏', open: 890, close: 910, ho: 2, hc: 2 }
];

function f3BumpNeedToBs(needPct) {
  const n = Number(needPct);
  if (!Number.isFinite(n)) return 1;
  let s = Math.round((n - 220) / 40);
  if (s < 0) s = 0;
  if (s > 10) s = 10;
  return s;
}

function f3BumpGearOrDefault(n) {
  const i = Number(n);
  if (i === 0 || i === 1 || i === 2) return i;
  return 1;
}

function f3StallGearOrDefault(n) {
  const i = Number(n);
  if (i === 0 || i === 1 || i === 2) return i;
  return 1;
}

function normDeg360(deg) {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}
/** 高级设置：单次发送即可，避免 3 连发堆队导致灯迟闪、设置像“卡住后一起出去” */
const SETTINGS_BLE_SEND_TIMES = 1;
const SETTINGS_BLE_SEND_GAP_MS = 280;
/** 高级设置：回读未成功前等待多久再显示「数据发送中」 */
const SETTINGS_SENDING_MODAL_DELAY_MS = 3000;
/** 高级设置：自发送起等待设备回读的最长时间，超时则关闭弹窗并视为发送失败 */
const SETTINGS_BLE_VERIFY_TIMEOUT_MS = 6000;
/** 远协调试日志：指令处于「发送中」超过该时间未回传则标为失败 */
const REMOTE_ASSIST_CMD_TIMEOUT_MS = 6000;
/** 波轮：单次手指手势 UI 与蓝牙最多 ±3 格（全系列统一；松手后可继续滑） */
const OPEN_ANGLE_TICKS_PER_GESTURE = 3;
const OPEN_ANGLE_RAPID_SWIPE_WINDOW_MS = 2500;
/** 波轮：手指移动多少 px 才算拨过 1 格（1 格 = 2°，对齐 tickWidthPx） */
const OPEN_ANGLE_RULER_SENSITIVITY = 1;
/**
 * F3 MAX 打开角度步进间隔：
 * F3 固件每条指令负载重，过快会丢包；略高于 F2 保证每格都发得出去。
 * UI 仍由手指 1:1 驱动，不跟蓝牙回读。
 */
const F3_OPEN_ANGLE_BLE_STEP_GAP_MS = 320;
/** 同款 Ultra 固件：打开角度上限 180° */
const OPEN_ANGLE_ULTRA_MAX_DEG = 180;
/** 打开角度页：断连拦截层的状态巡检间隔（只在该页开着时跑） */
const OPEN_ANGLE_BLE_WATCH_MS = 600;
/** 折叠舵机角（固件 item4）：0~180，默认 150 对应 foldGap=20 */
const FOLD_SERVO_ANGLE_DEFAULT = 150;
const FOLD_SERVO_ANGLE_MIN = 0;
const FOLD_SERVO_ANGLE_MAX = 180;
const F3_MAX_FOLD_SERVO_ANGLE_MIN = 120;
const F3_MAX_OPEN_ANGLE_MAX_DEG = 180;
const FOLD_GAP_BASE = 20;
const FOLD_GAP_PER_DEG = 2;

function foldServoAngleMinForModel(model) {
  return isF3MaxModel(model) ? F3_MAX_FOLD_SERVO_ANGLE_MIN : FOLD_SERVO_ANGLE_MIN;
}

function foldGapFromServoAngle(angle) {
  const v = Math.max(
    FOLD_SERVO_ANGLE_MIN,
    Math.min(FOLD_SERVO_ANGLE_MAX, parseInt(angle, 10) || FOLD_SERVO_ANGLE_DEFAULT)
  );
  return Math.max(0, Math.min(400, FOLD_GAP_BASE + (FOLD_SERVO_ANGLE_DEFAULT - v) * FOLD_GAP_PER_DEG));
}


const { PRODUCT_DETAIL_OPTIONS, modelRequiresOtaGate, enrichScanGalleryModel } = require('../../../utils/productModels.js');
const ADMIN_BIND_MODEL_OPTIONS = PRODUCT_DETAIL_OPTIONS;

const {
  loadStoredNumLeds,
  saveStoredNumLeds,
  DEFAULT_NUM_LEDS
} = require('../../../utils/canRuntimeConfig.js');
const screenshotExempt = require('../../../utils/screenshotAdminExempt.js');
const { parseF2StatusLine, buildF2FaultModalPayload, buildF2AdvUiUpdates, buildF2FlapPanelUpdates, buildF2ConnectModalQueue, buildF2HwMonitorUpdates, buildF3HeightMonitorUpdates, buildF3HeightSettingsUpdates, packetMatchesBleVerify, F2_FAULT_ACK_CMD, buildTravelModeTip, formatF3HeightMm } = require('../../../utils/f2FaultReport.js');
const f2VoiceBridge = require('../../../utils/f2VoiceBridge.js');
const {
  geoDistanceMeters,
  geoFoldJudgeStep,
  createGeoFoldState
} = require('../../../utils/geoFoldLogic.js');
const { startGuideBtnCountdown, clearGuideBtnCountdown, GUIDE_BTN_LOCK_SEC } = require('../../../utils/guideBtnCountdown.js');

function enrichBindTarget(target) {
  if (!target) return target;
  if (target.targetType === 'fault_pending') {
    return Object.assign({}, target, {
      bindTypeLabel: '故障核验',
      cardSummary: '设备卡 SN 待录入，确认后写入新机 SN',
      actionTitle: '同步新机 SN 到设备卡',
      explainLines: [
        '新机 SN 写入用户设备卡，替换「待录入」',
        '用户蓝牙损坏，无需连接即可报修',
        '不走普通蓝牙绑定流程'
      ],
      confirmBtnText: '确认同步到设备卡'
    });
  }
  if (target.targetType === 'replacement') {
    const oldSn = String(target.oldSn || '').trim();
    const isMotherboard = target.replacementKind === 'motherboard';
    const explainLines = oldSn
      ? [
          isMotherboard ? '用户设备卡 SN 更新为当前新主板' : '用户设备卡 SN 更新为当前新机',
          `旧 SN ${oldSn} 立即失效，旧主板连接会被断开`,
          '用户需用新主板蓝牙重新连接'
        ]
      : [
          isMotherboard ? '用户设备卡 SN 更新为当前新主板' : '用户设备卡 SN 更新为当前新机',
          isMotherboard ? '主板更换状态标记为已完成' : '换机工单标记为已完成',
          '用户需用新主板蓝牙重新连接'
        ];
    return Object.assign({}, target, {
      bindTypeLabel: isMotherboard ? '更换主板' : '售后换机',
      cardSummary: oldSn
        ? `旧 SN ${oldSn} 更换为新主板`
        : (isMotherboard ? '录入更换后的新主板 SN' : '完成换机，绑定新机 SN'),
      actionTitle: isMotherboard ? '完成主板 SN 替换' : '完成换机绑定',
      explainLines,
      confirmBtnText: isMotherboard ? '确认替换主板 SN' : '确认完成换机'
    });
  }
  return target;
}

function enrichBindTargets(list) {
  return (list || []).map(enrichBindTarget);
}
const {
  scanModelToProductKey,
  productKeyToScanModel,
  isRemoteAssistProduct,
  callRemoteAssist,
  collectDeviceState,
  buildStatePatch,
  normalizeProductDetailModel: normalizeRemoteProductKey
} = require('../../../utils/remoteAssist.js');

const REMOTE_ASSIST_STORAGE_KEY = 'remote_assist_local_v1';
// 已售测高版 F3 MAX：技师端切到旧版控制台才能对上画面与指令
const LEGACY_SCAN_PAGE_URL = '/package-legacy/pages/scan/scan';
const CARD_SWIPE_MS = 260;

/* ==========================================================
 * 定点折叠（测试版）：以设点为圆心、baseRadius 为半径的圆
 * 碰到圆周任意一边（距离 ≤ 半径）即算进圈，与方位无关
 * 目前仅 F2 ULTRA 开放；抗漂移：设点校准 / 瞬移过滤 / 距离平滑
 * ========================================================== */
const GEO_FOLD_CFG_KEY = 'mt_geo_fold_cfg_v2';
const GEO_FOLD_LOG_MAX = 12;
const GEO_FOLD_REFIRE_COOLDOWN_MS = 15000;
/** 设点：至少几条合格样本、最大尝试次数、精度/聚簇阈值 */
const GEO_FOLD_SET_NEED = 3;
const GEO_FOLD_SET_MAX_TRIES = 6;
const GEO_FOLD_SET_GAP_MS = 700;
const GEO_FOLD_SET_MAX_ACC_M = 30;
const GEO_FOLD_SET_CLUSTER_M = 25;

/** 每项档位：value 为实际参与计算的数值，label 为按钮文字 */
const GEO_FOLD_OPTIONS = {
  // 目标圈半径（米）：真正的「到点」判定圈，不是提前量
  baseRadius: [
    { value: 20, label: '20m' },
    { value: 30, label: '30m' },
    { value: 50, label: '50m' },
    { value: 80, label: '80m' },
    { value: 100, label: '100m' }
  ],
  // 提前发令（秒）：预计还要 leadSec 秒进入目标圈时提前触发
  leadSec: [
    { value: 0, label: '关' },
    { value: 1, label: '1s' },
    { value: 2, label: '2s' },
    { value: 3, label: '3s' },
    { value: 5, label: '5s' }
  ],
  // 判定节流间隔（毫秒）；连续定位也按此间隔判一次
  pollMs: [
    { value: 1000, label: '1s' },
    { value: 2000, label: '2s' },
    { value: 3000, label: '3s' },
    { value: 5000, label: '5s' }
  ],
  // 连续命中几次才触发
  confirmHits: [
    { value: 1, label: '1次' },
    { value: 2, label: '2次' },
    { value: 3, label: '3次' }
  ],
  // 速度上限（km/h），超过则不触发；0 = 不限
  maxSpeedKmh: [
    { value: 0, label: '不限' },
    { value: 10, label: '10' },
    { value: 20, label: '20' },
    { value: 30, label: '30' },
    { value: 60, label: '60' }
  ],
  // 定位精度门槛（米），超过视为无效样本；0 = 不限
  accuracyLimit: [
    { value: 0, label: '不限' },
    { value: 30, label: '30m' },
    { value: 50, label: '50m' },
    { value: 80, label: '80m' }
  ]
};

const GEO_FOLD_DEFAULT_CFG = {
  baseRadius: 50,
  leadSec: 2,
  pollMs: 2000,
  confirmHits: 3,
  maxSpeedKmh: 0,
  accuracyLimit: 30,
  // 到点执行的指令：关闭 = 收起，打开 = 翻开
  triggerCmd: '关闭',
  // 只在靠近（或已在圈内）时才算命中，过滤路过/远离
  requireApproaching: true,
  // 触发一次后自动停止跟踪，避免回程再折
  autoStopAfterFire: true,
  // 触发瞬间震动提示
  vibrateOnFire: true
};

function normalizeGeoFoldCfg(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const pick = (key) => {
    const list = GEO_FOLD_OPTIONS[key] || [];
    const hit = list.find((opt) => Number(opt.value) === Number(src[key]));
    return hit ? hit.value : GEO_FOLD_DEFAULT_CFG[key];
  };
  return {
    baseRadius: pick('baseRadius'),
    leadSec: pick('leadSec'),
    pollMs: pick('pollMs'),
    confirmHits: pick('confirmHits'),
    maxSpeedKmh: pick('maxSpeedKmh'),
    accuracyLimit: pick('accuracyLimit'),
    triggerCmd: src.triggerCmd === '打开' ? '打开' : '关闭',
    requireApproaching: src.requireApproaching !== false,
    autoStopAfterFire: src.autoStopAfterFire !== false,
    vibrateOnFire: src.vibrateOnFire !== false
  };
}

function normalizeGeoFoldPoint(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const lat = Number(raw.lat);
  const lng = Number(raw.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, name: String(raw.name || '').slice(0, 40) };
}

function geoFoldClockText(ts) {
  const d = new Date(ts || Date.now());
  const pad = (n) => (n < 10 ? `0${n}` : String(n));
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

Page({
  data: {
    models: [
      enrichScanCardModel({ id: 1, name: 'F1', type: 'Pro', tag: 'SERIES 1', icon: iconF1Pro, status: 'active' }),
      enrichScanCardModel({ id: 2, name: 'F1', type: 'Max', tag: 'SERIES 1', icon: iconF1Max, status: 'next' }),
      enrichScanCardModel({ id: 8, name: 'F1', type: 'Ultra', tag: 'SERIES 1', icon: iconF1ProMax, status: 'hidden' }),
      enrichScanCardModel({ id: 3, name: 'F2', type: 'Pro', tag: 'SERIES 2', icon: iconF2Pro, status: 'hidden' }),
      enrichScanCardModel({ id: 4, name: 'F2', type: 'Max', tag: 'SERIES 2', icon: iconF2Max, status: 'hidden' }),
      enrichScanCardModel({ id: 9, name: 'F2', type: 'Ultra', tag: 'SERIES 2', icon: iconF2Ultra, status: 'hidden' }),
      enrichScanCardModel({ id: 5, name: 'F2', type: 'Long', tag: 'SERIES 2', icon: iconF2MaxLong, status: 'hidden' }),
      enrichScanCardModel({ id: 6, name: 'F3', type: 'Pro', tag: 'SERIES 3', icon: iconF3Pro, status: 'hidden' }),
      enrichScanCardModel({ id: 7, name: 'F3', type: 'Max', tag: 'SERIES 3', icon: iconF3Max, status: 'hidden' }),
      { id: 100, name: 'CAN', type: 'Learn', tag: 'OBD DEBUG', icon: iconCanLearn, status: 'hidden', canLearn: true },
    ],
    currentIndex: 0,

    isDraggingModel: false,
    modelDragOffset: 0,
    nextCardOffsetPercent: 85,
    prevCardOffsetPercent: -85,
    modelActiveScale: 1.08,
    modelSideScale: 0.86,
    nextModelScale: 0.86,
    prevModelScale: 0.86,
    activeCardOpacity: 1,
    nextCardOpacity: 0.9,
    prevCardOpacity: 0.9,

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
    remoteAssistPendingForCurrentCard: 0,
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
    showRemoteAssistStayModal: false,
    remoteAssistStayModalClosing: false,

    screenshotHourlyCount: 0,
    screenshotDailyCount: 0,

    // === 弹窗控制 ===
    showPasswordModal: false, 
    showTutorialModal: false, 
    showKeyModal: false,     
    showDisconnectTip: false,
    showModelPickTip: false,
    modelPickTipClosing: false,
    modelPickTipBtnLocked: true,
    modelPickTipBtnText: '我知道了 (5s)',
    modelPickGroups: [],
    showApproachTip: false,  // 新增：靠近车辆提示
    
    // 新增：蓝牙未开启提示弹窗
    showBluetoothAlert: false,
    bluetoothAlertClosing: false, // 蓝牙提示弹窗退出动画中
    bluetoothAlertTitle: '蓝牙未开启',
    bluetoothAlertDesc: '请在手机"设置"中打开蓝牙功能\n以便连接设备',
    showPermissionModal: false,
    permissionModalClosing: false,

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
    /** 售后换机：待选工单列表与选中项（已并入统一绑定目标） */
    showAdminRepairPicker: false,
    adminRepairPickerClosing: false,
    adminAwaitingRepairs: [],
    adminSelectedRepairId: '',
    adminSelectedRepair: null,
    /** 统一绑定目标：待换机 + 故障待录入 */
    showAdminBindPicker: false,
    adminBindPickerClosing: false,
    adminBindPickerActive: false,
    adminBindTargets: [],
    adminSelectedBindTargetId: '',
    adminSelectedBindTarget: null,
    /** 蓝牙意外断开后自动重连 */
    isBleAutoReconnecting: false,
    bleReconnectAttempt: 0,
    /** CAN Learn 测试：灯带总灯珠数 */
    canLearnNumLeds: String(DEFAULT_NUM_LEDS),
    
    // 新增：自动校准前确认 / 校准中弹窗
    showAutoCalGuideModal: false,
    autoCalGuideStage: 'check',
    autoCalGuideBtnDisabled: false,
    autoCalGuideText: '请单击按钮，观察后方是否转动',
    autoCalGuideHint: '',
    autoCalGuideBtnPressing: false,
    autoCalGuideBtnLightOn: false,
    showCalibratingModal: false,
    calibratingModalClosing: false, // 校准弹窗退出动画中
    calibratingBtnDisabled: true, // 校准弹窗按钮禁用状态

    // 打开角度：快速连滑时提示蓝牙仍在发送
    showOpenAngleSendingModal: false,
    openAngleSendingModalClosing: false,
    openAngleSendingBtnDisabled: true,
    /** 打开角度：非阻塞提示条（仅 UI 提示，不挡操作） */
    showOpenAngleSendHint: false,

    // 高级设置：回读等待弹窗（3 秒内回读成功则不出现）
    showSettingSendingModal: false,
    settingSendingModalClosing: false,
    
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
    passwordBtnText: `确认 (${GUIDE_BTN_LOCK_SEC}s)`,
    tutorialBtnLocked: true,
    tutorialBtnText: `知道了 (${GUIDE_BTN_LOCK_SEC}s)`,
    keyBtnLocked: true,
    keyBtnText: `确认 (${GUIDE_BTN_LOCK_SEC}s)`,
    angleHintBtnLocked: true,
    angleHintBtnText: `知道了 (${GUIDE_BTN_LOCK_SEC}s)`,
    
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

    // 折叠间距（由 foldServoAngle 映射，与固件 item4 限位 0~180 对齐）
    foldGap: 20,
    foldServoAngle: FOLD_SERVO_ANGLE_DEFAULT,
    
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
    isCalibrated: false,
    openAngleUiActive: false,     // 仅点预设后棍子/数字才动；波轮始终可拨
    // 打开角度页：蓝牙掉线拦截层（除左上角返回键外全页不可操作）
    openAngleBleLostVisible: false,
    openAngleBleLostRetrying: false,
    currentAngle: 0,
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
    newProductBtnText: `知道了 (${GUIDE_BTN_LOCK_SEC}s)`, // 按钮文案

    // F2 MAX / F2 ULTRA / F3 MAX 等新用户分步指引
    showCalSettingsGuide: false,
    calSettingsGuideStep: 1,
    calGuideStepTag: '',
    calGuideTitle: '',
    calGuideDesc: '',
    calGuideBtnText: '下一步',
    calGuideBtnLocked: true,
    powerOffLockGuideBtnText: '我知道了',
    powerOffLockGuideBtnLocked: true,
    calGuideArrowDir: 'down',
    calGuideBubbleStyle: '',
    calGuideArrowStyle: '',
    calGuideSpotStyle: '',
    mainControlScrollTop: 0,
    mainControlScrollAnim: false,
    mainControlScrolling: false,

    // === 新增：高级设置相关数据 ===
    showSettingsModal: false, // 控制高级设置弹窗
    settingsModalCompact: true, // 非 Ultra/F3 MAX：弹窗随内容高度，不拉满屏
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
      btDark: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxQzFDMUUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cG9seWxpbmUgcG9pbnRzPSI2LjUgNi41IDE3LjUgMTcuNSAxMiAyMyAxMiAxIDE3LjUgNi41IDYuNSAxNy41Ij48L3BvbHlsaW5lPjwvc3ZnPg==',
      moreDark: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1IiBjeT0iMTIiIHI9IjIiIGZpbGw9IiMxQzFDMUUiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIyIiBmaWxsPSIjMUMxQzFFIi8+PGNpcmNsZSBjeD0iMTkiIGN5PSIxMiIgcj0iMiIgZmlsbD0iIzFDMUMxRSIvPjwvc3ZnPg==',
      mic: iconMic
    },

    f2ControlPanelOpen: true,
    flapPanelState: 'unknown',
    flapPanelStateText: '状态未知',
    flapMotionDir: '',
    flapGaugeRotateDeg: FLAP_GAUGE_CLOSED_DEG,
    flapGaugeTransition: false,
    flapGaugeSpinning: false,
    flapGaugeSpinDir: 'open',
    showF2DemoModal: false,
    f2DemoRunning: false,
    f2DemoStatusText: '',

    // === 定点折叠（测试版，仅 F2 ULTRA） ===
    showGeoFoldModal: false,
    geoFoldOptions: GEO_FOLD_OPTIONS,
    geoFoldCfg: { ...GEO_FOLD_DEFAULT_CFG },
    geoFoldPoint: null,
    geoFoldPointText: '未设点',
    geoFoldTracking: false,
    geoFoldStatusText: '未开始',
    geoFoldDistanceText: '--',
    geoFoldRadiusText: '--',
    geoFoldEtaText: '--',
    geoFoldSpeedText: '--',
    geoFoldAccuracyText: '--',
    geoFoldTrendText: '--',
    geoFoldHitText: '0 / 3',
    geoFoldSampleCount: 0,
    geoFoldLastAt: '--',
    geoFoldLogs: [],
    geoFoldCapturingPoint: false, 
    // 滑块状态（连接后由设备状态包覆盖）
    settingState: {
      faultDetect: 'left',
      selfRepair: 'left',
      powerOn: 'right',
      shutdown: 'left',
      travelMode: 'left',
      smoothMode: 'right',
      stealthBtnExit: 'left',
      powerOffLock: 'right',
      bootPinDetect: 'left',
      multiRetry: 'right',
      heightMon: 'right'
    },

    f2StealthStatusVisible: false,
    f2StealthBleControlVisible: false,

    delayPowerOffOptions: F2_DELAY_POWER_OFF_OPTIONS,
    delayPowerOffIndex: 0,
    delayPowerOffTip: '请根据电瓶容量选择',
    f2TravelModeOn: false,
    travelHoldOptions: F2_TRAVEL_HOLD_OPTIONS,
    travelDurationOptions: F2_TRAVEL_DURATION_OPTIONS,
    travelHoldIndex: 2,
    travelDurationIndex: 2,
    travelKeyOffOptions: F2_TRAVEL_KEYOFF_OPTIONS,
    travelKeyOffIndex: 0,
    travelHoldMin: 3,
    travelDurationHours: 12,
    travelModeTip: buildTravelModeTip(3, 12, false),
    f2TravelReadbackText: '读取中…',
    f2DelayPowerReadbackText: '读取中…',
    f3PowerOffLockReadbackText: '读取中…',
    f2HwMonitorVisible: false,
    f2KeyOn: null,
    f2BtnPressed: null,
    f2KeyStatusText: '—',
    f2BtnStatusText: '—',
    f3HeightMonitorVisible: false,
    f3AttitudeVisible: false,
    f3AttitudeRollDeg: 0,
    f3AttitudeHint: '请先连接蓝牙',
    f3AttitudeSide: '—',
    f3BumpActive: false,
    f3BumpSens: 1, // 0钝 1标准 2灵敏（标准=实测 BS1）
    f3BumpSensText: '标准',
    f3StallSens: 1,
    f3StallSensText: '标准',
    f3HeightMm: null,
    f3HeightText: '—',
    f3HeightLive: false,
    f3FoldWatchText: '',
    f3DangerMm: 0,
    f3BaseMm: 0,
    f3DangerInput: '',
    f3BaseInput: '',
    f3DangerReadback: '未设置',
    f3BaseReadback: '未设置',
    f3HeightConfigModeOn: false,
    // 'imu'=陀螺仪版固件 'tof'=已售测高版固件（远协据此切旧版界面）
    f3DeviceVariant: '',
    // 控制台皮肤：进 F3 默认 TOF，BLE 判明 IMU 后再整页切换
    f3SensorUi: 'tof',
    f3SensorUiSwitching: false,
    f3SensorUiSwitchHint: '',
    f3ImuState: 0,
    f3ImuStateText: '未知',
    f3MpuOk: false,
    f3ImuLiveDegText: '—',
    f3ImuLiveVibeText: '—',
    f3ImuPeakDeg: 0,
    f3ImuMaxLeftDeg: 0,
    f3ImuMaxRightDeg: 0,
    f3ImuUpText: '未标定',
    f3ImuLeanText: '未标定',
    f3ImuVibeText: '—',
    f3ImuUpWriteOk: false,
    f3ImuLeanWriteOk: false,
    f3ImuCalWriteHint: '',
    f3ImuCalSystemHint: '尚未确认写入设备，请先完成自动校准',
    f3LightText: '—',
    f3LightOn: false,
    f3ImuReadyHintK: '',
    f3ImuReadyHintV: '',
    f3ImuLiveText: '',
    f3ImuLiveNum: '—',
    f3ImuLiveUnit: '',
    f3ImuSampleLabel: '',
    f3ImuSampleHint: '',
    f3ImuSampleHoldHint: '',
    f3ImuAvgText: '',
    f3ImuProgressPct: 0,
    f3CalCountdown: 0,
    f3DangerBlocked: false,
    f3PlateItm: null,
    f3HeightConfigLocked: false,
    f3ShowCalOverlay: false,
    f3CalStep: '',
    f3CalBranch: '',
    f3CalTitle: 'F3 自动校准',
    f3CalDesc: '',
    f3CalTargetLabel: '',
    f3CalLiveText: '',
    f3CalTargetText: '',
    f3CalWheelHint: '',
    f3CalLimitHint: '',
    f3CalPreviewAngle: FOLD_SERVO_ANGLE_DEFAULT,
    f3CalWheelSteps: 0,
    f3CalFoldGap: 20,
    f3CalMedianText: '',
    f3CalResultText: '',
    f3CalStatusText: '',
    f3CalShowHoldModal: false,
    f3CalShowVolatilityModal: false,
    f3CalTranslateX: 0,
    f3CalRulerTransition: 'none',
    f3CalTicks: [],
    f3CalPadTicks: [],
    f3CalStepNo: 0,
    f3CalStepTotal: 6,
    f3CalPreflightClosing: false,
    f3CalWriteDangerStatus: 'pending',
    f3CalWriteBaseStatus: 'pending',
    f3CalWriteDangerMm: '',
    f3CalWriteBaseMm: '',
    f3CalWriteOk: false,
    f3CalWriteResultTitle: '',
    f3CalWriteResultSub: '',
    f3HeightWriteModalVisible: false,
    f3HeightWriteModalPhase: '',
    f3HeightWriteModalLabel: '',
    f3HeightWriteModalMm: '',
    f3HeightWriteModalHint: '',
    ...buildF2ServoSpeedUi(100),
    f2SpeedSliderWidth: 0,
    f2SpeedSliderLeft: 0,
    
    // === 指示灯确认弹窗（调整按钮用）===
    showIndicatorCheckModal: false,      // 是否显示指示灯检查弹窗
    indicatorCheckModalClosing: false,   // 弹窗关闭动画状态
    pendingSendData: null,               // 待发送的数据 { sendText, type }
    hasShownSettingsIndicatorModal: false, // 🔴 标记是否已经显示过高级设置的指示灯弹窗（每次打开高级设置重置）
    
    // === 断电锁死开启引导 ===
    powerOffLockGuideStep: 0, // 0=隐藏 1=开车前需解锁 2=开机狂闪说明

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
    factoryResetBleWaitHint: '',
    factoryResetBtnAnimLightOn: false,
    factoryResetBtnAnimPressing: false,
    factoryResetBtnAnimText: '',
    factoryResetOpenAngleReady: false,
    showFactoryResetReconnectModal: false,
    stealthAnimPressing: false, // 按钮是否按下
    stealthAnimLight: false,    // 灯光状态（用于闪烁）
    stealthAnimText: '请在车把上\n长按按键 3 秒', // 提示文字
    stealthAnimTextColor: 'black', // 文字颜色
    stealthAnimTextScale: 1, // 文字缩放（用于动画）
    stealthTutorialBtnDisabled: true, // 按钮是否禁用
    stealthTutorialConfirmText: '知道了',
    stealthTutorialTimer: null, // 动画定时器
    stealthBlinkInterval: null, // 闪烁定时器
    stealthTextBlinkInterval: null, // 文字闪烁定时器（用于退出模式后5次）
  },

  /** 进入控制中心：弹「按价格找型号」引导（普通用户仅首次；管理员不弹） */
  _isAdminSkipModelPickTip() {
    if (this.data.isAdmin || this.data.isAuthorized) return true;
    const ttl = 10 * 60 * 1000;
    const keys = [
      '__scan_admin_privilege_cache__',
      '__guanliyuan_screenshot_exempt__',
      '__products_admin_privilege_cache__',
      '__shop_admin_privilege_cache__'
    ];
    for (let i = 0; i < keys.length; i++) {
      try {
        const cache = wx.getStorageSync(keys[i]);
        if (!cache || !cache.ts || (Date.now() - cache.ts >= ttl)) continue;
        if (cache.isAdmin === true || cache.isAuthorized === true || cache.isGuanliyuan === true) {
          return true;
        }
      } catch (e) { /* ignore */ }
    }
    return false;
  },

  _maybeShowModelPickTip() {
    setTimeout(() => {
      // 已经进入详情页就不打扰
      if (this.data.showDetail) return;
      // 管理员不弹
      if (this._isAdminSkipModelPickTip()) return;
      try {
        if (wx.getStorageSync('scan_model_pick_tip_seen_v1')) return;
      } catch (e) { /* ignore */ }
      // 按三大系列（+F2 Long）分块：图标认外观 → 价格认配置
      const TYPE_BADGE = { Pro: '标准版', Max: '高级版', Ultra: '旗舰款', Long: '加长款' };
      const groups = [];
      const groupMap = {};
      (this.data.models || []).forEach((m) => {
        if (!m.priceDisplay || m.canLearn) return;
        const isLong = m.name === 'F2' && m.type === 'Long';
        const key = isLong ? 'F2 Long' : m.name;
        if (!groupMap[key]) {
          groupMap[key] = {
            series: key,
            title: isLong ? 'F2 Long' : `${m.name} 系列`,
            badge: isLong ? '加长款' : '',
            icon: m.icon || '',
            items: []
          };
          groups.push(groupMap[key]);
        }
        groupMap[key].items.push({
          type: m.type,
          badge: TYPE_BADGE[m.type] || m.type,
          priceDisplay: m.priceDisplay
        });
      });
      // 二次确认：云端管理员身份可能刚回填
      if (this._isAdminSkipModelPickTip()) return;
      this.setData({ showModelPickTip: true, modelPickGroups: groups }, () => {
        startGuideBtnCountdown(this, {
          lockedKey: 'modelPickTipBtnLocked',
          textKey: 'modelPickTipBtnText',
          readyText: '我知道了',
          seconds: 5,
          lockedText: (n) => `我知道了 (${n}s)`,
          timerProp: '_modelPickTipBtnTimer'
        });
      });
    }, 600);
  },

  _dismissModelPickTipForAdmin() {
    if (!this.data.showModelPickTip && !this.data.modelPickTipClosing) return;
    clearGuideBtnCountdown(this, '_modelPickTipBtnTimer');
    this.setData({
      showModelPickTip: false,
      modelPickTipClosing: false,
      modelPickTipBtnLocked: true,
      modelPickTipBtnText: '我知道了 (5s)'
    });
  },

  closeModelPickTip() {
    if (this.data.modelPickTipBtnLocked) return;
    clearGuideBtnCountdown(this, '_modelPickTipBtnTimer');
    try {
      wx.setStorageSync('scan_model_pick_tip_seen_v1', true);
    } catch (e) { /* ignore */ }
    this.setData({ modelPickTipClosing: true });
    setTimeout(() => {
      this.setData({ showModelPickTip: false, modelPickTipClosing: false });
    }, 250);
  },


  onLoad(options) {
    migrateLegacyOnboardingGuideFlags();
    // 🔴 计算导航栏高度（适配所有机型）
    this.calcNavBarInfo();
    const hasAdminBindWorkflow = !!(
      options &&
      (options.pendingSnUser || options.replacementRepairId)
    );
    if (!hasAdminBindWorkflow) this._maybeShowModelPickTip();
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
    this._detailClosing = false;
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
    try {
      // v4：两端都是 UI 三档 0钝/1标准/2灵敏
      let bump = 1;
      const ver4 = wx.getStorageSync('f3_gear_v4');
      if (ver4 === 1 || ver4 === '1') {
        bump = f3BumpGearOrDefault(wx.getStorageSync('f3_bump_sens'));
      } else {
        const legacy = Number(wx.getStorageSync('f3_bump_sens'));
        // 旧固件 BS1≈标准；其余收拢到标准，避免怪档
        if (legacy === 0) bump = 2; // 旧最敏一侧 → 灵敏
        else if (legacy === 1) bump = 1;
        else bump = 1;
        try {
          wx.setStorageSync('f3_bump_sens', bump);
          wx.setStorageSync('f3_gear_v4', 1);
        } catch (e2) { /* ignore */ }
      }
      const stall = f3StallGearOrDefault(wx.getStorageSync('f3_stall_sens'));
      this.setData({
        f3BumpSens: bump,
        f3BumpSensText: F3_BUMP_GEAR[bump].label,
        f3StallSens: stall,
        f3StallSensText: F3_STALL_GEAR[stall].label
      });
    } catch (e) { /* ignore */ }
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
    this._registerF2VoiceBridge();
    
    // 重置跳转标记
    this.setData({ isNavigatingToOta: false });
    
    this.ble.onConnecting = (device) => {
      if (isBlockedDebugBleDevice(device)) {
        this._rejectBlockedDebugBleDevice(device, 'connecting');
        return;
      }
      if (device) this._lastBleDevice = device;
      this._connectingStartedAt = Date.now();
      this.setData({
        isScanning: false,
        isConnecting: true
      });
    };

    this.ble.onDebugDeviceBlocked = (device) => {
      this._rejectBlockedDebugBleDevice(device, 'blocked');
    };

    this.ble.onLinkEstablished = (device) => {
      if (isBlockedDebugBleDevice(device)) {
        this._rejectBlockedDebugBleDevice(device, 'link');
        return;
      }
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
      if (isBlockedDebugBleDevice(device)) {
        this._rejectBlockedDebugBleDevice(device, 'connected');
        return;
      }
      const rawName = device.name || device.localName || '';
      const normalizedSn = this.normalizeSnFromBluetoothName(rawName);
      this._lastBleDevice = device;
      this._activeBleDeviceId = device.deviceId || '';
      this._bleReconnectStoppedByUser = false;
      this._clearBleReconnectTimers();

      if (this.data.showFactoryResetReconnectModal && this.data.showFactoryResetModal) {
        this.setData({ showFactoryResetReconnectModal: false });
        if (this.ble) this.ble.preferredDeviceId = '';
      }

      // 记录本次连接对应的机型卡片（避免滑走卡片后状态包被错误过滤）
      this._bleSessionModel = this._bleStatusTargetModel();

      const numMatch = rawName.replace(/[^0-9]/g, '');
      const finalName = numMatch ? `MT-ID:${numMatch}` : rawName;

      // 系统 BLE 已连通：先更新 UI，再挂 notify 回调（须 isConnected/GATT 就绪）
      this._applyBleLinkUi({
        isConnected: true,
        isScanning: false,
        isConnecting: false,
        isBleAutoReconnecting: false,
        bleReconnectAttempt: 0,
        connectedDeviceName: finalName,
        currentConnectedRawSn: normalizedSn || ''
      }, () => {
        this._ensureF2StatusBleListener(true);
        this._scheduleRemoteStatePush();
        this._bleConnectGraceUntil = Date.now() + 8000;
        this._bleConnProbeFailStreak = 0;
        this._bleGattProbeFailStreak = 0;
        this._startBleLinkWatch();
        // 把本机过坑/碰胎三档对应数值同步到车端（仅 IMU 固件认这些指令）
        try {
          if (isF3MaxModel(this.data.currentModel) && this.data.f3SensorUi === 'imu') {
            this._f3SyncBumpGearToDevice({ quiet: true });
            this._f3SyncStallGearToDevice({ quiet: true });
          }
        } catch (e) { /* ignore */ }
      });

      try {
        if (normalizedSn) {
          await this.ensureAdminPrivilegeForSnFlow();
        }

        if (normalizedSn && !this.data.isAdmin) {
          const snOk = await this._checkConnectedSnAllowed(normalizedSn);
          if (!snOk) {
            this.ble.disconnect(true);
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
          await this._maybeShowAdminBindPickerThenSn(normalizedSn);
        }

        this._publishBleToVoiceBridge(true);
        this._flushPendingBleIntent();
        this._markScanBleConnectedOnce();
      } catch (err) {
        console.error('❌ [onConnected] 连接后校验失败', err);
        this.ble.disconnect(true);
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
      const errMsg = String((err && err.message) || (err && err.errMsg) || '');
      const isTimeout = errMsg.indexOf('connect_timeout') >= 0
        || errMsg.indexOf('gatt_timeout') >= 0
        || errMsg.indexOf('timeout') >= 0;
      const shouldReconnect = !manual && !this._bleReconnectStoppedByUser && this._lastBleDevice;
      if (isTimeout && !manual) {
        this._showCustomToast(
          shouldReconnect ? '连接超时，正在重试…' : '连接超时，请点击重新连接',
          'none',
          2200
        );
      }
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
      const kind = classifyBleError(err);
      if (kind === 'auth') {
        this.setData({ showPermissionModal: true });
        return;
      }
      if (kind === 'system_auth' || kind === 'location' || kind === 'off') {
        this._handleBleInitFailure(err);
        return;
      }
      console.warn('[BLE] runtime error', err);
    };
    this.ble.onDisconnected = (meta) => {
      this._stopBleLinkWatch();
      this.onBleDisconnected(meta);
    };

    this.ble._ensureConnectionStateListener();
    if (!this._bleAdapterListenerSetup) {
      this._bleAdapterListenerSetup = true;
    wx.onBluetoothAdapterStateChange((res) => {
      if (!res.available && (this.data.isConnected || this.data.uiBleConnected)) {
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
    this._bleSendQueue = [];
    this._bleSendDraining = false;
    this._openAngleFullSwipeTimes = [];

    // 计算 px 比例 (CSS bar宽度6px + 间距14px = 20px)
    // 🔴 获取状态栏高度（已在 onLoad 中设置过，这里无需重复声明 winInfo）
    // 直接复用 onLoad 中写入的 statusBarHeight，避免重复声明变量
    // const winInfo2 = wx.getWindowInfo();
    // this.setData({ statusBarHeight: winInfo2.statusBarHeight || 44 });
    
    // 注意：CSS中使用的是px单位，所以直接计算px
    this.tickWidthPx = 20; // 每个刻度总宽度20px

    // 初始化位置：UI 刻度统一 0~180°（内部/蓝牙上限仍按机型）
    this.maxAngle = 180;

    // 生成刻度数据 (扩展到更多刻度，实现无限滑动视觉效果)
    const count = (this.maxAngle - 0) / 2 + 1;
    const extendedCount = Math.max(count + 100, 200); // 至少200个刻度，支持无限滑动
    const ticks = new Array(Math.floor(extendedCount)).fill(0);
    this.setData({ ticks });

    // 强制更新一次视图到 0度
    this.updateRuler(0, false);
    
    // 🔴 管理员检查延后到首帧后，避免首屏进入卡顿
    setTimeout(() => {
      this.checkAdminPrivilege();
      this._refreshRemoteAssistCardFlags();
    }, 80);

    if (options && options.pendingSnUser) {
      this._pendingSnEntryUser = decodeURIComponent(options.pendingSnUser);
      this._pendingSnEntryModel = options.pendingSnModel
        ? decodeURIComponent(options.pendingSnModel)
        : '';
    }
    if (options && options.replacementRepairId) {
      this._pendingReplacementRepairId = decodeURIComponent(options.replacementRepairId);
      this._autoStartReplacementBle = true;
    }
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
          this.setData({ isAdmin: cache.isAdmin }, () => {
            if (cache.isAdmin) {
              this._dismissModelPickTipForAdmin();
              this._refreshRemoteAssistCardFlags();
              this._startRemoteAssistPendingPoll();
              this._tryPendingSnEntryHint();
            }
          });
        } else if (cache.isAdmin) {
          this._dismissModelPickTipForAdmin();
          this._startRemoteAssistPendingPoll();
          this._tryPendingSnEntryHint();
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
          this._dismissModelPickTipForAdmin();
          this._refreshRemoteAssistCardFlags();
          this._startRemoteAssistPendingPoll();
          this._tryPendingSnEntryHint();
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
      'showSettingSendingModal',
      'showConnectBluetoothTip',
      'showOtaTip',
      'showIndicatorCheckModal',
      'showStealthTutorial',
      'powerOffLockGuideStep',
      'showFactoryResetModal',
      'showFactoryResetReconnectModal',
      'showAngleHint',
      'showNewProductHint',
      'showBluetoothAlert',
      'showPermissionModal',
      'isNavigatingToOta',
      'passwordModalClosing',
      'tutorialModalClosing',
      'keyModalClosing',
      'indicatorCheckModalClosing',
      'calibratingModalClosing',
      'openAngleSendingModalClosing',
      'settingSendingModalClosing',
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
    this._resumeOpenAngleBleWatch();
    
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

    if (this.data.isConnected && !isF2MaxStatusBleModel(this._bleStatusTargetModel())) {
      this._tickBleLinkWatch();
      if (!this._bleLinkWatchTimer) this._startBleLinkWatch();
    }
    if (this._isBleLinked()) {
      this._ensureF2StatusBleListener();
    }

    this._resumeRemoteAssistPollers();
    this._restoreRemoteAssistLocal();
    this._ensureDetailLayerVisible();
    if (this.data.isAdmin) {
      this._startRemoteAssistPendingPoll();
      this._pollRemoteAssistPending();
    } else {
      // 权限检查可能晚于 onShow，补一次轮询启动
      setTimeout(() => {
        if (this.data.isAdmin) {
          this._startRemoteAssistPendingPoll();
          this._pollRemoteAssistPending();
        }
      }, 350);
    }

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
    let deviceInfo = '';
    let phoneModel = '';
    try {
      const d = wx.getDeviceInfo ? wx.getDeviceInfo() : {};
      deviceInfo = d.system || '';
      phoneModel = d.model || '';
    } catch (e) { /* ignore */ }
    wx.cloud.callFunction({
      name: 'banUserByScreenshot',
      data: {
        type,
        banPage: 'scan',
        deviceInfo,
        phoneModel
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
    // 小程序后台拿不到稳定定位，切后台一律停跟踪并告知原因
    this._stopGeoFoldTracking('页面切到后台');
    this._clearOpenAngleBleWatchTimer();
    this._stopFlapGaugeSpinImmediate();
    this._clearF3CalTimer();
    this._clearMainControlScrollIdle();
    this._flushPendingBleUiPatch(true);
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
    this._stopFlapGaugeSpinLoop();
    this._clearFlapGaugeEaseTimer();
    this._clearF3CalTimer();
    this._clearSettingSendingWatch();
    clearGuideBtnCountdown(this, '_modelPickTipBtnTimer');
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
    if (this._calSettingsGuideTimer) {
      clearInterval(this._calSettingsGuideTimer);
      this._calSettingsGuideTimer = null;
    }
    if (this._calSettingsGuideStartTimer) {
      clearTimeout(this._calSettingsGuideStartTimer);
      this._calSettingsGuideStartTimer = null;
    }
    if (this.ble) {
      this._stopBleLinkWatch();
      this.stopBleAutoReconnect(false, true);
      // 先释放可能挂起的连接（此时 this.ble.device 还没赋值，disconnect 管不到它）
      this.ble.cancelPendingConnect();
      this.ble.disconnect(true);
    }
    if (typeof this._teardownScreenshotProtection === 'function') {
      this._teardownScreenshotProtection();
    }
    f2VoiceBridge.clearBridge();
    this._stopF2DemoMode(false);
    this._stopGeoFoldTracking('页面卸载');
    this._clearOpenAngleBleWatchTimer();
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

  /** 技师端远协：指令经云端转发到用户手机蓝牙 */
  _isRemoteAssistAdminRelay() {
    return this._isRemoteAssistAdminActive();
  },

  _guardRemoteAssistAdminRelay(showToast = true) {
    if (!this._isRemoteAssistAdminRelay()) return false;
    if (!this.data.remoteAssistUserAccepted) {
      if (showToast) {
        this._showCustomToast('等待用户接受远协', 'none', 2200);
      }
      return false;
    }
    if (this.data.remoteSessionBleConnected) return true;
    if (showToast) {
      this._showCustomToast('用户蓝牙未连接，无法控制', 'none', 2200);
    }
    return false;
  },

  _relayBleCommand(text, times = 1, interval = 0) {
    if (!text || !this._guardRemoteAssistAdminRelay()) return false;
    this._remoteAssistEnqueueCommand(text, times, interval);
    return true;
  },

  _isRemoteAssistUserSessionActive() {
    return this.data.remoteAssistRole === 'user' &&
      !!this.data.remoteAssistSessionId &&
      this.data.remoteAssistSessionStatus === 'active' &&
      !!this.data.remoteAssistUserAccepted;
  },

  /** 远协上报用：避免链路探测误报导致云端 bleConnected 闪断 */
  _getRemoteAssistPushBleConnected() {
    if (this._isBleLinked()) {
      this._remoteAssistBlePushTrueAt = Date.now();
      return true;
    }
    const graceMs = this._isRemoteAssistUserSessionActive() ? 8000 : 3000;
    if (this._remoteAssistBlePushTrueAt &&
        Date.now() - this._remoteAssistBlePushTrueAt < graceMs) {
      return true;
    }
    return false;
  },

  /** 技师端展示用：连续多次读到 false 才显示断开 */
  _resolveAdminRemoteBleConnected(session) {
    const raw = !!(session && session.bleConnected);
    if (raw) {
      this._adminRemoteBleFalseStreak = 0;
      return true;
    }
    this._adminRemoteBleFalseStreak = (this._adminRemoteBleFalseStreak || 0) + 1;
    if (this.data.remoteSessionBleConnected && this._adminRemoteBleFalseStreak < 5) {
      return true;
    }
    return false;
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
      timeout: '发送失败'
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
      if (now - l.enqueueAt < REMOTE_ASSIST_CMD_TIMEOUT_MS) return l;
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

  _isBleLinked() {
    if (this.data.isConnected) return true;
    // 兜底：胶囊已显示连接且 GATT 就绪时，避免 UI/逻辑标志短暂不同步
    const ble = this.ble;
    const liveId = ble && ble.device && ble.device.deviceId;
    if (liveId && liveId === this._activeBleDeviceId && ble.serviceId && this._getBleWriteCharacteristicId()) {
      return true;
    }
    return false;
  },

  /** 本机蓝牙或技师远协（用户端已连蓝牙）均可下发指令 */
  _canSendBleCommand() {
    if (this._isRemoteAssistAdminRelay()) {
      return !!this.data.remoteSessionBleConnected;
    }
    return this._isBleLinked();
  },

  // 是否允许点击控制区、进入子页面等（管理员未连蓝牙也可操作 UI）
  _canControlDevice() {
    if (this.data.isAdmin) return true;
    if (this._isRemoteAssistAdminActive()) return true;
    return this._isBleLinked();
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

  /** 会话对应设备是否为已售测高（TOF）版 F3 MAX */
  _remoteSessionIsLegacyTof(session) {
    const rawKey = (session && session.productKey) ||
      this.data.remoteAssistSessionProductKey || '';
    if (normalizeRemoteProductKey(rawKey) !== 'F3 MAX') return false;
    const st = (session && session.deviceState) || null;
    if (!st) return false;
    if (st.f3DeviceVariant === 'tof') return true;
    if (st.f3DeviceVariant === 'imu') return false;
    // 用户端还没推代次字段时：有测高读数即判旧机
    return st.f3HeightMm != null || Number(st.f3DangerMm) > 0;
  },

  /** 旧机远协：把会话交给旧版控制台（画面与指令与用户设备一致） */
  _handoffRemoteAssistToLegacy(session) {
    const ts = Date.now();
    if (this._raLegacyHandoffAt && ts - this._raLegacyHandoffAt < 5000) return true;
    const sessionId = (session && session._id) || this.data.remoteAssistSessionId;
    if (!sessionId) return false;
    this._raLegacyHandoffAt = ts;
    const productKey = (session && session.productKey) ||
      this.data.remoteAssistSessionProductKey || '';
    try {
      wx.setStorageSync(REMOTE_ASSIST_STORAGE_KEY, {
        remoteAssistRole: 'admin',
        remoteAssistSessionId: sessionId,
        remoteAssistSessionStatus: (session && session.status) || 'active',
        remoteAssistSessionProductKey: productKey,
        remoteAssistUserAccepted: !!(session && session.userAccepted)
      });
    } catch (e) { /* ignore */ }
    this._stopRemoteAssistSessionPollers();
    this.setData({
      remoteAssistRole: '',
      remoteAssistSessionId: '',
      remoteAssistSessionStatus: '',
      remoteAssistSessionProductKey: '',
      remoteAssistUserAccepted: false,
      remoteSessionBleConnected: false,
      remoteAssistCapsuleActive: false
    });
    this._showCustomToast('旧版设备，切换旧版控制台', 'none', 2000);
    wx.navigateTo({
      url: `${LEGACY_SCAN_PAGE_URL}?raLegacy=1`,
      fail: (err) => {
        console.warn('[远协] 打开旧版控制台失败', err);
        this._raLegacyHandoffAt = 0;
        this._showCustomToast('打开旧版控制台失败', 'none', 2400);
      }
    });
    return true;
  },

  _isRemoteAssistUserLocked() {
    return this.data.remoteAssistRole === 'user' &&
      this.data.remoteAssistSessionStatus === 'active' &&
      (!!this.data.remoteAssistUserAccepted || !!this.data.remoteAssistConsentVisible);
  },

  _findModelIndexByProductKey(productKey) {
    const pk = String(productKey || '').trim();
    if (!pk) return -1;
    const target = productKeyToScanModel(pk);
    if (target) {
      const idx = this.data.models.findIndex(
        (m) => !m.canLearn && m.name === target.name && m.type === target.type
      );
      if (idx >= 0) return idx;
    }
    return this.data.models.findIndex((m) => scanModelToProductKey(m) === pk);
  },

  _jumpToCardAndOpenDetail(idx, detailPatch, done) {
    const total = this.data.models.length;
    const safeCurrent = Math.max(0, Math.min(total - 1, Number(idx) || 0));
    const currentModel = this.data.models[safeCurrent];
    if (!currentModel) {
      if (typeof done === 'function') done();
      return;
    }
    const patch = { ...(detailPatch || {}), currentModel };
    this.updateCardStatus(safeCurrent, () => {
      if (!this.data.showDetail) {
        this._openDetailAnimated(patch, () => {
          this._maybeShowCalSettingsGuide(currentModel);
        });
        if (typeof done === 'function') {
          wx.nextTick(done);
        }
        return;
      }
      this._ensureDetailLayerVisible();
      this.setData(patch, () => {
        this._maybeShowCalSettingsGuide(currentModel);
        if (typeof done === 'function') done();
      });
    });
  },

  _ensureDetailLayerVisible() {
    if (!this.data.showDetail) return;
    if (this.data.detailEnterAnim) return;
    this.setData({ detailEnterAnim: true, blockDetailTouch: false });
  },

  _ensureRemoteAssistAdminDetailView(session) {
    const productKey = (session && session.productKey) ||
      this.data.remoteAssistSessionProductKey || '';
    const idx = this._findModelIndexByProductKey(productKey);
    const targetIdx = idx >= 0 ? idx : this.data.currentIndex;
    const currentModel = this.data.models[targetIdx];
    if (!currentModel) return;
    const isF1 = currentModel.name && currentModel.name.includes('F1');
    const bleLinked = !!(session && session.bleConnected) || !!this.data.remoteSessionBleConnected;
    this._jumpToCardAndOpenDetail(targetIdx, {
      angleBtnText: resolveOpenAngleBtnText(currentModel),
      f2ControlPanelOpen: true,
      ...buildRemoteAssistAdminExtras(
        currentModel,
        this.data.settingState,
        bleLinked
      )
    });
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

      // 技师端恢复旧机会话：直接回旧版控制台，别在新版界面上盲控
      if (saved.remoteAssistRole === 'admin' &&
          session.status !== 'ended' &&
          this._remoteSessionIsLegacyTof({ ...session, productKey })) {
        if (this._handoffRemoteAssistToLegacy({ ...session, productKey })) return;
      }

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
          this._ensureRemoteAssistAdminDetailView(session);
          this._startRemoteAssistAdminPoll();
        }
      });
    } catch (e) {
      console.warn('[远协] 恢复会话失败', e);
    }
  },

  _dispatchRemoteAssistBleCmd(cmd, times, gapAfterMs) {
    const text = String(cmd || '');
    const base = text.replace(/#$/, '');
    const gap = Math.max(Number(gapAfterMs) || 0, BLE_SEND_GAP_MS);
    const n = Math.min(5, Math.max(1, Number(times) || 1));

    if (/^(DA|TB)/i.test(base)) {
      const full = `${base}#`;
      const parts = full.split('');
      this._f3HeightBleTxActive = true;
      this._bumpF3HeightBleGrace(parts.length * 280 + 8000);
      parts.forEach((ch, idx) => {
        this._enqueueBleSend(ch, 280, {
          f3HeightChar: true,
          f3HeightIdx: idx,
          f3HeightTotal: parts.length
        });
      });
      return;
    }
    if (/^M[01]$/i.test(base)) {
      for (let i = 0; i < n; i++) {
        this._enqueueBleSend(`${base}#`, gapAfterMs != null ? gapAfterMs : 1000);
      }
      return;
    }
    const f3Fold = base.toUpperCase();
    if (f3Fold === 'F3FR') {
      this._enqueueBleSend('F3FR#', 250);
      this._enqueueBleSend('F3FR#', 250);
      return;
    }
    if (f3Fold === 'F3FU' || f3Fold === 'F3FD') {
      const wire = f3Fold === 'F3FU' ? 'F3FU#' : 'F3FD#';
      this._enqueueBleSendBurst(wire, n, 120);
      return;
    }
    for (let i = 0; i < n; i++) {
      this._enqueueBleSend(text, gap);
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
      const gap = Math.max(interval > 0 ? interval : 300, BLE_SEND_GAP_MS);
      this._dispatchRemoteAssistBleCmd(cmd, times, gap);
      const flapBase = String(cmd || '').replace(/#$/, '');
      if ((flapBase === '打开' || flapBase === '关闭') && isMtUltraCardModel(this.data.currentModel)) {
        this._setFlapPanelStateOptimistic(flapBase);
      }
      this._waitBleSendQueueIdle(12000).then((ok) => {
        if (ok) {
          setTimeout(() => this._pushRemoteDeviceState(true), 450);
        }
        resolve(ok);
      });
    });
  },

  _waitBleSendQueueIdle(timeoutMs) {
    return new Promise((resolve) => {
      const started = Date.now();
      const tick = () => {
        if (this.data.remoteAssistRole !== 'user' || !this._isBleWriteReady()) {
          resolve(false);
          return;
        }
        const pending = (this._bleSendQueue && this._bleSendQueue.length) || 0;
        if (!this._bleSendDraining && pending === 0) {
          resolve(true);
          return;
        }
        if (Date.now() - started > timeoutMs) {
          resolve(false);
          return;
        }
        setTimeout(tick, 40);
      };
      tick();
    });
  },

  _recalcRemoteAssistPendingForCard() {
    if (!this.data.isAdmin) return;
    const sessions = this.data.remoteAssistPendingSessions || [];
    const model = this.data.models[this.data.currentIndex];
    const cardKey = model ? scanModelToProductKey(model) : '';
    const cardSessions = cardKey
      ? sessions.filter((s) => s.productKey === cardKey)
      : [];
    const cardPending = cardSessions.length > 0;
    if (cardPending === this.data.remoteAssistPendingForCard &&
        cardSessions.length === (this.data.remoteAssistPendingForCurrentCard || 0)) {
      return;
    }
    this.setData({
      remoteAssistPendingForCard: cardPending,
      remoteAssistPendingForCurrentCard: cardSessions.length
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
      if (this.data.isAdmin) this._pollRemoteAssistPending();
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
    const merged = { ...patch };
    const model = this._bleStatusTargetModel();
    if (merged.isConnected !== undefined && isF2MaxStatusBleModel(model)) {
      Object.assign(merged, this._resetF2HwMonitorState(!!merged.isConnected, model));
    }
    if (isF2MaxModel(model) || isMtUltraCardModel(model)) {
      const nextData = { ...this.data, ...merged };
      Object.assign(merged, buildF2StealthUiFlags(
        model,
        nextData.settingState,
        resolveF2BleLinkedForUi(nextData)
      ));
    }
    this.setData(merged, () => {
      this._syncUiBleConnected();
      this._syncOpenAngleBleLostMask();
      if (merged.isConnected) {
        this._ensureF2StatusBleListener(true);
      }
      if (callback) callback();
    });
  },

  _isStaleBleDisconnect(meta) {
    const lostId = meta && meta.device && meta.device.deviceId;
    if (!lostId) return false;
    const now = Date.now();
    if (lostId === this._bleDisconnectHandledId &&
      (now - (this._bleDisconnectHandledAt || 0)) < 500) {
      return true;
    }
    const activeId = this._activeBleDeviceId ||
      (this.ble && this.ble.device && this.ble.device.deviceId) || '';
    if (activeId && lostId !== activeId) return true;
    return false;
  },

  _formatRemoteAssistSessionLabel(session) {
    if (!session) return '';
    const sn = session.deviceSn ||
      (session.deviceState && session.deviceState.connectedDeviceName) || '未知设备';
    const ble = session.bleConnected ? '已连蓝牙' : '未连蓝牙';
    return `${sn} · ${ble}`;
  },

  _remoteAssistPendingSignature(sessions) {
    return (sessions || []).map((s) => s._id || '').join(',');
  },

  _notifyRemoteAssistPendingArrival(prevCount, nextCount, prevSig, nextSig) {
    if (!this.data.isAdmin) return;
    if (this.data.remoteAssistRole === 'admin' && this.data.remoteAssistSessionId) return;
    if (nextCount <= 0) return;
    if (nextCount > prevCount || (prevSig !== nextSig && nextCount >= prevCount && prevCount === 0)) {
      const sessions = this.data.remoteAssistPendingSessions || [];
      const first = sessions[0];
      const modelHint = first && first.productKey ? ` · ${first.productKey}` : '';
      this._showCustomToast(`有新的远协请求${modelHint}`, 'none', 2200);
    }
  },

  _stopRemoteAssistSessionPollers() {
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
    if (this._remoteStatePushTimer) {
      clearTimeout(this._remoteStatePushTimer);
      this._remoteStatePushTimer = null;
    }
  },

  _stopRemoteAssistPollers() {
    this._stopRemoteAssistSessionPollers();
    if (this._remoteAssistPendingPollTimer) {
      clearInterval(this._remoteAssistPendingPollTimer);
      this._remoteAssistPendingPollTimer = null;
    }
  },

  _resumeRemoteAssistPollers() {
    if (this.data.remoteAssistSessionId && this.data.remoteAssistRole === 'user') {
      this._startRemoteAssistUserPoll();
    }
    if (this.data.remoteAssistSessionId && this.data.remoteAssistRole === 'admin') {
      this._startRemoteAssistAdminPoll();
    }
    if (this.data.isAdmin) {
      this._startRemoteAssistPendingPoll();
    }
  },

  _startRemoteAssistPendingPoll() {
    if (!this.data.isAdmin) return;
    if (this._remoteAssistPendingPollTimer) return;
    this._pollRemoteAssistPending();
    this._remoteAssistPendingPollTimer = setInterval(() => {
      this._pollRemoteAssistPending();
    }, 1500);
  },

  async _pollRemoteAssistPending() {
    if (!this.data.isAdmin) return;
    if (this.data.remoteAssistRole === 'admin' && this.data.remoteAssistSessionId) return;
    try {
      const r = await callRemoteAssist({ action: 'hasPending', all: true });
      const sessions = r.sessions || (r.session ? [r.session] : []);
      const model = this._getRemoteAssistModel();
      const cardKey = scanModelToProductKey(model);
      const cardSessions = cardKey
        ? sessions.filter((s) => s.productKey === cardKey)
        : [];
      const firstId = sessions[0] ? sessions[0]._id : '';
      const count = sessions.length;
      const cardPending = cardSessions.length > 0;
      const nextSig = this._remoteAssistPendingSignature(sessions);
      const prevCount = this.data.remoteAssistPendingCount || 0;
      const prevSig = this._remoteAssistPendingSignature(this.data.remoteAssistPendingSessions);
      if (
        nextSig === prevSig &&
        cardPending === !!this.data.remoteAssistPendingForCard &&
        cardSessions.length === (this.data.remoteAssistPendingForCurrentCard || 0)
      ) {
        return;
      }
      this.setData({
        remoteAssistPendingForCard: cardPending,
        remoteAssistPendingForCurrentCard: cardSessions.length,
        remoteAssistPendingSessionId: firstId,
        remoteAssistPendingSessions: sessions,
        remoteAssistPendingCount: count
      }, () => {
        this._notifyRemoteAssistPendingArrival(prevCount, count, prevSig, nextSig);
      });
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
        remoteAssistConsentVisible: status === 'active',
        showRemoteAssistStayModal: true,
        remoteAssistStayModalClosing: false
      });
      this._saveRemoteAssistLocal();
      wx.setKeepScreenOn({ keepScreenOn: true });
      this._startRemoteAssistUserPoll();
      if (typeof this.updateModalState === 'function') this.updateModalState();
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
      this._showCustomToast('暂无远协请求', 'none', 2000);
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
      if (this._remoteSessionIsLegacyTof(r.session)) {
        if (this._handoffRemoteAssistToLegacy(r.session)) return;
      }
      this._enterRemoteAssistAdmin(r.session);
    } catch (err) {
      this._showCustomToast(err.message || '接入失败', 'none', 2200);
      this._pollRemoteAssistPending();
    }
  },

  _enterRemoteAssistAdmin(session) {
    if (!session) return;
    const productKey = session.productKey;
    const idx = this._findModelIndexByProductKey(productKey);
    const targetIdx = idx >= 0 ? idx : this.data.currentIndex;
    const currentModel = this.data.models[targetIdx];
    if (!currentModel) return;
    const isF1 = currentModel.name && currentModel.name.includes('F1');
    const bleLinked = !!session.bleConnected;
    this._resetRemoteAssistDebugLogsMem();
    this.setData({
      remoteAssistRole: 'admin',
      remoteAssistSessionId: session._id,
      remoteAssistSessionStatus: session.status || 'active',
      remoteAssistSessionProductKey: productKey,
      remoteAssistUserAccepted: !!session.userAccepted,
      remoteAssistPendingForCard: false,
      remoteAssistPendingSessionId: '',
      remoteAssistPendingSessions: [],
      remoteAssistPendingCount: 0,
      remoteSessionBleConnected: bleLinked,
      remoteAssistLastCmdAt: 0,
      remoteAssistDebugLogs: []
    }, () => {
      this._saveRemoteAssistLocal();
      this._applyRemoteDeviceState(session.deviceState);
      this._syncUiBleConnected();
      if (!session.userAccepted) {
        this._showCustomToast('已接入，等待用户接受', 'none', 2200);
      }
      this._jumpToCardAndOpenDetail(targetIdx, {
        angleBtnText: resolveOpenAngleBtnText(currentModel),
        f2ControlPanelOpen: true,
        ...buildRemoteAssistAdminExtras(
          currentModel,
          (session.deviceState && session.deviceState.settingState) || this.data.settingState,
          bleLinked
        )
      }, () => {
        this._startRemoteAssistAdminPoll();
      });
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
          patch.showRemoteAssistStayModal = false;
          patch.remoteAssistStayModalClosing = false;
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
                bleConnected: this._getRemoteAssistPushBleConnected(),
                deviceSn: this.data.currentConnectedRawSn || '',
                deviceState: collectDeviceState(this)
              });
            } catch (e) {
              console.warn('[远协] pushState 回传执行结果失败', e);
            }
          }
        }
        if (!execOk) {
          await this._pushRemoteDeviceState(true);
        }
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
      
      let session = r.session;
      if (!session || session.status === 'ended') {
        let liveSession = session;
        if (!liveSession || liveSession.status === 'ended') {
          await new Promise((resolve) => setTimeout(resolve, 500));
          if (this.data.remoteAssistSessionId !== sessionId) return;
          try {
            const retry = await callRemoteAssist({ action: 'getSession', sessionId });
            liveSession = retry.session;
          } catch (e) {
            liveSession = null;
          }
        }
        if (!liveSession || liveSession.status === 'ended') {
          this._clearRemoteAssistLocal('ended');
          this._showCustomToast('远协已结束', 'none', 2000);
          return;
        }
        session = liveSession;
      }
      const patch = {
        remoteSessionBleConnected: this._resolveAdminRemoteBleConnected(session)
      };
      const userAccepted = !!session.userAccepted;
      if (userAccepted !== !!this.data.remoteAssistUserAccepted) {
        patch.remoteAssistUserAccepted = userAccepted;
        if (userAccepted) {
          this._showCustomToast('用户已接受远协', 'success', 1800);
        }
      }
      if (session.deviceSn) patch.currentConnectedRawSn = session.deviceSn;
      // 接入时用户还没推状态：拿到 deviceState 后再判一次代次
      if (this._remoteSessionIsLegacyTof(session)) {
        if (this._handoffRemoteAssistToLegacy(session)) return;
      }
      const logPatch = this._syncRemoteAssistDebugLogsFromSession(session);
      if (logPatch) Object.assign(patch, logPatch);
      const statePatch = this.data.detailMode === 'edit'
        ? {}
        : this._buildRemoteStatePatch(session.deviceState, { forAdmin: true });
      const model = this.data.currentModel;
      Object.assign(statePatch, buildRemoteAssistAdminExtras(
        model,
        statePatch.settingState || this.data.settingState,
        this._resolveAdminRemoteBleConnected(session)
      ));
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
    if (forAdmin) {
      const model = patch.currentModel || this.data.currentModel;
      Object.assign(patch, buildRemoteAssistAdminExtras(
        model,
        patch.settingState || this.data.settingState,
        this.data.remoteSessionBleConnected
      ));
    }
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
        bleConnected: this._getRemoteAssistPushBleConnected(),
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
    const sessionId = this.data.remoteAssistSessionId;
    this.setData({
      remoteAssistUserAccepted: true,
      remoteAssistConsentVisible: false,
      blockDetailTouch: false
    }, () => {
      this._saveRemoteAssistLocal();
      wx.setKeepScreenOn({ keepScreenOn: true });
      this._showCustomToast('已同意远程协助', 'success', 1500);
      if (!sessionId) return;
      callRemoteAssist({
        action: 'pushState',
        sessionId,
        userAccepted: true,
        bleConnected: this._getRemoteAssistPushBleConnected(),
        deviceSn: this.data.currentConnectedRawSn || '',
        deviceState: {
          ...collectDeviceState(this),
          bleWriteReady: this._isBleWriteReady()
        }
      }).catch((e) => {
        console.warn('[远协] 同步用户同意状态失败', e);
      });
      this._pushRemoteDeviceState(true);
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
    this._stopRemoteAssistSessionPollers();
    this._resetRemoteAssistDebugLogsMem();
    this._adminRemoteBleFalseStreak = 0;
    this._remoteAssistBlePushTrueAt = 0;
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
      showRemoteAssistStayModal: false,
      remoteAssistStayModalClosing: false,
      remoteAssistLastCmdAt: 0,
      remoteAssistDebugLogs: [],
      uiBleConnected: false
    }, () => {
      this._syncUiBleConnected();
      if (wasAdmin) {
        this._startRemoteAssistPendingPoll();
        this._pollRemoteAssistPending();
      }
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
      stealthTutorialBtnDisabled: true, // 按钮禁用
      stealthTutorialConfirmText: this._pendingStealthTutorialAction === 'auto_calibrate' ? '已恢复' : '知道了'
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
    const nextAction = this._pendingStealthTutorialAction || '';
    this._pendingStealthTutorialAction = '';
    this.setData({ 
      showStealthTutorial: false,
      stealthTutorialMode: 'enter',
      stealthAnimPressing: false,
      stealthAnimLight: false,
      stealthAnimText: '请在车把上\n长按按键 3 秒',
      stealthAnimTextColor: 'black',
      stealthAnimTextScale: 1,
      stealthTutorialBtnDisabled: true,
      stealthTutorialConfirmText: '知道了'
    });
    if (nextAction === 'auto_calibrate') {
      setTimeout(() => {
        if (this._ensureBleControlReady()) this._startAutoCalibrateRun();
      }, 80);
    }
  },

  _stopAutoCalGuideAnim() {
    if (this._autoCalGuideAnimTimer) {
      clearTimeout(this._autoCalGuideAnimTimer);
      this._autoCalGuideAnimTimer = null;
    }
  },

  _startAutoCalGuideAnim() {
    this._stopAutoCalGuideAnim();
    const loop = () => {
      if (!this.data.showAutoCalGuideModal) return;
      this.setData({
        autoCalGuideBtnPressing: false,
        autoCalGuideBtnLightOn: false
      });
      this._autoCalGuideAnimTimer = setTimeout(() => {
        if (!this.data.showAutoCalGuideModal) return;
        this.setData({ autoCalGuideBtnPressing: true });
        this._autoCalGuideAnimTimer = setTimeout(() => {
          if (!this.data.showAutoCalGuideModal) return;
          this.setData({
            autoCalGuideBtnPressing: false,
            autoCalGuideBtnLightOn: true
          });
          this._autoCalGuideAnimTimer = setTimeout(loop, 1200);
        }, 220);
      }, 700);
    };
    loop();
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

    const isMtUltra = isMtUltraCardModel(currentModel);
    const isF2MaxSeries = isF2MaxSeriesModel(currentModel);
    const isF2ProSeries = name.includes('F2') && type === 'Pro';
    const isF1Max = name.includes('F1') && type === 'Max';
    const isF1Pro = name.includes('F1') && type === 'Pro';
    const isSupported = isMtUltra || isF2MaxSeries || isF2ProSeries || isF1Max || isF1Pro;
    
    if (!isSupported) {
      this._showCustomToast('仅支持 F1/F2/F3 已列出的出厂设置机型', 'none', 2000);
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

    if (isF3MaxModel(currentModel)) {
      steps = F3_MAX_FACTORY_RESET_STEPS.slice();
    } else if (isF1UltraModel(currentModel)) {
      steps = F1_ULTRA_FACTORY_RESET_STEPS.slice();
    } else if (isMtUltraCardModel(currentModel)) {
      steps = F2_ULTRA_FACTORY_RESET_STEPS.slice();
    } else if (isF2MaxSeries) {
      // F2 MAX / Long：原来的四步流程（最后一步带自动调平动画 + 确认键）
      // 全程自动播放，用户只在最后一步点击确认结束
      steps = [
        { text: '正在打开自动收回', data: '打开收回', sendTimes: 2, interval: 500, delayNext: 2000 },
        { text: '正在开启自检', data: '开启自检', sendTimes: 2, interval: 500, delayNext: 2000 },
        { text: '正在打开开机牌上翻', data: '开机上翻', sendTimes: 2, interval: 500, delayNext: 2000 },
        { text: '正在自动调平，请用手进行阻挡', data: '自动调平', sendTimes: 2, interval: 500, delayNext: 0, isLeveling: true, isFinal: true }
      ];
    } else if (isF1Max) {
      steps = F1_MAX_FACTORY_RESET_STEPS.slice();
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
          kind: 'multiSend',
          text: '正在自动调整折叠角度…',
          cmds: [
            { data: '90度',        sendTimes: 1, interval: 500, delay: 0 },
            { data: '调整折叠角度', sendTimes: 1, interval: 500, delay: 800 },
            { data: '往上收',       sendTimes: 5, interval: 500, delay: 800 }
          ],
          delayNext: 1500
        },
        { 
          text: '请长按按钮3秒',
          data: null,
          sendTimes: 0,
          interval: 0,
          delayNext: 0,
          showConfirm: true
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
      steps = F1_PRO_FACTORY_RESET_STEPS.slice();
    } else {
      // 兜底：使用默认步骤（不太可能走到这里）
      steps = this.data.factoryResetSteps || [];
    }

    this._cleanupFactoryResetFlow();

    // 重置步骤并显示弹窗
    this.setData({
      showFactoryResetModal: true,
      factoryResetStep: 0,
      factoryResetSteps: steps,
      factoryResetBleWaitHint: '',
      factoryResetOpenAngleReady: false
    });

    // 执行所有步骤
    this.executeFactoryResetStep(0);
  },

  _getFactoryResetStep() {
    const steps = this.data.factoryResetSteps || [];
    const idx = this.data.factoryResetStep || 0;
    return steps[idx] || null;
  },

  _isFactoryResetOpenAngleStep() {
    if (!this.data.showFactoryResetModal) return false;
    const step = this._getFactoryResetStep();
    return !!(step && step.kind === 'embedOpenAngle');
  },

  _isFactoryResetFoldTuneStep() {
    if (!this.data.showFactoryResetModal) return false;
    const step = this._getFactoryResetStep();
    return !!(step && step.kind === 'foldFineTune');
  },

  _isFactoryResetBleAdjustStep() {
    return this._isFactoryResetOpenAngleStep() || this._isFactoryResetFoldTuneStep();
  },

  _cleanupFactoryResetFlow() {
    this._stopFactoryResetBleReconnectWatch();
    this._stopFactoryResetAdjustBleWatch();
    this._stopFactoryResetButtonAnim();
    if (this._factoryResetAutoStepTimer) {
      clearTimeout(this._factoryResetAutoStepTimer);
      this._factoryResetAutoStepTimer = null;
    }
    this._frBleReconnectSawDisconnect = false;
    this.setData({
      factoryResetBleWaitHint: '',
      factoryResetBtnAnimLightOn: false,
      factoryResetBtnAnimPressing: false,
      factoryResetBtnAnimText: '',
      factoryResetOpenAngleReady: false,
      showFactoryResetReconnectModal: false
    });
  },

  _stopFactoryResetAdjustBleWatch() {
    if (this._frAdjustBleWatchTimer) {
      clearInterval(this._frAdjustBleWatchTimer);
      this._frAdjustBleWatchTimer = null;
    }
  },

  _startFactoryResetAdjustBleWatch() {
    this._stopFactoryResetAdjustBleWatch();
    const tick = () => {
      if (!this.data.showFactoryResetModal || !this._isFactoryResetBleAdjustStep()) {
        this._stopFactoryResetAdjustBleWatch();
        return;
      }
      const linked = this._canSendBleCommand();
      if (linked) {
        if (this.data.showFactoryResetReconnectModal) {
          this.setData({ showFactoryResetReconnectModal: false });
          if (this.ble) this.ble.preferredDeviceId = '';
        }
        return;
      }
      if (!this.data.showFactoryResetReconnectModal) {
        this.setData({ showFactoryResetReconnectModal: true });
      }
      this._bleReconnectStoppedByUser = false;
      if (this._lastBleDevice && this.ble) {
        this.ble.preferredDeviceId = this._lastBleDevice.deviceId || '';
      }
      this._triggerFactoryResetAdjustReconnect();
    };
    tick();
    this._frAdjustBleWatchTimer = setInterval(tick, 500);
  },

  _triggerFactoryResetAdjustReconnect() {
    if (this.data.isConnected || this.data.uiBleConnected) return;
    if (this.data.isScanning || this.data.isConnecting || this.data.isBleAutoReconnecting) return;
    this._bleReconnectStoppedByUser = false;
    if (this._lastBleDevice) {
      this._requestBleAutoReconnect('factory_reset_adjust');
      return;
    }
    this.handleConnect();
  },

  _stopFactoryResetBleReconnectWatch() {
    if (this._frBleReconnectTimer) {
      clearInterval(this._frBleReconnectTimer);
      this._frBleReconnectTimer = null;
    }
  },

  _startFactoryResetBleReconnectWatch() {
    this._stopFactoryResetBleReconnectWatch();
    this._frBleReconnectSawDisconnect = !this._canSendBleCommand();
    this._bleReconnectStoppedByUser = false;
    this.setData({ bleReconnectAttempt: 0 });
    const tick = () => {
      if (!this.data.showFactoryResetModal) {
        this._stopFactoryResetBleReconnectWatch();
        return;
      }
      const step = this._getFactoryResetStep();
      if (!step || step.kind !== 'waitBleReconnect') {
        this._stopFactoryResetBleReconnectWatch();
        return;
      }
      const linked = this._canSendBleCommand();
      if (!this._frBleReconnectSawDisconnect) {
        if (!linked) {
          this._frBleReconnectSawDisconnect = true;
          this._triggerFactoryResetAutoScan();
        }
        return;
      }
      if (linked) {
        this._stopFactoryResetBleReconnectWatch();
        this.executeFactoryResetStep((this.data.factoryResetStep || 0) + 1);
        return;
      }
      this._triggerFactoryResetAutoScan();
    };
    tick();
    this._frBleReconnectTimer = setInterval(tick, 500);
  },

  _triggerFactoryResetAutoScan() {
    if (this.data.isConnected || this.data.uiBleConnected) return;
    if (this.data.isScanning || this.data.isConnecting || this.data.isBleAutoReconnecting) return;
    this._bleReconnectStoppedByUser = false;
    if (this._lastBleDevice && this.ble) {
      this.ble.preferredDeviceId = this._lastBleDevice.deviceId || '';
    }
    if (this._lastBleDevice) {
      this._requestBleAutoReconnect('factory_reset');
      return;
    }
    this.handleConnect();
  },

  _stopFactoryResetButtonAnim() {
    if (this._frBtnAnimTimer) {
      clearTimeout(this._frBtnAnimTimer);
      this._frBtnAnimTimer = null;
    }
  },

  _startFactoryResetButtonAnimOnce() {
    this._stopFactoryResetButtonAnim();
    const step = this._getFactoryResetStep();
    const introText = (step && step.text) ? step.text : '请点击按钮，使按钮变红';
    this.setData({
      factoryResetBtnAnimLightOn: false,
      factoryResetBtnAnimPressing: false,
      factoryResetBtnAnimText: introText
    });
    this._frBtnAnimTimer = setTimeout(() => {
      this.setData({ factoryResetBtnAnimPressing: true });
      this._frBtnAnimTimer = setTimeout(() => {
        this.setData({
          factoryResetBtnAnimLightOn: true,
          factoryResetBtnAnimText: '按钮已变红',
          factoryResetBtnAnimPressing: false
        });
        this._frBtnAnimTimer = setTimeout(() => {
          this._frBtnAnimTimer = null;
          if (this.data.showFactoryResetModal && (this._getFactoryResetStep() || {}).kind === 'buttonAnimOnce') {
            this.executeFactoryResetStep((this.data.factoryResetStep || 0) + 1);
          }
        }, 800);
      }, 300);
    }, 1000);
  },

  _initFactoryResetOpenAngle() {
    const maxDeg = 180;
    const count = (maxDeg - 0) / 2 + 1;
    const extendedCount = Math.max(count + 100, 200);
    const ticks = new Array(Math.floor(extendedCount)).fill(0);
    const startUiDeg = 90;
    this.setData({
      factoryResetOpenAngleReady: true,
      openAngleUiActive: true,
      currentAngle: startUiDeg,
      angleMode: '',
      angleRotation: 0,
      activeIndex: 0,
      translateX: 0,
      transition: 'none',
      ticks
    });
    this.updateRuler(startUiDeg, false);
    this.lastVibrateIndex = this._openAngleIndexFromTranslate(0);
  },

  _onFactoryResetStepEnter(step) {
    if (!step) return;
    if (step.kind === 'waitBleReconnect') {
      this._startFactoryResetBleReconnectWatch();
      return;
    }
    if (step.kind === 'buttonAnimOnce') {
      this._startFactoryResetButtonAnimOnce();
      return;
    }
    if (step.kind === 'embedOpenAngle') {
      this._initFactoryResetOpenAngle();
      this._startFactoryResetAdjustBleWatch();
      return;
    }
    if (step.kind === 'foldFineTune') {
      this._foldAdjustActive = true;
      this._startFactoryResetAdjustBleWatch();
    }
  },

  onFactoryResetFoldAdjust(e) {
    if (!this._isFactoryResetFoldTuneStep()) return;
    const action = e.currentTarget.dataset.action;
    this.handleAdjust({
      currentTarget: { dataset: { action, mode: 'fold' } }
    });
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
      console.log('✅ [出厂设置] 所有步骤完成');
      return;
    }

    const step = steps[stepIndex] || {};
    this.setData({ factoryResetStep: stepIndex });
    this._onFactoryResetStepEnter(step);

    const data = step.data;
    const sendTimes = step.sendTimes != null ? step.sendTimes : 2;
    const interval = step.interval != null ? step.interval : 500;
    const delayNext = step.delayNext != null ? step.delayNext : 2000;
    const kind = step.kind;

    if (data && kind !== 'textAutoSend') {
      console.log(`📤 [出厂设置] 步骤 ${stepIndex + 1}: ${data}（连续${sendTimes}次，间隔${interval}ms）`);
      this.sendDataMultiple(data, sendTimes, interval);
    } else if (!data && !kind) {
      console.log(`ℹ️ [出厂设置] 步骤 ${stepIndex + 1}: 仅提示，无需发送数据`);
    }

    if (kind === 'waitBleReconnect' || kind === 'buttonAnimOnce' || kind === 'embedOpenAngle' || kind === 'foldFineTune') {
      return;
    }

    if (kind === 'textAutoSend') {
      if (data) {
        console.log(`📤 [出厂设置] 步骤 ${stepIndex + 1}: ${data}（连续${sendTimes}次，间隔${interval}ms）`);
        this.sendDataMultiple(data, sendTimes, interval);
        if (data === '调整折叠角度') this._foldAdjustActive = true;
      }
      if (this._factoryResetAutoStepTimer) clearTimeout(this._factoryResetAutoStepTimer);
      this._factoryResetAutoStepTimer = setTimeout(() => {
        this._factoryResetAutoStepTimer = null;
        if (this.data.showFactoryResetModal && this.data.factoryResetStep === stepIndex) {
          this.executeFactoryResetStep(stepIndex + 1);
        }
      }, delayNext);
      return;
    }

    if (kind === 'multiSend') {
      const cmds = step.cmds || [];
      if (this._factoryResetAutoStepTimer) clearTimeout(this._factoryResetAutoStepTimer);
      let totalDelay = 0;
      cmds.forEach((cmd) => {
        const cmdInterval = cmd.interval != null ? cmd.interval : 500;
        const cmdTimes = cmd.sendTimes != null ? cmd.sendTimes : 1;
        const cmdDelay = cmd.delay != null ? cmd.delay : 0;
        setTimeout(() => {
          if (!this.data.showFactoryResetModal || this.data.factoryResetStep !== stepIndex) return;
          console.log(`📤 [出厂设置/multiSend] ${cmd.data} ×${cmdTimes}`);
          this.sendDataMultiple(cmd.data, cmdTimes, cmdInterval);
        }, totalDelay + cmdDelay);
        totalDelay += cmdDelay + cmdTimes * cmdInterval;
      });
      this._factoryResetAutoStepTimer = setTimeout(() => {
        this._factoryResetAutoStepTimer = null;
        if (this.data.showFactoryResetModal && this.data.factoryResetStep === stepIndex) {
          this.executeFactoryResetStep(stepIndex + 1);
        }
      }, totalDelay + (step.delayNext != null ? step.delayNext : 2000));
      return;
    }

    if (step.showConfirm || step.isFinal || delayNext <= 0 || stepIndex >= steps.length - 1) {
      console.log('ℹ️ [出厂设置] 当前步骤等待用户确认或已是最后一步');
      return;
    }

    if (this._factoryResetAutoStepTimer) clearTimeout(this._factoryResetAutoStepTimer);
    this._factoryResetAutoStepTimer = setTimeout(() => {
      this._factoryResetAutoStepTimer = null;
      this.executeFactoryResetStep(stepIndex + 1);
    }, delayNext);
  },

  // 确认出厂设置完成
  confirmFactoryReset() {
    const steps = this.data.factoryResetSteps || [];
    const currentIndex = this.data.factoryResetStep || 0;
    const currentStep = steps[currentIndex] || {};

    if (currentStep.isFinal || currentIndex >= steps.length - 1) {
      this._cleanupFactoryResetFlow();
      this.setData({
        showFactoryResetModal: false,
        factoryResetStep: 0
      });
      console.log('✅ [出厂设置] 用户确认完成，关闭弹窗');
      return;
    }

    const nextIndex = currentIndex + 1;
    console.log(`ℹ️ [出厂设置] 用户确认步骤 ${currentIndex + 1}，进入步骤 ${nextIndex + 1}`);
    this.executeFactoryResetStep(nextIndex);
  },

  cancelFactoryReset() {
    console.log('⏹ [出厂设置] 用户点击关闭，立即中断所有步骤');
    this._cleanupFactoryResetFlow();
    this.setData({
      showFactoryResetModal: false,
      factoryResetStep: 0
    });
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
    const target = this.data.adminSelectedBindTarget;
    const model =
      this.data.currentModel ||
      this.data.models[this.data.currentIndex] ||
      null;
    const productModel =
      (target && target.productModel) ||
      this.scanModelToProductModel(model);
    if (!productModel) {
      console.warn('[scan] 无法解析产品型号，跳过绑定弹窗', model);
      return;
    }

    // 选了绑定用户时不能因「本会话已登记」静默跳过：录入用户 SN 和预登记是两回事
    if (!target && this._adminSessionRegisteredSn && this._adminSessionRegisteredSn === normalizedSn) {
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
      if (!r.success) {
        if (target) this._showCustomToast(r.msg || '校验 SN 失败，请重试', 'none', 2500);
        return;
      }

      if (!r.showDialog) {
        if (target) {
          // 已选绑定用户：新机 SN 已预登记是正常情况，继续弹确认窗
          if (r.reason === 'already_registered') {
            this.setData({
              showAdminSnModal: true,
              adminSnModalClosing: false,
              adminSnModalMode: 'confirm_new',
              adminSnModalSn: r.sn || normalizedSn,
              adminSnModalTargetModel: r.registeredModel || productModel,
              adminSnModalExistingModel: '',
              adminSnRegisterSubmitting: false,
              adminSnShowModelPicker: false
            });
            return;
          }
          if (r.reason === 'user_bound') {
            this._showCustomToast('该 SN 已绑定其他用户，请换一台新机', 'none', 3000);
            return;
          }
          if (r.reason === 'pending_audit') {
            this._showCustomToast('该 SN 正在审核中，请换一台新机', 'none', 3000);
            return;
          }
          this._showCustomToast('该 SN 当前不可录入', 'none', 2500);
          return;
        }
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
      if (target) this._showCustomToast('网络异常，请重新点击下一步', 'none', 2500);
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
        adminSnShowModelPicker: false,
        adminSelectedBindTargetId: '',
        adminSelectedBindTarget: null
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
    const { adminSnModalSn, adminSnModalMode, currentConnectedRawSn, adminSelectedBindTarget } = this.data;
    const sn = currentConnectedRawSn || adminSnModalSn;
    if (!sn || !productModel) return;

    if (adminSelectedBindTarget) {
      if (adminSelectedBindTarget.targetType === 'replacement') {
        await this._completeDeviceReplacementIfNeeded(sn, productModel, adminSelectedBindTarget.repairId);
        return;
      }
      if (adminSelectedBindTarget.targetType === 'fault_pending') {
        await this._submitAdminFaultBindSn(sn, productModel, adminSelectedBindTarget.userOpenid);
        return;
      }
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
        const stampHint = r.sensorStamp === 'imu'
          ? ' · 已盖 IMU 章'
          : (String(productModel || '').toUpperCase() === 'F3 MAX' ? ' · 未盖章(TOF)' : '');
        this._showCustomToast((r.msg || '绑定成功') + stampHint, 'success', 2200);
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

  async _submitAdminFaultBindSn(sn, productModel, userOpenid) {
    const target = this.data.adminSelectedBindTarget;
    const oid = userOpenid || (target && target.userOpenid);
    if (!oid) return;

    this.setData({ adminSnRegisterSubmitting: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'adminRegisterSn',
        data: {
          action: 'bind_user_sn',
          sn,
          productModel: productModel || (target && target.productModel),
          deviceName: sn,
          userOpenid: oid,
          pendingDeviceId: (target && target.deviceId) || ''
        }
      });
      const r = res.result || {};
      if (r.success) {
        this._markAdminDeviceRegistered(sn, r.productModel || productModel);
        this.setData({
          adminSelectedBindTargetId: '',
          adminSelectedBindTarget: null
        });
        this.closeAdminSnModal();
        this._showCustomModal({
          title: '✅ 录入成功',
          content: `SN：${sn}\n型号：${r.productModel || productModel || '—'}\n\n${r.msg || '已同步到用户设备卡'}`,
          showCancel: false,
          confirmText: '知道了'
        });
      } else {
        this._showCustomModal({
          title: '同步失败',
          content: (r.msg || '未知错误') + '\n\n用户设备卡未变更，请重试。',
          showCancel: false,
          confirmText: '知道了'
        });
        this.setData({ adminSnRegisterSubmitting: false });
      }
    } catch (err) {
      console.error('[scan] adminRegisterSn bind_user_sn failed', err);
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
      this.stopBleAutoReconnect(false, true);
    }

    // 防止重复点击：如果已连接、正在连接、正在跳转到OTA页面，则直接返回
    if (this.data.remoteAssistCapsuleActive) {
      this._showCustomToast('远协中，请通过上方结束远协', 'none', 2000);
      return;
    }
    if (this.data.isConnecting) {
      // 连接卡住时允许用户点胶囊取消重来（3 秒内视为正常连接过程，忽略点击）
      if (Date.now() - (this._connectingStartedAt || 0) > 3000) {
        this._cancelStuckConnect();
      }
      return;
    }
    if (this.data.isConnected || this.data.isNavigatingToOta) {
      return;
    }

    // 用户主动连接：扫描期间不自动重连上一台设备，避免换机后仍卡在「正在重连」
    this._bleReconnectStoppedByUser = true;
    this._clearBleReconnectTimers();
    this._startBleScanSession();
  },

  // 连接长时间无响应时用户点胶囊触发：释放系统层连接并回到待连接状态
  _cancelStuckConnect() {
    console.warn('[BLE] user cancelled stuck connect');
    this._bleReconnectStoppedByUser = true;
    this._clearBleReconnectTimers();
    if (this.ble) {
      const cancelled = this.ble.cancelPendingConnect();
      if (!cancelled) this.ble.disconnect(true);
      this.ble.hasConnected = false;
    }
    this._stopBleLinkWatch();
    this._applyBleLinkUi({
      isConnected: false,
      isConnecting: false,
      isScanning: false,
      isBleAutoReconnecting: false,
      bleReconnectAttempt: 0
    });
    this._showCustomToast('已取消连接，可重新点击连接', 'none', 2000);
  },

  _rejectBlockedDebugBleDevice(device, source) {
    const advName = getBleDeviceAdvertiseName(device);
    console.warn('[BLE] reject blocked debug device', source, advName);
    if (this.ble) {
      this.ble.hasConnected = false;
      this.ble._clearAutoConnectTimer();
      this.ble.disconnect(true);
    }
    this._stopBleLinkWatch();
    this._applyBleLinkUi({
      isConnected: false,
      isConnecting: false,
      isScanning: false,
      isBleAutoReconnecting: false
    });
    const now = Date.now();
    if (!this._blockedDebugModalAt || (now - this._blockedDebugModalAt) > 1200) {
      this._blockedDebugModalAt = now;
      this._showCustomModal({
        title: '无法连接',
        content: '这是调试设备，不允许连接。',
        showCancel: false,
        confirmText: '知道了'
      });
    }
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

    // 3. Android 扫描 BLE 需定位权限；再初始化蓝牙适配器
    this._ensureBleLocationPermission()
      .then(() => this.ble.initBluetoothAdapter())
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
        console.error('蓝牙初始化失败', err);
        this._handleBleInitFailure(err);
      });
  },

  _ensureBleLocationPermission() {
    if (!isAndroidBleScanPlatform()) return Promise.resolve();
    return new Promise((resolve, reject) => {
      wx.getSetting({
        success: (res) => {
          if (res.authSetting && res.authSetting['scope.userLocation'] === true) {
            resolve();
            return;
          }
          wx.authorize({
            scope: 'scope.userLocation',
            success: () => resolve(),
            fail: () => reject({ type: 'location_deny', _bleKind: 'location' })
          });
        },
        fail: () => resolve()
      });
    });
  },

  _handleBleInitFailure(err) {
    const kind = classifyBleError(err);
    if (kind === 'ok') return;
    this.setData({
      isScanning: false,
      isConnecting: false,
      isBleAutoReconnecting: false
    });
    if (kind === 'auth') {
      this.setData({ showPermissionModal: true });
      wx.vibrateLong();
      return;
    }
    const patch = { showBluetoothAlert: true };
    if (kind === 'system_auth') {
      patch.bluetoothAlertTitle = '微信未获得蓝牙权限';
      patch.bluetoothAlertDesc = '系统蓝牙已开也可能失败：请到手机\n「设置 → 应用 → 微信」开启蓝牙/附近设备\n（华为/小米等 Android 常见）';
    } else if (kind === 'location') {
      patch.bluetoothAlertTitle = '需要开启定位权限';
      patch.bluetoothAlertDesc = 'Android 扫描蓝牙设备需要定位权限\n请在设置中允许小程序使用定位';
    } else if (kind === 'off') {
      patch.bluetoothAlertTitle = '蓝牙未开启';
      patch.bluetoothAlertDesc = '请在手机"设置"中打开蓝牙功能\n以便连接设备';
    } else {
      patch.bluetoothAlertTitle = '蓝牙暂不可用';
      patch.bluetoothAlertDesc = '请确认系统蓝牙已开启，并在小程序右上角\n「··· → 设置」中允许蓝牙相关权限';
    }
    this.setData(patch);
    this.setModalDelay();
    wx.vibrateLong();
  },

  stopBleAutoReconnect(showTip, markUserStopped) {
    this._clearBleReconnectTimers();
    if (markUserStopped) this._bleReconnectStoppedByUser = true;
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

    const inFactoryAdjust = this.data.showFactoryResetModal && this._isFactoryResetBleAdjustStep();
    const attempt = (this.data.bleReconnectAttempt || 0) + 1;
    if (attempt > 5 && !inFactoryAdjust) {
      this.stopBleAutoReconnect(false, false);
      this.setData({ showDisconnectTip: true });
      setTimeout(() => this.setData({ showDisconnectTip: false }), 2000);
      return;
    }

    console.log('[BLE] schedule auto reconnect', { reason, attempt });

    const effectiveAttempt = inFactoryAdjust ? Math.min(attempt, 5) : attempt;
    this.setData({
      isBleAutoReconnecting: true,
      isScanning: true,
      isConnecting: false,
      showDisconnectTip: false,
      bleReconnectAttempt: attempt
    });

    const sinceLost = Date.now() - (this._lastBleLinkLostAt || 0);
    const lostCooldown = sinceLost < 4000 ? (4000 - sinceLost) : 0;
    const delayMs = Math.max(
      effectiveAttempt === 1 ? 800 : Math.min(3000, 500 + (effectiveAttempt - 1) * 400),
      lostCooldown
    );
    this._bleReconnectTimer = setTimeout(() => {
      this._bleReconnectTimer = null;
      if (this._bleReconnectStoppedByUser || this.data.isConnected) return;
      this._attemptBleReconnect();
    }, delayMs);
  },

  _attemptBleReconnect() {
    const dev = this._lastBleDevice;
    if (isBlockedDebugBleDevice(dev)) {
      this._rejectBlockedDebugBleDevice(dev, 'reconnect');
      this._startBleScanSession();
      return;
    }
    if (dev && dev.deviceId && this.ble) {
      this.ble.preferredDeviceId = dev.deviceId;
    }
    this.ble.initBluetoothAdapter()
      .then(() => {
        if (this._bleReconnectStoppedByUser || this.data.isConnected) return;
        if (!dev || !dev.deviceId) {
          this._startBleScanSession();
          return;
        }
        this._connectingStartedAt = Date.now();
        this.setData({ isConnecting: true, isScanning: false });
        return this.ble.connectDevice(dev).catch((err) => {
          console.warn('[BLE] direct reconnect connect failed', err);
          if (err && err.message === 'blocked_debug_device') {
            this._rejectBlockedDebugBleDevice(dev, 'reconnect_connect');
            this._startBleScanSession();
            return;
          }
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

  async _loadAdminBindTargets() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'adminRegisterSn',
        data: { action: 'list_bind_targets' }
      });
      const r = res.result || {};
      if (r.success && Array.isArray(r.data)) return enrichBindTargets(r.data);
    } catch (err) {
      console.warn('[scan] list_bind_targets failed', err);
    }
    return [];
  },

  _tryPendingSnEntryHint() {
    const replacementRepairId = String(this._pendingReplacementRepairId || '').trim();
    if (replacementRepairId && this.data.isAdmin) {
      this._showCustomToast('请连接更换后的新主板，系统会解析 SN 并替换用户设备卡', 'none', 3200);
      if (this._autoStartReplacementBle) {
        this._autoStartReplacementBle = false;
        setTimeout(() => {
          if (!this.data.isConnected && !this.data.isConnecting) this.handleConnect();
        }, 500);
      }
      return;
    }
    const userOpenid = this._pendingSnEntryUser;
    if (!userOpenid || !this.data.isAdmin) return;
    this._pendingSnEntryUser = '';
    const model = this._pendingSnEntryModel || '';
    this._pendingSnEntryModel = '';
    this._highlightPendingSnUser = userOpenid;
    const tip = model
      ? `质保已审核。请连接 ${model} 新机，选择对应用户录入 SN`
      : '质保已审核。请蓝牙连接新机，在绑定列表中选择用户录入 SN';
    this._showCustomToast(tip, 'none', 3200);
  },

  async _maybeShowAdminBindPickerThenSn(normalizedSn) {
    const targets = await this._loadAdminBindTargets();
    if (targets.length > 0) {
      const preselected = this._preselectPendingSnBindTarget(targets);
      this.setData({
        showAdminBindPicker: true,
        adminBindPickerClosing: false,
        adminBindPickerActive: false,
        adminBindTargets: targets,
        adminSelectedBindTargetId: preselected ? preselected._id : '',
        adminSelectedBindTarget: preselected
      });
      wx.nextTick(() => {
        setTimeout(() => {
          if (this.data.showAdminBindPicker) {
            this.setData({ adminBindPickerActive: true });
          }
        }, 30);
      });
      this._pendingAdminSnAfterBind = normalizedSn;
      return;
    }
    await this.maybeShowAdminSnRegisterModal(normalizedSn);
  },

  closeAdminBindPicker() {
    this.setData({ adminBindPickerActive: false, adminBindPickerClosing: true });
    setTimeout(() => {
      this.setData({
        showAdminBindPicker: false,
        adminBindPickerClosing: false,
        adminBindTargets: []
      });
      const pendingSn = this._pendingAdminSnAfterBind;
      this._pendingAdminSnAfterBind = '';
      if (pendingSn) this.maybeShowAdminSnRegisterModal(pendingSn);
    }, 280);
  },

  onPickAdminBindTarget(e) {
    const id = e.currentTarget.dataset.id;
    const item = (this.data.adminBindTargets || []).find((row) => row._id === id);
    if (!item) return;
    this.setData({
      adminSelectedBindTargetId: id,
      adminSelectedBindTarget: enrichBindTarget(item)
    });
  },

  _preselectPendingSnBindTarget(targets) {
    const replacementRepairId = String(this._pendingReplacementRepairId || '').trim();
    if (replacementRepairId && Array.isArray(targets) && targets.length) {
      const replacement = targets.find((row) =>
        row.targetType === 'replacement' &&
        String(row.repairId || '').trim() === replacementRepairId
      );
      if (replacement) {
        this._pendingReplacementRepairId = '';
        return enrichBindTarget(replacement);
      }
    }
    const openid = this._highlightPendingSnUser;
    if (!openid || !Array.isArray(targets) || !targets.length) return null;
    const hit = targets.find((row) => row.userOpenid === openid && row.targetType === 'fault_pending');
    if (!hit) return null;
    this._highlightPendingSnUser = '';
    return enrichBindTarget(hit);
  },

  confirmAdminBindPick() {
    const { adminSelectedBindTargetId, adminSelectedBindTarget } = this.data;
    if (!adminSelectedBindTargetId || !adminSelectedBindTarget) {
      this._showCustomToast('请先点选一个用户，再点下一步', 'none', 2000);
      return;
    }
    // 兜底当前已连设备 SN，避免 pending 值被其他路径清空后点下一步无反应
    const pendingSn = this._pendingAdminSnAfterBind || this.data.currentConnectedRawSn || '';
    this._pendingAdminSnAfterBind = '';
    if (!pendingSn) {
      this._showCustomToast('未获取到新机 SN，请重新蓝牙连接设备', 'none', 3000);
      return;
    }
    this.setData({
      adminBindPickerActive: false,
      adminBindPickerClosing: true
    });
    setTimeout(() => {
      this.setData({
        showAdminBindPicker: false,
        adminBindPickerClosing: false
      });
      this.maybeShowAdminSnRegisterModal(pendingSn);
    }, 280);
  },

  skipAdminBindPick() {
    this.setData({
      adminSelectedBindTargetId: '',
      adminSelectedBindTarget: null
    });
    this.closeAdminBindPicker();
  },

  onAdminBindConfirmReselect() {
    if (this.data.adminSnRegisterSubmitting) return;
    const pendingSn = this.data.adminSnModalSn || this._pendingAdminSnAfterBind || '';
    this.setData({
      showAdminSnModal: false,
      adminSnModalClosing: false,
      adminSnRegisterSubmitting: false
    });
    if (!pendingSn) return;
    this._pendingAdminSnAfterBind = pendingSn;
    const targets = (this.data.adminBindTargets || []).length
      ? this.data.adminBindTargets
      : [];
    if (!targets.length) {
      this._loadAdminBindTargets().then((rows) => {
        if (!rows.length) return;
        this.setData({
          showAdminBindPicker: true,
          adminBindPickerClosing: false,
          adminBindPickerActive: false,
          adminBindTargets: rows
        });
        wx.nextTick(() => {
          setTimeout(() => {
            if (this.data.showAdminBindPicker) {
              this.setData({ adminBindPickerActive: true });
            }
          }, 30);
        });
      });
      return;
    }
    this.setData({
      showAdminBindPicker: true,
      adminBindPickerClosing: false,
      adminBindPickerActive: false,
      adminBindTargets: targets
    });
    wx.nextTick(() => {
      setTimeout(() => {
        if (this.data.showAdminBindPicker) {
          this.setData({ adminBindPickerActive: true });
        }
      }, 30);
    });
  },

  async _completeDeviceReplacementIfNeeded(sn, productModel, repairIdOverride) {
    const repairId = repairIdOverride || this.data.adminSelectedRepairId;
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
          adminSelectedBindTargetId: '',
          adminSelectedBindTarget: null,
          adminSelectedRepairId: '',
          adminSelectedRepair: null
        });
        this.closeAdminSnModal();
        // 弹窗明确告知换机结果（含云端回读核对），避免 toast 一闪而过看不清
        const lines = [];
        const isMotherboard = r.replacementKind === 'motherboard';
        if (r.oldSn) {
          lines.push(
            isMotherboard
              ? `旧主板 SN：${r.oldSn}（已失效）`
              : `旧 SN：${r.oldSn}（已报废）`
          );
        }
        lines.push(`${isMotherboard ? '新主板' : '新设备'} SN：${r.newSn || sn}`);
        if (r.productModel) lines.push(`型号：${r.productModel}`);
        lines.push('');
        lines.push(r.verifyDetail || (r.verified ? '已核对绑定成功' : '未能核对绑定状态，请手动检查'));
        this._showCustomModal({
          title: r.verified
            ? (isMotherboard ? '✅ 主板更换成功' : '✅ 换机成功')
            : (isMotherboard ? '⚠️ 主板更换完成（待核查）' : '⚠️ 换机完成（待核查）'),
          content: lines.join('\n'),
          showCancel: false,
          confirmText: '知道了'
        });
        return true;
      }
      this._showCustomModal({
        title: '换机失败',
        content: (r.msg || '未知错误') + '\n\n用户设备卡未变更，请处理后重试。',
        showCancel: false,
        confirmText: '知道了'
      });
      this.setData({ adminSnRegisterSubmitting: false });
      return false;
    } catch (err) {
      console.error('[scan] complete replacement failed', err);
      this._showCustomModal({
        title: '换机失败',
        content: '网络异常，云函数未确认执行结果。\n请到「我的-配置回溯」或数据库确认该 SN 是否已绑定，再决定是否重试。',
        showCancel: false,
        confirmText: '知道了'
      });
      this.setData({ adminSnRegisterSubmitting: false });
      return false;
    }
  },

  handleDisconnect() {
    if (this.data.remoteAssistRole === 'admin' && this.data.remoteAssistSessionId) {
      this.onEndRemoteAssistSession();
      return;
    }
    this.stopBleAutoReconnect(false, true);
    this._bleReconnectStoppedByUser = true;
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
        bluetoothAlertClosing: false,
        bluetoothAlertTitle: '蓝牙未开启',
        bluetoothAlertDesc: '请在手机"设置"中打开蓝牙功能\n以便连接设备'
      });
    }, 420);
  },

  closePermissionModal() {
    if (this.data.permissionModalClosing) return;
    this.setData({ permissionModalClosing: true });
    setTimeout(() => {
      this.setData({
        showPermissionModal: false,
        permissionModalClosing: false
      });
    }, 420);
  },

  openBlePermissionSetting() {
    if (typeof wx.openAppAuthorizeSetting === 'function') {
      wx.openAppAuthorizeSetting({
        fail: () => this._openBleSystemSettingFallback()
      });
      return;
    }
    this._openBleSystemSettingFallback();
  },

  _openBleSystemSettingFallback() {
    if (typeof wx.openSetting === 'function') {
      wx.openSetting({
        fail: () => {
          this._showCustomToast('请到系统设置中为微信开启蓝牙/附近设备权限', 'none', 2800);
        }
      });
      return;
    }
    this._showCustomToast('请到系统设置中为微信开启蓝牙/附近设备权限', 'none', 2800);
  },

  closeRemoteAssistStayModal() {
    if (this.data.remoteAssistStayModalClosing) return;
    this.setData({ remoteAssistStayModalClosing: true });
    setTimeout(() => {
      this.setData({
        showRemoteAssistStayModal: false,
        remoteAssistStayModalClosing: false
      });
    }, 420);
  },


  // 监听断开 (F2 仅靠微信 onBLEConnectionStateChange，不做主动轮询避免舵机运转时误判断连)
  _startBleLinkWatch() {
    this._stopBleLinkWatch();
    this._f2LastBleRxAt = Date.now();
    if (isF2MaxStatusBleModel(this.data.currentModel)) {
      return;
    }
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

    // 刚连上数秒内不做主动探测，避免 GATT/连接态 API 误报导致重连风暴
    if (Date.now() < (this._bleConnectGraceUntil || 0)) return;

    this._bleLinkWatchTick = (this._bleLinkWatchTick || 0) + 1;
    const remoteUser = this._isRemoteAssistUserSessionActive();
    const slowWatch = remoteUser && (this._bleLinkWatchTick % 8 !== 0);

    if (!slowWatch) {
      if (typeof wx.getBLEConnectionState === 'function') {
        wx.getBLEConnectionState({
          deviceId,
          success: (res) => {
            if (res.connected) {
              this._bleConnProbeFailStreak = 0;
              return;
            }
            this._bleConnProbeFailStreak = (this._bleConnProbeFailStreak || 0) + 1;
            if (this._bleConnProbeFailStreak >= 8) {
              this._bleConnProbeFailStreak = 0;
              this._handleBleLinkLost('connection_state');
            }
          },
          fail: () => {
            // API 失败不等于断连
          }
        });
      }
    }

    if (slowWatch) return;

    // F2 状态包由固件心跳上报；不再用 getBLEDeviceServices 探测，极易误判断连
    if (isF2MaxStatusBleModel(this.data.currentModel)) {
      this._bleGattProbeFailStreak = 0;
      return;
    }

    if (this._f2LastBleRxAt) {
      const staleMs = Date.now() - this._f2LastBleRxAt;
      if (staleMs > 12000) {
        wx.getBLEDeviceServices({
          deviceId,
          success: () => {
            this._bleGattProbeFailStreak = 0;
          },
          fail: () => {
            this._bleGattProbeFailStreak = (this._bleGattProbeFailStreak || 0) + 1;
            if (this._bleGattProbeFailStreak >= 5 && !remoteUser) {
              this._bleGattProbeFailStreak = 0;
              this._handleBleLinkLost('gatt_probe');
            }
          }
        });
      } else {
        this._bleGattProbeFailStreak = 0;
      }
    }
  },

  _isF3HeightCfgBusy() {
    return !!(
      this.data.f3HeightConfigModeOn
      || this._f3HeightBleTxActive
      || this._f3HeightWritePending
      || Date.now() < (this._f3HeightSendLockUntil || 0)
    );
  },

  _bumpF3HeightBleGrace(ms) {
    const until = Date.now() + (ms || 20000);
    this._f3HeightBleGraceUntil = Math.max(this._f3HeightBleGraceUntil || 0, until);
    if (this.ble) this.ble._suppressDisconnectUntil = this._f3HeightBleGraceUntil;
  },

  _isF3HeightBleGraceActive() {
    return Date.now() < (this._f3HeightBleGraceUntil || 0);
  },

  _handleBleLinkLost(source) {
    if (this._isF3HeightCfgBusy() || this._isF3HeightBleGraceActive()) {
      return;
    }
    if (this._bleLinkLostPending) return;
    if (this.ble && this.ble._closingConnection) return;
    if (!this.data.isConnected && !(this.ble && this.ble.device)) return;

    const dev = (this.ble && this.ble.device) || this._lastBleDevice;
    const deviceId = dev && dev.deviceId;
    if (!deviceId) return;

    const activeId = this._activeBleDeviceId || deviceId;
    if (deviceId !== activeId) return;

    this._bleLinkLostPending = true;
    const finishLost = () => {
      console.warn('[BLE] link lost:', source);
      this._lastBleLinkLostAt = Date.now();
      this._stopBleLinkWatch();
      if (this.ble) {
        this.ble._suppressCloseForDevice(deviceId);
        this.ble._manualDisconnect = false;
        this.ble._disconnectIntentManual = false;
        this.ble.device = null;
        this.ble.hasConnected = false;
        this.ble._notifyDisconnected({
          unexpected: true,
          device: dev,
          source: 'link_lost_' + source
        });
      } else {
        this.onBleDisconnected({ unexpected: true, device: dev, source });
      }
      setTimeout(() => {
        this._bleLinkLostPending = false;
      }, 300);
    };

    const confirmAndFinish = () => {
      if (this.ble && typeof this.ble.probeLinkAlive === 'function') {
        this.ble.probeLinkAlive(deviceId).then((alive) => {
          if (alive) {
            this._bleLinkLostPending = false;
            return;
          }
          if (this._isRemoteAssistUserSessionActive()) {
            setTimeout(() => {
              this.ble.probeLinkAlive(deviceId).then((alive2) => {
                if (alive2) {
                  this._bleLinkLostPending = false;
                  return;
                }
                finishLost();
              });
            }, 600);
            return;
          }
          finishLost();
        });
        return;
      }
      finishLost();
    };

    confirmAndFinish();
  },

  onBleDisconnected(meta) {
    const info = meta || {};
    if (!info._f3GraceRecheck && (this._isF3HeightCfgBusy() || this._isF3HeightBleGraceActive()) && info.unexpected) {
      const src = String(info.source || '');
      if (src === 'state_change' || src.indexOf('link_lost') >= 0) {
        const dev = info.device;
        const deviceId = dev && dev.deviceId;
        if (deviceId && this.ble && typeof this.ble.probeLinkAlive === 'function') {
          setTimeout(() => {
            this.ble.probeLinkAlive(deviceId).then((alive) => {
              if (alive) return;
              this.onBleDisconnected({ ...info, _f3GraceRecheck: true });
            });
          }, 1800);
          return;
        }
      }
    }
    if (this._isStaleBleDisconnect(info)) {
      console.log('[BLE] ignore stale disconnect', info.device && info.device.deviceId);
      return;
    }
    if (info.device && info.device.deviceId) {
      this._bleDisconnectHandledId = info.device.deviceId;
      this._bleDisconnectHandledAt = Date.now();
    }

    const unexpected = !!info.unexpected;
    if (info.device) this._lastBleDevice = info.device;
    this._activeBleDeviceId = '';

    const inFactoryAdjust = this.data.showFactoryResetModal && this._isFactoryResetBleAdjustStep();
    if (inFactoryAdjust) {
      this._bleReconnectStoppedByUser = false;
      if (this._lastBleDevice && this.ble) {
        this.ble.preferredDeviceId = this._lastBleDevice.deviceId || '';
      }
      if (this._isFactoryResetOpenAngleStep()) {
        this._rulerTouchActive = false;
      }
      this.setData({ showFactoryResetReconnectModal: true });
    }

    this._bleSessionModel = null;
    this._publishBleToVoiceBridge(false);
    this._teardownF2FaultBleListener();
    this._clearBleSendQueue();

    const src = String(info.source || '');
    const probeFalsePositive = src.indexOf('link_lost_gatt_probe') >= 0
      || src.indexOf('link_lost_connection_state') >= 0;
    const shouldReconnect = unexpected
      && !probeFalsePositive
      && !this._bleReconnectStoppedByUser
      && this._lastBleDevice;

    this._applyBleLinkUi({
      isConnected: false,
      isConnecting: false,
      isScanning: false,
      showDisconnectTip: !unexpected && !this.data.isBleAutoReconnecting && !inFactoryAdjust
    }, () => {
      this._scheduleRemoteStatePush();
      if (shouldReconnect) {
        if (!this.data.isBleAutoReconnecting) {
          this.setData({ bleReconnectAttempt: 0 });
        }
        this._requestBleAutoReconnect('disconnected');
      } else if (!this.data.isBleAutoReconnecting) {
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
      
      // 仅 F1 ULTRA / F2 ULTRA 需云端 OTA 记录；F3 全系列及其他型号直接放行
      const cur = this._bleStatusTargetModel() || this.data.currentModel || {};
      if (!modelRequiresOtaGate(cur)) {
        console.log('🔍 [checkOtaConnection] 当前型号无需 OTA 校验:', cur.name, cur.type);
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
    if (this._isRemoteAssistUserLocked()) return;
    // 连续滑动：打断上一张切换动画，先落到目标卡再跟手
    if (this._isSwipeAnimating) {
      this._finishPendingCardSwipe(true);
    }
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

  onTouchMoveMain(e) {
    if (this._isRemoteAssistUserLocked()) return;
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
    if (this._isRemoteAssistUserLocked()) return;
    if (this._isSwipeAnimating) return;
    if (!this.data.isDraggingModel && Math.abs(this.data.modelDragOffset || 0) < 1) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - this.data.touchStartX;
    const threshold = 56;

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
      console.log('[scan-perf] touchEnd(swipe)', { diff, direction });
    }
  },

  _clearCardSwipeTimer() {
    if (this._swipeAnimTimer) {
      clearTimeout(this._swipeAnimTimer);
      this._swipeAnimTimer = null;
    }
  },

  /** 立刻完成待切换（用于连续滑动打断动画） */
  _finishPendingCardSwipe(sync) {
    const direction = this._pendingSwipeDirection;
    this._clearCardSwipeTimer();
    this._pendingSwipeDirection = null;
    if (!this._isSwipeAnimating) return;
    this._isSwipeAnimating = false;
    if (!direction) return;
    if (sync) {
      this.swipe(direction, true);
      return;
    }
    this.swipe(direction, true, () => {
      this._isSwipeAnimating = false;
    });
  },

  _animateSwipeOutAndSwitch(direction) {
    if (this._isSwipeAnimating) {
      // 动画中又滑一次：先落到当前目标，再立刻切下一张
      this._finishPendingCardSwipe(true);
    }
    this._isSwipeAnimating = true;
    this._pendingSwipeDirection = direction;

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

    this._clearCardSwipeTimer();
    this._swipeAnimTimer = setTimeout(() => {
      this._swipeAnimTimer = null;
      const dir = this._pendingSwipeDirection;
      this._pendingSwipeDirection = null;
      if (!dir) {
        this._isSwipeAnimating = false;
        return;
      }
      this.swipe(dir, true, () => {
        this._isSwipeAnimating = false;
      });
    }, CARD_SWIPE_MS);
  },

  swipe(direction, snapWithoutTransition, done) {
    let current = this.data.currentIndex;
    const total = this.data.models.length;
    if (direction === 'next') {
      if (current < total - 1) current += 1;
    } else if (current > 0) {
      current -= 1;
    }
    this.updateCardStatus(current, done, snapWithoutTransition);
  },

  updateCardStatus(current, done, snapWithoutTransition) {
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
    const nextModel = this.data.models[safeCurrent] || this.data.currentModel;
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
    if (nextModel && !this.data.showDetail) {
      patch.currentModel = nextModel;
    }
    if (this.data.isConnected && nextModel) {
      Object.assign(patch, this._resetF2HwMonitorState(true, nextModel));
    }
    affected.forEach((idx) => {
      if (idx < 0 || idx >= total) return;
      patch[`models[${idx}].status`] = getStatus(idx, safeCurrent);
    });
    if (snapWithoutTransition) {
      patch.isDraggingModel = true;
    }
    this.setData(patch, () => {
      const finish = () => {
        if (this._scanPerfDebug) {
          console.log('[scan-perf] updateCardStatus', {
            from: prevCurrent,
            to: safeCurrent,
            affectedCount: Object.keys(patch).filter((k) => k.startsWith('models[')).length,
            setDataCostMs: Date.now() - updateStart
          });
        }
        this._ensureF2StatusBleListener();
        this._refreshRemoteAssistCardFlags();
        this._recalcRemoteAssistPendingForCard();
        if (typeof done === 'function') done(safeCurrent);
      };
      if (snapWithoutTransition) {
        wx.nextTick(() => {
          this.setData({ isDraggingModel: false }, finish);
        });
        return;
      }
      finish();
    });
  },
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
    if (this._isRemoteAssistUserLocked()) return;
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

  onTapCard(e) {
    if (Date.now() < (this._controlTapLockUntil || 0)) return;
    const index = parseInt(e.currentTarget.dataset.index, 10);
    if (index !== this.data.currentIndex) {
      this.updateCardStatus(index);
    } else {
      // 点击当前已经居中的卡片，等同于点击“进入控制台”
      this.openDetail(e);
    }
  },

  _openDetailAnimated(patch = {}, afterOpen) {
    const guardMs = 480;
    this._detailClosing = false;
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
      ...(patch.currentModel
        ? {
            ...(isF3MaxModel(patch.currentModel)
              ? {
                  // 默认 TOF 皮；本会话已判明 IMU 则保持
                  f3SensorUi: (this.data.f3DeviceVariant === 'imu' || this.data.f3SensorUi === 'imu')
                    ? 'imu'
                    : 'tof',
                  f3AttitudeVisible: (this.data.f3DeviceVariant === 'imu' || this.data.f3SensorUi === 'imu'),
                  f3HeightMonitorVisible: !(this.data.f3DeviceVariant === 'imu' || this.data.f3SensorUi === 'imu'),
                  f3SensorUiSwitching: false
                }
              : {}),
            ...(this.data.isConnected
              ? this._resetF2HwMonitorState(true, patch.currentModel)
              : {
                  f3AttitudeHint: '请先连接蓝牙',
                  f3AttitudeRollDeg: 0,
                  f3ImuLiveDegText: '—',
                  f3HeightText: '请先连接蓝牙',
                  f3HeightLive: false
                })
          }
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
    if (typeof afterOpen === 'function') {
      setTimeout(afterOpen, guardMs + 40);
    }
  },

  _closeDetailAnimated(extraPatch = {}) {
    if (this._detailClosing) return;
    this._detailClosing = true;
    const guardMs = 360;
    this._controlTapLockUntil = Date.now() + guardMs;
    if (this._detailEnterTimer) clearTimeout(this._detailEnterTimer);
    if (this._detailCloseTimer) clearTimeout(this._detailCloseTimer);
    this.setData({ detailEnterAnim: false, blockDetailTouch: false });
    this._detailCloseTimer = setTimeout(() => {
      this._detailCloseTimer = null;
      this._detailClosing = false;
      this.setData({
        showDetail: false,
        detailMode: 'main',
        f2ControlPanelOpen: false,
        ...extraPatch
      });
    }, guardMs);
  },

  openDetail(e) {
    if (this._isRemoteAssistUserLocked()) return;
    const index = parseInt(e.currentTarget.dataset.index);
    const currentModel = this.data.models[index];
    if (currentModel && currentModel.canLearn) {
      wx.navigateTo({ url: '/package-extra/pages/can-learn/can-learn' });
      return;
    }
    this.updateCardStatus(index);
    if (this.data.isConnected && isF2MaxStatusBleModel(currentModel)) {
      this._bleSessionModel = currentModel;
    }
    const detailPatch = {
      currentModel,
      angleBtnText: resolveOpenAngleBtnText(currentModel)
    };
    // 无回读机型：进入控制台即让高级配置滑块处于中间态
    if (modelUsesSettingClickOnly(currentModel)) {
      detailPatch.settingState = buildNeutralSettingState();
    }
    this._openDetailAnimated(detailPatch, () => {
      if (this.data.isConnected) {
        this._ensureF2StatusBleListener(true);
      }
      this._maybeShowCalSettingsGuide(currentModel);
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
    if (this._isRemoteAssistUserLocked()) {
      this._showCustomToast('远协进行中，请先结束协助', 'none', 2000);
      return;
    }
    if (this.data.showDetail) {
      if (this.data.detailMode === 'edit') {
        // 折叠角度：普通用户返回仍需「重启车子」确认；管理员点返回直接退出，不弹关钥匙
        if (this._isFoldEditActive()) {
          if (this.data.isAdmin) {
            this._exitFoldEditSilent();
          } else {
            this.exitEdit();
          }
          return;
        }
        this._disarmOpenAngleBleWatch();
        this.setData({ detailMode: 'main' });
      } else {
        this._disarmOpenAngleBleWatch();
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
      // 管理员：跳过密码与折叠教学，直接进编辑
      if (this.data.isAdmin) {
        if (!this.data.isAuthorized) {
          this.setData({ isAuthorized: true });
        }
        this._enterFoldEditWithoutTutorial();
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

  /** 管理员跳过折叠教学，直接进入折叠角度编辑 */
  _enterFoldEditWithoutTutorial() {
    this.stopTutorialLoop();
    this.setData({
      showTutorialModal: false,
      tutorialModalClosing: false,
      detailMode: 'edit',
      editType: 'fold',
      pendingEditType: 'fold'
    });
    this.initFoldMode();
    this.startFoldInlineHint();
  },

  showTutorial(type) {
    // 管理员不弹任何进页教学
    if (this.data.isAdmin) {
      if (type === 'fold' || this.data.pendingEditType === 'fold') {
        this._enterFoldEditWithoutTutorial();
      } else if (type === 'open' || this.data.pendingEditType === 'open') {
        this.initOpenMode();
      }
      return;
    }
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
        this.initFoldMode();
        this.startFoldInlineHint();
      }
    }, 420);

    // 教程结束后，如果是"打开角度"，初始化新的刻度模式
    if (type === 'open') {
      this.initOpenMode();
    }
  },

  // ===============================================
  // 完成设置 & 关钥匙动画（折叠角度：必须提示重启车子）
  // ===============================================
  _isFoldEditActive() {
    return this.data.detailMode === 'edit' && (
      this.data.editType === 'fold' ||
      this.data.pendingEditType === 'fold'
    );
  },

  /** 管理员返回：不弹关钥匙/重启，直接退出折叠角度编辑 */
  _exitFoldEditSilent() {
    this.stopOpenAngleTutorialLoop();
    if (this._foldFineTuneHintTimer) {
      clearTimeout(this._foldFineTuneHintTimer);
      this._foldFineTuneHintTimer = null;
    }
    if (this.data.keyLoopTimer) {
      clearTimeout(this.data.keyLoopTimer);
    }
    this._clearKeyCountdown && this._clearKeyCountdown();
    this._clearDeferredFaultReports();
    this.setData({
      showKeyModal: false,
      keyModalClosing: false,
      keyBtnLocked: false,
      showFoldFineTuneHint: false,
      showAngleHint: false,
      detailMode: 'main',
      editType: '',
      pendingEditType: ''
    });
  },

  exitEdit() {
    this.stopOpenAngleTutorialLoop();
    if (this._foldFineTuneHintTimer) {
      clearTimeout(this._foldFineTuneHintTimer);
      this._foldFineTuneHintTimer = null;
    }
    // 打开角度场景：直接退出编辑，避免“关钥匙倒计时弹窗”导致卡住感
    if (this.data.editType === 'open' && !this._isFoldEditActive()) {
      this._disarmOpenAngleBleWatch();
      if (this.data.keyLoopTimer) {
        clearTimeout(this.data.keyLoopTimer);
      }
      this._clearDeferredFaultReports();
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
      this._clearOpenAngleBleState();
      return;
    }

    // 折叠角度（全部机型 / 管理员 / 远协）：完成设置必须确认重启车子
    if (this.data.showKeyModal) return;
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
    this._foldAdjustActive = false;
    this._clearDeferredFaultReports();
    this.setData({ keyModalClosing: true });
    setTimeout(() => {
      this.setData({ 
        showKeyModal: false, 
        detailMode: 'main',
        keyModalClosing: false,
        pendingEditType: '',
        editType: 'fold'
      });
    }, 420);
  },

  initFoldMode() {
    this._clearDeferredFaultReports();
    const ang = Number.isFinite(this.data.foldServoAngle)
      ? this.data.foldServoAngle
      : FOLD_SERVO_ANGLE_DEFAULT;
    this._syncFoldUiFromServoAngle(ang);
  },

  _syncFoldUiFromServoAngle(angle) {
    const minAng = foldServoAngleMinForModel(this.data.currentModel);
    const ang = Math.max(
      minAng,
      Math.min(FOLD_SERVO_ANGLE_MAX, parseInt(angle, 10) || FOLD_SERVO_ANGLE_DEFAULT)
    );
    this.setData({
      foldServoAngle: ang,
      foldGap: foldGapFromServoAngle(ang)
    });
  },

  _trySyncAngleEditorsFromBle(parsed) {
    if (!parsed || parsed.ang == null || this._rulerTouchActive) return;
    if (this.data.detailMode !== 'edit') return;

    const ang = parseInt(parsed.ang, 10);
    if (!Number.isFinite(ang)) return;

    const model = this.data.currentModel;
    const foldMin = foldServoAngleMinForModel(model);

    if (parsed.itm === 0 || parsed.itm === 2) {
      this._lastBleFoldServoAngle = Math.max(
        foldMin,
        Math.min(FOLD_SERVO_ANGLE_MAX, ang)
      );
    }
    // 打开角度波轮：纯 UI，不跟蓝牙 ang 回读
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
    const isMtUltra = isMtUltraCardModel(model);
    const isF1 = model.name && model.name.includes('F1');
    const isF1Legacy = isF1 && !isMtUltra;
    const isF2MaxSeries = isF2MaxSeriesModel(model);
    
    this.maxAngle = 180;
    const maxDeg = 180;
    
    // 生成刻度数据 (扩展到更多刻度，实现无限滑动视觉效果)
    const count = (maxDeg - 0) / 2 + 1;
    const extendedCount = Math.max(count + 100, 200); // 至少200个刻度，支持无限滑动
    const ticks = new Array(Math.floor(extendedCount)).fill(0);

    // 进页：棍子竖直不联动；波轮落在中间，左右都能拨（纯 UI，不回读）
    const startUiDeg = Math.max(0, Math.min(maxDeg, 90));
    
    this.setData({
      detailMode: 'edit',
      editType: 'open',
      showFoldInlineHint: false,
      showFoldFineTuneHint: false,
      foldHintOffset: 0,
      adjustSlideOffset: 0,
      adjustSlideActive: false,
      isAdjustDemo: false,
      foldDemoPlaying: false,
      ticks: ticks,
      openAngleUiActive: false,
      currentAngle: startUiDeg,
      angleMode: '',
      angleRotation: 0,
      activeIndex: 0,
      translateX: 0,
      transition: 'none'
    });
    this._openAngleFullSwipeTimes = [];
    this._clearOpenAngleBleState();
    this._clearDeferredFaultReports();

    // 只摆波轮位置，不点亮棍子（openAngleUiActive=false → 棍子保持竖直）
    this.updateRuler(startUiDeg, false);
    this.setData({ openAngleUiActive: false, angleRotation: 0 });
    
    // 管理员不弹打开角度教学；普通用户仍引导
    if (!this.data.isAdmin && (isF1Legacy || isF2MaxSeries || isMtUltra)) {
       this.setData({ showAngleHint: true });
       this.startOpenAngleTutorialLoop();
       this.startAngleHintCountdown();
    } else {
       this.setData({ showAngleHint: false });
       this.stopOpenAngleTutorialLoop();
    }

    this._armOpenAngleBleWatch();
  },

  // ===============================================
  // 切换预设角度 (F2 点击160跳转，但能滑到170)
  // ===============================================
  switchAngle(e) {
    if (!this._ensureBleControlReady()) {
      return;
    }
    
    const angle = parseInt(e.currentTarget.dataset.angle);
    const targetDeg = angle;
    const currentModel = this.data.currentModel;

    this.setData({ angleMode: angle.toString(), openAngleUiActive: true }, () => {
      const presetCmd = openAnglePresetBleCommand(currentModel, angle);
      if (presetCmd && this._ensureBleControlReady(false)) {
        if (usesF2StyleOpenAngleBle(currentModel)) {
          console.log(`📤 [蓝牙] 打开角度预设 ${angle}° → "${presetCmd}" x2`);
          this._commitBleCommandAfterUi({
            sendText: presetCmd,
            times: 2,
            interval: 500,
            verify: null,
            label: '打开角度'
          });
        } else {
          console.log(`📤 [蓝牙] 打开角度预设 ${angle}° → "${presetCmd}"`);
          this._commitBleCommandAfterUi({
            sendText: presetCmd,
            times: 1,
            interval: 300,
            verify: null,
            label: '打开角度'
          });
        }
      }
    });

    this.updateRuler(targetDeg, true);
    wx.vibrateShort({ type: 'light' });
  },

  // ===============================================
  // 更新标尺与视图 (修复 Bug：确保传递正确角度给按钮逻辑)
  // ===============================================
  updateRuler(deg, animate) {
    if (deg < 0) deg = 0;

    const model = this.data.currentModel;
    const internalIndex = this._clampOpenAngleIndex(Math.round(deg / 2));
    deg = internalIndex * 2;
    const visualIndex = openAngleVisualIndexFromInternal(model, deg);
    const trans = this._indexToOpenAngleTranslate(visualIndex);
    this._rulerTranslateX = trans;

    const uiActive = !!this.data.openAngleUiActive;
    const patch = {
      translateX: trans,
      transition: animate ? 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none'
    };
    // 没点预设：只摆波轮，不改棍子/数字
    if (uiActive) {
      patch.currentAngle = deg;
      patch.activeIndex = internalIndex;
      patch.angleRotation = openAngleStickRotateDeg(model, deg);
    }
    this.setData(patch);
    if (uiActive) this.updateAngleText(deg);
  },

  // ===============================================
  // 触摸交互核心修复 (物理驱动动画)
  // ===============================================

  _clampOpenAngleIndex(idx) {
    const n = Math.round(idx);
    if (n < 0) return 0;
    const maxDeg = openAngleMaxDeg(this.data.currentModel, this.maxAngle != null ? this.maxAngle : 180);
    const maxIdx = Math.floor(maxDeg / 2);
    return n > maxIdx ? maxIdx : n;
  },

  _indexToOpenAngleTranslate(idx) {
    // 视觉位移不强制吸到角度边界；写入已知角度位置时用 clamp 后的 index
    return -(Math.round(Number(idx) || 0) * this.tickWidthPx);
  },

  _openAngleIndexFromTranslate(trans) {
    return Math.round(-(trans || 0) / this.tickWidthPx);
  },

  /** 仅用于「把波轮吸回当前有效角度」；跟手拖动时不要用 */
  _clampOpenAngleTranslate(trans) {
    const idx = this._clampOpenAngleIndex(this._openAngleIndexFromTranslate(trans));
    return this._indexToOpenAngleTranslate(idx);
  },

  _clearOpenAngleBleState() {
    this._rulerLastTouchX = null;
    this._rulerGestureMinIndex = null;
    this._rulerGestureMaxIndex = null;
    this._rulerGestureStartIndex = null;
    this._rulerGestureEndIndex = null;
  },

  // ===============================================
  // 打开角度页：蓝牙掉线拦截
  // 调角度全程依赖蓝牙，断了却没提示会让用户以为拨了就生效了
  // ===============================================
  _isOpenAngleEditActive() {
    return !!this.data.showDetail
      && this.data.detailMode === 'edit'
      && this.data.editType === 'open';
  },

  /**
   * 进入打开角度页时武装拦截。
   * 只有「进来时是连着的」才武装：管理员本就没连蓝牙也能进这页，
   * 对他弹「正在重连」是错的。
   */
  _armOpenAngleBleWatch() {
    this._clearOpenAngleBleWatchTimer();
    this._openAngleBleWatchArmed = this._canSendBleCommand();
    this._syncOpenAngleBleLostMask();
    if (!this._openAngleBleWatchArmed) return;
    this._startOpenAngleBleWatchTimer();
  },

  /** 连接状态散落在多处 setData，巡检兜底比逐个挂钩子可靠 */
  _startOpenAngleBleWatchTimer() {
    if (this._openAngleBleWatchTimer) return;
    this._openAngleBleWatchTimer = setInterval(() => {
      if (!this._isOpenAngleEditActive()) {
        this._disarmOpenAngleBleWatch();
        return;
      }
      this._syncOpenAngleBleLostMask();
    }, OPEN_ANGLE_BLE_WATCH_MS);
  },

  _clearOpenAngleBleWatchTimer() {
    if (this._openAngleBleWatchTimer) {
      clearInterval(this._openAngleBleWatchTimer);
      this._openAngleBleWatchTimer = null;
    }
  },

  /**
   * 回到前台：onHide 只停了巡检，武装状态要保留。
   * 这里不能走 _armOpenAngleBleWatch 重新判定——回来时可能正断着，
   * 那样会把武装状态判掉，反而永远不弹拦截层。
   */
  _resumeOpenAngleBleWatch() {
    if (!this._openAngleBleWatchArmed) return;
    if (!this._isOpenAngleEditActive()) {
      this._disarmOpenAngleBleWatch();
      return;
    }
    this._syncOpenAngleBleLostMask();
    this._startOpenAngleBleWatchTimer();
  },

  _disarmOpenAngleBleWatch() {
    this._openAngleBleWatchArmed = false;
    this._clearOpenAngleBleWatchTimer();
    if (this.data.openAngleBleLostVisible || this.data.openAngleBleLostRetrying) {
      this.setData({ openAngleBleLostVisible: false, openAngleBleLostRetrying: false });
    }
  },

  _syncOpenAngleBleLostMask() {
    if (!this._openAngleBleWatchArmed || !this._isOpenAngleEditActive()) {
      if (this.data.openAngleBleLostVisible || this.data.openAngleBleLostRetrying) {
        this.setData({ openAngleBleLostVisible: false, openAngleBleLostRetrying: false });
      }
      return;
    }
    const visible = !this._canSendBleCommand();
    const retrying = visible && (
      !!this.data.isBleAutoReconnecting || !!this.data.isConnecting || !!this.data.isScanning
    );
    if (visible === this.data.openAngleBleLostVisible
      && retrying === this.data.openAngleBleLostRetrying) {
      return;
    }
    this.setData({ openAngleBleLostVisible: visible, openAngleBleLostRetrying: retrying });
    if (visible) {
      // 断在半个手势里：清掉波轮手势状态，恢复后不要接着补发剩下的格数
      this._rulerTouchActive = false;
      this._clearOpenAngleBleState();
    }
  },

  /** 拦截层里的「重新连接」：自动重连放弃后手动再来一轮 */
  retryOpenAngleBleLink() {
    if (this._canSendBleCommand()) {
      this._syncOpenAngleBleLostMask();
      return;
    }
    if (!this._lastBleDevice) {
      this._showCustomToast('找不到上次连接的设备，请返回重新连接', 'none', 2600);
      return;
    }
    this._bleReconnectStoppedByUser = false;
    this.setData({ bleReconnectAttempt: 0 });
    this._requestBleAutoReconnect('open_angle_manual');
    this._syncOpenAngleBleLostMask();
  },

  // ===============================================
  // 触摸开始：记录起点；全系列单次手势最多 ±3 格
  // ===============================================
  onTouchStart(e) {
    this._rulerTouchActive = true;
    const touchX = e.touches[0].clientX;
    this._rulerLastTouchX = touchX;
    this._rulerTranslateX = this.data.translateX || 0;

    // 用手势起点的「视觉格」算 ±3，不要先吸到角度边界（否则顶到 0/180 就拨不动）
    const startIndex = this._openAngleIndexFromTranslate(this._rulerTranslateX);
    const tickLimit = OPEN_ANGLE_TICKS_PER_GESTURE;
    this.lastVibrateIndex = startIndex;
    this._rulerGestureStartIndex = startIndex;
    this._rulerGestureEndIndex = startIndex;
    // 出厂设置打开角度：只允许从左往右滑（index 减小），禁止往回拨
    if (this._isFactoryResetOpenAngleStep()) {
      this._rulerGestureMinIndex = startIndex - tickLimit;
      this._rulerGestureMaxIndex = startIndex;
    } else {
      this._rulerGestureMinIndex = startIndex - tickLimit;
      this._rulerGestureMaxIndex = startIndex + tickLimit;
    }
  },

  /**
   * 跨过的每一格：震动 + 发蓝牙。
   * 未点预设：波轮能动、蓝牙照发；棍子/数字不同步。
   * 到 0/180 后波轮仍可继续拨，蓝牙也继续按格发。
   */
  _stepOpenAngleTicksToward(targetIndex, opts) {
    const from = this.lastVibrateIndex;
    if (targetIndex === from) return;
    const currentModel = (opts && opts.currentModel) || this.data.currentModel;
    const canSend = !!(opts && opts.canSend);
    const slideCmds = opts && opts.slideCmds;
    const stepGap = (opts && opts.stepGap) != null ? opts.stepGap : BLE_ANGLE_STEP_GAP_MS;
    const uiActive = !!this.data.openAngleUiActive;
    const dir = targetIndex > from ? 1 : -1;
    let i = from;
    while (i !== targetIndex) {
      i += dir;
      wx.vibrateShort({ type: 'light' });
      // 过 0/上限也继续发，不要因夹紧角度没变就停
      if (slideCmds && canSend) {
        const cmd = dir > 0 ? slideCmds.decrease : slideCmds.increase;
        this._enqueueBleSendBurst(cmd, 1, stepGap);
      }
      if (uiActive) {
        const displayAngle = this._clampOpenAngleIndex(i) * 2;
        this.setData({
          currentAngle: displayAngle,
          activeIndex: this._clampOpenAngleIndex(i),
          angleRotation: openAngleStickRotateDeg(currentModel, displayAngle)
        });
        this.updateAngleText(displayAngle);
      }
    }
    this.lastVibrateIndex = targetIndex;
    this._rulerGestureEndIndex = targetIndex;
  },

  // ===============================================
  // 触摸移动：波轮平移跟手指（可越过 0/上限）
  // 右→左增大；左→右减小
  // ===============================================
  onTouchMove(e) {
    if (!e.touches || !e.touches.length) return;
    const touchX = e.touches[0].clientX;
    if (this._rulerLastTouchX == null) {
      this.onTouchStart(e);
      return;
    }

    const delta = (touchX - this._rulerLastTouchX) * OPEN_ANGLE_RULER_SENSITIVITY;
    this._rulerLastTouchX = touchX;
    if (Math.abs(delta) < 0.35) return;
    // 出厂设置打开角度：只跟手从左往右（delta>0），右往左直接忽略
    if (this._isFactoryResetOpenAngleStep() && delta < 0) return;

    // 波轮连续跟手：只限本手势 ±3 格，不按角度 0/上限锁死位移
    let newTranslateX = this._rulerTranslateX + delta;
    if (this._rulerGestureMinIndex != null && this._rulerGestureMaxIndex != null) {
      const minTrans = -this._rulerGestureMaxIndex * this.tickWidthPx;
      const maxTrans = -this._rulerGestureMinIndex * this.tickWidthPx;
      if (newTranslateX < minTrans) newTranslateX = minTrans;
      if (newTranslateX > maxTrans) newTranslateX = maxTrans;
    }
    this._rulerTranslateX = newTranslateX;

    this.setData({
      translateX: newTranslateX,
      transition: 'none'
    });

    let visualIndex = this._openAngleIndexFromTranslate(newTranslateX);
    if (this._rulerGestureMinIndex != null && this._rulerGestureMaxIndex != null) {
      if (visualIndex < this._rulerGestureMinIndex) visualIndex = this._rulerGestureMinIndex;
      if (visualIndex > this._rulerGestureMaxIndex) visualIndex = this._rulerGestureMaxIndex;
    }

    if (visualIndex === this.lastVibrateIndex) return;

    const currentModel = this.data.currentModel;
    const isFactoryOpenAngle = this._isFactoryResetOpenAngleStep();
    const isOpenMode = this.data.editType === 'open' || isFactoryOpenAngle;
    // 波轮拨完就发蓝牙；预设只锁棍子/数字 UI，不挡发送
    const canSend = isOpenMode && this._canSendBleCommand();
    const slideCmds = isOpenMode ? openAngleSlideBleCommands(currentModel) : null;
    const stepGap = openAngleBleStepGapMs(currentModel);

    this._stepOpenAngleTicksToward(visualIndex, {
      currentModel,
      canSend,
      slideCmds,
      stepGap
    });
  },

  onRulerTouchEnd() {
    this._rulerTouchActive = false;
    const isFactoryOpenAngle = this._isFactoryResetOpenAngleStep();
    if (this.data.editType !== 'open' && !isFactoryOpenAngle) return;
    this._rulerLastTouchX = null;
    this._rulerGestureMinIndex = null;
    this._rulerGestureMaxIndex = null;
    const startIndex = this._rulerGestureStartIndex;
    const endIndex = this._rulerGestureEndIndex != null
      ? this._rulerGestureEndIndex
      : this._openAngleIndexFromTranslate(this.data.translateX || 0);
    // 松手吸到当前视觉整格；不要强制拉回 0/上限，方便接着往过界方向继续拨
    const snappedVisual = Math.round(Number(endIndex) || 0);
    const snapTrans = this._indexToOpenAngleTranslate(snappedVisual);
    this._rulerTranslateX = snapTrans;
    this.lastVibrateIndex = snappedVisual;
    const patch = {
      translateX: snapTrans,
      transition: 'none'
    };
    if (this.data.openAngleUiActive) {
      const displayAngle = this._clampOpenAngleIndex(snappedVisual) * 2;
      patch.currentAngle = displayAngle;
      patch.activeIndex = this._clampOpenAngleIndex(snappedVisual);
      patch.angleRotation = openAngleStickRotateDeg(this.data.currentModel, displayAngle);
    }
    if (Math.abs((this.data.translateX || 0) - snapTrans) > 0.5 || this.data.openAngleUiActive) {
      this.setData(patch);
      if (this.data.openAngleUiActive) this.updateAngleText(patch.currentAngle);
    }
    if (startIndex == null) return;
    const tickMoved = Math.abs(snappedVisual - startIndex);
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
    if (this._f3HeightBleTxActive) {
      this._f3HeightBleTxActive = false;
      if (typeof this._f3HeightBleTxIdleCb === 'function') {
        const cb = this._f3HeightBleTxIdleCb;
        this._f3HeightBleTxIdleCb = null;
        cb();
      }
    }
  },

  _f3CancelHeightCharTimers() {
    if (this._f3HeightCharTimers && this._f3HeightCharTimers.length) {
      this._f3HeightCharTimers.forEach((t) => clearTimeout(t));
    }
    this._f3HeightCharTimers = [];
  },

  _f3HeightLog() {},

  _f3WaitBleQueueIdle(maxWaitMs) {
    const maxWait = maxWaitMs || 15000;
    const deadline = Date.now() + maxWait;
    return new Promise((resolve) => {
      const tick = () => {
        if ((!this._bleSendQueue || !this._bleSendQueue.length) && !this._bleSendDraining) {
          resolve();
          return;
        }
        if (Date.now() >= deadline) {
          resolve();
          return;
        }
        setTimeout(tick, 80);
      };
      tick();
    });
  },

  /** 逐字符入队发送：靠 BLE 队列本身排序+等待写入结果，而不是 setTimeout，
   * 这样 _clearBleSendQueue 才能真正打断，不会和下一条命令的字符交叉。 */
  _f3EnqueueHeightCmdChars(cmd) {
    const raw = String(cmd || '').replace(/#$/, '');
    if (this._isRemoteAssistAdminRelay()) {
      this._relayBleCommand(raw, 1, 0);
      return;
    }
    const text = `${raw}#`;
    const parts = text.split('');
    this._f3HeightBleTxActive = true;
    this._bumpF3HeightBleGrace(parts.length * 280 + 8000);
    parts.forEach((ch, idx) => this._enqueueBleSend(ch, 280, { f3HeightChar: true, f3HeightIdx: idx, f3HeightTotal: parts.length }));
  },

  /** 带自动重试的高度写入：BLE 偶发丢字符时，固件校验和会拒绝错误数据，
   * 这里检测不到确认回读就自动重发，而不是让用户自己发现失败再手动点。 */
  _f3SubmitHeightMmRetrying(kind, units, options) {
    const opts = options || {};
    const maxAttempts = opts.maxAttempts || 4;
    const ackTimeout = opts.ackTimeout || 6000;
    const label = kind === 'danger' ? '危险高度' : '检测高度';
    const seq = (this._f3HeightWriteSeq || 0) + 1;
    this._f3HeightWriteSeq = seq;
    let attempt = 0;
    this._f3HeightLog('重试写入开始', { kind, units, maxAttempts, seq });

    const trySend = () => {
      if (this._f3HeightWriteSeq !== seq) return;
      attempt++;
      this._f3HeightLog(`第${attempt}次发送`, { kind, units, maxAttempts });
      if (attempt === 1 && !opts.quiet) {
        this._showCustomToast(`正在写入${label} ${units} mm…`, 'none', 1500);
      }
      const ok = this._f3SubmitHeightMm(kind, units, {
        silent: true,
        ackTimeout,
        autoCfg: !!opts.autoCfg,
        onAck: () => {
          if (this._f3HeightWriteSeq !== seq) return;
          console.log(`[${label}] 第${attempt}次确认成功`);
          if (!opts.quiet) {
            this._showCustomToast(`${label}已写入 ${units} mm`, 'none', 1800);
            wx.vibrateShort({ type: 'light' });
          }
          if (typeof opts.onDone === 'function') opts.onDone(true);
        },
        onFail: () => {
          if (this._f3HeightWriteSeq !== seq) return;
          if (attempt < maxAttempts) {
            console.warn(`[${label}] 第${attempt}次未确认，准备重试`);
            const retry = () => {
              if (this._f3HeightWriteSeq !== seq) return;
              trySend();
            };
            if (this._f3CalWritingHeights && this._f3LastStatusF3c !== 1) {
              this._f3EnsureHeightConfigModeForWrite({ quiet: true, clearQueue: false, timeoutMs: 12000 })
                .then(() => setTimeout(retry, 800))
                .catch(() => setTimeout(retry, 1200));
            } else {
              setTimeout(retry, 1200);
            }
          } else {
            console.error(`[${label}] 重试${maxAttempts}次仍未确认`);
            if (!opts.quiet) this._showCustomToast(`${label}写入失败，请重新点写入`, 'none', 2600);
            if (typeof opts.onDone === 'function') opts.onDone(false);
          }
        }
      });
      if (!ok) {
        if (
          !opts.autoCfg
          && !this.data.f3HeightConfigModeOn
          && attempt <= 1
        ) {
          this._f3EnsureHeightConfigModeForWrite({ quiet: true, timeoutMs: 12000 })
            .then(() => {
              opts.autoCfg = true;
              setTimeout(trySend, 400);
            })
            .catch(() => {
              if (typeof opts.onDone === 'function') opts.onDone(false);
            });
          return;
        }
        if (
          Date.now() < (this._f3CfgReadyAt || 0)
          && attempt < maxAttempts
        ) {
          setTimeout(trySend, Math.max(300, (this._f3CfgReadyAt || 0) - Date.now() + 80));
          return;
        }
        if (attempt < maxAttempts) {
          setTimeout(trySend, 1200);
        } else {
          if (!opts.quiet) {
            this._showCustomToast(`${label}发送失败`, 'none', 2000);
          }
          if (typeof opts.onDone === 'function') opts.onDone(false);
        }
      }
    };

    trySend();
  },

  _f3HeightWriteWithAck(kind, units) {
    return new Promise((resolve, reject) => {
      this._f3SubmitHeightMmRetrying(kind, units, {
        maxAttempts: 4,
        ackTimeout: 6000,
        quiet: true,
        onDone: (ok) => {
          if (ok) setTimeout(resolve, 800);
          else reject(new Error(`${kind} failed after retries`));
        }
      });
    });
  },

  // ===============================================
  // 3. 微调逻辑（折叠角度：全机型可发，禁止再做机型白名单）
  // ===============================================
  handleAdjust(e) {
    if (!this._ensureBleControlReady()) {
      return;
    }

    const ds = (e && e.currentTarget && e.currentTarget.dataset) || {};
    const action = ds.action;
    const mode = ds.mode;
    // 以 fold 页/按钮 mode 为准，避免 editType 偶发空值落到 open 分支
    const isFold =
      mode === 'fold' ||
      this.data.editType === 'fold' ||
      (this.data.detailMode === 'edit' && this.data.pendingEditType === 'fold');

    wx.vibrateShort({ type: 'light' });

    // --- A. 折叠模式（F1 MAX / 全部机型同一路径）---
    if (isFold) {
      let foldAng = this.data.foldServoAngle;
      if (!Number.isFinite(foldAng)) foldAng = FOLD_SERVO_ANGLE_DEFAULT;
      const currentModel = this.data.currentModel;

      if (action === 'left' || action === 'fine-tune-up') {
        const foldMin = foldServoAngleMinForModel(currentModel);
        if (foldAng > foldMin) foldAng--;
      } else if (action === 'right' || action === 'fine-tune-down') {
        if (foldAng < FOLD_SERVO_ANGLE_MAX) foldAng++;
      } else if (action === 'adjust') {
        this._foldAdjustActive = true;
        console.log('📤 [折叠角度] 全机型发送「调整折叠角度」', currentModel && currentModel.name, currentModel && currentModel.type);
        this.sendDataMultiple('调整折叠角度', 1, 300);
      } else if (action === 'zero') {
        foldAng = FOLD_SERVO_ANGLE_DEFAULT;
        console.log('📤 [折叠角度] 全机型发送「初始化角度」');
        this.sendDataMultiple('初始化角度', 2, 500);
        this.resetAdjustSlider(false);
      }

      const gap = foldGapFromServoAngle(foldAng);
      const isFineTune = action === 'left' || action === 'fine-tune-up'
        || action === 'right' || action === 'fine-tune-down';

      if (isFineTune) {
        const sendText = (action === 'left' || action === 'fine-tune-up') ? '调大' : '调小';
        this.setData({ foldServoAngle: foldAng, foldGap: gap }, () => {
          const sendTune = () => {
            this._commitBleCommandAfterUi({
              sendText,
              times: 1,
              interval: 200,
              verify: null,
              label: '折叠微调'
            });
          };
          if (!this._foldAdjustActive) {
            this._foldAdjustActive = true;
            this.sendDataMultiple('调整折叠角度', 1, 200);
            setTimeout(sendTune, 280);
          } else {
            sendTune();
          }
        });
        return;
      }

      this.setData({ foldServoAngle: foldAng, foldGap: gap });
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

    const model = this.data.currentModel;
    const isF1Legacy = model && model.name && model.name.includes('F1') && !isMtUltraCardModel(model);
    let activeMode = '';

    const tolerance = 2;

    if (Math.abs(currentAngle - 90) <= tolerance) {
      activeMode = '90';
    } else {
      if (isF1Legacy) {
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

  /** 直连或远协：真正能发指令才返回 true（远协要求用户蓝牙已连） */
  _ensureBleControlReady(showTip = true) {
    if (this._isRemoteAssistAdminRelay()) {
      return this._guardRemoteAssistAdminRelay(showTip);
    }
    if (this._canSendBleCommand()) return true;
    if (showTip) {
      this.setData({ showConnectBluetoothTip: true });
      setTimeout(() => this.setData({ showConnectBluetoothTip: false }), 2000);
    }
    return false;
  },

  // ===============================================
  // 🔴 自动校准功能
  // ===============================================
  handleAutoCalibrate() {
    if (Date.now() < (this._controlTapLockUntil || 0)) {
      this._showCustomToast('请稍候再试', 'none', 1200);
      return;
    }

    const currentModel = this.data.currentModel;
    const isAdmin = !!this.data.isAdmin;

    // F3：未连蓝牙也可打开向导调弹窗
    if (isF3MaxModel(currentModel)) {
      this.onF3StartAutoCal();
      return;
    }

    if (!isAdmin && !this._canControlDevice()) {
      this.setData({ showConnectBluetoothTip: true });
      setTimeout(() => {
        this.setData({ showConnectBluetoothTip: false });
      }, 2000);
      return;
    }

    // F2 除 PRO 外 + F1 Ultra
    if (!modelSupportsAutoCalibrate(currentModel)) {
      this._showCustomToast('该机型没有自动校准，请用折叠/打开角度调节', 'none', 2200);
      return;
    }

    if (!isAdmin && !this._ensureBleControlReady()) return;

    this.setData({
      showAutoCalGuideModal: true,
      autoCalGuideStage: 'check',
      autoCalGuideBtnDisabled: false,
      autoCalGuideText: '请单击按钮，观察后方是否转动',
      autoCalGuideHint: '按钮点击后应变红',
      autoCalGuideBtnPressing: false,
      autoCalGuideBtnLightOn: false
    });
    this._startAutoCalGuideAnim();
  },

  _startAutoCalibrateRun() {
    this._stopAutoCalGuideAnim();
    if (this._canSendBleCommand()) {
      console.log('📤 [蓝牙] 发送"自动调平"');
      this.sendDataMultiple('自动调平', 2, 500);
    } else {
      console.log('ℹ️ [自动校准] 当前未连蓝牙，仅展示流程');
    }
    this.setData({
      showAutoCalGuideModal: false,
      showCalibratingModal: true,
      calibratingBtnDisabled: true
    });
    setTimeout(() => {
      this.setData({ calibratingBtnDisabled: false });
    }, 3000);
  },

  onAutoCalGuideMoved() {
    if (this.data.autoCalGuideBtnDisabled) return;
    this._startAutoCalibrateRun();
  },

  onAutoCalGuideNotMoved() {
    if (this.data.autoCalGuideBtnDisabled) return;
    this._pendingStealthTutorialAction = 'auto_calibrate';
    this._stopAutoCalGuideAnim();
    this.setData({ showAutoCalGuideModal: false });
    this.openStealthTutorialWithMode('exit');
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

  // F2 ULTRA 蓝牙远程控制 + 语音页桥接
  _registerF2VoiceBridge() {
    f2VoiceBridge.registerBridge({
      sendCommand: (cmd) => {
        if (!this._canControlDevice()) return;
        const model = this.data.currentModel;
        const afterSend = () => {
          if (!this._canSendBleCommand()) return;
          // F3：持续发送直到回读到位
          if (isF3MaxModel(model) && (cmd === '打开' || cmd === '关闭')) {
            this._armF3FlapSendUntilReadback(cmd);
            return;
          }
          const verify = isMtUltraCardModel(model) && (cmd === '打开' || cmd === '关闭')
            ? { type: 'flap', cmd }
            : null;
          this._commitBleCommandAfterUi({
            sendText: flapBleWireText(model, cmd) || cmd,
            times: (cmd === '打开' || cmd === '关闭') ? flapBleSendTimes(model, cmd) : 2,
            interval: (cmd === '打开' || cmd === '关闭') ? flapBleSendInterval(model) : 500,
            verify,
            label: '语音控制'
          });
        };
        if (cmd === '打开' || cmd === '关闭') {
          if (cmd === '打开' && isF3MaxModel(model) && this._f3ShouldBlockFlapOpen()) {
            this._showCustomToast('距地面过近，禁止翻开', 'none', 2400);
            return;
          }
          if (cmd === '打开' && isF3MaxModel(model) && this._f3BumpBlocksOpen()) {
            this._showCustomToast('过坑中，暂勿再折叠', 'none', 2000);
            return;
          }
          if ((cmd === '打开' || cmd === '关闭') && this.data.flapPanelState === 'stealth') {
            this._showCustomToast('隐蔽模式中，请先退出', 'none', 2000);
            return;
          }
          const kick = () => {
            if (!this._isRemoteAssistAdminActive()) {
              this._setFlapPanelStateOptimistic(cmd, afterSend);
            } else {
              afterSend();
            }
          };
          if (isF3MaxModel(model)) {
            this._f3EnsureFlapControlReady(kick);
          } else {
            kick();
          }
        } else {
          afterSend();
        }
        wx.vibrateShort({ type: 'light' });
      },
      canInteract: () => this._canControlDevice(),
      isBleLinked: () => this._canSendBleCommand(),
      isAdmin: () => !!this.data.isAdmin,
      getFlapState: () => ({
        flapPanelState: this.data.flapPanelState,
        flapPanelStateText: this.data.flapPanelStateText
      })
    });
  },

  _publishFlapToVoiceBridge(state, text) {
    if (!isMtUltraCardModel(this.data.currentModel)) return;
    f2VoiceBridge.publish({
      type: 'flap',
      flapPanelState: state,
      flapPanelStateText: text
    });
  },

  _patchFlapGaugeSnap(updates) {
    return updates;
  },

  _flapGaugeRestDeg(state) {
    if (state === 'open') return FLAP_GAUGE_OPEN_DEG;
    return FLAP_GAUGE_CLOSED_DEG;
  },

  _flapGaugeSpinSign(dir) {
    return dir === 'open' ? 1 : -1;
  },

  _flapGaugeCurrentDeg() {
    if (this._flapGaugeLastPaintDeg != null && !Number.isNaN(this._flapGaugeLastPaintDeg)) {
      return this._flapGaugeLastPaintDeg;
    }
    const n = Number(this.data.flapGaugeRotateDeg);
    return Number.isFinite(n) ? n : FLAP_GAUGE_CLOSED_DEG;
  },

  _flapGaugeNearestRestDeg(current, targetState) {
    const rest = this._flapGaugeRestDeg(targetState);
    let best = rest;
    let bestDelta = Math.abs(rest - current);
    for (let k = -3; k <= 3; k++) {
      const candidate = rest + k * 360;
      const delta = Math.abs(candidate - current);
      if (delta < bestDelta) {
        bestDelta = delta;
        best = candidate;
      }
    }
    return best;
  },

  /** 只沿当前转向找下一个合相止位，绝不回拨（避免左下角“弹回去”） */
  _flapGaugeForwardRestDeg(current, sign, targetState) {
    const rest = this._flapGaugeRestDeg(targetState);
    let best = null;
    let bestDelta = Infinity;
    for (let k = -6; k <= 6; k++) {
      const candidate = rest + k * 360;
      const delta = (candidate - current) * sign;
      if (delta >= -0.5 && delta < bestDelta) {
        bestDelta = delta;
        best = candidate;
      }
    }
    if (best == null) {
      best = rest + (sign >= 0 ? 360 : -360);
    }
    return best;
  },

  _flapGaugeSpinDirForTarget(targetState) {
    const dir = this._flapGaugeSpinDir || this.data.flapGaugeSpinDir || this.data.flapMotionDir;
    if (dir === 'open' || dir === 'close') return dir;
    return targetState === 'open' ? 'open' : 'close';
  },

  /** 至少转满 MIN_LAPS 圈，且落点与目标止位同相（避免瞬跳到止位） */
  _computeFlapGaugeStopTraveled(baseDeg, sign, restDeg) {
    const minTraveled = FLAP_GAUGE_MIN_LAPS * 360;
    let tMod;
    if (sign > 0) {
      tMod = normDeg360(restDeg - baseDeg);
    } else {
      tMod = normDeg360(baseDeg - restDeg);
    }
    if (tMod < 0.5) tMod = 360;
    let traveled = tMod;
    while (traveled < minTraveled) traveled += 360;
    return traveled;
  },

  _clearFlapGaugeEaseTimer() {
    if (this._flapGaugeEaseTimer) {
      clearTimeout(this._flapGaugeEaseTimer);
      this._flapGaugeEaseTimer = null;
    }
  },

  /** 相位是否已与止位对齐（允许整圈差） */
  _flapGaugeSamePhase(current, targetState) {
    const rest = this._flapGaugeRestDeg(targetState);
    const phase = Math.abs(((current - rest) % 360 + 360) % 360);
    return phase < 1.2 || phase > 358.8;
  },

  /**
   * 最终必须停在开/关规范角，禁止停在半途。
   * 已同相：静默归一；刚越过：就近合相；其余：只沿转向前进到下一合相位。
   */
  _flapGaugeParkExactRest(targetState) {
    if (!targetState) return;
    this._stopFlapGaugeSpinLoop();
    this._clearFlapGaugeEaseTimer();
    const rest = this._flapGaugeRestDeg(targetState);
    const current = this._flapGaugeCurrentDeg();
    if (this._flapGaugeSamePhase(current, targetState)) {
      this._flapGaugeLastPaintDeg = rest;
      this.setData({
        flapGaugeSpinning: false,
        flapGaugeTransition: false,
        flapGaugeRotateDeg: rest
      });
      return;
    }
    const dir = this._flapGaugeSpinDirForTarget(targetState);
    const sign = this._flapGaugeSpinSign(dir);
    const forward = this._flapGaugeForwardRestDeg(current, sign, targetState);
    const dist = (forward - current) * sign;
    // 刚越过止位（前方要再绕近一圈）：用最近合相，避免再空转一圈或停半途
    const park = (dist >= 330 || dist < 0.8)
      ? this._flapGaugeNearestRestDeg(current, targetState)
      : forward;
    const jump = Math.abs(park - current);
    this._flapGaugeLastPaintDeg = park;
    this.setData({
      flapGaugeSpinning: true,
      flapGaugeTransition: jump > 1.5,
      flapGaugeRotateDeg: park
    });
    this._flapGaugeEaseTimer = setTimeout(() => {
      this._flapGaugeEaseTimer = null;
      this._flapGaugeLastPaintDeg = rest;
      this.setData({
        flapGaugeSpinning: false,
        flapGaugeTransition: false,
        flapGaugeRotateDeg: rest
      });
    }, jump > 1.5 ? FLAP_GAUGE_EASE_MS : 140);
  },

  _flapGaugeSnapToRest(targetState, opts) {
    if (!targetState) return;
    const soft = !!(opts && opts.soft);
    if (!soft) {
      this._stopFlapGaugeSpinLoop();
      this._clearFlapGaugeEaseTimer();
      const rest = this._flapGaugeRestDeg(targetState);
      this._flapGaugeLastPaintDeg = rest;
      this.setData({
        flapGaugeSpinning: false,
        flapGaugeTransition: false,
        flapGaugeRotateDeg: rest
      });
      return;
    }
    this._flapGaugeParkExactRest(targetState);
  },

  _clearFlapGaugeSpinStopTimer() {
    if (this._flapGaugeSpinStopTimer) {
      clearTimeout(this._flapGaugeSpinStopTimer);
      this._flapGaugeSpinStopTimer = null;
    }
    if (this._flapGaugeSpinWatchdogTimer) {
      clearTimeout(this._flapGaugeSpinWatchdogTimer);
      this._flapGaugeSpinWatchdogTimer = null;
    }
  },

  _stopFlapGaugeSpinLoop() {
    if (this._flapGaugeSpinTimer) {
      clearTimeout(this._flapGaugeSpinTimer);
      this._flapGaugeSpinTimer = null;
    }
    this._flapGaugeSpinActive = false;
    this._flapGaugeSpinStopAtTraveled = null;
    this._flapGaugePendingTarget = null;
    this._clearFlapGaugeSpinStopTimer();
  },

  _tickFlapGaugeSpin() {
    if (!this._flapGaugeSpinActive) return;
    const dir = this._flapGaugeSpinDir || 'open';
    const sign = this._flapGaugeSpinSign(dir);
    const elapsed = Date.now() - (this._flapGaugeSpinStartMs || Date.now());
    let traveled = elapsed * (360 / FLAP_GAUGE_CYCLE_MS);
    const stopAt = this._flapGaugeSpinStopAtTraveled;
    if (stopAt != null && traveled >= stopAt) {
      traveled = stopAt;
      const deg = (this._flapGaugeSpinBaseDeg || 0) + sign * traveled;
      const degRounded = Math.round(deg * 10) / 10;
      this._flapGaugeLastPaintDeg = degRounded;
      this.setData({
        flapGaugeRotateDeg: degRounded,
        flapGaugeTransition: false,
        flapGaugeSpinning: true,
        flapGaugeSpinDir: dir
      });
      this._flapGaugeSettleTo(this._flapGaugePendingTarget);
      return;
    }
    const deg = (this._flapGaugeSpinBaseDeg || 0) + sign * traveled;
    const degRounded = Math.round(deg * 10) / 10;
    // 滑动中不刷仪表角度，松手后下一帧会追上
    if (this._mainControlScrolling) return;
    if (this._flapGaugeLastPaintDeg !== degRounded) {
      this._flapGaugeLastPaintDeg = degRounded;
      const patch = {
        flapGaugeRotateDeg: degRounded,
        flapGaugeTransition: false
      };
      if (!this.data.flapGaugeSpinning) patch.flapGaugeSpinning = true;
      if (this.data.flapGaugeSpinDir !== dir) patch.flapGaugeSpinDir = dir;
      this.setData(patch);
    }
  },

  _startFlapGaugeSpinLoop() {
    if (this._flapGaugeSpinTimer) return;
    const tick = () => {
      if (!this._flapGaugeSpinActive) {
        this._flapGaugeSpinTimer = null;
        return;
      }
      this._tickFlapGaugeSpin();
      if (!this._flapGaugeSpinActive) {
        this._flapGaugeSpinTimer = null;
        return;
      }
      this._flapGaugeSpinTimer = setTimeout(tick, FLAP_GAUGE_TICK_MS);
    };
    tick();
  },

  _armFlapGaugeSpin(dir) {
    if (!isMtUltraCardModel(this.data.currentModel)) return;
    const spinDir = dir === 'close' ? 'close' : 'open';
    this._clearFlapGaugeEaseTimer();
    const sameDir = this._flapGaugeSpinActive && this._flapGaugeSpinDir === spinDir;
    if (sameDir) {
      // 仍在运动：取消上一次“已到位刹停”，继续自由转，避免指令/状态包一来就半途掐停
      this._flapGaugeSpinStopAtTraveled = null;
      this._flapGaugePendingTarget = null;
      if (!this._flapGaugeSpinTimer) this._startFlapGaugeSpinLoop();
      this._armFlapGaugeSpinWatchdog();
      return;
    }
    const baseDeg = this._flapGaugeCurrentDeg();
    this._stopFlapGaugeSpinLoop();
    this._flapGaugeSpinDir = spinDir;
    this._flapGaugeSpinBaseDeg = baseDeg;
    this._flapGaugeSpinStartMs = Date.now();
    this._flapGaugeSpinActive = true;
    this._flapGaugeSpinStopAtTraveled = null;
    this._flapGaugePendingTarget = null;
    this._flapGaugeLastPaintDeg = baseDeg;
    this.setData({
      flapGaugeSpinning: true,
      flapGaugeSpinDir: spinDir,
      flapGaugeTransition: false,
      flapGaugeRotateDeg: baseDeg
    });
    this._startFlapGaugeSpinLoop();
    this._armFlapGaugeSpinWatchdog();
  },

  _armFlapGaugeSpinWatchdog() {
    if (this._flapGaugeSpinWatchdogTimer) {
      clearTimeout(this._flapGaugeSpinWatchdogTimer);
    }
    this._flapGaugeSpinWatchdogTimer = setTimeout(() => {
      this._flapGaugeSpinWatchdogTimer = null;
      if (!this._flapGaugeSpinActive && !this.data.flapGaugeSpinning) return;
      const state = this.data.flapPanelState;
      if (state === 'open' || state === 'closed') {
        this._flapGaugeSnapToRest(state, { soft: true });
      } else {
        this._stopFlapGaugeSpinImmediate();
      }
    }, FLAP_GAUGE_SPIN_WATCHDOG_MS);
  },

  _inferFlapMotionDir(updates, prev) {
    let dir = (updates && updates.flapMotionDir) || this.data.flapMotionDir;
    if (dir === 'open' || dir === 'close') return dir;
    if (prev === 'open') return 'close';
    if (prev === 'closed') return 'open';
    return 'open';
  },

  _inferFlapRestSpinDir(prev, next) {
    if (next === 'open') return 'open';
    if (next === 'closed') return 'close';
    if (prev === 'open') return 'close';
    if (prev === 'closed') return 'open';
    return 'open';
  },

  /** 沿当前转向，到达目标止位还需转的角度（不回退） */
  _flapGaugeRemainingToRest(current, sign, targetState) {
    const forward = this._flapGaugeForwardRestDeg(current, sign, targetState);
    return Math.max(0, (forward - current) * sign);
  },

  /**
   * 正在转时突然到位：从当前角度沿原方向继续转到合相位刹停。
   * 绝不停在半途。
   */
  _requestFlapGaugeSpinStop(targetState) {
    if (!isMtUltraCardModel(this.data.currentModel)) return;
    if (!targetState) return;

    // 已在朝同一止位刹停：不要反复重置行程，否则会“中途掐断”
    if (
      this._flapGaugeSpinActive &&
      this._flapGaugePendingTarget === targetState &&
      this._flapGaugeSpinStopAtTraveled != null
    ) {
      this._armFlapGaugeSpinWatchdog();
      if (!this._flapGaugeSpinTimer) this._startFlapGaugeSpinLoop();
      return;
    }

    if (!this._flapGaugeSpinActive) {
      this._flapGaugeParkExactRest(targetState);
      return;
    }

    const dir = this._flapGaugeSpinDir || 'open';
    const sign = this._flapGaugeSpinSign(dir);
    const current = this._flapGaugeCurrentDeg();
    const need = this._flapGaugeRemainingToRest(current, sign, targetState);

    // 已合相 / 刚越过：直接落到规范止位（绝不半途冻结）
    if (need < 1 || need >= 330) {
      this._flapGaugeParkExactRest(targetState);
      return;
    }

    // 剩余不大：软过渡到合相位
    if (need < 28) {
      this._flapGaugeParkExactRest(targetState);
      return;
    }

    // 以当前角为新起点，只走剩余前进角
    this._flapGaugeSpinBaseDeg = current;
    this._flapGaugeSpinStartMs = Date.now();
    this._flapGaugeSpinStopAtTraveled = need;
    this._flapGaugePendingTarget = targetState;
    this._flapGaugeLastPaintDeg = current;
    this._armFlapGaugeSpinWatchdog();
    if (!this._flapGaugeSpinTimer) this._startFlapGaugeSpinLoop();
    if (!this.data.flapGaugeSpinning) {
      this.setData({ flapGaugeSpinning: true, flapGaugeSpinDir: dir });
    }
  },

  _flapGaugeSettleTo(targetState) {
    const stopAt = this._flapGaugeSpinStopAtTraveled;
    const base = Number(this._flapGaugeSpinBaseDeg) || 0;
    const sign = this._flapGaugeSpinSign(this._flapGaugeSpinDir || 'open');
    const current = this._flapGaugeCurrentDeg();
    this._stopFlapGaugeSpinLoop();
    this._clearFlapGaugeEaseTimer();
    if (!targetState) {
      if (this.data.flapGaugeSpinning) {
        this.setData({ flapGaugeSpinning: false, flapGaugeTransition: false });
      }
      return;
    }
    const rest = this._flapGaugeRestDeg(targetState);
    let landed = stopAt != null
      ? base + sign * stopAt
      : this._flapGaugeForwardRestDeg(current, sign, targetState);

    // 禁止任何回拨落点
    const jump = (landed - current) * sign;
    if (jump < -0.5) {
      landed = this._flapGaugeForwardRestDeg(current, sign, targetState);
    }
    // 若前进落点还要绕一大圈，说明已越过 → 直接规范止位
    if ((landed - current) * sign >= 330) {
      this._flapGaugeParkExactRest(targetState);
      return;
    }

    landed = Math.round(landed * 10) / 10;
    this._flapGaugeLastPaintDeg = landed;
    this.setData({
      flapGaugeSpinning: true,
      flapGaugeTransition: false,
      flapGaugeRotateDeg: landed
    });
    this._flapGaugeEaseTimer = setTimeout(() => {
      this._flapGaugeEaseTimer = null;
      this._flapGaugeLastPaintDeg = rest;
      this.setData({
        flapGaugeSpinning: false,
        flapGaugeTransition: false,
        flapGaugeRotateDeg: rest
      });
    }, 80);
  },

  /** 刹停后根据循环是否还在转，写回 updates，避免外层 setData 把 spinning 又写回 true */
  _syncFlapGaugeSpinFlagToUpdates(updates, targetState) {
    if (!updates) return;
    // 还在转，或软过渡收尾中：保持黄色，别把止位角写回 updates 造成跳变
    if (this._flapGaugeSpinActive || this._flapGaugeEaseTimer) {
      updates.flapGaugeSpinning = true;
      if ('flapGaugeRotateDeg' in updates) delete updates.flapGaugeRotateDeg;
      return;
    }
    updates.flapGaugeSpinning = false;
    if (targetState === 'open' || targetState === 'closed') {
      const rest = this._flapGaugeRestDeg(targetState);
      updates.flapGaugeRotateDeg = rest;
      this._flapGaugeLastPaintDeg = rest;
    }
  },

  /** 兜底：已开/已关时指针必须在止位；修掉历史「半途冻结」 */
  _ensureFlapGaugeRestVisual() {
    const state = this.data.flapPanelState;
    if (state !== 'open' && state !== 'closed') return;
    if (this._flapGaugeSpinActive || this._flapGaugeEaseTimer) return;
    const rest = this._flapGaugeRestDeg(state);
    const current = this._flapGaugeCurrentDeg();
    const aligned = this._flapGaugeSamePhase(current, state)
      && Math.abs(current - rest) < 2;
    if (aligned && !this.data.flapGaugeSpinning) return;
    this._flapGaugeLastPaintDeg = rest;
    this.setData({
      flapGaugeSpinning: false,
      flapGaugeTransition: false,
      flapGaugeRotateDeg: rest
    });
  },

  _cancelFlapGaugeSpin(targetState) {
    if (!targetState) {
      this._stopFlapGaugeSpinLoop();
      return;
    }
    this._flapGaugeParkExactRest(targetState);
  },

  _stopFlapGaugeSpinImmediate() {
    this._stopFlapGaugeSpinLoop();
    this._clearFlapGaugeEaseTimer();
    if (this.data.flapGaugeSpinning) {
      this.setData({ flapGaugeSpinning: false, flapGaugeSpinDir: 'open' });
    }
  },

  /**
   * 到位不再瞬跳：转动中持续旋转；收到 open/closed 后同相刹停。
   * 若状态直接 closed↔open（跳过 moving），也会先转起来再刹停。
   */
  _patchFlapGaugeSpin(updates) {
    if (!updates || updates.flapPanelState === undefined) return updates;
    if (!isMtUltraCardModel(this.data.currentModel)) return updates;
    const prev = this.data.flapPanelState;
    const next = updates.flapPanelState;

    if (next === 'moving') {
      const dir = this._inferFlapMotionDir(updates, prev);
      updates.flapMotionDir = dir;
      const spinDir = dir === 'close' ? 'close' : 'open';
      updates.flapGaugeSpinning = true;
      updates.flapGaugeSpinDir = spinDir;
      updates.flapGaugeTransition = false;
      if ('flapGaugeRotateDeg' in updates) delete updates.flapGaugeRotateDeg;
      this._armFlapGaugeSpin(spinDir);
    } else if (next === 'open' || next === 'closed') {
      // 关键：绝不能在 setData 里直接写死止位角，否则会从任意中间角瞬跳
      if ('flapGaugeRotateDeg' in updates) delete updates.flapGaugeRotateDeg;
      updates.flapGaugeTransition = false;
      if (prev === next && !this._flapGaugeSpinActive) {
        updates.flapGaugeSpinning = false;
        updates.flapGaugeRotateDeg = this._flapGaugeRestDeg(next);
      } else if (this._flapGaugeSpinActive) {
        this._requestFlapGaugeSpinStop(next);
        // 若已同步刹停，绝不能再把 spinning 写回 true（否则黄盘卡死）
        this._syncFlapGaugeSpinFlagToUpdates(updates, next);
      } else {
        const spinDir = this._inferFlapRestSpinDir(prev, next);
        updates.flapGaugeSpinDir = spinDir;
        this._armFlapGaugeSpin(spinDir);
        this._requestFlapGaugeSpinStop(next);
        this._syncFlapGaugeSpinFlagToUpdates(updates, next);
      }
    } else if (next === 'stealth' || next === 'fault' || next === 'unknown') {
      updates.flapGaugeSpinning = false;
      updates.flapGaugeSpinDir = 'open';
      const targetDeg = (next === 'stealth' || next === 'fault') ? -90 : FLAP_GAUGE_CLOSED_DEG;
      this._stopFlapGaugeSpinLoop();
      this._clearFlapGaugeEaseTimer();
      const current = this._flapGaugeCurrentDeg();
      let nearest = targetDeg;
      let bestDelta = Math.abs(targetDeg - current);
      for (let k = -3; k <= 3; k++) {
        const candidate = targetDeg + k * 360;
        const delta = Math.abs(candidate - current);
        if (delta < bestDelta) {
          bestDelta = delta;
          nearest = candidate;
        }
      }
      if (bestDelta < 0.8) {
        updates.flapGaugeTransition = false;
        updates.flapGaugeRotateDeg = targetDeg;
      } else {
        updates.flapGaugeTransition = true;
        updates.flapGaugeRotateDeg = nearest;
        this._flapGaugeEaseTimer = setTimeout(() => {
          this._flapGaugeEaseTimer = null;
          this._flapGaugeLastPaintDeg = targetDeg;
          this.setData({
            flapGaugeTransition: false,
            flapGaugeRotateDeg: targetDeg
          });
        }, FLAP_GAUGE_EASE_MS);
      }
      this._flapGaugeLastPaintDeg = updates.flapGaugeRotateDeg;
    }
    return updates;
  },

  _releaseFlapGaugeSnap() {
    /* legacy no-op */
  },

  _setFlapPanelData(patch, done) {
    const updates = this._patchFlapGaugeSnap({ ...(patch || {}) });
    this._patchFlapGaugeSpin(updates);
    this.setData(updates, () => {
      this._ensureFlapGaugeRestVisual();
      if (typeof done === 'function') done();
    });
  },

  _publishBleToVoiceBridge(connected) {
    f2VoiceBridge.publish({ type: 'connection', connected: !!connected });
  },

  _setFlapPanelStateOptimistic(cmd, afterUiReady) {
    if (!isMtUltraCardModel(this.data.currentModel)) {
      if (typeof afterUiReady === 'function') afterUiReady();
      return;
    }
    const done = typeof afterUiReady === 'function' ? afterUiReady : null;
    if (cmd === '打开') {
      this._setFlapPanelData({ flapPanelState: 'moving', flapPanelStateText: '打开中', flapMotionDir: 'open', flapGaugeSpinning: true, flapGaugeSpinDir: 'open' }, () => {
        this._publishFlapToVoiceBridge('moving', '打开中');
        this._f2MotionGraceUntil = Date.now() + 12000;
        if (done) done();
      });
    } else if (cmd === '关闭') {
      this._setFlapPanelData({ flapPanelState: 'moving', flapPanelStateText: '收回中', flapMotionDir: 'close', flapGaugeSpinning: true, flapGaugeSpinDir: 'close' }, () => {
        this._publishFlapToVoiceBridge('moving', '收回中');
        this._f2MotionGraceUntil = Date.now() + 12000;
        if (done) done();
      });
    } else if (done) {
      done();
    }
  },

  _resetFlapPanelState() {
    this._stopFlapGaugeSpinImmediate();
    this.setData({
      flapPanelState: 'unknown',
      flapPanelStateText: '状态未知'
    });
    this._publishFlapToVoiceBridge('unknown', '状态未知');
  },

  handleVoiceControl() {
    if (Date.now() < (this._controlTapLockUntil || 0)) return;
    if (this._f2DemoActive) {
      this._showCustomToast('演示进行中，请先停止', 'none', 1800);
      return;
    }

    const model = this.data.currentModel;
    if (!isMtUltraCardModel(model)) {
      return;
    }
    if (!this._canControlDevice()) {
      this.setData({ showConnectBluetoothTip: true });
      setTimeout(() => this.setData({ showConnectBluetoothTip: false }), 2000);
      return;
    }

    wx.navigateTo({
      url: '/package-extra/pages/voice-control/voice-control'
    });
  },

  toggleF2ControlPanel() {
    const nextOpen = !this.data.f2ControlPanelOpen;
    this.setData({ f2ControlPanelOpen: nextOpen }, () => {
      if (nextOpen && isMtUltraCardModel(this.data.currentModel)) {
        setTimeout(() => this._measureF2SpeedSlider(), 120);
      }
    });
  },

  /** F3：仅当实时高度确实低于危险线时才拦截翻开（避免 DGD 锁存未清导致误拦） */
  _f3ShouldBlockFlapOpen() {
    if (!isF3MaxModel(this.data.currentModel)) return false;
    const danger = Math.round(Number(this.data.f3DangerMm)) || 0;
    if (danger <= 0) return false;
    const live = Math.round(Number(this.data.f3HeightMm)) || 0;
    if (live > 0) return live <= danger;
    return !!this.data.f3DangerBlocked;
  },

  /** 过坑红灯：禁止再折叠（往下打）；收回不受限 */
  _f3IsBumpFlapLocked() {
    if (!isF3MaxModel(this.data.currentModel)) return false;
    if (this.data.f3BumpActive) return true;
    return Date.now() < (this._f3BumpUntil || 0);
  },

  _f3BumpBlocksOpen() {
    return this._f3IsBumpFlapLocked();
  },

  _clearF2DemoStepTimer() {
    if (this._f2DemoStepTimer) {
      clearTimeout(this._f2DemoStepTimer);
      this._f2DemoStepTimer = null;
    }
  },

  _clearF2DemoSendLoop() {
    if (this._f2DemoSendLoopTimer) {
      clearInterval(this._f2DemoSendLoopTimer);
      this._f2DemoSendLoopTimer = null;
    }
    this._f2DemoSendLoopCmd = null;
  },

  _clearF3FlapSendLoop() {
    if (this._f3FlapSendLoopTimer) {
      clearInterval(this._f3FlapSendLoopTimer);
      this._f3FlapSendLoopTimer = null;
    }
    if (this._f3FlapSendTimeoutTimer) {
      clearTimeout(this._f3FlapSendTimeoutTimer);
      this._f3FlapSendTimeoutTimer = null;
    }
    this._f3FlapSendLoopCmd = null;
    this._f3FlapExpectState = null;
  },

  /** F3：翻板指令持续发送，直到状态回读到位（open/closed） */
  _fireF3FlapBleSend(cmd) {
    if (!this._isBleLinked()) return false;
    const model = this.data.currentModel;
    if (!isF3MaxModel(model)) return false;
    const wireText = flapBleWireText(model, cmd);
    if (!wireText) return false;
    // 队列里还有未发出的翻板包时跳过，避免越补越堵
    const q = this._bleSendQueue || [];
    if (q.some((item) => this._isFlapBleCmd(item && item.text))) {
      return false;
    }
    if (this._bleSendDraining && q.length > 0) {
      return false;
    }
    // 循环内单包慢发；间隔由 F3_FLAP_RESEND_INTERVAL_MS 控制
    this.sendDataMultiple(wireText, F3_FLAP_LOOP_SEND_TIMES, F3_FLAP_RESEND_INTERVAL_MS);
    return true;
  },

  _onF3FlapReadbackReached(state) {
    if (!this._f3FlapExpectState) return;
    if (state !== this._f3FlapExpectState) return;
    console.log(`✅ [F3翻板] 回读到位 ${state}，停止连发`);
    this._clearF3FlapSendLoop();
  },

  _armF3FlapSendUntilReadback(cmd) {
    if (!isF3MaxModel(this.data.currentModel)) return;
    if (!this._isBleLinked()) return;
    const expect = cmd === '打开' ? 'open' : (cmd === '关闭' ? 'closed' : null);
    if (!expect) return;

    this._clearF3FlapSendLoop();
    this._abortFlapBleVerify();
    this._prunePendingFlapBleQueue();
    this._f3FlapSendLoopCmd = cmd;
    this._f3FlapExpectState = expect;

    // 已到位则发一轮确认即可
    if (this.data.flapPanelState === expect) {
      this._fireF3FlapBleSend(cmd);
      this._clearF3FlapSendLoop();
      return;
    }

    console.log(`📤 [F3翻板] 开始连发「${cmd}」直到回读 ${expect}`);
    this._fireF3FlapBleSend(cmd);
    this._f3FlapSendLoopTimer = setInterval(() => {
      if (this._f3FlapSendLoopCmd !== cmd) {
        this._clearF3FlapSendLoop();
        return;
      }
      if (!this._isBleLinked()) {
        this._clearF3FlapSendLoop();
        return;
      }
      const state = this.data.flapPanelState;
      if (state === expect) {
        this._onF3FlapReadbackReached(state);
        return;
      }
      this._fireF3FlapBleSend(cmd);
    }, F3_FLAP_RESEND_INTERVAL_MS);

    this._f3FlapSendTimeoutTimer = setTimeout(() => {
      if (this._f3FlapSendLoopCmd !== cmd) return;
      const state = this.data.flapPanelState;
      if (state === expect) {
        this._onF3FlapReadbackReached(state);
        return;
      }
      console.warn(`⚠️ [F3翻板] 连发超时仍未回读到 ${expect}，停止`);
      this._clearF3FlapSendLoop();
      this._showCustomToast('未回读到到位状态，请再试一次', 'none', 2400);
    }, F3_FLAP_SEND_TIMEOUT_MS);
  },

  _clearF2DemoPhaseGapTimer() {
    if (this._f2DemoPhaseGapTimer) {
      clearTimeout(this._f2DemoPhaseGapTimer);
      this._f2DemoPhaseGapTimer = null;
    }
  },

  /** 演示模式翻板指令补发（与正常翻板使用相同的多次发送机制） */
  _fireF2DemoBleSend(cmd) {
    if (!this._f2DemoActive) return false;
    if (!this._isBleLinked()) return false;
    
    // 使用与正常翻板相同的多次发送机制，提高成功率
    const model = this.data.currentModel;
    const times = flapBleSendTimes(model, cmd);
    const interval = flapBleSendInterval(model);
    const wireText = flapBleWireText(model, cmd);
    
    console.log(`📤 [演示补发] ${wireText} ×${times} (间隔${interval}ms)`);
    this.sendDataMultiple(wireText, times, interval);
    return true;
  },

  /** 未到位时慢速补发，到位后由 _onF2DemoFlapStable 等待 2s 再切步 */
  _armF2DemoSendLoop(cmd) {
    this._clearF2DemoSendLoop();
    if (!this._f2DemoActive) return;
    this._f2DemoSendLoopCmd = cmd;
    const expect = cmd === '打开' ? 'open' : 'closed';
    this._f2DemoSendLoopTimer = setInterval(() => {
      if (!this._f2DemoActive || this._f2DemoSendLoopCmd !== cmd) {
        this._clearF2DemoSendLoop();
        return;
      }
      const state = this.data.flapPanelState;
      if (state === expect) {
        this._onF2DemoFlapStable(state);
        return;
      }
      this._fireF2DemoBleSend(cmd);
    }, F2_DEMO_RESEND_INTERVAL_MS);
  },

  _armF2DemoStepTimer() {
    this._clearF2DemoStepTimer();
    this._f2DemoStepTimer = setTimeout(() => this._onF2DemoStepTimeout(), 14000);
  },

  _onF2DemoStepTimeout() {
    if (!this._f2DemoActive) return;
    const expect = this._f2DemoAwaitStable;
    if (!expect) return;
    const state = this.data.flapPanelState;
    if (state === expect) {
      this._onF2DemoFlapStable(state);
      return;
    }
    const cmd = expect === 'open' ? '打开' : '关闭';
    if (!this._f2DemoSendLoopTimer || this._f2DemoSendLoopCmd !== cmd) {
      this._armF2DemoSendLoop(cmd);
    }
    this.setData({
      f2DemoStatusText: cmd === '打开' ? '正在打开…（等待到位）' : '正在关闭…（等待到位）'
    });
    this._armF2DemoStepTimer();
  },

  handleF2RemoteControl(e) {
    const cmd = e.currentTarget.dataset.cmd;
    const isFlapCmd = cmd === '打开' || cmd === '关闭';
    if (!isFlapCmd && Date.now() < (this._controlTapLockUntil || 0)) return;
    if (this._f2DemoActive) {
      this._showCustomToast('演示进行中，请先停止', 'none', 1800);
      return;
    }
    if (!cmd) return;

    const model = this.data.currentModel;
    if (!isMtUltraCardModel(model)) {
      return;
    }
    if (!this._ensureBleControlReady()) {
      return;
    }
    if ((cmd === '打开' || cmd === '关闭') && this.data.flapPanelState === 'stealth') {
      this._showCustomToast('隐蔽模式中，请先退出', 'none', 2000);
      return;
    }
    if (cmd === '打开' && this.data.f2KeyOn === false) {
      this._showCustomToast('车钥匙已关闭，请点火后再操作', 'none', 2200);
      return;
    }
    if (cmd === '打开' && isF3MaxModel(model) && this._f3ShouldBlockFlapOpen()) {
      const live = Math.round(Number(this.data.f3HeightMm)) || 0;
      const danger = Math.round(Number(this.data.f3DangerMm)) || 0;
      const hint = live > 0 && danger > 0 ? `当前 ${live} mm，危险线 ${danger} mm` : '';
      this._showCustomToast(
        hint ? `距地面过近，禁止翻开（${hint}）` : '距地面过近，禁止翻开',
        'none',
        2800
      );
      return;
    }
    if (cmd === '打开' && isF3MaxModel(model) && this._f3BumpBlocksOpen()) {
      this._showCustomToast('过坑中，暂勿再折叠；可点「恢复」收回', 'none', 2200);
      return;
    }

    console.log(`📤 [蓝牙] F2 远程控制发送"${cmd}"`);
    const runControl = () => {
      if (cmd === '打开' || cmd === '关闭') {
        this._abortFlapBleVerify();
        this._prunePendingFlapBleQueue();
        if (this._bleSendQueue && this._bleSendQueue.length) {
          this._bleSendQueue = this._bleSendQueue.filter(
            (item) => !/^(M[01]|DA|TB|H[01])/.test(String(item.text || ''))
          );
        }
        if (!this._isRemoteAssistAdminActive()) {
          this._setFlapPanelStateOptimistic(cmd);
        }
        if (isF3MaxModel(model)) {
          // F3：持续发送直到状态回读到位
          this._armF3FlapSendUntilReadback(cmd);
        } else {
          const flapTimes = flapBleSendTimes(model, cmd);
          const flapInterval = flapBleSendInterval(model);
          this.sendDataMultiple(flapBleWireText(model, cmd), flapTimes, flapInterval);
        }
      } else {
        this._commitBleCommandAfterUi({
          sendText: cmd,
          times: 2,
          interval: 500,
          label: '远程控制'
        });
      }
      wx.vibrateShort({ type: 'light' });
    };
    if (isF3MaxModel(model) && (cmd === '打开' || cmd === '关闭')) {
      this._f3EnsureFlapControlReady(runControl);
    } else {
      runControl();
    }
  },

  openF2DemoModal() {
    if (!isMtUltraCardModel(this.data.currentModel)) return;
    if (!this._ensureBleControlReady()) {
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
    if (!isMtUltraCardModel(this.data.currentModel) || !this._ensureBleControlReady()) return;
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
    this._clearF2DemoStepTimer();
    this._clearF2DemoSendLoop();
    this._clearF2DemoPhaseGapTimer();
    this.setData({
      showF2DemoModal: false,
      f2DemoRunning: false,
      f2DemoStatusText: ''
    });
    if (homeFold && wasActive && this.data.isConnected && isMtUltraCardModel(this.data.currentModel)) {
      this._setFlapPanelStateOptimistic('关闭');
      const model = this.data.currentModel;
      this.sendDataMultiple(
        flapBleWireText(model, '关闭'),
        flapBleSendTimes(model, '关闭'),
        flapBleSendInterval(model)
      );
      wx.vibrateShort({ type: 'light' });
    }
  },

  // ===============================================
  // 定点折叠（测试版，F1 / F2 Ultra）
  // ===============================================
  _geoFoldSupported() {
    return isF2UltraFirmwareModel(this.data.currentModel);
  },

  _loadGeoFoldConfig() {
    if (this._geoFoldCfgLoaded) return;
    this._geoFoldCfgLoaded = true;
    let stored = null;
    try {
      stored = wx.getStorageSync(GEO_FOLD_CFG_KEY);
      // 兼容旧版 v1 本地配置（点位可沿用；触发算法已换）
      if (!stored) stored = wx.getStorageSync('mt_geo_fold_cfg_v1');
    } catch (e) {
      stored = null;
    }
    const cfg = normalizeGeoFoldCfg(stored && stored.cfg);
    const point = normalizeGeoFoldPoint(stored && stored.point);
    this.setData({
      geoFoldCfg: cfg,
      geoFoldPoint: point,
      geoFoldPointText: this._geoFoldPointText(point),
      geoFoldHitText: `0 / ${cfg.confirmHits}`,
      geoFoldRadiusText: `${cfg.baseRadius} m`
    });
  },

  _persistGeoFoldConfig() {
    try {
      wx.setStorageSync(GEO_FOLD_CFG_KEY, {
        cfg: this.data.geoFoldCfg,
        point: this.data.geoFoldPoint
      });
    } catch (e) { /* ignore */ }
  },

  _geoFoldPointText(point) {
    if (!point) return '未设点';
    const coord = `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
    return point.name ? `${point.name}（${coord}）` : coord;
  },

  _geoFoldLog(text) {
    this._geoFoldLogSeq = (this._geoFoldLogSeq || 0) + 1;
    const logs = [
      { id: this._geoFoldLogSeq, ts: geoFoldClockText(), text: String(text || '') },
      ...(this.data.geoFoldLogs || [])
    ].slice(0, GEO_FOLD_LOG_MAX);
    this.setData({ geoFoldLogs: logs });
  },

  openGeoFoldModal() {
    if (!this._geoFoldSupported()) return;
    this._loadGeoFoldConfig();
    this.setData({ showGeoFoldModal: true });
  },

  closeGeoFoldModal() {
    this.setData({ showGeoFoldModal: false });
  },

  /** 档位切换：data-key 参数名，data-value 档位值 */
  onGeoFoldOptionTap(e) {
    const ds = (e.currentTarget && e.currentTarget.dataset) || {};
    const key = ds.key;
    const list = key ? GEO_FOLD_OPTIONS[key] : null;
    if (!list) return;
    const value = Number(ds.value);
    // 只认档位表里的值，避免写错 data-value 时塞进一个离谱参数
    if (!list.some((opt) => Number(opt.value) === value)) return;
    if (Number(this.data.geoFoldCfg[key]) === value) return;
    const cfg = { ...this.data.geoFoldCfg, [key]: value };
    const patch = { geoFoldCfg: cfg };
    if (key === 'confirmHits') {
      patch.geoFoldHitText = `${(this._geoFoldState && this._geoFoldState.hits) || 0} / ${cfg.confirmHits}`;
    }
    if (key === 'baseRadius') {
      patch.geoFoldRadiusText = `${cfg.baseRadius} m`;
    }
    this.setData(patch, () => {
      this._persistGeoFoldConfig();
      // 判定节流改了：连续定位下下次回调自然生效；轮询模式要立刻重排
      if (key === 'pollMs' && this.data.geoFoldTracking && this._geoFoldUsePoll) {
        this._clearGeoFoldTimer();
        this._scheduleGeoFoldTick(0);
      }
    });
    wx.vibrateShort({ type: 'light' });
  },

  /** 开关型参数：data-key 参数名，data-val 1 开 / 0 关 */
  onGeoFoldSwitchTap(e) {
    const ds = (e.currentTarget && e.currentTarget.dataset) || {};
    const key = ds.key;
    if (!['requireApproaching', 'autoStopAfterFire', 'vibrateOnFire'].includes(key)) return;
    const next = String(ds.val) === '1';
    if (!!this.data.geoFoldCfg[key] === next) return;
    const cfg = { ...this.data.geoFoldCfg, [key]: next };
    this.setData({ geoFoldCfg: cfg }, () => this._persistGeoFoldConfig());
    wx.vibrateShort({ type: 'light' });
  },

  /** 到点执行的指令：收起 / 翻开 */
  onGeoFoldCmdTap(e) {
    const cmd = (e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.cmd) || '';
    if (cmd !== '打开' && cmd !== '关闭') return;
    if (this.data.geoFoldCfg.triggerCmd === cmd) return;
    const cfg = { ...this.data.geoFoldCfg, triggerCmd: cmd };
    this.setData({ geoFoldCfg: cfg }, () => this._persistGeoFoldConfig());
    wx.vibrateShort({ type: 'light' });
  },

  _ensureGeoFoldLocationAuth() {
    return new Promise((resolve, reject) => {
      wx.getSetting({
        success: (res) => {
          const auth = res.authSetting || {};
          if (auth['scope.userLocation'] === true) {
            resolve();
            return;
          }
          if (auth['scope.userLocation'] === false) {
            reject({ type: 'denied' });
            return;
          }
          wx.authorize({
            scope: 'scope.userLocation',
            success: () => resolve(),
            fail: () => reject({ type: 'denied' })
          });
        },
        fail: () => resolve()
      });
    });
  },

  _handleGeoFoldAuthFail() {
    this._showCustomToast('需要定位权限才能使用定点折叠', 'none', 2400);
    wx.showModal({
      title: '需要定位权限',
      content: '定点折叠依赖手机定位判断是否到达设定点，请在设置中开启位置信息。',
      confirmText: '去设置',
      success: (res) => {
        if (res.confirm) wx.openSetting({});
      }
    });
  },

  _getGeoFoldLocationOnce() {
    return new Promise((resolve, reject) => {
      wx.getLocation({
        type: 'gcj02',
        isHighAccuracy: true,
        highAccuracyExpireTime: 5000,
        success: resolve,
        fail: reject
      });
    });
  },

  /**
   * 设点质量门禁：连采多次，精度合格且彼此聚在一起，再取平均坐标。
   * 避免「随手一点」把漂移中的粗定位写进目标点。
   */
  _captureStableGeoFoldPoint() {
    return new Promise((resolve, reject) => {
      const good = [];
      let tries = 0;
      const tick = () => {
        tries += 1;
        this._getGeoFoldLocationOnce()
          .then((res) => {
            const lat = Number(res.latitude);
            const lng = Number(res.longitude);
            const acc = Math.max(0, Number(res.accuracy) || 999);
            if (Number.isFinite(lat) && Number.isFinite(lng) && acc <= GEO_FOLD_SET_MAX_ACC_M) {
              good.push({ lat, lng, acc });
              if (good.length >= GEO_FOLD_SET_NEED) {
                const recent = good.slice(-GEO_FOLD_SET_NEED);
                let clustered = true;
                for (let i = 1; i < recent.length; i++) {
                  const d = geoDistanceMeters(
                    recent[0].lat, recent[0].lng,
                    recent[i].lat, recent[i].lng
                  );
                  if (d > GEO_FOLD_SET_CLUSTER_M) {
                    clustered = false;
                    break;
                  }
                }
                if (clustered) {
                  const n = recent.length;
                  const latAvg = recent.reduce((s, p) => s + p.lat, 0) / n;
                  const lngAvg = recent.reduce((s, p) => s + p.lng, 0) / n;
                  const accBest = Math.min(...recent.map((p) => p.acc));
                  const accAvg = recent.reduce((s, p) => s + p.acc, 0) / n;
                  resolve({
                    lat: latAvg,
                    lng: lngAvg,
                    accuracy: accBest,
                    accuracyAvg: accAvg,
                    samples: n
                  });
                  return;
                }
              }
            }
            if (tries >= GEO_FOLD_SET_MAX_TRIES) {
              reject({
                type: 'unstable',
                goodCount: good.length,
                bestAcc: good.length ? Math.min(...good.map((g) => g.acc)) : null
              });
              return;
            }
            this.setData({
              geoFoldStatusText: `校准设点 ${tries}/${GEO_FOLD_SET_MAX_TRIES}…`
            });
            setTimeout(tick, GEO_FOLD_SET_GAP_MS);
          })
          .catch(() => {
            if (tries >= GEO_FOLD_SET_MAX_TRIES) {
              reject({ type: 'fail' });
              return;
            }
            setTimeout(tick, GEO_FOLD_SET_GAP_MS);
          });
      };
      tick();
    });
  },

  useCurrentAsGeoFoldPoint() {
    if (!this._geoFoldSupported()) return;
    if (this.data.geoFoldTracking) {
      this._showCustomToast('请先停止跟踪再设点', 'none', 1800);
      return;
    }
    if (this._geoFoldCapturingPoint) return;
    this._geoFoldCapturingPoint = true;
    this.setData({ geoFoldCapturingPoint: true });
    this._showCustomToast('正在校准定位，请稍候…', 'none', 1600);
    this._ensureGeoFoldLocationAuth()
      .then(() => this._captureStableGeoFoldPoint())
      .then((fixed) => {
        const point = normalizeGeoFoldPoint({
          lat: fixed.lat,
          lng: fixed.lng,
          name: '当前位置'
        });
        if (!point) {
          this._showCustomToast('定位结果异常', 'none', 2000);
          return;
        }
        this.setData({
          geoFoldPoint: point,
          geoFoldPointText: this._geoFoldPointText(point),
          geoFoldStatusText: '未开始'
        }, () => this._persistGeoFoldConfig());
        this._geoFoldLog(
          `已设点×${fixed.samples}（精度约 ±${Math.round(fixed.accuracy)}m）`
        );
        this._showCustomToast('已用稳定定位设点', 'success', 1800);
      })
      .catch((err) => {
        if (err && err.type === 'denied') {
          this._handleGeoFoldAuthFail();
          return;
        }
        if (err && err.type === 'unstable') {
          const tip = err.bestAcc != null
            ? `定位不稳（最好 ±${Math.round(err.bestAcc)}m），请到开阔处重试`
            : '定位不稳，请到开阔处重试';
          this._showCustomToast(tip, 'none', 2600);
          this._geoFoldLog('设点失败：样本精度/聚簇不合格');
          this.setData({ geoFoldStatusText: '设点失败（定位不稳）' });
          return;
        }
        this._showCustomToast('获取位置失败，请重试', 'none', 2000);
        this.setData({ geoFoldStatusText: '设点失败' });
      })
      .then(() => {
        this._geoFoldCapturingPoint = false;
        this.setData({ geoFoldCapturingPoint: false });
      }, () => {
        this._geoFoldCapturingPoint = false;
        this.setData({ geoFoldCapturingPoint: false });
      });
  },

  chooseGeoFoldPoint() {
    if (!this._geoFoldSupported()) return;
    if (this.data.geoFoldTracking) {
      this._showCustomToast('请先停止跟踪再设点', 'none', 1800);
      return;
    }
    this._ensureGeoFoldLocationAuth()
      .then(() => {
        wx.chooseLocation({
          success: (res) => {
            const point = normalizeGeoFoldPoint({
              lat: res.latitude,
              lng: res.longitude,
              name: res.name || res.address || '地图选点'
            });
            if (!point) {
              this._showCustomToast('选点结果异常', 'none', 2000);
              return;
            }
            this.setData({
              geoFoldPoint: point,
              geoFoldPointText: this._geoFoldPointText(point)
            }, () => this._persistGeoFoldConfig());
            this._geoFoldLog(`地图选点：${point.name || '未命名'}`);
          },
          fail: (err) => {
            const msg = String((err && err.errMsg) || '');
            if (msg.indexOf('cancel') !== -1) return;
            this._showCustomToast('打开地图失败', 'none', 2000);
          }
        });
      })
      .catch(() => this._handleGeoFoldAuthFail());
  },

  clearGeoFoldPoint() {
    if (this.data.geoFoldTracking) {
      this._showCustomToast('请先停止跟踪', 'none', 1800);
      return;
    }
    this.setData({
      geoFoldPoint: null,
      geoFoldPointText: '未设点'
    }, () => this._persistGeoFoldConfig());
    this._geoFoldLog('已清除设点');
  },

  toggleGeoFoldTracking() {
    if (this.data.geoFoldTracking) {
      this._stopGeoFoldTracking('手动停止');
      return;
    }
    this._startGeoFoldTracking();
  },

  _resetGeoFoldRuntime() {
    this._geoFoldState = createGeoFoldState();
    this._geoFoldCooldownUntil = 0;
    this._geoFoldLastJudgeAt = 0;
  },

  _startGeoFoldTracking() {
    if (!this._geoFoldSupported()) return;
    if (this._geoFoldCapturingPoint) {
      this._showCustomToast('正在校准设点，请稍候', 'none', 1800);
      return;
    }
    if (!this.data.geoFoldPoint) {
      this._showCustomToast('请先设置一个点位', 'none', 2000);
      return;
    }
    // 弹窗盖住了页面里的「去连蓝牙」提示条，这里直接用 toast 说明
    if (!this._canSendBleCommand()) {
      this._showCustomToast('请先连接蓝牙再开始跟踪', 'none', 2200);
      return;
    }

    this._ensureGeoFoldLocationAuth()
      .then(() => {
        this._resetGeoFoldRuntime();
        this.setData({
          geoFoldTracking: true,
          geoFoldStatusText: '跟踪中',
          geoFoldSampleCount: 0,
          geoFoldHitText: `0 / ${this.data.geoFoldCfg.confirmHits}`,
          geoFoldEtaText: '--',
          geoFoldRadiusText: `${this.data.geoFoldCfg.baseRadius} m`,
          geoFoldTrendText: '--'
        });
        this._geoFoldLog('开始跟踪');
        return this._startGeoFoldLocationStream();
      })
      .then((mode) => {
        if (!this.data.geoFoldTracking) return;
        if (mode === 'stream') {
          this._geoFoldUsePoll = false;
          this._geoFoldLog('连续定位已开启');
        } else {
          this._geoFoldUsePoll = true;
          this._geoFoldLog('改用轮询定位');
          this._scheduleGeoFoldTick(0);
        }
      })
      .catch((err) => {
        if (err && err.type === 'denied') {
          this._handleGeoFoldAuthFail();
          return;
        }
        this._showCustomToast('无法开启定位跟踪', 'none', 2200);
        this._stopGeoFoldTracking('定位启动失败');
      });
  },

  /** 优先连续定位；不支持时回落轮询 getLocation */
  _startGeoFoldLocationStream() {
    return new Promise((resolve) => {
      if (typeof wx.startLocationUpdate !== 'function' || typeof wx.onLocationChange !== 'function') {
        resolve('poll');
        return;
      }
      this._stopGeoFoldLocationStream(false);
      this._geoFoldLocHandler = (res) => {
        this._onGeoFoldLocationChange(res);
      };
      try {
        wx.onLocationChange(this._geoFoldLocHandler);
      } catch (e) {
        this._geoFoldLocHandler = null;
        resolve('poll');
        return;
      }
      wx.startLocationUpdate({
        success: () => resolve('stream'),
        fail: () => {
          this._stopGeoFoldLocationStream(false);
          resolve('poll');
        }
      });
    });
  },

  _stopGeoFoldLocationStream(silent) {
    if (this._geoFoldLocHandler && typeof wx.offLocationChange === 'function') {
      try {
        wx.offLocationChange(this._geoFoldLocHandler);
      } catch (e) { /* ignore */ }
    }
    this._geoFoldLocHandler = null;
    if (typeof wx.stopLocationUpdate === 'function') {
      try {
        wx.stopLocationUpdate({
          complete: () => {},
          fail: () => {}
        });
      } catch (e) { /* ignore */ }
    }
    if (!silent) {
      // no-op；停止时日志由上层写
    }
  },

  _onGeoFoldLocationChange(res) {
    if (!this.data.geoFoldTracking || this._geoFoldUsePoll) return;
    const now = Date.now();
    const minInterval = this.data.geoFoldCfg.pollMs || 2000;
    if (now - (this._geoFoldLastJudgeAt || 0) < minInterval) return;
    this._geoFoldLastJudgeAt = now;
    this._handleGeoFoldSample(res);
  },

  /** keepStatus：触发后停止时保留「已触发」文案，别被「已停止」盖掉 */
  _stopGeoFoldTracking(reason, keepStatus) {
    this._clearGeoFoldTimer();
    this._stopGeoFoldLocationStream(true);
    this._geoFoldUsePoll = false;
    this._geoFoldState = createGeoFoldState();
    if (!this.data.geoFoldTracking) return;
    const patch = { geoFoldTracking: false };
    if (!keepStatus) {
      patch.geoFoldStatusText = reason ? `已停止（${reason}）` : '已停止';
    }
    this.setData(patch);
    if (reason) this._geoFoldLog(`停止跟踪：${reason}`);
  },

  _clearGeoFoldTimer() {
    if (this._geoFoldTimer) {
      clearTimeout(this._geoFoldTimer);
      this._geoFoldTimer = null;
    }
  },

  /** 用 setTimeout 串行调度，避免定位慢时多次采样叠在一起 */
  _scheduleGeoFoldTick(delay) {
    this._clearGeoFoldTimer();
    if (!this.data.geoFoldTracking || !this._geoFoldUsePoll) return;
    const wait = delay != null ? delay : (this.data.geoFoldCfg.pollMs || 2000);
    this._geoFoldTimer = setTimeout(() => {
      this._geoFoldTimer = null;
      this._geoFoldSampleOnce();
    }, wait);
  },

  _geoFoldSampleOnce() {
    if (!this.data.geoFoldTracking || !this._geoFoldUsePoll) return;
    this._getGeoFoldLocationOnce()
      .then((res) => {
        this._handleGeoFoldSample(res);
        this._scheduleGeoFoldTick();
      })
      .catch(() => {
        this._geoFoldLog('定位失败，稍后重试');
        this._scheduleGeoFoldTick();
      });
  },

  _handleGeoFoldSample(res) {
    if (!this.data.geoFoldTracking) return;
    const point = this.data.geoFoldPoint;
    if (!point) {
      this._stopGeoFoldTracking('设点丢失');
      return;
    }
    if (!this._geoFoldState) this._geoFoldState = createGeoFoldState();
    const cfg = this.data.geoFoldCfg;
    const now = Date.now();
    const judge = geoFoldJudgeStep(
      this._geoFoldState,
      {
        latitude: res.latitude,
        longitude: res.longitude,
        accuracy: res.accuracy,
        speed: res.speed,
        t: now
      },
      cfg,
      point
    );

    const sampleCount = (this.data.geoFoldSampleCount || 0) + 1;
    const accuracy = Math.max(0, Number(res.accuracy) || 0);

    if (judge.action === 'bad_coord') {
      this._geoFoldLog('定位坐标异常，样本作废');
      return;
    }
    if (judge.action === 'accuracy_reject') {
      this.setData({
        geoFoldAccuracyText: `±${Math.round(accuracy)} m（超限）`,
        geoFoldSampleCount: sampleCount,
        geoFoldLastAt: geoFoldClockText()
      });
      this._geoFoldLog(`精度 ±${Math.round(accuracy)}m 超限，样本作废`);
      return;
    }
    if (judge.action === 'teleport_reject') {
      this.setData({
        geoFoldAccuracyText: `±${Math.round(accuracy)} m`,
        geoFoldTrendText: '定位跳变',
        geoFoldHitText: `0 / ${cfg.confirmHits}`,
        geoFoldSampleCount: sampleCount,
        geoFoldLastAt: geoFoldClockText(),
        geoFoldDistanceText: `${Math.round(judge.distance)} m`
      });
      this._geoFoldLog(`丢弃瞬移点（原始距点 ${Math.round(judge.rawDistance)}m）`);
      return;
    }

    const radius = judge.radius || cfg.baseRadius;
    let trendText = '跟踪中';
    if (judge.inZone) trendText = '已碰圆边/在圈内';
    else if (judge.leadOk) trendText = '提前接近中';
    else if (judge.hit) trendText = '靠近中';

    const etaText = judge.inZone
      ? '已到达'
      : (judge.etaSec != null ? `${judge.etaSec.toFixed(1)} s` : '--');
    const distDrift = Math.abs(judge.rawDistance - judge.distance);
    const distText = distDrift >= 8
      ? `${Math.round(judge.distance)} m（原始 ${Math.round(judge.rawDistance)}）`
      : `${Math.round(judge.rawDistance)} m`;
    const radiusText = judge.leadOk
      ? `圆 ${radius} m · 提前命中`
      : `圆 ${radius} m（碰边即算）`;

    this.setData({
      geoFoldDistanceText: distText,
      geoFoldRadiusText: radiusText,
      geoFoldEtaText: etaText,
      geoFoldSpeedText: `${(judge.speedKmh || 0).toFixed(1)} km/h`,
      geoFoldAccuracyText: `±${Math.round(accuracy)} m`,
      geoFoldTrendText: trendText,
      geoFoldHitText: `${judge.hits || 0} / ${cfg.confirmHits}`,
      geoFoldSampleCount: sampleCount,
      geoFoldLastAt: geoFoldClockText()
    });

    if ((judge.inZone || judge.leadOk) && !judge.hit && cfg.maxSpeedKmh > 0 && (judge.speedKmh || 0) > cfg.maxSpeedKmh) {
      this._geoFoldLog(`满足距离但车速 ${judge.speedKmh.toFixed(0)}km/h 超限`);
      return;
    }
    if (judge.leadOk && judge.hits === 1) {
      this._geoFoldLog(`提前命中：距圆边约 ${Math.round(Math.max(0, judge.distance - radius))}m`);
    } else if (judge.inZone && judge.hits === 1) {
      this._geoFoldLog(`碰到圆边：距点 ${Math.round(judge.rawDistance)}m / 半径 ${radius}m`);
    }
    if (judge.fired) {
      if (Date.now() < (this._geoFoldCooldownUntil || 0)) return;
      this._fireGeoFold(false);
    }
  },

  _fireGeoFold(isSimulate) {
    const cfg = this.data.geoFoldCfg;
    const cmd = cfg.triggerCmd;
    const cmdLabel = cmd === '打开' ? '翻开' : '收起';

    if (!this._canSendBleCommand()) {
      this._geoFoldLog(`触发失败：蓝牙未连接（${cmdLabel}）`);
      this._showCustomToast('蓝牙未连接，未能执行', 'none', 2400);
      this._stopGeoFoldTracking('蓝牙断开');
      return;
    }

    if (cfg.vibrateOnFire) {
      wx.vibrateLong();
    }
    this.setData({
      geoFoldStatusText: isSimulate ? `已模拟触发（${cmdLabel}）` : `已触发（${cmdLabel}）`
    });
    this._geoFoldLog(isSimulate ? `模拟触发：${cmdLabel}` : `到达触发：${cmdLabel}`);
    if (this._geoFoldState) this._geoFoldState.hits = 0;
    // 不自动停止时留个冷却，别让舵机连着挨打
    this._geoFoldCooldownUntil = Date.now() + GEO_FOLD_REFIRE_COOLDOWN_MS;

    this.handleF2RemoteControl({ currentTarget: { dataset: { cmd } } });

    if (cfg.autoStopAfterFire) {
      this._stopGeoFoldTracking(isSimulate ? '模拟后自动停止' : '触发后自动停止', true);
    }
  },

  /** 不看位置，直接走一遍触发链路，用来单独验证蓝牙下发 */
  simulateGeoFoldTrigger() {
    if (!this._geoFoldSupported()) return;
    this._fireGeoFold(true);
  },

  _sendF2DemoCommand(cmd) {
    if (!this._f2DemoActive) return;
    if (!this._isBleLinked() && !this.data.isAdmin) return;
    this._f2DemoAwaitStable = cmd === '打开' ? 'open' : 'closed';
    this._setFlapPanelStateOptimistic(cmd);
    const startLoop = () => {
      if (!this._f2DemoActive) return;
      if (this._isBleLinked()) {
        const model = this.data.currentModel;
        const times = flapBleSendTimes(model, cmd);
        const interval = flapBleSendInterval(model);
        this.sendDataMultiple(flapBleWireText(model, cmd), times, interval);
        this._armF2DemoSendLoop(cmd);
      } else if (this.data.isAdmin) {
        setTimeout(() => {
          if (!this._f2DemoActive) return;
          this._onF2DemoFlapStable(cmd === '打开' ? 'open' : 'closed');
        }, 1200);
      }
      this._armF2DemoStepTimer();
    };
    if (isF3MaxModel(this.data.currentModel)) {
      this._f3EnsureFlapControlReady(startLoop);
    } else {
      startLoop();
    }
    this.setData({
      f2DemoStatusText: cmd === '打开' ? '正在打开…' : '正在关闭…'
    });
  },

  _onF2DemoFlapStable(state) {
    if (!this._f2DemoActive) return;
    if (state === 'stealth' || state === 'fault' || state === 'moving' || state === 'unknown') return;
    if (state !== 'open' && state !== 'closed') return;
    if (!this._f2DemoAwaitStable || state !== this._f2DemoAwaitStable) return;
    this._clearF2DemoStepTimer();
    this._clearF2DemoSendLoop();
    const nextCmd = state === 'open' ? '关闭' : '打开';
    this._f2DemoAwaitStable = null;
    this._clearF2DemoPhaseGapTimer();
    this.setData({
      f2DemoStatusText: state === 'open'
        ? `已打开，${F2_DEMO_STEP_GAP_MS / 1000} 秒后收回…`
        : `已关闭，${F2_DEMO_STEP_GAP_MS / 1000} 秒后打开…`
    });
    this._f2DemoPhaseGapTimer = setTimeout(() => {
      this._f2DemoPhaseGapTimer = null;
      if (!this._f2DemoActive) return;
      this._sendF2DemoCommand(nextCmd);
    }, F2_DEMO_STEP_GAP_MS);
  },

  _measureF2SpeedSlider(done) {
    const query = wx.createSelectorQuery().in(this);
    query.select('#f2SpeedSliderRail').boundingClientRect((rect) => {
      if (rect && rect.width) {
        this.setData({
          f2SpeedSliderWidth: rect.width,
          f2SpeedSliderLeft: rect.left
        }, () => { if (typeof done === 'function') done(); });
      } else if (typeof done === 'function') done();
    }).exec();
  },

  onF2ServoSpeedTouchStart(e) {
    this._f2SpeedDragFrom = this.data.f2ServoSpeed;
    if (!this.data.f2SpeedSliderWidth) {
      this._measureF2SpeedSlider(() => this.onF2ServoSpeedTouch(e));
      return;
    }
    this.onF2ServoSpeedTouch(e);
  },

  onF2ServoSpeedTouch(e) {
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
    const finish = () => {
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
    };
    if (!this.data.f2SpeedSliderWidth) {
      this._measureF2SpeedSlider(finish);
      return;
    }
    finish();
  },

  _applyF2ServoSpeed(rawValue) {
    const model = this.data.currentModel;
    if (!isMtUltraCardModel(model)) return;

    const v = Math.min(100, Math.max(10, Math.round(Number(rawValue))));
    if (!Number.isFinite(v)) return;
    if (v === this.data.f2ServoSpeed) return;

    this.setData(buildF2ServoSpeedUi(v));
    this._commitF2ServoSpeed(v);
  },

  _commitF2ServoSpeed(v) {
    const model = this.data.currentModel;
    if (!isMtUltraCardModel(model)) return;

    const speed = Math.min(100, Math.max(10, Math.round(Number(v))));
    if (!Number.isFinite(speed)) return;

    try {
      wx.setStorageSync('f2_servo_speed', speed);
    } catch (err) { /* ignore */ }

    if (!this._ensureBleControlReady()) {
      return;
    }

    console.log(`📤 [蓝牙] F2 调速 ${speed}%`);
    this._sendMagSettingBle(`调速${speed}`);
    wx.vibrateShort({ type: 'light' });
  },

  onF3DangerInput(e) {
    this.setData({ f3DangerInput: (e.detail && e.detail.value) || '' });
  },

  onF3BaseInput(e) {
    this.setData({ f3BaseInput: (e.detail && e.detail.value) || '' });
  },

  _clearF3CalTimer() {
    if (this._f3CalTimer) {
      clearInterval(this._f3CalTimer);
      this._f3CalTimer = null;
    }
    if (this._f3CalLiveTimer) {
      clearInterval(this._f3CalLiveTimer);
      this._f3CalLiveTimer = null;
    }
    if (this._f3CalWheelLiveTimer) {
      clearInterval(this._f3CalWheelLiveTimer);
      this._f3CalWheelLiveTimer = null;
    }
    if (this._f3CalRestoreTimer) {
      clearTimeout(this._f3CalRestoreTimer);
      this._f3CalRestoreTimer = null;
    }
    this._f3CalAfterRestoreCallback = null;
    this._f3CalSampling = false;
    this._f3CalReadings = [];
    this._f3CalLastSamplePushAt = 0;
    this._f3CalWritingHeights = false;
    this._f3CalClearFlapCloseWait();
  },

  _f3CalIsFlapClosed() {
    return this.data.flapPanelState === 'closed';
  },

  _f3CalClearFlapCloseWait() {
    this._f3CalAwaitFlapClose = false;
    if (this._f3CalFlapCloseTimeout) {
      clearTimeout(this._f3CalFlapCloseTimeout);
      this._f3CalFlapCloseTimeout = null;
    }
    if (this.data.f3CalPreflightClosing) {
      this.setData({ f3CalPreflightClosing: false, f3CalStatusText: '' });
    }
  },

  _f3CalOnFlapClosedForCal() {
    if (!this._f3CalAwaitFlapClose) return;
    this._f3CalClearFlapCloseWait();
    if (this.data.f3ShowCalOverlay && this.data.f3CalStep === 'preflight') {
      this._f3CalEnterSample1();
    }
  },

  _f3CalEnsureFlapClosedThen(onReady) {
    if (typeof onReady !== 'function') return;
    if (!this._canSendBleCommand()) {
      this._showCustomToast('请先连接蓝牙', 'none', 2000);
      return;
    }
    const state = this.data.flapPanelState;
    if (state === 'stealth') {
      this._showCustomToast('隐蔽模式中，请先退出', 'none', 2200);
      return;
    }
    if (state === 'fault') {
      this._showCustomToast('牌照架故障，请先排除后再校准', 'none', 2500);
      return;
    }
    if (this._f3CalIsFlapClosed()) {
      onReady();
      return;
    }
    if (this._f3CalAwaitFlapClose) return;

    this._f3CalAwaitFlapClose = true;
    this.setData({
      f3CalPreflightClosing: true,
      f3CalStatusText: '正在归位…'
    });

    if (isF3MaxModel(this.data.currentModel)) {
      // 配置模式下「关闭」常被钥匙/模式拦截；F3FR 与点 × 取消时相同，直接折回 item4
      this._setFlapPanelData({
        flapPanelState: 'moving',
        flapPanelStateText: '归位中',
        flapMotionDir: 'close'
      });
      this._f3CalSendFoldCmd('R');
      if (state === 'open') {
        this._setFlapPanelStateOptimistic('关闭', () => {
          this._commitBleCommandAfterUi({
            sendText: '关闭',
            times: 2,
            interval: 500,
            verify: { type: 'flap', cmd: '关闭' },
            label: '自动校准'
          });
        });
      }
    } else {
      const alreadyClosing = state === 'moving' && this.data.flapMotionDir === 'close';
      if (!alreadyClosing) {
        this._setFlapPanelStateOptimistic('关闭', () => {
          this._commitBleCommandAfterUi({
            sendText: '关闭',
            times: 1,
            interval: 500,
            verify: { type: 'flap', cmd: '关闭' },
            label: '自动校准'
          });
          wx.vibrateShort({ type: 'light' });
        });
      }
    }

    if (this._f3CalFlapCloseTimeout) clearTimeout(this._f3CalFlapCloseTimeout);
    this._f3CalFlapCloseTimeout = setTimeout(() => {
      if (!this._f3CalAwaitFlapClose) return;
      this._f3CalClearFlapCloseWait();
      this._showCustomToast('牌照架未收回，请手动关闭后重试', 'none', 3000);
    }, 15000);
  },

  _f3CalActiveBranch() {
    return this._f3CalBranch || this.data.f3CalBranch || 'A';
  },

  _f3CalStepNavDefs(branch) {
    const b = branch || this._f3CalActiveBranch();
    const common = [
      { id: 'preflight', label: '准备确认', no: 1 },
      { id: 'sample1', label: '首次检测', no: 2 }
    ];
    if (b === 'B') {
      return common.concat([
        { id: 'wheel', label: '波轮微调', no: 3 },
        { id: 'compress', label: '按压压缩', no: 3 },
        { id: 'restoring', label: '恢复折叠', no: 4 },
        { id: 'sample2', label: '二次采集', no: 4 },
        { id: 'done', label: '标定完成', no: 5 }
      ]);
    }
    return common.concat([
      { id: 'wheel', label: '波轮微调', no: 3 },
      { id: 'cardboard', label: '放置纸板', no: 3 },
      { id: 'hold', label: '纸板标定', no: 4 },
      { id: 'restoring', label: '恢复折叠', no: 4 },
      { id: 'sample2', label: '二次采集', no: 5 },
      { id: 'done', label: '标定完成', no: 6 }
    ]);
  },

  _f3CalStepTotalCount(branch) {
    const b = branch || this._f3CalActiveBranch();
    return b === 'B' ? 5 : 6;
  },

  _f3CalResolveStepNo(stepId, branch) {
    const b = branch || this._f3CalActiveBranch();
    if (stepId === 'preflight') return 1;
    if (stepId === 'sample1') return 2;
    if (b === 'B') {
      if (stepId === 'wheel' || stepId === 'compress') return 3;
      if (stepId === 'restoring' || stepId === 'sample2') return 4;
      if (stepId === 'done' || stepId === 'writing' || stepId === 'writeResult') return 5;
      return 0;
    }
    if (stepId === 'wheel' || stepId === 'cardboard') return 3;
    if (stepId === 'hold' || stepId === 'restoring') return 4;
    if (stepId === 'sample2') return 5;
    if (stepId === 'done' || stepId === 'writing' || stepId === 'writeResult') return 6;
    return 0;
  },

  _f3CalStepMeta(stepId, branch) {
    const b = branch || this._f3CalActiveBranch();
    const list = this._f3CalStepNavDefs(b);
    const hit = list.find((s) => s.id === stepId);
    const no = hit ? hit.no : this._f3CalResolveStepNo(stepId, b);
    return {
      no,
      label: hit ? hit.label : '',
      total: this._f3CalStepTotalCount(b)
    };
  },

  _f3CalRefreshStepNavList(activeStepId) {
    this._f3CalSyncStepMeta(activeStepId);
  },

  _f3CalStepMetaPatch(stepId, patch, branch) {
    if (!stepId || !patch) return patch;
    const meta = this._f3CalStepMeta(stepId, branch);
    patch.f3CalStepNo = meta.no;
    patch.f3CalStepTotal = meta.total;
    return patch;
  },

  _f3CalSyncStepMeta(stepId) {
    if (!stepId) return;
    const branch = this._f3CalActiveBranch();
    const displayId = stepId === 'hold' ? 'hold' : stepId;
    const meta = this._f3CalStepMeta(displayId, branch);
    this.setData({
      f3CalStepNo: meta.no,
      f3CalStepTotal: meta.total
    });
  },

  _F3_CAL_VOLATILITY_MAX_MM: 50,

  _f3CalMean(readings) {
    const arr = (readings || []).filter((n) => Number.isFinite(n) && n > 0);
    if (!arr.length) return 0;
    const sum = arr.reduce((a, b) => a + b, 0);
    return Math.round(sum / arr.length);
  },

  _f3CalMapStepForBranch(stepId, branch) {
    if (branch === 'A') {
      if (stepId === 'compress') return 'cardboard';
      return stepId;
    }
    if (stepId === 'cardboard' || stepId === 'hold') return 'compress';
    return stepId;
  },

  _f3CalSwitchBranch(branch) {
    this._f3CalBranch = branch;
    const cur = this.data.f3CalShowHoldModal ? 'hold' : this.data.f3CalStep;
    const mapped = this._f3CalMapStepForBranch(cur, branch);
    const patch = { f3CalBranch: branch, f3CalShowHoldModal: false };
    if (mapped === 'wheel') {
      this._f3CalEnterWheelStep(branch);
    } else if (mapped === 'cardboard' || mapped === 'compress') {
      this._f3CalEnterBranchGuideStep(branch);
    } else if (mapped === 'sample2') {
      const desc = branch === 'A'
        ? '请保持纸板水平，不要移动或晃动。'
        : '请保持按压或载人状态，不要松开。';
      Object.assign(patch, this._f3CalStepMetaPatch('sample2', {
        f3CalStep: 'sample2',
        f3CalTitle: '采集标定数据',
        f3CalDesc: desc,
        f3CalStatusText: '5 秒内取最小值作为危险高度'
      }, branch));
    } else {
      this._f3CalStepMetaPatch(mapped, patch, branch);
    }
    this.setData(patch);
    this._f3CalRefreshStepNavList(mapped);
  },

  _f3CalRange(readings) {
    const arr = (readings || []).filter((n) => Number.isFinite(n) && n > 0);
    if (arr.length < 2) return 0;
    return Math.max(...arr) - Math.min(...arr);
  },

  _f3CalMedian(readings) {
    const arr = (readings || []).filter((n) => Number.isFinite(n) && n > 0);
    if (!arr.length) return 0;
    const sorted = arr.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2
      ? sorted[mid]
      : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  },

  /** 去掉明显偏低的脏点（如 HGT:67 混入 HGT:670），再取最小值 */
  _f3CalMin(readings) {
    const arr = (readings || []).filter((n) => Number.isFinite(n) && n > 0);
    if (!arr.length) return 0;
    const sorted = arr.slice().sort((a, b) => a - b);
    const med = sorted[Math.floor(sorted.length / 2)];
    const floor = Math.max(10, Math.round(med * 0.85));
    const trusted = sorted.filter((n) => n >= floor);
    return trusted.length ? trusted[0] : sorted[0];
  },

  _f3CalFormatLive(units) {
    const n = Math.round(Number(units));
    if (!Number.isFinite(n) || n <= 0) return '—';
    return this._f3FormatHeightMm(n) || `${n} mm`;
  },

  _f3CalRefreshLive(mm) {
    if (!this._f3CalSampling) return;
    const live = this._f3CalFormatLive(mm);
    this.setData({ f3CalLiveText: live });
  },

  _f3CalPushReading(mm) {
    if (!this._f3CalSampling) return;
    const n = Math.round(Number(mm));
    if (!Number.isFinite(n) || n <= 0) return;
    this._f3CalReadings.push(n);
    const patch = { f3CalLiveText: this._f3CalFormatLive(n) };
    const step = this.data.f3CalStep;
    if (step === 'sample2') {
      patch.f3CalMedianText = this._f3CalFormatLive(this._f3CalMin(this._f3CalReadings));
    } else if (step === 'sample1' && this._f3CalReadings.length >= 1) {
      patch.f3CalMedianText = this._f3CalFormatLive(this._f3CalMean(this._f3CalReadings));
    }
    this.setData(patch);
  },

  _f3CalTryPushSample(mm) {
    const n = Math.round(Number(mm));
    if (!Number.isFinite(n) || n <= 0) return;
    this._f3CalRefreshLive(n);
    const now = Date.now();
    if (now - (this._f3CalLastSamplePushAt || 0) < 900) return;
    this._f3CalLastSamplePushAt = now;
    this._f3CalPushReading(n);
  },

  _f3CalSendFoldCmd(tag, times = 1) {
    if (!this._canSendBleCommand()) return;
    if (this._f3CalWritingHeights) return;
    const n = Math.max(1, Number(times) || 1);
    if (tag === 'U' || tag === 'D') {
      const cmd = tag === 'U' ? 'F3FU#' : 'F3FD#';
      this._enqueueBleSendBurst(cmd, n, 120);
      return;
    }
    // F3FR 是幂等操作（重复执行结果一样），发两遍提高到达率，抵御偶发丢包
    if (tag === 'R') {
      this._enqueueBleSend('F3FR#', 250);
      this._enqueueBleSend('F3FR#', 250);
      return;
    }
  },

  onF3CalFoldNudge(e) {
    if (this.data.f3CalStep !== 'wheel') return;
    const dir = e.currentTarget.dataset.dir;
    if (dir !== 'up' && dir !== 'down') return;
    const delta = dir === 'up' ? 1 : -1;
    this._f3CalApplyRulerIndex((this._f3CalRulerIndex || 0) + delta, true);
    wx.vibrateShort({ type: 'light' });
  },

  _f3CalStartSample(stepAfter, onDone) {
    this._f3CalSampling = true;
    this._f3CalReadings = [];
    this._f3CalLastSamplePushAt = 0;
    const durationSec = 5;
    let left = durationSec;
    const initMm = Math.round(Number(this.data.f3HeightMm)) || 0;
    const initLive = initMm > 0 ? this._f3CalFormatLive(initMm) : '—';
    this.setData({
      f3CalStep: stepAfter === 'sample1' ? 'sample1' : 'sample2',
      f3CalCountdown: left,
      f3CalLiveText: initLive,
      f3CalMedianText: '',
      f3CalStatusText: stepAfter === 'sample1' ? '正在检测基准高度…' : '正在采集标定数据…'
    });
    if (initMm > 0) this._f3CalPushReading(initMm);
    if (this._f3CalLiveTimer) clearInterval(this._f3CalLiveTimer);
    this._f3CalLiveTimer = setInterval(() => {
      if (!this._f3CalSampling) return;
      const mm = Math.round(Number(this.data.f3HeightMm)) || 0;
      if (mm > 0) this._f3CalRefreshLive(mm);
    }, 250);
    this._f3CalTimer = setInterval(() => {
      const live = Math.round(Number(this.data.f3HeightMm)) || 0;
      if (live > 0) this._f3CalTryPushSample(live);
      left -= 1;
      if (left > 0) {
        this.setData({ f3CalCountdown: left });
        return;
      }
      clearInterval(this._f3CalTimer);
      this._f3CalTimer = null;
      if (this._f3CalLiveTimer) {
        clearInterval(this._f3CalLiveTimer);
        this._f3CalLiveTimer = null;
      }
      this._f3CalSampling = false;
      const readings = this._f3CalReadings.slice();
      const mean = this._f3CalMean(readings);
      const minimum = this._f3CalMin(readings);
      const range = this._f3CalRange(readings);
      if (typeof onDone === 'function') onDone({ mean, minimum, readings, range });
    }, 1000);
  },

  _f3CalDismissWizard() {
    this._clearF3CalTimer();
    this._f3CalBranch = '';
    this._f3CalH0Units = 0;
    this.setData({
      f3ShowCalOverlay: false,
      f3CalShowHoldModal: false,
      f3CalShowVolatilityModal: false,
      f3CalStepNo: 0,
      f3CalStepTotal: 6,
      f3CalStep: '',
      f3CalBranch: '',
      f3CalTitle: '自动标定',
      f3CalDesc: '',
      f3CalTargetLabel: '',
      f3CalLiveText: '',
      f3CalTargetText: '',
      f3CalWheelHint: '',
      f3CalLimitHint: '',
      f3CalPreviewAngle: FOLD_SERVO_ANGLE_DEFAULT,
      f3CalWheelSteps: 0,
      f3CalFoldGap: 20,
      f3CalMedianText: '',
      f3CalResultText: '',
      f3CalStatusText: '',
      f3CalCountdown: 0,
      f3CalPreflightClosing: false
    });
  },

  /** 标定结束：保持向导遮罩，填入高度并维持测高配置模式 */
  _f3CalPrepareHeightWriteUi(safeMmText, dangerMmText) {
    this.setData({
      f3BaseInput: safeMmText ? String(safeMmText) : this.data.f3BaseInput,
      f3DangerInput: dangerMmText ? String(dangerMmText) : this.data.f3DangerInput,
      f3HeightConfigModeOn: true
    });
  },

  /** 写入前确保固件处于测高配置模式（标定中 F3FR/关闭会退出，须自动重发 M1#） */
  _f3EnsureHeightConfigModeForWrite(options) {
    const opts = options || {};
    return new Promise((resolve, reject) => {
      if (!this._canControlDevice() || !this._canSendBleCommand()) {
        reject(new Error('ble not ready'));
        return;
      }
      const settleMs = opts.readyMs != null ? opts.readyMs : 500;
      if (
        this._f3LastStatusF3c === 1
        && (this.data.f3HeightConfigModeOn || opts.quiet)
      ) {
        this._f3HeightCfgLocalUntil = Date.now() + (opts.holdMs || 120000);
        this.setData({ f3HeightConfigModeOn: true });
        this._bumpF3HeightBleGrace(90000);
        this._f3CfgReadyAt = Date.now() + settleMs;
        setTimeout(resolve, settleMs);
        return;
      }
      const timeoutMs = opts.timeoutMs != null ? opts.timeoutMs : 15000;
      const maxM1Attempts = opts.maxM1Attempts != null ? opts.maxM1Attempts : 8;
      const deadline = Date.now() + timeoutMs;
      let m1Attempts = 0;
      let lastM1At = 0;

      this._f3HeightCfgLocalUntil = Date.now() + (opts.holdMs || 120000);
      this.setData({ f3HeightConfigModeOn: true });
      this._bumpF3HeightBleGrace(90000);

      const sendM1 = () => {
        if (m1Attempts >= maxM1Attempts) return;
        m1Attempts++;
        if (opts.clearQueue !== false && m1Attempts === 1) {
          this._f3CancelHeightCharTimers();
          this._clearBleSendQueue();
        }
        lastM1At = Date.now();
        this._f3LastStatusF3c = null;
        this.sendData('M1#', 1000);
        if (m1Attempts <= 2) {
          setTimeout(() => this.sendData('M1#', 1000), 700);
        }
      };

      sendM1();

      const tick = () => {
        if (!this._canSendBleCommand()) {
          reject(new Error('ble lost'));
          return;
        }
        if (this._f3LastStatusF3c === 1) {
          this._f3CfgReadyAt = Date.now() + settleMs;
          setTimeout(resolve, settleMs);
          return;
        }
        if (Date.now() >= deadline) {
          reject(new Error('cfg mode timeout'));
          return;
        }
        if (m1Attempts < maxM1Attempts && Date.now() - lastM1At >= 2000) {
          sendM1();
        }
        setTimeout(tick, 200);
      };
      setTimeout(tick, 300);
    });
  },

  _f3CalAbortWithToast(toastText) {
    this._f3CalDismissWizard();
    if (toastText) this._showCustomToast(toastText, 'none', 2500);
  },

  _F3_CAL_RULER_VISUAL_PERIOD: 91,

  _f3CalWheelTickCount() {
    return this._F3_CAL_RULER_VISUAL_PERIOD || 91;
  },

  _f3CalPrepareWheelRulerState() {
    const startAng = FOLD_SERVO_ANGLE_DEFAULT;
    this._f3CalPreviewStartAngle = startAng;
    this._f3CalPreviewAngle = startAng;
    this._f3CalRulerIndex = 0;
    this._f3CalRulerLastIndex = 0;
    return {
      tickCount: this._f3CalWheelTickCount(),
      translateX: 0
    };
  },

  _f3CalRulerIndexToTranslate(index) {
    const tick = this.tickWidthPx || 20;
    return -Math.round(Number(index) || 0) * tick;
  },

  _f3CalIndexFromTranslate(trans) {
    const tick = this.tickWidthPx || 20;
    return Math.round(-(Number(trans) || 0) / tick);
  },

  _f3CalClampRulerTranslate(trans) {
    // 视觉位移不锁死；角度边界在 display/BLE 侧处理
    return Number(trans) || 0;
  },

  _f3CalSnapRulerToIndex(index) {
    const snapped = Math.round(Number(index) || 0);
    return {
      index: snapped,
      translateX: this._f3CalRulerIndexToTranslate(snapped)
    };
  },

  _f3CalClampServoAngle(ang) {
    const n = Math.round(Number(ang));
    if (!Number.isFinite(n)) return FOLD_SERVO_ANGLE_DEFAULT;
    const min = foldServoAngleMinForModel(this.data.currentModel);
    return Math.max(min, Math.min(FOLD_SERVO_ANGLE_MAX, n));
  },

  _f3CalAngleFromRulerIndex(index) {
    const start = this._f3CalPreviewStartAngle ?? FOLD_SERVO_ANGLE_DEFAULT;
    return start - (Number(index) || 0);
  },

  _f3CalDisplayAngleFromRulerIndex(index) {
    return this._f3CalClampServoAngle(this._f3CalAngleFromRulerIndex(index));
  },

  _f3CalSendRulerIndexDelta(prev, next) {
    if (next === prev) return;
    const dir = next > prev ? 1 : -1;
    let i = prev;
    // 过舵机角边界仍继续发：每格都震、都发
    while (i !== next) {
      i += dir;
      wx.vibrateShort({ type: 'light' });
      this._f3CalSendFoldCmd(dir > 0 ? 'U' : 'D', 1);
    }
    this._f3CalRulerLastIndex = next;
    this._f3CalRulerIndex = next;
    this._f3CalPreviewAngle = this._f3CalDisplayAngleFromRulerIndex(next);
  },

  _f3CalClampRulerIndex(index) {
    return Math.round(Number(index) || 0);
  },

  _f3CalSyncWheelAngleUi(index) {
    const ang = this._f3CalDisplayAngleFromRulerIndex(index);
    this._f3CalPreviewAngle = ang;
    const steps = Math.abs(Math.round(Number(index) || 0));
    return {
      f3CalTranslateX: this._f3CalRulerIndexToTranslate(index),
      f3CalPreviewAngle: ang,
      f3CalWheelSteps: steps,
      f3CalFoldGap: foldGapFromServoAngle(ang),
      f3CalRulerTransition: 'none'
    };
  },

  _f3CalStartWheelLiveSession() {
    if (this._f3CalWheelLiveTimer) {
      clearInterval(this._f3CalWheelLiveTimer);
      this._f3CalWheelLiveTimer = null;
    }
    this._f3CalWheelLiveTimer = setInterval(() => {
      if (this.data.f3CalStep !== 'wheel') {
        if (this._f3CalWheelLiveTimer) {
          clearInterval(this._f3CalWheelLiveTimer);
          this._f3CalWheelLiveTimer = null;
        }
        return;
      }
      const mm = Math.round(Number(this.data.f3HeightMm)) || 0;
      if (mm > 0) {
        const live = this._f3CalFormatLive(mm);
        if (live !== this.data.f3CalLiveText) {
          this.setData({ f3CalLiveText: live });
        }
      }
    }, 180);
  },

  _f3CalStopWheelLiveSession() {
    if (this._f3CalWheelLiveTimer) {
      clearInterval(this._f3CalWheelLiveTimer);
      this._f3CalWheelLiveTimer = null;
    }
  },

  _f3CalEnterWheelStep(branch) {
    const isA = branch === 'A';
    this._f3CalBranch = branch;
    const prep = this._f3CalPrepareWheelRulerState(branch);
    const h0Text = this._f3CalFormatLive(this._f3CalH0Units);
    const liveMm = Math.round(Number(this.data.f3HeightMm)) || 0;
    const liveText = liveMm > 0 ? this._f3CalFormatLive(liveMm) : '—';
    const wheelHint = isA
      ? '滑动波轮连续微调，往哪边滑就往哪边发送'
      : '按压后滑动波轮，往哪边滑就往哪边发送';
    const startAng = this._f3CalPreviewStartAngle;
    this.setData(this._f3CalStepMetaPatch('wheel', {
      f3CalStep: 'wheel',
      f3CalBranch: branch,
      f3CalTitle: '波轮微调',
      f3CalDesc: '',
      f3CalStatusText: '',
      f3CalLiveText: liveText,
      f3CalTargetText: h0Text,
      f3CalWheelHint: wheelHint,
      f3CalLimitHint: '',
      f3CalPreviewAngle: startAng,
      f3CalWheelSteps: 0,
      f3CalFoldGap: foldGapFromServoAngle(startAng),
      f3CalTicks: new Array(prep.tickCount).fill(0),
      f3CalPadTicks: new Array(50).fill(0),
      f3CalTranslateX: prep.translateX,
      f3CalRulerTransition: 'none'
    }, branch));
    this._f3CalSyncStepMeta('wheel');
    this._f3CalStartWheelLiveSession();
  },

  _f3CalApplyRulerIndex(newIndex, sendBle) {
    const clamped = this._f3CalClampRulerIndex(newIndex);
    const prev = this._f3CalRulerLastIndex || 0;
    const patch = this._f3CalSyncWheelAngleUi(clamped);
    if (clamped === prev) {
      this.setData(patch);
      return;
    }
    if (sendBle) {
      this._f3CalSendRulerIndexDelta(prev, clamped);
    } else {
      this._f3CalRulerLastIndex = clamped;
      this._f3CalRulerIndex = clamped;
      this._f3CalPreviewAngle = this._f3CalAngleFromRulerIndex(clamped);
    }
    this.setData(patch);
  },

  onF3CalRulerTouchStart(e) {
    if (this.data.f3CalStep !== 'wheel') return;
    this._f3CalRulerTouchActive = true;
    const touchX = e.touches[0].clientX;
    this._f3CalTouchStartX = touchX;
    this._f3CalTouchStartIndex = this._f3CalRulerLastIndex || 0;
  },

  onF3CalRulerTouchMove(e) {
    if (this.data.f3CalStep !== 'wheel' || !e.touches || !e.touches.length) return;
    if (this._f3CalTouchStartX == null) {
      this.onF3CalRulerTouchStart(e);
      return;
    }
    if (!this.data.f3CalTicks || !this.data.f3CalTicks.length) {
      const tickCount = this._f3CalWheelTickCount();
      this.setData({
        f3CalTicks: new Array(tickCount).fill(0),
        f3CalPadTicks: new Array(50).fill(0)
      });
    }
    const touchX = e.touches[0].clientX;
    const diff = (touchX - this._f3CalTouchStartX) * OPEN_ANGLE_RULER_SENSITIVITY;
    // 波轮跟手：位移不按角度边界锁死（方向与原先一致：右滑减小角）
    const rawTranslate = this._f3CalRulerIndexToTranslate(this._f3CalTouchStartIndex || 0) - diff;
    const visualIndex = this._f3CalIndexFromTranslate(rawTranslate);
    const prev = this._f3CalRulerLastIndex;
    const displayAng = this._f3CalDisplayAngleFromRulerIndex(visualIndex);
    const patch = {
      f3CalTranslateX: rawTranslate,
      f3CalRulerTransition: 'none',
      f3CalPreviewAngle: displayAng,
      f3CalWheelSteps: Math.abs(visualIndex),
      f3CalFoldGap: foldGapFromServoAngle(displayAng)
    };
    if (visualIndex !== prev) {
      this._f3CalSendRulerIndexDelta(prev, visualIndex);
      patch.f3CalPreviewAngle = this._f3CalPreviewAngle;
      patch.f3CalWheelSteps = Math.abs(visualIndex);
      patch.f3CalFoldGap = foldGapFromServoAngle(this._f3CalPreviewAngle);
    }
    this.setData(patch);
  },

  onF3CalRulerTouchEnd() {
    // 松手保持当前视觉格（可超过角度边界）；数字已是夹紧后的有效角
    const snapped = this._f3CalSnapRulerToIndex(this._f3CalRulerLastIndex || 0);
    const ang = this._f3CalDisplayAngleFromRulerIndex(snapped.index);
    this.setData({
      f3CalTranslateX: snapped.translateX,
      f3CalRulerTransition: 'none',
      f3CalPreviewAngle: ang,
      f3CalWheelSteps: Math.abs(snapped.index),
      f3CalFoldGap: foldGapFromServoAngle(ang)
    });
    this._f3CalRulerTouchActive = false;
    this._f3CalTouchStartX = null;
    this._f3CalTouchStartIndex = null;
  },

  _f3CalAfterSample1(result) {
    const mean = result && typeof result === 'object' ? result.mean : result;
    const range = result && typeof result === 'object' ? result.range : 0;
    if (!mean) {
      this._f3CalAbortWithToast('未采到有效高度，请检查传感器后重试');
      return;
    }
    const maxJump = this._F3_CAL_VOLATILITY_MAX_MM || 50;
    if (range > maxJump) {
      this.setData({
        f3CalShowVolatilityModal: true,
        f3CalStatusText: `数据波动 ${range} mm，超过 ${maxJump} mm 上限`
      });
      return;
    }
    this._f3CalH0Units = mean;
    const branch = mean < 400 ? 'A' : 'B';
    this._f3CalEnterWheelStep(branch);
    this._f3CalSyncStepMeta('wheel');
  },

  onF3CalVolatilityDismiss() {
    if (!this.data.f3CalShowVolatilityModal) return;
    this.setData({ f3CalShowVolatilityModal: false });
    this._f3CalSyncStepMeta('sample1');
  },

  onF3CalVolatilityRetry() {
    if (!this.data.f3CalShowVolatilityModal) return;
    this.setData({ f3CalShowVolatilityModal: false });
    this._f3CalEnterSample1();
  },

  _f3CalEnterBranchGuideStep(branch) {
    const b = branch || this._f3CalActiveBranch();
    if (b === 'A') {
      this.setData(this._f3CalStepMetaPatch('cardboard', {
        f3CalStep: 'cardboard',
        f3CalBranch: 'A',
        f3CalTitle: '放置纸板',
        f3CalDesc: '',
        f3CalStatusText: ''
      }, b));
      this._f3CalSyncStepMeta('cardboard');
      return;
    }
    this.setData(this._f3CalStepMetaPatch('compress', {
      f3CalStep: 'compress',
      f3CalBranch: 'B',
      f3CalTitle: '按压压缩',
      f3CalDesc: '',
      f3CalStatusText: ''
    }, b));
    this._f3CalSyncStepMeta('compress');
  },

  _f3CalEnterRestorePhase(onDone) {
    this._f3CalAfterRestoreCallback = typeof onDone === 'function' ? onDone : null;
    this.setData(this._f3CalStepMetaPatch('restoring', {
      f3CalStep: 'restoring',
      f3CalTitle: '恢复折叠角',
      f3CalStatusText: '短尾正在回到正常角度（item4）…'
    }));
    this._f3CalSyncStepMeta('restoring');
    this._f3CalSendFoldCmd('R');
    if (this._f3CalRestoreTimer) clearTimeout(this._f3CalRestoreTimer);
    this._f3CalRestoreTimer = setTimeout(() => {
      this._f3CalRestoreTimer = null;
      if (this._f3CalAfterRestoreCallback) {
        const fn = this._f3CalAfterRestoreCallback;
        this._f3CalAfterRestoreCallback = null;
        fn();
      }
    }, 2200);
  },

  _f3CalAfterRestoreToSample() {
    const branch = this._f3CalActiveBranch();
    const desc = branch === 'A'
      ? '请保持纸板水平，不要移动或晃动。'
      : '请保持按压或载人状态，不要松开。';
    this.setData(this._f3CalStepMetaPatch('sample2', {
      f3CalStep: 'sample2',
      f3CalTitle: '采集标定数据',
      f3CalDesc: desc,
      f3CalStatusText: '5 秒内取最小值作为危险高度'
    }));
    this._f3CalSyncStepMeta('sample2');
    this._f3CalStartSample('sample2', (result) => this._f3CalFinishWithSample(result));
  },

  _f3CalFinishWithSample(result) {
    const dangerUnits = Math.round(Number(result && typeof result === 'object' ? result.minimum : result));
    const baseUnits = Math.round(Number(this._f3CalH0Units));
    if (!dangerUnits || dangerUnits < 10) {
      this._f3CalAbortWithToast('未采到有效高度，请重试');
      return;
    }
    const dangerMmText = this._f3FormatMmInput(dangerUnits);
    const safeMmText = baseUnits > 0 ? this._f3FormatMmInput(baseUnits) : '';
    this._f3CalCommitHeightWrites(baseUnits, dangerUnits, safeMmText, dangerMmText);
  },

  /** 自动标定：在向导内写入 DA/TB，逐条回读校验 */
  _f3CalCommitHeightWrites(baseUnits, dangerUnits, safeMmText, dangerMmText) {
    this._f3CancelHeightCharTimers();
    this._clearBleSendQueue();
    this._f3CalPrepareHeightWriteUi(safeMmText, dangerMmText);
    this._f3CalWritingHeights = true;

    const dangerMm = dangerMmText || this._f3FormatMmInput(dangerUnits);
    const baseMm = safeMmText || (baseUnits > 0 ? this._f3FormatMmInput(baseUnits) : '');
    const hasBase = baseUnits > 0;

    this.setData(this._f3CalStepMetaPatch('writing', {
      f3CalStep: 'writing',
      f3CalTitle: '写入设备',
      f3CalDesc: '',
      f3CalResultText: '',
      f3CalStatusText: '',
      f3CalWriteDangerMm: dangerMm ? `${dangerMm} mm` : '',
      f3CalWriteBaseMm: baseMm ? `${baseMm} mm` : '',
      f3CalWriteDangerStatus: 'pending',
      f3CalWriteBaseStatus: hasBase ? 'pending' : 'skip'
    }));
    this._f3CalSyncStepMeta('writing');

    const finishResult = (allOk) => {
      this._f3CalWritingHeights = false;
      if (allOk) {
        setTimeout(() => this._f3SetHeightConfigMode(false, { clearQueue: false }), 500);
      }
      this.setData(this._f3CalStepMetaPatch('writeResult', {
        f3CalStep: 'writeResult',
        f3CalTitle: allOk ? '写入完成' : '写入失败',
        f3CalWriteOk: allOk,
        f3CalWriteResultTitle: allOk ? '标定数据已写入设备' : '部分数据未能写入',
        f3CalWriteResultSub: allOk
          ? (hasBase ? `危险 ${dangerMm} mm · 检测 ${baseMm} mm` : `危险高度 ${dangerMm} mm`)
          : '写入失败，请保持蓝牙连接后重试自动校准'
      }));
      this._f3CalSyncStepMeta('writeResult');
    };

    const run = async () => {
      await this._f3WaitBleQueueIdle(6000);
      try {
        await this._f3EnsureHeightConfigModeForWrite({ quiet: true, calAuto: true, timeoutMs: 18000 });
      } catch (e) {
        console.error('[自动标定] 进入配置模式失败', e);
        finishResult(false);
        return;
      }
      await this._f3WaitBleQueueIdle(4000);

      let dangerOk = false;
      let baseOk = !hasBase;

      try {
        this.setData({ f3CalWriteDangerStatus: 'writing' });
        await this._f3HeightWriteWithAck('danger', dangerUnits);
        this.setData({ f3CalWriteDangerStatus: 'ok' });
        dangerOk = true;
      } catch (e) {
        this.setData({ f3CalWriteDangerStatus: 'fail' });
      }

      if (hasBase && dangerOk) {
        await this._f3WaitBleQueueIdle(8000);
        await new Promise((r) => setTimeout(r, 3000));
        try {
          this.setData({ f3CalWriteBaseStatus: 'writing' });
          await this._f3HeightWriteWithAck('base', baseUnits);
          this.setData({ f3CalWriteBaseStatus: 'ok' });
          baseOk = true;
        } catch (e) {
          this.setData({ f3CalWriteBaseStatus: 'fail' });
          baseOk = false;
        }
      }

      finishResult(dangerOk && baseOk);
    };

    setTimeout(() => {
      run().catch((err) => {
        console.error('[自动标定] 写入异常', err);
        this.setData({
          f3CalWriteDangerStatus: this.data.f3CalWriteDangerStatus === 'ok' ? 'ok' : 'fail',
          f3CalWriteBaseStatus: hasBase
            ? (this.data.f3CalWriteBaseStatus === 'ok' ? 'ok' : 'fail')
            : 'skip'
        });
        finishResult(false);
      });
    }, 800);
  },

  _f3CalEnterSample1() {
    this._f3CalSyncStepMeta('sample1');
    this.setData(this._f3CalStepMetaPatch('sample1', {
      f3CalStep: 'sample1',
      f3CalTitle: '首次检测',
      f3CalDesc: '请保持车辆不动，正在进行基准高度检测。',
      f3CalTargetLabel: 'A 危险高度',
      f3CalStatusText: '5 秒内取平均值作为判断依据'
    }));
    this._f3CalStartSample('sample1', (result) => this._f3CalAfterSample1(result));
  },

  _f3CalStartWizard() {
    if (!this._canControlDevice()) {
      this._showCustomToast('无操作权限', 'none', 2000);
      return;
    }
    if (!this._canSendBleCommand()) {
      this._showCustomToast('请先连接蓝牙', 'none', 2000);
      return;
    }
    this._clearF3CalTimer();
    this._f3CalBranch = '';
    this._f3CalH0Units = 0;
    this.setData(this._f3CalStepMetaPatch('preflight', {
      f3ShowCalOverlay: true,
      f3CalShowHoldModal: false,
      f3CalShowVolatilityModal: false,
      f3CalStep: 'preflight',
      f3CalTitle: '准备校准',
      f3CalDesc: '',
      f3CalTargetLabel: '',
      f3CalLiveText: '',
      f3CalMedianText: '',
      f3CalResultText: '',
      f3CalStatusText: '',
      f3CalCountdown: 0
    }));
  },

  onF3CalPreflightConfirm() {
    if (this.data.f3CalStep !== 'preflight') return;
    if (this.data.f3CalPreflightClosing) return;
    this._f3CalEnsureFlapClosedThen(() => this._f3CalEnterSample1());
  },

  onF3StartAutoCal() {
    if (!isF3MaxModel(this.data.currentModel)) return;
    if (this.data.f3ShowCalOverlay) {
      this._showCustomToast('自动校准进行中', 'none', 1800);
      return;
    }
    if (!this._canSendBleCommand()) {
      this._showCustomToast('请先连接蓝牙', 'none', 1800);
      return;
    }
    // 按当前传感器皮肤走对应向导
    if (this.data.f3SensorUi === 'imu') {
      this._f3ImuCalStartWizard();
    } else {
      this._f3CalStartWizard();
    }
  },

  _f3ImuCalClearTimers() {
    if (this._f3ImuSampleTimer) {
      clearInterval(this._f3ImuSampleTimer);
      this._f3ImuSampleTimer = null;
    }
    this._f3ImuSampling = false;
    this._f3ImuSamples = [];
  },

  _f3ImuCalStartWizard() {
    this._f3ImuCalClearTimers();
    this._f3ImuClearWritePending();
    this._f3ImuPhase = 'up'; // up -> lean -> done
    this._f3ImuUpAvg = null;
    this.setData({
      f3ShowCalOverlay: true,
      f3CalStep: 'imuIntro',
      f3CalStepNo: 1,
      f3CalStepTotal: 3,
      f3CalTitle: '停车姿态标定',
      f3CalDesc: '依次采集扶正与脚撑倾斜，写入设备后断电仍有效',
      f3CalStatusText: '',
      f3ImuLiveText: '',
      f3ImuLiveNum: '—',
      f3ImuAvgText: '',
      f3ImuProgressPct: 0,
      f3ImuUpWriteOk: false,
      f3ImuLeanWriteOk: false,
      f3ImuCalWriteHint: ''
    });
  },

  onF3ImuCalCancel() {
    this._f3ImuCalClearTimers();
    this._f3ImuClearWritePending();
    this.setData({ f3ShowCalOverlay: false, f3CalStep: '' });
  },

  onF3ImuCalDoneClose() {
    this.onF3ImuCalCancel();
  },

  onF3ImuCalIntroNext() {
    this._f3ImuPhase = 'up';
    this._f3ImuShowReady('up');
  },

  _f3ImuShowReady(phase) {
    this._f3ImuPhase = phase;
    const map = {
      up: {
        no: 2,
        step: 'imuReadyUp',
        title: '第 1 项：扶正标定',
        desc: '采集车辆摆正时的倾角',
        k: '请将车辆扶正',
        v: '双脚着地 / 正停车',
        status: '车身尽量竖直，人不要压车，停稳后再点开始',
        live: `倾角 ${this.data.f3ImuLiveNum || '—'}`
      },
      lean: {
        no: 3,
        step: 'imuReadyLean',
        title: '第 2 项：倾斜标定',
        desc: '采集脚撑停车时的倾角',
        k: '请打上脚撑',
        v: '让车倾斜停稳',
        status: '模拟买水停车姿态，停稳后再点开始',
        live: `倾角 ${this.data.f3ImuLiveNum || '—'}`
      }
    };
    const m = map[phase] || map.up;
    this.setData({
      f3CalStep: m.step,
      f3CalStepNo: m.no,
      f3CalStepTotal: 4,
      f3CalTitle: m.title,
      f3CalDesc: m.desc,
      f3ImuReadyHintK: m.k,
      f3ImuReadyHintV: m.v,
      f3CalStatusText: m.status,
      f3ImuLiveText: m.live
    });
  },

  onF3ImuCalReadyConfirm() {
    if (!this._canSendBleCommand()) {
      this._showCustomToast('请先连接蓝牙', 'none', 1500);
      return;
    }
    this._f3ImuStartSampling(this._f3ImuPhase || 'up');
  },

  onF3ImuCalRetry() {
    this._f3ImuShowReady(this._f3ImuPhase || 'up');
  },

  _f3ImuStartSampling(phase) {
    const sec = 5;
    this._f3ImuSamples = [];
    this._f3ImuSampling = true;
    this._f3ImuSampleLeft = sec;
    this.setData({
      f3CalStep: 'imuSampling',
      f3CalCountdown: sec,
      f3ImuSampleLabel: '倾角',
      f3ImuSampleHint: '分析姿态平均值',
      f3ImuSampleHoldHint: '请保持姿势，不要晃动',
      f3ImuLiveUnit: '°',
      f3ImuLiveNum: '—',
      f3ImuAvgText: '',
      f3ImuProgressPct: 0,
      f3CalStatusText: '采集中…'
    });

    if (this._f3ImuSampleTimer) clearInterval(this._f3ImuSampleTimer);
    this._f3ImuSampleTimer = setInterval(() => {
      const left = (this._f3ImuSampleLeft || 1) - 1;
      this._f3ImuSampleLeft = left;
      const pct = Math.max(0, Math.min(100, Math.round(((sec - left) / sec) * 100)));
      this.setData({ f3CalCountdown: Math.max(0, left), f3ImuProgressPct: pct });
      if (left <= 0) {
        clearInterval(this._f3ImuSampleTimer);
        this._f3ImuSampleTimer = null;
        this._f3ImuFinishSampling(phase);
      }
    }, 1000);
  },

  _f3ImuPushLiveSample(parsed) {
    if (!this._f3ImuSampling || !parsed) return;
    let v = null;
    if (parsed.ird != null) {
      v = Math.abs(Number(parsed.ird) / 10);
    }
    if (v == null || !Number.isFinite(v)) return;
    this._f3ImuSamples.push(v);
    const avg = this._f3ImuSamples.reduce((a, b) => a + b, 0) / this._f3ImuSamples.length;
    const liveNum = avg.toFixed(1);
    this.setData({
      f3ImuLiveNum: liveNum,
      f3ImuAvgText: `样本 ${this._f3ImuSamples.length} · 均值 ${liveNum}°`,
      f3ImuLiveText: `倾角 ${liveNum}°`
    });
  },

  _f3ImuAnalyze(samples) {
    if (!samples || samples.length < 4) {
      return { ok: false, reason: '采集样本太少，请保持蓝牙连接后重试' };
    }
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    let varSum = 0;
    for (let i = 0; i < samples.length; i++) {
      const d = samples[i] - avg;
      varSum += d * d;
    }
    const std = Math.sqrt(varSum / samples.length);
    if (std > 2.2) {
      return { ok: false, reason: '倾角晃动太大，请把车停稳再采' };
    }
    return { ok: true, avg, std };
  },

  _f3ImuFinishSampling(phase) {
    this._f3ImuSampling = false;
    const samples = this._f3ImuSamples || [];
    const ana = this._f3ImuAnalyze(samples);
    if (!ana.ok) {
      this.setData({
        f3CalStep: 'imuUnstable',
        f3CalStatusText: ana.reason
      });
      return;
    }
    this._f3ImuWritePhase(phase, ana.avg);
  },

  _f3ImuMarkSystemHint() {
    const upOk = !!this.data.f3ImuUpWriteOk;
    const leanOk = !!this.data.f3ImuLeanWriteOk;
    let hint = '尚未确认写入设备，请先完成自动校准';
    if (upOk && leanOk) hint = '扶正、倾斜已写入设备（断电仍有效）';
    else if (upOk) hint = '扶正已写入；请继续完成倾斜';
    else if (leanOk) hint = '倾斜已写入；请补齐扶正';
    this.setData({ f3ImuCalSystemHint: hint });
  },

  _f3ImuClearWritePending() {
    if (this._f3ImuWriteTimer) {
      clearTimeout(this._f3ImuWriteTimer);
      this._f3ImuWriteTimer = null;
    }
    this._f3ImuWritePending = null;
  },

  _f3ImuOnWriteAck(kind, ok, detail) {
    const pending = this._f3ImuWritePending;
    if (!pending || pending.phase !== kind) return;
    this._f3ImuClearWritePending();
    if (typeof pending.resolve === 'function') {
      pending.resolve({ ok: !!ok, detail: detail || '' });
    }
  },

  _f3ImuWaitWriteAck(phase, avg, timeoutMs) {
    return new Promise((resolve) => {
      this._f3ImuClearWritePending();
      this._f3ImuWritePending = {
        phase,
        avg,
        resolve
      };
      this._f3ImuWriteTimer = setTimeout(() => {
        if (!this._f3ImuWritePending || this._f3ImuWritePending.phase !== phase) return;
        this._f3ImuWritePending = null;
        this._f3ImuWriteTimer = null;
        resolve({ ok: false, detail: 'timeout' });
      }, timeoutMs || 2200);
    });
  },

  async _f3ImuWritePhase(phase, avg) {
    let cmd = 'CL';
    let tip = '正在写入倾斜标定到设备…';
    let ackPhase = 'lean';
    if (phase === 'up') {
      cmd = 'CU';
      tip = '正在写入扶正标定到设备…';
      ackPhase = 'up';
    }
    this.setData({
      f3CalStep: 'imuWriting',
      f3CalStatusText: tip
    });
    const ackPromise = this._f3ImuWaitWriteAck(ackPhase, avg, 2200);
    this.sendData(cmd, 900);
    const ack = await ackPromise;

    if (phase === 'up') {
      const avgText = `${Number(avg).toFixed(1)}°`;
      if (ack.ok) {
        this.setData({
          f3ImuUpText: `${avgText}（已写入设备）`,
          f3ImuUpWriteOk: true,
          f3CalStatusText: `扶正 ${avgText} 已写入设备`
        });
        this._f3ImuMarkSystemHint();
        this._showCustomToast('扶正标定已写入设备', 'success', 1800);
        setTimeout(() => this._f3ImuShowReady('lean'), 500);
      } else {
        this.setData({
          f3ImuUpText: `${avgText}（未确认）`,
          f3ImuUpWriteOk: false,
          f3CalStep: 'imuUnstable',
          f3CalStatusText: ack.detail === 'mpu'
            ? '设备 MPU 未就绪，扶正未写入。请检查接线后重试'
            : '未收到设备确认，扶正可能未写入。请保持蓝牙连接后重试'
        });
        this._f3ImuMarkSystemHint();
        this._showCustomToast('扶正写入失败', 'none', 2000);
      }
      return;
    }

    // lean → done
    const avgText = `${Number(avg).toFixed(1)}°`;
    if (ack.ok) {
      const upOk = !!this.data.f3ImuUpWriteOk;
      this.setData({
        f3ImuLeanText: `${avgText}（已写入设备）`,
        f3ImuLeanWriteOk: true,
        f3CalStep: 'imuDone',
        f3CalTitle: '校准完成',
        f3CalDesc: upOk
          ? '扶正、倾斜已写入设备，断电后仍有效'
          : '倾斜已写入；建议补做扶正标定',
        f3ImuCalWriteHint: '倾角仅用于显示与标定，翻板请用按钮或小程序',
        f3CalStepNo: 3
      });
      this._f3ImuMarkSystemHint();
      this._showCustomToast('倾斜标定已写入设备', 'success', 1800);
    } else {
      this.setData({
        f3ImuLeanText: `${avgText}（未确认）`,
        f3ImuLeanWriteOk: false,
        f3CalStep: 'imuUnstable',
        f3CalStatusText: ack.detail === 'mpu'
          ? '设备 MPU 未就绪，倾斜未写入。请检查接线后重试'
          : '未收到设备确认，倾斜可能未写入。请保持蓝牙连接后重试'
      });
      this._f3ImuMarkSystemHint();
      this._showCustomToast('倾斜写入失败', 'none', 2000);
    }
  },

  // 兼容旧测高入口：已废弃
  onF3EnterHeightConfigMode() {
    this._showCustomToast('请使用「自动校准」完成陀螺仪标定', 'none', 2200);
  },

  onF3ExitHeightConfigMode() {
    this._f3SetHeightConfigMode(false);
  },

  _sendF3ImuCmd(cmd, tip) {
    if (!this._canSendBleCommand()) {
      this._showCustomToast('请先连接蓝牙', 'none', 1500);
      return;
    }
    this.sendData(cmd, 800);
    if (tip) this._showCustomToast(tip, 'none', 1600);
  },

  onF3ImuCalLean() {
    if (!this.data.isAdmin && !this._isRemoteAssistAdminActive()) {
      this.handleAutoCalibrate();
      return;
    }
    if (!this._canSendBleCommand()) {
      this._showCustomToast('请先连接蓝牙', 'none', 1500);
      return;
    }
    const ackPromise = this._f3ImuWaitWriteAck('lean', null, 2200);
    this.sendData('CL', 800);
    this._showCustomToast('已发送倾斜标定，等待设备确认…', 'none', 1600);
    ackPromise.then((ack) => {
      this._showCustomToast(
        ack.ok ? '倾斜标定已写入设备' : '倾斜写入未确认，请重试',
        ack.ok ? 'success' : 'none',
        1800
      );
      if (ack.ok) {
        this.setData({ f3ImuLeanWriteOk: true });
        this._f3ImuMarkSystemHint();
      }
    });
  },

  onF3ImuCalUp() {
    if (!this.data.isAdmin && !this._isRemoteAssistAdminActive()) {
      this.handleAutoCalibrate();
      return;
    }
    if (!this._canSendBleCommand()) {
      this._showCustomToast('请先连接蓝牙', 'none', 1500);
      return;
    }
    const ackPromise = this._f3ImuWaitWriteAck('up', null, 2200);
    this.sendData('CU', 800);
    this._showCustomToast('已发送扶正标定，等待设备确认…', 'none', 1600);
    ackPromise.then((ack) => {
      this._showCustomToast(
        ack.ok ? '扶正标定已写入设备' : '扶正写入未确认，请重试',
        ack.ok ? 'success' : 'none',
        1800
      );
      if (ack.ok) {
        this.setData({ f3ImuUpWriteOk: true });
        this._f3ImuMarkSystemHint();
      }
    });
  },

  _f3BumpThrParams(uiGear) {
    const gear = F3_BUMP_GEAR[f3BumpGearOrDefault(uiGear)];
    const needPct = gear.needPct;
    const s = f3BumpNeedToBs(needPct);
    return {
      needMul: needPct / 100,
      riseNeed: (16 + s * 4) / 1000,
      floorNeed: (32 + s * 6) / 1000
    };
  },

  /** 进 F3 控制台：默认先出 TOF 皮；本会话已判明 IMU 则保持 */
  _f3ResetSensorUiForEntry() {
    if (!isF3MaxModel(this.data.currentModel)) return;
    if (this.data.f3DeviceVariant === 'imu' || this.data.f3SensorUi === 'imu') {
      this.setData({
        f3SensorUi: 'imu',
        f3AttitudeVisible: true,
        f3HeightMonitorVisible: false
      });
      return;
    }
    this.setData({
      f3SensorUi: 'tof',
      f3SensorUiSwitching: false,
      f3AttitudeVisible: false,
      f3HeightMonitorVisible: true
    });
  },

  /** BLE 状态包判明代次后切皮肤（TOF→IMU 带加载过渡） */
  _f3ApplySensorUiFromBle(variant) {
    if (!isF3MaxModel(this.data.currentModel)) return;
    const next = variant === 'imu' ? 'imu' : (variant === 'tof' ? 'tof' : '');
    if (!next) return;
    const cur = this.data.f3SensorUi || 'tof';
    if (next === cur) {
      // 同步显隐，防止被其它逻辑盖掉
      if (next === 'imu') {
        if (!this.data.f3AttitudeVisible || this.data.f3HeightMonitorVisible) {
          this.setData({ f3AttitudeVisible: true, f3HeightMonitorVisible: false });
        }
      } else if (!this.data.f3HeightMonitorVisible || this.data.f3AttitudeVisible) {
        this.setData({ f3AttitudeVisible: false, f3HeightMonitorVisible: true });
      }
      return;
    }
    if (next === 'imu' && cur === 'tof') {
      if (this._f3SensorUiSwitching) return;
      this._f3SensorUiSwitching = true;
      this.setData({
        f3SensorUiSwitching: true,
        f3SensorUiSwitchHint: '已检测到陀螺仪，正在切换界面…'
      });
      setTimeout(() => {
        this.setData({
          f3SensorUi: 'imu',
          f3DeviceVariant: 'imu',
          f3AttitudeVisible: true,
          f3HeightMonitorVisible: false,
          f3SensorUiSwitching: false,
          f3SensorUiSwitchHint: ''
        }, () => {
          this._f3SensorUiSwitching = false;
          try {
            this._f3SyncBumpGearToDevice({ quiet: true });
            this._f3SyncStallGearToDevice({ quiet: true });
          } catch (e) { /* ignore */ }
        });
      }, 700);
      return;
    }
    // IMU→TOF 极少见：静默切回
    this.setData({
      f3SensorUi: 'tof',
      f3DeviceVariant: 'tof',
      f3AttitudeVisible: false,
      f3HeightMonitorVisible: true
    });
  },

  _f3SyncBumpGearToDevice(opts) {
    const o = opts || {};
    const g = f3BumpGearOrDefault(this.data.f3BumpSens);
    const gear = F3_BUMP_GEAR[g];
    try {
      wx.setStorageSync('f3_bump_sens', g);
      wx.setStorageSync('f3_gear_v4', 1);
    } catch (e) { /* ignore */ }
    this.setData({ f3BumpSens: g, f3BumpSensText: gear.label });
    if (!this._canSendBleCommand()) {
      if (!o.quiet) this._showCustomToast(`过坑灵敏度：${gear.label}（未连蓝牙，仅本机）`, 'none', 1600);
      return false;
    }
    // 按表 needPct 精确给小程序用；车端同步最近 BS（固件空间不够塞任意 BP）
    const bs = f3BumpNeedToBs(gear.needPct);
    this._sendF3ImuCmd(`BS${bs}`, o.quiet ? '' : `过坑灵敏度：${gear.label}`);
    return true;
  },

  onF3BumpSensTap(e) {
    const raw = e && e.currentTarget && e.currentTarget.dataset
      ? e.currentTarget.dataset.sens
      : undefined;
    const g = f3BumpGearOrDefault(raw);
    this.setData({
      f3BumpSens: g,
      f3BumpSensText: F3_BUMP_GEAR[g].label
    });
    this._f3SyncBumpGearToDevice({ quiet: false });
  },

  _f3StallGearParams(uiGear) {
    return F3_STALL_GEAR[f3StallGearOrDefault(uiGear)];
  },

  _f3SyncStallGearToDevice(opts) {
    const o = opts || {};
    const g = f3StallGearOrDefault(this.data.f3StallSens);
    const gear = F3_STALL_GEAR[g];
    try { wx.setStorageSync('f3_stall_sens', g); } catch (e) { /* ignore */ }
    this.setData({
      f3StallSens: g,
      f3StallSensText: gear.label
    });
    if (!this._canSendBleCommand()) {
      if (!o.quiet) this._showCustomToast(`碰胎灵敏度：${gear.label}（未连蓝牙，仅本机）`, 'none', 1600);
      return false;
    }
    // SS 写预设档；SP 下发具体数值（后期只改 F3_STALL_GEAR 表即可）
    this._sendF3ImuCmd(`SS${g}`, '');
    setTimeout(() => {
      this._sendF3ImuCmd(
        `SP${gear.open},${gear.close},${gear.ho},${gear.hc}`,
        o.quiet ? '' : `碰胎灵敏度：${gear.label}`
      );
    }, 200);
    return true;
  },

  onF3StallSensTap(e) {
    const raw = e && e.currentTarget && e.currentTarget.dataset
      ? e.currentTarget.dataset.sens
      : undefined;
    const g = f3StallGearOrDefault(raw);
    this.setData({
      f3StallSens: g,
      f3StallSensText: F3_STALL_GEAR[g].label
    });
    this._f3SyncStallGearToDevice({ quiet: false });
  },

  onF3LightOn() {
    this._sendF3ImuCmd('L1', '照明灯开启');
  },

  onF3LightOff() {
    this._sendF3ImuCmd('L0', '照明灯关闭');
  },

  onF3LightAuto() {
    this._sendF3ImuCmd('LA', '照明灯恢复自动');
  },

  _f3ShowHeightWriteModal(opts) {
    const o = opts || {};
    this.setData({
      f3HeightWriteModalVisible: true,
      f3HeightWriteModalPhase: o.phase || 'writing',
      f3HeightWriteModalLabel: o.label || '',
      f3HeightWriteModalMm: o.mm || '',
      f3HeightWriteModalHint: o.hint || '正在写入并回读校验…'
    });
  },

  _f3CloseHeightWriteModal() {
    this.setData({ f3HeightWriteModalVisible: false });
  },

  onF3HeightWriteModalClose() {
    this._f3HeightWriteSeq = (this._f3HeightWriteSeq || 0) + 1;
    this._f3HeightWritePending = null;
    this._f3HeightSendLockUntil = 0;
    this._f3CloseHeightWriteModal();
  },

  _f3ManualHeightWrite(kind, mm) {
    const label = kind === 'danger' ? '危险高度' : '检测高度';
    const mmText = this._f3FormatMmInput(mm);

    const finishModal = (ok, hint) => {
      this.setData({
        f3HeightWriteModalPhase: ok ? 'success' : 'fail',
        f3HeightWriteModalHint: hint || (ok
          ? '回读校验通过，数据已写入设备'
          : '设备未确认写入，请检查蓝牙后重试')
      });
      if (ok) wx.vibrateShort({ type: 'light' });
    };

    const runWrite = () => {
      this.setData({ f3HeightWriteModalHint: '正在写入并回读校验…' });
      this._f3SubmitHeightMmRetrying(kind, mm, {
        quiet: true,
        autoCfg: true,
        onDone: (ok) => finishModal(ok)
      });
    };

    if (!this._canControlDevice() || !this._canSendBleCommand()) {
      this._f3ShowHeightWriteModal({
        phase: 'fail',
        label,
        mm: `${mmText} mm`,
        hint: '请先连接蓝牙'
      });
      return;
    }

    const needCfg = !this.data.f3HeightConfigModeOn
      || Date.now() < (this._f3CfgReadyAt || 0)
      || this._f3LastStatusF3c !== 1;

    this._f3ShowHeightWriteModal({
      phase: 'writing',
      label,
      mm: `${mmText} mm`,
      hint: needCfg ? '正在进入测高配置模式…' : '正在写入并回读校验…'
    });

    if (!needCfg) {
      runWrite();
      return;
    }

    this._f3EnsureHeightConfigModeForWrite({ quiet: true, timeoutMs: 15000 })
      .then(() => runWrite())
      .catch(() => {
        finishModal(false, '未能进入测高配置模式。请关闭本弹窗后点「进入测高配置模式」，再重新写入。');
      });
  },

  onF3CalReady() {
    if (this.data.f3CalStep !== 'wheel') return;
    this._f3CalStopWheelLiveSession();
    this._f3CalEnterBranchGuideStep(this._f3CalActiveBranch());
  },

  onF3CalCardboardKnow() {
    if (this.data.f3CalStep !== 'cardboard') return;
    const holdMeta = this._f3CalStepMeta('hold');
    this.setData({
      f3CalShowHoldModal: true,
      f3CalStepNo: holdMeta.no,
      f3CalStepTotal: holdMeta.total
    });
  },

  onF3CalHoldDismiss() {
    if (!this.data.f3CalShowHoldModal) return;
    const patch = { f3CalShowHoldModal: false };
    this._f3CalStepMetaPatch('cardboard', patch);
    this.setData(patch);
  },

  onF3CalHoldConfirm() {
    if (!this.data.f3CalShowHoldModal) return;
    this.setData({ f3CalShowHoldModal: false });
    this._f3CalEnterRestorePhase(() => this._f3CalAfterRestoreToSample());
  },

  onF3CalCompressStart() {
    if (this.data.f3CalStep !== 'compress') return;
    this._f3CalEnterRestorePhase(() => this._f3CalAfterRestoreToSample());
  },

  _parseF3HeightMmInput(raw) {
    let s = String(raw || '').trim();
    s = s.replace(/[\uFF10-\uFF19]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFF10 + 0x30));
    s = s.replace(/[^\d]/g, '');
    if (!s) return NaN;
    const mm = Math.round(Number(s));
    if (!Number.isFinite(mm)) return NaN;
    return mm;
  },

  /** 数字位之和 mod 100，2位补零。用于附加校验和，BLE 丢字符/串字符时几乎必然对不上，
   * 固件校验失败会直接丢弃该条命令，不会误写成别的高度。 */
  _f3DigitChecksum(digits) {
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      const code = digits.charCodeAt(i) - 48;
      if (code >= 0 && code <= 9) sum += code;
    }
    return String(sum % 100).padStart(2, '0');
  },

  _f3HeightStorageCmd(kind, storageUnits) {
    const tag = kind === 'danger' ? 'DA' : 'TB';
    const mm = Math.round(Number(storageUnits));
    if (!Number.isFinite(mm) || mm < 10 || mm > 3000) return '';
    const mmText = String(mm);
    const checksum = this._f3DigitChecksum(mmText);
    const cmd = `${tag}${mmText}S${checksum}`;
    return cmd;
  },

  _f3SubmitHeightMm(kind, storageUnits, options) {
    const units = Math.max(10, Math.min(3000, Math.round(Number(storageUnits))));
    if (!Number.isFinite(units)) return false;
    const mmText = this._f3FormatMmInput(units);
    const label = kind === 'danger' ? '危险高度' : '检测高度';
    const cmd = this._f3HeightStorageCmd(kind, units);
    if (!cmd) return false;
    const patch = kind === 'danger'
      ? { f3DangerInput: mmText }
      : { f3BaseInput: mmText };
    this.setData(patch);
    const sendOpts = { ...(options || {}) };
    if (this._f3CalWritingHeights || sendOpts.autoCfg) sendOpts.autoCfg = true;
    return this._sendF3HeightBleCmd(cmd, label, kind, units, mmText, sendOpts);
  },

  _f3FormatHeightMm(mm) {
    const n = Math.round(Number(mm));
    if (!Number.isFinite(n) || n <= 0) return '';
    return `${n} mm`;
  },

  _f3FormatMmInput(mm) {
    const n = Math.round(Number(mm));
    if (!Number.isFinite(n) || n <= 0) return '';
    return String(n);
  },

  _f3SetHeightConfigMode(on, options) {
    const opts = options || {};
    if (!isF3MaxModel(this.data.currentModel)) return;
    if (!this._canControlDevice() || !this._canSendBleCommand()) {
      if (!opts.silent) this._showCustomToast('请先连接蓝牙', 'none', 2000);
      return;
    }
    const cmd = on ? 'M1#' : 'M0#';
    this._f3HeightLog(on ? '进入配置模式' : '退出配置模式', {
      cmd,
      uiOn: !!on,
      f3cReadback: this.data.f3HeightConfigModeOn,
      charId: this._getBleWriteCharacteristicId(),
      queueLen: (this._bleSendQueue && this._bleSendQueue.length) || 0
    });
    this.setData({ f3HeightConfigModeOn: !!on });
    this._f3CfgReadyAt = on ? (Date.now() + 2000) : 0;
    this._f3HeightCfgLocalUntil = on ? (Date.now() + 10000) : 0;
    if (on) {
      this._bumpF3HeightBleGrace(90000);
    } else {
      this._f3HeightBleGraceUntil = 0;
      if (this.ble) this.ble._suppressDisconnectUntil = 0;
    }

    if (!on) {
      this._f3HeightSendLockUntil = 0;
      this._f3HeightCfgLocalUntil = 0;
    }

    if (opts.clearQueue !== false) this._clearBleSendQueue();
    if (!on && this.data.f3ShowCalOverlay && !opts.keepCalOverlay) this._f3CalDismissWizard();
    this.sendData(cmd, 1000);
    if (!opts.silent) {
      this._showCustomToast(on ? '已进入测高配置模式，请稍候再写入' : '已退出测高配置模式', 'none', 1800);
    }
  },

  _sendF3HeightBleCmd(sendText, label, kind, expectedUnits, mmText, options) {
    const opts = options || {};
    this._f3HeightLog('写入开始', {
      sendText, label, kind, expectedUnits, mmText,
      uiCfgOn: this.data.f3HeightConfigModeOn,
      cfgReadyIn: Math.max(0, (this._f3CfgReadyAt || 0) - Date.now()),
      lockIn: Math.max(0, (this._f3HeightSendLockUntil || 0) - Date.now()),
      charId: this._getBleWriteCharacteristicId()
    });
    if (!this._canControlDevice() || !this._canSendBleCommand()) {
      this._f3HeightLog('写入拒绝', '未连接蓝牙');
      this._showCustomToast('请先连接蓝牙', 'none', 2000);
      return false;
    }
    if (!this.data.f3HeightConfigModeOn && !opts.autoCfg && !this._f3CalWritingHeights) {
      this._f3HeightLog('写入拒绝', 'UI未在配置模式');
      this._showCustomToast('请先点「进入测高配置模式」', 'none', 2200);
      return false;
    }
    if (Date.now() < (this._f3CfgReadyAt || 0) && !opts.autoCfg && !this._f3CalWritingHeights) {
      this._f3HeightLog('写入拒绝', { reason: '配置模式未就绪', waitMs: (this._f3CfgReadyAt || 0) - Date.now() });
      this._showCustomToast('配置模式刚进入，请 1 秒后再点', 'none', 1800);
      return false;
    }
    if (Date.now() < (this._f3HeightSendLockUntil || 0)) {
      this._f3HeightLog('写入拒绝', { reason: '发送锁定', waitMs: (this._f3HeightSendLockUntil || 0) - Date.now() });
      this._showCustomToast('发送过快，请稍候', 'none', 1200);
      return false;
    }
    const cmd = String(sendText || '').replace(/#$/, '') + '#';
    const units = Math.round(Number(expectedUnits));
    const displayMm = mmText || this._f3FormatMmInput(units);
    const charCount = cmd.length;
    const charSendMs = charCount * 280 + 1500;
    this._f3HeightSendLockUntil = Date.now() + charSendMs;
    if (kind && Number.isFinite(units)) {
      this._f3HeightWritePending = {
        kind,
        units,
        expire: Date.now() + (opts.ackTimeout || 12000),
        onAck: typeof opts.onAck === 'function' ? opts.onAck : null,
        onFail: typeof opts.onFail === 'function' ? opts.onFail : null
      };
      this._f3HeightLog('等待回读', this._f3HeightWritePending);
      if (!opts.onAck) {
        const readback = formatF3HeightMm(units);
        const optimistic = kind === 'danger'
          ? { f3DangerMm: units, f3DangerReadback: readback }
          : { f3BaseMm: units, f3BaseReadback: readback };
        this.setData(optimistic);
      }
    }
    this._f3HeightLog('发送命令', { cmd, displayMm, charCount, charSendMs });
    this._f3CancelHeightCharTimers();
    this._clearBleSendQueue();
    this._f3EnqueueHeightCmdChars(cmd);

    if (!opts.silent) {
      this._showCustomToast(`已发送 ${displayMm} mm`, 'none', 1800);
      wx.vibrateShort({ type: 'light' });
    }
    return true;
  },

  onF3SendDangerHeight() {
    const raw = String(this.data.f3DangerInput || '').trim();
    const mm = this._parseF3HeightMmInput(raw);
    if (!Number.isFinite(mm) || mm < 10 || mm > 3000) {
      this._showCustomToast('危险高度请输入 10–3000 mm', 'none', 2000);
      return;
    }
    this._f3ManualHeightWrite('danger', mm);
  },

  onF3SendBaseHeight() {
    const raw = String(this.data.f3BaseInput || '').trim();
    const mm = this._parseF3HeightMmInput(raw);
    if (!Number.isFinite(mm) || mm < 10 || mm > 3000) {
      this._showCustomToast('检测高度请输入 10–3000 mm', 'none', 2000);
      return;
    }
    this._f3ManualHeightWrite('base', mm);
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

    const settingsPatch = {
      showSettingsModal: true,
      hasShownSettingsIndicatorModal: false,
      delayPowerOffIndex,
      settingsModalCompact: !(isF2UltraFirmwareModel(model) || isF3MaxModel(model))
    };
    if (modelUsesSettingClickOnly(model)) {
      settingsPatch.settingState = buildNeutralSettingState();
      this._bleVerifyPending = null;
      this._bleVerifyExpireAt = 0;
      if (this.data.showSettingSendingModal) {
        this.setData({ showSettingSendingModal: false, settingSendingModalClosing: false });
      }
    }
    if (isF3MaxModel(model)) {
      settingsPatch.f3HeightConfigLocked = false;
    }
    if (isMtUltraCardModel(model) && !isF3MaxModel(model)) {
      let travelHoldIndex = 2;
      let travelDurationIndex = 2;
      try {
        const storedHold = wx.getStorageSync('f2_travel_hold_min');
        if (Number.isFinite(Number(storedHold))) {
          travelHoldIndex = f2TravelHoldIndexByMin(Number(storedHold));
        }
        const storedDur = wx.getStorageSync('f2_travel_duration_hours');
        if (Number.isFinite(Number(storedDur))) {
          travelDurationIndex = f2TravelDurationIndexByHours(Number(storedDur));
        }
      } catch (e) { /* ignore */ }
      const holdMin = F2_TRAVEL_HOLD_OPTIONS[travelHoldIndex].minutes;
      const durH = F2_TRAVEL_DURATION_OPTIONS[travelDurationIndex].hours;
      Object.assign(settingsPatch, {
        travelHoldIndex,
        travelDurationIndex,
        travelHoldMin: holdMin,
        travelDurationHours: durH,
        travelModeTip: buildTravelModeTip(holdMin, durH, this.data.f2TravelModeOn)
      });
    }
    this.setData(settingsPatch, () => {
      this._primeSettingsReadbackOnOpen(model);
    });
    this.showToast();
  },

  /** 打开高级设置时，用最近一次状态包强制刷新滑块与 F3 测高回读 */
  _primeSettingsReadbackOnOpen(model) {
    if (!modelSupportsSettingBleVerify(model)) return;
    this._f2ForceStatusSyncPending = true;
    this._f2AdvSyncPending = true;
    if (this._f2LastStatusParsed) {
      this._syncF2StatusFromPacket(this._f2LastStatusParsed);
    }
  },

  onDelayPowerOffChange(e) {
    if (this.data.f2TravelModeOn) {
      this._showCustomToast('出行模式已开启，请先关闭出行模式', 'none', 2200);
      return;
    }
    const model = this.data.currentModel;
    if (!isF2MaxDelayPowerModel(model)) return;
    if (!this._ensureBleControlReady()) {
      return;
    }

    const idx = Number(e.detail.value);
    const opt = this.data.delayPowerOffOptions[idx];
    if (!opt) return;

    const sendText = `延时断电${opt.minutes}`;
    wx.setStorageSync('f2_delayPowerOffIndex', idx);
    wx.setStorageSync('f2_delayPowerOffMinutes', opt.minutes);
    this.setData({ delayPowerOffIndex: idx }, () => {
      console.log(`📤 [蓝牙] F2 ULTRA 设置延时断电: ${sendText}`);
      this._commitMagSettingBleAfterUi({
        sendText,
        verify: isMtUltraCardModel(model) ? {
          type: 'delayPower',
          minutes: opt.minutes,
          successText: `延时断电已设为${opt.label}`
        } : null,
        label: '延时断电'
      });
    });
    wx.vibrateShort({ type: 'light' });
  },

  onTravelHoldChange(e) {
    const model = this.data.currentModel;
    if (!isMtUltraCardModel(model)) return;
    if (!this._ensureBleControlReady()) {
      return;
    }
    const idx = Number(e.detail.value);
    const opt = this.data.travelHoldOptions[idx];
    if (!opt) return;
    const sendText = `出行保持${opt.minutes}`;
    const durH = this.data.travelDurationHours || 12;
    wx.setStorageSync('f2_travel_hold_min', opt.minutes);
    this.setData({
      travelHoldIndex: idx,
      travelHoldMin: opt.minutes,
      travelModeTip: buildTravelModeTip(opt.minutes, durH, this.data.f2TravelModeOn)
    }, () => {
      this._commitMagSettingBleAfterUi({
        sendText,
        verify: null,
        label: '出行保持'
      });
    });
    wx.vibrateShort({ type: 'light' });
  },

  onTravelDurationChange(e) {
    const model = this.data.currentModel;
    if (!isMtUltraCardModel(model)) return;
    if (!this._ensureBleControlReady()) {
      return;
    }
    const idx = Number(e.detail.value);
    const opt = this.data.travelDurationOptions[idx];
    if (!opt) return;
    const sendText = `出行时长${opt.hours}`;
    const holdMin = this.data.travelHoldMin || 3;
    wx.setStorageSync('f2_travel_duration_hours', opt.hours);
    this.setData({
      travelDurationIndex: idx,
      travelDurationHours: opt.hours,
      travelModeTip: buildTravelModeTip(holdMin, opt.hours, this.data.f2TravelModeOn)
    }, () => {
      this._commitMagSettingBleAfterUi({
        sendText,
        verify: null,
        label: '出行时长'
      });
    });
    wx.vibrateShort({ type: 'light' });
  },

  onTravelKeyOffChange(e) {
    const model = this.data.currentModel;
    if (!isMtUltraCardModel(model)) return;
    if (!this._ensureBleControlReady()) {
      return;
    }
    const idx = Number(e.detail.value);
    const opt = (this.data.travelKeyOffOptions || F2_TRAVEL_KEYOFF_OPTIONS)[idx];
    if (!opt) return;
    const holdMin = this.data.travelHoldMin || 3;
    const durH = this.data.travelDurationHours || 12;
    wx.setStorageSync('f2_travel_keyoff_retract', opt.retract ? 1 : 0);
    this.setData({
      travelKeyOffIndex: idx,
      travelModeTip: buildTravelModeTip(holdMin, durH, this.data.f2TravelModeOn, opt.retract)
    }, () => {
      this._commitMagSettingBleAfterUi({
        sendText: opt.cmd,
        verify: null,
        label: '出行关钥匙'
      });
    });
    wx.vibrateShort({ type: 'light' });
  },

  closeSettings() {
    const patch = { showSettingsModal: false, toastClass: '' };
    // 无回读机型：关闭后滑块回中，下次打开必定是中间态
    if (modelUsesSettingClickOnly(this.data.currentModel)) {
      patch.settingState = buildNeutralSettingState();
    }
    this.setData(patch);
  },

  // 🔴 新增：确认发送数据（指示灯确认弹窗）
  confirmSendData() {
    if (!this.data.pendingSendData) {
      console.warn('⚠️ [蓝牙] 没有待发送的数据');
      return;
    }

    const { type, sendText, key, targetVal, label } = this.data.pendingSendData;
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

      if (type === 'adjust') {
        this._foldAdjustActive = true;
        this._commitBleCommandAfterUi({
          sendText,
          times: 1,
          interval: 300,
          verify: null,
          label: '折叠调整'
        });
      } else if (type === 'settings') {
        const modelName = label || (isMtUltraCardModel(currentModel)
          ? mtUltraCardLabel(currentModel)
          : (isF2Ble
            ? (isF2LongType(currentModel.type) ? 'F2 Long' : 'F2 MAX')
            : 'F1 MAX'));
        if (isMtUltraCardModel(currentModel)) {
          this._commitMagSettingBleAfterUi({
            sendText,
            verify: this._buildSettingBleVerify(key, targetVal),
            label: modelName
          });
        } else {
          console.log(`📤 [蓝牙] ${modelName} 发送「${sendText}」`);
          this._sendMagSettingBle(sendText);
          wx.vibrateShort({ type: 'light' });
        }
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
    const targetVal = e.currentTarget.dataset.val;

    if (!key || !targetVal) return;

    const currentModel = this.data.currentModel;
    const prevVal = this.data.settingState && this.data.settingState[key];
    
    // 允许重复发送，但增加时间间隔限制防止连点
    if (prevVal === targetVal) {
      const now = Date.now();
      const lastSendKey = `_lastMagSend_${key}_${targetVal}`;
      const lastSendTime = this[lastSendKey] || 0;
      
      // 2秒内不允许重复发送相同设置
      if (now - lastSendTime < 2000) {
        console.log(`⚠️ [高级设置] ${key}=${targetVal} 发送间隔过短，已忽略`);
        return;
      }
      
      console.log(`🔄 [高级设置] 允许重发 ${key}=${targetVal}`);
      this[lastSendKey] = now;
    }

    const clickOnly = modelUsesSettingClickOnly(currentModel);
    const isMtUltra = isMtUltraCardModel(currentModel);
    const newState = { ...this.data.settingState, [key]: targetVal };

    const stealthUi = isMtUltra
      ? buildF2StealthUiFlags(
        currentModel,
        newState,
        resolveF2BleLinkedForUi({ ...this.data, settingState: newState })
      )
      : {};

    const sendText = this._resolveMagSettingSendText(key, targetVal, currentModel);
    const sendLabel = isMtUltra
      ? mtUltraCardLabel(currentModel)
      : (currentModel && currentModel.name === 'F2'
        ? (isF2LongType(currentModel.type) ? 'F2 Long' : (currentModel.type === 'Pro' ? 'F2 PRO' : 'F2 MAX'))
        : (currentModel && currentModel.name === 'F1'
          ? (currentModel.type === 'Pro' ? 'F1 PRO' : 'F1 MAX')
          : ''));

    if (!isMtUltra && !this.data.hasShownSettingsIndicatorModal && sendText) {
      this.setData({
        settingState: newState,
        ...stealthUi,
        hasShownSettingsIndicatorModal: true,
        showIndicatorCheckModal: true,
        indicatorCheckModalClosing: false,
        pendingSendData: {
          type: 'settings',
          sendText,
          key,
          targetVal,
          label: sendLabel
        }
      });
      return;
    }

    const enablingPowerOffLock = key === 'powerOffLock'
      && targetVal === 'left'
      && prevVal !== 'left'
      && isF3MaxModel(currentModel);

    const afterUiReady = () => {
      if (!sendText) return;
      if (clickOnly) {
        console.log(`📤 [蓝牙] ${sendLabel} 发送「${sendText}」`);
        this._sendMagSettingBle(sendText);
        wx.vibrateShort({ type: 'light' });
        console.log(`Setting ${key} set to: ${targetVal}`);
        return;
      }
      if (isMtUltra) {
        this._queueMagSettingSend(sendText, key, targetVal, sendLabel);
      }
      if (enablingPowerOffLock) {
        this._showPowerOffLockGuide(1);
      }
      wx.vibrateShort({ type: 'light' });
      console.log(`Setting ${key} set to: ${targetVal}`);
    };

    this.setData({ settingState: newState, ...stealthUi }, () => {
      if (isMtUltra) {
        try {
          wx.setStorageSync('f2_ultra_adv_settingState', newState);
        } catch (e) { /* ignore */ }
      }
      afterUiReady();
    });
  },

  _showPowerOffLockGuide(step) {
    this.setData({ powerOffLockGuideStep: step === 2 ? 2 : 1 });
    startGuideBtnCountdown(this, {
      lockedKey: 'powerOffLockGuideBtnLocked',
      textKey: 'powerOffLockGuideBtnText',
      readyText: '我知道了',
      timerProp: '_powerOffLockGuideBtnTimer'
    });
  },

  onPowerOffLockGuideConfirm() {
    if (this.data.powerOffLockGuideBtnLocked) return;
    if (this.data.powerOffLockGuideStep === 1) {
      this._showPowerOffLockGuide(2);
      return;
    }
    clearGuideBtnCountdown(this, '_powerOffLockGuideBtnTimer');
    this.setData({ powerOffLockGuideStep: 0 });
  },

  // 【新增】打开全新产品提示 & 开始倒计时
  openNewProductHint() {
    this.setData({ showNewProductHint: true });
    startGuideBtnCountdown(this, {
      lockedKey: 'newProductBtnLocked',
      textKey: 'newProductBtnText',
      readyText: '知道了',
      timerProp: '_newProductBtnTimer'
    });
  },

  // 【新增】关闭全新产品提示
  closeNewProductHint() {
    if (this.data.newProductBtnLocked) return; // 锁定中不可点
    this.setData({ showNewProductHint: false });
    // 🔴 记录到本地存储，表示已经弹过，下次不再弹
    wx.setStorageSync('hasShownNewProductHint_F1', true);
  },

  _maybeShowCalSettingsGuide(model) {
    const debugUserFlow = require('../../../utils/debugUserFlow.js');
    if (this.data.isAdmin && !debugUserFlow.shouldForceUserGuides()) return;
    if (!modelNeedsOnboardingGuide(model)) return;
    if (hasScanBleConnectedOnce()) return;
    this._startCalSettingsGuide(model, false);
  },

  _markScanBleConnectedOnce() {
    if (hasScanBleConnectedOnce()) {
      if (this.data.showCalSettingsGuide) {
        this.closeCalSettingsGuide(false);
      }
      return;
    }
    markScanBleConnectedOnceStorage();
    if (this.data.showCalSettingsGuide) {
      this.closeCalSettingsGuide(false);
    }
  },

  /** 控制台内部卡片右上角「教程」 */
  openDetailUsageTutorial() {
    if (this._isRemoteAssistUserLocked()) return;
    const currentModel = this.data.currentModel;
    if (!currentModel || currentModel.canLearn || !modelNeedsOnboardingGuide(currentModel)) return;
    this._startCalSettingsGuide(currentModel, true);
  },

  /** 卡片「使用教程」或首次进入：进入控制台后展示分步功能引导 */
  openUsageTutorial(e) {
    if (this._isRemoteAssistUserLocked()) return;
    const index = parseInt(e.currentTarget.dataset.index, 10);
    const currentModel = this.data.models[index];
    if (!currentModel || currentModel.canLearn || !modelNeedsOnboardingGuide(currentModel)) return;

    const openGuide = () => {
      this._startCalSettingsGuide(this.data.currentModel || currentModel, true);
    };

    if (this.data.showDetail &&
        this.data.currentModel &&
        this.data.currentModel.name === currentModel.name &&
        this.data.currentModel.type === currentModel.type &&
        this.data.detailMode === 'main') {
      openGuide();
      return;
    }

    this.updateCardStatus(index);
    if (this.data.isConnected && isF2MaxStatusBleModel(currentModel)) {
      this._bleSessionModel = currentModel;
    }
    const detailPatch = {
      currentModel,
      angleBtnText: resolveOpenAngleBtnText(currentModel)
    };
    if (modelUsesSettingClickOnly(currentModel)) {
      detailPatch.settingState = buildNeutralSettingState();
    }
    this._openDetailAnimated(detailPatch, () => {
      if (this.data.isConnected) {
        this._ensureF2StatusBleListener(true);
      }
      openGuide();
    });
  },

  _startCalSettingsGuide(model, forceReplay) {
    // 管理员进控制台不自动播功能引导（手动点「教程」仍可用 forceReplay）
    if (this.data.isAdmin && !forceReplay) return;
    if (!modelNeedsOnboardingGuide(model)) return;
    if (this.data.showCalSettingsGuide) return;
    if (this.data.showAngleHint || this.data.showNewProductHint) return;
    if (this._calSettingsGuideStartTimer) {
      clearTimeout(this._calSettingsGuideStartTimer);
      this._calSettingsGuideStartTimer = null;
    }
    this._calSettingsGuideForceReplay = !!forceReplay;
    const targetName = model.name;
    const targetType = model.type;
    this._calSettingsGuideStartTimer = setTimeout(() => {
      this._calSettingsGuideStartTimer = null;
      const cur = this.data.currentModel;
      if (!this.data.showDetail || this.data.detailMode !== 'main' || !cur) return;
      if (cur.name !== targetName || cur.type !== targetType) return;
      if (!modelNeedsOnboardingGuide(cur)) return;
      this._onboardingGuideSteps = buildOnboardingGuideSteps(cur);
      // 重置滚动，避免进入控制台后手动滑动导致折叠/打开角度教学错位
      this.setData({ mainControlScrollTop: 0, mainControlScrollAnim: false }, () => {
        wx.nextTick(() => this._showCalGuideStep(1));
      });
    }, 80);
  },

  onMainControlScrollStart() {
    this._markMainControlScrolling();
  },

  onMainControlScrollDragging() {
    this._markMainControlScrolling();
  },

  onMainControlScrollEnd() {
    this._scheduleMainControlScrollIdle();
  },

  _markMainControlScrolling() {
    this._mainControlScrolling = true;
    if (this._mainControlScrollIdleTimer) {
      clearTimeout(this._mainControlScrollIdleTimer);
      this._mainControlScrollIdleTimer = null;
    }
    if (!this.data.mainControlScrolling) {
      this.setData({ mainControlScrolling: true });
    }
  },

  _scheduleMainControlScrollIdle() {
    if (this._mainControlScrollIdleTimer) {
      clearTimeout(this._mainControlScrollIdleTimer);
    }
    this._mainControlScrollIdleTimer = setTimeout(() => {
      this._mainControlScrollIdleTimer = null;
      this._mainControlScrolling = false;
      const patch = {};
      if (this.data.mainControlScrolling) patch.mainControlScrolling = false;
      if (Object.keys(patch).length) {
        this.setData(patch, () => this._flushPendingBleUiPatch());
      } else {
        this._flushPendingBleUiPatch();
      }
    }, 140);
  },

  _clearMainControlScrollIdle() {
    if (this._mainControlScrollIdleTimer) {
      clearTimeout(this._mainControlScrollIdleTimer);
      this._mainControlScrollIdleTimer = null;
    }
    this._mainControlScrolling = false;
    if (this.data.mainControlScrolling) {
      this.setData({ mainControlScrolling: false });
    }
  },

  _flushPendingBleUiPatch(silent) {
    const pending = this._pendingBleUiPatch;
    if (!pending || !Object.keys(pending).length) {
      this._pendingBleUiPatch = null;
      return;
    }
    this._pendingBleUiPatch = null;
    if (silent) {
      try {
        this.setData(pending);
      } catch (e) { /* ignore */ }
      return;
    }
    this.setData(pending, () => {
      this._ensureFlapGaugeRestVisual();
    });
  },

  _prepareCalGuideStepUI(step) {
    if (!step || step.controlPanelOpen === undefined) {
      return Promise.resolve();
    }
    const wantOpen = !!step.controlPanelOpen;
    if (!!this.data.f2ControlPanelOpen === wantOpen) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.setData({ f2ControlPanelOpen: wantOpen }, () => {
        const delay = wantOpen ? 220 : 80;
        setTimeout(resolve, delay);
      });
    });
  },

  _showCalGuideStep(stepIndex) {
    const steps = this._onboardingGuideSteps || [];
    const step = steps[stepIndex - 1];
    if (!step) return;
    const isFirstShow = !this.data.showCalSettingsGuide;
    const reveal = () => {
      this._renderCalGuideBubble(stepIndex, step, 0);
    };
    const afterUiReady = () => {
      if (isFirstShow) {
        this._scrollMainControlToGuideAnchor(step.anchor, reveal, step.scrollCenterRatio);
        return;
      }
      this.setData({ showCalSettingsGuide: false }, () => {
        this._scrollMainControlToGuideAnchor(step.anchor, reveal, step.scrollCenterRatio);
      });
    };
    this._prepareCalGuideStepUI(step).then(afterUiReady);
  },

  _scrollMainControlToGuideAnchor(anchorSel, done, scrollCenterRatio) {
    const query = wx.createSelectorQuery().in(this);
    query.select('#mainControlGuideScroll').boundingClientRect();
    query.select('#mainControlGuideScroll').scrollOffset();
    query.select('#mainControlGuideScroll .main-control-scroll-inner').boundingClientRect();
    query.select(anchorSel).boundingClientRect();
    query.exec((res) => {
      const svRect = res && res[0];
      const scrollOff = res && res[1];
      const innerRect = res && res[2];
      const anchorRect = res && res[3];
      if (!svRect || !anchorRect || !anchorRect.height) {
        if (typeof done === 'function') done();
        return;
      }
      let winH = 667;
      try {
        const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
        winH = (win && win.windowHeight) || 667;
      } catch (e) { /* ignore */ }

      const currentScrollTop = (scrollOff && scrollOff.scrollTop) || 0;
      const contentH = (innerRect && innerRect.height) || 0;
      const maxScroll = Math.max(0, contentH - svRect.height);
      const centerRatio = Number(scrollCenterRatio);
      const targetCenterY = winH * (Number.isFinite(centerRatio) ? centerRatio : 0.58);
      const anchorCenterY = anchorRect.top + anchorRect.height / 2;
      let nextScrollTop = currentScrollTop + (anchorCenterY - targetCenterY);
      if (nextScrollTop < 0) nextScrollTop = 0;
      if (nextScrollTop > maxScroll) nextScrollTop = maxScroll;

      const prevTop = this.data.mainControlScrollTop || 0;
      const finish = () => {
        setTimeout(() => {
          if (typeof done === 'function') done();
        }, Math.abs(nextScrollTop - prevTop) < 1 ? 60 : 280);
      };
      if (Math.abs(nextScrollTop - prevTop) < 1) {
        finish();
        return;
      }
      const kickTop = prevTop === nextScrollTop ? Math.max(0, nextScrollTop - 1) : prevTop;
      this.setData({ mainControlScrollTop: kickTop, mainControlScrollAnim: true }, () => {
        wx.nextTick(() => {
          this.setData({ mainControlScrollTop: nextScrollTop }, () => {
            setTimeout(() => {
              if (this.data.mainControlScrollAnim) {
                this.setData({ mainControlScrollAnim: false });
              }
            }, 320);
            finish();
          });
        });
      });
    });
  },

  _renderCalGuideBubble(stepIndex, step, retryCount) {
    const steps = this._onboardingGuideSteps || [];
    const targetSel = step.anchor;
    const retry = Number(retryCount) || 0;
    const query = wx.createSelectorQuery().in(this);
    query.select(targetSel).boundingClientRect();
    query.exec((res) => {
      const rect = res && res[0];
      const isLast = stepIndex >= steps.length;
      const readyText = isLast ? '知道了' : '下一步';
      const contentPatch = {
        showCalSettingsGuide: true,
        calSettingsGuideStep: stepIndex,
        calGuideStepTag: step.tag,
        calGuideTitle: step.title,
        calGuideDesc: step.desc,
        calGuideBtnText: readyText,
        calGuideBtnLocked: true
      };
      if (!rect || !rect.width) {
        if (retry < 3) {
          setTimeout(() => {
            this._renderCalGuideBubble(stepIndex, step, retry + 1);
          }, 180);
          return;
        }
        this.setData({
          ...contentPatch,
          calGuideArrowDir: 'none',
          calGuideBubbleStyle: 'left:50%; top:50%; transform:translate(-50%,-50%); width:520rpx;',
          calGuideArrowStyle: 'display:none;',
          calGuideSpotStyle: 'display:none;'
        }, () => this._armCalGuideBtnLock(readyText));
        return;
      }
      let win = null;
      try {
        win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      } catch (e) {
        win = wx.getSystemInfoSync();
      }
      const winW = (win && win.windowWidth) || 375;
      const winH = (win && win.windowHeight) || 667;
      const pxToRpx = 750 / winW;

      const spotPadPx = 6;
      const spotLeft = (rect.left - spotPadPx) * pxToRpx;
      const spotTop = (rect.top - spotPadPx) * pxToRpx;
      const spotW = (rect.width + spotPadPx * 2) * pxToRpx;
      const spotH = (rect.height + spotPadPx * 2) * pxToRpx;
      const calGuideSpotStyle = `left:${spotLeft}rpx; top:${spotTop}rpx; width:${spotW}rpx; height:${spotH}rpx;`;

      const bubbleWidthRpx = 480;
      const marginRpx = 24;
      const centerXrpx = (rect.left + rect.width / 2) * pxToRpx;
      let bubbleLeftRpx = centerXrpx - bubbleWidthRpx / 2;
      if (bubbleLeftRpx < marginRpx) bubbleLeftRpx = marginRpx;
      if (bubbleLeftRpx + bubbleWidthRpx > 750 - marginRpx) {
        bubbleLeftRpx = 750 - marginRpx - bubbleWidthRpx;
      }
      const arrowLeftRpx = centerXrpx - bubbleLeftRpx;
      const gapRpx = 22;

      const placeAbove = rect.top > winH * 0.4;
      let bubbleStyle = '';
      let arrowDir = 'down';
      if (placeAbove) {
        const bottomRpx = (winH - rect.top) * pxToRpx + gapRpx;
        bubbleStyle = `left:${bubbleLeftRpx}rpx; bottom:${bottomRpx}rpx; width:${bubbleWidthRpx}rpx;`;
        arrowDir = 'down';
      } else {
        const topRpx = (rect.top + rect.height) * pxToRpx + gapRpx;
        bubbleStyle = `left:${bubbleLeftRpx}rpx; top:${topRpx}rpx; width:${bubbleWidthRpx}rpx;`;
        arrowDir = 'up';
      }

      this.setData({
        ...contentPatch,
        calGuideArrowDir: arrowDir,
        calGuideBubbleStyle: bubbleStyle,
        calGuideArrowStyle: `left:${arrowLeftRpx}rpx;`,
        calGuideSpotStyle
      }, () => this._armCalGuideBtnLock(readyText));
    });
  },

  calSettingsGuideNext() {
    if (this.data.calGuideBtnLocked) return;
    const steps = this._onboardingGuideSteps || [];
    const cur = this.data.calSettingsGuideStep;
    if (cur < steps.length) {
      this._showCalGuideStep(cur + 1);
      return;
    }
    this.closeCalSettingsGuide();
  },

  closeCalSettingsGuide(_markDone = true) {
    this._calSettingsGuideForceReplay = false;
    clearGuideBtnCountdown(this, '_calGuideBtnTimer');
    if (this._calSettingsGuideStartTimer) {
      clearTimeout(this._calSettingsGuideStartTimer);
      this._calSettingsGuideStartTimer = null;
    }
    this._onboardingGuideSteps = null;
    this.setData({ showCalSettingsGuide: false });
  },

  _armCalGuideBtnLock(readyText) {
    // 控制中心功能引导：下一步不延时，立即可点
    clearGuideBtnCountdown(this, '_calGuideBtnTimer');
    this.setData({
      calGuideBtnLocked: false,
      calGuideBtnText: readyText || '下一步'
    });
  },

  // ===============================================
  // 🔴 所有弹窗的倒计时函数（统一 3 秒后可点）
  // ===============================================

  // 密码弹窗倒计时
  openPasswordModal() {
    // 管理员不弹密码、不弹折叠教学，直接进入编辑
    if (this.data.isAdmin) {
      if (!this.data.isAuthorized) {
        this.setData({ isAuthorized: true });
      }
      this._enterFoldEditWithoutTutorial();
      return;
    }

    this.setData({
      showPasswordModal: true,
      passwordInput: ''
    });
    startGuideBtnCountdown(this, {
      lockedKey: 'passwordBtnLocked',
      textKey: 'passwordBtnText',
      readyText: '确认',
      timerProp: '_passwordBtnTimer'
    });
  },

  // 教程弹窗倒计时
  startTutorialCountdown() {
    startGuideBtnCountdown(this, {
      lockedKey: 'tutorialBtnLocked',
      textKey: 'tutorialBtnText',
      readyText: '知道了',
      timerProp: '_tutorialBtnTimer'
    });
  },

  // 关钥匙 / 重启车子弹窗倒计时
  startKeyCountdown() {
    startGuideBtnCountdown(this, {
      lockedKey: 'keyBtnLocked',
      textKey: 'keyBtnText',
      readyText: '我已重启',
      timerProp: '_keyBtnTimer'
    });
  },

  // 打开角度提示弹窗倒计时
  startAngleHintCountdown() {
    startGuideBtnCountdown(this, {
      lockedKey: 'angleHintBtnLocked',
      textKey: 'angleHintBtnText',
      readyText: '知道了',
      timerProp: '_angleHintBtnTimer'
    });
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

      if (this._ensureBleControlReady()) {
        this._foldAdjustActive = true;
        console.log('📤 [折叠角度] 上滑调整：全机型发送「调整折叠角度」');
        this.sendDataMultiple('调整折叠角度', 1, 300);
      }
      
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

  /** F3 测高配置模式中固件会丢弃翻板/高级指令，发翻板前先 M0# 退出 */
  _f3EnsureFlapControlReady(done) {
    if (!isF3MaxModel(this.data.currentModel)) {
      if (typeof done === 'function') done();
      return;
    }
    if (!this.data.f3HeightConfigModeOn) {
      if (typeof done === 'function') done();
      return;
    }
    console.log('[F3] 翻板控制前退出测高配置模式 (M0#)');
    this.setData({ f3HeightConfigModeOn: false });
    this._f3CfgReadyAt = 0;
    this._f3HeightCfgLocalUntil = 0;
    this._clearBleSendQueue();
    this._f3EnqueueHeightCmdChars('M0');
    setTimeout(() => {
      if (typeof done === 'function') done();
    }, 600);
  },

  _isBleWriteReady() {
    const ble = this.ble;
    if (!ble || !ble.device || !ble.serviceId) return false;
    if (!this._isBleLinked()) return false;
    return !!this._getBleWriteCharacteristicId();
  },

  writeBleDataPromise(arrayBuffer) {
    const ble = this.ble;
    const charId = this._getBleWriteCharacteristicId();
    if (!ble || !ble.device || !ble.serviceId || !charId) {
      this._f3HeightLog('BLE写出跳过', { reason: '未就绪', charId });
      return Promise.resolve(false);
    }
    const meta = this._bleSendMeta || null;
    return new Promise((resolve) => {
      wx.writeBLECharacteristicValue({
        deviceId: ble.device.deviceId,
        serviceId: ble.serviceId,
        characteristicId: charId,
        value: arrayBuffer,
        success: () => {
          if (meta && meta.f3HeightChar) {
            this._f3HeightLog('BLE字写出OK', {
              ch: meta.text,
              idx: meta.f3HeightIdx,
              total: meta.f3HeightTotal,
              charId
            });
          }
          resolve(true);
        },
        fail: (err) => {
          this._f3HeightLog('BLE写出失败', {
            errMsg: err && err.errMsg,
            charId,
            meta
          });
          resolve(false);
        }
      });
    });
  },

  _buildSettingBleVerify(key, targetVal) {
    if (!key || !targetVal) return null;
    const model = this.data.currentModel;
    if (!modelSupportsSettingBleVerify(model)) return null;
    // F3 MAX 默认 F3_FLASH_TIGHT：状态包不含 |STB:|，无法回读「隐蔽模式退出」
    // 仍发送「允许/禁止按钮退出」，但跳过校验，避免误报「数据发送不成功」
    if (isF3MaxModel(model) && key === 'stealthBtnExit') return null;
    return {
      type: 'setting',
      key,
      targetVal,
      isMtUltra: isMtUltraCardModel(model),
      successText: buildSettingChangeResultText(model, key, targetVal)
    };
  },

  /** 校验等待期间，不让设备回读覆盖用户刚点的 UI */
  _stripConflictingBleReadback(updates) {
    if (this._bleVerifyPending && this._bleVerifyExpireAt && Date.now() > this._bleVerifyExpireAt) {
      this._failSettingBleVerify();
    }
    const heightPending = this._f3HeightWritePending;
    if (heightPending && updates && Date.now() < heightPending.expire) {
      const mmKey = heightPending.kind === 'danger' ? 'f3DangerMm' : 'f3BaseMm';
      const rbKey = heightPending.kind === 'danger' ? 'f3DangerReadback' : 'f3BaseReadback';
      const incoming = updates[mmKey];
      this._f3HeightLog('回读校验', {
        kind: heightPending.kind,
        expect: heightPending.units,
        incoming,
        mmKey,
        dga: updates.f3DangerMm,
        dgb: updates.f3BaseMm,
        leftMs: heightPending.expire - Date.now()
      });
      if (incoming !== undefined && incoming !== null && Math.round(Number(incoming)) === heightPending.units) {
        this._f3HeightLog('回读成功', { kind: heightPending.kind, mm: heightPending.units });
        const onAck = heightPending.onAck;
        this._f3HeightWritePending = null;
        this._f3HeightSendLockUntil = 0;
        if (typeof onAck === 'function') onAck();
      } else if (incoming !== undefined) {
        this._f3HeightLog('回读不匹配', { expect: heightPending.units, incoming });
        delete updates[mmKey];
        delete updates[rbKey];
      }
    } else if (heightPending && Date.now() >= heightPending.expire) {
      this._f3HeightLog('回读超时', {
        kind: heightPending.kind,
        expect: heightPending.units,
        uiDanger: this.data.f3DangerMm,
        uiBase: this.data.f3BaseMm
      });
      const onFail = heightPending.onFail;
      this._f3HeightWritePending = null;
      this._f3HeightSendLockUntil = 0;
      if (typeof onFail === 'function') onFail();
    }
    if (!this._bleVerifyPending || !updates) return updates;
    const verify = this._bleVerifyPending;
    if (verify.type === 'setting') {
      delete updates.settingState;
      if (verify.key === 'travelMode') {
        delete updates.f2TravelModeOn;
        delete updates.delayPowerOffTip;
        delete updates.travelModeTip;
        delete updates.f2TravelReadbackText;
      }
      if (verify.key === 'shutdown' || verify.key === 'faultDetect' || verify.key === 'selfRepair'
        || verify.key === 'powerOn'
        || verify.key === 'smoothMode' || verify.key === 'stealthBtnExit'
      || verify.key === 'powerOffLock'
      || verify.key === 'bootPinDetect'
      || verify.key === 'multiRetry'
        || verify.key === 'heightMon') {
        delete updates.f2TravelReadbackText;
        delete updates.f2DelayPowerReadbackText;
        delete updates.f3PowerOffLockReadbackText;
      }
    }
    if (verify.type === 'speed') {
      delete updates.f2ServoSpeed;
    }
    if (verify.type === 'delayPower') {
      delete updates.delayPowerOffIndex;
      delete updates.f2DelayPowerReadbackText;
    }
    if (verify.type === 'flap') {
      delete updates.flapPanelState;
      delete updates.flapPanelStateText;
      delete updates.flapMotionDir;
    }
    return updates;
  },

  /** UI 已更新后再发 BLE；带 verify 的设置类指令走快速单发 */
  _commitBleCommandAfterUi(intent) {
    if (!intent || !intent.sendText) return;
    if (intent.verify || intent.quick) {
      this._commitMagSettingBleAfterUi(intent);
      return;
    }
    this._pendingBleIntent = {
      sendText: intent.sendText,
      times: intent.times != null ? intent.times : 3,
      interval: intent.interval != null ? intent.interval : 500,
      verify: intent.verify || null,
      label: intent.label || ''
    };
    const isAdminRelay = this._isRemoteAssistAdminRelay();
    this._bleVerifyRetryCount = 0;
    if (!this._ensureBleControlReady()) {
      return;
    }
    const ultra = isMtUltraCardModel(this.data.currentModel);
    this._bleVerifyPending = !isAdminRelay && ultra && intent.verify ? intent.verify : null;
    this._bleVerifyExpireAt = this._bleVerifyPending ? Date.now() + SETTINGS_BLE_VERIFY_TIMEOUT_MS : 0;
    const { sendText, times, interval, label } = this._pendingBleIntent;
    console.log(`📤 [蓝牙] ${label} 发送「${sendText}」×${times}`);
    this.sendDataMultiple(sendText, times, interval);
  },

  _flushPendingBleIntent() {
    const intent = this._pendingBleIntent;
    if (!intent || !intent.sendText) return;
    if (!this._canControlDevice()) return;
    console.log('📤 [蓝牙] 重连后补发', intent.sendText);
    this._bleVerifyRetryCount = 0;
    const ultra = isMtUltraCardModel(this.data.currentModel);
    this._bleVerifyPending = ultra && intent.verify ? intent.verify : null;
    this._bleVerifyExpireAt = this._bleVerifyPending ? Date.now() + SETTINGS_BLE_VERIFY_TIMEOUT_MS : 0;
    this.sendDataMultiple(intent.sendText, intent.times || 3, intent.interval || 500);
  },

  _isFlapBleCmd(text) {
    const s = String(text || '').replace(/#$/, '');
    return s === '打开' || s === '关闭';
  },

  _prunePendingFlapBleQueue() {
    if (!this._bleSendQueue || !this._bleSendQueue.length) return;
    this._bleSendQueue = this._bleSendQueue.filter((item) => !this._isFlapBleCmd(item.text));
  },

  _abortFlapBleVerify() {
    this._clearF3FlapSendLoop();
    if (!this._bleVerifyPending && !this.data.showSettingSendingModal) return;
    this._bleVerifyPending = null;
    this._pendingBleIntent = null;
    this._bleVerifyRetryCount = 0;
    this._bleVerifyExpireAt = 0;
    this._f2ForceStatusSyncPending = true;
    this._clearSettingSendingWatch(true);
  },

  _failSettingBleVerify() {
    const hadPending = !!this._bleVerifyPending;
    const modalVisible = !!this.data.showSettingSendingModal;
    if (!hadPending && !modalVisible) return;
    this._bleVerifyPending = null;
    this._pendingBleIntent = null;
    this._bleVerifyRetryCount = 0;
    this._bleVerifyExpireAt = 0;
    this._f2ForceStatusSyncPending = true;
    this._clearSettingSendingWatch(true);
    if (hadPending || modalVisible) {
      this._showCustomToast('数据发送不成功', 'none', 2200);
    }
  },

  _isFaultReportMuted() {
    // 打开角度 / 折叠角度编辑：只动舵机，不弹故障、不处理测距/堵转提示
    return this.data.detailMode === 'edit';
  },

  _clearDeferredFaultReports() {
    this._deferredFaultWhileMuted = null;
  },

  _startSettingSendingWatch() {
    this._clearSettingSendingWatch(false);
    if (!this._bleVerifyPending) return;
    this._bleVerifyExpireAt = Date.now() + SETTINGS_BLE_VERIFY_TIMEOUT_MS;
    this._settingSendingModalTimer = setTimeout(() => {
      this._settingSendingModalTimer = null;
      if (this._bleVerifyPending) {
        this.setData({
          showSettingSendingModal: true,
          settingSendingModalClosing: false
        });
      }
    }, SETTINGS_SENDING_MODAL_DELAY_MS);
    this._settingSendingTimeoutTimer = setTimeout(() => {
      this._settingSendingTimeoutTimer = null;
      if (this._bleVerifyPending || this.data.showSettingSendingModal) {
        this._failSettingBleVerify();
      }
    }, SETTINGS_BLE_VERIFY_TIMEOUT_MS);
  },

  _clearSettingSendingWatch(dismissModal) {
    if (this._settingSendingModalTimer) {
      clearTimeout(this._settingSendingModalTimer);
      this._settingSendingModalTimer = null;
    }
    if (this._settingSendingTimeoutTimer) {
      clearTimeout(this._settingSendingTimeoutTimer);
      this._settingSendingTimeoutTimer = null;
    }
    if (dismissModal !== false) {
      this._dismissSettingSendingModal();
    }
  },

  _dismissSettingSendingModal() {
    if (this._settingSendingModalTimer) {
      clearTimeout(this._settingSendingModalTimer);
      this._settingSendingModalTimer = null;
    }
    if (this._settingSendingTimeoutTimer) {
      clearTimeout(this._settingSendingTimeoutTimer);
      this._settingSendingTimeoutTimer = null;
    }
    if (!this.data.showSettingSendingModal) return;
    this.setData({ settingSendingModalClosing: true });
    setTimeout(() => {
      this.setData({
        showSettingSendingModal: false,
        settingSendingModalClosing: false
      });
    }, 420);
  },

  _checkBleVerifyFromReadback(parsed) {
    if (!isF2MaxStatusBleModel(this.data.currentModel)) return;
    if (!this._bleVerifyPending || !parsed) return;
    if (packetMatchesBleVerify(parsed, this._bleVerifyPending)) {
      const successText = this._bleVerifyPending.successText;
      this._bleVerifyPending = null;
      this._bleVerifyRetryCount = 0;
      this._bleVerifyExpireAt = 0;
      this._clearSettingSendingWatch(true);
      if (successText) {
        this._showCustomToast(successText, 'success', 2200);
      }
      return;
    }
    // 期望字段尚未出现在本包（如 F3 省闪存无 STB）：只等后续包/超时，不立刻重发
    if (this._bleVerifyPending.type === 'setting'
      && this._bleVerifyPending.key === 'stealthBtnExit'
      && (parsed.stb == null)) {
      return;
    }
    const retries = this._bleVerifyRetryCount || 0;
    if (retries >= 2) {
      console.warn('📤 [蓝牙] 回读校验放弃，恢复设备状态');
      this._failSettingBleVerify();
      return;
    }
    this._bleVerifyRetryCount = retries + 1;
    const intent = this._pendingBleIntent;
    if (!intent || !this._canControlDevice()) return;
    console.warn(`📤 [蓝牙] 回读不一致，重发(${this._bleVerifyRetryCount}/2)`, intent.sendText);
    setTimeout(() => {
      if (this._canControlDevice() && this._pendingBleIntent === intent) {
        if (intent.verify) {
          this._sendMagSettingBle(intent.sendText);
        } else {
          this.sendDataMultiple(intent.sendText, intent.times || 3, intent.interval || 500);
        }
      }
    }, 500);
  },

  _resolveMagSettingSendText(key, targetVal, model) {
    if (!model || !key || !targetVal) return '';
    const isMtUltra = isMtUltraCardModel(model);
    const isF2Line = model.name === 'F2';
    const isF1ProMax = model.name === 'F1' && (model.type === 'Pro' || model.type === 'Max');

    if (isMtUltra) {
      return resolveMtUltraMagSettingSendText(key, targetVal, model);
    }

    if (isF2Line) {
      if (key === 'faultDetect') {
        return targetVal === 'left' ? '开启自检' : (targetVal === 'right' ? '关闭自检' : '');
      }
      if (key === 'powerOn') {
        return targetVal === 'left' ? '开机上翻' : (targetVal === 'right' ? '开机下翻' : '');
      }
      if (key === 'shutdown') {
        return targetVal === 'left' ? '打开收回' : (targetVal === 'right' ? '关闭收回' : '');
      }
    }
    if (isF1ProMax) {
      if (key === 'powerOn') {
        return targetVal === 'left' ? '开机上翻' : (targetVal === 'right' ? '开机下翻' : '');
      }
      if (key === 'shutdown') {
        return targetVal === 'left' ? '打开收回' : (targetVal === 'right' ? '关闭收回' : '');
      }
      if (key === 'selfRepair') {
        return targetVal === 'left' ? '开启自检' : (targetVal === 'right' ? '关闭自检' : '');
      }
    }
    return '';
  },

  _prunePendingMagSettingBleQueue() {
    if (!this._bleSendQueue || !this._bleSendQueue.length) return;
    this._bleSendQueue = this._bleSendQueue.filter((item) => !(item.meta && item.meta.quickSetting));
  },

  _sendMagSettingBle(sendText) {
    if (!sendText) return;
    if (this._isRemoteAssistAdminRelay()) {
      this._relayBleCommand(sendText, SETTINGS_BLE_SEND_TIMES, SETTINGS_BLE_SEND_GAP_MS);
      return;
    }
    if (!this._canSendBleCommand()) return;
    this._prunePendingMagSettingBleQueue();
    this._enqueueBleSend(sendText, SETTINGS_BLE_SEND_GAP_MS, { quickSetting: true });
  },

  _commitMagSettingBleAfterUi(intent) {
    if (!intent || !intent.sendText) return;
    this._pendingBleIntent = {
      sendText: intent.sendText,
      times: SETTINGS_BLE_SEND_TIMES,
      interval: SETTINGS_BLE_SEND_GAP_MS,
      verify: intent.verify || null,
      label: intent.label || '高级设置'
    };
    const isAdminRelay = this._isRemoteAssistAdminRelay();
    this._bleVerifyRetryCount = 0;
    if (!this._ensureBleControlReady()) {
      return;
    }
    const canVerifySetting = modelSupportsSettingBleVerify(this.data.currentModel);
    this._bleVerifyPending = !isAdminRelay && canVerifySetting && intent.verify ? intent.verify : null;
    this._bleVerifyExpireAt = this._bleVerifyPending ? Date.now() + SETTINGS_BLE_VERIFY_TIMEOUT_MS : 0;
    console.log(`📤 [蓝牙] ${this._pendingBleIntent.label} 发送「${intent.sendText}」`);
    this._sendMagSettingBle(intent.sendText);
    if (!isAdminRelay && this._bleVerifyPending) {
      this._startSettingSendingWatch();
    }
    wx.vibrateShort({ type: 'light' });
  },

  _queueMagSettingSend(sendText, key, targetVal, label) {
    if (!sendText) return;
    const verify = this._buildSettingBleVerify(key, targetVal);
    this._commitMagSettingBleAfterUi({
      sendText,
      verify,
      label: label || '高级设置'
    });
    // 无回读校验的设置项（如 F3 MAX 隐蔽退出方式）：发送后直接提示成功
    if (!verify && (key === 'stealthBtnExit' || key === 'multiRetry' || key === 'bootPinDetect') && isF3MaxModel(this.data.currentModel)) {
      const successText = buildSettingChangeResultText(this.data.currentModel, key, targetVal);
      if (successText) {
        setTimeout(() => {
          if (this._canControlDevice()) {
            this._showCustomToast(successText, 'success', 2200);
          }
          if (key === 'multiRetry') {
            const st = { ...this.data.settingState, multiRetry: 'right' };
            this.setData({ settingState: st });
          }
        }, 280);
      }
    }
  },

  _clearBleSendQueue() {
    this._f3CancelHeightCharTimers();
    this._bleSendQueue = [];
    this._bleSendDraining = false;
    this._f3HeightBleTxActive = false;
    this._onBleSendQueueIdle();
  },

  _enqueueBleSend(text, gapAfterMs = BLE_SEND_GAP_MS, meta) {
    if (!text) return;
    if (this._isRemoteAssistAdminRelay()) {
      this._relayBleCommand(text, 1, gapAfterMs != null ? gapAfterMs : BLE_SEND_GAP_MS);
      return;
    }
    let raw = String(text);
    if (this._isFlapBleCmd(raw)) {
      raw = raw.replace(/#$/, '');
      if (flapBleUsesHashSuffix(this.data.currentModel)) {
        raw += '#';
      }
    }
    if (/^(M[01]|DA|TB)/.test(raw) || raw === '#' || (meta && meta.f3HeightChar)) {
      this._f3HeightLog('入队', { text: raw, gapAfterMs, meta });
    }
    if (!this._bleSendQueue) this._bleSendQueue = [];
    this._bleSendQueue.push({ text: raw, gapAfterMs, meta: meta || null });
    this._drainBleSendQueue();
  },

  _enqueueBleSendBurst(text, count, gapAfterMs = BLE_ANGLE_STEP_GAP_MS) {
    if (this._isRemoteAssistAdminRelay()) {
      const n = Math.max(0, Number(count) || 0);
      if (n > 0) {
        this._relayBleCommand(text, n, gapAfterMs != null ? gapAfterMs : BLE_ANGLE_STEP_GAP_MS);
      }
      return;
    }
    const n = Math.max(0, Number(count) || 0);
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
        this._f3HeightLog('BLE队列暂停', { reason: '写入未就绪', left: (this._bleSendQueue && this._bleSendQueue.length) || 0 });
        this._bleSendDraining = false;
        setTimeout(() => this._drainBleSendQueue(), 300);
        return;
      }
      const item = this._bleSendQueue.shift();
      this._bleSendMeta = item.meta ? { ...item.meta, text: item.text } : { text: item.text };
      const arrayBuffer = this.stringToArrayBuffer(item.text);
      if (this._f3HeightBleTxActive || (item.text && item.text.length <= 3)) {
        this._f3HeightLog('BLE队列弹出', {
          text: item.text,
          left: this._bleSendQueue.length,
          gap: item.gapAfterMs
        });
      }
      this.writeBleDataPromise(arrayBuffer).then((ok) => {
        this._bleSendMeta = null;
        if (!ok) {
          this._f3HeightLog('BLE队列重试', { text: item.text, left: this._bleSendQueue.length });
          this._bleSendQueue.unshift(item);
          this._bleSendDraining = false;
          setTimeout(() => this._drainBleSendQueue(), 400);
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
      console.log('❌ [蓝牙] 设备未连接或写入特征值未找到');
      return false;
    }
    const ble = this.ble;
    const charId = this._getBleWriteCharacteristicId();
    wx.writeBLECharacteristicValue({
      deviceId: ble.device.deviceId,
      serviceId: ble.serviceId,
      characteristicId: charId,
      value: arrayBuffer,
      success: (res) => {
        console.log('✅ [蓝牙] 发送成功', res.errMsg);
      },
      fail: (err) => {
        console.log('❌ [蓝牙] 发送失败:', err.errMsg);
      }
    });
    return true;
  },

  // 发送字符串数据（经队列串行写出，避免 BLE 连发粘包）
  sendData(text, gapAfterMs) {
    if (this._isRemoteAssistAdminRelay()) {
      this._relayBleCommand(text, 1, gapAfterMs != null ? gapAfterMs : 0);
      return;
    }
    if (!this._canSendBleCommand()) return;
    this._enqueueBleSend(text, gapAfterMs != null ? gapAfterMs : BLE_SEND_GAP_MS);
  },

  // 连续发送多次（用于 Max 版本），同样走队列间隔发送
  sendDataMultiple(text, times = 3, interval = 300) {
    if (this._isRemoteAssistAdminRelay()) {
      this._relayBleCommand(text, times, interval);
      return;
    }
    if (!this._canSendBleCommand()) return;
    const flapCmd = this._isFlapBleCmd(text);
    if (flapCmd) {
      this._prunePendingFlapBleQueue();
    }
    const gap = flapCmd
      ? Math.max(interval, FLAP_BLE_SEND_GAP_MS)
      : Math.max(interval, BLE_SEND_GAP_MS);
    const items = [];
    for (let i = 0; i < times; i++) {
      items.push({ text, gapAfterMs: gap, meta: flapCmd ? { flap: true } : null });
    }
    if (!this._bleSendQueue) this._bleSendQueue = [];
    if (flapCmd) {
      this._bleSendQueue.unshift(...items);
    } else {
      this._bleSendQueue.push(...items);
    }
    this._drainBleSendQueue();
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
    const isF3 = isF3MaxModel(m);
    this._f3IevFilt = null;
    this._f3IevBase = null;
    this._f3IevCruise = null;
    this._f3LastIevFilt = null;
    this._f3LastIev = null;
    this._f3BumpUntil = 0;
    // 连上后传感器尚未稳定，禁止本机过坑判定/发 BK
    this._f3BumpArmAt = Date.now() + 6000;
    if (this._f3BumpClearTimer) {
      clearTimeout(this._f3BumpClearTimer);
      this._f3BumpClearTimer = null;
    }
    return {
      f2HwMonitorVisible: connected && isHwPinMonitorModel(m),
      f2KeyOn: null,
      f2BtnPressed: null,
      f2KeyStatusText: '—',
      f2BtnStatusText: '—',
      f3HeightMonitorVisible: false,
      f3AttitudeVisible: isF3,
      f3AttitudeRollDeg: 0,
      f3AttitudeHint: connected ? '读取中…' : '请先连接蓝牙',
      f3AttitudeSide: '—',
      f3BumpActive: false,
      f3HeightMm: null,
      f3HeightText: connected ? '读取中…' : '请先连接蓝牙',
      f3HeightLive: false,
      f3DangerMm: 0,
      f3BaseMm: 0,
      f3DangerInput: '',
      f3BaseInput: '',
      f3DangerReadback: connected ? '读取中…' : '未设置',
      f3BaseReadback: connected ? '读取中…' : '未设置',
      f3CalCountdown: 0,
      f3PlateItm: null,
      f3DangerBlocked: false,
      f3HeightConfigLocked: false,
      f3PowerOffLockReadbackText: connected ? '读取中…' : '—',
      f3ShowCalOverlay: false,
      f3CalStep: '',
      f3CalBranch: '',
      f3CalTitle: '自动标定',
      f3CalDesc: '',
      f3CalTargetLabel: '',
      f3CalLiveText: '',
      f3CalMedianText: '',
      f3CalResultText: '',
      f3CalStatusText: '',
      f3CalShowHoldModal: false,
      f3CalShowVolatilityModal: false
    };
  },

  _f2FaultAckStorageKey() {
    const sn = this.data.currentConnectedRawSn
      || this.normalizeSnFromBluetoothName(this.data.connectedDeviceName || '')
      || this.data.connectedDeviceName
      || 'default';
    return `f2_fault_ack_${sn}`;
  },

  _isF2FaultErrAcked(err) {
    const e = parseInt(err, 10) || 0;
    if (e <= 0) return true;
    try {
      return String(wx.getStorageSync(this._f2FaultAckStorageKey())) === String(e);
    } catch (ex) {
      return false;
    }
  },

  _markF2FaultErrAcked(err) {
    const e = parseInt(err, 10) || 0;
    if (e <= 0) return;
    try {
      wx.setStorageSync(this._f2FaultAckStorageKey(), String(e));
    } catch (ex) { /* ignore */ }
  },

  _clearF2FaultErrAcked() {
    try {
      wx.removeStorageSync(this._f2FaultAckStorageKey());
    } catch (ex) { /* ignore */ }
  },

  _isBleGattReady() {
    const ble = this.ble;
    return !!(ble && ble.device && ble.device.deviceId && ble.serviceId && ble.characteristicId);
  },

  _bleStatusTargetModel() {
    if (this._bleSessionModel && (this.data.isConnected || this._isBleLinked())) {
      return this._bleSessionModel;
    }
    if (this.data.showDetail && this.data.currentModel) {
      return this.data.currentModel;
    }
    const models = this.data.models || [];
    const idx = Number(this.data.currentIndex);
    if (Number.isFinite(idx) && models[idx]) {
      return models[idx];
    }
    return this.data.currentModel;
  },

  _ensureF2StatusBleListener(forceUiPrime) {
    if (!this.ble || !this._isBleGattReady()) return;
    const model = this._bleStatusTargetModel();
    if (!isF2MaxStatusBleModel(model)) {
      if (this.ble.onDataReceived) {
        this.ble.onDataReceived = null;
      }
      return;
    }
    const needBind = !this.ble.onDataReceived;
    if (needBind) {
      this._setupF2FaultBleListener();
      return;
    }
    this._f2ForceStatusSyncPending = true;
    this._f2AdvSyncPending = true;
    if (forceUiPrime && (this.data.isConnected || this._isBleLinked())) {
      this.setData({
        f2TravelReadbackText: '读取中…',
        f2DelayPowerReadbackText: '读取中…',
        ...this._resetF2HwMonitorState(true, model)
      });
    }
  },

  _setupF2FaultBleListener() {
    this._f2BleRxLine = '';
    this._f2LastFaultKey = '';
    this._f2FaultConnectPending = true;
    this._f2AdvSyncPending = true;
    this._f2ForceStatusSyncPending = true;
    if (!this.ble) return;
    this.ble.onDataReceived = (buffer) => this._onF2BleDataReceived(buffer);
    const connectPatch = {
      f2TravelReadbackText: '读取中…',
      f2DelayPowerReadbackText: '读取中…',
      flapPanelState: 'unknown',
      flapPanelStateText: '同步中…',
      ...this._resetF2HwMonitorState(true, this._bleStatusTargetModel())
    };
    this.setData(connectPatch);
  },

  _teardownF2FaultBleListener() {
    this._stopF2DemoMode(false);
    this._clearF3FlapSendLoop();
    this._f2BleRxLine = '';
    this._f2LastFaultKey = '';
    this._f2FaultConnectPending = false;
    this._f2AdvSyncPending = false;
    this._f2ForceStatusSyncPending = false;
    this._f2LastStatusParsed = null;
    if (this.ble) this.ble.onDataReceived = null;
    this._resetFlapPanelState();
    this.setData({
      f2TravelReadbackText: '读取中…',
      f2DelayPowerReadbackText: '读取中…',
      ...this._resetF2HwMonitorState(false)
    });
  },

  _onF2BleDataReceived(buffer) {
    if (!buffer || !isF2MaxStatusBleModel(this._bleStatusTargetModel())) return;
    this._f2LastBleRxAt = Date.now();
    this._f2BleRxLine += this._arrayBufferToUtf8(buffer);
    const parts = this._f2BleRxLine.split('\n');
    this._f2BleRxLine = parts.pop() || '';
    parts.forEach((line) => {
      const trimmed = (line || '').trim();
      if (!trimmed) return;
      this._handleF2BleStatusLine(trimmed);
    });
  },

  _handleF2BleStatusLine(line) {
    const trimmed = (line || '').trim();
    if (trimmed.startsWith('RX:')) {
      this._f3HeightLog('固件RX', trimmed.slice(3));
      return;
    }
    if (trimmed.startsWith('OK:')) {
      this._f3HeightLog('固件OK', trimmed.slice(3));
      const body = trimmed.slice(3);
      if (body.indexOf('CU') === 0) {
        this._f3ImuOnWriteAck('up', true, body);
      } else if (body.indexOf('CL') === 0) {
        this._f3ImuOnWriteAck('lean', true, body);
      }
      return;
    }
    // 注意：状态行里有 |ERR:0|，不能用 startsWith('ER:')，会把 ERR 当成命令错误
    if (/^ER:/.test(trimmed) && !/^ERR:/.test(trimmed)) {
      this._f3HeightLog('固件ER', trimmed.slice(3));
      if (trimmed.indexOf('ER:MPU') === 0) {
        const pending = this._f3ImuWritePending;
        if (pending) this._f3ImuOnWriteAck(pending.phase, false, 'mpu');
      }
      return;
    }
    const parsed = parseF2StatusLine(trimmed);
    if (!parsed) return;
    if (isF3MaxModel(this._bleStatusTargetModel()) &&
        (this._f3HeightWritePending || this.data.f3HeightConfigModeOn)) {
      this._f3HeightLog('状态包', {
        f3c: parsed.f3c,
        dga: parsed.dga,
        dgb: parsed.dgb,
        hgt: parsed.hgt,
        pending: this._f3HeightWritePending,
        uiCfgOn: this.data.f3HeightConfigModeOn
      });
    }
    const forcePopup = !!this._f2FaultConnectPending;
    if (forcePopup) this._f2FaultConnectPending = false;

    if ((parsed.err || 0) === 0) {
      this._clearF2FaultErrAcked();
    }

    const faultMuted = this._isFaultReportMuted();

    if (forcePopup && !faultMuted) {
      let queue = buildF2ConnectModalQueue(parsed);
      if ((parsed.err || 0) > 0 && this._isF2FaultErrAcked(parsed.err)) {
        queue = queue.filter((p) => p.kind !== 'error');
      }
      if (queue.length) this._showF2ConnectModalQueue(queue);
      this._f2LastFaultKey = `${parsed.err}:${parsed.wrn}`;
    } else if ((parsed.wrn || 0) > 0 && !faultMuted) {
      this._maybeShowF2FaultPopup(0, parsed.wrn, false);
    } else if (!faultMuted) {
      this._f2LastFaultKey = '0:0';
    }
    this._f2LastStatusParsed = parsed;
    this._syncF2StatusFromPacket(parsed);
  },

  _syncF2StatusFromPacket(parsed) {
    const model = this._bleStatusTargetModel();
    if (isF3MaxModel(model) && (parsed.f3c === 0 || parsed.f3c === 1)) {
      this._f3LastStatusF3c = parsed.f3c;
    }
    if (!isF2MaxStatusBleModel(model)) return;
    const isUltra = isMtUltraCardModel(model);
    const forceFull = !!this._f2ForceStatusSyncPending;
    const forceAdv = forceFull || !!this._f2AdvSyncPending;
    const updates = buildF2AdvUiUpdates(parsed, {
      isMtUltraCard: isUltra,
      isF3Max: isF3MaxModel(model),
      currentState: this.data.settingState,
      delayPowerOffOptions: this.data.delayPowerOffOptions,
      force: forceAdv,
      currentUi: {
        f2TravelModeOn: this.data.f2TravelModeOn,
        delayPowerOffIndex: this.data.delayPowerOffIndex,
        f2TravelReadbackText: this.data.f2TravelReadbackText,
        f2DelayPowerReadbackText: this.data.f2DelayPowerReadbackText,
        f3PowerOffLockReadbackText: this.data.f3PowerOffLockReadbackText,
        travelHoldMin: this.data.travelHoldMin,
        travelDurationHours: this.data.travelDurationHours,
        travelModeTip: this.data.travelModeTip
      }
    });

    if (updates.travelHoldMin != null && isUltra) {
      updates.travelHoldIndex = f2TravelHoldIndexByMin(updates.travelHoldMin);
      try { wx.setStorageSync('f2_travel_hold_min', updates.travelHoldMin); } catch (e) { /* ignore */ }
    }
    if (updates.travelDurationHours != null && isUltra) {
      updates.travelDurationIndex = f2TravelDurationIndexByHours(updates.travelDurationHours);
      try { wx.setStorageSync('f2_travel_duration_hours', updates.travelDurationHours); } catch (e) { /* ignore */ }
    }

    if (forceAdv) {
      this._f2AdvSyncPending = false;
    }

    if (modelUsesSettingClickOnly(model)) {
      delete updates.settingState;
    }

    if (isUltra) {
      Object.assign(updates, buildF2FlapPanelUpdates(parsed, {
        flapPanelState: this.data.flapPanelState,
        flapPanelStateText: this.data.flapPanelStateText,
        flapMotionDir: this.data.flapMotionDir
      }, { force: forceFull }));

      if (updates.flapPanelState === 'moving') {
        this._f2MotionGraceUntil = Date.now() + 8000;
      } else if (updates.flapPanelState === 'open' || updates.flapPanelState === 'closed' || updates.flapPanelState === 'fault') {
        this._f2MotionGraceUntil = 0;
      }

      if (this._f2DemoActive && updates.flapPanelState !== undefined) {
        this._onF2DemoFlapStable(updates.flapPanelState);
      }

      if (this._f3FlapExpectState && updates.flapPanelState !== undefined) {
        this._onF3FlapReadbackReached(updates.flapPanelState);
      }

      if (this._isFaultReportMuted() && updates.flapPanelState === 'fault') {
        delete updates.flapPanelState;
        delete updates.flapPanelStateText;
      }

      if (parsed.spd !== null && parsed.spd >= 10 && parsed.spd <= 100) {
        if (forceAdv || parsed.spd !== this.data.f2ServoSpeed) {
          Object.assign(updates, buildF2ServoSpeedUi(parsed.spd));
          try {
            wx.setStorageSync('f2_servo_speed', parsed.spd);
          } catch (e) { /* ignore */ }
        }
      }
    } else {
      delete updates.f2TravelModeOn;
      delete updates.travelModeTip;
      delete updates.travelHoldMin;
      delete updates.travelHoldIndex;
      delete updates.travelDurationHours;
      delete updates.travelDurationIndex;
      delete updates.travelKeyOffIndex;
      delete updates.f2TravelReadbackText;
      delete updates.f2DelayPowerReadbackText;
      delete updates.delayPowerOffIndex;
      delete updates.delayPowerOffTip;
    }

    Object.assign(updates, buildF2HwMonitorUpdates(parsed, {
      f2KeyOn: this.data.f2KeyOn,
      f2BtnPressed: this.data.f2BtnPressed,
      force: forceFull || forceAdv
    }));

    Object.assign(updates, buildF3HeightMonitorUpdates(parsed, {
      f3HeightMm: this.data.f3HeightMm,
      f3HeightConfigModeOn: this.data.f3HeightConfigModeOn,
      force: forceFull
    }));
    // F3 MAX 最新：陀螺仪状态
    if (parsed.ss !== null && parsed.ss !== undefined) {
      const sn = f3StallGearOrDefault(parsed.ss);
      if (sn !== this.data.f3StallSens) {
        updates.f3StallSens = sn;
        updates.f3StallSensText = F3_STALL_GEAR[sn].label;
      }
    }
    if (parsed.bs !== null && parsed.bs !== undefined) {
      const bn = Number(parsed.bs);
      if (Number.isFinite(bn) && bn >= 0 && bn <= 10) {
        // 状态包仍可能回 BS 档号；就近收到 UI 三档（本机表为准，连上会再 BP 推送）
        let ui = 1;
        if (bn <= 0) ui = 2;
        else if (bn >= 4) ui = 0;
        else ui = 1;
        if (ui !== this.data.f3BumpSens) {
          updates.f3BumpSens = ui;
          updates.f3BumpSensText = F3_BUMP_GEAR[ui].label;
          try {
            wx.setStorageSync('f3_bump_sens', ui);
            wx.setStorageSync('f3_gear_v4', 1);
          } catch (e) { /* ignore */ }
        }
      }
    }
    if (parsed.mok !== null && parsed.mok !== undefined) {
      updates.f3MpuOk = !!parsed.mok;
      if (!parsed.mok) {
        updates.f3ImuStateText = '未连接';
        updates.f3AttitudeHint = 'MPU未连接';
      }
    }
    if (parsed.ims !== null && parsed.ims !== undefined) {
      const ims = parsed.ims;
      updates.f3ImuState = ims;
      if (parsed.mok === 0) {
        updates.f3ImuStateText = '未连接';
        updates.f3AttitudeHint = 'MPU未连接';
      } else {
        const st = ims === 3 ? '骑行中' : (ims === 1 ? '倾斜' : (ims === 2 ? '扶正' : (parsed.mok ? '已连接' : '未知')));
        updates.f3ImuStateText = st;
        updates.f3AttitudeHint = st;
      }
    }
    if (parsed.ird !== null && parsed.ird !== undefined) {
      let deg = Number(parsed.ird) / 10;
      if (!Number.isFinite(deg)) deg = 0;
      // 安装方向反了可在这里取反：deg = -deg
      const vis = Math.max(-70, Math.min(70, deg));
      const abs = Math.abs(deg);
      updates.f3AttitudeRollDeg = Number(vis.toFixed(1));
      updates.f3ImuLiveDegText = `${deg >= 0 ? '+' : ''}${deg.toFixed(1)}°`;
      if (!this.data.isConnected) {
        updates.f3AttitudeSide = '—';
      } else if (abs < 2.5) {
        updates.f3AttitudeSide = '扶正';
      } else {
        updates.f3AttitudeSide = deg > 0 ? '右倾' : '左倾';
      }
      if (!updates.f3BumpActive && parsed.mok !== 0) {
        updates.f3AttitudeHint = updates.f3AttitudeSide === '扶正'
          ? (updates.f3ImuStateText || '扶正')
          : `${updates.f3AttitudeSide} ${Math.abs(deg).toFixed(1)}°`;
      }
    }
    // IPK 是固件在两次 BLE 状态包之间以 50Hz 捕获的峰值，避免过弯后快速回正漏掉最大倾角。
    if (parsed.ipk !== null && parsed.ipk !== undefined) {
      const peak = Number(parsed.ipk) / 10;
      if (Number.isFinite(peak)) {
        updates.f3ImuPeakDeg = peak;
        if (peak < 0) updates.f3ImuMaxLeftDeg = Math.max(Number(this.data.f3ImuMaxLeftDeg) || 0, -peak);
        if (peak > 0) updates.f3ImuMaxRightDeg = Math.max(Number(this.data.f3ImuMaxRightDeg) || 0, peak);
      }
    }
    if (parsed.iev !== null && parsed.iev !== undefined) {
      const ievRaw = Number(parsed.iev) / 100;
      if (!Number.isFinite(ievRaw)) {
        // skip
      } else {
        // 低通略慢，减少路噪毛刺
        if (this._f3IevFilt == null) this._f3IevFilt = ievRaw;
        this._f3IevFilt = this._f3IevFilt * 0.65 + ievRaw * 0.35;
        const iev = this._f3IevFilt;
        updates.f3ImuLiveVibeText = iev.toFixed(2);

        const nowMs = Date.now();
        const riding = parsed.ims === 3;
        const prevFilt = this._f3LastIevFilt != null ? this._f3LastIevFilt : iev;
        const rising = iev - prevFilt;
        const inBumpHold = !!(this._f3BumpUntil && nowMs <= this._f3BumpUntil);

        // 巡航基线：跟着持续路噪走；过坑只认相对突出尖峰
        if (this._f3IevCruise == null) this._f3IevCruise = iev;
        if (!inBumpHold) {
          const above = iev - this._f3IevCruise;
          let a;
          if (rising >= 0.012 && above > 0) {
            a = 0.01;
          } else if (above > 0.025) {
            a = riding ? 0.10 : 0.06;
          } else if (above < -0.012) {
            a = riding ? 0.10 : 0.12;
          } else {
            a = riding ? 0.05 : 0.07;
          }
          this._f3IevCruise = this._f3IevCruise * (1 - a) + iev * a;
        }
        this._f3IevBase = this._f3IevCruise;

        const cruise = Math.max(this._f3IevCruise, 0.008);
        const spike = iev - cruise;
        const thr = this._f3BumpThrParams(this.data.f3BumpSens);
        const need = Math.max(thr.floorNeed, cruise * 1.55) * thr.needMul;
        const armed = !(this._f3BumpArmAt) || nowMs >= this._f3BumpArmAt;
        const isSpike = armed && spike >= need && rising >= thr.riseNeed;
        if (isSpike) {
          this._f3BumpUntil = nowMs + 1000;
          updates.f3BumpActive = true;
          updates.f3AttitudeHint = '过坑冲击';
          // 控制面板若收起，过坑红灯看不见；强制展开
          if (!this.data.f2ControlPanelOpen) updates.f2ControlPanelOpen = true;
          // 同步车把：小程序检出后通知固件亮红灯+锁键（与固件本地判定互补）
          if (this._canSendBleCommand && this._canSendBleCommand()) {
            const t = Date.now();
            if (!this._f3BumpBleKickAt || t - this._f3BumpBleKickAt > 800) {
              this._f3BumpBleKickAt = t;
              try { this.sendData('BK', 350); } catch (e) { /* ignore */ }
            }
          }
          if (this._f3BumpClearTimer) clearTimeout(this._f3BumpClearTimer);
          this._f3BumpClearTimer = setTimeout(() => {
            this._f3BumpClearTimer = null;
            if (Date.now() >= (this._f3BumpUntil || 0) && this.data.f3BumpActive) {
              this.setData({ f3BumpActive: false });
            }
          }, 1100);
        } else if (nowMs > (this._f3BumpUntil || 0)) {
          updates.f3BumpActive = false;
        } else {
          updates.f3BumpActive = true;
          updates.f3AttitudeHint = '过坑冲击';
          if (!this.data.f2ControlPanelOpen) updates.f2ControlPanelOpen = true;
        }
        this._f3LastIevFilt = iev;
        this._f3LastIev = ievRaw;
      }
    }
    if (parsed.lit !== null && parsed.lit !== undefined) {
      updates.f3LightOn = !!parsed.lit;
      updates.f3LightText = parsed.lit ? '亮' : '灭';
    }
    if (parsed.il !== null && parsed.il !== undefined) {
      updates.f3ImuLeanText = `${(parsed.il / 10).toFixed(1)}°`;
    }
    if (parsed.iu !== null && parsed.iu !== undefined) {
      updates.f3ImuUpText = `${(parsed.iu / 10).toFixed(1)}°`;
    }
    // 按 BLE 实测切 TOF / IMU 皮肤（进页默认 TOF）
    // 最新固件：测高条隐藏，姿态方块常显（F3） —— 已改为按 f3SensorUi
    if (isF3MaxModel(this.data.currentModel)) {
      const ui = this.data.f3SensorUi === 'imu' ? 'imu' : 'tof';
      updates.f3HeightMonitorVisible = ui === 'tof';
      updates.f3AttitudeVisible = ui === 'imu';
    }

    // 自动校准采集中：吃状态包实时倾角
    if (this.data.f3ShowCalOverlay && (this._f3ImuSampling ||
        this.data.f3CalStep === 'imuReadyUp' ||
        this.data.f3CalStep === 'imuReadyLean' ||
        this.data.f3CalStep === 'imuSampling')) {
      this._f3ImuPushLiveSample(parsed);
      if (!this._f3ImuSampling) {
        if (parsed.ird != null) {
          const deg = Math.abs(Number(parsed.ird) / 10).toFixed(1);
          updates.f3ImuLiveText = `倾角 ${deg}°`;
          updates.f3ImuLiveNum = deg;
        }
      }
    }

    if (this._isFaultReportMuted()) {
      delete updates.f3FoldWatchText;
    }

    if (this._f3CalSampling || this.data.f3CalStep === 'wheel') {
      let liveMm = null;
      if (updates.f3HeightMm != null) {
        liveMm = Math.round(Number(updates.f3HeightMm));
      } else if (parsed.hgt != null && parsed.hgt !== undefined) {
        liveMm = Math.round(Number(parsed.hgt));
      } else if (this.data.f3HeightMm != null) {
        liveMm = Math.round(Number(this.data.f3HeightMm));
      }
      if (liveMm > 0) {
        updates.f3CalLiveText = this._f3CalFormatLive(liveMm);
      }
    }

    Object.assign(updates, buildF3HeightSettingsUpdates(parsed, {
      f3DangerMm: this.data.f3DangerMm,
      f3BaseMm: this.data.f3BaseMm,
      f3HeightConfigModeOn: this.data.f3HeightConfigModeOn,
      force: forceFull || !!this._f3HeightWritePending
    }));

    if (isF3MaxModel(model)) {
      // 固件代次：陀螺仪版必带 MOK/IMS/BS；旧测高版只有 HGT/HF/F3C
      const hasImuTokens = parsed.mok != null || parsed.ims != null ||
        parsed.ird != null || parsed.bs != null;
      const hasTofTokens = parsed.hgt != null || parsed.hf != null ||
        parsed.f3c != null || parsed.dga != null || parsed.dgb != null;
      if (hasImuTokens) {
        if (this.data.f3DeviceVariant !== 'imu') updates.f3DeviceVariant = 'imu';
        // 切皮肤放 setData 后副作用：这里只记代次，下面统一 apply
        this._f3PendingSensorUi = 'imu';
      } else if (hasTofTokens && this.data.f3DeviceVariant !== 'tof') {
        updates.f3DeviceVariant = 'tof';
        this._f3PendingSensorUi = 'tof';
      }
      const itm = parsed.itm;
      if (itm === 0 || itm === 1 || itm === 2) {
        updates.f3PlateItm = itm;
      }
      updates.f3HeightConfigLocked = false;
      if (parsed.f3c === 1) {
        this._f3HeightCfgLocalUntil = 0;
      } else if (
        updates.f3HeightConfigModeOn === false
        && (
          (this._f3HeightCfgLocalUntil && Date.now() < this._f3HeightCfgLocalUntil
            && this.data.f3HeightConfigModeOn)
          || this._f3CalWritingHeights
        )
      ) {
        delete updates.f3HeightConfigModeOn;
      }
      if (itm === 1 || itm === 2) {
        if (!this.data.f3HeightConfigModeOn && updates.f3HeightLive !== true) {
          updates.f3HeightLive = false;
          if (updates.f3HeightText == null && this.data.f3HeightMm == null) {
            updates.f3HeightText = '读取中…';
          }
        }
      } else if (
        itm === 0 &&
        (parsed.hgt === null || parsed.hgt === undefined) &&
        updates.f3HeightMm == null
      ) {
        // HGT 约 1s 才随状态包上报一次，无 HGT 字段不代表失效，勿清已有读数
        if (!this.data.f3HeightConfigModeOn && this.data.f3HeightMm == null) {
          updates.f3HeightLive = false;
        }
        if (forceFull && this.data.f3HeightMm == null) {
          updates.f3HeightText = '读取中…';
        }
      }
      if (this.data.f3ShowCalOverlay && this._f3CalSampling) {
        let hgtMm = null;
        if (parsed.hgt != null && parsed.hgt !== undefined) {
          const p = Math.round(Number(parsed.hgt));
          if (p > 0) hgtMm = p;
        }
        if (hgtMm == null && updates.f3HeightMm != null) {
          const u = Math.round(Number(updates.f3HeightMm));
          if (u > 0) hgtMm = u;
        }
        if (hgtMm != null) this._f3CalTryPushSample(hgtMm);
      }
    }

    if (forceFull) {
      this._f2ForceStatusSyncPending = false;
    }

    this._trySyncAngleEditorsFromBle(parsed);

    if (!isHwPinMonitorModel(model)) {
      delete updates.f2KeyOn;
      delete updates.f2BtnPressed;
      delete updates.f2KeyStatusText;
      delete updates.f2BtnStatusText;
      delete updates.f2HwMonitorVisible;
    }

    if (!isF3MaxModel(model)) {
      delete updates.f3DeviceVariant;
      delete updates.f3HeightMm;
      delete updates.f3HeightText;
      delete updates.f3HeightLive;
      delete updates.f3HeightMonitorVisible;
      delete updates.f3AttitudeVisible;
      delete updates.f3AttitudeRollDeg;
      delete updates.f3AttitudeHint;
      delete updates.f3DangerMm;
      delete updates.f3BaseMm;
      delete updates.f3DangerReadback;
      delete updates.f3BaseReadback;
      delete updates.f3CalCountdown;
      delete updates.f3DangerBlocked;
      delete updates.f3HeightConfigLocked;
      delete updates.f3PlateItm;
      delete updates.f3ShowCalOverlay;
      delete updates.f3CalTargetLabel;
    } else if (updates.f3AttitudeVisible === undefined) {
      updates.f3AttitudeVisible = this.data.f3SensorUi === 'imu';
      if (updates.f3HeightMonitorVisible === undefined) {
        updates.f3HeightMonitorVisible = this.data.f3SensorUi !== 'imu';
      }
    }

    if (updates._f3CalJustFinished) {
      delete updates._f3CalJustFinished;
    }
    const f3CalDismissToast = updates._f3CalDismissToast;
    if (f3CalDismissToast) delete updates._f3CalDismissToast;

    if (Object.keys(updates).length) {
      this._stripConflictingBleReadback(updates);
    }

    if (Object.keys(updates).length) {
      if (isUltra) {
        const nextState = updates.settingState || this.data.settingState;
        Object.assign(updates, buildF2StealthUiFlags(
          model,
          nextState,
          resolveF2BleLinkedForUi({ ...this.data, ...updates, settingState: nextState })
        ));
      }
      this._patchFlapGaugeSnap(updates);
      this._patchFlapGaugeSpin(updates);
      const f3CalJustFinished = !!updates._f3CalJustFinished;
      const f3CalFlapJustClosed = this._f3CalAwaitFlapClose && updates.flapPanelState === 'closed';
      if (f3CalJustFinished) delete updates._f3CalJustFinished;
      // 滑动中暂缓遥测 setData，避免与 scroll-view 合成抢主线程
      if (this._mainControlScrolling && !forceFull && !forceAdv &&
          updates.flapPanelState === undefined &&
          updates.settingState === undefined &&
          updates.f3ShowCalOverlay === undefined) {
        this._pendingBleUiPatch = Object.assign(this._pendingBleUiPatch || {}, updates);
        this._scheduleRemoteStatePush();
        return;
      }
      if (this._pendingBleUiPatch) {
        // 待合并的旧包不能覆盖本包字段（否则过坑红灯会被旧的 f3BumpActive:false 冲掉）
        const pending = this._pendingBleUiPatch;
        this._pendingBleUiPatch = null;
        Object.keys(pending).forEach((k) => {
          if (updates[k] === undefined) updates[k] = pending[k];
        });
      }
      const pendingSensorUi = this._f3PendingSensorUi || '';
      this._f3PendingSensorUi = '';
      this.setData(updates, () => {
        this._ensureFlapGaugeRestVisual();
        if (updates.f3ShowCalOverlay === false) this._clearF3CalTimer();
        if (f3CalDismissToast) {
          this._clearF3CalTimer();
          this._showCustomToast(f3CalDismissToast.text, f3CalDismissToast.type || 'none', f3CalDismissToast.duration || 2000);
        }
        if (f3CalFlapJustClosed) this._f3CalOnFlapClosedForCal();
        if (pendingSensorUi) this._f3ApplySensorUiFromBle(pendingSensorUi);
      });
      if (isUltra && updates.flapPanelState !== undefined) {
        this._publishFlapToVoiceBridge(
          updates.flapPanelState,
          updates.flapPanelStateText != null
            ? updates.flapPanelStateText
            : this.data.flapPanelStateText
        );
      }
      this._scheduleRemoteStatePush();
      if (isUltra && updates.settingState) {
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
    this._checkBleVerifyFromReadback(
      isF2MaxStatusBleModel(model) ? parsed : null
    );
  },

  _maybeShowF2FaultPopup(err, wrn, forcePopup) {
    if (this._isFaultReportMuted()) return;
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
        if (payload.kind === 'error' && payload.errCode > 0) {
          this._markF2FaultErrAcked(payload.errCode);
          this._ackF2FaultReportToDevice();
        }
        if (typeof afterClose === 'function') afterClose();
      }
    });
  },

  _ackF2FaultReportToDevice() {
    if (!this._canSendBleCommand()) return;
    this.sendData(F2_FAULT_ACK_CMD, 80);
  },
});
