# 実PNGバイト数の非侵襲計測設計（2026-10-29）

## 実装コードの確認結果
- `lib/weather/providers/jma/readPixel.ts` の `fetchPngPixel` は既にJMAタイルの `response.arrayBuffer()` から **PNGファイルの全バイト**を取得し、`pngjs` でデコードして1画素だけ返している。
- `JmaPublicImageProvider.ts` は `readTargets` 内で上記関数を呼ぶ。現状は生PNGのサイズを呼び出し元へ返さず、記録もしない。
- したがって**追加のJMAリクエストなし**で、`arrayBuffer.byteLength` を計測する設計が可能。既存の読み込み経路の中に計測点を置くのが最も低負荷。
- ただしこの方法で測れるのは **中心点を含む1タイル**。半径1kmが隣接タイルにまたがる場合の追加タイルは取得していない。将来の保存方式決定には別途境界ケースを検証する。

## 最小改修案（未実装）
1. `fetchPngPixel` にオプションの計測コールバックを追加する、または呼び出し側に `{rgba,pngByteLength}` を返す別関数を設ける。既存APIの戻り値と例外仕様は維持。
2. `const bytes = Buffer.from(await response.arrayBuffer())` の直後に `bytes.length` を計測し、既存の `PNG.sync.read(bytes)` に渡す。**二重fetchしない**。
3. 計測値には `baseTime, validTime, z, x, y, pngBytes, capturedAt, frameKind` を関連付ける。通知を発したイベントに限り後から参照可能にするには、`/api/rain` から `watch-rain` への値の受け渡しが必要。
4. データベースの毎フレーム書込みは行わない。最初はフラグ付きの短期ログ、または集約サイズ分布を使い、過剰ログ・外部公開・PIIを避ける。実計測を行う前にログの保存期間とアクセス権を決める。
5. 失敗時も `fetchPngPixel` の従来の例外処理・予報判定を維持。計測のために通知を遅延・中断しない。
6. `pngBytes` は **PNGファイルの容量**。半径1kmの切り抜きPNGやzlib RGBAの容量は、実画素の局所切り抜き処理が別途必要。単一のPNGバイト数だけでDB/Storageの優劣を決めない。

## 計測を本番に入れる前の承認事項
- 本番API・Edge Functionへのコード変更、診断ログへの記録を実施してよいか。
- 計測対象のサンプリング率・保存先・保持期間・コスト上限。
- 画像保存の利用条件と、JMAから取得したPNGの保管許諾。

## 現状
この文書は**研究ブランチのみ**に追加。本番 `main`、Supabase、通知処理、データベースには変更なし。
