# 診断センター: 認証・Service Workerの実装仕様

状態: 仕様策定。アプリコード未変更。

## Service Worker
- navigator.serviceWorker.controllerの有無を読み取り表示する。
- controllerchangeとregistration.updatefoundの発生時刻を記録する。
- getRegistrationは読み取りに限定する。register、update、unregister、skipWaitingを診断側から呼ばない。
- listenerは診断パネル有効時のみ登録し、unmountで解除する。
- ページ破棄後のイベントは取得できないことを明示する。

## 匿名認証
- 診断用に新規のSupabaseクライアントを作らない。
- getSessionやrefreshSessionを診断画面から繰り返し呼ばない。
- 既存の認証処理が発行する安全な状態イベント（signed-in / signed-out / unknown）のみを購読する方式を検討する。
- イベントにuser ID、access token、refresh token、メール、登録地点、Push endpointを含めない。
- 「状態未観測」と「セッションなし」を区別する。
- ID継続性はハッシュの扱いも含めて慎重に設計する。単純ハッシュを外部共有しない。

## 安全性ゲート
- 認証キー・匿名ID・登録地点に対する書き込みゼロ。
- 診断無効時はlistenerやポーリングを開始しない。
- CI成功、Preview実機確認後にのみ本番導入を検討する。
- 本番反映にはユーザー承認を要する。
