// The page's text, in the site's two languages. Not from app-translation: the site keeps its own
// copy, as tigerduck.app does.

import type { Language } from './share.ts';

const zh = {
  pageTitle: 'TigerDuck 分享',
  classTableFrom: (studentId: string) => `${studentId} 要分享課表給你`,
  terms: '學期',
  courses: '課程數',
  sharedAt: '分享時間',
  damagedTitle: '這個分享碼已損毀或被修改',
  damagedBody: '請對方重新分享一次。',
  newerTitle: '這個分享需要較新版本的 TigerDuck',
  newerBody: '請先更新 TigerDuck，再開啟這個連結。',
  noneTitle: '這個網址沒有分享內容',
  noneBody: '請確認連結是否完整。',
  open: '開啟 TigerDuck 匯入',
  openFDroid: '用 F-Droid 版開啟',
  notInstalled: '還沒有安裝 TigerDuck？安裝完成後回到這一頁，再按一次「開啟 TigerDuck 匯入」。',
  desktop: '用手機或平板掃描 QR code，開啟這個連結。',
  desktopNoQrCode: '請用手機或平板開啟這個連結。',
  qrLabel: '這個連結的 QR code',
  inAppBrowser: '這個 App 內建的瀏覽器打不開 TigerDuck，請改用手機的瀏覽器開啟這個頁面。',
  getApp: '下載 TigerDuck',
  noScript: '這個頁面需要 JavaScript 才能開啟 TigerDuck。',
};

/** English has every key Chinese has. */
export const STRINGS: Record<Language, typeof zh> = {
  zh,
  en: {
    pageTitle: 'TigerDuck Share',
    classTableFrom: (studentId: string) => `${studentId} is sharing a class table with you`,
    terms: 'Terms',
    courses: 'Courses',
    sharedAt: 'Shared',
    damagedTitle: 'This share code is damaged or has been changed',
    damagedBody: 'Ask them to share it again.',
    newerTitle: 'This share needs a newer version of TigerDuck',
    newerBody: 'Update TigerDuck, then open this link again.',
    noneTitle: 'There is nothing shared at this address',
    noneBody: 'Check that the link is complete.',
    open: 'Open in TigerDuck to import',
    openFDroid: 'Open in the F-Droid version',
    notInstalled: 'Don’t have TigerDuck yet? Install it, then come back to this page and tap “Open in TigerDuck to import” again.',
    desktop: 'Scan the QR code with your phone or tablet to open this link.',
    desktopNoQrCode: 'Open this link on your phone or tablet.',
    qrLabel: 'QR code of this link',
    inAppBrowser: 'This app’s own browser cannot open TigerDuck. Open this page in your phone’s browser instead.',
    getApp: 'Get TigerDuck',
    noScript: 'This page needs JavaScript to open TigerDuck.',
  },
};
