// The page's text, in the site's two languages. Not from app-translation: the site keeps its own
// copy, as tigerduck.app does.

import type { Language } from './share.ts';

const zh = {
  pageTitle: 'TigerDuck 分享',
  classTableFrom: (studentId: string) => `${studentId} 想分享課表給你`,
  terms: '學期',
  courses: '課程',
  sharedAt: '分享時間',
  damagedTitle: '此分享碼已損毀或被修改',
  damagedBody: '請對方重新分享一次。',
  newerTitle: '此分享需要較新版本的 TigerDuck',
  newerBody: '請先更新 TigerDuck，再開啟此連結。',
  noneTitle: '無分享內容',
  noneBody: '請確認連結是否完整。',
  open: '開啟 TigerDuck 匯入',
  openFDroid: '以 F-Droid 版本開啟',
  notInstalled: '還沒安裝 TigerDuck？請先安裝，再重新開啟此連結。',
  desktop: '請使用手機或平板掃描 QR Code 以開啟此連結。',
  desktopNoQrCode: '請以手機或平板開啟此連結。',
  qrLabel: '此連結的 QR Code',
  inAppBrowser: '此 App 內建的瀏覽器打不開 TigerDuck，請改用手機瀏覽器開啟此頁面。',
  getApp: '下載 TigerDuck',
  noScript: '需要啟用 JavaScript 才能開啟 TigerDuck。',
};

/** English has every key Chinese has. */
export const STRINGS: Record<Language, typeof zh> = {
  zh,
  en: {
    pageTitle: 'TigerDuck Share',
    classTableFrom: (studentId: string) =>
      `${studentId} wants to share their class schedule with you`,
    terms: 'Semester',
    courses: 'Courses',
    sharedAt: 'Shared at',
    damagedTitle: 'This share code is corrupted or has been modified',
    damagedBody: 'Please ask the sender to share it again.',
    newerTitle: 'This share requires a newer version of TigerDuck',
    newerBody: 'Please update TigerDuck before opening this link.',
    noneTitle: 'No shared content',
    noneBody: 'Please check that the link is complete.',
    open: 'Open in TigerDuck to import',
    openFDroid: 'Open with the F-Droid version',
    notInstalled: 'Don’t have TigerDuck installed yet? Install it, then reopen this link.',
    desktop: 'Scan the QR code with your phone or tablet to open this link.',
    desktopNoQrCode: 'Open this link on your phone or tablet.',
    qrLabel: 'QR code for this link',
    inAppBrowser: 'This app’s built-in browser cannot open TigerDuck. Please open this page in your phone’s browser instead.',
    getApp: 'Download TigerDuck',
    noScript: 'JavaScript must be enabled to open TigerDuck.',
  },
};
