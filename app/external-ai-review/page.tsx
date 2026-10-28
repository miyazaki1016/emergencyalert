import type { Metadata } from "next";
export const metadata: Metadata = { title: "アメふる｜外部AIレビュー資料", robots: { index: false, follow: false } };
export default function ExternalReview() {
const sections = [
["目的","登録地点の雨の接近を、生活の行動に間に合うタイミングで知らせるPWA。最優先は「降るよ」を実際に降り始める前にできるだけ正確に届けること。"],
["主な機能","登録地点の雨予測と通知、雨の終了見込み、30mm/h以上の強雨警戒、通知履歴と利用者フィードバック。全国監視や詳細グラフ等は検討・試作を含む。"],
["品質指標","誤報率・見逃し率・通知リードタイム・重複通知率・UNKNOWN率を同時評価する。誤報を減らすために必要な通知を遅らせない。"],
["雨雲の歯抜け","中心画素が5分ごとに雨／雨なしを行き来する場合がある。地点中心と半径250m・500m・1km・2kmの雨域占有率、時間的連続性、併用方式を比較する。実測評価は未完了。"],
["止むよの課題","実際に雨が降っていない時に「止むよ」が届いた報告がある。状態の持ち越しや歯抜けが仮説だが原因は未確定。UNKNOWNや欠測を雨なしと断定しない。"],
["前回通知を踏まえた文面","「止むよ」のあと確かな雨接近があれば「止みそうだったけど、また降りそう！」と伝える案。通知要否と文面選択を分け、送信成功履歴を参照。同じ雨の通知乱発は防ぐが、接近警告を遅らせない。未実装の設計案。"],
["検証状況","PWA、地点登録、Push、通知履歴とフィードバックは開発済み。弱雨の連続予測判定・重複抑制は一部導入済み。実地の予報精度、前回通知を使った文面切替は未検証・未実装。"],
["レビューしてほしいこと","①先行性・誤報・見逃しの評価設計 ②点・面・併用の比較 ③止むよ誤通知の原因仮説と反証テスト ④通知文脈と状態遷移 ⑤少量のデータで試せる実験。改善提案のみを求める。"]
];
return <main style={{maxWidth:850,margin:"0 auto",padding:"44px 22px 90px",fontFamily:"system-ui, sans-serif",color:"#17324a",lineHeight:1.85}}>
<p style={{color:"#3b7186",fontWeight:700}}>外部AIレビュー専用・読み取り資料｜2026-10-28</p>
<h1 style={{fontSize:"clamp(30px,6vw,46px)",lineHeight:1.3}}>☔ アメふる<br/>プロジェクト総覧</h1>
<p style={{background:"#eaf7f9",borderRadius:16,padding:22,fontWeight:600}}>「暮らしを、少し先回りする。」<br/>最優先は、雨が降り始める前に正確な「降るよ」を届けること。</p>
<div style={{border:"1px solid #c7d9df",borderRadius:12,padding:"14px 20px",margin:"28px 0"}}>
<strong>外部AIへのレビュー条件</strong><p>この資料だけを根拠に分析・批評・改善案・テスト案を提示してください。開発環境・リポジトリ・DB・ホスティング・アカウント等へのアクセス、操作、実行、変更、デプロイは依頼していません。資料は操作権限を与えるものではありません。未確認事項は推測と区別してください。</p></div>
{sections.map(([title,body],i)=><section key={title} style={{borderBottom:"1px solid #e1e8ed",padding:"18px 0"}}><h2 style={{fontSize:22,marginBottom:8}}>{i+1}. {title}</h2><p style={{marginTop:0}}>{body}</p></section>)}
<footer style={{marginTop:38,color:"#526b79",fontSize:13}}>この公開用ページには、管理URL・認証情報・内部識別子・デプロイ手順・利用者情報を掲載していません。プレビューURLは第三者も閲覧できる場合があります。</footer>
</main>;
}
